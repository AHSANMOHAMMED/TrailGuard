/** Role matrix — same defaults as the web auth-store / A01 associations. */

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

export const DEFAULT_ACCESS: Record<Role, Area[]> = {
  SUPER_ADMIN: ['patrol', 'incidents', 'alerts', 'conflict', 'reports', 'radio', 'admin'],
  RANGER: ['patrol', 'incidents', 'alerts', 'conflict', 'reports', 'radio'],
  LIAISON: ['alerts', 'conflict', 'reports', 'radio'],
  MANAGER: ['patrol', 'incidents', 'alerts', 'conflict', 'reports', 'radio', 'admin'],
  RESEARCHER: ['reports', 'alerts', 'radio'],
  COMMUNITY: ['conflict', 'radio'],
};

export const AREA_ROUTES: { area: Area; title: string; subtitle: string; route: string; badge: string }[] = [
  {
    area: 'patrol',
    title: 'UC01 · Conduct Assigned Patrol',
    subtitle: 'GPS tracking, manual waypoints & coverage',
    route: 'Patrol',
    badge: 'Ranger',
  },
  {
    area: 'incidents',
    title: 'UC02 · Report Field Incident',
    subtitle: 'Snare, carcass, camp, footprints & photo log',
    route: 'Incident',
    badge: 'Ranger',
  },
  {
    area: 'alerts',
    title: 'UC03 · Wildlife Risk Alerts',
    subtitle: 'Collar GPS tracking, geofence & field response',
    route: 'Alerts',
    badge: 'Ranger / Liaison',
  },
  {
    area: 'conflict',
    title: 'UC04 · Human-Wildlife Conflict',
    subtitle: 'App & SMS reporting, rapid triage & response',
    route: 'Conflict',
    badge: 'Community / Staff',
  },
  {
    area: 'reports',
    title: 'Conservation Analysis & Reports',
    subtitle: 'Cross-park conflict trends & patrol analytics',
    route: 'Reports',
    badge: 'Manager / Researcher',
  },
  {
    area: 'admin',
    title: 'Role Admin & Access Matrix',
    subtitle: 'Configure operational permissions across actors',
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
