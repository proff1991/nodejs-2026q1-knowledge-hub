import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';

type AuthData = {
  token: string;
  accessToken: string;
  refreshToken: string;
  mockUserId: string;
  login: string;
};

type DbRole = 'ADMIN' | 'EDITOR' | 'VIEWER';

const getAccessSecret = (): string => {
  return process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || '';
};

const getRefreshSecret = (): string => {
  return process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET_REFRESH_KEY || '';
};

const getAccessTtl = (): string => {
  return process.env.JWT_ACCESS_TTL || process.env.TOKEN_EXPIRE_TIME || '15m';
};

const getRefreshTtl = (): string => {
  return process.env.JWT_REFRESH_TTL || process.env.TOKEN_REFRESH_EXPIRE_TIME || '7d';
};

const getSaltRounds = (): number => {
  return Number(process.env.CRYPT_SALT ?? 10);
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

const getTokenAndUserId = async (_request?: unknown): Promise<AuthData> => {
  const { pool, prisma } = createPrisma();

  try {
    const login = `TEST_AUTH_ADMIN_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const passwordHash = await bcrypt.hash('Tu6!@#%&', getSaltRounds());

    const user = await prisma.user.create({
      data: {
        login,
        password: passwordHash,
        role: 'ADMIN' as DbRole,
      },
    });

    const jwtService = new JwtService();

    const payload = {
      userId: user.id,
      login: user.login,
      role: 'admin',
    };

    const accessToken = await jwtService.signAsync(payload, {
      secret: getAccessSecret(),
      expiresIn: getAccessTtl(),
    });

    const refreshToken = await jwtService.signAsync(payload, {
      secret: getRefreshSecret(),
      expiresIn: getRefreshTtl(),
    });

    return {
      token: `Bearer ${accessToken}`,
      accessToken,
      refreshToken,
      mockUserId: user.id,
      login: user.login,
    };
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
};

export default getTokenAndUserId;