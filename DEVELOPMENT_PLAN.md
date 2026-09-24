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
- Implement Teacher dashboard UI.
- Implement Quiz creation and editing interfaces.
- Implement Question builder with multiple choice options.
- Integrate frontend with the backend REST API.

### Phase 4: Core Real-time Engine (Socket.IO)
- Implement server-side in-memory session manager.
- Handle session creation (6-digit code generation).
- Handle player joining and Lobby state.
- Implement Host controls (start quiz, next question).
- Synchronize basic state between Host and Players.

### Phase 5: Gameplay & Scoring (Authoritative Server)
- Implement Question broadcasting to clients.
- Implement authoritative timer on the server.
- Handle answer submissions, validate against time and correct option.
- Calculate points based on correctness.
- Prevent duplicate answers and late submissions.

### Phase 6: Results & Leaderboard
- Implement post-question stats view for Host.
- Implement Leaderboard state and view.
- Finalize quiz and save historical results to PostgreSQL.
- Implement Player view for correct/incorrect feedback, points, and rank.

### Phase 7: Polish & E2E Testing
- End-to-end testing of live game flow with Playwright.
- Robust error handling (handling disconnects, reconnects).
- UI/UX polish (Tailwind).

## Risks and Likely Technical Problems
1. **State Synchronization:** Handling race conditions if a player submits an answer exactly as the timer expires. *Mitigation: Server timestamps and strict authoritative rejection of late answers.*
2. **Reconnections:** Players briefly dropping connection during a live game and needing to reconnect without losing state. *Mitigation: Issue a session token/ID to players upon joining, allowing them to reconnect and receive current state.*
3. **Memory Leaks:** Storing live sessions in memory (Node.js) could leak if sessions aren't properly cleaned up after ending. *Mitigation: Implement timeouts for inactive sessions and strict cleanup on `end_quiz`.*
4. **Time Drift:** Client timers drifting from server timers. *Mitigation: Clients only display visual timers; server definitively controls the start/end timestamps and rejects late packets.*
5. **Data Exposure:** Accidentally sending the correct answer to the client before the question timer expires. *Mitigation: Strict view-models for socket payloads depending on the client's role and the current quiz state.*
