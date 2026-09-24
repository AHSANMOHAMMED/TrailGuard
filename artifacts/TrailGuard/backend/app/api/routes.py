from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Any
from app.db.session import get_db
from app.services import patrol_service, incident_service, conflict_service, report_service

router = APIRouter()

class UpsertBody(BaseModel):
    kind: str
    payload: dict[str, Any]

@router.get("/health")
def health():
    return {"app": "TrailGuard", "status": "ok"}

@router.post("/sync/upsert")
def sync_upsert(body: UpsertBody, db: Session = Depends(get_db)):
    """Single entry for offline sync — idempotent by client UUID."""
    if body.kind == "patrol":
        return patrol_service.upsert_patrol(db, body.payload)
    if body.kind == "incident":
        ack = incident_service.upsert_incident(db, body.payload)
        if not ack.get("complete"):
            raise HTTPException(status_code=409, detail="complete-receipt required for attachments")
        return ack
    raise HTTPException(status_code=400, detail=f"Unknown kind: {body.kind}")

class ReadingIn(BaseModel):
    observed_at: str
    confidence: str = "High"
    alert_id: str | None = None
    zone_id: str
    in_zone: bool
    fresh: bool

@router.post("/conflict/ingest")
def conflict_ingest(body: ReadingIn, db: Session = Depends(get_db)):
    result = conflict_service.ingest_and_assess(
        db, body.model_dump(), body.zone_id, body.in_zone, body.fresh
    )
    if result is None:
        return {"alert": None, "message": "stored historical only"}
    return result

class AssignIn(BaseModel):
    alert_id: str
    officer_id: str

@router.post("/conflict/assign")
def conflict_assign(body: AssignIn, db: Session = Depends(get_db)):
    return conflict_service.assign_officer(db, body.alert_id, body.officer_id)

class AckIn(BaseModel):
    ra_id: str
    officer_id: str

@router.post("/conflict/acknowledge")
def conflict_ack(body: AckIn, db: Session = Depends(get_db)):
    try:
        return conflict_service.acknowledge(db, body.ra_id, body.officer_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

class ReportIn(BaseModel):
    park_id: str
    date_from: str
    date_to: str

@router.post("/reports/generate")
def reports_generate(body: ReportIn, db: Session = Depends(get_db)):
    return report_service.generate_snapshot(
        db,
        body.park_id,
        datetime.fromisoformat(body.date_from),
        datetime.fromisoformat(body.date_to),
    )
