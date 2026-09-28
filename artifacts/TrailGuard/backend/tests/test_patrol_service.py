"""UC01 PatrolService — unit tests (positive / negative / edge / error)."""
from __future__ import annotations

from datetime import datetime, timezone

import pytest

from app.models.domain import GeoPoint
from app.services import patrol_service as ps


def test_start_patrol_creates_active_pending(db):
    p = ps.start_patrol(db, "RT-07", "off-1")
    assert p.status == "ACTIVE"
    assert p.sync_state == "PENDING"


def test_start_patrol_never_creates_second_active(db):
    """Extension 4a: a second start returns the existing patrol."""
    p1 = ps.start_patrol(db, "RT-07", "off-1")
    p2 = ps.start_patrol(db, "RT-07", "off-1")
    assert p1.patrol_id == p2.patrol_id


def test_record_point_gps_and_manual(db):
    p = ps.start_patrol(db, "RT-07", "off-1")
    w1 = ps.record_point(db, p.patrol_id, GeoPoint(lat=6.4, lng=81.12), source="GPS")
    w2 = ps.record_point(db, p.patrol_id, GeoPoint(lat=6.41, lng=81.13), source="MANUAL")
    assert {w1.source, w2.source} == {"GPS", "MANUAL"}


def test_record_point_rejects_completed_patrol(db):
    p = ps.start_patrol(db, "RT-07", "off-1")
    ps.complete_patrol(db, p.patrol_id)
    with pytest.raises(ps.PatrolError):
        ps.record_point(db, p.patrol_id, GeoPoint(lat=6.4, lng=81.12))


def test_complete_patrol_flushes_in_flight_tail(db):
    """S1/R-05: the tail waypoint lands before completion."""
    p = ps.start_patrol(db, "RT-07", "off-1")
    done = ps.complete_patrol(db, p.patrol_id, flush_tail=[GeoPoint(lat=6.42, lng=81.14)])
    assert done.status == "COMPLETED"
    assert len(done.waypoints) == 1
    assert done.completed_at is not None


def test_complete_patrol_twice_rejected(db):
    p = ps.start_patrol(db, "RT-07", "off-1")
    ps.complete_patrol(db, p.patrol_id)
    with pytest.raises(ps.PatrolError):
        ps.complete_patrol(db, p.patrol_id)


def test_upsert_patrol_creates_then_idempotent(db):
    payload = {
        "patrol_id": "PT-X",
        "route_id": "RT-07",
        "officer_id": "off-1",
        "status": "COMPLETED",
        "started_at": "2026-09-01T06:00:00+00:00",
        "completed_at": "2026-09-01T10:00:00+00:00",
        "waypoints": [
            {"point_id": "w1", "geo": {"lat": 6.4, "lng": 81.12}, "source": "GPS",
             "recorded_at": "2026-09-01T07:00:00+00:00"},
        ],
    }
    ack1 = ps.upsert_patrol(db, payload)
    assert ack1["created"] is True
    ack2 = ps.upsert_patrol(db, payload)
    assert ack2["created"] is False
    assert ack2["complete"] is True
    patrol = db.get(__import__("app.models.entities", fromlist=["Patrol"]).Patrol, "PT-X")
    assert len(patrol.waypoints) == 1, "duplicate waypoint not re-inserted"


def test_upsert_patrol_appends_only_new_waypoints_on_resume(db):
    """Partial resume with same IDs: only genuinely new points are added."""
    base = {
        "patrol_id": "PT-R",
        "route_id": "RT-07",
        "officer_id": "off-1",
        "status": "COMPLETED",
        "started_at": "2026-09-01T06:00:00+00:00",
        "completed_at": "2026-09-01T10:00:00+00:00",
        "waypoints": [
            {"point_id": "w1", "geo": {"lat": 6.4, "lng": 81.12}, "source": "GPS",
             "recorded_at": "2026-09-01T07:00:00+00:00"},
        ],
    }
    ps.upsert_patrol(db, base)
    resumed = {**base, "waypoints": [
        base["waypoints"][0],
        {"point_id": "w2", "geo": {"lat": 6.5, "lng": 81.13}, "source": "GPS",
         "recorded_at": "2026-09-01T08:00:00+00:00"},
    ]}
    ps.upsert_patrol(db, resumed)
    patrol = db.get(__import__("app.models.entities", fromlist=["Patrol"]).Patrol, "PT-R")
    assert {w.point_id for w in patrol.waypoints} == {"w1", "w2"}
