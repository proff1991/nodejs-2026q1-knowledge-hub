import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';

type Role = 'admin' | 'editor' | 'viewer';
type DbRole = 'ADMIN' | 'EDITOR' | 'VIEWER';

const getAccessSecret = (): string => {
  return process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || '';
};

const getAccessTtl = (): string => {
  return process.env.JWT_ACCESS_TTL || process.env.TOKEN_EXPIRE_TIME || '15m';
};

const getSaltRounds = (): number => {
  return Number(process.env.CRYPT_SALT ?? 10);
};

const toDbRole = (role: Role): DbRole => {
  if (role === 'admin') {
    return 'ADMIN';
  }

  if (role === 'editor') {
    return 'EDITOR';
  }

  return 'VIEWER';
};

const createPrisma = () => {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is not defined');
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  return {
    pool,
    prisma,
  };
};

const getUserTokenByRole = async (
  _request: unknown,
  role: Role,
  _adminHeaders?: Record<string, string>,
) => {
  const { pool, prisma } = createPrisma();

  try {
    const login = `TEST_RBAC_${role.toUpperCase()}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const passwordHash = await bcrypt.hash('TestPass123!', getSaltRounds());

    const user = await prisma.user.create({
      data: {
        login,
        password: passwordHash,
        role: toDbRole(role),
      },
    });

    const jwtService = new JwtService();

    const accessToken = await jwtService.signAsync(
      {
        userId: user.id,
        login: user.login,
        role,
      },
      {
        secret: getAccessSecret(),
        expiresIn: getAccessTtl(),
      },
    );

    return {
      token: `Bearer ${accessToken}`,
      userId: user.id,
      login: user.login,
      role,
    };
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
};

export default getUserTokenByRole;