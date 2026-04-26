import {
    BadRequestException
    , ForbiddenException
    , NotFoundException
    , UnauthorizedException
    , UnprocessableEntityException
} from '@nestjs/common';

export class AppBadRequestError extends BadRequestException {
    constructor(message = 'Bad request') {
        super(message);
    }
}

export class AppNotFoundError extends NotFoundException {
    constructor(message = 'Resource not found') {
        super(message);
    }
}

export class AppForbiddenError extends ForbiddenException {
    constructor(message = 'Forbidden') {
        super(message);
    }
}

export class AppUnauthorizedError extends UnauthorizedException {
    constructor(message = 'Unauthorized') {
        super(message);
    }
}

export class AppUnprocessableEntityError extends UnprocessableEntityException {
    constructor(message = 'Unprocessable entity') {
        super(message);
    }
}