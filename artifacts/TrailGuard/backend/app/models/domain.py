"""TrailGuard domain model (A02 R-03/R-04/R-06).

Enums and value objects the A01 diagram referenced but never declared are
first-class here. Entities own their state transitions; services orchestrate.
"""
from __future__ import annotations

import enum
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone


class SyncState(enum.Enum):
    PENDING = "PENDING"
    SYNCED = "SYNCED"
    FAILED = "FAILED"


class DeliveryState(enum.Enum):
    PENDING = "PENDING"
    SENT = "SENT"
    FAILED = "FAILED"


class PatrolStatus(enum.Enum):
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class AlertStatus(enum.Enum):
    OPEN = "OPEN"
    ASSIGNED = "ASSIGNED"
    ESCALATED = "ESCALATED"
    CLOSED = "CLOSED"


class LocationSource(enum.Enum):
    GPS = "GPS"
    MANUAL = "MANUAL"


class Confidence(enum.Enum):
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


class IncidentCategory(enum.Enum):
    SNARE = "SNARE"
    CROP_RAID = "CROP_RAID"
    POACHING_SIGN = "POACHING_SIGN"
    INJURED_ANIMAL = "INJURED_ANIMAL"
    OTHER = "OTHER"


class OfficerRole(enum.Enum):
    RANGER = "RANGER"
    LIAISON = "LIAISON"
    MANAGER = "MANAGER"


MAX_BACKOFF = timedelta(minutes=30)


def backoff_after(attempt: int, now: datetime) -> datetime:
    """Exponential backoff capped at 30 minutes (R-05)."""
    delta = min(MAX_BACKOFF, timedelta(minutes=2 ** max(0, attempt - 1)))
    return now + delta


@dataclass
class GeoPoint:
    lat: float
    lng: float


@dataclass
class CompleteReceipt:
    """Server acknowledgement for one record (R-03: the undeclared `Ack`).

    complete=False means the report text acked but attachments did not —
    the partial-upload branch (S3/R-05).
    """

    record_id: str
    version: int
    complete: bool
    received_at: datetime


class FieldRecord:
    """Mixin for records that live on the sync state machine (R-05)."""

    sync_state: SyncState = SyncState.PENDING
    retry_after: datetime | None = None
    _attempt: int = 0

    def mark_synced(self) -> None:
        self.sync_state = SyncState.SYNCED
        self.retry_after = None
        self._attempt = 0

    def mark_pending(self) -> None:
        self.sync_state = SyncState.PENDING
        self.retry_after = None

    def mark_failed(self, now: datetime) -> None:
        self._attempt += 1
        self.sync_state = SyncState.FAILED
        self.retry_after = backoff_after(self._attempt, now)

    def retry_due(self, now: datetime) -> bool:
        if self.sync_state is SyncState.PENDING:
            return True
        if self.sync_state is SyncState.FAILED:
            return self.retry_after is None or self.retry_after <= now
        return False
