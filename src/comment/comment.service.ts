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
import { ListCommentQueryDto } from './dto/list-comment-query.dto';

type PaginatedCommentResponse = {
  total: number;
  page: number;
  limit: number;
  data: Comment[];
};

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

  findAll(query: ListCommentQueryDto): Comment[] | PaginatedCommentResponse {
    var comments = Array.from(this.comments.values()).filter(
      (comment) => comment.articleId === query.articleId,
    );
    var hasPagination =
      typeof query.page !== 'undefined' || typeof query.limit !== 'undefined';
    var hasSorting =
      typeof query.sortBy !== 'undefined' || typeof query.order !== 'undefined';

    if (query.sortBy) {
      var order = query.order ?? 'asc';

      comments.sort((a, b) => {
        var left = a[query.sortBy!];
        var right = b[query.sortBy!];

        if (typeof left === 'number' && typeof right === 'number') {
          var numericResult = left - right;
          return order === 'desc' ? numericResult * -1 : numericResult;
        }

        var stringResult = String(left).localeCompare(String(right));
        return order === 'desc' ? stringResult * -1 : stringResult;
      });
    }

    if (!hasPagination && !hasSorting) {
      return comments;
    }

    var page = query.page ?? 1;
    var limit = (query.limit ?? comments.length) || 1;
    var total = comments.length;
    var start = (page - 1) * limit;
    var end = start + limit;
    var data = comments.slice(start, end);

    return {
      total,
      page,
      limit,
      data,
    };
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

  removeByAuthorId(authorId: string): void {
    for (var [commentId, comment] of this.comments.entries()) {
      if (comment.authorId === authorId) {
        this.comments.delete(commentId);
      }
    }
  }
}