import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { sendSuccess, sendCreated } from '@utils/apiResponse';
import type { RegisterInput, LoginInput, RefreshInput, LogoutInput } from './auth.schema';

export async function registerHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.register(req.body as RegisterInput);
    sendCreated(res, result, 'Account created successfully');
  } catch (err) {
    next(err);
  }
}

export async function loginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.login(req.body as LoginInput);
    sendSuccess(res, result, 'Login successful');
  } catch (err) {
    next(err);
  }
}

export async function refreshHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body as RefreshInput;
    const result = await authService.refreshTokens(refreshToken);
    sendSuccess(res, result, 'Tokens refreshed');
  } catch (err) {
    next(err);
  }
}

export async function logoutHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body as LogoutInput;
    await authService.logout(req.user!.id, refreshToken);
    sendSuccess(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
}

export async function getMeHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await authService.getMe(req.user!.id);
    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
}
