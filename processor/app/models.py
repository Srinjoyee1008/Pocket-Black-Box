from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Annotated
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator


ShortText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=4000)]


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class Urgency(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"


class ReportStatus(str, Enum):
    needs_review = "needs_review"
    open = "open"
    assigned = "assigned"
    resolved = "resolved"


class Location(BaseModel):
    model_config = ConfigDict(extra="forbid")

    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    area: str | None = Field(default=None, max_length=120)

    @model_validator(mode="after")
    def coordinate_pair(self) -> "Location":
        if (self.latitude is None) != (self.longitude is None):
            raise ValueError("latitude and longitude must be provided together")
        if self.latitude is None and not (self.area and self.area.strip()):
            raise ValueError("provide coordinates or an area label")
        return self


class CreateReport(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: ShortText
    id: UUID = Field(default_factory=uuid4)
    location: Location | None = None
    needs: list[str] = Field(default_factory=list, max_length=20)
    urgency: Urgency = Urgency.medium
    status: ReportStatus = ReportStatus.needs_review


class UpdateReport(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: ShortText | None = None
    location: Location | None = None
    needs: list[str] | None = Field(default=None, max_length=20)
    urgency: Urgency | None = None
    status: ReportStatus | None = None

    @model_validator(mode="after")
    def reject_null_updates(self) -> "UpdateReport":
        if any(getattr(self, field) is None for field in self.model_fields_set):
            raise ValueError("updated fields may not be null")
        return self


class TriageRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: ShortText


class Report(BaseModel):
    id: UUID
    text: str
    location: Location | None = None
    needs: list[str]
    urgency: Urgency
    status: ReportStatus
    created_at: datetime
    updated_at: datetime
    revision: int
    sync_state: str = "local"


class ReportEvent(BaseModel):
    id: UUID
    report_id: UUID
    kind: str
    occurred_at: datetime
    revision: int
    payload: dict[str, object]


class Suggestion(BaseModel):
    urgency: Urgency
    needs: list[str]


class TriageResponse(BaseModel):
    suggestions: Suggestion
    confidence: float = Field(ge=0, le=1)
    modelStatus: str


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: object | None = None


class ErrorResponse(BaseModel):
    error: ErrorDetail
