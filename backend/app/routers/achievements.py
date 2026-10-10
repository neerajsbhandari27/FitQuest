
from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import QuestCompletion, UserProfile, Workout
from app.schemas.achievement import AchievementResponse

router = APIRouter(
    prefix="/api/v1/achievements",
    tags=["Achievements"],
)


ACHIEVEMENT_DEFINITIONS = [
    {
        "id": "first_workout",
        "title": "Touch Grass",
        "description": "Log your first outdoor workout.",
        "icon": "🌱",
        "category": "activity",
        "metric": "workouts",
        "target": 1,
    },
    {
        "id": "workouts_5",
        "title": "Getting Consistent",
        "description": "Log 5 outdoor workouts.",
        "icon": "👟",
        "category": "activity",
        "metric": "workouts",
        "target": 5,
    },
    {
        "id": "workouts_10",
        "title": "Outdoor Regular",
        "description": "Log 10 outdoor workouts.",
        "icon": "🏃",
        "category": "activity",
        "metric": "workouts",
        "target": 10,
    },
    {
        "id": "minutes_60",
        "title": "Hour in Nature",
        "description": "Accumulate 60 minutes of outdoor activity.",
        "icon": "🌳",
        "category": "activity",
        "metric": "minutes",
        "target": 60,
    },
    {
        "id": "minutes_300",
        "title": "Nature Enthusiast",
        "description": "Accumulate 300 minutes of outdoor activity.",
        "icon": "🌲",
        "category": "activity",
        "metric": "minutes",
        "target": 300,
    },
    {
        "id": "first_quest",
        "title": "Quest Accepted",
        "description": "Complete your first fitness quest.",
        "icon": "🎯",
        "category": "quests",
        "metric": "quests",
        "target": 1,
    },
    {
        "id": "quests_5",
        "title": "Quest Adventurer",
        "description": "Complete 5 fitness quests.",
        "icon": "🗺️",
        "category": "quests",
        "metric": "quests",
        "target": 5,
    },
    {
        "id": "xp_100",
        "title": "Level Up",
        "description": "Earn 100 XP.",
        "icon": "⭐",
        "category": "xp",
        "metric": "xp",
        "target": 100,
    },
    {
        "id": "xp_500",
        "title": "XP Explorer",
        "description": "Earn 500 XP.",
        "icon": "🏆",
        "category": "xp",
        "metric": "xp",
        "target": 500,
    },
]


@router.get("", response_model=list[AchievementResponse])
def get_achievements(db: Session = Depends(get_db)):
    workout_count = db.query(Workout).count()

    total_minutes = (
        db.query(func.coalesce(func.sum(Workout.duration_minutes), 0))
        .scalar()
    )

    quest_count = db.query(QuestCompletion).count()

    profile = (
        db.query(UserProfile)
        .order_by(UserProfile.id.asc())
        .first()
    )
    total_xp = profile.total_xp if profile else 0

    metrics = {
        "workouts": workout_count,
        "minutes": int(total_minutes or 0),
        "quests": quest_count,
        "xp": total_xp,
    }

    achievements = []

    for definition in ACHIEVEMENT_DEFINITIONS:
        progress = metrics[definition["metric"]]
        target = definition["target"]

        achievements.append(
            AchievementResponse(
                id=definition["id"],
                title=definition["title"],
                description=definition["description"],
                icon=definition["icon"],
                category=definition["category"],
                unlocked=progress >= target,
                progress=min(progress, target),
                target=target,
            )
        )

    return achievements
