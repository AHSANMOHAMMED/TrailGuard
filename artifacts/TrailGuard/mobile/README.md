# TrailGuard Field (Expo)

Offline-first Android/iOS field client for **every ranger phone**, all sharing **one** TrailGuard backend + database.

1. Device writes land in **expo-sqlite** first (`PENDING`) — works with no signal.
2. Sync upserts by stable UUID to the **shared** API: `EXPO_PUBLIC_API_URL` → deployed web app `/api/v1`.
3. That API writes the same Neon/Postgres `field_*` tables the web Super Admin sees on `/admin`.

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

**Required for multi-phone / shared park data** — same URL on every device:

```bash
# Deployed TrailGuard web app (Neon provisioned via deploy.database)
export EXPO_PUBLIC_API_URL=https://YOUR_DEPLOYED_HOST/api/v1
```

Check the shared DB is up: `GET $EXPO_PUBLIC_API_URL/health` → `{ shared: true, source: "neon"|"pglite", counts… }`.

Without this env, records stay `PENDING` on each phone’s SQLite only (not visible to other users).

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
