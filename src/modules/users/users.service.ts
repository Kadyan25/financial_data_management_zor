import { Prisma } from '@prisma/client';
import { prisma } from '@config/database';
import { AppError } from '@middleware/errorHandler';
import { hashPassword } from '@utils/password';
import { getPaginationParams, buildPaginationMeta } from '@utils/pagination';
import type { CreateUserInput, UpdateUserInput, UserListQuery } from './users.schema';

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function listUsers(query: UserListQuery) {
  const { page, limit, skip } = getPaginationParams(query);

  const where: Prisma.UserWhereInput = {};
  if (query.role) where.role = query.role;
  if (query.status) where.status = query.status;
  if (query.search) {
    where.OR = [
      { email: { contains: query.search } },
      { firstName: { contains: query.search } },
      { lastName: { contains: query.search } },
    ];
  }

  const [total, data] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: USER_SELECT,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return { data, meta: buildPaginationMeta(total, page, limit) };
}

export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({ where: { id }, select: USER_SELECT });
  if (!user) throw new AppError(404, 'User not found');
  return user;
}

export async function createUser(input: CreateUserInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new AppError(409, 'An account with this email already exists');

  const passwordHash = await hashPassword(input.password);
  return prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
    },
    select: USER_SELECT,
  });
}

export async function updateUser(id: string, input: UpdateUserInput, requestingUserId: string) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError(404, 'User not found');

  // Prevent self role/status change (to avoid admin locking themselves out)
  if (id === requestingUserId && (input.role !== undefined || input.status !== undefined)) {
    throw new AppError(400, 'You cannot change your own role or status');
  }

  // Ensure at least one admin remains if deactivating/demoting an admin
  if (user.role === 'ADMIN' && (input.status === 'INACTIVE' || input.role !== 'ADMIN')) {
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN', status: 'ACTIVE', id: { not: id } },
    });
    if (adminCount === 0) {
      throw new AppError(400, 'Cannot demote or deactivate the last active administrator');
    }
  }

  return prisma.user.update({
    where: { id },
    data: input,
    select: USER_SELECT,
  });
}

export async function deactivateUser(id: string, requestingUserId: string) {
  if (id === requestingUserId) {
    throw new AppError(400, 'You cannot deactivate your own account');
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new AppError(404, 'User not found');

  if (user.role === 'ADMIN') {
    const adminCount = await prisma.user.count({
      where: { role: 'ADMIN', status: 'ACTIVE', id: { not: id } },
    });
    if (adminCount === 0) {
      throw new AppError(400, 'Cannot deactivate the last active administrator');
    }
  }

  // Deactivate user and force logout by deleting all refresh tokens
  await prisma.$transaction([
    prisma.user.update({
      where: { id },
      data: { status: 'INACTIVE' },
    }),
    prisma.refreshToken.deleteMany({ where: { userId: id } }),
  ]);
}
