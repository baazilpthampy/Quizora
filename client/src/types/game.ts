export interface ClientOption {
  id: string;
  text: string;
  order: number;
}

export interface QuestionStartedData {
  questionIndex: number;
  totalQuestions: number;
  questionId: string;
  text: string;
  timeLimitSeconds: number;
  maxPoints: number;
  options: ClientOption[];
}

export interface QuestionClosedData {
  questionId: string;
  correctOptionId: string;
  optionStats: Record<string, number>;
  totalAnswers: number;
}

export interface PersonalResultData {
  isCorrect: boolean;
  pointsAwarded: number;
  totalScore: number;
  selectedOptionId: string | null;
  rank: number;
}

export interface LeaderboardEntry {
  id: string;
  displayName: string;
  totalScore: number;
  rank: number;
}

export interface LeaderboardData {
  leaderboard: LeaderboardEntry[];
  isLastQuestion: boolean;
  currentQuestionIndex: number;
  totalQuestions: number;
}

export interface QuizFinishedData {
  finalLeaderboard: LeaderboardEntry[];
  totalParticipants: number;
}

export interface JoinedPlayer {
  id: string;
  displayName: string;
}

export interface PlayerJoinedData {
  id: string;
  displayName: string;
  totalPlayers: number;
  players: JoinedPlayer[];
}
