"""UC02 IncidentService + UC04 ReportService — unit tests."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

from app.models.entities import Alert, IncidentReport, Patrol, Waypoint
from app.services import incident_service as inc_svc
from app.services import report_service as rep_svc


# ---------------------------------------------------------------------------
# UC02 — complete-receipt semantics
# ---------------------------------------------------------------------------

def _payload(attach_uri="file:///p1.jpg"):
    p = {
        "report_id": "IR-X",
        "park_id": "park-1",
        "type": "SNARE",
        "description": "wire snare",
        "geo": {"lat": 6.4, "lng": 81.12},
        "location_source": "GPS",
        "observed_at": "2026-09-20T09:00:00+00:00",
        "attachments": [],
    }
    if attach_uri is not None:
        p["attachments"] = [{"attach_id": "a1", "uri": attach_uri, "mime_type": "image/jpeg"}]
    return p


def test_full_receipt_when_attachment_stored(db):
    ack = inc_svc.upsert_incident(db, _payload())
    assert ack["complete"] is True


def test_incomplete_receipt_when_uri_missing(db):
    """Partial upload: report stored, complete=False so media stays PENDING."""
    ack = inc_svc.upsert_incident(db, _payload(attach_uri=""))
    assert ack["complete"] is False


def test_retry_with_same_attach_id_never_duplicates(db):
    """Resume after partial upload: same IDs, no duplicate rows."""
    ack1 = inc_svc.upsert_incident(db, _payload(attach_uri=""))
    ack2 = inc_svc.upsert_incident(db, _payload())  # retry with the URI present
    assert ack1["complete"] is False
    assert ack2["complete"] is True
    report = db.get(IncidentReport, "IR-X")
    assert len(report.attachments) == 1


def test_duplicate_report_id_updates_not_creates(db):
    inc_svc.upsert_incident(db, _payload())
    inc_svc.upsert_incident(db, {**_payload(), "description": "updated"})
    report = db.get(IncidentReport, "IR-X")
    assert report.description == "updated"


# ---------------------------------------------------------------------------
# UC04 — window validation, snapshot, coverage
# ---------------------------------------------------------------------------

def test_validate_window_rejects_inverted_range():
    a = datetime(2026, 9, 10, tzinfo=timezone.utc)
    b = datetime(2026, 9, 1, tzinfo=timezone.utc)
    with pytest.raises(rep_svc.ReportValidationError):
        rep_svc.validate_window(a, b)


def test_validate_window_rejects_over_92_days():
    a = datetime(2026, 1, 1, tzinfo=timezone.utc)
    b = a + timedelta(days=120)
    with pytest.raises(rep_svc.ReportValidationError):
        rep_svc.validate_window(a, b)


def test_snapshot_excludes_pending_records(db):
    """Pending field writes are excluded from the snapshot (case-study rule)."""
    db.add(IncidentReport(report_id="I1", park_id="park-1", type="SNARE", description="",
                          lat=6.4, lng=81.12, location_source="GPS",
                          observed_at=datetime(2026, 9, 5, tzinfo=timezone.utc),
                          sync_state="SYNCED"))
    db.add(IncidentReport(report_id="I2", park_id="park-1", type="SNARE", description="",
                          lat=6.4, lng=81.12, location_source="GPS",
                          observed_at=datetime(2026, 9, 6, tzinfo=timezone.utc),
                          sync_state="PENDING"))
    db.commit()
    snap = rep_svc.generate_snapshot(db, "park-1",
                                     datetime(2026, 9, 1, tzinfo=timezone.utc),
                                     datetime(2026, 9, 30, tzinfo=timezone.utc))
    assert snap["incident_count"] == 1


def test_empty_window_zero_state(db):
    snap = rep_svc.generate_snapshot(db, "park-1",
                                     datetime(2026, 9, 1, tzinfo=timezone.utc),
                                     datetime(2026, 9, 30, tzinfo=timezone.utc))
    assert snap["incident_count"] == 0
    assert snap["patrol_count"] == 0
    assert snap["coverage_percent"] == 0.0
    assert snap["cutoff"], "cutoff recorded even for zero state"


def test_snapshot_id_stable_for_same_window(db):
    a = datetime(2026, 9, 1, tzinfo=timezone.utc)
    b = datetime(2026, 9, 30, tzinfo=timezone.utc)
    s1 = rep_svc.generate_snapshot(db, "park-1", a, b)
    s2 = rep_svc.generate_snapshot(db, "park-1", a, b)
    assert s1["report_id"] == s2["report_id"], "export reuses the same snapshot id"


def test_coverage_capped_at_100(db):
    p = Patrol(patrol_id="PT-C", route_id="RT-07", officer_id="off-1", status="COMPLETED",
               started_at=datetime(2026, 9, 5, tzinfo=timezone.utc), sync_state="SYNCED")
    # ~111 km of track along one longitude line: far beyond the 12.4 km route.
    for i in range(3):
        p.waypoints.append(Waypoint(point_id=f"w{i}", patrol_id="PT-C",
                                    lat=6.0 + i, lng=81.12, source="GPS",
                                    recorded_at=datetime(2026, 9, 5, 6, i, tzinfo=timezone.utc)))
    db.add(p)
    db.commit()
    snap = rep_svc.generate_snapshot(db, "park-1",
                                     datetime(2026, 9, 1, tzinfo=timezone.utc),
                                     datetime(2026, 9, 30, tzinfo=timezone.utc))
    assert snap["coverage_percent"] == 100.0
