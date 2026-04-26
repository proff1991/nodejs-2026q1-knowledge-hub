import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { PasswordExcludeInterceptor } from './common/interceptors/password-exclude.interceptor';
import { AppLoggerService } from './common/logger/app-logger.service';

var bootstrap = async (): Promise<void> => {
  var app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  var logger = app.get(AppLoggerService);

  app.useLogger(logger);

  var rawPort = process.env.PORT;
  var port = rawPort ? Number(rawPort) : 4000;

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('PORT must be a positive integer');
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalInterceptors(new PasswordExcludeInterceptor());

  var config = new DocumentBuilder()
    .setTitle('Knowledge Hub API')
    .setDescription('REST API for the Knowledge Hub platform')
    .setVersion('1.0')
    .addBearerAuth({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      name: 'Authorization',
      description: 'Enter JWT access token',
      in: 'header',
    })
    .build();

  var documentFactory = (): ReturnType<typeof SwaggerModule.createDocument> =>
    SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('doc', app, documentFactory);

  await app.listen(port);
};

bootstrap();