import {
    CanActivate
    , ExecutionContext
    , Injectable
} from '@nestjs/common';
import {
    AppForbiddenError
    , AppUnauthorizedError
} from '../../common/errors/application-errors';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { UserRole } from '../../user/dto/create-user.dto';

type TokenPayload = {
    userId: string;
    login: string;
    role: UserRole;
};

type RequestWithUser = Request & {
    user?: TokenPayload;
    body: {
        authorId?: string | null;
        [key: string]: unknown;
    };
};

@Injectable()
export class RbacGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly prisma: PrismaService,
    ) { }

    private isSwaggerPath(pathname: string): boolean {
        return (
            pathname === '/doc' ||
            pathname.startsWith('/doc/') ||
            pathname.startsWith('/doc-')
        );
    }

    private getResource(request: Request): string {
        const pathname = (request.originalUrl || request.url || '').split('?')[0];
        const segments = pathname.split('/').filter(Boolean);

        return segments[0] || '';
    }

    private forbid(): never {
        throw new AppForbiddenError('Insufficient permissions');
    }

    private async ensureArticleOwner(articleId: string, userId: string): Promise<void> {
        const article = await this.prisma.article.findUnique({
            where: { id: articleId },
            select: { authorId: true },
        });

        if (!article || article.authorId !== userId) {
            this.forbid();
        }
    }

    private async ensureCommentOwner(commentId: string, userId: string): Promise<void> {
        const comment = await this.prisma.comment.findUnique({
            where: { id: commentId },
            select: { authorId: true },
        });

        if (!comment || comment.authorId !== userId) {
            this.forbid();
        }
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<RequestWithUser>();
        const pathname = request.path ?? request.originalUrl ?? '';

        if (this.isSwaggerPath(pathname)) {
            return true;
        }

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

        const user = request.user;

        if (!user) {
            throw new AppUnauthorizedError('Access token is required');
        }

        if (user.role === UserRole.ADMIN) {
            return true;
        }

        if (request.method === 'GET') {
            return true;
        }

        if (user.role === UserRole.VIEWER) {
            this.forbid();
        }

        const resource = this.getResource(request);

        if (resource === 'category' || resource === 'user') {
            this.forbid();
        }

        if (resource === 'article') {
            if (request.method === 'POST') {
                request.body.authorId = user.userId;
                return true;
            }

            if (request.method === 'PUT') {
                await this.ensureArticleOwner(request.params.id, user.userId);
                request.body.authorId = user.userId;
                return true;
            }

            if (request.method === 'DELETE') {
                await this.ensureArticleOwner(request.params.id, user.userId);
                return true;
            }

            this.forbid();
        }

        if (resource === 'comment') {
            if (request.method === 'POST') {
                request.body.authorId = user.userId;
                return true;
            }

            if (request.method === 'DELETE') {
                await this.ensureCommentOwner(request.params.id, user.userId);
                return true;
            }

            this.forbid();
        }

        this.forbid();
    }
}