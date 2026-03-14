# EcoCred Analytics MVP

EcoCred Analytics is a full-stack MVP for ESG claim analysis and greenwashing risk detection using AI-assisted scoring, community posts, and environmental news monitoring.

## Stack

- Frontend: Next.js (React), Tailwind CSS, Chart.js
- Backend: FastAPI (Python)
- Database: MongoDB Atlas
- Auth: JWT
- Integrations: GNews API, Twilio SMS, Sarvam AI API, Cloudinary

## Project Structure

- backend/
  - main.py
  - database.py
  - models/
  - routes/
  - services/
  - utils/
- frontend/
  - components/
  - pages/
  - hooks/
  - utils/
  - styles/

## Environment Variables

### backend/.env

Copy backend/.env.example to backend/.env and set:

- MONGO_URI
- JWT_SECRET
- JWT_ALGORITHM
- JWT_EXPIRE_MINUTES
- GNEWS_API_KEY
- SARVAM_API_KEY
- SARVAM_API_BASE
- CLOUDINARY_CLOUD_NAME
- CLOUDINARY_API_KEY
- CLOUDINARY_API_SECRET
- CLOUDINARY_SECURE
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- TWILIO_FROM_NUMBER

Mongo database name defaults to: ecocred

### frontend/.env.local

Copy frontend/.env.local.example to frontend/.env.local:

- NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

## Run Backend

```bash
cd backend
python -m venv .venv
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on http://localhost:3000
Backend runs on http://localhost:8000

## Implemented API Routes

- Auth
  - POST /auth/register
  - POST /auth/login
- Posts
  - POST /posts/upload
  - GET /posts/feed
  - POST /posts/comment
  - POST /posts/upvote
  - POST /posts/downvote
- Analysis
  - GET /analysis/company
  - POST /analysis/company/upload
- News
  - GET /news/company
- Companies
  - GET /companies/search

## Notes

- Post media uploads use Cloudinary when configured, with automatic local fallback to backend/uploads.
- ESG PDF uploads are temporarily saved locally for text extraction.
- Twilio SMS is optional and triggered during login when phone number is provided.
- AI analysis includes Sarvam response mapping with fallback local parsing when remote payload is unavailable.
