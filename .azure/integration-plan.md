# Integration hand-off — Pocket Black Box

## Backend
- Project: `processor/`
- Run: from `processor/`, `python -m app.main` (binds only `127.0.0.1:8765`)
- Build/syntax: from workspace root, `python -m compileall -q processor/app processor/tests`
- Tests: from `processor/`, `python -m pytest`
- Health: `GET /api/health`
- Local DB: `processor/data/pocket-black-box.sqlite3`, override with `PBB_DATABASE_PATH`
- Migration runner: `ReportRepository.migrate()` applies `processor/migrations/*.sql` at startup.
- Tables: `reports`, `report_events`, `sync_peers`, `schema_migrations`. SQLite schema migration is `processor/migrations/001_initial_schema.sql`; NO seed/demo data.

## Frontend
- Project: `apps/pocket-black-box-android/`
- Install (development only): `npm install` with cwd `apps/pocket-black-box-android/`
- Build/typecheck: `npm run build` (runs `tsc --noEmit`)
- Tests: `npm test`
- Dev bundle: `npm start`; Android: `npm run android`
- API seam: `src/data/localApi.ts` (fixed same-device `127.0.0.1:8765`) behind `src/data/reportRepository.ts`
- Persistence/offline queue: `src/data/localDatabase.ts`, `src/data/localReports.ts`; app-private SQLite with `reports`, `report_events`, `sync_outbox`, `peer_sync_state`.
- Mock files to remove: none; application screens use local typed repository and real empty/device data. No sample rows are installed.
- Shared types: `src/domain/report.ts`; merge events in `src/domain/sync.ts`.
- Backend-unavailable behavior: reads from local SQLite; saves locally and retries a durable outbox on subsequent reads.

## API route inventory
- `GET /api/health`
- `POST /api/reports` — text, optional location/needs/urgency/status, optional id for retry idempotency
- `GET /api/reports` — optional `urgency` and `status` filters
- `GET /api/reports/{reportId}`
- `PATCH /api/reports/{reportId}`
- `POST /api/transcribe` — multipart `audio`, transient; structured 503 until a verified local Whisper runtime/model is packaged
- `POST /api/triage` — deterministic offline heuristic; suggestions remain editable

## Services and limitations
- Essential: React Native Paper Android client; local FastAPI processor; SQLite report/event persistence; offline text reporting; local heuristic suggestions.
- Enhancement: Whisper small (adapter only; no model/runtime assets packaged); Bluetooth/Wi-Fi Direct (typed Android bridge contracts, radio discovery/transfer not implemented); location/map (manual-area/list fallback, no offline map dataset).
- App/server networking is loopback-only; no hosted/cloud endpoint, sign-in, remote map tile, runtime download, or external network integration.
- Device validation remains required for embedded CPython/ASGI lifecycle, Android packaging, microphone permission/recording, Whisper runtime/model packaging, Bluetooth/Wi-Fi Direct permissions/discovery/transfer, and multi-device conflict tests.
