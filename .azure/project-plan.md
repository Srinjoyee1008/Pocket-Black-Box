# Project Plan

**Status**: Approved
**Created**: 2026-11-05
**Mode**: NEW
**Execution Mode**: auto

---

## 1. Project Overview

**Goal**: Build Pocket Black Box, an Android volunteer app for offline voice/text incident reporting, on-device triage, a priority map, and local peer-to-peer report synchronization. The project is designed so that every module is independently testable.

**App Type**: SPA + API (React Native Android client with an on-device local API)

**API Login**: No

**Mode**: NEW

**Deployment Plan**: No deployment plan found

---

## 2. Backend — On-device FastAPI Processor

| Component | Technology |
|-----------|-----------|
| **Language** | Python |
| **Framework** | FastAPI, bound to device-local loopback only |
| **Runtime** | CPython embedded/on-device |
| **Package Manager** | pip |
| **Test Runner** | pytest |
| **Mocking Library** | unittest.mock |
| **Test Command** | `python -m pytest` |
| **Orchestration** | docker-compose (development-only; not an on-device or network dependency) |

The local processor runs Whisper small and a lightweight urgency/needs classifier on the same Android device. It uses SQLite for report persistence and exposes only a device-local interface to the Android client; it has no cloud endpoint or internet dependency. Package the model assets with the app so first use and normal operation do not require a download. Keep audio ephemeral for inference unless retaining a recording proves necessary; do not sync audio. Model suggestions remain reviewable and editable, and manual text reporting remains available if inference cannot run.

Peer sync uses Android Bluetooth and Wi-Fi Direct transports, initiated locally by volunteers. Exchange report records/events, not recordings; make transfers retryable and idempotent and merge concurrent changes with deterministic CRDT-style rules while preserving event history.

---

## 3. Frontend — Android Client

| Component | Technology |
|-----------|-----------|
| **Language** | TypeScript |
| **Framework** | React Native (Android) |
| **Runtime** | Android / Hermes |
| **Component Library** | React Native Paper |
| **Package Manager** | npm |
| **Test Runner** | Jest |
| **Mocking Library** | jest.mock |
| **Test Command** | `npm test` |

The client supports offline voice/text report capture, human-reviewed triage, local report management, and priority-map views. The map is rendered from locally stored report coordinates and available on-device map data; it must not depend on online map tiles. Keep a list and manual-location fallback when GPS or map data is unavailable. Native Android modules provide Bluetooth/Wi-Fi Direct discovery and transfer.

---

## 4. Services Required

**Azure cloud resources**: None. No hosted API, cloud storage, cloud identity, account dependency, or internet connection is part of the design. The components below run locally on the Android device.

| Azure Service | Role in App | Environment Variable | Default Value (Local) | Classification |
|---------------|------------|---------------------|----------------------|----------------|
| SQLite (on-device; not Azure) | Persist reports, triage state, sync events, and merge metadata in app-private storage | None | App-private SQLite database | Essential |
| FastAPI / CPython (on-device; not Azure) | Local client interface and on-device processing coordination | None | Device-local loopback only | Essential |
| Whisper small (on-device model; not Azure) | Transcribe voice reports without network access | None | Packaged local model assets | Enhancement |
| Lightweight urgency/needs classifier (on-device; not Azure) | Suggest priority and needs; volunteer can edit or proceed manually if unavailable | None | Packaged local model/assets | Enhancement |
| Bluetooth and Wi-Fi Direct (Android radios; not Azure) | Volunteer-initiated local exchange of report events between nearby devices | None | Device-to-device; no internet | Enhancement |
| Android location and local map rendering (not Azure) | Show report positions in priority-map views with manual-location/list fallback | None | Device location and available local map data | Enhancement |

---

## 5. Prerequisites

Run prerequisites are needed for development/building and local execution. Debug prerequisites are local-development aids; none introduces a cloud or internet runtime dependency. Verify all `❓` tools before proceeding.

### Run

| Tool | Service(s) | Installed | Version |
|------|------------|-----------|---------|
| Node.js | Android client | ✅ | 26.8.2 |
| npm | Android client | ✅ | 11.19.1 |
| Python | On-device processor | ✅ | 3.14.7 |
| pip | On-device processor | ✅ | 26.2.1 |
| Android SDK Platform Tools (adb) | Android client, on-device processor | ✅ | 1.0.41 |
| JDK | Android client build | ❓ | — |

### Debug

| Tool | Service(s) | Installed | Version |
|------|------------|-----------|---------|
| Android SDK | Android client | ✅ | Version not reported; SDK directory detected |
| JDK | Android client, on-device processor | ❓ | — |
| VS Code React Native Tools extension | Android client | ❓ | — |
| VS Code Python extension | On-device processor | ✅ | 2026.11.2026102901 |

Double-check all `❓` tools are installed and compatible with the target Android devices. The detected host Python version does not by itself establish that the Whisper runtime and model dependencies can be packaged and run on-device; validate that on the selected Android hardware. No browser, container emulator, or Azure Functions tool is required for this native, local-only design.

---

## 6. Design System & UI

**Component Library**: React Native Paper
**Style Direction**: Calm, high-contrast field console for stressful, low-connectivity situations: compact report rows, unmistakable urgency states, generous touch targets, and a restrained navy/amber accent. Keep the primary actions obvious without making model suggestions look authoritative.
**Typography**: system-ui, Roboto

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#174A6E` | Pocket Black Box navigation, report actions, and selected triage controls |
| `accent` | `#D58A16` | Urgency markers, attention highlights, and priority-map emphasis |
| `surface` | `#F3F6F8` | Offline report workspace and page backgrounds |
| `text` | `#172B3A` | Report summaries, triage labels, and map-area names |
| `muted` | `#617382` | Sync freshness, confidence notes, and capture timestamps |
| `border` | `#D4DEE5` | Report row separators, form outlines, and map-panel boundaries |

### Pages

| Page | Route | Purpose | Layout |
|------|-------|---------|--------|
| Report Triage | `/reports` | Review locally saved incidents, urgency suggestions, and sync freshness | `header, nav, main, actions, table, card-list, footer` |
| New Report | `/reports/new` | Capture a voice or text report and review on-device triage before saving | `header, nav, main, two-column(form+card-list), actions` |
| Priority Map | `/priority-map` | See local report locations and urgency with an offline list fallback | `header, nav, main, two-column(grid+list), actions` |

### Sample Content

Report Triage — report:
| Report | Summary | Area | Priority / State |
|--------|---------|------|------------------|
| PBB-204 | Child with fever; medical assessment requested | Zone A | High · Needs review |
| PBB-205 | Household requests drinking water | Zone C | Medium · Open |
| PBB-206 | Older adult needs medication access | Zone B | High · Assigned |
| PBB-207 | Fallen tree blocking access to a shelter | Zone D | Medium · Open |

New Report — triage preview:
| Report text | Suggested needs | Suggested urgency | Review state |
|-------------|-----------------|-------------------|--------------|
| “Two people need help clearing a safe path to the shelter.” | Rescue, access | Medium | Volunteer review |
| “A household needs clean drinking water.” | Water | Medium | Volunteer review |
| “A resident needs an urgent medical assessment.” | Medical | High | Volunteer review |

New Report — field defaults: Report text: blank · Location: Add manually or use device location · Voice: Transcribe on device · Save behavior: Store report locally

Priority Map — report:
| Report | Area | Priority | Sync state |
|--------|------|----------|------------|
| PBB-204 | Zone A | High | Not yet shared |
| PBB-205 | Zone C | Medium | Shared with 1 nearby device |
| PBB-206 | Zone B | High | Sync pending |
| PBB-207 | Zone D | Medium | Not yet shared |

---

## 7. Project Structure

```text
Pocket-Black-Box/
├── .azure/
│   ├── project-plan.md
│   └── .preview-temp/
│       ├── theme.css
│       ├── manifest.json
│       ├── report-triage.html
│       ├── new-report.html
│       └── priority-map.html
├── apps/
│   └── pocket-black-box-android/
│       ├── android/
│       │   └── app/src/main/
│       │       ├── java/.../sync/       # Bluetooth and Wi-Fi Direct native modules
│       │       └── assets/models/        # Packaged offline Whisper/classifier assets
│       ├── src/
│       │   ├── screens/                  # Report Triage, New Report, Priority Map
│       │   ├── components/
│       │   ├── data/                     # Typed local API client and report models
│       │   └── sync/                     # Sync status and merge coordination
│       └── tests/
└── processor/
    ├── app/main.py                       # Device-local FastAPI entry point
    ├── app/transcription/                # Whisper small adapter
    ├── app/classification/               # Lightweight urgency/needs classifier
    ├── app/storage/                       # SQLite repository and event history
    └── tests/                             # API, storage, inference, and merge tests
```

---

## 8. Route Definitions

All HTTP routes are local to the same device and are not exposed as hosted or internet-facing endpoints. Bluetooth/Wi-Fi Direct synchronization uses a native peer transport and is not an HTTP route.

| # | Method | Path | Description | Request Body | Response Body | Status Codes |
|---|--------|------|-------------|-------------|--------------|-------------|
| 1 | GET | `/api/health` | Report local processor, database, and model readiness | — | `{ status, services }` | 200, 503 |
| 2 | POST | `/api/reports` | Create and persist a text or transcribed report | `{ text, location?, needs?, urgency? }` | `{ report }` | 201, 422 |
| 3 | GET | `/api/reports` | List local reports with optional triage filters | — | `{ reports, count }` | 200 |
| 4 | GET | `/api/reports/{reportId}` | Read one locally stored report and its sync state | — | `{ report, events }` | 200, 404 |
| 5 | PATCH | `/api/reports/{reportId}` | Update volunteer-reviewed urgency, needs, location, or status | `{ urgency?, needs?, location?, status? }` | `{ report }` | 200, 404, 422 |
| 6 | POST | `/api/transcribe` | Transcribe a voice clip locally; audio is not retained by default | `audio (multipart/form-data; transient processing)` | `{ transcript, modelStatus }` | 200, 422, 503 |
| 7 | POST | `/api/triage` | Return editable on-device urgency and needs suggestions | `{ text }` | `{ suggestions, confidence, modelStatus }` | 200, 422, 503 |

---

## 9. Next Steps

1. Review and approve this local-only plan.
2. After approval, implement the Android client and on-device Python/FastAPI processor using the planned stack and component boundaries.
3. Validate airplane-mode reporting, on-device Whisper/classifier execution, SQLite persistence, and Bluetooth/Wi-Fi Direct synchronization on target Android devices.
4. Azure deployment and cloud provisioning are intentionally out of scope; do not add Azure resources, hosted services, account dependencies, or internet requirements.
