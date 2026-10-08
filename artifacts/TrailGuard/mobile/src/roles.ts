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
  RANGER: ['patrol', 'incidents', 'alerts', 'conflict', 'radio'],
  LIAISON: ['alerts', 'conflict', 'radio'],
  MANAGER: ['alerts', 'conflict', 'reports', 'radio'],
  RESEARCHER: ['reports', 'radio'],
  COMMUNITY: ['conflict', 'radio'],
};

export const AREA_ROUTES: { area: Area; title: string; route: string }[] = [
  { area: 'patrol', title: 'UC01 · Patrol', route: 'Patrol' },
  { area: 'incidents', title: 'UC02 · Incident', route: 'Incident' },
  { area: 'conflict', title: 'UC03 · Conflict', route: 'Conflict' },
  { area: 'reports', title: 'UC04 · Reports', route: 'Reports' },
  { area: 'admin', title: 'Role admin', route: 'Admin' },
];

export function areasFor(role: Role): Area[] {
  return DEFAULT_ACCESS[role] ?? [];
}

export function canAccess(role: Role, area: Area, overrides?: Record<Role, Area[]>): boolean {
  const map = overrides ?? DEFAULT_ACCESS;
  return (map[role] ?? []).includes(area);
}
