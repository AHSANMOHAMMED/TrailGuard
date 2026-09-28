"""PatrolService — start, waypoints (GPS/manual), finish with flush, upsert."""
from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

from sqlalchemy.orm import Session

from app.models.entities import Patrol, PatrolStatus, SyncState, Waypoint
from app.models.domain import GeoPoint


class PatrolError(Exception):
    pass


def start_patrol(db: Session, route_id: str, officer_id: str) -> Patrol:
    """UC01 step 2 / extension 4a: never a second active patrol."""
    active = (
        db.query(Patrol)
        .filter(Patrol.status == PatrolStatus.ACTIVE.value, Patrol.officer_id == officer_id)
        .one_or_none()
    )
    if active is not None:
        return active
    patrol = Patrol(
        patrol_id=str(uuid4()),
        route_id=route_id,
        officer_id=officer_id,
        status=PatrolStatus.ACTIVE.value,
        started_at=datetime.now(timezone.utc),
        sync_state=SyncState.PENDING.value,
    )
    db.add(patrol)
    db.commit()
    return patrol


def record_point(db: Session, patrol_id: str, geo: GeoPoint, source: str = "GPS",
                 recorded_at: datetime | None = None, point_id: str | None = None) -> Waypoint:
    patrol = db.get(Patrol, patrol_id)
    if patrol is None:
        raise PatrolError("Patrol not found")
    if patrol.status != PatrolStatus.ACTIVE.value:
        raise PatrolError("Patrol is not active")
    wp = Waypoint(
        point_id=point_id or str(uuid4()),
        patrol_id=patrol_id,
        lat=geo.lat,
        lng=geo.lng,
        source=source,
        recorded_at=recorded_at or datetime.now(timezone.utc),
    )
    db.add(wp)
    patrol.sync_state = SyncState.PENDING.value
    db.commit()
    return wp


def complete_patrol(db: Session, patrol_id: str, flush_tail: list[GeoPoint] | None = None) -> Patrol:
    """S1/R-05: flush any in-flight waypoint tail before completing."""
    patrol = db.get(Patrol, patrol_id)
    if patrol is None:
        raise PatrolError("Patrol not found")
    if patrol.status != PatrolStatus.ACTIVE.value:
        raise PatrolError("Patrol is not active")
    for geo in flush_tail or []:
        record_point(db, patrol_id, geo)
    patrol.status = PatrolStatus.COMPLETED.value
    patrol.completed_at = datetime.now(timezone.utc)
    patrol.sync_state = SyncState.PENDING.value
    db.commit()
    return patrol


def upsert_patrol(db: Session, payload: dict) -> dict:
    """Idempotent by patrol_id (stable client UUID); dedups waypoints on retry."""
    patrol = db.get(Patrol, payload["patrol_id"])
    created = patrol is None
    if patrol is None:
        patrol = Patrol(
            patrol_id=payload["patrol_id"],
            route_id=payload["route_id"],
            officer_id=payload["officer_id"],
            status=payload.get("status", PatrolStatus.COMPLETED.value),
            started_at=datetime.fromisoformat(payload["started_at"]),
            completed_at=(
                datetime.fromisoformat(payload["completed_at"]) if payload.get("completed_at") else None
            ),
            sync_state=SyncState.SYNCED.value,
        )
        db.add(patrol)
    else:
        patrol.status = payload.get("status", patrol.status)
        if payload.get("completed_at"):
            patrol.completed_at = datetime.fromisoformat(payload["completed_at"])
        patrol.sync_state = SyncState.SYNCED.value

    existing_points = {w.point_id for w in db.query(Waypoint).filter(Waypoint.patrol_id == patrol.patrol_id)}
    for wp in payload.get("waypoints", []):
        if wp["point_id"] in existing_points:
            continue
        db.add(
            Waypoint(
                point_id=wp["point_id"],
                patrol_id=payload["patrol_id"],
                lat=wp["geo"]["lat"],
                lng=wp["geo"]["lng"],
                source=wp.get("source", "GPS"),
                recorded_at=datetime.fromisoformat(wp["recorded_at"]),
            )
        )
    db.commit()
    return {"id": patrol.patrol_id, "version": 1, "complete": True, "created": created}
