
import json
import os

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import CoachChatMessage, CoachReview, UserProfile, Workout
from app.schemas.coach import (
    CoachChatMessageSchema,
    CoachChatRequest,
    CoachChatResponse,
    CoachReviewDraft,
    CoachReviewRequest,
    CoachReviewResponse,
)

router = APIRouter(prefix="/api/v1/coach", tags=["AI Coach"])


@router.post("/review", response_model=CoachReviewResponse, status_code=201)
async def create_coach_review(
    request: CoachReviewRequest,
    db: Session = Depends(get_db),
):
    recent_workouts = (
        db.query(Workout)
        .order_by(Workout.completed_at.desc(), Workout.id.desc())
        .limit(20)
        .all()
    )

    history = [
        {
            "activity_type": workout.activity_type,
            "duration_minutes": workout.duration_minutes,
            "distance_km": workout.distance_km,
            "perceived_effort": workout.perceived_effort,
            "notes": workout.notes,
            "completed_at": workout.completed_at.isoformat(),
        }
        for workout in recent_workouts
    ]

    prompt = f"""
You are FitQuest AI, a supportive outdoor fitness coach.

Analyze the user's actual workout history and provide practical,
encouraging feedback.

User's focus: {request.focus}
Recent workout history (JSON): {json.dumps(history)}

Rules:
- Base observations only on the supplied workout history.
- If there are no workouts, say so honestly and suggest a gentle start.
- Never invent workouts, distances, achievements, or progress.
- Do not diagnose medical conditions or claim to assess exercise form.
- Make suggestions realistic and suitable for gradual progress.
- Do not encourage pushing through pain or dangerous activity.
- Return only a valid JSON object with these keys:
  summary, strengths, suggestions, next_week_goal.
- summary must be a string.
- strengths must be an array of 1 to 5 strings.
- suggestions must be an array of 1 to 5 strings.
- next_week_goal must be a string.
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
                    "options": {"temperature": 0.3},
                },
            )
            response.raise_for_status()

        model_output = response.json()["response"]
        draft = CoachReviewDraft.model_validate_json(model_output)

        review = CoachReview(
            summary=draft.summary,
            strengths=draft.strengths,
            suggestions=draft.suggestions,
            next_week_goal=draft.next_week_goal,
            workouts_analyzed=len(recent_workouts),
        )

        db.add(review)
        db.commit()
        db.refresh(review)
        return review

    except (httpx.ConnectError, httpx.TimeoutException):
        db.rollback()
        raise HTTPException(
            status_code=503,
            detail="Ollama is unavailable or timed out. Check Ollama and retry.",
        )
    except httpx.HTTPStatusError:
        db.rollback()
        raise HTTPException(
            status_code=502,
            detail="Ollama returned an error while generating the review.",
        )
    except (ValidationError, ValueError, KeyError) as exc:
        db.rollback()
        print(f"AI coach validation failed: {exc}")
        raise HTTPException(
            status_code=502,
            detail="AI returned an invalid coach review. Please retry.",
        )
    except Exception:
        db.rollback()
        raise


@router.get("/reviews/latest", response_model=CoachReviewResponse)
def get_latest_coach_review(db: Session = Depends(get_db)):
    review = (
        db.query(CoachReview)
        .order_by(CoachReview.created_at.desc(), CoachReview.id.desc())
        .first()
    )

    if review is None:
        raise HTTPException(
            status_code=404,
            detail="No coach reviews yet. Generate your first review.",
        )

    return review


@router.get("/chat", response_model=list[CoachChatMessageSchema])
def get_chat_history(db: Session = Depends(get_db)):
    return (
        db.query(CoachChatMessage)
        .order_by(CoachChatMessage.created_at.asc(), CoachChatMessage.id.asc())
        .limit(50)
        .all()
    )


@router.delete("/chat")
def clear_chat_history(db: Session = Depends(get_db)):
    db.query(CoachChatMessage).delete()
    db.commit()
    return {"status": "cleared"}


@router.post("/chat", response_model=CoachChatResponse)
async def chat_with_coach(
    request: CoachChatRequest,
    db: Session = Depends(get_db),
):
    # 1. Save user's message
    user_msg = CoachChatMessage(role="user", content=request.message.strip())
    db.add(user_msg)
    db.commit()

    # 2. Get user profile and recent workout history
    profile = db.query(UserProfile).order_by(UserProfile.id.asc()).first()
    total_xp = profile.total_xp if profile else 0
    level = (total_xp // 100) + 1
    goal = profile.primary_goal if profile else "Build a consistent outdoor fitness habit"

    recent_workouts = (
        db.query(Workout)
        .order_by(Workout.completed_at.desc(), Workout.id.desc())
        .limit(5)
        .all()
    )
    history_summary = [
        f"{w.activity_type} ({w.duration_minutes} min, effort {w.perceived_effort}/10)"
        for w in recent_workouts
    ]

    # 3. Retrieve recent conversation history
    past_messages = (
        db.query(CoachChatMessage)
        .order_by(CoachChatMessage.id.desc())
        .limit(8)
        .all()
    )
    past_messages.reverse()

    conv_text = "\n".join(
        f"{'User' if m.role == 'user' else 'Coach'}: {m.content}"
        for m in past_messages
    )

    prompt = f"""You are FitQuest AI Coach, a supportive, encouraging, and practical outdoor fitness coach.
User info:
- Fitness Goal: {goal}
- Explorer Level: {level} ({total_xp} XP)
- Recent Workouts: {', '.join(history_summary) if history_summary else 'No workouts logged yet'}

Guidelines:
- Give positive, realistic, and practical outdoor guidance (walking, jogging, running, hiking, cycling).
- Keep responses friendly, conversational, and concise (2-4 brief paragraphs max).
- If the user asks about soreness, stiff muscles, or rest, emphasize gentle recovery, hydration, and listening to their body.
- Never diagnose injuries or give medical prescriptions.
- Address the user's latest question directly.

Conversation so far:
{conv_text}

Coach:"""

    reply_text = ""
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                "http://localhost:11434/api/generate",
                json={
                    "model": "qwen2.5:3b",
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": 0.7},
                },
            )
            response.raise_for_status()
            reply_text = response.json().get("response", "").strip()

    except Exception as exc:
        print(f"Coach chat Ollama fallback: {exc}")
        reply_text = (
            "I'm here with you! Every outdoor step builds momentum. "
            "Whether it's a brisk 15-minute walk or a gentle stretch outside, "
            "focus on consistency over intensity today. How are you feeling right now?"
        )

    # 4. Save assistant's reply
    assistant_msg = CoachChatMessage(role="assistant", content=reply_text)
    db.add(assistant_msg)
    db.commit()

    all_messages = (
        db.query(CoachChatMessage)
        .order_by(CoachChatMessage.created_at.asc(), CoachChatMessage.id.asc())
        .limit(50)
        .all()
    )

    return CoachChatResponse(reply=reply_text, messages=all_messages)

