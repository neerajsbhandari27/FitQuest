
from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    Quest,
    QuestCompletion,
    UserProfile,
    Workout,
)
from app.schemas.dashboard import (
    DashboardResponse,
    DailyActivity,
)

def calculate_streaks(
    workout_dates: set[date],
    today: date,
) -> tuple[int, int]:
    # Ignore future workout dates.
    valid_dates = {day for day in workout_dates if day <= today}

    # Calculate the longest consecutive streak.
    longest_streak = 0
    running_streak = 0
    previous_day = None

    for workout_day in sorted(valid_dates):
        if (
            previous_day is not None
            and workout_day == previous_day + timedelta(days=1)
        ):
            running_streak += 1
        else:
            running_streak = 1

        longest_streak = max(longest_streak, running_streak)
        previous_day = workout_day

    # The current streak can include today or end yesterday.
    if today in valid_dates:
        current_day = today
    elif today - timedelta(days=1) in valid_dates:
        current_day = today - timedelta(days=1)
    else:
        current_day = None

    current_streak = 0

    while current_day is not None and current_day in valid_dates:
        current_streak += 1
        current_day -= timedelta(days=1)

    return current_streak, longest_streak


router = APIRouter(
    prefix="/api/v1/dashboard",
    tags=["Dashboard"],
)


@router.get("", response_model=DashboardResponse)
def get_dashboard(
    db: Session = Depends(get_db),
):
    today = date.today()
        # Calculate streaks from all recorded workouts.
    workout_timestamps = (
        db.query(Workout.completed_at)
        .all()
    )

    workout_dates = {
        timestamp.date()
        for (timestamp,) in workout_timestamps
        if timestamp is not None
    }

    current_streak, longest_streak = calculate_streaks(
        workout_dates,
        today,
    )
    # Get or create the single local user profile.
    profile = (
        db.query(UserProfile)
        .order_by(UserProfile.id.asc())
        .first()
    )

    if profile is None:
        profile = UserProfile()
        db.add(profile)
        db.commit()
        db.refresh(profile)

    # Calculate the level in trusted Python code.
    total_xp = profile.total_xp
    level = (total_xp // 100) + 1
    xp_to_next_level = 100 - (total_xp % 100)

    # Overall workout statistics.
    total_workouts = db.query(Workout).count()

    total_minutes = (
        db.query(func.coalesce(func.sum(Workout.duration_minutes), 0))
        .scalar()
    )

    completed_quests = db.query(QuestCompletion).count()

    active_quests = (
        db.query(Quest)
        .filter(Quest.is_active.is_(True))
        .count()
    )

    # Build the last seven calendar days, including today.
    today = date.today()
    first_day = today - timedelta(days=6)

    weekly_workouts = (
        db.query(Workout)
        .filter(
            Workout.completed_at >= first_day,
        )
        .order_by(Workout.completed_at.asc())
        .all()
    )

    activity_by_date = {}

    for workout in weekly_workouts:
        workout_date = workout.completed_at.date()

        # Exclude any future-dated records.
        if first_day <= workout_date <= today:
            stats = activity_by_date.setdefault(
                workout_date,
                {"workout_count": 0, "total_minutes": 0},
            )
            stats["workout_count"] += 1
            stats["total_minutes"] += workout.duration_minutes

    weekly_activity = [
        DailyActivity(
            date=first_day + timedelta(days=day),
            workout_count=activity_by_date.get(
                first_day + timedelta(days=day), {}
            ).get("workout_count", 0),
            total_minutes=activity_by_date.get(
                first_day + timedelta(days=day), {}
            ).get("total_minutes", 0),
        )
        for day in range(7)
    ]

    current_week_minutes = sum(
        day.total_minutes for day in weekly_activity
    )

    return DashboardResponse(
        display_name=profile.display_name,
        primary_goal=profile.primary_goal,
        total_xp=total_xp,
        level=level,
        xp_to_next_level=xp_to_next_level,
        total_workouts=total_workouts,
        total_minutes=int(total_minutes or 0),
        completed_quests=completed_quests,
        active_quests=active_quests,
        current_week_minutes=current_week_minutes,
        weekly_activity=weekly_activity,
        current_streak=current_streak,
        longest_streak=longest_streak,
    )
