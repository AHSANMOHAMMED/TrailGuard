"""IncidentService — create + complete-receipt upsert."""
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.entities import IncidentReport, PhotoAttachment, SyncState

def upsert_incident(db: Session, payload: dict) -> dict:
    report = db.get(IncidentReport, payload["report_id"])
    if report is None:
        report = IncidentReport(
            report_id=payload["report_id"],
            park_id=payload["park_id"],
            type=payload["type"],
            description=payload.get("description", ""),
            lat=payload["geo"]["lat"],
            lng=payload["geo"]["lng"],
            location_source=payload.get("location_source", "GPS"),
            observed_at=datetime.fromisoformat(payload["observed_at"]),
            sync_state=SyncState.SYNCED.value,
        )
        db.add(report)
    else:
        report.description = payload.get("description", report.description)
        report.sync_state = SyncState.SYNCED.value

    attachments_ok = True
    for att in payload.get("attachments", []):
        existing = db.get(PhotoAttachment, att["attach_id"])
        if existing is None:
            if not att.get("uri"):
                attachments_ok = False
                continue
            db.add(
                PhotoAttachment(
                    attach_id=att["attach_id"],
                    report_id=payload["report_id"],
                    uri=att["uri"],
                    mime_type=att.get("mime_type", "image/jpeg"),
                )
            )
    db.commit()
    # complete-receipt only when media fully stored
    return {"id": report.report_id, "version": 1, "complete": attachments_ok}
