import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/devAuth';
import { quizService } from './quiz.service';
import {
  createQuizSchema,
  updateQuizSchema,
  createQuestionSchema,
  updateQuestionSchema,
  createOptionSchema,
  updateOptionSchema,
  uuidParamSchema,
} from './quiz.schemas';

export class QuizController {
  // =================== QUIZZES ===================

  async createQuiz(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      const validatedBody = createQuizSchema.parse(req.body);

      const result = await quizService.createQuiz(user.id, validatedBody);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async listQuizzes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      const result = await quizService.listQuizzes(user.id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getQuizById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      const quizId = uuidParamSchema.parse(req.params.id);

      const result = await quizService.getQuizById(quizId, user.id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateQuiz(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      const quizId = uuidParamSchema.parse(req.params.id);
      const validatedBody = updateQuizSchema.parse(req.body);

      const result = await quizService.updateQuiz(quizId, user.id, validatedBody);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteQuiz(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      const quizId = uuidParamSchema.parse(req.params.id);

      await quizService.deleteQuiz(quizId, user.id);
      res.status(200).json({ message: 'Quiz deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  // =================== QUESTIONS ===================

  async addQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      const quizId = uuidParamSchema.parse(req.params.quizId);
      const validatedBody = createQuestionSchema.parse(req.body);

      const result = await quizService.addQuestion(quizId, user.id, validatedBody);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      const questionId = uuidParamSchema.parse(req.params.id);
      const validatedBody = updateQuestionSchema.parse(req.body);

      const result = await quizService.updateQuestion(questionId, user.id, validatedBody);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteQuestion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      const questionId = uuidParamSchema.parse(req.params.id);

      await quizService.deleteQuestion(questionId, user.id);
      res.status(200).json({ message: 'Question deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  // =================== OPTIONS ===================

  async addOption(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      const questionId = uuidParamSchema.parse(req.params.questionId);
      const validatedBody = createOptionSchema.parse(req.body);

      const result = await quizService.addOption(questionId, user.id, validatedBody);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async updateOption(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      const optionId = uuidParamSchema.parse(req.params.id);
      const validatedBody = updateOptionSchema.parse(req.body);

      const result = await quizService.updateOption(optionId, user.id, validatedBody);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteOption(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      const optionId = uuidParamSchema.parse(req.params.id);

      await quizService.deleteOption(optionId, user.id);
      res.status(200).json({ message: 'Option deleted successfully' });
    } catch (error) {
      next(error);
    }
  }
}

export const quizController = new QuizController();
