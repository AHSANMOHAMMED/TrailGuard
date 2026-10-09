/**
 * Expo config — every field phone points at ONE shared TrailGuard backend.
 * Set EXPO_PUBLIC_API_URL to the deployed web host + /api/v1, e.g.
 *   EXPO_PUBLIC_API_URL=https://your-app.example.com/api/v1
 * All devices then upsert into the same Neon/Postgres field_* tables.
 */
const sharedApi =
  process.env.EXPO_PUBLIC_API_URL?.trim() ||
  process.env.TRAILGUARD_API_URL?.trim() ||
  // Production park host — override at build time or on Home → Save API URL.
  "https://trailguard-sable.vercel.app/api/v1";

export default {
  expo: {
    name: "TrailGuard",
    slug: "trailguard-field",
    version: "1.0.0",
    orientation: "portrait",
    platforms: ["ios", "android"],
    android: {
      package: "com.trailguard.field",
      permissions: ["ACCESS_COARSE_LOCATION", "ACCESS_FINE_LOCATION"],
    },
    splash: {
      backgroundColor: "#F6F8F5",
    },
    userInterfaceStyle: "light",
    extra: {
      apiUrl: sharedApi,
      eas: {
        projectId: process.env.EAS_PROJECT_ID || undefined,
      },
    },
  },
};
