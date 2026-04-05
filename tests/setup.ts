import { execSync } from 'child_process';

// Load test environment
process.env.NODE_ENV = 'test';

// Provide defaults for env validation in tests (can be overridden by .env.test)
process.env.DATABASE_URL = process.env.DATABASE_URL || 'file:./test.db';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test_access_secret_that_is_long_enough_for_validation_32chars';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_refresh_secret_that_is_different_and_long_enough_32chars';
process.env.JWT_ACCESS_EXPIRY = '15m';
process.env.JWT_REFRESH_EXPIRY = '7d';
process.env.BCRYPT_ROUNDS = '4'; // Fast hashing in tests
process.env.CORS_ORIGINS = 'http://localhost:3000';

export default async function globalSetup() {
  console.log('\n🔧 Running test global setup...');
}
