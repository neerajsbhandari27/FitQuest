
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.quest import QuestCreate, QuestResponse
from sqlalchemy.exc import IntegrityError

from app.models import Quest, QuestCompletion, Workout, UserProfile
from app.schemas.completion import CompletionResponse
import json

import httpx
from fastapi import HTTPException
from pydantic import ValidationError

from app.schemas.ai_quest import (
    AIQuestBatch,
    QuestGenerationRequest,
)


router = APIRouter(
    prefix="/api/v1/quests",
    tags=["Quests"],
)

DatabaseSession = Annotated[Session, Depends(get_db)]


@router.post("", response_model=QuestResponse, status_code=201)
def create_quest(
    quest_data: QuestCreate,
    db: Session = Depends(get_db),
):
    quest = Quest(**quest_data.model_dump())

    db.add(quest)
    db.commit()
    db.refresh(quest)

    return quest


@router.get("", response_model=list[QuestResponse])
def list_quests(
    db: Session = Depends(get_db),
    active_only: bool = Query(default=True),
):
    query = db.query(Quest)

    if active_only:
        query = query.filter(Quest.is_active.is_(True))

    return query.order_by(Quest.id.asc()).all()



@router.post(
    "/{quest_id}/complete/{workout_id}",
    response_model=CompletionResponse,
    status_code=201,
)
def complete_quest(
    quest_id: int,
    workout_id: int,
    db: Session = Depends(get_db),
):
    quest = db.get(Quest, quest_id)
    if quest is None or not quest.is_active:
        raise HTTPException(status_code=404, detail="Active quest not found")

    workout = db.get(Workout, workout_id)
    if workout is None:
        raise HTTPException(status_code=404, detail="Workout not found")

    existing = (
        db.query(QuestCompletion)
        .filter_by(quest_id=quest_id, workout_id=workout_id)
        .first()
    )
    if existing:
        raise HTTPException(
            status_code=409,
            detail="This workout has already completed this quest",
        )

    if workout.activity_type != quest.activity_type:
        raise HTTPException(
            status_code=400,
            detail="Workout activity type does not match the quest",
        )

    if workout.duration_minutes < quest.target_minutes:
        raise HTTPException(
            status_code=400,
            detail="Workout duration does not meet the quest target",
        )

    if quest.target_distance_km is not None:
        if (
            workout.distance_km is None
            or workout.distance_km < quest.target_distance_km
        ):
            raise HTTPException(
                status_code=400,
                detail="Workout distance does not meet the quest target",
            )

    try:
        profile = db.query(UserProfile).with_for_update().first()

        if profile is None:
            profile = UserProfile()
            db.add(profile)
            db.flush()

        completion = QuestCompletion(
            quest_id=quest.id,
            workout_id=workout.id,
            xp_awarded=quest.xp_reward,
        )
        db.add(completion)
        profile.total_xp += quest.xp_reward
        db.commit()
        db.refresh(completion)
        return completion

    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="This workout has already completed this quest",
        )
    except Exception:
        db.rollback()
        raise


@router.post("/generate", response_model=list[QuestResponse])
async def generate_quests(
    request: QuestGenerationRequest,
    db: Session = Depends(get_db),
):
    # Give the AI recent activity context.
    recent_workouts = (
        db.query(Workout)
        .order_by(Workout.completed_at.desc())
        .limit(5)
        .all()
    )

    history = [
        {
            "activity_type": workout.activity_type,
            "duration_minutes": workout.duration_minutes,
            "distance_km": workout.distance_km,
        }
        for workout in recent_workouts
    ]

    prompt = f"""
You are FitQuest AI, a practical outdoor fitness quest generator.

Create exactly {request.count} distinct outdoor fitness quests.

User fitness goal: {request.fitness_goal}
Experience level: {request.experience_level}
Recent workouts: {json.dumps(history)}

Rules:
- Use only walking, running, cycling, or hiking.
- Each quest must take 5 to 120 minutes.
- Make quests realistic for the user's experience level.
- Beginners need gentle, achievable challenges.
- Do not prescribe dangerous or extreme activity.
- Do not claim the user completed an activity.
- Return only a JSON object with a "quests" array.
- Each quest must contain:
  title, description, activity_type, target_minutes,
  target_distance_km, difficulty.
- target_distance_km can be null.
- difficulty must be easy, medium, or hard.
- EVERY quest MUST include the difficulty field.
- Use "easy" for beginners unless a moderate challenge is clearly appropriate.
- Return valid JSON with no markdown or extra commentary.
- Use exactly these keys for each quest:
  title, description, activity_type, target_minutes,
  target_distance_km, difficulty.
- Do not include XP rewards or database IDs.
"""

    try:
        async with httpx.AsyncClient(timeout=180.0) as client:
            response = await client.post(
                "http://localhost:11434/api/generate",
                json={
                    "model": "qwen2.5:3b",
                    "prompt": prompt,
                    "format": "json",
                    "stream": False,
                    "options": {"temperature": 0.7},
                },
            )
            response.raise_for_status()

        model_output = response.json()["response"]
        batch = AIQuestBatch.model_validate_json(model_output)

        if len(batch.quests) != request.count:
            raise HTTPException(
                status_code=502,
                detail="AI returned an unexpected number of quests",
            )

        # Calculate rewards in trusted backend code.
        rewards = {"easy": 10, "medium": 25, "hard": 40}
        new_quests = []

        for draft in batch.quests:
            xp_reward = min(
                100,
                draft.target_minutes + rewards[draft.difficulty],
            )

            quest = Quest(
                **draft.model_dump(),
                xp_reward=xp_reward,
                is_active=True,
            )
            new_quests.append(quest)

        db.add_all(new_quests)
        db.commit()

        for quest in new_quests:
            db.refresh(quest)

        return new_quests

    except (httpx.ConnectError, httpx.TimeoutException):
        db.rollback()
        raise HTTPException(
            status_code=503,
            detail="Ollama is unavailable or took too long. Check Ollama and retry.",
        )
    except httpx.HTTPStatusError:
        db.rollback()
        raise HTTPException(
            status_code=502,
            detail="Ollama returned an error. Verify that gemma2:2b is installed.",
        )
    except (ValidationError, ValueError, KeyError) as exc:
        db.rollback()
        print(f"AI quest validation failed: {exc}")
        raise HTTPException(
            status_code=502,
            detail="AI returned invalid quest data. Check backend logs.",
        )
    except Exception:
        db.rollback()
        raise