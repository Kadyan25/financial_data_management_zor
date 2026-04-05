import { Prisma } from '@prisma/client';
import type { Role } from '../../types/enums';
import { prisma } from '@config/database';

interface DashboardFilters {
  startDate?: string;
  endDate?: string;
  userId?: string;
}

interface TrendRow {
  period: string;
  type: string;
  total: number | string;
}

// Build the base where clause respecting role scoping
function buildWhereClause(
  userId: string,
  role: Role,
  filters: DashboardFilters,
): Prisma.FinancialRecordWhereInput {
  const where: Prisma.FinancialRecordWhereInput = { isDeleted: false };

  // VIEWER only sees their own data
  if (role === 'VIEWER') {
    where.userId = userId;
  } else if (filters.userId) {
    where.userId = filters.userId;
  }

  if (filters.startDate || filters.endDate) {
    where.date = {};
    if (filters.startDate) (where.date as Prisma.DateTimeFilter).gte = new Date(filters.startDate);
    if (filters.endDate) (where.date as Prisma.DateTimeFilter).lte = new Date(filters.endDate);
  }

  return where;
}

export async function getSummary(userId: string, role: Role, filters: DashboardFilters) {
  const where = buildWhereClause(userId, role, filters);

  const results = await prisma.financialRecord.groupBy({
    by: ['type'],
    where,
    _sum: { amount: true },
  });

  let totalIncome = 0;
  let totalExpenses = 0;

  for (const row of results) {
    const amount = row._sum.amount?.toNumber() ?? 0;
    if (row.type === 'INCOME') totalIncome = amount;
    else totalExpenses = amount;
  }

  return {
    totalIncome: parseFloat(totalIncome.toFixed(2)),
    totalExpenses: parseFloat(totalExpenses.toFixed(2)),
    netBalance: parseFloat((totalIncome - totalExpenses).toFixed(2)),
  };
}

export async function getCategoryBreakdown(userId: string, role: Role, filters: DashboardFilters) {
  const where = buildWhereClause(userId, role, filters);

  const results = await prisma.financialRecord.groupBy({
    by: ['category', 'type'],
    where,
    _sum: { amount: true },
  });

  return results
    .map((row) => ({
      category: row.category,
      type: row.type,
      total: parseFloat((row._sum.amount?.toNumber() ?? 0).toFixed(2)),
    }))
    .sort((a, b) => b.total - a.total);
}

export async function getTrends(
  userId: string,
  role: Role,
  filters: DashboardFilters & { period?: string },
) {
  // SQLite uses strftime for date truncation, ? placeholders
  const isWeekly = filters.period === 'weekly';
  const strftimeFmt = isWeekly ? '%Y-%W' : '%Y-%m';

  const conditions: string[] = ['is_deleted = 0'];
  const params: unknown[] = [];

  if (role === 'VIEWER') {
    conditions.push('user_id = ?');
    params.push(userId);
  } else if (filters.userId) {
    conditions.push('user_id = ?');
    params.push(filters.userId);
  }

  if (filters.startDate) {
    conditions.push('date >= ?');
    params.push(new Date(filters.startDate).toISOString());
  }
  if (filters.endDate) {
    conditions.push('date <= ?');
    params.push(new Date(filters.endDate).toISOString());
  }

  const whereSQL = conditions.join(' AND ');

  const rows = await prisma.$queryRawUnsafe<TrendRow[]>(
    `SELECT
      strftime('${strftimeFmt}', date) AS period,
      type,
      CAST(SUM(amount) AS REAL) AS total
    FROM financial_records
    WHERE ${whereSQL}
    GROUP BY period, type
    ORDER BY period ASC`,
    ...params,
  );

  // Merge INCOME and EXPENSE rows into unified period objects
  const periodMap = new Map<string, { period: string; income: number; expenses: number; net: number }>();

  for (const row of rows) {
    const key = String(row.period);
    if (!periodMap.has(key)) {
      periodMap.set(key, { period: key, income: 0, expenses: 0, net: 0 });
    }
    const entry = periodMap.get(key)!;
    if (row.type === 'INCOME') entry.income = parseFloat(Number(row.total).toFixed(2));
    else entry.expenses = parseFloat(Number(row.total).toFixed(2));
    entry.net = parseFloat((entry.income - entry.expenses).toFixed(2));
  }

  return Array.from(periodMap.values());
}

export async function getRecentActivity(
  userId: string,
  role: Role,
  filters: DashboardFilters & { limit?: string },
) {
  const take = Math.min(50, Math.max(1, parseInt(filters.limit ?? '10', 10)));
  const where = buildWhereClause(userId, role, filters);

  const records = await prisma.financialRecord.findMany({
    where,
    orderBy: { date: 'desc' },
    take,
    include: {
      user: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  return records.map((r) => ({ ...r, amount: r.amount.toNumber() }));
}
