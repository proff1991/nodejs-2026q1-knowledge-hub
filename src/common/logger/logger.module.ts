import { Module } from '@nestjs/common';
import { AppLoggerService } from './app-logger.service';
import { FileLogWriterService } from './file-log-writer.service';

@Module({
    providers: [
        AppLoggerService,
        FileLogWriterService,
    ],
    exports: [
        AppLoggerService,
        FileLogWriterService,
    ],
})
export class LoggerModule { }