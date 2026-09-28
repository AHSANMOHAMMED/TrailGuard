"""IncidentService — create + complete-receipt upsert (S3/R-05)."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from app.models.entities import IncidentReport, PhotoAttachment, SyncState


def upsert_incident(db: Session, payload: dict) -> dict:
    """Idempotent by report_id. `complete` is False until every attachment
    named in the payload is durably stored — the complete-receipt contract."""
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
    stored: list[str] = []
    for att in payload.get("attachments", []):
        existing = db.get(PhotoAttachment, att["attach_id"])
        if existing is not None:
            stored.append(att["attach_id"])  # already durable from an earlier attempt
            continue
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
        stored.append(att["attach_id"])
    db.commit()
    return {
        "id": report.report_id,
        "version": 1,
        "complete": attachments_ok,
        "stored": stored,
        "received_at": datetime.utcnow().isoformat(),
    }
