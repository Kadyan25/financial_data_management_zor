import type { Role, UserStatus } from '../../src/types/enums';
import bcrypt from 'bcryptjs';

export interface UserFactory {
  id?: string;
  email?: string;
  passwordHash?: string;
  firstName?: string;
  lastName?: string;
  role?: Role;
  status?: UserStatus;
}

export interface RecordFactory {
  amount?: number;
  type?: 'INCOME' | 'EXPENSE';
  category?: string;
  date?: Date;
  notes?: string;
  userId?: string;
}

export function makeUser(overrides: UserFactory = {}): UserFactory {
  return {
    email: overrides.email ?? `test_${Date.now()}@example.com`,
    passwordHash: overrides.passwordHash ?? bcrypt.hashSync('Password1', 4),
    firstName: overrides.firstName ?? 'Test',
    lastName: overrides.lastName ?? 'User',
    role: overrides.role ?? 'VIEWER',
    status: overrides.status ?? 'ACTIVE',
    ...overrides,
  };
}

export function makeRecord(userId: string, overrides: RecordFactory = {}): RecordFactory {
  return {
    amount: overrides.amount ?? 1000,
    type: overrides.type ?? 'INCOME',
    category: overrides.category ?? 'salary',
    date: overrides.date ?? new Date('2024-01-15'),
    notes: overrides.notes ?? 'Test record',
    userId,
    ...overrides,
  };
}
