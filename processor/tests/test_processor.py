from pathlib import Path
import sqlite3
from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import create_app
from app.storage.repository import ReportRepository
from app.sync import SyncEvent, merge_events, winning_event
from app.transcription import PackagedWhisperTranscriber, TranscriptionResult


class AvailableTestTranscriber:
    available = True

    def transcribe(self, audio: bytes, content_type: str) -> TranscriptionResult:
        assert audio == b"test-audio"
        assert content_type == "audio/wav"
        return TranscriptionResult("help needed", "test-local", True)


def client(tmp_path: Path, transcriber=None) -> TestClient:
    repo = ReportRepository(tmp_path / "processor.sqlite3")
    return TestClient(create_app(repository=repo, transcriber=transcriber))


def test_health_and_loopback_disclosure(tmp_path):
    response = client(tmp_path).get("/api/health")
    assert response.status_code == 200
    assert response.json()["services"]["database"] == "ready"
    assert response.json()["services"]["network"] == "loopback_only"

def test_migration_creates_empty_schema_without_demo_rows(tmp_path):
    database_path = tmp_path / "empty.sqlite3"
    repository = ReportRepository(database_path)
    assert repository.list() == []
    with sqlite3.connect(database_path) as connection:
        tables = {row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        assert {"reports", "report_events", "sync_peers", "schema_migrations"} <= tables
        assert connection.execute("SELECT COUNT(*) FROM reports").fetchone()[0] == 0
        assert connection.execute("SELECT COUNT(*) FROM report_events").fetchone()[0] == 0


def test_report_crud_filters_and_event_history(tmp_path):
    api = client(tmp_path)
    created = api.post(
        "/api/reports",
        json={"text": "A resident needs urgent medical assessment", "needs": ["medical"], "urgency": "high"},
    )
    assert created.status_code == 201
    report = created.json()["report"]
    report_id = report["id"]
    assert report["status"] == "needs_review"

    filtered = api.get("/api/reports", params={"urgency": "high"})
    assert filtered.status_code == 200
    assert filtered.json()["count"] == 1

    updated = api.patch(f"/api/reports/{report_id}", json={"status": "assigned", "needs": ["medical", "transport"]})
    assert updated.status_code == 200
    assert updated.json()["report"]["revision"] == 2

    fetched = api.get(f"/api/reports/{report_id}")
    assert len(fetched.json()["events"]) == 2
    assert api.get("/api/reports/00000000-0000-0000-0000-000000000001").status_code == 404


def test_create_is_idempotent_for_offline_retry_id(tmp_path):
    api = client(tmp_path)
    report_id = str(uuid4())
    body = {"id": report_id, "text": "Water requested"}
    first = api.post("/api/reports", json=body)
    second = api.post("/api/reports", json=body)
    assert first.status_code == second.status_code == 201
    assert first.json() == second.json()
    assert len(api.get(f"/api/reports/{report_id}").json()["events"]) == 1


def test_validation_error_shape(tmp_path):
    response = client(tmp_path).post("/api/reports", json={"text": ""})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"
    invalid_location = client(tmp_path).post(
        "/api/reports",
        json={"text": "Location validation", "location": {"latitude": 10, "area": "Zone A"}},
    )
    assert invalid_location.status_code == 422


def test_patch_null_is_rejected_with_standard_error(tmp_path):
    api = client(tmp_path)
    report_id = api.post("/api/reports", json={"text": "Needs follow-up"}).json()["report"]["id"]
    response = api.patch(f"/api/reports/{report_id}", json={"status": None})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"


def test_triage_is_local_heuristic_and_reviewable(tmp_path):
    response = client(tmp_path).post(
        "/api/triage", json={"text": "Urgent medical assessment and drinking water needed"}
    )
    assert response.status_code == 200
    assert response.json()["suggestions"] == {"urgency": "high", "needs": ["medical", "water"]}
    assert response.json()["modelStatus"] == "heuristic"

def test_triage_recognizes_bengali_emergency_needs(tmp_path):
    response = client(tmp_path).post(
        "/api/triage", json={"text": "জরুরি উদ্ধার দরকার, খাবার ও পানি নেই"}
    )
    assert response.status_code == 200
    assert response.json()["suggestions"] == {
        "urgency": "high",
        "needs": ["water", "food", "rescue"],
    }


def test_priority_map_has_no_online_basemap_and_escapes_report_text(tmp_path):
    api = client(tmp_path)
    created = api.post(
        "/api/reports",
        json={
            "text": "<script>alert(1)</script> injured resident",
            "location": {"latitude": 22.57, "longitude": 88.36, "area": "North Kolkata"},
            "urgency": "high",
        },
    )
    assert created.status_code == 201
    response = api.get("/api/map")
    assert response.status_code == 200
    assert "North Kolkata" in response.text
    assert "&lt;script&gt;" in response.text
    assert "openstreetmap" not in response.text.lower()
    assert "L.tileLayer(" not in response.text
    assert "https://" not in response.text
    assert "<svg" in response.text


def test_transcription_is_transient_and_adapter_contract(tmp_path):
    response = client(tmp_path, AvailableTestTranscriber()).post(
        "/api/transcribe",
        files={"audio": ("clip.wav", b"test-audio", "audio/wav")},
    )
    assert response.status_code == 200
    assert response.json() == {"transcript": "help needed", "modelStatus": "test-local"}


def test_transcription_reports_missing_packaged_model(tmp_path):
    response = client(tmp_path).post(
        "/api/transcribe",
        files={"audio": ("clip.wav", b"test-audio", "audio/wav")},
    )
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "TRANSCRIPTION_UNAVAILABLE"
    assert response.json()["error"]["modelStatus"] == "model_not_packaged"

def test_transcription_reports_incomplete_local_model_assets(tmp_path):
    model_dir = tmp_path / "whisper-small"
    model_dir.mkdir()
    (model_dir / "config.json").write_text("{}", encoding="utf-8")
    transcriber = PackagedWhisperTranscriber(model_dir)
    result = transcriber.transcribe(b"test-audio", "audio/mp4")
    assert result.available is False
    assert result.model_status == "model_files_incomplete"

def test_transcription_rejects_non_audio(tmp_path):
    response = client(tmp_path).post(
        "/api/transcribe",
        files={"audio": ("clip.txt", b"not-audio", "text/plain")},
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "INVALID_AUDIO"


def test_sync_event_merge_is_idempotent_and_deterministic():
    a = SyncEvent("a", "r", 1, "device-z", {"status": "open"})
    b = SyncEvent("b", "r", 1, "device-a", {"status": "assigned"})
    assert merge_events([a], [b, a]) == merge_events([b, a], [a])
    assert len(merge_events([a], [b, a])) == 2
    assert winning_event([a, b]) == a
    conflict = SyncEvent("a", "r", 1, "device-z", {"status": "resolved"})
    assert merge_events([a], [conflict]) == merge_events([conflict], [a])
