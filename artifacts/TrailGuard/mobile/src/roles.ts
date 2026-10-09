/** Role matrix — identical to web auth-store / A01 associations. */

export type Role =
  | 'SUPER_ADMIN'
  | 'RANGER'
  | 'LIAISON'
  | 'MANAGER'
  | 'RESEARCHER'
  | 'COMMUNITY';

export type Area =
  | 'patrol'
  | 'incidents'
  | 'alerts'
  | 'conflict'
  | 'reports'
  | 'radio'
  | 'admin';

const ALL_FIELD: Area[] = [
  'patrol',
  'incidents',
  'alerts',
  'conflict',
  'reports',
  'radio',
  'admin',
];

/**
 * Default role matrix (A01 use-case associations + A02 desk).
 * Must stay in sync with web `src/lib/auth-store.ts` DEFAULT_ACCESS.
 */
export const DEFAULT_ACCESS: Record<Role, Area[]> = {
  SUPER_ADMIN: ALL_FIELD,
  RANGER: ['patrol', 'incidents', 'alerts', 'conflict', 'radio'],
  LIAISON: ['alerts', 'conflict', 'radio'],
  MANAGER: ['alerts', 'conflict', 'reports', 'radio'],
  RESEARCHER: ['reports', 'radio'],
  COMMUNITY: ['conflict', 'radio'],
};

export const AREA_ROUTES: {
  area: Area;
  title: string;
  subtitle: string;
  route: string;
  badge: string;
}[] = [
  {
    area: 'patrol',
    title: 'Ranger Patrol',
    subtitle: 'Assigned route, GPS track & coverage',
    route: 'Patrol',
    badge: 'UC01',
  },
  {
    area: 'incidents',
    title: 'Report Field Incident',
    subtitle: 'Snare · carcass · campsite · footprints',
    route: 'Incident',
    badge: 'UC02',
  },
  {
    area: 'alerts',
    title: 'Wildlife Risk Alerts',
    subtitle: 'Collar geofence · assign / respond',
    route: 'Alerts',
    badge: 'UC03',
  },
  {
    area: 'conflict',
    title: 'Human-Wildlife Conflict',
    subtitle: 'App & SMS · staff desk or submit',
    route: 'Conflict',
    badge: 'UC04',
  },
  {
    area: 'radio',
    title: 'Field Radio',
    subtitle: 'Push-to-talk · OPS / EMG / CMN',
    route: 'Radio',
    badge: 'Comms',
  },
  {
    area: 'reports',
    title: 'Conservation Reports',
    subtitle: 'Synced counts · coverage · export',
    route: 'Reports',
    badge: 'Analysis',
  },
  {
    area: 'admin',
    title: 'Role Admin',
    subtitle: 'Access matrix · demo dataset · Pull DB',
    route: 'Admin',
    badge: 'Admin',
  },
];

export function areasFor(role: Role): Area[] {
  return DEFAULT_ACCESS[role] ?? [];
}

export function canAccess(role: Role, area: Area, overrides?: Record<Role, Area[]>): boolean {
  const map = overrides ?? DEFAULT_ACCESS;
  return (map[role] ?? []).includes(area);
}
