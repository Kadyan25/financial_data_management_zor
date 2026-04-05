import 'dotenv/config'; // Load .env before anything else
import './config/env'; // Validate env
import { app } from './app';
import { prisma } from './config/database';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function main(): Promise<void> {
  // Test database connection
  await prisma.$connect();
  console.log('✅ Database connected');

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📖 API Docs: http://localhost:${PORT}/api/docs`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
