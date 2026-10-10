
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
    JSON,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    display_name: Mapped[str] = mapped_column(
        String(80), default="Outdoor Explorer"
    )
    primary_goal: Mapped[str] = mapped_column(
        String(100), default="Build a consistent outdoor fitness habit"
    )
    total_xp: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Quest(Base):
    __tablename__ = "quests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(Text)
    activity_type: Mapped[str] = mapped_column(String(30))
    target_minutes: Mapped[int] = mapped_column(Integer)
    target_distance_km: Mapped[float | None] = mapped_column(
        Float, nullable=True
    )
    xp_reward: Mapped[int] = mapped_column(Integer, default=50)
    difficulty: Mapped[str] = mapped_column(String(20), default="easy")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    completions: Mapped[list["QuestCompletion"]] = relationship(
        back_populates="quest"
    )


class Workout(Base):
    __tablename__ = "workouts"
    __table_args__ = (
        CheckConstraint(
            "duration_minutes > 0",
            name="ck_workout_positive_duration",
        ),
        CheckConstraint(
            "distance_km IS NULL OR distance_km >= 0",
            name="ck_workout_nonnegative_distance",
        ),
        CheckConstraint(
            "perceived_effort >= 1 AND perceived_effort <= 10",
            name="ck_workout_effort_range",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    activity_type: Mapped[str] = mapped_column(String(30))
    duration_minutes: Mapped[int] = mapped_column(Integer)
    distance_km: Mapped[float | None] = mapped_column(
        Float, nullable=True
    )
    perceived_effort: Mapped[int] = mapped_column(Integer, default=5)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    photo_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    quest_completions: Mapped[list["QuestCompletion"]] = relationship(
        back_populates="workout"
    )


class QuestCompletion(Base):
    __tablename__ = "quest_completions"
    __table_args__ = (
        UniqueConstraint(
            "quest_id",
            "workout_id",
            name="uq_quest_workout_completion",
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    quest_id: Mapped[int] = mapped_column(
        ForeignKey("quests.id"), nullable=False
    )
    workout_id: Mapped[int] = mapped_column(
        ForeignKey("workouts.id"), nullable=False
    )
    xp_awarded: Mapped[int] = mapped_column(Integer, default=0)
    completed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    quest: Mapped["Quest"] = relationship(back_populates="completions")
    workout: Mapped["Workout"] = relationship(
        back_populates="quest_completions"
    )



class CoachReview(Base):
    __tablename__ = "coach_reviews"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    strengths: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    suggestions: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    next_week_goal: Mapped[str] = mapped_column(String(300), nullable=False)
    workouts_analyzed: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )


class CoachChatMessage(Base):
    __tablename__ = "coach_chat_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # "user" or "assistant"
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
    )

