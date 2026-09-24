import http from 'http';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { io as ioc, type Socket as ClientSocket } from 'socket.io-client';
import { app } from '../../../app';
import { initSocketServer } from '../game.socket';
import { prisma } from '../../../lib/prisma';
import type { ClientGameOption, LeaderboardEntry } from '../game.types';

const DEMO_USER_ID = '51e8fa5e-ba31-4ccd-b9ea-f9c2ccbacfae';

interface SessionCreatedResponse {
  success: boolean;
  data: {
    sessionId: string;
    joinCode: string;
    quizTitle: string;
    totalQuestions: number;
  };
}

interface PlayerJoinResponse {
  success: boolean;
  data: {
    participantId: string;
    displayName: string;
    joinCode: string;
  };
}

interface QuestionStartedPayload {
  questionIndex: number;
  totalQuestions: number;
  questionId: string;
  text: string;
  timeLimitSeconds: number;
  maxPoints: number;
  options: ClientGameOption[];
}

interface QuestionClosedPayload {
  questionId: string;
  correctOptionId: string;
  optionStats: Record<string, number>;
  totalAnswers: number;
}

interface PersonalResultPayload {
  isCorrect: boolean;
  pointsAwarded: number;
  totalScore: number;
  selectedOptionId: string | null;
  rank: number;
}

interface LeaderboardPayload {
  leaderboard: LeaderboardEntry[];
  isLastQuestion: boolean;
}

interface QuizFinishedPayload {
  finalLeaderboard: LeaderboardEntry[];
  totalParticipants: number;
}

describe('Real-time Live Game Engine (Socket.IO)', () => {
  let server: http.Server;
  let serverPort: number;
  let testQuizId: string;
  let testCorrectOptionId: string;
  let hostSocket: ClientSocket;
  let playerSocket: ClientSocket;

  beforeAll(async () => {
    // 1. Ensure test quiz in database with 1 question and 2 options
    const quiz = await prisma.quiz.create({
      data: {
        title: 'Real-time Test Quiz',
        description: 'Testing live gameplay socket synchronization',
        ownerId: DEMO_USER_ID,
        questions: {
          create: [
            {
              text: 'What is 2 + 2?',
              order: 1,
              timeLimitSeconds: 10,
              maxPoints: 1000,
              options: {
                create: [
                  { text: '4', order: 1, isCorrect: true },
                  { text: '5', order: 2, isCorrect: false },
                ],
              },
            },
          ],
        },
      },
      include: {
        questions: {
          include: {
            options: true,
          },
        },
      },
    });

    testQuizId = quiz.id;
    const correctOpt = quiz.questions[0].options.find((o) => o.isCorrect);
    testCorrectOptionId = correctOpt!.id;

    // 2. Start HTTP & Socket.IO server on dynamic port
    server = http.createServer(app);
    initSocketServer(server);

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        if (typeof addr === 'object' && addr !== null) {
          serverPort = addr.port;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (hostSocket?.connected) hostSocket.disconnect();
    if (playerSocket?.connected) playerSocket.disconnect();

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });

    // Cleanup quiz
    await prisma.quiz.deleteMany({ where: { id: testQuizId } });
  });

  it('executes full live game loop from lobby to final podium', async () => {
    const serverUrl = `http://localhost:${serverPort}`;

    // Step 1: Connect host
    hostSocket = ioc(serverUrl, { transports: ['websocket'] });
    hostSocket.on('session:error', (err) => console.error('Host error:', err));

    await new Promise<void>((resolve) => {
      hostSocket.on('connect', () => resolve());
    });

    // Step 2: Host creates session
    let joinCode = '';
    await new Promise<void>((resolve) => {
      hostSocket.emit(
        'host:create_session',
        { quizId: testQuizId, hostUserId: DEMO_USER_ID },
        (res: SessionCreatedResponse) => {
          expect(res.success).toBe(true);
          expect(res.data.joinCode).toMatch(/^\d{6}$/);
          joinCode = res.data.joinCode;
          resolve();
        }
      );
    });

    expect(joinCode).toHaveLength(6);

    // Step 3: Player connects and joins session
    playerSocket = ioc(serverUrl, { transports: ['websocket'] });
    playerSocket.on('session:error', (err) => console.error('Player error:', err));

    await new Promise<void>((resolve) => {
      playerSocket.on('connect', () => resolve());
    });

    let participantId = '';
    await new Promise<void>((resolve) => {
      playerSocket.emit(
        'player:join_session',
        { joinCode, displayName: 'Alice' },
        (res: PlayerJoinResponse) => {
          expect(res.success).toBe(true);
          expect(res.data.displayName).toBe('Alice');
          expect(res.data.joinCode).toBe(joinCode);
          participantId = res.data.participantId;
          resolve();
        }
      );
    });

    expect(participantId).toBeTruthy();

    // Step 4: Host starts quiz (moves to question 1)
    const questionStartedPromise = new Promise<QuestionStartedPayload>((resolve) => {
      playerSocket.on('shared:question_started', (data: QuestionStartedPayload) => {
        resolve(data);
      });
    });

    hostSocket.emit('host:next_question', { joinCode });
    const questionData = await questionStartedPromise;

    expect(questionData.text).toBe('What is 2 + 2?');
    expect(questionData.options).toHaveLength(2);
    // Crucial security check: options sent to player must NEVER contain isCorrect
    for (const opt of questionData.options) {
      expect(opt).not.toHaveProperty('isCorrect');
    }

    // Step 5: Setup closure promises BEFORE submitting answer (since all players answering triggers auto-close)
    const questionClosedPromise = new Promise<QuestionClosedPayload>((resolve) => {
      hostSocket.on('shared:question_closed', (data: QuestionClosedPayload) => {
        resolve(data);
      });
    });

    const personalResultPromise = new Promise<PersonalResultPayload>((resolve) => {
      playerSocket.on('player:personal_result', (data: PersonalResultPayload) => {
        resolve(data);
      });
    });

    // Player submits correct answer
    await new Promise<void>((resolve) => {
      playerSocket.emit(
        'player:submit_answer',
        {
          joinCode,
          participantId,
          questionId: questionData.questionId,
          optionId: testCorrectOptionId,
        },
        (res: { success: boolean }) => {
          expect(res.success).toBe(true);
          resolve();
        }
      );
    });

    // Step 6: Verify question closed and personal result received
    const [closedData, personalResult] = await Promise.all([
      questionClosedPromise,
      personalResultPromise,
    ]);

    expect(closedData.correctOptionId).toBe(testCorrectOptionId);
    expect(closedData.totalAnswers).toBe(1);
    expect(closedData.optionStats[testCorrectOptionId]).toBe(1);

    expect(personalResult.isCorrect).toBe(true);
    expect(personalResult.pointsAwarded).toBeGreaterThanOrEqual(500);
    expect(personalResult.pointsAwarded).toBeLessThanOrEqual(1000);
    expect(personalResult.rank).toBe(1);

    // Step 7: Host shows leaderboard
    const leaderboardPromise = new Promise<LeaderboardPayload>((resolve) => {
      playerSocket.on('shared:leaderboard_updated', (data: LeaderboardPayload) => {
        resolve(data);
      });
    });

    hostSocket.emit('host:show_leaderboard', { joinCode });
    const lbData = await leaderboardPromise;
    expect(lbData.leaderboard).toHaveLength(1);
    expect(lbData.leaderboard[0].displayName).toBe('Alice');
    expect(lbData.leaderboard[0].totalScore).toBe(personalResult.pointsAwarded);
    expect(lbData.isLastQuestion).toBe(true);

    // Step 8: Host finishes quiz
    const finishPromise = new Promise<QuizFinishedPayload>((resolve) => {
      playerSocket.on('shared:quiz_finished', (data: QuizFinishedPayload) => {
        resolve(data);
      });
    });

    hostSocket.emit('host:end_quiz', { joinCode });
    const finalData = await finishPromise;
    expect(finalData.finalLeaderboard).toHaveLength(1);
    expect(finalData.finalLeaderboard[0].displayName).toBe('Alice');
  });
});
