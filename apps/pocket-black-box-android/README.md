# Pocket Black Box Android demo

The Android app is self-contained and works offline. Follow the setup and demo walkthrough in the
workspace [README](../../README.md).

For a browser-only demo with no Android build tools, run the static site in [demo-site](./demo-site/)
as described in the workspace README.

Reports are stored in app-private SQLite. `src/domain/triage.ts` implements the reviewable
English/Bengali offline suggestions; `src/domain/demoScenario.ts` defines the explicitly
user-loaded fictional Sundarbans sample; and `src/screens/PriorityMapScreen.tsx` plots saved
coordinates without map tiles.
