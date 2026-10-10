
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


ActivityType = Literal["walking", "running", "cycling", "hiking"]
Difficulty = Literal["easy", "medium", "hard"]


class QuestCreate(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    description: str = Field(min_length=5, max_length=1000)
    activity_type: ActivityType
    target_minutes: int = Field(gt=0, le=1440)
    target_distance_km: float | None = Field(
        default=None, gt=0, le=1000
    )
    xp_reward: int = Field(default=50, ge=1, le=1000)
    difficulty: Difficulty = "easy"


class QuestResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: str
    activity_type: str
    target_minutes: int
    target_distance_km: float | None
    xp_reward: int
    difficulty: str
    is_active: bool
