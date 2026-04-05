import { Response } from 'express';

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'Success',
  statusCode = 200,
): void {
  res.status(statusCode).json({ success: true, data, message });
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  meta: PaginationMeta,
  message = 'Success',
): void {
  res.status(200).json({ success: true, data, meta, message });
}

export function sendCreated<T>(res: Response, data: T, message = 'Created successfully'): void {
  res.status(201).json({ success: true, data, message });
}

export function sendNoContent(res: Response): void {
  res.status(204).send();
}
