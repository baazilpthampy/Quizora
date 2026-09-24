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
