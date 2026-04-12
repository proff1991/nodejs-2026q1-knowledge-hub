import {
  ForbiddenException
  , Injectable
  , NotFoundException
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UserRole } from './dto/create-user.dto';
import { ListUserQueryDto } from './dto/list-user-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponse } from './entities/user.entity';

type PaginatedUserResponse = {
  total: number;
  page: number;
  limit: number;
  data: UserResponse[];
};

type DbUser = {
  id: string;
  login: string;
  password: string;
  role: 'ADMIN' | 'EDITOR' | 'VIEWER';
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) { }

  private toResponse(user: DbUser): UserResponse {
    return {
      id: user.id,
      login: user.login,
      role: user.role.toLowerCase() as UserResponse['role'],
      createdAt: user.createdAt.getTime(),
      updatedAt: user.updatedAt.getTime(),
    };
  }

  private toDbRole(role: UserRole): 'ADMIN' | 'EDITOR' | 'VIEWER' {
    if (role === UserRole.ADMIN) {
      return 'ADMIN';
    }

    if (role === UserRole.EDITOR) {
      return 'EDITOR';
    }

    return 'VIEWER';
  }

  async create(createUserDto: CreateUserDto): Promise<UserResponse> {
    var user = await this.prisma.user.create({
      data: {
        login: createUserDto.login,
        password: createUserDto.password,
        role: this.toDbRole(createUserDto.role ?? UserRole.VIEWER),
      },
    });

    return this.toResponse(user);
  }

  async findAll(query?: ListUserQueryDto): Promise<UserResponse[] | PaginatedUserResponse> {
    var hasPagination =
      typeof query?.page !== 'undefined' || typeof query?.limit !== 'undefined';
    var hasSorting =
      typeof query?.sortBy !== 'undefined' || typeof query?.order !== 'undefined';

    var orderBy = query?.sortBy
      ? {
        [query.sortBy]: query.order ?? 'asc',
      }
      : undefined;

    if (!hasPagination && !hasSorting) {
      const users = await this.prisma.user.findMany({
        orderBy,
      });

      return users.map((user) => this.toResponse(user));
    }

    var total = await this.prisma.user.count();
    var page = Number(query?.page ?? 1);
    var limit = Number((query?.limit ?? total) || 1);
    var skip = (page - 1) * limit;

    const users = await this.prisma.user.findMany({
      orderBy,
      skip,
      take: limit,
    });

    return {
      total,
      page,
      limit,
      data: users.map((user) => this.toResponse(user)),
    };
  }

  async findOne(id: string): Promise<UserResponse> {
    var user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toResponse(user);
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserResponse> {
    var user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.password !== updateUserDto.oldPassword) {
      throw new ForbiddenException('Old password is wrong');
    }

    var updatedUser = await this.prisma.user.update({
      where: { id },
      data: {
        password: updateUserDto.newPassword,
      },
    });

    return this.toResponse(updatedUser);
  }

  async remove(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      var user = await tx.user.findUnique({
        where: { id },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      await tx.article.updateMany({
        where: { authorId: id },
        data: { authorId: null },
      });

      await tx.comment.deleteMany({
        where: { authorId: id },
      });

      await tx.user.delete({
        where: { id },
      });
    });
  }
}