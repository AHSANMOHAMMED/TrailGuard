"""ConflictService — ingest, assess, assign, acknowledge."""
from datetime import datetime, timezone
from uuid import uuid4
from sqlalchemy.orm import Session
from app.models.entities import Alert, ResponseAssignment

def ingest_and_assess(db: Session, reading: dict, zone_id: str, in_zone: bool, fresh: bool) -> dict | None:
    if not (in_zone and fresh):
        return None  # historical only
    alert_id = reading.get("alert_id") or str(uuid4())
    alert = db.get(Alert, alert_id)
    now = datetime.now(timezone.utc)
    if alert is None:
        alert = Alert(
            alert_id=alert_id,
            zone_id=zone_id,
            status="OPEN",
            confidence=reading.get("confidence", "High"),
            observed_at=datetime.fromisoformat(reading["observed_at"]),
            received_at=now,
        )
        db.add(alert)
    else:
        alert.received_at = now
        if alert.status == "CLOSED":
            alert.status = "OPEN"
    db.commit()
    return {"alert_id": alert.alert_id, "status": alert.status}

def assign_officer(db: Session, alert_id: str, officer_id: str) -> dict:
    ra_id = str(uuid4())
    ra = ResponseAssignment(
        ra_id=ra_id,
        alert_id=alert_id,
        officer_id=officer_id,
        delivery_state="SENT",
        acknowledged_at=None,
    )
    db.add(ra)
    alert = db.get(Alert, alert_id)
    if alert:
        alert.status = "ASSIGNED"
    db.commit()
    return {"ra_id": ra_id, "delivery_state": "SENT"}

def acknowledge(db: Session, ra_id: str, officer_id: str) -> dict:
    ra = db.get(ResponseAssignment, ra_id)
    if not ra or ra.officer_id != officer_id:
        raise ValueError("Invalid assignment")
    ra.acknowledged_at = datetime.now(timezone.utc)
    db.commit()
    return {"ra_id": ra_id, "acknowledged_at": ra.acknowledged_at.isoformat()}
