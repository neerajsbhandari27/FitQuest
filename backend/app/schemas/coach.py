
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class CoachReviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    summary: str
    strengths: list[str]
    suggestions: list[str]
    next_week_goal: str
    workouts_analyzed: int
    created_at: datetime


class CoachReviewRequest(BaseModel):
    focus: str = Field(
        default="Improve consistency and outdoor fitness",
        min_length=3,
        max_length=200,
    )

class CoachReviewDraft(BaseModel):
    summary: str = Field(min_length=10, max_length=1500)
    strengths: list[str] = Field(min_length=1, max_length=5)
    suggestions: list[str] = Field(min_length=1, max_length=5)
    next_week_goal: str = Field(min_length=5, max_length=300)


class CoachChatMessageSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    role: str
    content: str
    created_at: datetime


class CoachChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)


class CoachChatResponse(BaseModel):
    reply: str
    messages: list[CoachChatMessageSchema]