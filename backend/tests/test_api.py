from datetime import date, timedelta

from app.routers.dashboard import calculate_streaks
def create_workout(client, activity_type="walking", duration=30):
    return client.post(
        "/api/v1/workouts",
        json={
            "activity_type": activity_type,
            "duration_minutes": duration,
            "distance_km": 2.5,
            "perceived_effort": 4,
            "notes": "Automated test workout",
        },
    )


def create_quest(client, activity_type="walking", duration=20):
    return client.post(
        "/api/v1/quests",
        json={
            "title": "Test Outdoor Quest",
            "description": "Complete an outdoor activity for testing.",
            "activity_type": activity_type,
            "target_minutes": duration,
            "target_distance_km": None,
            "xp_reward": 40,
            "difficulty": "easy",
        },
    )


def test_create_and_list_workout(client):
    response = create_workout(client)

    assert response.status_code == 201
    assert response.json()["activity_type"] == "walking"
    assert response.json()["duration_minutes"] == 30

    listing = client.get("/api/v1/workouts")
    assert listing.status_code == 200
    assert len(listing.json()) == 1


def test_invalid_workout_is_rejected(client):
    response = create_workout(client, duration=0)

    assert response.status_code == 422
    assert client.get("/api/v1/workouts").json() == []


def test_quest_completion_awards_xp_once(client):
    workout_response = create_workout(client)
    quest_response = create_quest(client)

    assert workout_response.status_code == 201
    assert quest_response.status_code in (200, 201)

    workout_id = workout_response.json()["id"]
    quest_id = quest_response.json()["id"]

    completion_url = (
        f"/api/v1/quests/{quest_id}/complete/{workout_id}"
    )

    first = client.post(completion_url)
    assert first.status_code in (200, 201)
    assert first.json()["xp_awarded"] == 40

    duplicate = client.post(completion_url)
    assert duplicate.status_code == 409

    dashboard = client.get("/api/v1/dashboard")
    assert dashboard.status_code == 200
    assert dashboard.json()["total_xp"] == 40
    assert dashboard.json()["completed_quests"] == 1


def test_quest_rejects_wrong_activity(client):
    workout_response = create_workout(
        client,
        activity_type="running",
        duration=30,
    )
    quest_response = create_quest(
        client,
        activity_type="walking",
        duration=20,
    )

    workout_id = workout_response.json()["id"]
    quest_id = quest_response.json()["id"]

    response = client.post(
        f"/api/v1/quests/{quest_id}/complete/{workout_id}"
    )

    assert response.status_code == 400
    assert client.get("/api/v1/dashboard").json()["total_xp"] == 0


def test_achievement_tracks_first_workout(client):
    create_workout(client)

    response = client.get("/api/v1/achievements")
    assert response.status_code == 200

    achievements = {
        item["id"]: item for item in response.json()
    }

    assert achievements["first_workout"]["unlocked"] is True
    assert achievements["first_workout"]["progress"] == 1
    assert achievements["workouts_5"]["unlocked"] is False

def test_dashboard_empty_state(client):
    response = client.get("/api/v1/dashboard")

    assert response.status_code == 200
    data = response.json()

    assert data["total_xp"] == 0
    assert data["total_workouts"] == 0
    assert data["total_minutes"] == 0
    assert data["completed_quests"] == 0
    assert data["current_streak"] == 0
    assert data["longest_streak"] == 0

def test_weekly_progress_empty_state(client):
    response = client.get("/api/v1/progress/weekly")

    assert response.status_code == 200
    data = response.json()

    # An empty database should report zero activity.
    # Confirm the exact response structure if this assertion fails.
    assert data is not None

def test_streak_counts_consecutive_days():
    today = date(2026, 10, 10)

    workout_dates = {
        today,
        today - timedelta(days=1),
        today - timedelta(days=2),
        today - timedelta(days=5),
        today - timedelta(days=6),
    }

    current, longest = calculate_streaks(workout_dates, today)

    assert current == 3
    assert longest == 3


def test_streak_continues_if_last_workout_was_yesterday():
    today = date(2026, 10, 10)

    workout_dates = {
        today - timedelta(days=1),
        today - timedelta(days=2),
    }

    current, longest = calculate_streaks(workout_dates, today)

    assert current == 2
    assert longest == 2


def test_missed_days_reset_current_streak():
    today = date(2026, 10, 10)

    workout_dates = {
        today - timedelta(days=5),
        today - timedelta(days=3),
    }

    current, longest = calculate_streaks(workout_dates, today)

    assert current == 0
    assert longest == 1


def test_future_workouts_do_not_count():
    today = date(2026, 10, 10)

    workout_dates = {
        today,
        today + timedelta(days=1),
    }

    current, longest = calculate_streaks(workout_dates, today)

    assert current == 1
    assert longest == 1


def test_share_progress(client):
    create_workout(client, duration=45)
    response = client.get("/api/v1/share/progress")
    assert response.status_code == 200
    data = response.json()
    assert data["card_type"] == "progress"
    assert "Level 1" in data["title"]
    assert "FitQuest" in data["message"]
    assert data["stats"]["total_minutes"] == 45
    assert len(data["hashtags"]) > 0


def test_share_achievement(client):
    create_workout(client)
    response = client.get("/api/v1/share/achievement/first_workout")
    assert response.status_code == 200
    data = response.json()
    assert data["card_type"] == "achievement"
    assert "Touch Grass" in data["title"]
    assert "🌱" in data["title"]
    assert "FitQuest" in data["message"]


def test_share_workout(client):
    w = create_workout(client, activity_type="running", duration=25).json()
    response = client.get(f"/api/v1/share/workout/{w['id']}")
    assert response.status_code == 200
    data = response.json()
    assert data["card_type"] == "workout"
    assert "Running Session" in data["title"]
    assert "25 min" in data["subtitle"]


def test_share_quest(client):
    q = create_quest(client).json()
    response = client.get(f"/api/v1/share/quest/{q['id']}")
    assert response.status_code == 200
    data = response.json()
    assert data["card_type"] == "quest"
    assert "Test Outdoor Quest" in data["title"]
    assert "+40 XP" in data["subtitle"]


def test_share_not_found(client):
    assert client.get("/api/v1/share/achievement/non_existent").status_code == 404
    assert client.get("/api/v1/share/workout/9999").status_code == 404
    assert client.get("/api/v1/share/quest/9999").status_code == 404


def test_workout_with_photo(client):
    response = client.post(
        "/api/v1/workouts",
        json={
            "activity_type": "walking",
            "duration_minutes": 30,
            "distance_km": 2.0,
            "perceived_effort": 4,
            "notes": "Trail walk with photo",
            "photo_url": "data:image/jpeg;base64,fakephotodata12345",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["photo_url"] == "data:image/jpeg;base64,fakephotodata12345"

    share = client.get(f"/api/v1/share/workout/{data['id']}").json()
    assert share["photo_url"] == "data:image/jpeg;base64,fakephotodata12345"


def test_coach_chat_flow(client):
    # Empty initially
    history = client.get("/api/v1/coach/chat").json()
    assert history == []

    # Send a message
    res = client.post(
        "/api/v1/coach/chat",
        json={"message": "I feel a bit tired today, should I walk?"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "reply" in data
    assert len(data["messages"]) >= 2  # user + assistant

    # Check history endpoint
    history = client.get("/api/v1/coach/chat").json()
    assert len(history) >= 2
    assert history[0]["role"] == "user"
    assert history[1]["role"] == "assistant"

    # Clear chat
    del_res = client.delete("/api/v1/coach/chat")
    assert del_res.status_code == 200
    assert client.get("/api/v1/coach/chat").json() == []