
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CompletionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    quest_id: int
    workout_id: int
    xp_awarded: int
    completed_at: datetime
