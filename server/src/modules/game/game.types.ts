export type GameSessionStatus =
  'LOBBY' | 'QUESTION_ACTIVE' | 'QUESTION_CLOSED' | 'LEADERBOARD' | 'FINISHED';

export interface GameOption {
  id: string;
  text: string;
  order: number;
  isCorrect: boolean;
}

export interface ClientGameOption {
  id: string;
  text: string;
  order: number;
}

export interface GameQuestion {
  id: string;
  text: string;
  order: number;
  timeLimitSeconds: number;
  maxPoints: number;
  options: GameOption[];
}

export interface GameParticipant {
  id: string;
  displayName: string;
  socketId: string;
  totalScore: number;
  isConnected: boolean;
  joinedAt: number;
}

export interface PlayerSubmission {
  optionId: string;
  isCorrect: boolean;
  pointsAwarded: number;
  timeElapsedSeconds: number;
  submittedAt: number;
}

export interface ActiveQuestionState {
  questionId: string;
  startedAt: number;
  timeLimitSeconds: number;
  timerTimeout?: NodeJS.Timeout;
  submissions: Map<string, PlayerSubmission>; // participantId -> PlayerSubmission
}

export interface ActiveSession {
  sessionId: string;
  joinCode: string;
  quizId: string;
  quizTitle: string;
  hostSocketId: string;
  status: GameSessionStatus;
  currentQuestionIndex: number;
  questions: GameQuestion[];
  participants: Map<string, GameParticipant>; // participantId -> GameParticipant
  activeQuestion: ActiveQuestionState | null;
  createdAt: number;
}

export interface LeaderboardEntry {
  id: string;
  displayName: string;
  totalScore: number;
  rank: number;
}
