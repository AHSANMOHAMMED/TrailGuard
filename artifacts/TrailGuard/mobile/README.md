# TrailGuard Field (Expo)

Offline-first Android/iOS field client. **No Neon, Docker, or cloud DB required on your Mac** — every field write lands in **expo-sqlite** on the device first (`PENDING`), then Sync upserts by stable UUID when `EXPO_PUBLIC_API_URL` is set.

## Stack

| Layer | Choice |
|-------|--------|
| UI | Expo / React Native |
| Offline DB | `expo-sqlite` (`src/store/localStore.ts`) |
| Sync | `src/services/syncService.ts` → HTTP upsert |
| Maps | `OfflineMap` (lat/lng track, no network tiles) |
| Auth | Field PIN + Super Admin role divide |

## Flow

1. **Onboarding** → explain offline save + maps  
2. **Login** — Super Admin `9999`, Ranger `4021`, etc.  
3. **Admin** (Super Admin) — toggle which areas each role may open  
4. **Home / Patrol / Incident / Conflict / Reports** — SQLite first, Sync when online  

## Run

```bash
cd artifacts/TrailGuard/mobile
npm install
npm start
```

Optional API base for sync (otherwise records stay PENDING on device):

```bash
export EXPO_PUBLIC_API_URL=https://your-host/api/v1
```

## Android APK (debug)

Requires Android SDK (platforms;android-34, build-tools 36) + JDK. Bundle JS, then package:

```bash
# From mobile/
./expo-export.sh
./scripts/build-android-apk.sh
```

`expo-export.sh` writes `build/android-standalone/index.android.bundle`; the APK script packages it into:

- `build/apk/trailguard-debug.apk` (aligned)
- `build/apk/trailguard-debug-unaligned.apk`

## Tables

`patrols`, `waypoints`, `incidents`, `conflicts`, `sync_queue` — upsert by UUID, states `PENDING` | `SYNCED` | `FAILED`.
