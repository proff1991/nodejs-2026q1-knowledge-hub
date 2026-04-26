import { describe, expect, it, vi } from 'vitest';
import { setupProcessErrorHandlers } from '../../../src/common/process/process-error-handlers';
import { AppLoggerService } from '../../../src/common/logger/app-logger.service';

type MockFunction = ReturnType<typeof vi.fn>;

type ProcessErrorEvent = 'uncaughtException' | 'unhandledRejection';

type ProcessListener = (...args: unknown[]) => void;

type MockProcess = {
    on: (event: ProcessErrorEvent, listener: ProcessListener) => unknown;
    exit: (code?: number) => unknown;
};

type MockApp = {
    close: MockFunction;
};

type MockLogger = {
    fatal: MockFunction;
    error: MockFunction;
};

var createProcessMock = (): {
    processMock: MockProcess;
    listeners: Record<ProcessErrorEvent, ProcessListener>;
} => {
    var listeners = {} as Record<ProcessErrorEvent, ProcessListener>;

    var processMock: MockProcess = {
        on: vi.fn((event: ProcessErrorEvent, listener: ProcessListener) => {
            listeners[event] = listener;

            return processMock;
        }),
        exit: vi.fn(),
    };

    return {
        processMock,
        listeners,
    };
};

var createAppMock = (): MockApp => ({
    close: vi.fn().mockResolvedValue(undefined),
});

var createLoggerMock = (): MockLogger => ({
    fatal: vi.fn(),
    error: vi.fn(),
});

describe('setupProcessErrorHandlers', () => {
    it('should register uncaughtException and unhandledRejection handlers', () => {
        var app = createAppMock();
        var logger = createLoggerMock();
        var { processMock } = createProcessMock();

        setupProcessErrorHandlers(
            app as never,
            logger as unknown as AppLoggerService,
            processMock,
        );

        expect(processMock.on).toHaveBeenCalledWith(
            'uncaughtException',
            expect.any(Function),
        );

        expect(processMock.on).toHaveBeenCalledWith(
            'unhandledRejection',
            expect.any(Function),
        );
    });

    it('should log fatal error, close app and exit on uncaughtException', async () => {
        var app = createAppMock();
        var logger = createLoggerMock();
        var { processMock, listeners } = createProcessMock();
        var error = new Error('Unexpected failure');

        setupProcessErrorHandlers(
            app as never,
            logger as unknown as AppLoggerService,
            processMock,
        );

        listeners.uncaughtException(error);

        await vi.waitFor(() => {
            expect(processMock.exit).toHaveBeenCalledWith(1);
        });

        expect(logger.fatal).toHaveBeenCalledWith(
            'Process uncaughtException',
            expect.any(String),
            'ProcessErrorHandler',
            {
                message: 'Unexpected failure',
            },
        );

        expect(app.close).toHaveBeenCalledTimes(1);
        expect(logger.error).not.toHaveBeenCalled();
    });

    it('should log fatal error, close app and exit on unhandledRejection', async () => {
        var app = createAppMock();
        var logger = createLoggerMock();
        var { processMock, listeners } = createProcessMock();

        setupProcessErrorHandlers(
            app as never,
            logger as unknown as AppLoggerService,
            processMock,
        );

        listeners.unhandledRejection('Rejected promise');

        await vi.waitFor(() => {
            expect(processMock.exit).toHaveBeenCalledWith(1);
        });

        expect(logger.fatal).toHaveBeenCalledWith(
            'Process unhandledRejection',
            expect.any(String),
            'ProcessErrorHandler',
            {
                message: 'Rejected promise',
            },
        );

        expect(app.close).toHaveBeenCalledTimes(1);
    });

    it('should log close error and still exit', async () => {
        var app = {
            close: vi.fn().mockRejectedValue(new Error('Close failed')),
        };
        var logger = createLoggerMock();
        var { processMock, listeners } = createProcessMock();

        setupProcessErrorHandlers(
            app as never,
            logger as unknown as AppLoggerService,
            processMock,
        );

        listeners.uncaughtException(new Error('Fatal error'));

        await vi.waitFor(() => {
            expect(processMock.exit).toHaveBeenCalledWith(1);
        });

        expect(logger.error).toHaveBeenCalledWith(
            'Failed to close application during process shutdown',
            expect.any(String),
            'ProcessErrorHandler',
            {
                message: 'Close failed',
            },
        );
    });

    it('should ignore repeated process errors during shutdown', async () => {
        var app = createAppMock();
        var logger = createLoggerMock();
        var { processMock, listeners } = createProcessMock();

        setupProcessErrorHandlers(
            app as never,
            logger as unknown as AppLoggerService,
            processMock,
        );

        listeners.uncaughtException(new Error('First error'));
        listeners.unhandledRejection(new Error('Second error'));

        await vi.waitFor(() => {
            expect(processMock.exit).toHaveBeenCalledWith(1);
        });

        expect(logger.fatal).toHaveBeenCalledTimes(1);
        expect(app.close).toHaveBeenCalledTimes(1);
        expect(processMock.exit).toHaveBeenCalledTimes(1);
    });
});