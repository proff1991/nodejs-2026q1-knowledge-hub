import { randomUUID } from 'node:crypto';
import {
  Inject
  , Injectable
  , NotFoundException
  , forwardRef
} from '@nestjs/common';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { Article, ArticleStatus } from './entities/article.entity';
import { CommentService } from '../comment/comment.service';
import { ListArticleQueryDto } from './dto/list-article-query.dto';

type PaginatedArticleResponse = {
  total: number;
  page: number;
  limit: number;
  data: Article[];
};

@Injectable()
export class ArticleService {
  private readonly articles: Map<string, Article> = new Map();

  constructor(
    @Inject(forwardRef(() => CommentService))
    private readonly commentService: CommentService,
  ) { }

  create(createArticleDto: CreateArticleDto): Article {
    var now = Date.now();
    var article: Article = {
      id: randomUUID(),
      title: createArticleDto.title,
      content: createArticleDto.content,
      status: createArticleDto.status ?? ArticleStatus.DRAFT,
      authorId:
        typeof createArticleDto.authorId === 'undefined'
          ? null
          : createArticleDto.authorId,
      categoryId:
        typeof createArticleDto.categoryId === 'undefined'
          ? null
          : createArticleDto.categoryId,
      tags: createArticleDto.tags ? [...createArticleDto.tags] : [],
      createdAt: now,
      updatedAt: now,
    };

    this.articles.set(article.id, article);

    return {
      ...article,
      tags: [...article.tags],
    };
  }

  findAll(query?: ListArticleQueryDto): Article[] | PaginatedArticleResponse {
    var articles = Array.from(this.articles.values()).map((article) => ({
      ...article,
      tags: [...article.tags],
    }));
    var hasPagination =
      typeof query?.page !== 'undefined' || typeof query?.limit !== 'undefined';
    var hasSorting =
      typeof query?.sortBy !== 'undefined' || typeof query?.order !== 'undefined';

    if (typeof query?.status !== 'undefined') {
      articles = articles.filter((article) => article.status === query.status);
    }

    if (typeof query?.categoryId !== 'undefined') {
      articles = articles.filter(
        (article) => article.categoryId === query.categoryId,
      );
    }

    if (typeof query?.tag !== 'undefined') {
      articles = articles.filter((article) => article.tags.includes(query.tag!));
    }

    if (query?.sortBy) {
      var order = query.order ?? 'asc';

      articles.sort((a, b) => {
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
      return articles;
    }

    var page = Number(query?.page ?? 1);
    var limit = Number((query?.limit ?? articles.length) || 1);
    var total = articles.length;
    var start = (page - 1) * limit;
    var end = start + limit;
    var data = articles.slice(start, end);

    return {
      total,
      page,
      limit,
      data,
    };
  }

  findOne(id: string): Article {
    var article = this.articles.get(id);

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    return {
      ...article,
      tags: [...article.tags],
    };
  }

  update(id: string, updateArticleDto: UpdateArticleDto): Article {
    var article = this.articles.get(id);

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    if (typeof updateArticleDto.title !== 'undefined') {
      article.title = updateArticleDto.title;
    }

    if (typeof updateArticleDto.content !== 'undefined') {
      article.content = updateArticleDto.content;
    }

    if (typeof updateArticleDto.status !== 'undefined') {
      article.status = updateArticleDto.status;
    }

    if (typeof updateArticleDto.authorId !== 'undefined') {
      article.authorId = updateArticleDto.authorId;
    }

    if (typeof updateArticleDto.categoryId !== 'undefined') {
      article.categoryId = updateArticleDto.categoryId;
    }

    if (typeof updateArticleDto.tags !== 'undefined') {
      article.tags = [...updateArticleDto.tags];
    }

    article.updatedAt = Date.now();

    this.articles.set(article.id, article);

    return {
      ...article,
      tags: [...article.tags],
    };
  }

  nullifyCategoryId(categoryId: string): void {
    for (var article of this.articles.values()) {
      if (article.categoryId === categoryId) {
        article.categoryId = null;
        article.updatedAt = Date.now();
        this.articles.set(article.id, article);
      }
    }
  }

  nullifyAuthorId(authorId: string): void {
    for (var article of this.articles.values()) {
      if (article.authorId === authorId) {
        article.authorId = null;
        article.updatedAt = Date.now();
        this.articles.set(article.id, article);
      }
    }
  }

  remove(id: string): void {
    var article = this.articles.get(id);

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    this.commentService.removeByArticleId(id);
    this.articles.delete(id);
  }
}