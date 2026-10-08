import type { Area, Role } from './roles';
import { areasFor } from './roles';

export type MobileSession = {
  role: Role;
  title: string;
  userId: string;
  access: Area[];
};

let session: MobileSession | null = null;
const listeners = new Set<() => void>();

export function getSession(): MobileSession | null {
  return session;
}

export function setSession(next: MobileSession | null) {
  session = next;
  listeners.forEach((l) => l());
}

export function subscribeSession(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function sessionFromLogin(role: Role, title: string, userId: string): MobileSession {
  const overrides = (
    globalThis as typeof globalThis & { __tgAccess?: Record<Role, Area[]> }
  ).__tgAccess;
  return { role, title, userId, access: overrides?.[role] ?? areasFor(role) };
}

export function updateSessionAccess(access: Area[]) {
  if (!session) return;
  session = { ...session, access };
  listeners.forEach((l) => l());
}
