import type { Server as HTTPServer } from 'http';
import { Server, Socket } from 'socket.io';
import { prisma } from '../../lib/prisma';
import { sessionManager } from './session.manager';
import { calculateScore } from './scoring';
import type { GameQuestion, ClientGameOption, ActiveSession } from './game.types';

export function initSocketServer(httpServer: HTTPServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: '*', // Allow connections from frontend dev and production origins
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    // ========================================================
    // HOST ACTIONS
    // ========================================================

    /**
     * Host creates a new live session for a given quiz.
     */
    socket.on(
      'host:create_session',
      async (
        payload: { quizId: string; hostUserId: string },
        callback?: (res: { success: boolean; data?: unknown; error?: string }) => void
      ) => {
        try {
          const { quizId, hostUserId } = payload;
          if (!quizId || !hostUserId) {
            socket.emit('session:error', { message: 'Invalid quiz or user ID.' });
            return;
          }

          // Fetch quiz definition and questions from database
          const quiz = await prisma.quiz.findFirst({
            where: { id: quizId, ownerId: hostUserId },
            include: {
              questions: {
                orderBy: { order: 'asc' },
                include: {
                  options: {
                    orderBy: { order: 'asc' },
                  },
                },
              },
            },
          });

          if (!quiz) {
            socket.emit('session:error', {
              message: 'Quiz not found or you do not have permission to host it.',
            });
            return;
          }

          if (quiz.questions.length === 0) {
            socket.emit('session:error', {
              message: 'Cannot host an empty quiz. Please add questions first.',
            });
            return;
          }

          // Verify every question has at least 2 options and 1 marked correct
          const invalidQuestions = quiz.questions.filter(
            (q) => q.options.length < 2 || !q.options.some((o) => o.isCorrect)
          );
          if (invalidQuestions.length > 0) {
            socket.emit('session:error', {
              message:
                'Every question must have at least 2 options and a marked correct answer before hosting.',
            });
            return;
          }

          const joinCode = sessionManager.generateUniqueJoinCode();

          // Create database session record
          const dbSession = await prisma.quizSession.create({
            data: {
              quizId: quiz.id,
              joinCode,
              status: 'LOBBY',
            },
          });

          const questions: GameQuestion[] = quiz.questions.map((q) => ({
            id: q.id,
            text: q.text,
            order: q.order,
            timeLimitSeconds: q.timeLimitSeconds,
            maxPoints: q.maxPoints,
            options: q.options.map((o) => ({
              id: o.id,
              text: o.text,
              order: o.order,
              isCorrect: o.isCorrect,
            })),
          }));

          const activeSession = sessionManager.createSession(
            dbSession.id,
            joinCode,
            quiz.id,
            quiz.title,
            socket.id,
            questions
          );

          await socket.join(`session:${joinCode}`);
          await socket.join(`host:${joinCode}`);

          const responseData = {
            sessionId: activeSession.sessionId,
            joinCode: activeSession.joinCode,
            quizTitle: activeSession.quizTitle,
            totalQuestions: activeSession.questions.length,
          };

          socket.emit('host:session_created', responseData);
          if (callback) callback({ success: true, data: responseData });
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : 'Unknown error';
          console.error('Error in host:create_session:', err);
          socket.emit('session:error', { message: 'Failed to create live quiz session.' });
          if (callback) callback({ success: false, error: errMsg });
        }
      }
    );

    /**
     * Host starts the quiz or moves to the next question.
     */
    socket.on('host:next_question', (payload: { joinCode: string }) => {
      const session = sessionManager.getSessionByCode(payload.joinCode);
      if (!session || session.hostSocketId !== socket.id) {
        socket.emit('session:error', { message: 'Unauthorized or session not found.' });
        return;
      }

      session.currentQuestionIndex++;

      // Check if all questions are finished
      if (session.currentQuestionIndex >= session.questions.length) {
        finishQuiz(io, session);
        return;
      }

      startQuestion(io, session);
    });

    /**
     * Host ends current question early before timer expires.
     */
    socket.on('host:end_question_early', (payload: { joinCode: string }) => {
      const session = sessionManager.getSessionByCode(payload.joinCode);
      if (!session || session.hostSocketId !== socket.id) {
        socket.emit('session:error', { message: 'Unauthorized or session not found.' });
        return;
      }

      if (session.status === 'QUESTION_ACTIVE' && session.activeQuestion) {
        closeQuestion(io, session);
      }
    });

    /**
     * Host requests to show the leaderboard.
     */
    socket.on('host:show_leaderboard', (payload: { joinCode: string }) => {
      const session = sessionManager.getSessionByCode(payload.joinCode);
      if (!session || session.hostSocketId !== socket.id) {
        socket.emit('session:error', { message: 'Unauthorized or session not found.' });
        return;
      }

      session.status = 'LEADERBOARD';
      const leaderboard = sessionManager.getLeaderboard(session);
      const isLastQuestion = session.currentQuestionIndex >= session.questions.length - 1;

      io.to(`session:${session.joinCode}`).emit('shared:leaderboard_updated', {
        leaderboard,
        isLastQuestion,
        currentQuestionIndex: session.currentQuestionIndex,
        totalQuestions: session.questions.length,
      });
    });

    /**
     * Host finishes the quiz.
     */
    socket.on('host:end_quiz', (payload: { joinCode: string }) => {
      const session = sessionManager.getSessionByCode(payload.joinCode);
      if (!session || session.hostSocketId !== socket.id) {
        socket.emit('session:error', { message: 'Unauthorized or session not found.' });
        return;
      }

      finishQuiz(io, session);
    });

    // ========================================================
    // PLAYER ACTIONS
    // ========================================================

    /**
     * Player joins a session with PIN and Nickname.
     */
    socket.on(
      'player:join_session',
      async (
        payload: { joinCode: string; displayName: string },
        callback?: (res: { success: boolean; data?: unknown; message?: string }) => void
      ) => {
        try {
          const { joinCode, displayName } = payload;
          if (!joinCode || !displayName || !displayName.trim()) {
            socket.emit('session:error', { message: 'Join PIN and Nickname are required.' });
            if (callback) callback({ success: false, message: 'Invalid PIN or nickname.' });
            return;
          }

          const trimmedCode = joinCode.trim();
          const trimmedName = displayName.trim();

          if (trimmedName.length > 20) {
            socket.emit('session:error', { message: 'Nickname cannot exceed 20 characters.' });
            if (callback) callback({ success: false, message: 'Nickname too long.' });
            return;
          }

          const session = sessionManager.getSessionByCode(trimmedCode);
          if (!session) {
            socket.emit('session:error', {
              message: 'Game PIN not found. Please check the code and try again.',
            });
            if (callback) callback({ success: false, message: 'Game PIN not found.' });
            return;
          }

          if (session.status !== 'LOBBY') {
            // Check if reconnecting player
            let existingPlayer = false;
            for (const p of session.participants.values()) {
              if (p.displayName.toLowerCase() === trimmedName.toLowerCase()) {
                existingPlayer = true;
                break;
              }
            }
            if (!existingPlayer) {
              socket.emit('session:error', {
                message: 'This quiz has already started. New players cannot join.',
              });
              if (callback) callback({ success: false, message: 'Quiz already in progress.' });
              return;
            }
          }

          const participant = sessionManager.addParticipant(session, trimmedName, socket.id);
          await socket.join(`session:${trimmedCode}`);

          const joinData = {
            participantId: participant.id,
            displayName: participant.displayName,
            joinCode: session.joinCode,
            quizTitle: session.quizTitle,
            status: session.status,
            totalScore: participant.totalScore,
          };

          socket.emit('player:joined_successfully', joinData);
          if (callback) callback({ success: true, data: joinData });

          // Notify room of player list update
          const playerList = Array.from(session.participants.values()).map((p) => ({
            id: p.id,
            displayName: p.displayName,
          }));

          io.to(`session:${session.joinCode}`).emit('session:player_joined', {
            id: participant.id,
            displayName: participant.displayName,
            totalPlayers: session.participants.size,
            players: playerList,
          });
        } catch (err: unknown) {
          console.error('Error in player:join_session:', err);
          socket.emit('session:error', { message: 'Failed to join game session.' });
          if (callback) callback({ success: false, message: 'Failed to join session.' });
        }
      }
    );

    /**
     * Player submits an answer for the active question.
     */
    socket.on(
      'player:submit_answer',
      (
        payload: {
          joinCode: string;
          participantId: string;
          questionId: string;
          optionId: string;
        },
        callback?: (res: { success: boolean; optionId?: string; message?: string }) => void
      ) => {
        try {
          const { joinCode, participantId, questionId, optionId } = payload;
          const session = sessionManager.getSessionByCode(joinCode);

          if (!session || session.status !== 'QUESTION_ACTIVE' || !session.activeQuestion) {
            socket.emit('session:error', {
              message: 'No question is currently accepting answers.',
            });
            if (callback) callback({ success: false, message: 'Question not active.' });
            return;
          }

          const activeQ = session.activeQuestion;
          if (activeQ.questionId !== questionId) {
            socket.emit('session:error', { message: 'Submitted answer for an inactive question.' });
            return;
          }

          const participant = session.participants.get(participantId);
          if (!participant) {
            socket.emit('session:error', {
              message: 'Participant not recognized in this session.',
            });
            return;
          }

          // Prevent duplicate answers
          if (activeQ.submissions.has(participantId)) {
            socket.emit('session:error', { message: 'You have already submitted an answer.' });
            return;
          }

          // Authoritative server timer calculation
          const now = Date.now();
          const timeElapsedSeconds = (now - activeQ.startedAt) / 1000;

          // Find current question and option from authoritative server data
          const currentQ = session.questions[session.currentQuestionIndex];
          const selectedOption = currentQ.options.find((o) => o.id === optionId);
          const isCorrect = selectedOption?.isCorrect ?? false;

          const pointsAwarded = calculateScore(
            currentQ.maxPoints,
            activeQ.timeLimitSeconds,
            timeElapsedSeconds,
            isCorrect
          );

          participant.totalScore += pointsAwarded;

          activeQ.submissions.set(participantId, {
            optionId,
            isCorrect,
            pointsAwarded,
            timeElapsedSeconds,
            submittedAt: now,
          });

          // Confirm receipt to player
          socket.emit('player:answer_recorded', {
            optionId,
            timeElapsedSeconds,
          });
          if (callback) callback({ success: true, optionId });

          // Inform host of updated answer count
          io.to(`host:${session.joinCode}`).emit('host:answer_count_updated', {
            answersCount: activeQ.submissions.size,
            totalParticipants: session.participants.size,
          });

          // If all joined players answered, end question early
          if (activeQ.submissions.size >= session.participants.size) {
            closeQuestion(io, session);
          }
        } catch (err: unknown) {
          console.error('Error in player:submit_answer:', err);
          socket.emit('session:error', { message: 'Failed to process answer.' });
        }
      }
    );

    // ========================================================
    // DISCONNECT HANDLING
    // ========================================================

    socket.on('disconnect', () => {
      // 1. Check if host disconnected
      const hostSession = sessionManager.getSessionByHostSocket(socket.id);
      if (hostSession) {
        io.to(`session:${hostSession.joinCode}`).emit('session:host_disconnected', {
          message: 'The host has disconnected. Please wait for reconnection.',
        });
      }

      // 2. Check if player disconnected
      const playerCtx = sessionManager.handleParticipantDisconnect(socket.id);
      if (playerCtx) {
        io.to(`session:${playerCtx.session.joinCode}`).emit('session:player_left', {
          id: playerCtx.participant.id,
          displayName: playerCtx.participant.displayName,
          totalPlayers: playerCtx.session.participants.size,
        });
      }
    });
  });

  return io;
}

/**
 * Starts a question, broadcasting sanitized details (WITHOUT isCorrect) to clients.
 */
function startQuestion(io: Server, session: ActiveSession): void {
  const currentQ: GameQuestion = session.questions[session.currentQuestionIndex];
  session.status = 'QUESTION_ACTIVE';

  // Sanitized options: NEVER leak isCorrect to clients during active question!
  const clientOptions: ClientGameOption[] = currentQ.options.map((o) => ({
    id: o.id,
    text: o.text,
    order: o.order,
  }));

  const activeQuestionState = {
    questionId: currentQ.id,
    startedAt: Date.now(),
    timeLimitSeconds: currentQ.timeLimitSeconds,
    timerTimeout: undefined as NodeJS.Timeout | undefined,
    submissions: new Map(),
  };

  session.activeQuestion = activeQuestionState;

  // Broadcast question to all participants and host
  io.to(`session:${session.joinCode}`).emit('shared:question_started', {
    questionIndex: session.currentQuestionIndex,
    totalQuestions: session.questions.length,
    questionId: currentQ.id,
    text: currentQ.text,
    timeLimitSeconds: currentQ.timeLimitSeconds,
    maxPoints: currentQ.maxPoints,
    options: clientOptions,
  });

  // Schedule authoritative server timeout
  activeQuestionState.timerTimeout = setTimeout(() => {
    if (
      session.status === 'QUESTION_ACTIVE' &&
      session.activeQuestion?.questionId === currentQ.id
    ) {
      closeQuestion(io, session);
    }
  }, currentQ.timeLimitSeconds * 1000);
}

/**
 * Closes the active question, reveals the correct option, and sends personal score feedback.
 */
function closeQuestion(io: Server, session: ActiveSession): void {
  if (session.activeQuestion?.timerTimeout) {
    clearTimeout(session.activeQuestion.timerTimeout);
    session.activeQuestion.timerTimeout = undefined;
  }

  session.status = 'QUESTION_CLOSED';
  const currentQ: GameQuestion = session.questions[session.currentQuestionIndex];
  const correctOption = currentQ.options.find((o) => o.isCorrect);

  // Compute option distribution statistics
  const optionStats: Record<string, number> = {};
  for (const opt of currentQ.options) {
    optionStats[opt.id] = 0;
  }

  const submissions = session.activeQuestion?.submissions || new Map();
  for (const sub of submissions.values()) {
    if (optionStats[sub.optionId] !== undefined) {
      optionStats[sub.optionId]++;
    }
  }

  // Broadcast question closure with stats to room
  io.to(`session:${session.joinCode}`).emit('shared:question_closed', {
    questionId: currentQ.id,
    correctOptionId: correctOption?.id || '',
    optionStats,
    totalAnswers: submissions.size,
  });

  // Calculate ranks for personal feedback
  const leaderboard = sessionManager.getLeaderboard(session);
  const rankMap = new Map<string, number>();
  leaderboard.forEach((entry) => rankMap.set(entry.id, entry.rank));

  // Send individual result to each participant socket
  for (const participant of session.participants.values()) {
    const sub = submissions.get(participant.id);
    const resultData = {
      isCorrect: sub?.isCorrect ?? false,
      pointsAwarded: sub?.pointsAwarded ?? 0,
      totalScore: participant.totalScore,
      selectedOptionId: sub?.optionId || null,
      rank: rankMap.get(participant.id) || 1,
    };

    io.to(participant.socketId).emit('player:personal_result', resultData);
  }
}

/**
 * Finishes the quiz session, presents final podium, and persists results.
 */
function finishQuiz(io: Server, session: ActiveSession): void {
  session.status = 'FINISHED';
  const finalLeaderboard = sessionManager.getLeaderboard(session);

  io.to(`session:${session.joinCode}`).emit('shared:quiz_finished', {
    finalLeaderboard,
    totalParticipants: session.participants.size,
  });

  // Asynchronously finalize and clean up in-memory session after delay
  setTimeout(() => {
    sessionManager.finalizeAndCleanSession(session.joinCode).catch(console.error);
  }, 10000);
}
