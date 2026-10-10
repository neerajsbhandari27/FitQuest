
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Workout
from app.schemas.workout import WorkoutCreate, WorkoutResponse


router = APIRouter(
    prefix="/api/v1/workouts",
    tags=["Workouts"],
)


@router.post("", response_model=WorkoutResponse, status_code=201)
def create_workout(
    workout_data: WorkoutCreate,
    db: Session = Depends(get_db),
):
    workout = Workout(**workout_data.model_dump())

    try:
        db.add(workout)
        db.commit()
        db.refresh(workout)
        return workout
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not save workout. Please try again.",
        )


@router.get("", response_model=list[WorkoutResponse])
def list_workouts(
    db: Session = Depends(get_db),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
):
    return (
        db.query(Workout)
        .order_by(Workout.completed_at.desc(), Workout.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
