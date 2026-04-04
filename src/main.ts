import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

var bootstrap = async (): Promise<void> => {
  var app = await NestFactory.create(AppModule);
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

  await app.listen(port);
};

bootstrap();