import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '@utils/jwt';
import { prisma } from '@config/database';
import { AppError } from './errorHandler';
import type { Role } from '../types/enums';

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError(401, 'Authentication required');
    }

    const token = authHeader.slice(7);
    const payload = verifyAccessToken(token);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, role: true, status: true },
    });

    if (!user) {
      throw new AppError(401, 'User no longer exists');
    }

    if (user.status === 'INACTIVE') {
      throw new AppError(403, 'Account is deactivated');
    }

    req.user = { id: user.id, email: user.email, role: user.role as Role };
    next();
  } catch (err) {
    next(err);
  }
}
