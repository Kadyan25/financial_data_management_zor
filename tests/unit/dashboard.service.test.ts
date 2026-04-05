jest.mock('../../src/config/database', () => ({
  prisma: {
    financialRecord: {
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    $queryRawUnsafe: jest.fn(),
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
import { getSummary } from '../../src/modules/dashboard/dashboard.service';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

function makeDecimal(value: number) {
  return { toNumber: () => value };
}

describe('Dashboard Service', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getSummary', () => {
    it('should correctly compute totalIncome, totalExpenses, and netBalance', async () => {
      (mockPrisma.financialRecord.groupBy as jest.Mock).mockResolvedValue([
        { type: 'INCOME', _sum: { amount: makeDecimal(5000) } },
        { type: 'EXPENSE', _sum: { amount: makeDecimal(3200) } },
      ]);

      const result = await getSummary('user1', 'ADMIN', {});

      expect(result.totalIncome).toBe(5000);
      expect(result.totalExpenses).toBe(3200);
      expect(result.netBalance).toBe(1800);
    });

    it('should return zero values when no records exist', async () => {
      (mockPrisma.financialRecord.groupBy as jest.Mock).mockResolvedValue([]);

      const result = await getSummary('user1', 'VIEWER', {});

      expect(result.totalIncome).toBe(0);
      expect(result.totalExpenses).toBe(0);
      expect(result.netBalance).toBe(0);
    });

    it('should handle negative net balance (more expenses than income)', async () => {
      (mockPrisma.financialRecord.groupBy as jest.Mock).mockResolvedValue([
        { type: 'INCOME', _sum: { amount: makeDecimal(1000) } },
        { type: 'EXPENSE', _sum: { amount: makeDecimal(2500) } },
      ]);

      const result = await getSummary('user1', 'ANALYST', {});

      expect(result.netBalance).toBe(-1500);
    });

    it('should scope VIEWER to their own userId in the where clause', async () => {
      (mockPrisma.financialRecord.groupBy as jest.Mock).mockResolvedValue([]);

      await getSummary('viewer_id', 'VIEWER', {});

      const groupByCall = (mockPrisma.financialRecord.groupBy as jest.Mock).mock.calls[0][0];
      expect(groupByCall.where.userId).toBe('viewer_id');
    });

    it('should NOT scope ADMIN to a userId', async () => {
      (mockPrisma.financialRecord.groupBy as jest.Mock).mockResolvedValue([]);

      await getSummary('admin_id', 'ADMIN', {});

      const groupByCall = (mockPrisma.financialRecord.groupBy as jest.Mock).mock.calls[0][0];
      expect(groupByCall.where.userId).toBeUndefined();
    });
  });
});
