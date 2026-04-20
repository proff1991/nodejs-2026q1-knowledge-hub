import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import type { StringValue } from 'ms';

type AuthData = {
  token: string;
  accessToken: string;
  refreshToken: string;
  mockUserId: string;
  login: string;
};

type DbRole = 'ADMIN' | 'EDITOR' | 'VIEWER';

type TokenPayload = {
  userId: string;
  login: string;
  role: 'admin' | 'editor' | 'viewer';
  iat?: number;
  exp?: number;
};

const getAccessSecret = (): string => {
  return process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || '';
};

const getRefreshSecret = (): string => {
  return process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET_REFRESH_KEY || '';
};

const getAccessTtl = (): StringValue | number => {
  return (process.env.JWT_ACCESS_TTL ||
    process.env.TOKEN_EXPIRE_TIME ||
    '15m') as StringValue;
};

const getRefreshTtl = (): StringValue | number => {
  return (process.env.JWT_REFRESH_TTL ||
    process.env.TOKEN_REFRESH_EXPIRE_TIME ||
    '7d') as StringValue;
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

    const payload: TokenPayload = {
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

    const verifiedRefreshPayload = await jwtService.verifyAsync<TokenPayload>(refreshToken, {
      secret: getRefreshSecret(),
    });

    if (!verifiedRefreshPayload.exp) {
      throw new Error('Failed to determine refresh token expiration');
    }

    const refreshTokenHash = await bcrypt.hash(refreshToken, getSaltRounds());
    const expiresAt = new Date(verifiedRefreshPayload.exp * 1000);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt,
      },
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