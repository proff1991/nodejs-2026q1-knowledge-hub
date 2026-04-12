import {
  Injectable
  , NotFoundException
  , UnprocessableEntityException
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { Comment } from './entities/comment.entity';
import { ListCommentQueryDto } from './dto/list-comment-query.dto';

type PaginatedCommentResponse = {
  total: number;
  page: number;
  limit: number;
  data: Comment[];
};

type DbComment = {
  id: string;
  content: string;
  articleId: string;
  authorId: string | null;
  createdAt: Date;
};

@Injectable()
export class CommentService {
  constructor(private readonly prisma: PrismaService) { }

  private toResponse(comment: DbComment): Comment {
    return {
      id: comment.id,
      content: comment.content,
      articleId: comment.articleId,
      authorId: comment.authorId,
      createdAt: comment.createdAt.getTime(),
    };
  }

  async create(createCommentDto: CreateCommentDto): Promise<Comment> {
    var article = await this.prisma.article.findUnique({
      where: { id: createCommentDto.articleId },
    });

    if (!article) {
      throw new UnprocessableEntityException('Article not found');
    }

    var comment = await this.prisma.comment.create({
      data: {
        content: createCommentDto.content,
        articleId: createCommentDto.articleId,
        authorId:
          typeof createCommentDto.authorId === 'undefined'
            ? null
            : createCommentDto.authorId,
      },
    });

    return this.toResponse(comment);
  }

  async findAll(query: ListCommentQueryDto): Promise<Comment[] | PaginatedCommentResponse> {
    var hasPagination =
      typeof query.page !== 'undefined' || typeof query.limit !== 'undefined';
    var hasSorting =
      typeof query.sortBy !== 'undefined' || typeof query.order !== 'undefined';

    var where = {
      articleId: query.articleId,
    };

    var orderBy = query.sortBy
      ? {
        [query.sortBy]: query.order ?? 'asc',
      }
      : undefined;

    if (!hasPagination && !hasSorting) {
      var comments = await this.prisma.comment.findMany({
        where,
        orderBy,
      });

      return comments.map((comment) => this.toResponse(comment));
    }

    var total = await this.prisma.comment.count({ where });
    var page = Number(query.page ?? 1);
    var limit = Number((query.limit ?? total) || 1);
    var skip = (page - 1) * limit;

    var comments = await this.prisma.comment.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    });

    return {
      total,
      page,
      limit,
      data: comments.map((comment) => this.toResponse(comment)),
    };
  }

  async findOne(id: string): Promise<Comment> {
    var comment = await this.prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return this.toResponse(comment);
  }

  async remove(id: string): Promise<void> {
    var comment = await this.prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    await this.prisma.comment.delete({
      where: { id },
    });
  }

  async removeByArticleId(articleId: string): Promise<void> {
    await this.prisma.comment.deleteMany({
      where: { articleId },
    });
  }

  async removeByAuthorId(authorId: string): Promise<void> {
    await this.prisma.comment.deleteMany({
      where: { authorId },
    });
  }
}