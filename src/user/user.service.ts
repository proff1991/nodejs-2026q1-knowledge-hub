import {
  BadRequestException
  , ForbiddenException
  , Injectable
  , NotFoundException
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
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

  private getSaltRounds(): number {
    return Number(process.env.CRYPT_SALT ?? 10);
  }

  async create(createUserDto: CreateUserDto): Promise<UserResponse> {
    var existingUser = await this.prisma.user.findFirst({
      where: {
        login: createUserDto.login,
      },
    });

    if (existingUser) {
      throw new BadRequestException('Login is already taken');
    }

    var hashedPassword = await bcrypt.hash(
      createUserDto.password,
      this.getSaltRounds(),
    );

    var user = await this.prisma.user.create({
      data: {
        login: createUserDto.login,
        password: hashedPassword,
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
    var data: {
      password?: string;
      role?: 'ADMIN' | 'EDITOR' | 'VIEWER';
    } = {};

    var hasRoleUpdate = typeof updateUserDto.role !== 'undefined';
    var hasOldPassword = typeof updateUserDto.oldPassword !== 'undefined';
    var hasNewPassword = typeof updateUserDto.newPassword !== 'undefined';
    var hasPasswordUpdate = hasOldPassword || hasNewPassword;

    if (!hasRoleUpdate && !hasPasswordUpdate) {
      throw new BadRequestException('Nothing to update');
    }

    if (hasPasswordUpdate && (!hasOldPassword || !hasNewPassword)) {
      throw new BadRequestException('oldPassword and newPassword are required');
    }

    var user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (hasRoleUpdate) {
      data.role = this.toDbRole(updateUserDto.role as UserRole);
    }

    if (hasPasswordUpdate) {
      var isPasswordCorrect = await bcrypt.compare(
        updateUserDto.oldPassword as string,
        user.password,
      );

      if (!isPasswordCorrect) {
        throw new ForbiddenException('Old password is wrong');
      }

      data.password = await bcrypt.hash(
        updateUserDto.newPassword as string,
        this.getSaltRounds(),
      );
    }

    var updatedUser = await this.prisma.user.update({
      where: { id },
      data,
    });

    return this.toResponse(updatedUser);
  }

  async remove(id: string): Promise<void> {
    var user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.$transaction([
      this.prisma.article.updateMany({
        where: { authorId: id },
        data: { authorId: null },
      }),
      this.prisma.comment.deleteMany({
        where: { authorId: id },
      }),
      this.prisma.user.delete({
        where: { id },
      }),
    ]);
  }
}