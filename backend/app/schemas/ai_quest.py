from typing import Literal

from pydantic import BaseModel, Field


ActivityType = Literal["walking", "running", "cycling", "hiking"]
Difficulty = Literal["easy", "medium", "hard"]


class QuestGenerationRequest(BaseModel):
    fitness_goal: str = Field(
        default="Build a consistent outdoor fitness habit",
        min_length=3,
        max_length=200,
    )
    experience_level: Literal[
        "beginner", "intermediate", "advanced"
    ] = "beginner"
    count: int = Field(default=3, ge=1, le=5)


class AIQuestDraft(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    description: str = Field(min_length=5, max_length=1000)
    activity_type: ActivityType
    target_minutes: int = Field(ge=5, le=120)
    target_distance_km: float | None = Field(
        default=None, gt=0, le=30
    )
    difficulty: Difficulty = "easy"


class AIQuestBatch(BaseModel):
    quests: list[AIQuestDraft] = Field(min_length=1, max_length=5)