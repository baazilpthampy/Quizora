import { Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { UnauthorizedError } from '../utils/errors';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function devAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const userIdHeader = req.headers['x-dev-user-id'];

  if (!userIdHeader || typeof userIdHeader !== 'string') {
    return next(new UnauthorizedError('Missing required X-Dev-User-Id header'));
  }

  const userId = userIdHeader.trim();
  if (!UUID_REGEX.test(userId)) {
    return next(new UnauthorizedError('Invalid X-Dev-User-Id format: must be a valid UUID'));
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return next(new UnauthorizedError('User specified in X-Dev-User-Id does not exist'));
    }

    (req as AuthenticatedRequest).user = user;
    next();
  } catch (error) {
    next(error);
  }
}
