import { randomUUID } from 'node:crypto';
import {
  Inject,
  Injectable,
  NotFoundException,
  forwardRef,
} from '@nestjs/common';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { Article, ArticleStatus } from './entities/article.entity';
import { CommentService } from '../comment/comment.service';

type ArticleFilters = {
  status?: string;
  categoryId?: string;
  tag?: string;
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

  findAll(filters: ArticleFilters = {}): Article[] {
    var articles = Array.from(this.articles.values());

    if (typeof filters.status !== 'undefined') {
      articles = articles.filter((article) => article.status === filters.status);
    }

    if (typeof filters.categoryId !== 'undefined') {
      articles = articles.filter(
        (article) => article.categoryId === filters.categoryId,
      );
    }

    if (typeof filters.tag !== 'undefined') {
      articles = articles.filter((article) => article.tags.includes(filters.tag!));
    }

    return articles.map((article) => ({
      ...article,
      tags: [...article.tags],
    }));
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

  remove(id: string): void {
    var article = this.articles.get(id);

    if (!article) {
      throw new NotFoundException('Article not found');
    }

    this.commentService.removeByArticleId(id);
    this.articles.delete(id);
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
}