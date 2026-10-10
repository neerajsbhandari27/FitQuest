from typing import Any, Literal
from pydantic import BaseModel, Field


class ShareCardResponse(BaseModel):
    card_type: Literal["achievement", "progress", "workout", "quest"]
    title: str
    subtitle: str
    message: str
    stats: dict[str, Any] = Field(default_factory=dict)
    hashtags: list[str] = Field(default_factory=lambda: ["FitQuest", "FitnessJourney", "StayActive"])
    photo_url: str | None = None

