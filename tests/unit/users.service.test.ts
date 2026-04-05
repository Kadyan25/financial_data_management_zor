jest.mock('../../src/config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
    refreshToken: {
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
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
import { updateUser, deactivateUser } from '../../src/modules/users/users.service';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

const mockAdminUser = {
  id: 'admin1',
  email: 'admin@test.com',
  firstName: 'Admin',
  lastName: 'User',
  role: 'ADMIN' as const,
  status: 'ACTIVE' as const,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('Users Service', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('updateUser', () => {
    it('should throw 400 when admin tries to change own role', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockAdminUser);

      await expect(
        updateUser('admin1', { role: 'VIEWER' }, 'admin1'),
      ).rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining('own role') });
    });

    it('should throw 400 when demoting the last admin', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockAdminUser);
      (mockPrisma.user.count as jest.Mock).mockResolvedValue(0); // No other admins

      await expect(
        updateUser('admin1', { role: 'VIEWER' }, 'other_admin'),
      ).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('last active administrator'),
      });
    });

    it('should allow role change when other admins exist', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockAdminUser);
      (mockPrisma.user.count as jest.Mock).mockResolvedValue(1); // Another admin exists
      (mockPrisma.user.update as jest.Mock).mockResolvedValue({ ...mockAdminUser, role: 'ANALYST' });

      const result = await updateUser('admin1', { role: 'ANALYST' }, 'other_admin');
      expect(result.role).toBe('ANALYST');
    });
  });

  describe('deactivateUser', () => {
    it('should throw 400 when trying to deactivate self', async () => {
      await expect(deactivateUser('admin1', 'admin1')).rejects.toMatchObject({
        statusCode: 400,
        message: expect.stringContaining('own account'),
      });
    });

    it('should throw 400 when deactivating the last admin', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(mockAdminUser);
      (mockPrisma.user.count as jest.Mock).mockResolvedValue(0);

      await expect(deactivateUser('admin1', 'another_user')).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('should deactivate user and delete their refresh tokens', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({
        ...mockAdminUser,
        role: 'VIEWER',
      });
      (mockPrisma.$transaction as jest.Mock).mockResolvedValue([{}, {}]);

      await deactivateUser('viewer1', 'admin1');

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });
});
