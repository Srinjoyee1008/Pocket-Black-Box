"""Deterministic event merge primitives; radio exchange is supplied by Android adapters."""

from dataclasses import dataclass
import json
from typing import Any


@dataclass(frozen=True)
class SyncEvent:
    event_id: str
    report_id: str
    lamport: int
    device_id: str
    payload: dict[str, Any]

    @property
    def order_key(self) -> tuple[int, str, str]:
        return (self.lamport, self.device_id, self.event_id)


def merge_events(local: list[SyncEvent], incoming: list[SyncEvent]) -> list[SyncEvent]:
    """Idempotent set-union ordered by a stable total order (replay safe)."""
    unique: dict[str, SyncEvent] = {}
    for event in [*local, *incoming]:
        existing = unique.get(event.event_id)
        event_payload = json.dumps(event.payload, sort_keys=True, separators=(",", ":"))
        existing_payload = json.dumps(existing.payload, sort_keys=True, separators=(",", ":")) if existing else None
        if existing is None or (existing_payload is not None and event_payload < existing_payload):
            unique[event.event_id] = event
    return sorted(unique.values(), key=lambda event: (event.report_id, *event.order_key))


def winning_event(events: list[SyncEvent]) -> SyncEvent | None:
    return max(events, key=lambda event: event.order_key, default=None)
