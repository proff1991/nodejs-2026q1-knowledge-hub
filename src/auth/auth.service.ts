import {
    BadRequestException
    , ForbiddenException
    , Injectable
    , UnauthorizedException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '../user/dto/create-user.dto';
import { UserResponse } from '../user/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';

type DbUser = {
    id: string;
    login: string;
    password: string;
    role: 'ADMIN' | 'EDITOR' | 'VIEWER';
    createdAt: Date;
    updatedAt: Date;
};

type TokenPayload = {
    userId: string;
    login: string;
    role: UserRole;
    iat?: number;
    exp?: number;
};

type TokensResponse = {
    accessToken: string;
    refreshToken: string;
};

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
    ) { }

    private toResponse(user: DbUser): UserResponse {
        return {
            id: user.id,
            login: user.login,
            role: user.role.toLowerCase() as UserResponse['role'],
            createdAt: user.createdAt.getTime(),
            updatedAt: user.updatedAt.getTime(),
        };
    }

    private getAccessSecret(): string {
        return process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || '';
    }

    private getRefreshSecret(): string {
        return process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET_REFRESH_KEY || '';
    }

    private getAccessTtl(): string {
        return process.env.JWT_ACCESS_TTL || process.env.TOKEN_EXPIRE_TIME || '15m';
    }

    private getRefreshTtl(): string {
        return process.env.JWT_REFRESH_TTL || process.env.TOKEN_REFRESH_EXPIRE_TIME || '7d';
    }

    private createTokenPayload(user: DbUser): TokenPayload {
        return {
            userId: user.id,
            login: user.login,
            role: user.role.toLowerCase() as UserRole,
        };
    }

    private async generateTokens(user: DbUser): Promise<TokensResponse> {
        const payload = this.createTokenPayload(user);

        const accessToken = await this.jwtService.signAsync(payload, {
            secret: this.getAccessSecret(),
            expiresIn: this.getAccessTtl(),
        });

        const refreshToken = await this.jwtService.signAsync(payload, {
            secret: this.getRefreshSecret(),
            expiresIn: this.getRefreshTtl(),
        });

        return {
            accessToken,
            refreshToken,
        };
    }

    async signup(signupDto: SignupDto): Promise<UserResponse> {
        const existingUser = await this.prisma.user.findFirst({
            where: {
                login: signupDto.login,
            },
        });

        if (existingUser) {
            throw new BadRequestException('Login is already taken');
        }

        const saltRounds = Number(process.env.CRYPT_SALT ?? 10);
        const hashedPassword = await bcrypt.hash(signupDto.password, saltRounds);

        const user = await this.prisma.user.create({
            data: {
                login: signupDto.login,
                password: hashedPassword,
                role: 'VIEWER',
            },
        });

        return this.toResponse(user);
    }

    async login(loginDto: LoginDto): Promise<TokensResponse> {
        const user = await this.prisma.user.findFirst({
            where: {
                login: loginDto.login,
            },
        });

        if (!user) {
            throw new ForbiddenException('Authentication failed');
        }

        const isPasswordCorrect = await bcrypt.compare(
            loginDto.password,
            user.password,
        );

        if (!isPasswordCorrect) {
            throw new ForbiddenException('Authentication failed');
        }

        const tokens = await this.generateTokens(user as DbUser);
        await this.storeRefreshToken(user.id, tokens.refreshToken);

        return tokens;
    }

    async refresh(body: { refreshToken?: string }): Promise<TokensResponse> {
        if (!body || typeof body.refreshToken !== 'string' || body.refreshToken.length === 0) {
            throw new UnauthorizedException('Refresh token is required');
        }

        let payload: TokenPayload;

        try {
            payload = await this.jwtService.verifyAsync<TokenPayload>(body.refreshToken, {
                secret: this.getRefreshSecret(),
            });
        } catch {
            throw new ForbiddenException('Invalid refresh token');
        }

        const user = await this.prisma.user.findUnique({
            where: {
                id: payload.userId,
            },
        });

        if (!user || user.login !== payload.login) {
            throw new ForbiddenException('Invalid refresh token');
        }

        const storedToken = await this.findStoredRefreshToken(user.id, body.refreshToken);

        if (!storedToken) {
            throw new ForbiddenException('Invalid refresh token');
        }

        await this.revokeRefreshToken(storedToken.id);

        const tokens = await this.generateTokens(user as DbUser);
        await this.storeRefreshToken(user.id, tokens.refreshToken);

        return tokens;
    }

    private async hashToken(token: string): Promise<string> {
        return bcrypt.hash(token, this.getSaltRounds());
    }

    private async findStoredRefreshToken(userId: string, refreshToken: string) {
        const tokens = await this.prisma.refreshToken.findMany({
            where: {
                userId,
                revokedAt: null,
                expiresAt: {
                    gt: new Date(),
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        for (const tokenRecord of tokens) {
            const matches = await bcrypt.compare(refreshToken, tokenRecord.tokenHash);

            if (matches) {
                return tokenRecord;
            }
        }

        return null;
    }

    private async storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
        const payload = await this.jwtService.verifyAsync<TokenPayload>(refreshToken, {
            secret: this.getRefreshSecret(),
        });


        if (!payload.exp) {
            throw new ForbiddenException('Invalid refresh token');
        }
        const tokenHash = await this.hashToken(refreshToken);
        const expiresAt = new Date(payload.exp * 1000);

        await this.prisma.refreshToken.create({
            data: {
                userId,
                tokenHash,
                expiresAt,
            },
        });
    }

    private async revokeRefreshToken(id: string): Promise<void> {
        await this.prisma.refreshToken.update({
            where: { id },
            data: {
                revokedAt: new Date(),
            },
        });
    }

    private getSaltRounds(): number {
        return Number(process.env.CRYPT_SALT ?? 10);
    }

    async logout(body: { refreshToken?: string }): Promise<{ message: string }> {
        if (!body || typeof body.refreshToken !== 'string' || body.refreshToken.length === 0) {
            throw new UnauthorizedException('Refresh token is required');
        }

        let payload: TokenPayload;

        try {
            payload = await this.jwtService.verifyAsync<TokenPayload>(body.refreshToken, {
                secret: this.getRefreshSecret(),
            });
        } catch {
            throw new ForbiddenException('Invalid refresh token');
        }

        const storedToken = await this.findStoredRefreshToken(payload.userId, body.refreshToken);

        if (!storedToken) {
            throw new ForbiddenException('Invalid refresh token');
        }

        await this.revokeRefreshToken(storedToken.id);

        return {
            message: 'Logged out successfully',
        };
    }

}