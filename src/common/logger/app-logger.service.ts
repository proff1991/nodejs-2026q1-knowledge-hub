import { Injectable, LoggerService } from '@nestjs/common';
import { FileLogWriterService } from './file-log-writer.service';
import { sanitizeLogData } from './sanitize-log-data.util';

type AppLogLevel = 'debug' | 'verbose' | 'log' | 'warn' | 'error' | 'fatal';

type LogEntry = {
    timestamp: string;
    level: AppLogLevel;
    message: string;
    context?: string;
    stack?: string;
    data?: unknown;
};

type ParsedOptionalParams = {
    context?: string;
    stack?: string;
    data?: unknown[];
};

@Injectable()
export class AppLoggerService implements LoggerService {
    private readonly logLevelPriorities: Record<AppLogLevel, number> = {
        debug: 0,
        verbose: 1,
        log: 2,
        warn: 3,
        error: 4,
        fatal: 5,
    };

    private readonly allowedLogLevels: AppLogLevel[] = [
        'debug',
        'verbose',
        'log',
        'warn',
        'error',
        'fatal',
    ];

    private readonly consoleWriters: Record<AppLogLevel, (message: string) => void> = {
        debug: console.debug.bind(console),
        verbose: console.log.bind(console),
        log: console.log.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console),
        fatal: console.error.bind(console),
    };

    constructor(private readonly fileLogWriterService: FileLogWriterService) { }

    log(message: any, ...optionalParams: any[]): void {
        this.writeLog('log', message, optionalParams);
    }

    debug(message: any, ...optionalParams: any[]): void {
        this.writeLog('debug', message, optionalParams);
    }

    verbose(message: any, ...optionalParams: any[]): void {
        this.writeLog('verbose', message, optionalParams);
    }

    warn(message: any, ...optionalParams: any[]): void {
        this.writeLog('warn', message, optionalParams);
    }

    error(message: any, ...optionalParams: any[]): void {
        this.writeLog('error', message, optionalParams);
    }

    fatal(message: any, ...optionalParams: any[]): void {
        this.writeLog('fatal', message, optionalParams);
    }

    private writeLog(
        level: AppLogLevel,
        message: unknown,
        optionalParams: unknown[],
    ): void {
        if (!this.shouldLog(level)) {
            return;
        }

        var parsedParams = this.parseOptionalParams(level, optionalParams);
        var entry = this.createLogEntry(level, message, parsedParams);

        this.writeToConsole(entry);

        void this.writeToFile(entry).catch((error) => {
            console.error(
                '[LOGGER_ERROR] Failed to write log file',
                error instanceof Error ? error.message : error,
            );
        });
    }

    private shouldLog(level: AppLogLevel): boolean {
        var configuredLevel = this.getConfiguredLogLevel();

        return (
            this.logLevelPriorities[level] >=
            this.logLevelPriorities[configuredLevel]
        );
    }

    private getConfiguredLogLevel(): AppLogLevel {
        var rawLogLevel = process.env.LOG_LEVEL;

        if (typeof rawLogLevel !== 'string') {
            return 'log';
        }

        var normalizedLogLevel = rawLogLevel.toLowerCase() as AppLogLevel;

        if (!this.allowedLogLevels.includes(normalizedLogLevel)) {
            return 'log';
        }

        return normalizedLogLevel;
    }

    private parseOptionalParams(
        level: AppLogLevel,
        optionalParams: unknown[],
    ): ParsedOptionalParams {
        var parsedParams: ParsedOptionalParams = {
            data: [],
        };

        optionalParams.forEach((param, index) => {
            if (typeof param === 'string') {
                if (
                    (level === 'error' || level === 'fatal') &&
                    index === 0
                ) {
                    parsedParams.stack = param;

                    return;
                }

                if (typeof parsedParams.context === 'undefined') {
                    parsedParams.context = param;

                    return;
                }
            }

            parsedParams.data?.push(param);
        });

        if (parsedParams.data?.length === 0) {
            delete parsedParams.data;
        }

        return parsedParams;
    }

    private createLogEntry(
        level: AppLogLevel,
        message: unknown,
        parsedParams: ParsedOptionalParams,
    ): LogEntry {
        var entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            message: this.normalizeMessage(message),
        };

        if (typeof parsedParams.context !== 'undefined') {
            entry.context = parsedParams.context;
        }

        if (message instanceof Error && typeof message.stack === 'string') {
            entry.stack = message.stack;
        }

        if (typeof parsedParams.stack === 'string') {
            entry.stack = parsedParams.stack;
        }

        if (typeof parsedParams.data !== 'undefined') {
            entry.data = sanitizeLogData(parsedParams.data);
        }

        return entry;
    }

    private normalizeMessage(message: unknown): string {
        if (message instanceof Error) {
            return message.message;
        }

        if (typeof message === 'string') {
            return message;
        }

        return this.safeStringify(sanitizeLogData(message));
    }

    private writeToConsole(entry: LogEntry): void {
        var writer = this.consoleWriters[entry.level];

        writer(this.formatConsoleMessage(entry));
    }

    private async writeToFile(entry: LogEntry): Promise<void> {
        await this.fileLogWriterService.write(this.safeStringify(entry));
    }

    private formatConsoleMessage(entry: LogEntry): string {
        var contextPart =
            typeof entry.context === 'string' ? ` [${entry.context}]` : '';

        var dataPart =
            typeof entry.data !== 'undefined'
                ? ` ${this.safeStringify(entry.data)}`
                : '';

        var stackPart = typeof entry.stack === 'string' ? `\n${entry.stack}` : '';

        return `[${entry.timestamp}] ${entry.level.toUpperCase()}${contextPart}: ${entry.message}${dataPart}${stackPart}`;
    }

    private safeStringify(data: unknown): string {
        try {
            return JSON.stringify(data);
        } catch (_error) {
            return String(data);
        }
    }
}