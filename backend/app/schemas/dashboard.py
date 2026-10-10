
from datetime import date

from pydantic import BaseModel


class DailyActivity(BaseModel):
    date: date
    workout_count: int
    total_minutes: int


class DashboardResponse(BaseModel):
    display_name: str
    primary_goal: str

    total_xp: int
    level: int
    xp_to_next_level: int

    total_workouts: int
    total_minutes: int
    completed_quests: int
    active_quests: int
    current_streak: int
    longest_streak: int
    current_week_minutes: int
    weekly_activity: list[DailyActivity]
