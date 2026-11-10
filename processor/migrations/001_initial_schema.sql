CREATE TABLE reports (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL CHECK (length(trim(text)) BETWEEN 1 AND 4000),
    location TEXT,
    needs TEXT NOT NULL DEFAULT '[]',
    urgency TEXT NOT NULL CHECK (urgency IN ('low', 'medium', 'high')),
    status TEXT NOT NULL CHECK (status IN ('needs_review', 'open', 'assigned', 'resolved')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    revision INTEGER NOT NULL CHECK (revision > 0),
    sync_state TEXT NOT NULL DEFAULT 'local'
);

CREATE INDEX idx_reports_urgency_status_updated
    ON reports(urgency, status, updated_at DESC);

CREATE TABLE report_events (
    id TEXT PRIMARY KEY,
    report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    kind TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    revision INTEGER NOT NULL CHECK (revision > 0),
    payload TEXT NOT NULL
);

CREATE INDEX idx_report_events_report_revision
    ON report_events(report_id, revision, id);

CREATE TABLE sync_peers (
    peer_id TEXT PRIMARY KEY,
    last_seen_at TEXT NOT NULL,
    last_event_id TEXT,
    state TEXT NOT NULL CHECK (state IN ('pending', 'connected', 'unavailable'))
);
