import { Injectable } from '@nestjs/common';
import { appendFile, mkdir, rename, stat } from 'node:fs/promises';
import { join } from 'node:path';

@Injectable()
export class FileLogWriterService {
    private readonly logsDirectory = join(process.cwd(), 'logs');
    private readonly logFilePath = join(this.logsDirectory, 'app.log');

    async write(message: string): Promise<void> {
        await this.ensureLogsDirectory();
        await this.rotateIfNeeded();
        await appendFile(this.logFilePath, `${message}\n`, 'utf8');
    }

    private async ensureLogsDirectory(): Promise<void> {
        await mkdir(this.logsDirectory, {
            recursive: true,
        });
    }

    private async rotateIfNeeded(): Promise<void> {
        var maxFileSize = this.getMaxFileSize();

        if (maxFileSize <= 0) {
            return;
        }

        var currentFileSize = await this.getCurrentFileSize();

        if (currentFileSize < maxFileSize) {
            return;
        }

        var rotatedFilePath = join(
            this.logsDirectory,
            `app-${this.getTimestampForFileName()}.log`,
        );

        await rename(this.logFilePath, rotatedFilePath);
    }

    private async getCurrentFileSize(): Promise<number> {
        try {
            var fileStat = await stat(this.logFilePath);

            return fileStat.size;
        } catch (error) {
            var nodeError = error as NodeJS.ErrnoException;

            if (nodeError.code === 'ENOENT') {
                return 0;
            }

            throw error;
        }
    }

    private getMaxFileSize(): number {
        var rawMaxFileSize = process.env.LOG_MAX_FILE_SIZE;
        var parsedMaxFileSize = Number(rawMaxFileSize);

        if (!Number.isFinite(parsedMaxFileSize)) {
            return 1048576;
        }

        return parsedMaxFileSize;
    }

    private getTimestampForFileName(): string {
        return new Date()
            .toISOString()
            .replace(/:/g, '-')
            .replace(/\./g, '-');
    }
}