# GeoScope

An interactive 3D globe that visualizes global news sentiment in real time. Click countries to explore AI-generated briefs, articles, and sentiment analysis.

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Docker](https://www.docker.com/) (for Redis)
- A [NewsAPI](https://newsapi.org/register) key (free tier — 100 req/day)
- A [Gemini API](https://aistudio.google.com/apikey) key (free tier)

## Setup

### 1. Backend

```bash
cd geoscope-backend

```

ADD `.env` and fill in your API keys:

```
PORT=3000
NODE_ENV=development
REDIS_URL=redis://localhost:6379
NEWS_API_KEY=your-newsapi-key
GEMINI_API_KEY=your-gemini-key
```

Start Redis and the backend:

```bash
docker compose up -d
npm install
npm run dev
```

The API runs at `http://localhost:3000`. Hit `http://localhost:3000/api/health` to verify.

### 2. Frontend

```bash
cd frontend/geoscope
npm install
npm run dev
```

Opens at `http://localhost:5173`. The frontend connects to the backend at `localhost:3000`. If the backend is unavailable it falls back to built-in mock data.

To point at a different backend URL, create a `.env.local`:

```
VITE_API_URL=http://localhost:3000
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Server + Redis status |
| GET | `/api/news/:countryCode` | News articles for a country |
| GET | `/api/brief/:countryCode` | AI-generated country brief |
| GET | `/api/sentiment/global` | Sentiment scores for all tracked countries |
| GET | `/api/compare/:countryA/:countryB` | Side-by-side country comparison |

## Build for Production

```bash
# Backend
cd geoscope-backend
npm run build
npm start

# Frontend
cd frontend/geoscope
npm run build
npm run preview
```
