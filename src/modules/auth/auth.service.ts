import crypto from 'crypto';
import { prisma } from '@config/database';
import { AppError } from '@middleware/errorHandler';
import { hashPassword, comparePassword } from '@utils/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '@utils/jwt';
import { env } from '@config/env';
import type { RegisterInput, LoginInput } from './auth.schema';

// Never expose passwordHash
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

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getRefreshExpiry(): Date {
  const expiry = env.JWT_REFRESH_EXPIRY;
  const days = expiry.endsWith('d') ? parseInt(expiry, 10) : 7;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function generateTokenPair(userId: string, email: string, role: string) {
  const accessToken = signAccessToken({ userId, email, role });
  const refreshToken = signRefreshToken({ userId });

  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(refreshToken),
      userId,
      expiresAt: getRefreshExpiry(),
    },
  });

  return { accessToken, refreshToken };
}

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new AppError(409, 'An account with this email already exists');
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      role: 'VIEWER',
    },
    select: USER_SELECT,
  });

  const tokens = await generateTokenPair(user.id, user.email, user.role);
  return { user, ...tokens };
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    select: { ...USER_SELECT, passwordHash: true },
  });

  // Never reveal whether email exists
  if (!user) {
    throw new AppError(401, 'Invalid email or password');
  }

  if (user.status === 'INACTIVE') {
    throw new AppError(403, 'Account is deactivated. Please contact an administrator.');
  }

  const passwordValid = await comparePassword(input.password, user.passwordHash);
  if (!passwordValid) {
    throw new AppError(401, 'Invalid email or password');
  }

  const { passwordHash: _ph, ...safeUser } = user;
  const tokens = await generateTokenPair(safeUser.id, safeUser.email, safeUser.role);
  return { user: safeUser, ...tokens };
}

export async function refreshTokens(rawRefreshToken: string) {
  const payload = verifyRefreshToken(rawRefreshToken);
  const tokenHash = hashToken(rawRefreshToken);

  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });

  if (!stored || stored.expiresAt < new Date()) {
    // Possible replay attack — revoke all tokens for user
    if (stored) {
      await prisma.refreshToken.deleteMany({ where: { userId: payload.userId } });
    }
    throw new AppError(401, 'Invalid or expired refresh token');
  }

  // Rotate: delete old token
  await prisma.refreshToken.delete({ where: { tokenHash } });

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: USER_SELECT,
  });

  if (!user || user.status === 'INACTIVE') {
    throw new AppError(401, 'User account is no longer valid');
  }

  const tokens = await generateTokenPair(user.id, user.email, user.role);
  return { user, ...tokens };
}

export async function logout(userId: string, rawRefreshToken: string) {
  const tokenHash = hashToken(rawRefreshToken);
  await prisma.refreshToken.deleteMany({ where: { tokenHash, userId } });
}

export async function logoutAll(userId: string) {
  await prisma.refreshToken.deleteMany({ where: { userId } });
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: USER_SELECT,
  });
  if (!user) throw new AppError(404, 'User not found');
  return user;
}
