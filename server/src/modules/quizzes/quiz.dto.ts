import { Quiz, Question, QuestionOption } from '@prisma/client';

export interface OptionOwnerDto {
  id: string;
  questionId: string;
  text: string;
  order: number;
  isCorrect: boolean;
  createdAt: Date;
}

export interface QuestionOwnerDto {
  id: string;
  quizId: string;
  text: string;
  order: number;
  timeLimitSeconds: number;
  maxPoints: number;
  createdAt: Date;
  updatedAt: Date;
  options: OptionOwnerDto[];
}

export interface QuizDetailOwnerDto {
  id: string;
  title: string;
  description: string | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  questions: QuestionOwnerDto[];
}

export interface QuizSummaryDto {
  id: string;
  title: string;
  description: string | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
}

export function toOptionOwnerDto(option: QuestionOption): OptionOwnerDto {
  return {
    id: option.id,
    questionId: option.questionId,
    text: option.text,
    order: option.order,
    isCorrect: option.isCorrect,
    createdAt: option.createdAt,
  };
}

export function toQuestionOwnerDto(
  question: Question & { options?: QuestionOption[] }
): QuestionOwnerDto {
  return {
    id: question.id,
    quizId: question.quizId,
    text: question.text,
    order: question.order,
    timeLimitSeconds: question.timeLimitSeconds,
    maxPoints: question.maxPoints,
    createdAt: question.createdAt,
    updatedAt: question.updatedAt,
    options: (question.options || []).map(toOptionOwnerDto),
  };
}

export function toQuizSummaryDto(quiz: Quiz): QuizSummaryDto {
  return {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    ownerId: quiz.ownerId,
    createdAt: quiz.createdAt,
    updatedAt: quiz.updatedAt,
  };
}

export function toQuizDetailOwnerDto(
  quiz: Quiz & {
    questions: (Question & { options: QuestionOption[] })[];
  }
): QuizDetailOwnerDto {
  return {
    id: quiz.id,
    title: quiz.title,
    description: quiz.description,
    ownerId: quiz.ownerId,
    createdAt: quiz.createdAt,
    updatedAt: quiz.updatedAt,
    questions: quiz.questions.map(toQuestionOwnerDto),
  };
}
