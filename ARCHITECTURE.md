# Quizora Architecture

## 1. System Architecture
- **Frontend (Client):** React with Vite, written in TypeScript. Styling via Tailwind CSS. Two distinct interfaces: Host (Teacher) and Player (Participant).
- **Backend (API + WebSocket):** Node.js with Express for RESTful API (auth, quiz management). Socket.IO for real-time multiplayer session management.
- **Database:** PostgreSQL for persistent data (users, quizzes, questions, historical session data).
- **ORM:** Prisma for type-safe database queries and migrations.
- **State Management (Live Session):** In-memory (e.g., Maps/Redis) server-authoritative state for active quiz sessions, ensuring fast real-time updates and preventing client manipulation.

## 2. Folder Structure
```text
/quizora
├── /client                 # React frontend
│   ├── /src
│   │   ├── /components     # Reusable UI components
│   │   ├── /pages          # Host and Player specific pages
│   │   ├── /hooks          # Custom React hooks (Socket, etc.)
│   │   ├── /services       # API & Socket clients
│   │   ├── /types          # Shared TS interfaces
│   │   └── /utils          # Helper functions
├── /server                 # Node.js backend
│   ├── /src
│   │   ├── /controllers    # REST API controllers
│   │   ├── /routes         # API route definitions
│   │   ├── /sockets        # Socket.IO event handlers
│   │   ├── /services       # Business logic & Database calls
│   │   ├── /models         # Live session state models
│   │   ├── /middlewares    # Auth & Validation
│   │   ├── /types          # Shared TS interfaces
│   │   └── /utils          # Helper functions
├── /prisma                 # Database schema & migrations
└── /shared                 # Shared types/schemas (Zod) between client and server
```

## 3. Database Entities and Relationships
- **User (Teacher)**: `id`, `email`, `passwordHash`, `name`, `createdAt`
- **Quiz**: `id`, `title`, `teacherId`, `createdAt`, `updatedAt` (1:N with Questions)
- **Question**: `id`, `quizId`, `text`, `type` (MULTIPLE_CHOICE), `timeLimit`, `points`, `order` (1:N with Options)
- **Option**: `id`, `questionId`, `text`, `isCorrect`
- **Session (Historical)**: `id`, `quizId`, `joinCode`, `startedAt`, `endedAt` (1:N with Participants)
- **Participant (Historical)**: `id`, `sessionId`, `displayName`, `score`
- **Answer (Historical)**: `id`, `participantId`, `questionId`, `optionId`, `isCorrect`, `timeTaken`, `pointsAwarded`

## 4. Socket.IO Event Architecture
**Client -> Server:**
- `host:create_session` (quizId) -> returns joinCode
- `host:start_quiz`
- `host:next_question`
- `host:end_question`
- `host:show_leaderboard`
- `host:end_quiz`
- `player:join_session` (joinCode, displayName)
- `player:submit_answer` (questionId, optionId)

**Server -> Client:**
- `session:error` (message)
- `host:player_joined` (participant info)
- `host:answer_received` (anonymous count update)
- `player:joined_successfully` (player state)
- `shared:question_started` (question details without correct answer)
- `shared:question_ended` (correct answer, stats)
- `shared:leaderboard_updated` (top players)
- `shared:quiz_ended` (final results)

## 5. Application State Machine (Live Quiz)
- `LOBBY`: Session created, waiting for players.
- `QUESTION_ACTIVE`: A question is currently displayed, timer is running, accepting answers.
- `QUESTION_ENDED`: Timer expired or host ended early, correct answers and stats shown.
- `LEADERBOARD`: Displaying current rankings between questions.
- `FINISHED`: Quiz is completely over, final leaderboard shown.
