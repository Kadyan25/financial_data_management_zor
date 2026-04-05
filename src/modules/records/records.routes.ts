import { Router } from 'express';
import { authenticate } from '@middleware/authenticate';
import { authorize } from '@middleware/authorize';
import { validate } from '@middleware/validate';
import { createRecordSchema, updateRecordSchema, recordListQuerySchema } from './records.schema';
import {
  listRecordsHandler,
  getRecordHandler,
  createRecordHandler,
  updateRecordHandler,
  deleteRecordHandler,
} from './records.controller';

export const recordsRouter = Router();

// All record routes require authentication
recordsRouter.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Records
 *   description: Financial record management
 */

/**
 * @swagger
 * /records:
 *   get:
 *     tags: [Records]
 *     summary: List financial records (paginated, filterable)
 *     description: |
 *       VIEWER sees only their own records.
 *       ANALYST and ADMIN see all records (can filter by userId).
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [INCOME, EXPENSE] }
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [date, amount, createdAt], default: date }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *       - in: query
 *         name: userId
 *         description: Filter by user (ANALYST/ADMIN only)
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated list of records
 */
recordsRouter.get('/', validate(recordListQuerySchema, 'query'), listRecordsHandler);

/**
 * @swagger
 * /records/{id}:
 *   get:
 *     tags: [Records]
 *     summary: Get a financial record by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Record details
 *       403:
 *         description: Not authorized to view this record (VIEWER accessing another's record)
 *       404:
 *         description: Record not found
 */
recordsRouter.get('/:id', getRecordHandler);

/**
 * @swagger
 * /records:
 *   post:
 *     tags: [Records]
 *     summary: Create a financial record (ANALYST, ADMIN)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount, type, category, date]
 *             properties:
 *               amount:
 *                 type: number
 *                 format: decimal
 *                 minimum: 0.01
 *               type:
 *                 type: string
 *                 enum: [INCOME, EXPENSE]
 *               category:
 *                 type: string
 *               date:
 *                 type: string
 *                 format: date
 *               notes:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       201:
 *         description: Record created
 *       403:
 *         description: VIEWER role cannot create records
 */
recordsRouter.post('/', authorize('ANALYST', 'ADMIN'), validate(createRecordSchema), createRecordHandler);

/**
 * @swagger
 * /records/{id}:
 *   patch:
 *     tags: [Records]
 *     summary: Update a financial record (ANALYST owns only, ADMIN any)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Record updated
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Record not found
 */
recordsRouter.patch('/:id', authorize('ANALYST', 'ADMIN'), validate(updateRecordSchema), updateRecordHandler);

/**
 * @swagger
 * /records/{id}:
 *   delete:
 *     tags: [Records]
 *     summary: Soft delete a financial record (ANALYST owns only, ADMIN any)
 *     description: Record is not permanently deleted — it is marked as deleted and hidden from listings.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204:
 *         description: Record deleted
 *       403:
 *         description: Not authorized
 *       404:
 *         description: Record not found
 */
recordsRouter.delete('/:id', authorize('ANALYST', 'ADMIN'), deleteRecordHandler);
