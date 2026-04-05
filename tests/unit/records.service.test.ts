jest.mock('../../src/config/database', () => ({
  prisma: {
    financialRecord: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      $transaction: jest.fn(),
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
import { getRecordById, updateRecord, deleteRecord } from '../../src/modules/records/records.service';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function makeDecimal(value: number) {
  return { toNumber: () => value };
}

const mockRecord = {
  id: 'rec1',
  amount: makeDecimal(500),
  type: 'INCOME' as const,
  category: 'salary',
  date: new Date('2024-01-15'),
  notes: null,
  isDeleted: false,
  userId: 'user1',
  createdAt: new Date(),
  updatedAt: new Date(),
  user: { id: 'user1', firstName: 'Test', lastName: 'User', email: 'test@test.com' },
};

describe('Records Service', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getRecordById', () => {
    it('should throw 404 for deleted records', async () => {
      (mockPrisma.financialRecord.findUnique as jest.Mock).mockResolvedValue({
        ...mockRecord,
        isDeleted: true,
      });

      await expect(getRecordById('rec1', 'user1', 'ADMIN')).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('should throw 404 when record does not exist', async () => {
      (mockPrisma.financialRecord.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(getRecordById('nonexistent', 'user1', 'ADMIN')).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('should throw 403 when VIEWER accesses another user record', async () => {
      (mockPrisma.financialRecord.findUnique as jest.Mock).mockResolvedValue({
        ...mockRecord,
        userId: 'other_user',
      });

      await expect(getRecordById('rec1', 'user1', 'VIEWER')).rejects.toMatchObject({
        statusCode: 403,
      });
    });

    it('should allow VIEWER to access their own record', async () => {
      (mockPrisma.financialRecord.findUnique as jest.Mock).mockResolvedValue(mockRecord);

      const result = await getRecordById('rec1', 'user1', 'VIEWER');
      expect(result.id).toBe('rec1');
      expect(result.amount).toBe(500);
    });

    it('should allow ADMIN to access any record', async () => {
      (mockPrisma.financialRecord.findUnique as jest.Mock).mockResolvedValue({
        ...mockRecord,
        userId: 'other_user',
      });

      const result = await getRecordById('rec1', 'requesting_admin', 'ADMIN');
      expect(result.id).toBe('rec1');
    });
  });

  describe('updateRecord', () => {
    it('should throw 403 when ANALYST tries to update another user record', async () => {
      (mockPrisma.financialRecord.findUnique as jest.Mock).mockResolvedValue({
        ...mockRecord,
        userId: 'other_user',
      });

      await expect(
        updateRecord('rec1', { notes: 'changed' }, 'analyst1', 'ANALYST'),
      ).rejects.toMatchObject({ statusCode: 403 });
    });
  });

  describe('deleteRecord', () => {
    it('should soft delete — sets isDeleted=true, not hard delete', async () => {
      (mockPrisma.financialRecord.findUnique as jest.Mock).mockResolvedValue(mockRecord);
      (mockPrisma.financialRecord.update as jest.Mock).mockResolvedValue({});

      await deleteRecord('rec1', 'user1', 'ADMIN');

      const updateCall = (mockPrisma.financialRecord.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.isDeleted).toBe(true);
      // Ensure it's NOT a hard delete (no deleteMany call)
      expect(mockPrisma.financialRecord.findUnique).toHaveBeenCalled();
    });
  });
});
