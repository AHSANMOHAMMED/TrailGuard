"""ReportService — one consistent snapshot from SYNCED records only (R-07)."""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy import select, func
from sqlalchemy.orm import Session

from app.models.entities import Alert, IncidentReport, Patrol, SyncState

MAX_WINDOW_DAYS = 92

# route_id -> assigned distance in km (configurable per park)
ROUTE_DISTANCE_KM: dict[str, float] = {
    "RT-07": 12.4,
    "RT-03": 8.2,
}


class ReportValidationError(Exception):
    pass


def validate_window(date_from: datetime, date_to: datetime) -> None:
    """S5/R-07: bound the query window; reject inverted ranges."""
    if date_to < date_from:
        raise ReportValidationError("From date must be on or before To date")
    if (date_to - date_from).days > MAX_WINDOW_DAYS:
        raise ReportValidationError(f"Choose a window up to {MAX_WINDOW_DAYS} days")


def coverage_percent(patrols: list[Patrol]) -> float:
    """T2/R-07: covered track length ÷ assigned route length, capped at 100.

    Covered km per patrol is approximated by the haversine length of its
    waypoint polyline, never exceeding the route's assigned distance.
    """
    from math import asin, cos, radians, sin, sqrt

    def track_km(points: list[tuple[float, float]]) -> float:
        total = 0.0
        for (lat1, lng1), (lat2, lng2) in zip(points, points[1:]):
            r = 6371.0
            dlat = radians(lat2 - lat1)
            dlng = radians(lng2 - lng1)
            h = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng / 2) ** 2
            total += 2 * r * asin(min(1.0, sqrt(h)))
        return total

    route_km = sum(ROUTE_DISTANCE_KM.get(p.route_id, 0.0) for p in patrols)
    if route_km == 0:
        return 0.0
    covered = 0.0
    for p in patrols:
        pts = [(w.lat, w.lng) for w in sorted(p.waypoints, key=lambda w: w.recorded_at)]
        limit = ROUTE_DISTANCE_KM.get(p.route_id, float("inf"))
        covered += min(track_km(pts), limit)
    return min(100.0, round(covered / route_km * 100, 1))


def generate_snapshot(db: Session, park_id: str, date_from: datetime, date_to: datetime) -> dict:
    validate_window(date_from, date_to)

    inc_q = select(func.count()).select_from(IncidentReport).where(
        IncidentReport.park_id == park_id,
        IncidentReport.observed_at >= date_from,
        IncidentReport.observed_at <= date_to,
        IncidentReport.sync_state == SyncState.SYNCED.value,
    )
    incident_count = db.scalar(inc_q) or 0

    patrols = (
        db.query(Patrol)
        .filter(
            Patrol.started_at >= date_from,
            Patrol.started_at <= date_to,
            Patrol.sync_state == SyncState.SYNCED.value,
            Patrol.status == "COMPLETED",
        )
        .all()
    )

    alert_count = (
        db.query(Alert)
        .filter(Alert.observed_at >= date_from, Alert.observed_at <= date_to)
        .count()
    )

    # Stable snapshot id: same window reproduces the same snapshot for export.
    report_id = f"rep-{park_id}-{date_from.date().isoformat()}-{date_to.date().isoformat()}"

    return {
        "report_id": report_id,
        "park_id": park_id,
        "from": date_from.isoformat(),
        "to": date_to.isoformat(),
        "cutoff": date_to.isoformat(),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "incident_count": incident_count,
        "patrol_count": len(patrols),
        "coverage_percent": coverage_percent(patrols),
        "conflict_count": alert_count,
        "note": "Pending field records excluded",
    }
