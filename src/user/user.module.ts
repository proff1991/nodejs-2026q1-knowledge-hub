import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { ArticleModule } from '../article/article.module';
import { CommentModule } from '../comment/comment.module';

@Module({
  imports: [ArticleModule, CommentModule],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}