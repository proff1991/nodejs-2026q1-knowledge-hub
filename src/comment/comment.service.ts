import { randomUUID } from 'node:crypto';
import {
  forwardRef
  , Inject
  , Injectable
  , NotFoundException
  , UnprocessableEntityException
} from '@nestjs/common';
import { ArticleService } from '../article/article.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { Comment } from './entities/comment.entity';

@Injectable()
export class CommentService {
  private readonly comments: Map<string, Comment> = new Map();

  constructor(
    @Inject(forwardRef(() => ArticleService))
    private readonly articleService: ArticleService,
  ) { }

  create(createCommentDto: CreateCommentDto): Comment {
    try {
      this.articleService.findOne(createCommentDto.articleId);
    } catch {
      throw new UnprocessableEntityException('Article not found');
    }

    var comment: Comment = {
      id: randomUUID(),
      content: createCommentDto.content,
      articleId: createCommentDto.articleId,
      authorId:
        typeof createCommentDto.authorId === 'undefined'
          ? null
          : createCommentDto.authorId,
      createdAt: Date.now(),
    };

    this.comments.set(comment.id, comment);

    return comment;
  }

  findAll(articleId: string): Comment[] {
    return Array.from(this.comments.values()).filter(
      (comment) => comment.articleId === articleId,
    );
  }

  findOne(id: string): Comment {
    var comment = this.comments.get(id);

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return comment;
  }

  remove(id: string): void {
    var comment = this.comments.get(id);

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    this.comments.delete(id);
  }

  removeByArticleId(articleId: string): void {
    for (var [commentId, comment] of this.comments.entries()) {
      if (comment.articleId === articleId) {
        this.comments.delete(commentId);
      }
    }
  }
}