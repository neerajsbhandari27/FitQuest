from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Quest, QuestCompletion, UserProfile, Workout
from app.routers.achievements import ACHIEVEMENT_DEFINITIONS
from app.routers.dashboard import get_dashboard
from app.schemas.share import ShareCardResponse

router = APIRouter(
    prefix="/api/v1/share",
    tags=["Share"],
)


@router.get("/progress", response_model=ShareCardResponse)
def share_progress(db: Session = Depends(get_db)):
    dash = get_dashboard(db)
    hours = dash.total_minutes // 60
    mins = dash.total_minutes % 60
    time_str = f"{hours}h {mins}m" if hours > 0 else f"{mins}m"

    msg = (
        f"🌱 Just checked in on FitQuest! I'm a Level {dash.level} Explorer with "
        f"{dash.total_xp} XP and a {dash.current_streak}-day active streak. "
        f"Total outdoor time: {time_str} across {dash.total_workouts} workouts! "
        f"Every step counts. 🌿"
    )

    return ShareCardResponse(
        card_type="progress",
        title=f"Level {dash.level} Explorer",
        subtitle=f"{dash.total_xp} XP · {dash.current_streak}-Day Streak",
        message=msg,
        stats={
            "level": dash.level,
            "total_xp": dash.total_xp,
            "streak": dash.current_streak,
            "total_workouts": dash.total_workouts,
            "total_minutes": dash.total_minutes,
            "completed_quests": dash.completed_quests,
        },
        hashtags=["FitQuest", "FitnessJourney", "OutdoorFitness", "StayActive"],
    )


@router.get("/achievement/{achievement_id}", response_model=ShareCardResponse)
def share_achievement(achievement_id: str, db: Session = Depends(get_db)):
    defn = next((a for a in ACHIEVEMENT_DEFINITIONS if a["id"] == achievement_id), None)
    if defn is None:
        raise HTTPException(status_code=404, detail="Achievement not found")

    profile = db.query(UserProfile).order_by(UserProfile.id.asc()).first()
    total_xp = profile.total_xp if profile else 0
    level = (total_xp // 100) + 1

    msg = (
        f"🏆 Achievement Unlocked on FitQuest: '{defn['title']}' {defn['icon']}!\n"
        f"\"{defn['description']}\"\n"
        f"Currently Level {level} with {total_xp} XP. Making progress every day! ✨"
    )

    return ShareCardResponse(
        card_type="achievement",
        title=f"{defn['icon']} {defn['title']}",
        subtitle=defn["description"],
        message=msg,
        stats={
            "achievement_id": defn["id"],
            "icon": defn["icon"],
            "target": defn["target"],
            "category": defn["category"],
            "level": level,
            "total_xp": total_xp,
        },
        hashtags=["FitQuest", "AchievementUnlocked", "FitnessMilestone", "LevelUp"],
    )


@router.get("/workout/{workout_id}", response_model=ShareCardResponse)
def share_workout(workout_id: int, db: Session = Depends(get_db)):
    workout = db.get(Workout, workout_id)
    if workout is None:
        raise HTTPException(status_code=404, detail="Workout not found")

    dist_str = f" ({workout.distance_km} km)" if workout.distance_km else ""
    activity_capitalized = workout.activity_type.capitalize()

    msg = (
        f"💪 Workout Logged on FitQuest!\n"
        f"{activity_capitalized}: {workout.duration_minutes} mins{dist_str}.\n"
        f"Effort: {workout.perceived_effort}/10. Moving forward one day at a time! 🏃‍♂️💨"
    )

    return ShareCardResponse(
        card_type="workout",
        title=f"{activity_capitalized} Session",
        subtitle=f"{workout.duration_minutes} min{dist_str}",
        message=msg,
        photo_url=workout.photo_url,
        stats={
            "workout_id": workout.id,
            "activity_type": workout.activity_type,
            "duration_minutes": workout.duration_minutes,
            "distance_km": workout.distance_km,
            "perceived_effort": workout.perceived_effort,
        },
        hashtags=["FitQuest", "WorkoutLogged", "KeepMoving", "FitnessGoals"],
    )


@router.get("/quest/{quest_id}", response_model=ShareCardResponse)
def share_quest(quest_id: int, db: Session = Depends(get_db)):
    quest = db.get(Quest, quest_id)
    if quest is None:
        raise HTTPException(status_code=404, detail="Quest not found")

    msg = (
        f"🎯 Quest Cleared on FitQuest: '{quest.title}' (+{quest.xp_reward} XP)!\n"
        f"{quest.description}\n"
        f"Difficulty: {quest.difficulty.capitalize()} · {quest.target_minutes} min {quest.activity_type}. 🚀"
    )

    return ShareCardResponse(
        card_type="quest",
        title=f"Quest Cleared: {quest.title}",
        subtitle=f"+{quest.xp_reward} XP · {quest.difficulty.capitalize()}",
        message=msg,
        stats={
            "quest_id": quest.id,
            "xp_reward": quest.xp_reward,
            "difficulty": quest.difficulty,
            "activity_type": quest.activity_type,
            "target_minutes": quest.target_minutes,
        },
        hashtags=["FitQuest", "QuestComplete", "AdventureFitness", "XPGrind"],
    )
