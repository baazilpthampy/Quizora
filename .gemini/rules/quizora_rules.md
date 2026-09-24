# Quizora Antigravity Rules

- **TypeScript Strict Mode:** Enforce strict type checking across all files. Do not use `any`.
- **Clean Architecture:** Maintain a clear separation of concerns. Keep route handlers thin; move business logic to services.
- **Small Modular Components:** Break down React components and backend functions into small, testable, and reusable pieces.
- **No Unnecessary Dependencies:** Evaluate thoroughly before adding new npm packages. Prefer built-in solutions or lightweight alternatives.
- **Server-Authoritative Scoring:** Never trust the client for timers, correct answers, or scores. The server holds the single source of truth for the live game state.
- **Input Validation:** All incoming data (REST and WebSocket) must be validated using Zod before processing.
- **Secure Data Handling:** Never send correct answers to the participant client before the question ends. Do not expose teacher data or other participants' private data.
- **No Hard-Coded Secrets:** All secrets and environment-specific configs must be loaded via Environment Variables.
- **Database Migrations:** All database schema changes must be done via Prisma migrations. Do not modify the database directly.
- **Meaningful Error Handling:** Catch and handle errors gracefully. Return appropriate HTTP status codes and descriptive error messages. Do not crash the Node.js process.
- **Testing:** Critical functionality, especially scoring and state transitions, must have Vitest tests. Use Playwright for core gameplay flow.
- **Existing Code:** Always inspect existing code before modifying it. Do not rewrite working code unnecessarily.
