import { readdir, readFile, rm, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FileLogWriterService } from '../../../src/common/logger/file-log-writer.service';

describe('FileLogWriterService', () => {
    var logsDirectory = join(process.cwd(), 'logs');
    var logFilePath = join(logsDirectory, 'app.log');

    beforeEach(async () => {
        process.env.LOG_MAX_FILE_SIZE = '50';

        await rm(logsDirectory, {
            recursive: true,
            force: true,
        });
    });

    afterEach(async () => {
        delete process.env.LOG_MAX_FILE_SIZE;

        await rm(logsDirectory, {
            recursive: true,
            force: true,
        });
    });

    it('should create logs directory and write message to app.log', async () => {
        var service = new FileLogWriterService();

        await service.write('First log message');

        var content = await readFile(logFilePath, 'utf8');

        expect(content).toBe('First log message\n');
    });

    it('should append messages to existing app.log', async () => {
        var service = new FileLogWriterService();

        await service.write('First log message');
        await service.write('Second log message');

        var content = await readFile(logFilePath, 'utf8');

        expect(content).toBe('First log message\nSecond log message\n');
    });

    it('should rotate app.log when file size reaches max limit', async () => {
        var service = new FileLogWriterService();

        await mkdir(logsDirectory, {
            recursive: true,
        });

        await writeFile(logFilePath, 'x'.repeat(60), 'utf8');

        await service.write('New log message');

        var files = await readdir(logsDirectory);
        var rotatedFiles = files.filter((fileName) =>
            /^app-\d{4}-\d{2}-\d{2}T/.test(fileName),
        );

        expect(files).toContain('app.log');
        expect(rotatedFiles).toHaveLength(1);

        var currentLogContent = await readFile(logFilePath, 'utf8');

        expect(currentLogContent).toBe('New log message\n');
    });

    it('should not rotate app.log when LOG_MAX_FILE_SIZE is zero', async () => {
        process.env.LOG_MAX_FILE_SIZE = '0';

        var service = new FileLogWriterService();

        await mkdir(logsDirectory, {
            recursive: true,
        });

        await writeFile(logFilePath, 'x'.repeat(60), 'utf8');

        await service.write('New log message');

        var files = await readdir(logsDirectory);
        var rotatedFiles = files.filter((fileName) =>
            /^app-\d{4}-\d{2}-\d{2}T/.test(fileName),
        );

        expect(files).toContain('app.log');
        expect(rotatedFiles).toHaveLength(0);

        var currentLogContent = await readFile(logFilePath, 'utf8');

        expect(currentLogContent).toBe(`${'x'.repeat(60)}New log message\n`);
    });
});