"""SQLAlchemy entities — TrailGuard domain."""
import enum
from datetime import datetime
from sqlalchemy import String, Float, Boolean, DateTime, ForeignKey, Enum, Text, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.session import Base

class SyncState(str, enum.Enum):
    PENDING = "PENDING"
    SYNCED = "SYNCED"
    FAILED = "FAILED"

class PatrolStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"

class Park(Base):
    __tablename__ = "parks"
    park_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    region: Mapped[str] = mapped_column(String(120))

class Officer(Base):
    __tablename__ = "officers"
    officer_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    role: Mapped[str] = mapped_column(String(40))
    available: Mapped[bool] = mapped_column(Boolean, default=True)
    park_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("parks.park_id"))

class PatrolRoute(Base):
    __tablename__ = "patrol_routes"
    route_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    park_id: Mapped[str] = mapped_column(String(36), ForeignKey("parks.park_id"))

class Patrol(Base):
    __tablename__ = "patrols"
    patrol_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    route_id: Mapped[str] = mapped_column(String(36), ForeignKey("patrol_routes.route_id"))
    officer_id: Mapped[str] = mapped_column(String(36), ForeignKey("officers.officer_id"))
    status: Mapped[str] = mapped_column(String(20), default=PatrolStatus.ACTIVE.value)
    started_at: Mapped[datetime] = mapped_column(DateTime)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    sync_state: Mapped[str] = mapped_column(String(20), default=SyncState.SYNCED.value)
    waypoints = relationship("Waypoint", back_populates="patrol", cascade="all, delete-orphan")

class Waypoint(Base):
    __tablename__ = "waypoints"
    point_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    patrol_id: Mapped[str] = mapped_column(String(36), ForeignKey("patrols.patrol_id"))
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    source: Mapped[str] = mapped_column(String(20))
    recorded_at: Mapped[datetime] = mapped_column(DateTime)
    patrol = relationship("Patrol", back_populates="waypoints")

class IncidentReport(Base):
    __tablename__ = "incidents"
    report_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    park_id: Mapped[str] = mapped_column(String(36), ForeignKey("parks.park_id"))
    type: Mapped[str] = mapped_column(String(60))
    description: Mapped[str] = mapped_column(Text, default="")
    lat: Mapped[float] = mapped_column(Float)
    lng: Mapped[float] = mapped_column(Float)
    location_source: Mapped[str] = mapped_column(String(20))
    observed_at: Mapped[datetime] = mapped_column(DateTime)
    sync_state: Mapped[str] = mapped_column(String(20), default=SyncState.SYNCED.value)
    attachments = relationship("PhotoAttachment", back_populates="incident", cascade="all, delete-orphan")

class PhotoAttachment(Base):
    __tablename__ = "photo_attachments"
    attach_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    report_id: Mapped[str] = mapped_column(String(36), ForeignKey("incidents.report_id"))
    uri: Mapped[str] = mapped_column(String(500))
    mime_type: Mapped[str] = mapped_column(String(80), default="image/jpeg")
    incident = relationship("IncidentReport", back_populates="attachments")

class RiskZone(Base):
    __tablename__ = "risk_zones"
    zone_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    park_id: Mapped[str] = mapped_column(String(36), ForeignKey("parks.park_id"))
    name: Mapped[str] = mapped_column(String(120))

class Alert(Base):
    __tablename__ = "alerts"
    alert_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    zone_id: Mapped[str] = mapped_column(String(36), ForeignKey("risk_zones.zone_id"))
    status: Mapped[str] = mapped_column(String(20), default="OPEN")
    confidence: Mapped[str] = mapped_column(String(40), default="High")
    observed_at: Mapped[datetime] = mapped_column(DateTime)
    received_at: Mapped[datetime] = mapped_column(DateTime)

class ResponseAssignment(Base):
    __tablename__ = "response_assignments"
    ra_id: Mapped[str] = mapped_column(String(36), primary_key=True)
    alert_id: Mapped[str] = mapped_column(String(36), ForeignKey("alerts.alert_id"))
    officer_id: Mapped[str] = mapped_column(String(36), ForeignKey("officers.officer_id"))
    delivery_state: Mapped[str] = mapped_column(String(20), default="PENDING")
    acknowledged_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
