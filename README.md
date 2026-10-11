# FitQuest AI 🌿🏃

**Turn outdoor workouts into achievable quests.** FitQuest AI is a fitness tracking application that combines workout logging, AI-generated outdoor challenges, XP-based progression, achievements, and personalized coaching.

> The backend is built with FastAPI and SQLAlchemy. AI quest generation and coaching use a locally running Ollama model.

## ✨ Features

- **Workout tracking** — record walking, running, cycling, or hiking sessions, including duration, distance, perceived effort, and notes.
- **AI-generated quests** — create outdoor fitness challenges based on a fitness goal, experience level, and recent workout history.
- **Quest completion and XP** — validate workouts against quest requirements and award XP for eligible completions.
- **Progress dashboard** — view workout totals, active and completed quests, weekly activity, XP, levels, and workout streaks.
- **Achievements** — track milestones for workouts, active minutes, completed quests, and earned XP.
- **AI fitness coach** — generate supportive feedback and a suggested next-week goal from recent workout history.
- **REST API** — documented API endpoints through FastAPI's interactive Swagger UI.

## 🧰 Tech stack

| Layer | Technology |
|---|---|
| Backend API | Python, FastAPI, Uvicorn |
| Data validation | Pydantic |
| Database access | SQLAlchemy |
| Database | SQLite (local development) |
| AI inference | Ollama, `qwen2.5:3b` |
| Frontend | React + Vite (in the companion frontend project) |

## 📁 Project structure

```text
FitQuest/
├── backend/
│   ├── app/
│   │   ├── main.py             # FastAPI application and router registration
│   │   ├── database.py         # Database engine and session dependency
│   │   ├── models/             # SQLAlchemy models
│   │   ├── schemas/            # Pydantic request/response schemas
│   │   ├── routers/
│   │   │   ├── workouts.py     # Workout creation and history
│   │   │   ├── quests.py       # Quest creation, generation and completion
│   │   │   ├── dashboard.py    # Dashboard statistics
│   │   │   ├── progress.py     # Weekly progress
│   │   │   ├── achievements.py # Achievement milestones
│   │   │   └── coach.py        # AI coaching reviews
│   │   └── services/
│   ├── tests/
│   └── requirements.txt
└── README.md
```

The React frontend is distributed separately as `fitquest-frontend.zip`. Extract it into a `frontend/` directory if you want the layout above to include it in your local checkout.

## 🚀 Getting started

### Prerequisites

- Python 3.10+ (Python 3.12 is suitable)
- `pip` and a virtual environment tool
- [Ollama](https://ollama.com/) for AI-powered features
- Node.js 18+ and npm for the React frontend

### 1. Clone the repository

```bash
git clone https://github.com/neerajsbhandari27/FitQuest.git
cd FitQuest
```

### 2. Set up the backend

```bash
cd backend
python -m venv .venv
```

Activate the environment:

**Linux / macOS**

```bash
source .venv/bin/activate
```

**Windows PowerShell**

```powershell
.venv\Scripts\Activate.ps1
```

Install dependencies and start the API:

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- Health check: `http://localhost:8000/health`

The application creates its database tables during startup. Check `app/database.py` for the configured database URL before running in a non-development environment.

### 3. Enable AI features (Ollama)

Install and start Ollama, then pull the model used by the backend:

```bash
ollama pull qwen2.5:3b
```

Ensure Ollama is running and reachable at `http://localhost:11434`. The current backend sends local inference requests to that address for quest generation and coaching. Those endpoints may return an error if Ollama or the model is unavailable; ordinary workout and dashboard endpoints do not require AI inference.

### 4. Run the React frontend (optional)

Download and extract the companion `fitquest-frontend.zip`, then run:

```bash
cd fitquest-frontend
npm install
npm run dev
```

Vite normally serves the frontend at `http://localhost:5173`. Keep the backend running on port `8000` in a separate terminal. The backend CORS configuration currently allows `http://localhost:5173`; update `allow_origins` in `backend/app/main.py` if your frontend uses a different origin.

If the frontend supports `VITE_API_URL`, configure it in a `.env` file in the frontend directory when the API is hosted at a different address. Do not put secrets in frontend environment variables.

## 🔌 API overview

The API is versioned under `/api/v1`.

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/` | Basic health/welcome response |
| `GET` | `/health` | Health check |
| `GET` | `/api/v1/dashboard` | Dashboard totals, XP, levels, streaks, and weekly activity |
| `GET` | `/api/v1/progress/weekly` | Activity for the last seven calendar days |
| `GET` | `/api/v1/workouts` | List workouts (supports `limit` and `offset`) |
| `POST` | `/api/v1/workouts` | Record a workout |
| `GET` | `/api/v1/quests` | List quests (supports `active_only`) |
| `POST` | `/api/v1/quests` | Create a quest manually |
| `POST` | `/api/v1/quests/generate` | Generate quests with AI |
| `POST` | `/api/v1/quests/{quest_id}/complete/{workout_id}` | Complete a quest using a qualifying workout and award XP |
| `GET` | `/api/v1/achievements` | Get achievement milestones and progress |
| `POST` | `/api/v1/coach/review` | Generate an AI coaching review |
| `GET` | `/api/v1/coach/reviews/latest` | Get the most recent coaching review |

Use `http://localhost:8000/docs` for the exact request bodies, response schemas, and interactive endpoint testing.

## 🧪 Tests

The backend includes tests under `backend/tests/`. With the backend virtual environment activated, run:

```bash
cd backend
pytest
```

## 🔒 Notes and limitations

- This project is configured for local development. Review database configuration, CORS, error handling, and deployment settings before exposing it publicly.
- The current API uses a single local user profile rather than a multi-user authentication system.
- AI-generated content depends on the local Ollama service and installed model.
- Workout data and progress are stored in the configured database. Back up the database if you need to preserve local records.
- Fitness suggestions are for general informational purposes and are not medical advice. Choose activities appropriate to your abilities and stop if you feel pain or unwell.

## 🤝 Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/your-feature`.
3. Make and test your changes.
4. Commit your work and open a pull request.

## 📄 License

No license information was verified while preparing this README. Add a `LICENSE` file and update this section if you intend to publish the project under a particular open-source license.

---

Made with 🌿 for getting outside, building consistency, and making fitness feel like an adventure.
