import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';

export const SEED_ADMIN_LOGIN = 'TEST_SEED_ADMIN';
export const SEED_ADMIN_PASSWORD = 'TestSeedAdmin123!';

export default async function globalSetup(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is not defined');
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const hashedPassword = await bcrypt.hash(SEED_ADMIN_PASSWORD, 10);

  try {
    await prisma.user.upsert({
      where: { login: SEED_ADMIN_LOGIN },
      update: {
        role: 'ADMIN',
        password: hashedPassword,
      },
      create: {
        login: SEED_ADMIN_LOGIN,
        password: hashedPassword,
        role: 'ADMIN',
      },
    });
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}