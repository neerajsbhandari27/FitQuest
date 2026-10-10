from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.database import Base, engine
from app import models
from app.routers.workouts import router as workout_router
from app.routers.quests import router as quests_router
from app.routers.dashboard import router as dashboard_router
from app.routers.progress import router as progress_router
from app.routers.coach import router as coach_router
from app.routers.achievements import router as achievements_router
from app.routers.share import router as share_router
from fastapi.middleware.cors import CORSMiddleware


@asynccontextmanager
async def lifespan(app:FastAPI):
    Base.metadata.create_all(bind=engine)
    yield
app=FastAPI(
    title="FitQuest AI",
    description="fitness quest app, help user to find quest and add its progress to social media",
    version="0.0.1",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:4173",
        "http://127.0.0.1:4173",
    ],
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(workout_router)
app.include_router(quests_router)
app.include_router(dashboard_router)
app.include_router(progress_router)
app.include_router(coach_router)
app.include_router(achievements_router)
app.include_router(share_router)

@app.get("/")
def health_check():
    return{
        "msg":"welcome to fitness quest",
        "status":"healthy"}

@app.get("/health")
def is_health():
    return{
        "msg":"welcome to fitness quest",
        "status":"healthy"}