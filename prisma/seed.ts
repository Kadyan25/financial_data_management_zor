import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create users
  const adminHash = await bcrypt.hash('Admin@1234', 12);
  const analystHash = await bcrypt.hash('Analyst@1234', 12);
  const viewerHash = await bcrypt.hash('Viewer@1234', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@zorvyn.com' },
    update: {},
    create: {
      email: 'admin@zorvyn.com',
      passwordHash: adminHash,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  const analyst = await prisma.user.upsert({
    where: { email: 'analyst@zorvyn.com' },
    update: {},
    create: {
      email: 'analyst@zorvyn.com',
      passwordHash: analystHash,
      firstName: 'Finance',
      lastName: 'Analyst',
      role: 'ANALYST',
      status: 'ACTIVE',
    },
  });

  const viewer = await prisma.user.upsert({
    where: { email: 'viewer@zorvyn.com' },
    update: {},
    create: {
      email: 'viewer@zorvyn.com',
      passwordHash: viewerHash,
      firstName: 'Dashboard',
      lastName: 'Viewer',
      role: 'VIEWER',
      status: 'ACTIVE',
    },
  });

  console.log(`✅ Created users: ${admin.email}, ${analyst.email}, ${viewer.email}`);

  // Create sample financial records
  const records = [
    // Analyst records
    { userId: analyst.id, amount: 75000, type: 'INCOME' as const, category: 'salary', date: new Date('2024-01-01'), notes: 'Monthly salary' },
    { userId: analyst.id, amount: 5000, type: 'INCOME' as const, category: 'freelance', date: new Date('2024-01-15'), notes: 'Freelance project' },
    { userId: analyst.id, amount: 18000, type: 'EXPENSE' as const, category: 'rent', date: new Date('2024-01-01'), notes: 'Monthly rent' },
    { userId: analyst.id, amount: 4500, type: 'EXPENSE' as const, category: 'utilities', date: new Date('2024-01-05'), notes: 'Electricity and internet' },
    { userId: analyst.id, amount: 8000, type: 'EXPENSE' as const, category: 'food', date: new Date('2024-01-20'), notes: 'Groceries and dining' },
    { userId: analyst.id, amount: 75000, type: 'INCOME' as const, category: 'salary', date: new Date('2024-02-01'), notes: 'Monthly salary' },
    { userId: analyst.id, amount: 12000, type: 'INCOME' as const, category: 'investment', date: new Date('2024-02-10'), notes: 'Dividend income' },
    { userId: analyst.id, amount: 18000, type: 'EXPENSE' as const, category: 'rent', date: new Date('2024-02-01'), notes: 'Monthly rent' },
    { userId: analyst.id, amount: 3200, type: 'EXPENSE' as const, category: 'transport', date: new Date('2024-02-15'), notes: 'Fuel and maintenance' },
    { userId: analyst.id, amount: 75000, type: 'INCOME' as const, category: 'salary', date: new Date('2024-03-01'), notes: 'Monthly salary' },
    { userId: analyst.id, amount: 22000, type: 'EXPENSE' as const, category: 'healthcare', date: new Date('2024-03-10'), notes: 'Medical checkup' },
    { userId: analyst.id, amount: 6500, type: 'EXPENSE' as const, category: 'entertainment', date: new Date('2024-03-20'), notes: 'Subscriptions and leisure' },
    // Viewer records
    { userId: viewer.id, amount: 45000, type: 'INCOME' as const, category: 'salary', date: new Date('2024-01-01'), notes: 'Monthly salary' },
    { userId: viewer.id, amount: 12000, type: 'EXPENSE' as const, category: 'rent', date: new Date('2024-01-01'), notes: 'Monthly rent' },
    { userId: viewer.id, amount: 3500, type: 'EXPENSE' as const, category: 'food', date: new Date('2024-01-10'), notes: 'Groceries' },
    // Admin records
    { userId: admin.id, amount: 150000, type: 'INCOME' as const, category: 'salary', date: new Date('2024-01-01'), notes: 'Monthly salary' },
    { userId: admin.id, amount: 50000, type: 'EXPENSE' as const, category: 'taxes', date: new Date('2024-01-31'), notes: 'Quarterly tax payment' },
  ];

  for (const record of records) {
    await prisma.financialRecord.create({ data: record });
  }

  console.log(`✅ Created ${records.length} financial records`);
  console.log('\n📋 Seed credentials:');
  console.log('  ADMIN:   admin@zorvyn.com    / Admin@1234');
  console.log('  ANALYST: analyst@zorvyn.com  / Analyst@1234');
  console.log('  VIEWER:  viewer@zorvyn.com   / Viewer@1234');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
