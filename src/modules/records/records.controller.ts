import { Request, Response, NextFunction } from 'express';
import * as recordsService from './records.service';
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '@utils/apiResponse';
import type { CreateRecordInput, UpdateRecordInput, RecordListQuery } from './records.schema';

export async function listRecordsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { data, meta } = await recordsService.listRecords(
      req.user!.id,
      req.user!.role,
      req.query as RecordListQuery,
    );
    sendPaginated(res, data, meta, 'Records retrieved');
  } catch (err) {
    next(err);
  }
}

export async function getRecordHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const record = await recordsService.getRecordById(
      req.params['id'] as string,
      req.user!.id,
      req.user!.role,
    );
    sendSuccess(res, record);
  } catch (err) {
    next(err);
  }
}

export async function createRecordHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const record = await recordsService.createRecord(
      req.body as CreateRecordInput,
      req.user!.id,
    );
    sendCreated(res, record, 'Record created successfully');
  } catch (err) {
    next(err);
  }
}

export async function updateRecordHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const record = await recordsService.updateRecord(
      req.params['id'] as string,
      req.body as UpdateRecordInput,
      req.user!.id,
      req.user!.role,
    );
    sendSuccess(res, record, 'Record updated successfully');
  } catch (err) {
    next(err);
  }
}

export async function deleteRecordHandler(req: Request, res: Response, next: NextFunction) {
  try {
    await recordsService.deleteRecord(req.params['id'] as string, req.user!.id, req.user!.role);
    sendNoContent(res);
  } catch (err) {
    next(err);
  }
}
