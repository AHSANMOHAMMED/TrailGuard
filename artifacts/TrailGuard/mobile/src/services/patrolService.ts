import { v4 as uuidv4 } from 'uuid';
import { Patrol, Waypoint } from '../types/models';
import * as LocalStore from '../store/localStore';

let active: Patrol | null = null;

export function startPatrol(routeId: string, officerId: string): Patrol {
  active = {
    patrolId: uuidv4(),
    routeId,
    officerId,
    status: 'ACTIVE',
    startedAt: new Date().toISOString(),
    syncState: 'PENDING',
    waypoints: [],
  };
  LocalStore.savePatrol(active);
  return active;
}

export function recordPoint(geo: { lat: number; lng: number }, source: 'GPS' | 'MANUAL' = 'GPS'): Waypoint {
  if (!active || active.status !== 'ACTIVE') throw new Error('No active patrol');
  const wp: Waypoint = {
    pointId: uuidv4(),
    geo,
    source,
    recordedAt: new Date().toISOString(),
  };
  active.waypoints.push(wp);
  LocalStore.savePatrol(active);
  return wp;
}

export function completePatrol(): Patrol {
  if (!active) throw new Error('No active patrol');
  active.status = 'COMPLETED';
  active.completedAt = new Date().toISOString();
  active.syncState = 'PENDING';
  LocalStore.savePatrol(active);
  const done = active;
  active = null;
  return done;
}

export function getActive() {
  return active;
}
