import { prisma } from '../../lib/prisma';
import type { ActiveSession, GameQuestion, GameParticipant, LeaderboardEntry } from './game.types';

class SessionManager {
  // Primary lookup maps
  private sessionsByCode = new Map<string, ActiveSession>();
  private sessionsById = new Map<string, ActiveSession>();
  private playerSocketToSession = new Map<string, { joinCode: string; participantId: string }>();
  private hostSocketToSession = new Map<string, string>(); // hostSocketId -> joinCode

  /**
   * Generates a random 6-digit numeric join code that does not conflict with active sessions.
   */
  public generateUniqueJoinCode(): string {
    let code: string;
    let attempts = 0;
    do {
      code = Math.floor(100000 + Math.random() * 900000).toString();
      attempts++;
      if (attempts > 500) {
        throw new Error('Unable to generate a unique join code. Server capacity full.');
      }
    } while (this.sessionsByCode.has(code));
    return code;
  }

  /**
   * Creates an in-memory active session from loaded quiz data.
   */
  public createSession(
    sessionId: string,
    joinCode: string,
    quizId: string,
    quizTitle: string,
    hostSocketId: string,
    questions: GameQuestion[]
  ): ActiveSession {
    const session: ActiveSession = {
      sessionId,
      joinCode,
      quizId,
      quizTitle,
      hostSocketId,
      status: 'LOBBY',
      currentQuestionIndex: -1,
      questions,
      participants: new Map<string, GameParticipant>(),
      activeQuestion: null,
      createdAt: Date.now(),
    };

    this.sessionsByCode.set(joinCode, session);
    this.sessionsById.set(sessionId, session);
    this.hostSocketToSession.set(hostSocketId, joinCode);

    return session;
  }

  public getSessionByCode(joinCode: string): ActiveSession | undefined {
    return this.sessionsByCode.get(joinCode);
  }

  public getSessionById(sessionId: string): ActiveSession | undefined {
    return this.sessionsById.get(sessionId);
  }

  public getSessionByHostSocket(hostSocketId: string): ActiveSession | undefined {
    const code = this.hostSocketToSession.get(hostSocketId);
    return code ? this.sessionsByCode.get(code) : undefined;
  }

  public getPlayerContextBySocket(
    socketId: string
  ): { session: ActiveSession; participant: GameParticipant } | undefined {
    const ctx = this.playerSocketToSession.get(socketId);
    if (!ctx) return undefined;

    const session = this.sessionsByCode.get(ctx.joinCode);
    if (!session) return undefined;

    const participant = session.participants.get(ctx.participantId);
    if (!participant) return undefined;

    return { session, participant };
  }

  /**
   * Registers a participant joining the session.
   * If a participant with the same displayName exists and was disconnected, reconnects them.
   */
  public addParticipant(
    session: ActiveSession,
    displayName: string,
    socketId: string
  ): GameParticipant {
    const trimmedName = displayName.trim();

    // Check for existing disconnected participant to allow reconnects
    for (const p of session.participants.values()) {
      if (p.displayName.toLowerCase() === trimmedName.toLowerCase()) {
        // Update socket ID and connection status
        this.playerSocketToSession.delete(p.socketId);
        p.socketId = socketId;
        p.isConnected = true;
        this.playerSocketToSession.set(socketId, {
          joinCode: session.joinCode,
          participantId: p.id,
        });
        return p;
      }
    }

    const participantId = crypto.randomUUID();
    const newParticipant: GameParticipant = {
      id: participantId,
      displayName: trimmedName,
      socketId,
      totalScore: 0,
      isConnected: true,
      joinedAt: Date.now(),
    };

    session.participants.set(participantId, newParticipant);
    this.playerSocketToSession.set(socketId, {
      joinCode: session.joinCode,
      participantId,
    });

    return newParticipant;
  }

  /**
   * Handles participant socket disconnection.
   */
  public handleParticipantDisconnect(
    socketId: string
  ): { session: ActiveSession; participant: GameParticipant } | undefined {
    const ctx = this.getPlayerContextBySocket(socketId);
    if (!ctx) return undefined;

    ctx.participant.isConnected = false;
    this.playerSocketToSession.delete(socketId);
    return ctx;
  }

  /**
   * Computes the current sorted leaderboard for the session.
   */
  public getLeaderboard(session: ActiveSession): LeaderboardEntry[] {
    const sorted = Array.from(session.participants.values()).sort(
      (a, b) => b.totalScore - a.totalScore
    );

    return sorted.map((p, idx) => ({
      id: p.id,
      displayName: p.displayName,
      totalScore: p.totalScore,
      rank: idx + 1,
    }));
  }

  /**
   * Cleans up an active session and asynchronously saves final results to PostgreSQL.
   */
  public async finalizeAndCleanSession(joinCode: string): Promise<void> {
    const session = this.sessionsByCode.get(joinCode);
    if (!session) return;

    if (session.activeQuestion?.timerTimeout) {
      clearTimeout(session.activeQuestion.timerTimeout);
    }

    // Persist final session stats to database asynchronously
    try {
      await prisma.quizSession.update({
        where: { id: session.sessionId },
        data: {
          status: 'FINISHED',
          endedAt: new Date(),
          participants: {
            create: Array.from(session.participants.values()).map((p) => ({
              id: p.id,
              displayName: p.displayName,
              sessionTokenHash: p.id, // using participant UUID as hash
              totalScore: p.totalScore,
            })),
          },
        },
      });
    } catch (err) {
      console.error(`Failed to persist session ${session.sessionId} to database:`, err);
    }

    // Clean up memory maps
    this.hostSocketToSession.delete(session.hostSocketId);
    for (const p of session.participants.values()) {
      this.playerSocketToSession.delete(p.socketId);
    }
    this.sessionsById.delete(session.sessionId);
    this.sessionsByCode.delete(joinCode);
  }
}

export const sessionManager = new SessionManager();
