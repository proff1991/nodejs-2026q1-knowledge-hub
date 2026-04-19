import {
    CanActivate
    , ExecutionContext
    , Injectable
    , UnauthorizedException
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { UserRole } from '../../user/dto/create-user.dto';

type TokenPayload = {
    userId: string;
    login: string;
    role: UserRole;
};

type RequestWithUser = Request & {
    user?: TokenPayload;
};

@Injectable()
export class AccessTokenGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly jwtService: JwtService,
    ) { }

    private getAccessSecret(): string {
        return process.env.JWT_SECRET || process.env.JWT_SECRET_KEY || '';
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(
            IS_PUBLIC_KEY,
            [
                context.getHandler(),
                context.getClass(),
            ],
        );

        if (isPublic) {
            return true;
        }

        const request = context.switchToHttp().getRequest<RequestWithUser>();
        const authorizationHeader = request.headers.authorization;

        if (!authorizationHeader || typeof authorizationHeader !== 'string') {
            throw new UnauthorizedException('Access token is required');
        }

        const [scheme, token] = authorizationHeader.split(' ');

        if (scheme !== 'Bearer' || !token) {
            throw new UnauthorizedException('Invalid authorization header');
        }

        try {
            const payload = await this.jwtService.verifyAsync<TokenPayload>(token, {
                secret: this.getAccessSecret(),
            });

            request.user = payload;

            return true;
        } catch (error) {
            if (error instanceof Error && error.name === 'TokenExpiredError') {
                throw new UnauthorizedException('Access token expired');
            }

            throw new UnauthorizedException('Invalid access token');
        }
    }
}