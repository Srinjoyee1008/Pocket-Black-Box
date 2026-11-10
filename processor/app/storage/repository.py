from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import UUID, uuid4

from app.models import CreateReport, Location, Report, ReportEvent, ReportStatus, UpdateReport, Urgency

MIGRATION_DIR = Path(__file__).parents[2] / "migrations"


def _time(value: str | None = None) -> datetime:
    return datetime.fromisoformat(value) if value else datetime.now(timezone.utc)


class ReportRepository:
    """Transactional SQLite repository. Each instance owns a single local database path."""

    def __init__(self, database_path: str | Path) -> None:
        self.database_path = str(database_path)
        if self.database_path != ":memory:":
            Path(self.database_path).parent.mkdir(parents=True, exist_ok=True)
        self._memory_connection: sqlite3.Connection | None = None
        if self.database_path == ":memory:":
            self._memory_connection = self._connect()
        self.migrate()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.database_path, timeout=10)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute("PRAGMA busy_timeout = 10000")
        return connection

    def _connection(self) -> sqlite3.Connection:
        return self._memory_connection or self._connect()

    def _close(self, connection: sqlite3.Connection) -> None:
        if connection is not self._memory_connection:
            connection.close()

    def migrate(self) -> None:
        connection = self._connection()
        try:
            connection.execute(
                "CREATE TABLE IF NOT EXISTS schema_migrations "
                "(version TEXT PRIMARY KEY, applied_at TEXT NOT NULL)"
            )
            for path in sorted(MIGRATION_DIR.glob("*.sql")):
                version = path.stem
                exists = connection.execute(
                    "SELECT 1 FROM schema_migrations WHERE version = ?", (version,)
                ).fetchone()
                if exists:
                    continue
                script = path.read_text(encoding="utf-8")
                applied_at = datetime.now(timezone.utc).isoformat().replace("'", "''")
                safe_version = version.replace("'", "''")
                connection.executescript(
                    "BEGIN IMMEDIATE;\n"
                    + script
                    + f"\nINSERT INTO schema_migrations(version, applied_at) "
                    + f"VALUES ('{safe_version}', '{applied_at}');\nCOMMIT;"
                )
        finally:
            self._close(connection)

    @staticmethod
    def _to_report(row: sqlite3.Row) -> Report:
        raw_location = json.loads(row["location"]) if row["location"] else None
        return Report(
            id=UUID(row["id"]),
            text=row["text"],
            location=Location(**raw_location) if raw_location else None,
            needs=json.loads(row["needs"]),
            urgency=Urgency(row["urgency"]),
            status=ReportStatus(row["status"]),
            created_at=_time(row["created_at"]),
            updated_at=_time(row["updated_at"]),
            revision=row["revision"],
            sync_state=row["sync_state"],
        )

    def create(self, request: CreateReport) -> Report:
        report_id = str(request.id)
        now = datetime.now(timezone.utc).isoformat()
        values = (
            report_id,
            request.text,
            json.dumps(request.location.model_dump() if request.location else None),
            json.dumps(request.needs),
            request.urgency.value,
            request.status.value,
            now,
            now,
        )
        connection = self._connection()
        try:
            with connection:
                connection.execute(
                    """INSERT OR IGNORE INTO reports
                    (id, text, location, needs, urgency, status, created_at, updated_at, revision, sync_state)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'local')""",
                    values,
                )
                row = connection.execute("SELECT * FROM reports WHERE id = ?", (report_id,)).fetchone()
                if row["revision"] == 1 and not connection.execute(
                    "SELECT 1 FROM report_events WHERE report_id = ? LIMIT 1", (report_id,)
                ).fetchone():
                    self._event(connection, report_id, "report.created", 1, {"text": request.text})
                return self._to_report(row)
        finally:
            self._close(connection)

    def list(self, urgency: Urgency | None = None, status: ReportStatus | None = None) -> list[Report]:
        clauses: list[str] = []
        values: list[str] = []
        if urgency:
            clauses.append("urgency = ?")
            values.append(urgency.value)
        if status:
            clauses.append("status = ?")
            values.append(status.value)
        where = f" WHERE {' AND '.join(clauses)}" if clauses else ""
        connection = self._connection()
        try:
            rows = connection.execute(
                f"SELECT * FROM reports{where} ORDER BY updated_at DESC, id ASC", values
            ).fetchall()
            return [self._to_report(row) for row in rows]
        finally:
            self._close(connection)

    def get(self, report_id: UUID) -> tuple[Report | None, list[ReportEvent]]:
        connection = self._connection()
        try:
            row = connection.execute("SELECT * FROM reports WHERE id = ?", (str(report_id),)).fetchone()
            if not row:
                return None, []
            event_rows = connection.execute(
                "SELECT * FROM report_events WHERE report_id = ? ORDER BY revision ASC, id ASC",
                (str(report_id),),
            ).fetchall()
            events = [
                ReportEvent(
                    id=UUID(event["id"]),
                    report_id=UUID(event["report_id"]),
                    kind=event["kind"],
                    occurred_at=_time(event["occurred_at"]),
                    revision=event["revision"],
                    payload=json.loads(event["payload"]),
                )
                for event in event_rows
            ]
            return self._to_report(row), events
        finally:
            self._close(connection)

    @staticmethod
    def _event(
        connection: sqlite3.Connection,
        report_id: str,
        kind: str,
        revision: int,
        payload: dict[str, Any],
    ) -> None:
        connection.execute(
            """INSERT INTO report_events(id, report_id, kind, occurred_at, revision, payload)
            VALUES (?, ?, ?, ?, ?, ?)""",
            (
                str(uuid4()),
                report_id,
                kind,
                datetime.now(timezone.utc).isoformat(),
                revision,
                json.dumps(payload, sort_keys=True),
            ),
        )

    def update(self, report_id: UUID, update: UpdateReport) -> Report | None:
        changes = update.model_dump(exclude_unset=True)
        event_payload = update.model_dump(exclude_unset=True, mode="json")
        if not changes:
            report, _ = self.get(report_id)
            return report
        connection = self._connection()
        try:
            with connection:
                old = connection.execute("SELECT * FROM reports WHERE id = ?", (str(report_id),)).fetchone()
                if old is None:
                    return None
                serialized = dict(changes)
                if "location" in serialized:
                    serialized["location"] = json.dumps(
                        serialized["location"].model_dump() if serialized["location"] else None
                    )
                if "needs" in serialized and serialized["needs"] is not None:
                    serialized["needs"] = json.dumps(serialized["needs"])
                for key in ("urgency", "status"):
                    if key in serialized and serialized[key] is not None:
                        serialized[key] = serialized[key].value
                assignments = ", ".join(f"{key} = ?" for key in serialized)
                new_revision = old["revision"] + 1
                values = list(serialized.values()) + [
                    datetime.now(timezone.utc).isoformat(),
                    new_revision,
                    str(report_id),
                ]
                connection.execute(
                    f"UPDATE reports SET {assignments}, updated_at = ?, revision = ? WHERE id = ?",
                    values,
                )
                self._event(connection, str(report_id), "report.updated", new_revision, event_payload)
                row = connection.execute("SELECT * FROM reports WHERE id = ?", (str(report_id),)).fetchone()
                return self._to_report(row)
        finally:
            self._close(connection)

    def health(self) -> bool:
        connection = self._connection()
        try:
            return connection.execute("SELECT 1").fetchone()[0] == 1
        finally:
            self._close(connection)
