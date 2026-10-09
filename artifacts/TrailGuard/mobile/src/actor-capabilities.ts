/**
 * Actor ↔ use-case capabilities — mirror of web `src/lib/actor-capabilities.ts`.
 */
import type { Role, Area } from './roles';
import { DEFAULT_ACCESS } from './roles';

export function areasForRole(role: Role): Area[] {
  return DEFAULT_ACCESS[role] ?? [];
}

export function isConflictSubmitter(role: Role | null | undefined): boolean {
  return role === 'COMMUNITY' || role === 'SUPER_ADMIN';
}

export function isConflictStaff(role: Role | null | undefined): boolean {
  return (
    role === 'RANGER' ||
    role === 'LIAISON' ||
    role === 'MANAGER' ||
    role === 'SUPER_ADMIN'
  );
}

export function isAlertResponder(role: Role | null | undefined): boolean {
  return role === 'RANGER' || role === 'LIAISON' || role === 'SUPER_ADMIN';
}

export function isAlertAssigner(role: Role | null | undefined): boolean {
  return role === 'MANAGER' || role === 'SUPER_ADMIN';
}

/** Who may see Sync (upload pending) on home. */
export function canSyncField(role: Role | null | undefined): boolean {
  return (
    role === 'RANGER' ||
    role === 'LIAISON' ||
    role === 'MANAGER' ||
    role === 'SUPER_ADMIN' ||
    role === 'COMMUNITY'
  );
}

/** Pull DB / API URL / Neon jargon — Admin (and Manager ops) only. */
export function canSeeEngineerChrome(role: Role | null | undefined): boolean {
  return role === 'SUPER_ADMIN' || role === 'MANAGER';
}

export function canSeePullDb(role: Role | null | undefined): boolean {
  return role === 'SUPER_ADMIN' || role === 'MANAGER';
}

export function actorMission(role: Role): string {
  switch (role) {
    case 'RANGER':
      return 'Your work: patrols, field incidents, risk response, conflict desk';
    case 'LIAISON':
      return 'Your work: risk coordination and community conflict responses';
    case 'MANAGER':
      return 'Your work: assign risk alerts, review ops, conservation reports';
    case 'RESEARCHER':
      return 'Your work: conservation reports and exports (synced data only)';
    case 'COMMUNITY':
      return 'Your work: report wildlife conflict near the park (app or SMS)';
    case 'SUPER_ADMIN':
      return 'Your work: all field areas + divide roles for every actor';
    default:
      return 'Field operations';
  }
}

export const HOME_AREA_ORDER: Area[] = [
  'patrol',
  'incidents',
  'alerts',
  'conflict',
  'radio',
  'reports',
  'admin',
];

export function homeAreasFor(role: Role, access: Area[]): Area[] {
  return HOME_AREA_ORDER.filter((a) => access.includes(a));
}
