
from pydantic import BaseModel


class AchievementResponse(BaseModel):
    id: str
    title: str
    description: str
    icon: str
    category: str
    unlocked: bool
    progress: int
    target: int
