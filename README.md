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

### Running the App
```bash
# Start the server
cd server
npm run dev

# Start the client
cd client
npm run dev
```

### Running Backend Tests
```bash
cd server
npm test
```

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

