"""PatrolService — start, waypoints, complete, upsert."""
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.entities import Patrol, Waypoint, PatrolStatus, SyncState

def upsert_patrol(db: Session, payload: dict) -> dict:
    """Idempotent upsert by patrol_id (stable client UUID)."""
    patrol = db.get(Patrol, payload["patrol_id"])
    if patrol is None:
        patrol = Patrol(
            patrol_id=payload["patrol_id"],
            route_id=payload["route_id"],
            officer_id=payload["officer_id"],
            status=payload.get("status", PatrolStatus.COMPLETED.value),
            started_at=datetime.fromisoformat(payload["started_at"]),
            completed_at=datetime.fromisoformat(payload["completed_at"]) if payload.get("completed_at") else None,
            sync_state=SyncState.SYNCED.value,
        )
        db.add(patrol)
    else:
        patrol.status = payload.get("status", patrol.status)
        patrol.completed_at = (
            datetime.fromisoformat(payload["completed_at"]) if payload.get("completed_at") else patrol.completed_at
        )
        patrol.sync_state = SyncState.SYNCED.value

    for wp in payload.get("waypoints", []):
        existing = db.get(Waypoint, wp["point_id"])
        if existing is None:
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
    return {"id": patrol.patrol_id, "version": 1, "complete": True}
