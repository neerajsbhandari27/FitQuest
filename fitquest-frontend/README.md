# FitQuest frontend

A responsive React + Vite frontend for the supplied FitQuest AI FastAPI backend. Includes dashboard analytics, AI quest generation, workout logging, quest completion, achievements, and AI coach reviews.

## Requirements
- Node.js 18+ (Node 20+ recommended)
- The FitQuest FastAPI backend running at `http://localhost:8000`
- Ollama with the model configured by your backend for AI quest generation and coach reviews

## Run locally

1. Unzip this folder.
2. In this directory, install packages:
   ```bash
   npm install
   ```
3. Optional: copy `.env.example` to `.env` and set `VITE_API_URL` if your API is hosted elsewhere.
4. Start the frontend:
   ```bash
   npm run dev
   ```
5. Open the URL Vite prints (usually `http://localhost:5173`).

## Backend
Start the FastAPI app from your backend project using its environment, for example:

```bash
uvicorn app.main:app --reload --port 8000
```

The provided backend already allows CORS from `http://localhost:5173`. Keep that origin if using the default Vite port. The UI uses these routes:

- `GET /api/v1/dashboard`
- `GET, POST /api/v1/workouts`
- `GET, POST /api/v1/quests` and `POST /api/v1/quests/generate`
- `POST /api/v1/quests/{quest_id}/complete/{workout_id}`
- `GET /api/v1/achievements`
- `POST /api/v1/coach/review` and `GET /api/v1/coach/reviews/latest`

AI features depend on the local Ollama service and model configured in the backend. The UI reports backend/AI errors rather than silently pretending the operation succeeded.
