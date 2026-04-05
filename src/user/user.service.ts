import { randomUUID } from 'node:crypto';
import {
  ForbiddenException
  , Injectable
  , NotFoundException
} from '@nestjs/common';
import { ArticleService } from '../article/article.service';
import { CommentService } from '../comment/comment.service';
import { CreateUserDto, UserRole } from './dto/create-user.dto';
import { ListUserQueryDto } from './dto/list-user-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserResponse } from './entities/user.entity';

type PaginatedUserResponse = {
  total: number;
  page: number;
  limit: number;
  data: UserResponse[];
};

@Injectable()
export class UserService {
  private readonly users: Map<string, User> = new Map();

  constructor(
    private readonly articleService: ArticleService,
    private readonly commentService: CommentService,
  ) { }

  private toResponse(user: User): UserResponse {
    return {
      id: user.id,
      login: user.login,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  create(createUserDto: CreateUserDto): UserResponse {
    var now = Date.now();
    var user: User = {
      id: randomUUID(),
      login: createUserDto.login,
      password: createUserDto.password,
      role: createUserDto.role ?? UserRole.VIEWER,
      createdAt: now,
      updatedAt: now,
    };

    this.users.set(user.id, user);

    return this.toResponse(user);
  }

  findAll(query?: ListUserQueryDto): UserResponse[] | PaginatedUserResponse {
    var users = Array.from(this.users.values()).map((user) => this.toResponse(user));
    var hasPagination =
      typeof query?.page !== 'undefined' || typeof query?.limit !== 'undefined';
    var hasSorting =
      typeof query?.sortBy !== 'undefined' || typeof query?.order !== 'undefined';

    if (query?.sortBy) {
      var order = query.order ?? 'asc';

      users.sort((a, b) => {
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
      return users;
    }

    var page = Number(query?.page ?? 1);
    var limit = Number((query?.limit ?? users.length) || 1);
    var total = users.length;
    var start = (page - 1) * limit;
    var end = start + limit;
    var data = users.slice(start, end);

    return {
      total,
      page,
      limit,
      data,
    };
  }

  findOne(id: string): UserResponse {
    var user = this.users.get(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toResponse(user);
  }

  update(id: string, updateUserDto: UpdateUserDto): UserResponse {
    var user = this.users.get(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.password !== updateUserDto.oldPassword) {
      throw new ForbiddenException('Old password is wrong');
    }

    user.password = updateUserDto.newPassword;
    user.updatedAt = Date.now();

    this.users.set(user.id, user);

    return this.toResponse(user);
  }

  remove(id: string): void {
    var user = this.users.get(id);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.articleService.nullifyAuthorId(id);
    this.commentService.removeByAuthorId(id);
    this.users.delete(id);
  }
}