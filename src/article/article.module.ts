import { Module, forwardRef } from '@nestjs/common';
import { ArticleService } from './article.service';
import { ArticleController } from './article.controller';
import { CommentModule } from '../comment/comment.module';

@Module({
  imports: [forwardRef(() => CommentModule)],
  controllers: [ArticleController],
  providers: [ArticleService],
  exports: [ArticleService],
})
export class ArticleModule { }