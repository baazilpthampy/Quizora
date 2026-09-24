import { Router } from 'express';
import { devAuth } from '../../middleware/devAuth';
import { quizController } from './quiz.controller';

const router = Router();

// Apply development authentication to all quiz management routes
router.use(devAuth);

// Quizzes
router.post('/quizzes', (req, res, next) => quizController.createQuiz(req, res, next));
router.get('/quizzes', (req, res, next) => quizController.listQuizzes(req, res, next));
router.get('/quizzes/:id', (req, res, next) => quizController.getQuizById(req, res, next));
router.put('/quizzes/:id', (req, res, next) => quizController.updateQuiz(req, res, next));
router.delete('/quizzes/:id', (req, res, next) => quizController.deleteQuiz(req, res, next));

// Questions
router.post('/quizzes/:quizId/questions', (req, res, next) =>
  quizController.addQuestion(req, res, next)
);
router.put('/questions/:id', (req, res, next) => quizController.updateQuestion(req, res, next));
router.delete('/questions/:id', (req, res, next) => quizController.deleteQuestion(req, res, next));

// Options
router.post('/questions/:questionId/options', (req, res, next) =>
  quizController.addOption(req, res, next)
);
router.put('/options/:id', (req, res, next) => quizController.updateOption(req, res, next));
router.delete('/options/:id', (req, res, next) => quizController.deleteOption(req, res, next));

export default router;
