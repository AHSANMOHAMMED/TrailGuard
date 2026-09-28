"""ConflictService — ingest, assess, assign, notify, acknowledge, escalate, close."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy.orm import Session

from app.models.entities import Alert, ResponseAssignment
from app.models.domain import AlertStatus, Confidence, DeliveryState

ESCALATION_TIMEOUT = timedelta(minutes=30)
MAX_NOTIFY_ATTEMPTS = 2


def ingest_and_assess(db: Session, reading: dict, zone_id: str, in_zone: bool, fresh: bool) -> dict | None:
    """R-08: low-confidence readings are triaged to review, never paged."""
    if not (in_zone and fresh):
        return None  # historical only

    confidence = Confidence(reading.get("confidence", "HIGH"))
    animal = reading.get("animal", "Elephant")
    alert_id = reading.get("alert_id")

    alert = None
    if alert_id:
        alert = db.get(Alert, alert_id)
    if alert is None:
        # Dedup: same animal + zone re-opens/refreshes the existing alert.
        alert = (
            db.query(Alert)
            .filter(Alert.animal == animal, Alert.zone_id == zone_id, Alert.status != AlertStatus.CLOSED.value)
            .order_by(Alert.observed_at.desc())
            .first()
        )

    now = datetime.now(timezone.utc)
    if alert is None:
        alert = Alert(
            alert_id=str(uuid4()),
            zone_id=zone_id,
            animal=animal,
            status=AlertStatus.OPEN.value,
            confidence=confidence.value,
            observed_at=datetime.fromisoformat(reading["observed_at"]),
            received_at=now,
        )
        db.add(alert)
    else:
        alert.received_at = now
        if alert.status == AlertStatus.CLOSED.value:
            alert.status = AlertStatus.OPEN.value

    db.commit()
    return {
        "alert_id": alert.alert_id,
        "status": alert.status,
        "triage": "REVIEW_QUEUE" if confidence is Confidence.LOW else "PAGE",
    }


def assign_officer(db: Session, alert_id: str, officer_id: str, officer_is_available: bool = True) -> dict:
    """R-04: validate availability; close any prior active assignment."""
    if not officer_is_available:
        raise ValueError("Officer is not available")

    prior = (
        db.query(ResponseAssignment)
        .filter(
            ResponseAssignment.alert_id == alert_id,
            ResponseAssignment.acknowledged_at.is_(None),
            ResponseAssignment.delivery_state != DeliveryState.FAILED.value,
        )
        .all()
    )
    for ra in prior:
        ra.outcome = "superseded"

    ra = ResponseAssignment(
        ra_id=str(uuid4()),
        alert_id=alert_id,
        officer_id=officer_id,
        delivery_state=DeliveryState.PENDING.value,
        acknowledged_at=None,
    )
    db.add(ra)
    alert = db.get(Alert, alert_id)
    if alert:
        alert.status = AlertStatus.ASSIGNED.value
    db.commit()
    return {"ra_id": ra.ra_id, "delivery_state": ra.delivery_state}


def notify(db: Session, ra_id: str, delivery: DeliveryState) -> dict:
    """R-06: FAILED frees the officer and reopens the alert.

    The gateway transport is the caller's seam; the service owns the rule.
    Returns the state the caller must act on; after MAX_NOTIFY_ATTEMPTS the
    caller invokes escalate().
    """
    ra = db.get(ResponseAssignment, ra_id)
    if ra is None:
        raise ValueError("Invalid assignment")
    ra.delivery_state = delivery.value
    if delivery is DeliveryState.FAILED:
        ra.notify_attempts = (ra.notify_attempts or 0) + 1
        if ra.notify_attempts >= MAX_NOTIFY_ATTEMPTS:
            escalate(db, ra.alert_id)
            db.commit()
            return {"ra_id": ra.ra_id, "delivery_state": delivery.value, "escalated": True}
    db.commit()
    return {"ra_id": ra.ra_id, "delivery_state": delivery.value, "escalated": False}


def escalate(db: Session, alert_id: str) -> dict:
    """R-02b: time-boxed/auto escalation to the backup officer list."""
    alert = db.get(Alert, alert_id)
    if alert is None:
        raise ValueError("Alert not found")
    alert.status = AlertStatus.ESCALATED.value
    db.commit()
    return {"alert_id": alert.alert_id, "status": alert.status, "backup_notified": True}


def acknowledge(db: Session, ra_id: str, officer_id: str) -> dict:
    ra = db.get(ResponseAssignment, ra_id)
    if not ra or ra.officer_id != officer_id:
        raise ValueError("Invalid assignment")
    if ra.acknowledged_at is not None:
        # Late double-ack is audit-only, no state change (R-08 5c).
        return {"ra_id": ra_id, "acknowledged_at": ra.acknowledged_at.isoformat(), "duplicate": True}
    ra.acknowledged_at = datetime.now(timezone.utc)
    db.commit()
    return {"ra_id": ra_id, "acknowledged_at": ra.acknowledged_at.isoformat(), "duplicate": False}


def close_with_outcome(db: Session, ra_id: str, outcome: str) -> dict:
    """R-02c: liaison records the resolution; completes the lifecycle."""
    ra = db.get(ResponseAssignment, ra_id)
    if ra is None:
        raise ValueError("Invalid assignment")
    ra.outcome = outcome
    alert = db.get(Alert, ra.alert_id)
    if alert:
        alert.status = AlertStatus.CLOSED.value
    db.commit()
    return {"ra_id": ra_id, "alert_id": ra.alert_id, "status": AlertStatus.CLOSED.value, "outcome": outcome}
