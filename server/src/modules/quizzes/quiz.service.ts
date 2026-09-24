import { prisma } from '../../lib/prisma';
import {
  CreateQuizInput,
  UpdateQuizInput,
  CreateQuestionInput,
  UpdateQuestionInput,
  CreateOptionInput,
  UpdateOptionInput,
} from './quiz.types';
import {
  QuizSummaryDto,
  QuizDetailOwnerDto,
  QuestionOwnerDto,
  OptionOwnerDto,
  toQuizSummaryDto,
  toQuizDetailOwnerDto,
  toQuestionOwnerDto,
  toOptionOwnerDto,
} from './quiz.dto';
import { NotFoundError, ForbiddenError, ConflictError } from '../../utils/errors';
import { Prisma } from '@prisma/client';

export class QuizService {
  // =================== QUIZZES ===================

  async createQuiz(ownerId: string, input: CreateQuizInput): Promise<QuizSummaryDto> {
    const quiz = await prisma.quiz.create({
      data: {
        title: input.title,
        description: input.description,
        ownerId,
      },
    });

    return toQuizSummaryDto(quiz);
  }

  async listQuizzes(ownerId: string): Promise<QuizSummaryDto[]> {
    const quizzes = await prisma.quiz.findMany({
      where: { ownerId },
      orderBy: { createdAt: 'desc' },
    });

    return quizzes.map(toQuizSummaryDto);
  }

  async getQuizById(id: string, ownerId: string): Promise<QuizDetailOwnerDto> {
    const quiz = await prisma.quiz.findUnique({
      where: { id },
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
      throw new NotFoundError('Quiz not found');
    }

    if (quiz.ownerId !== ownerId) {
      throw new ForbiddenError('You do not have permission to view this quiz');
    }

    return toQuizDetailOwnerDto(quiz);
  }

  async updateQuiz(id: string, ownerId: string, input: UpdateQuizInput): Promise<QuizSummaryDto> {
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!quiz) {
      throw new NotFoundError('Quiz not found');
    }

    if (quiz.ownerId !== ownerId) {
      throw new ForbiddenError('You do not have permission to update this quiz');
    }

    const updated = await prisma.quiz.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
      },
    });

    return toQuizSummaryDto(updated);
  }

  async deleteQuiz(id: string, ownerId: string): Promise<void> {
    const quiz = await prisma.quiz.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!quiz) {
      throw new NotFoundError('Quiz not found');
    }

    if (quiz.ownerId !== ownerId) {
      throw new ForbiddenError('You do not have permission to delete this quiz');
    }

    try {
      await prisma.quiz.delete({
        where: { id },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new ConflictError(
          'Cannot delete quiz because dependent records exist in the database'
        );
      }
      throw error;
    }
  }

  // =================== QUESTIONS ===================

  async addQuestion(
    quizId: string,
    ownerId: string,
    input: CreateQuestionInput
  ): Promise<QuestionOwnerDto> {
    const quiz = await prisma.quiz.findUnique({
      where: { id: quizId },
      select: { ownerId: true },
    });

    if (!quiz) {
      throw new NotFoundError('Quiz not found');
    }

    if (quiz.ownerId !== ownerId) {
      throw new ForbiddenError('You do not have permission to add questions to this quiz');
    }

    try {
      const question = await prisma.question.create({
        data: {
          quizId,
          text: input.text,
          order: input.order,
          timeLimitSeconds: input.timeLimitSeconds,
          maxPoints: input.maxPoints,
        },
        include: {
          options: true,
        },
      });

      return toQuestionOwnerDto(question);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictError(`A question with order ${input.order} already exists in this quiz`);
      }
      throw error;
    }
  }

  async updateQuestion(
    questionId: string,
    ownerId: string,
    input: UpdateQuestionInput
  ): Promise<QuestionOwnerDto> {
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        quiz: { select: { ownerId: true } },
      },
    });

    if (!question) {
      throw new NotFoundError('Question not found');
    }

    if (question.quiz.ownerId !== ownerId) {
      throw new ForbiddenError('You do not have permission to update this question');
    }

    try {
      const updated = await prisma.question.update({
        where: { id: questionId },
        data: {
          ...(input.text !== undefined ? { text: input.text } : {}),
          ...(input.order !== undefined ? { order: input.order } : {}),
          ...(input.timeLimitSeconds !== undefined
            ? { timeLimitSeconds: input.timeLimitSeconds }
            : {}),
          ...(input.maxPoints !== undefined ? { maxPoints: input.maxPoints } : {}),
        },
        include: {
          options: {
            orderBy: { order: 'asc' },
          },
        },
      });

      return toQuestionOwnerDto(updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictError(`A question with order ${input.order} already exists in this quiz`);
      }
      throw error;
    }
  }

  async deleteQuestion(questionId: string, ownerId: string): Promise<void> {
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        quiz: { select: { ownerId: true } },
      },
    });

    if (!question) {
      throw new NotFoundError('Question not found');
    }

    if (question.quiz.ownerId !== ownerId) {
      throw new ForbiddenError('You do not have permission to delete this question');
    }

    await prisma.question.delete({
      where: { id: questionId },
    });
  }

  // =================== OPTIONS ===================

  async addOption(
    questionId: string,
    ownerId: string,
    input: CreateOptionInput
  ): Promise<OptionOwnerDto> {
    const question = await prisma.question.findUnique({
      where: { id: questionId },
      include: {
        quiz: { select: { ownerId: true } },
      },
    });

    if (!question) {
      throw new NotFoundError('Question not found');
    }

    if (question.quiz.ownerId !== ownerId) {
      throw new ForbiddenError('You do not have permission to add options to this question');
    }

    try {
      const option = await prisma.questionOption.create({
        data: {
          questionId,
          text: input.text,
          order: input.order,
          isCorrect: input.isCorrect,
        },
      });

      return toOptionOwnerDto(option);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictError(
          `An option with order ${input.order} already exists for this question`
        );
      }
      throw error;
    }
  }

  async updateOption(
    optionId: string,
    ownerId: string,
    input: UpdateOptionInput
  ): Promise<OptionOwnerDto> {
    const option = await prisma.questionOption.findUnique({
      where: { id: optionId },
      include: {
        question: {
          include: {
            quiz: { select: { ownerId: true } },
          },
        },
      },
    });

    if (!option) {
      throw new NotFoundError('Option not found');
    }

    if (option.question.quiz.ownerId !== ownerId) {
      throw new ForbiddenError('You do not have permission to update this option');
    }

    try {
      const updated = await prisma.questionOption.update({
        where: { id: optionId },
        data: {
          ...(input.text !== undefined ? { text: input.text } : {}),
          ...(input.order !== undefined ? { order: input.order } : {}),
          ...(input.isCorrect !== undefined ? { isCorrect: input.isCorrect } : {}),
        },
      });

      return toOptionOwnerDto(updated);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictError(
          `An option with order ${input.order} already exists for this question`
        );
      }
      throw error;
    }
  }

  async deleteOption(optionId: string, ownerId: string): Promise<void> {
    const option = await prisma.questionOption.findUnique({
      where: { id: optionId },
      include: {
        question: {
          include: {
            quiz: { select: { ownerId: true } },
          },
        },
      },
    });

    if (!option) {
      throw new NotFoundError('Option not found');
    }

    if (option.question.quiz.ownerId !== ownerId) {
      throw new ForbiddenError('You do not have permission to delete this option');
    }

    await prisma.questionOption.delete({
      where: { id: optionId },
    });
  }
}

export const quizService = new QuizService();
