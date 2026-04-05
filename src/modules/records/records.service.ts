import { Prisma } from '@prisma/client';
import type { Role } from '../../types/enums';
import { prisma } from '@config/database';
import { AppError } from '@middleware/errorHandler';
import { getPaginationParams, buildPaginationMeta } from '@utils/pagination';
import type { CreateRecordInput, UpdateRecordInput, RecordListQuery } from './records.schema';

const ACTIVE_RECORD = { isDeleted: false } as const;

// VIEWER sees only own records; ANALYST/ADMIN see all (or scoped by userId param)
function buildScope(userId: string, role: Role, scopeUserId?: string): Prisma.FinancialRecordWhereInput {
  if (role === 'VIEWER') return { userId };
  if (scopeUserId) return { userId: scopeUserId };
  return {};
}

function assertOwnership(recordUserId: string, requestingUserId: string, role: Role): void {
  if (role === 'ADMIN') return;
  if (recordUserId !== requestingUserId) {
    throw new AppError(403, 'You do not have access to this record');
  }
}

export async function listRecords(userId: string, role: Role, query: RecordListQuery) {
  const { page, limit, skip } = getPaginationParams(query);

  const where: Prisma.FinancialRecordWhereInput = {
    ...ACTIVE_RECORD,
    ...buildScope(userId, role, query.userId),
  };

  if (query.type) where.type = query.type;
  if (query.category) where.category = { contains: query.category.toLowerCase() };
  if (query.startDate || query.endDate) {
    where.date = {};
    if (query.startDate) (where.date as Prisma.DateTimeFilter).gte = new Date(query.startDate);
    if (query.endDate) (where.date as Prisma.DateTimeFilter).lte = new Date(query.endDate);
  }

  const orderBy: Prisma.FinancialRecordOrderByWithRelationInput = {
    [query.sortBy ?? 'date']: query.sortOrder ?? 'desc',
  };

  const [total, data] = await prisma.$transaction([
    prisma.financialRecord.count({ where }),
    prisma.financialRecord.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    }),
  ]);

  // Convert Decimal to number for JSON serialization
  const serialized = data.map(serializeRecord);
  return { data: serialized, meta: buildPaginationMeta(total, page, limit) };
}

export async function getRecordById(id: string, userId: string, role: Role) {
  const record = await prisma.financialRecord.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });

  if (!record || record.isDeleted) throw new AppError(404, 'Record not found');

  assertOwnership(record.userId, userId, role);
  return serializeRecord(record);
}

export async function createRecord(input: CreateRecordInput, userId: string) {
  const record = await prisma.financialRecord.create({
    data: {
      amount: input.amount,
      type: input.type,
      category: input.category,
      date: input.date,
      notes: input.notes,
      userId,
    },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });
  return serializeRecord(record);
}

export async function updateRecord(
  id: string,
  input: UpdateRecordInput,
  userId: string,
  role: Role,
) {
  const record = await prisma.financialRecord.findUnique({ where: { id } });
  if (!record || record.isDeleted) throw new AppError(404, 'Record not found');
  assertOwnership(record.userId, userId, role);

  const updated = await prisma.financialRecord.update({
    where: { id },
    data: input,
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });
  return serializeRecord(updated);
}

export async function deleteRecord(id: string, userId: string, role: Role) {
  const record = await prisma.financialRecord.findUnique({ where: { id } });
  if (!record || record.isDeleted) throw new AppError(404, 'Record not found');
  assertOwnership(record.userId, userId, role);

  await prisma.financialRecord.update({
    where: { id },
    data: { isDeleted: true },
  });
}

// Prisma Decimal → number for JSON
function serializeRecord<T extends { amount: { toNumber(): number } }>(record: T) {
  return { ...record, amount: record.amount.toNumber() };
}
