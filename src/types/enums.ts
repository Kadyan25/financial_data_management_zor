// String literal unions replacing Prisma enums (SQLite does not support enums)
export type Role = 'VIEWER' | 'ANALYST' | 'ADMIN';
export type RecordType = 'INCOME' | 'EXPENSE';
export type UserStatus = 'ACTIVE' | 'INACTIVE';

export const ROLES: Role[] = ['VIEWER', 'ANALYST', 'ADMIN'];
export const RECORD_TYPES: RecordType[] = ['INCOME', 'EXPENSE'];
export const USER_STATUSES: UserStatus[] = ['ACTIVE', 'INACTIVE'];
