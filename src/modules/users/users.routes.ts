import { Router } from 'express';
import { authenticate } from '@middleware/authenticate';
import { authorize } from '@middleware/authorize';
import { validate } from '@middleware/validate';
import { createUserSchema, updateUserSchema, userListQuerySchema } from './users.schema';
import {
  listUsersHandler,
  getUserHandler,
  createUserHandler,
  updateUserHandler,
  deactivateUserHandler,
} from './users.controller';

export const usersRouter = Router();

// All users routes require authentication + ADMIN role
usersRouter.use(authenticate, authorize('ADMIN'));

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management (ADMIN only)
 */

/**
 * @swagger
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: List all users (paginated)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [VIEWER, ANALYST, ADMIN] }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [ACTIVE, INACTIVE] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated list of users
 *       403:
 *         description: Admin access required
 */
usersRouter.get('/', validate(userListQuerySchema, 'query'), listUsersHandler);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: User details
 *       404:
 *         description: User not found
 */
usersRouter.get('/:id', getUserHandler);

/**
 * @swagger
 * /users:
 *   post:
 *     tags: [Users]
 *     summary: Create a new user (Admin sets role)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 8 }
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               role: { type: string, enum: [VIEWER, ANALYST, ADMIN] }
 *     responses:
 *       201:
 *         description: User created
 *       409:
 *         description: Email already in use
 */
usersRouter.post('/', validate(createUserSchema), createUserHandler);

/**
 * @swagger
 * /users/{id}:
 *   patch:
 *     tags: [Users]
 *     summary: Update user details, role, or status
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName: { type: string }
 *               lastName: { type: string }
 *               role: { type: string, enum: [VIEWER, ANALYST, ADMIN] }
 *               status: { type: string, enum: [ACTIVE, INACTIVE] }
 *     responses:
 *       200:
 *         description: User updated
 *       400:
 *         description: Cannot change own role/status or last admin
 */
usersRouter.patch('/:id', validate(updateUserSchema), updateUserHandler);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Deactivate a user (sets status to INACTIVE)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: User deactivated
 *       400:
 *         description: Cannot deactivate self or last admin
 */
usersRouter.delete('/:id', deactivateUserHandler);
