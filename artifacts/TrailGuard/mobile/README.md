# TrailGuard Field (Expo)

Offline-first Android/iOS field client for **every ranger phone**, all sharing **one** TrailGuard backend + database.

1. Device writes land in **expo-sqlite** first (`PENDING`) — works with no signal.
2. Sync upserts by stable UUID to the **shared** API (`/api/v1`).
3. That API writes the same Neon/Postgres `field_*` tables the web Super Admin sees on `/admin`.

## Stack

| Layer | Choice |
|-------|--------|
| UI | Expo / React Native (light theme default; Night toggle) |
| Offline DB | `expo-sqlite` (`src/store/localStore.ts`) |
| Sync | `src/services/syncService.ts` → HTTP upsert |
| Maps | `OfflineMap` (lat/lng track, no network tiles) |
| Location | `expo-location` (MANUAL pin only if GPS unavailable) |
| Auth | Field PIN + role matrix (viva shell; not graded UC work) |

## Flow

1. **Onboarding** → feature tour  
2. **Login** — User ID + PIN (role-gated Home)  
3. **Home** — set/confirm **live API URL**, health banner, Sync, UC cards for this role  
4. **Patrol / Incident / Conflict / Reports** — SQLite first, Sync when online  

## Live backend (required)

```bash
# Deployed web app (Neon via deploy.database)
export EXPO_PUBLIC_API_URL=https://YOUR_DEPLOYED_HOST/api/v1

# Same Wi‑Fi laptop running `npm run dev` (use your LAN IP, not localhost)
export EXPO_PUBLIC_API_URL=http://192.168.x.x:8080/api/v1

# Android emulator → host machine
export EXPO_PUBLIC_API_URL=http://10.0.2.2:8080/api/v1
```

`GET $EXPO_PUBLIC_API_URL/health` → `{ shared: true, source: "neon"|"pglite", counts… }`.

After install you can still change the URL on **Home → Save API URL** (stored in SQLite).

## Android APK (debug)

Requires **Android SDK** + **JDK 17 or 21** (not JDK 25/26). `EXPO_PUBLIC_API_URL` is **required** by the build script.

```bash
cd artifacts/TrailGuard/mobile
export EXPO_PUBLIC_API_URL=https://YOUR_HOST/api/v1   # or LAN / 10.0.2.2
npm install --ignore-scripts
npm run apk:debug
```

Output: `build/apk/trailguard-debug.apk` (~140+ MB, must contain `classes.dex`).

```bash
adb install -r build/apk/trailguard-debug.apk
```

## Tables

`patrols`, `waypoints`, `incidents`, `conflicts`, `sync_queue`, `app_settings` — upsert by UUID, states `PENDING` | `SYNCED` | `FAILED`.
