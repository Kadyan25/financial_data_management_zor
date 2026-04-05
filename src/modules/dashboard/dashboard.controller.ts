import { Request, Response, NextFunction } from 'express';
import * as dashboardService from './dashboard.service';
import { sendSuccess } from '@utils/apiResponse';

function getFilters(query: Record<string, string | undefined>) {
  return {
    startDate: query.startDate,
    endDate: query.endDate,
    userId: query.userId,
    period: query.period,
    limit: query.limit,
  };
}

export async function getSummaryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const summary = await dashboardService.getSummary(
      req.user!.id,
      req.user!.role,
      getFilters(req.query as Record<string, string>),
    );
    sendSuccess(res, summary, 'Dashboard summary retrieved');
  } catch (err) {
    next(err);
  }
}

export async function getCategoriesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const breakdown = await dashboardService.getCategoryBreakdown(
      req.user!.id,
      req.user!.role,
      getFilters(req.query as Record<string, string>),
    );
    sendSuccess(res, breakdown, 'Category breakdown retrieved');
  } catch (err) {
    next(err);
  }
}

export async function getTrendsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const trends = await dashboardService.getTrends(
      req.user!.id,
      req.user!.role,
      getFilters(req.query as Record<string, string>),
    );
    sendSuccess(res, trends, 'Trend data retrieved');
  } catch (err) {
    next(err);
  }
}

export async function getRecentHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const recent = await dashboardService.getRecentActivity(
      req.user!.id,
      req.user!.role,
      getFilters(req.query as Record<string, string>),
    );
    sendSuccess(res, recent, 'Recent activity retrieved');
  } catch (err) {
    next(err);
  }
}
