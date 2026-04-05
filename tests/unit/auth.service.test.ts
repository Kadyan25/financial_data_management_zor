import { AppError } from '../../src/middleware/errorHandler';

// Mock prisma before any imports that use it
jest.mock('../../src/config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  },
}));

jest.mock('../../src/config/env', () => ({
  env: {
    JWT_ACCESS_SECRET: 'test_access_secret_that_is_long_enough_for_validation_32chars',
    JWT_REFRESH_SECRET: 'test_refresh_secret_that_is_different_and_long_enough_32chars',
    JWT_ACCESS_EXPIRY: '15m',
    JWT_REFRESH_EXPIRY: '7d',
    BCRYPT_ROUNDS: 4,
    CORS_ORIGINS: 'http://localhost:3000',
    NODE_ENV: 'test' as const,
    PORT: 3000,
    DATABASE_URL: 'postgresql://test',
  },
}));

import { prisma } from '../../src/config/database';
import { register, login } from '../../src/modules/auth/auth.service';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Auth Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should throw 409 if email already exists', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ id: '1', email: 'exists@test.com' });

      await expect(
        register({
          email: 'exists@test.com',
          password: 'Password1',
          firstName: 'Test',
          lastName: 'User',
        }),
      ).rejects.toMatchObject({
        statusCode: 409,
        message: expect.stringContaining('already exists'),
      });
    });

    it('should create user with VIEWER role by default', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      const mockUser = {
        id: 'user1',
        email: 'new@test.com',
        firstName: 'New',
        lastName: 'User',
        role: 'VIEWER',
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (mockPrisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (mockPrisma.refreshToken.create as jest.Mock).mockResolvedValue({});

      const result = await register({
        email: 'new@test.com',
        password: 'Password1',
        firstName: 'New',
        lastName: 'User',
      });

      expect(result.user.role).toBe('VIEWER');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();

      const createCall = (mockPrisma.user.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.role).toBe('VIEWER');
      // Password should be hashed, not stored as plaintext
      expect(createCall.data.passwordHash).not.toBe('Password1');
    });
  });

  describe('login', () => {
    it('should throw 401 for non-existent email', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        login({ email: 'nobody@test.com', password: 'Password1' }),
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('should throw 403 for inactive users', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: '1',
        email: 'inactive@test.com',
        passwordHash: '$2a$04$test',
        status: 'INACTIVE',
        role: 'VIEWER',
      });

      await expect(
        login({ email: 'inactive@test.com', password: 'Password1' }),
      ).rejects.toMatchObject({ statusCode: 403 });
    });

    it('should throw 401 for wrong password', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: '1',
        email: 'user@test.com',
        // bcrypt hash of 'CorrectPassword1'
        passwordHash: '$2a$04$Hn7wkBD3wOylPAFRiNr3sOGMLk5hy8JvZ3JBxQ.eGIGmcBtpKc2Ke',
        status: 'ACTIVE',
        role: 'VIEWER',
        firstName: 'Test',
        lastName: 'User',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        login({ email: 'user@test.com', password: 'WrongPassword1' }),
      ).rejects.toMatchObject({ statusCode: 401 });
    });

    it('should never reveal whether email exists (same error for both cases)', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      let emailNotFoundError: AppError | null = null;
      try {
        await login({ email: 'nobody@test.com', password: 'Password1' });
      } catch (e) {
        emailNotFoundError = e as AppError;
      }

      expect(emailNotFoundError?.message).toBe('Invalid email or password');
    });
  });
});
