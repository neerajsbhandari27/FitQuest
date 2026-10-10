
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


ActivityType = Literal["walking", "running", "cycling", "hiking"]


class WorkoutCreate(BaseModel):
    activity_type: ActivityType
    duration_minutes: int = Field(gt=0, le=1440)
    distance_km: float | None = Field(default=None, ge=0, le=1000)
    perceived_effort: int = Field(default=5, ge=1, le=10)
    notes: str | None = Field(default=None, max_length=1000)
    photo_url: str | None = Field(default=None)


class WorkoutResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    activity_type: str
    duration_minutes: int
    distance_km: float | None
    perceived_effort: int
    notes: str | None
    photo_url: str | None = None
    completed_at: datetime

