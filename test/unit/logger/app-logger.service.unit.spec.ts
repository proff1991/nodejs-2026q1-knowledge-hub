import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppLoggerService } from '../../../src/common/logger/app-logger.service';
import { FileLogWriterService } from '../../../src/common/logger/file-log-writer.service';

type MockFunction = ReturnType<typeof vi.fn>;

describe('AppLoggerService', () => {
    var logger: AppLoggerService;

    var fileLogWriterMock: {
        write: MockFunction;
    };

    var consoleLogSpy: MockFunction;
    var consoleDebugSpy: MockFunction;
    var consoleWarnSpy: MockFunction;
    var consoleErrorSpy: MockFunction;

    beforeEach(() => {
        process.env.LOG_LEVEL = 'debug';

        fileLogWriterMock = {
            write: vi.fn().mockResolvedValue(undefined),
        };

        consoleLogSpy = vi
            .spyOn(console, 'log')
            .mockImplementation(() => undefined) as unknown as MockFunction;

        consoleDebugSpy = vi
            .spyOn(console, 'debug')
            .mockImplementation(() => undefined) as unknown as MockFunction;

        consoleWarnSpy = vi
            .spyOn(console, 'warn')
            .mockImplementation(() => undefined) as unknown as MockFunction;

        consoleErrorSpy = vi
            .spyOn(console, 'error')
            .mockImplementation(() => undefined) as unknown as MockFunction;

        logger = new AppLoggerService(
            fileLogWriterMock as unknown as FileLogWriterService,
        );

        vi.clearAllMocks();
    });

    afterEach(() => {
        delete process.env.LOG_LEVEL;

        vi.restoreAllMocks();
    });

    it('should write log message to console and file', async () => {
        logger.log('Application started', 'Bootstrap');

        await vi.waitFor(() => {
            expect(fileLogWriterMock.write).toHaveBeenCalledTimes(1);
        });

        expect(consoleLogSpy).toHaveBeenCalledTimes(1);
        expect(consoleLogSpy.mock.calls[0][0]).toContain('LOG [Bootstrap]');
        expect(consoleLogSpy.mock.calls[0][0]).toContain('Application started');

        var filePayload = JSON.parse(fileLogWriterMock.write.mock.calls[0][0]);

        expect(filePayload).toEqual({
            timestamp: expect.any(String),
            level: 'log',
            message: 'Application started',
            context: 'Bootstrap',
        });
    });

    it('should respect LOG_LEVEL and skip lower priority logs', async () => {
        process.env.LOG_LEVEL = 'warn';

        logger.debug('Debug message', 'TestContext');
        logger.verbose('Verbose message', 'TestContext');
        logger.log('Log message', 'TestContext');

        expect(consoleDebugSpy).not.toHaveBeenCalled();
        expect(consoleLogSpy).not.toHaveBeenCalled();
        expect(fileLogWriterMock.write).not.toHaveBeenCalled();
    });

    it('should allow warn, error and fatal when LOG_LEVEL is warn', async () => {
        process.env.LOG_LEVEL = 'warn';

        logger.warn('Warning message', 'TestContext');
        logger.error('Error message', 'Error stack', 'TestContext');
        logger.fatal('Fatal message', 'Fatal stack', 'TestContext');

        await vi.waitFor(() => {
            expect(fileLogWriterMock.write).toHaveBeenCalledTimes(3);
        });

        expect(consoleWarnSpy).toHaveBeenCalledTimes(1);
        expect(consoleErrorSpy).toHaveBeenCalledTimes(2);

        var warnPayload = JSON.parse(fileLogWriterMock.write.mock.calls[0][0]);
        var errorPayload = JSON.parse(fileLogWriterMock.write.mock.calls[1][0]);
        var fatalPayload = JSON.parse(fileLogWriterMock.write.mock.calls[2][0]);

        expect(warnPayload.level).toBe('warn');
        expect(errorPayload.level).toBe('error');
        expect(fatalPayload.level).toBe('fatal');
    });

    it('should fallback to log level when LOG_LEVEL is invalid', async () => {
        process.env.LOG_LEVEL = 'invalid-level';

        logger.debug('Debug message', 'TestContext');
        logger.log('Log message', 'TestContext');

        await vi.waitFor(() => {
            expect(fileLogWriterMock.write).toHaveBeenCalledTimes(1);
        });

        expect(consoleDebugSpy).not.toHaveBeenCalled();
        expect(consoleLogSpy).toHaveBeenCalledTimes(1);

        var filePayload = JSON.parse(fileLogWriterMock.write.mock.calls[0][0]);

        expect(filePayload.level).toBe('log');
        expect(filePayload.message).toBe('Log message');
    });

    it('should sanitize sensitive metadata before writing logs', async () => {
        logger.log('Login request', 'AuthController', {
            login: 'alex',
            password: 'secret-password',
            accessToken: 'access-token',
            nested: {
                refreshToken: 'refresh-token',
            },
        });

        await vi.waitFor(() => {
            expect(fileLogWriterMock.write).toHaveBeenCalledTimes(1);
        });

        var consoleOutput = consoleLogSpy.mock.calls[0][0];
        var filePayload = JSON.parse(fileLogWriterMock.write.mock.calls[0][0]);

        expect(consoleOutput).toContain('[REDACTED]');
        expect(consoleOutput).not.toContain('secret-password');
        expect(consoleOutput).not.toContain('access-token');
        expect(consoleOutput).not.toContain('refresh-token');

        expect(filePayload.data).toEqual([
            {
                login: 'alex',
                password: '[REDACTED]',
                accessToken: '[REDACTED]',
                nested: {
                    refreshToken: '[REDACTED]',
                },
            },
        ]);
    });

    it('should normalize Error message and stack', async () => {
        var error = new Error('Something failed');

        logger.error(error, 'Custom stack', 'ErrorContext');

        await vi.waitFor(() => {
            expect(fileLogWriterMock.write).toHaveBeenCalledTimes(1);
        });

        expect(consoleErrorSpy).toHaveBeenCalledTimes(1);

        var filePayload = JSON.parse(fileLogWriterMock.write.mock.calls[0][0]);

        expect(filePayload).toEqual({
            timestamp: expect.any(String),
            level: 'error',
            message: 'Something failed',
            context: 'ErrorContext',
            stack: 'Custom stack',
        });
    });

    it('should stringify object messages and redact sensitive fields', async () => {
        logger.log({
            event: 'auth',
            password: 'secret-password',
        });

        await vi.waitFor(() => {
            expect(fileLogWriterMock.write).toHaveBeenCalledTimes(1);
        });

        var filePayload = JSON.parse(fileLogWriterMock.write.mock.calls[0][0]);

        expect(filePayload.message).toBe(
            '{"event":"auth","password":"[REDACTED]"}',
        );
    });

    it('should handle file write errors without throwing', async () => {
        fileLogWriterMock.write.mockRejectedValue(new Error('disk error'));

        expect(() => logger.log('Application started')).not.toThrow();

        await vi.waitFor(() => {
            expect(consoleErrorSpy).toHaveBeenCalledWith(
                '[LOGGER_ERROR] Failed to write log file',
                'disk error',
            );
        });
    });
});