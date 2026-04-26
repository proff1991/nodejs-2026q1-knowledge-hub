import {
    BadRequestException
    , ForbiddenException
    , NotFoundException
    , UnauthorizedException
    , UnprocessableEntityException
} from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import {
    AppBadRequestError,
    AppForbiddenError,
    AppNotFoundError,
    AppUnauthorizedError,
    AppUnprocessableEntityError,
} from '../../../src/common/errors/application-errors';

describe('application errors', () => {
    it('should create AppBadRequestError', () => {
        var error = new AppBadRequestError('Invalid payload');

        expect(error).toBeInstanceOf(BadRequestException);
        expect(error.getStatus()).toBe(400);
        expect(error.message).toBe('Invalid payload');
    });

    it('should create AppNotFoundError', () => {
        var error = new AppNotFoundError('Article not found');

        expect(error).toBeInstanceOf(NotFoundException);
        expect(error.getStatus()).toBe(404);
        expect(error.message).toBe('Article not found');
    });

    it('should create AppForbiddenError', () => {
        var error = new AppForbiddenError('Access denied');

        expect(error).toBeInstanceOf(ForbiddenException);
        expect(error.getStatus()).toBe(403);
        expect(error.message).toBe('Access denied');
    });

    it('should create AppUnauthorizedError', () => {
        var error = new AppUnauthorizedError('Access token is missing');

        expect(error).toBeInstanceOf(UnauthorizedException);
        expect(error.getStatus()).toBe(401);
        expect(error.message).toBe('Access token is missing');
    });

    it('should create AppUnprocessableEntityError', () => {
        var error = new AppUnprocessableEntityError('Article does not exist');

        expect(error).toBeInstanceOf(UnprocessableEntityException);
        expect(error.getStatus()).toBe(422);
        expect(error.message).toBe('Article does not exist');
    });
});