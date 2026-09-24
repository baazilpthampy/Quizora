# Quizora

A production-quality Mentimeter/Kahoot-style live classroom quiz platform.

## Overview
Quizora allows teachers and presenters to create interactive quizzes and host them live. Participants can join via a 6-digit code on their own devices and answer questions in real-time. The application is built with a server-authoritative architecture to ensure fairness and prevent tampering.

## Tech Stack
- **Frontend:** React, TypeScript, Vite, Tailwind CSS
- **Backend:** Node.js, Express, Socket.IO
- **Database:** PostgreSQL with Prisma ORM
- **Validation:** Zod
- **Testing:** Vitest (Unit), Playwright (E2E)

## Structure
- `/client`: React application
- `/server`: Node.js API and WebSocket server
- `/shared`: Shared types and validation schemas
- `/prisma`: Database schemas and migrations

## Local Development Setup

### Database
1. Ensure you have a local PostgreSQL instance running on port 5432.
2. Configure your connection in `server/.env` using the provided `server/.env.example`.
   ```bash
   DATABASE_URL="postgresql://username:password@localhost:5432/quizora?schema=public"
   ```
3. Run migrations and seed data:
   ```bash
   cd server
   npm run db:migrate
   npm run db:seed
   ```
4. To explore the database, run:
   ```bash
   npm run db:studio
   ```

### Frontend Configuration (Phase 3A)
1. Copy the example environment file in `/client`:
   ```bash
   cp client/.env.example client/.env
   ```
2. Configure `client/.env` with your development user ID:
   ```bash
   VITE_API_URL=http://localhost:3001/api
   VITE_DEV_USER_ID=<seeded-teacher-user-uuid>
   ```

### Running the App
```bash
# Start the backend server (runs on http://localhost:3001)
cd server
npm run dev

# Start the frontend client (runs on http://localhost:5173)
cd client
npm run dev
```

### Running Backend Tests
```bash
cd server
npm test
```

## Live Multiplayer Game Engine (Phases 4–7)

Quizora features an authoritative, low-latency live multiplayer engine powered by **Socket.IO**.

### Hosting a Live Quiz (Teacher)
1. Navigate to the **Teacher Dashboard** (`http://localhost:5173/quizzes`).
2. On any quiz that has at least 1 question with 2+ options and a marked correct answer, click **"Host Live 🚀"**.
3. A unique 6-digit PIN is generated (e.g., `384 912`) and displayed on the classroom screen.
4. As students connect, their names appear dynamically in the lobby.
5. Click **"Start Quiz"** to begin broadcasting questions with an authoritative countdown timer.
6. The host controls question pacing, reviews answer distribution charts, reveals correct answers, and presents the live leaderboard and final celebratory podium.

### Joining a Live Quiz (Participant)
1. On any device (mobile, tablet, or desktop), open `http://localhost:5173/play` or click **"🎮 Join Game"** in the navigation bar.
2. Enter the 6-digit Game PIN and choose a nickname.
3. Wait in the lobby until the host starts the quiz.
4. Fast, colorful multiple-choice buttons (A, B, C, D, E, F) allow one-tap answer submission.
5. Score calculations and speed bonuses are computed strictly server-side:
   $$\text{score} = \text{maxPoints} \times \left(0.5 + 0.5 \times \frac{\text{remainingTime}}{\text{totalTime}}\right)$$
6. Instant personal feedback shows points awarded, rank, and correct answer upon timer expiry.

## Phase 2B: Quiz Management REST API

### Authentication (Development)
Until full user authentication is implemented, API requests must supply the `X-Dev-User-Id` HTTP header containing the UUID of an existing user.

To find the seeded demo teacher user's ID:
```bash
cd server
node -e "require('dotenv').config(); const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.user.findUnique({ where: { email: 'teacher@quizora.demo' } }).then(u => { console.log('Demo User ID:', u.id); prisma.\$disconnect(); });"
```

Pass this ID in your requests:
```http
X-Dev-User-Id: <user-uuid>
```

### Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check endpoint |
| `POST` | `/api/quizzes` | Create a new quiz |
| `GET` | `/api/quizzes` | List all quizzes owned by the current user |
| `GET` | `/api/quizzes/:id` | Get details of a quiz including questions and options |
| `PUT` | `/api/quizzes/:id` | Update title and/or description of a quiz |
| `DELETE` | `/api/quizzes/:id` | Delete a quiz owned by the current user |
| `POST` | `/api/quizzes/:quizId/questions` | Add a question to a quiz |
| `PUT` | `/api/questions/:id` | Update question text, order, time limit, or max points |
| `DELETE` | `/api/questions/:id` | Delete a question |
| `POST` | `/api/questions/:questionId/options` | Add an option to a question |
| `PUT` | `/api/options/:id` | Update option text, order, or correctness |
| `DELETE` | `/api/options/:id` | Delete an option |

### Example Request
Create a Quiz:
```bash
curl -X POST http://localhost:3001/api/quizzes \
  -H "Content-Type: application/json" \
  -H "X-Dev-User-Id: <user-uuid>" \
  -d '{"title": "World Capitals Quiz", "description": "Geography trivia"}'
```

