# Android build notes

This is a React Native CLI Android project (Hermes, minSdk 24). It requires JDK 17,
Android SDK Platform 35, Android build-tools 35, and a compatible Gradle 8.10.x
installation. `local.properties` is intentionally ignored and must point at the local SDK.
No Gradle wrapper binary is checked in; run a locally installed compatible Gradle from this
directory or add a wrapper generated from a trusted local Gradle installation.

The only cleartext exception is `localhost` / `127.0.0.1` for the on-device processor.
The app does not configure a remote API, online tiles, or network download.
