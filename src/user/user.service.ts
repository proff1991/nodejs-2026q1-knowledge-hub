import { randomUUID } from 'node:crypto';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto, UserRole } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User, UserResponse } from './entities/user.entity';
import { ArticleService } from '../article/article.service';
import { CommentService } from '../comment/comment.service';

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

  findAll(): UserResponse[] {
    return Array.from(this.users.values()).map((user) => this.toResponse(user));
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