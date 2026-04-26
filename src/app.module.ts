import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { CategoryModule } from './category/category.module';
import { ArticleModule } from './article/article.module';
import { CommentModule } from './comment/comment.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { LoggerModule } from './common/logger/logger.module';

@Module({
  imports: [PrismaModule, UserModule, CategoryModule, ArticleModule, CommentModule, AuthModule, LoggerModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }