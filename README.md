# Shakespeare

English learning platform with interactive exercises, progress tracking, and teacher booking.

## Tech Stack

**Frontend** — React 18, TypeScript, Vite, Clerk Auth, react-pdf, Lucide icons  
**Backend** — Hono, Bun, Clerk Auth, SQLite  
**Infrastructure** — Resend (email), Stripe (payments)

## Project Structure

```
.
├── web/app/          # Frontend (Vite + React)
│   └── src/
│       ├── pages/        # Dashboard, Reading, Listening, etc.
│       ├── components/   # ActivityGrid, Badges, ThemeProvider, etc.
│       ├── styles/       # Global CSS with CSS variables
│       └── main.tsx      # App entry with routing
├── api/src/          # Backend API (Hono + Bun)
│   ├── routes/          # auth, users, resources, activity, progress, vocabulary
│   ├── middleware/       # Auth middleware
│   ├── db.ts            # SQLite setup
│   └── index.ts         # Server entry
└── admin/app/        # Admin dashboard
```

## Getting Started

### API

```bash
cd api
bun install
bun run dev
```

Server runs on `http://localhost:3001`.

### Frontend

```bash
cd web/app
npm install
npm run dev
```

App runs on `http://localhost:5173`.

## Environment

Copy `web/app/.env.example` to `web/app/.env` and fill in your Clerk keys:

```
VITE_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
```

## Features

- **Reading** — Upload PDFs and view them inline with word click to save vocabulary
- **Listening** — Hear words spoken aloud and type the spelling before time runs out
- **Definitions** — Match definitions to the correct word in multiple-choice format
- **Transformations** — Transform sentences between tenses
- **Phrasal Verbs** — Type the correct phrasal verb from its definition
- **Progress** — Track words learned and study activity on a GitHub-style heatmap
- **Badges** — Earn badges and milestones as you learn
- **Book a Class** — Browse teachers, view availability, and request sessions
- **Theme** — Light/dark mode toggle
