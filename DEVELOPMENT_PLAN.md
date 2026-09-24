# Quizora Development Plan

## Implementation Phases

### Phase 1: Project Setup & Foundation (Complete)
- [x] Initialize monorepo structure with `client` and `server`.
- [x] Setup TypeScript, Vite, Tailwind, ESLint, and Prettier for the frontend.
- [x] Setup Node.js, Express, TypeScript, and error handling for the backend.
- [ ] Setup `shared` folder for Zod schemas and shared TypeScript types. (Will do in Phase 2)
- [ ] Create base testing structure (Vitest). (Will do when adding tests)

### Phase 2: Database & API (Quiz Management)
- [x] Phase 2A: PostgreSQL Foundation (Prisma Schema, Client, Configuration, Seeding).
- [x] Phase 2B: Quiz Management REST API (CRUD for Quizzes, Questions, Options).
  - [x] Development user authorization via `X-Dev-User-Id` header.
  - [x] Strict ownership validation across quizzes, questions, and options.
  - [x] Zod request validation and centralized JSON error responses.
  - [x] End-to-end integration test suite (17 tests passing with Vitest & Supertest).
- [ ] Implement production Teacher Authentication (JWT). (Phase 2 continuation / upcoming)

### Phase 3: Frontend Quiz Builder
- [x] Phase 3A: Frontend Quiz Builder Foundation (React + Vite + Tailwind).
  - [x] Typed REST API client layer (`client/src/lib/api.ts`).
  - [x] Development user authorization configuration via `VITE_DEV_USER_ID`.
  - [x] Teacher dashboard listing quizzes with empty, loading, and error states.
  - [x] Create quiz form with client-side validation.
  - [x] Quiz editor with inline details editing.
  - [x] Question builder supporting question text, order, time limit, and max points.
  - [x] Option editor supporting 2-6 multiple choice options and single correct answer selection.
  - [x] Complete CRUD integration with Express REST API.
- [x] Phase 3B: Quiz Builder Hardening & UX Refinement.
  - [x] Deterministic question and option ordering (`order: 'asc'`).
  - [x] Quiz and question live readiness badges with visual indicator bars.
  - [x] Single correct answer radio mechanics with race-condition prevention (`Promise.all` toggle).
  - [x] Hardened Modal component with Escape key and backdrop dismissal, ARIA accessibility attributes.
  - [x] Strict character limits and field validation aligned with backend Zod schemas (titles <= 100, descriptions <= 500, questions <= 500, options <= 200, timers 5-300s, points 100-10,000).
  - [x] Sanitized user-friendly error handling with `getErrorMessage(err)` (401, 403, 404, 409, 500, network errors).
  - [x] End-to-end full persistence lifecycle verification against PostgreSQL database.

### Phase 4: Core Real-time Engine (Socket.IO) (Complete)
- [x] Implement server-side in-memory session manager with clean lookup maps (`sessionsByCode`, `sessionsById`, `playerSocketToSession`, `hostSocketToSession`).
- [x] Handle session creation with collision-free 6-digit numeric PIN generation.
- [x] Handle player joining with validation, duplicate nickname reconnection handling, and live Lobby state broadcast.
- [x] Implement Host controls (start quiz, next question, end question early, show leaderboard, end quiz).
- [x] Synchronize real-time state between Host and Players via Socket.IO rooms.

### Phase 5: Gameplay & Scoring (Authoritative Server) (Complete)
- [x] Implement Question broadcasting to clients with sanitized payloads (strictly omitting `isCorrect` before timer expires).
- [x] Implement authoritative countdown timer on the server with automated timeout closure.
- [x] Handle answer submissions, validate against time, active question, and prevent duplicate submissions.
- [x] Pure scoring function: `score = maxPoints * (0.5 + 0.5 * remainingTime / totalTime)` clamped between 50% and 100% of max points for correct answers, 0 for incorrect.
- [x] 100% test coverage for scoring algorithm with Vitest.

### Phase 6: Results & Leaderboard (Complete)
- [x] Implement post-question stats view for Host with live answer count and distribution across options.
- [x] Implement Leaderboard calculation (ranked by total score, ties handled).
- [x] Finalize quiz and asynchronously persist session, participants, and answers to PostgreSQL via Prisma.
- [x] Implement Player view with instant feedback: correct/incorrect, points awarded, current rank, and correct answer reveal.

### Phase 7: Live Experience & Frontend Polish (Complete)
- [x] Host Live View (`/host/:quizId`): Lobby with giant PIN, player avatar pills, live countdown question screen, distribution charts, leaderboard, and podium with confetti.
- [x] Participant Live View (`/play`): Clean mobile-first PIN join screen, lobby waiting state, colorful touch-friendly option buttons, locked-in submission state, personal result screen, leaderboard, and game over screen.
- [x] Navigation & Access: Added "Join Game" button in Navbar and "Host Live 🚀" action on Dashboard cards and Quiz Editor readiness bar.
- [x] Zero-error verification: Full test suite passing (25/25 tests), 0 lint errors/warnings, production builds verified.

## Risks and Likely Technical Problems
1. **State Synchronization:** Handling race conditions if a player submits an answer exactly as the timer expires. *Mitigation: Server timestamps and strict authoritative rejection of late answers.*
2. **Reconnections:** Players briefly dropping connection during a live game and needing to reconnect without losing state. *Mitigation: Issue a session token/ID to players upon joining, allowing them to reconnect and receive current state.*
3. **Memory Leaks:** Storing live sessions in memory (Node.js) could leak if sessions aren't properly cleaned up after ending. *Mitigation: Implement timeouts for inactive sessions and strict cleanup on `end_quiz`.*
4. **Time Drift:** Client timers drifting from server timers. *Mitigation: Clients only display visual timers; server definitively controls the start/end timestamps and rejects late packets.*
5. **Data Exposure:** Accidentally sending the correct answer to the client before the question timer expires. *Mitigation: Strict view-models for socket payloads depending on the client's role and the current quiz state.*
