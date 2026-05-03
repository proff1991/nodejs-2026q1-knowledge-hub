import { INestApplication } from '@nestjs/common';
import { AppLoggerService } from '../logger/app-logger.service';

type ProcessErrorEvent = 'uncaughtException' | 'unhandledRejection';

type ProcessLike = {
    on: (
        event: ProcessErrorEvent,
        listener: (...args: unknown[]) => void,
    ) => unknown;
    exit: (code?: number) => unknown;
};

export let setupProcessErrorHandlers = (
    app: Pick<INestApplication, 'close'>,
    logger: AppLoggerService,
    processRef: ProcessLike = process,
): void => {
    var isShuttingDown = false;

    var shutdown = async (
        event: ProcessErrorEvent,
        reason: unknown,
    ): Promise<void> => {
        if (isShuttingDown) {
            return;
        }

        isShuttingDown = true;

        var error = normalizeProcessError(reason);

        logger.fatal(
            `Process ${event}`,
            error.stack ?? 'No stack trace',
            'ProcessErrorHandler',
            {
                message: error.message,
            },
        );

        try {
            await app.close();
        } catch (closeError) {
            var normalizedCloseError = normalizeProcessError(closeError);

            logger.error(
                'Failed to close application during process shutdown',
                normalizedCloseError.stack ?? 'No stack trace',
                'ProcessErrorHandler',
                {
                    message: normalizedCloseError.message,
                },
            );
        }

        processRef.exit(1);
    };

    processRef.on('uncaughtException', (error: unknown) => {
        void shutdown('uncaughtException', error);
    });

    processRef.on('unhandledRejection', (reason: unknown) => {
        void shutdown('unhandledRejection', reason);
    });
};

let normalizeProcessError = (reason: unknown): Error => {
    if (reason instanceof Error) {
        return reason;
    }

    if (typeof reason === 'string') {
        return new Error(reason);
    }

    try {
        return new Error(JSON.stringify(reason));
    } catch (_error) {
        return new Error(String(reason));
    }
};