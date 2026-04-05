import { Router } from 'express';
import { authenticate } from '@middleware/authenticate';
import { authorize } from '@middleware/authorize';
import {
  getSummaryHandler,
  getCategoriesHandler,
  getTrendsHandler,
  getRecentHandler,
} from './dashboard.controller';

export const dashboardRouter = Router();

dashboardRouter.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Aggregated financial insights
 */

/**
 * @swagger
 * /dashboard/summary:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get total income, expenses, and net balance
 *     description: |
 *       VIEWER sees their own data.
 *       ANALYST/ADMIN see all data (optionally filtered by userId or date range).
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: userId
 *         description: Filter by user (ANALYST/ADMIN only)
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Summary with totalIncome, totalExpenses, netBalance
 */
dashboardRouter.get('/summary', getSummaryHandler);

/**
 * @swagger
 * /dashboard/categories:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get spending and income breakdown by category
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: userId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Array of { category, type, total }
 */
dashboardRouter.get('/categories', getCategoriesHandler);

/**
 * @swagger
 * /dashboard/trends:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get monthly or weekly income vs expense trends (ANALYST, ADMIN)
 *     parameters:
 *       - in: query
 *         name: period
 *         schema: { type: string, enum: [monthly, weekly], default: monthly }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: userId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Array of { period, income, expenses, net }
 *       403:
 *         description: VIEWER role not permitted
 */
dashboardRouter.get('/trends', authorize('ANALYST', 'ADMIN'), getTrendsHandler);

/**
 * @swagger
 * /dashboard/recent:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get most recent transactions
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, maximum: 50 }
 *       - in: query
 *         name: userId
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Array of recent financial records
 */
dashboardRouter.get('/recent', getRecentHandler);
