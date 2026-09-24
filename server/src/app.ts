import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import quizRouter from './modules/quizzes/quiz.routes';
import { errorHandler } from './middleware/errorHandler';

export const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json());

// Basic logging middleware (disabled during tests)
if (process.env.NODE_ENV !== 'test') {
  app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });
}

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Quizora API is running',
    timestamp: new Date().toISOString(),
  });
});

// Mount Quizora module routes
app.use('/api', quizRouter);

// 404 Catch-all for unknown routes
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'API route not found',
    },
  });
});

// Centralized error handling
app.use(errorHandler);
