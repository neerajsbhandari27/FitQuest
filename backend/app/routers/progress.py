
from fastapi import APIRouter, Depends

from app.database import get_db
from app.schemas.dashboard import DailyActivity, DashboardResponse
from app.routers.dashboard import get_dashboard
from sqlalchemy.orm import Session


router = APIRouter(
    prefix="/api/v1/progress",
    tags=["Progress"],
)


@router.get("/weekly", response_model=list[DailyActivity])
def get_weekly_progress(
    db: Session = Depends(get_db),
):
    dashboard: DashboardResponse = get_dashboard(db)
    return dashboard.weekly_activity
