A tool that works offline during floods or cyclones (highly relevant in West Bengal). Volunteers log reports by voice or text, a small local model classifies urgency and needs (medical, rescue, food), and phones sync peer-to-peer over Bluetooth/Wi-Fi Direct into a live priority map. Stack: Python, Whisper (small), a lightweight classifier, SQLite with CRDT-style sync, Folium for maps. Judges love resilience plus social impact.

# Pocket Black Box

Pocket Black Box is an offline-first Android demo for volunteer incident intake and emergency
triage. It stores reports in app-private SQLite, classifies English and Bengali text on-device,
lets volunteers review and update urgency/status, and plots located incidents on an on-device
relative priority map. It requires no server, account, model download, or internet connection.

## Open the browser demo

The standalone browser demo uses only local HTML, CSS, and JavaScript. It needs no package install,
map service, API, or internet connection. From the project root, start a local static-file server:

```powershell
py -m http.server 4173 --bind 127.0.0.1 --directory apps/pocket-black-box-android/demo-site
```

Then open `http://127.0.0.1:4173/`. Press **Load Sundarbans demo reports** to load four fictional
examples. Record and triage reports, edit volunteer status and urgency, search/filter, and view
coordinates on the relative plot. The browser saves reports in its own local storage, and a
service worker caches the app shell for later offline use after the first visit. Use the same
browser and address to see the same saved data. Clearing that browser's site data clears the demo
reports. The browser demo and Android app store their data separately; neither syncs to the other.

This is a non-dispatch demo. Its English/Bengali keyword triage is only a volunteer-reviewed
suggestion, not a medical assessment. Voice transcription and peer-to-peer radio transfer are not
implemented in the verified demo. The browser uses manual locations and a relative coordinate
plot instead of an online map.

## Run the Android demo

Requirements: Node.js/npm, JDK 17, Android SDK Platform 35/build-tools 35, Gradle 8.10.x,
and an emulator or USB-connected Android phone.

From `apps/pocket-black-box-android/`:

```text
npm install
npm run typecheck
npm test
npm run android
```

To package a demo APK that includes the JavaScript bundle and does not need Metro:

```text
cd android
gradlew.bat :app:assembleRelease
```

Gradle's unsigned output is
`apps/pocket-black-box-android/android/app/build/outputs/apk/release/app-release-unsigned.apk`.
A standalone demo APK is also available as [app-release.apk](apps/pocket-black-box-android/android/app/build/outputs/apk/release/app-release.apk).
It is signed with the local Android debug key for demo installation, not production distribution.
Install it on a connected device with:

```text
adb install -r apps/pocket-black-box-android/android/app/build/outputs/apk/release/app-release.apk
```

For distribution, sign a release build with your organization's release key.

### Demo walkthrough

1. Open **Reports** and choose **Load demo reports**. This adds four clearly marked fictional
   Sundarbans flood incidents. It never replaces existing reports and is safe to press again.
2. Review the high-priority rescue and medical reports; change urgency or advance a report's
   volunteer status.
3. Open **Priority map** to see the four fictional locations on an offline relative-coordinate
   plot.
4. Open **New report**, enter an incident in English or Bengali, choose **Suggest offline
   triage**, review/edit the suggestions, add an optional landmark/coordinate pair, and save.
   The report appears in Reports and the map updates while the app remains open.

All demo incidents and real reports live only in the app's private SQLite database. The sample
scenario is fictional and labeled as such. Triage is a lightweight keyword heuristic, not a
trained model, medical diagnosis, or replacement for volunteer judgment.

## Demo scope

The demo intentionally focuses on fully local text entry, triage, volunteer review, persistence,
and the no-tile map. Voice transcription and device-to-device radio transfer are not included in
the demo workflow. Coordinates and area labels are entered manually; no GPS or online map lookup
is used.

## Optional Python processor

`processor/` contains a separate local FastAPI/SQLite service for API development. It is not
required by, or connected to, the Android demo:

```text
cd processor
python -m venv .venv
python -m pip install -r requirements.txt
python -m pytest
python -m app.main
```

The service binds to `127.0.0.1:8765` and its database defaults to
`processor/data/pocket-black-box.sqlite3`. Set `PBB_DATABASE_PATH` to choose another local file.
Its `/api/map` endpoint renders an SVG map without external assets or tile requests. SQL
migrations create schema only; they do not insert demonstration data.
