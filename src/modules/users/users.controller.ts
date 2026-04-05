import { Request, Response, NextFunction } from 'express';
import * as usersService from './users.service';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '@utils/apiResponse';
import type { CreateUserInput, UpdateUserInput, UserListQuery } from './users.schema';

export async function listUsersHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { data, meta } = await usersService.listUsers(req.query as UserListQuery);
    sendPaginated(res, data, meta, 'Users retrieved');
  } catch (err) {
    next(err);
  }
}

export async function getUserHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await usersService.getUserById(req.params['id'] as string);
    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
}

export async function createUserHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await usersService.createUser(req.body as CreateUserInput);
    sendCreated(res, user, 'User created successfully');
  } catch (err) {
    next(err);
  }
}

export async function updateUserHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await usersService.updateUser(
      req.params['id'] as string,
      req.body as UpdateUserInput,
      req.user!.id,
    );
    sendSuccess(res, user, 'User updated successfully');
  } catch (err) {
    next(err);
  }
}

export async function deactivateUserHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await usersService.deactivateUser(req.params['id'] as string, req.user!.id);
    sendNoContent(res);
  } catch (err) {
    next(err);
  }
}
