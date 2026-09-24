export interface OptionDetail {
  id: string;
  questionId: string;
  text: string;
  order: number;
  isCorrect: boolean;
  createdAt: string;
}

export interface QuestionDetail {
  id: string;
  quizId: string;
  text: string;
  order: number;
  timeLimitSeconds: number;
  maxPoints: number;
  createdAt: string;
  updatedAt: string;
  options: OptionDetail[];
}

export interface QuizSummary {
  id: string;
  title: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  questionCount?: number;
}

export interface QuizDetail {
  id: string;
  title: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  questions: QuestionDetail[];
}

export interface CreateQuizDto {
  title: string;
  description?: string;
}

export interface UpdateQuizDto {
  title?: string;
  description?: string | null;
}

export interface CreateQuestionDto {
  text: string;
  order: number;
  timeLimitSeconds: number;
  maxPoints: number;
}

export interface UpdateQuestionDto {
  text?: string;
  order?: number;
  timeLimitSeconds?: number;
  maxPoints?: number;
}

export interface CreateOptionDto {
  text: string;
  order: number;
  isCorrect: boolean;
}

export interface UpdateOptionDto {
  text?: string;
  order?: number;
  isCorrect?: boolean;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}
