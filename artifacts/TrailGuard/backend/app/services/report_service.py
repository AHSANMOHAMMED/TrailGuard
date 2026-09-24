"""ReportService — one consistent snapshot, pending excluded."""
from datetime import datetime
from uuid import uuid4
from sqlalchemy.orm import Session
from sqlalchemy import select, func
from app.models.entities import IncidentReport, SyncState

def generate_snapshot(db: Session, park_id: str, date_from: datetime, date_to: datetime) -> dict:
    q = select(func.count()).select_from(IncidentReport).where(
        IncidentReport.park_id == park_id,
        IncidentReport.observed_at >= date_from,
        IncidentReport.observed_at <= date_to,
        IncidentReport.sync_state == SyncState.SYNCED.value,
    )
    count = db.scalar(q) or 0
    report_id = str(uuid4())
    cutoff = date_to.isoformat()
    return {
        "report_id": report_id,
        "park_id": park_id,
        "from": date_from.isoformat(),
        "to": date_to.isoformat(),
        "cutoff": cutoff,
        "generated_at": datetime.utcnow().isoformat(),
        "incident_count": count,
        "coverage_percent": 0.0,  # plug coverage grid later
        "conflict_trend_percent": 0.0,
        "note": "Pending field records excluded",
    }
