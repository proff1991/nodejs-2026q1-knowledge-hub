import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { SignupDto } from './dto/signup.dto';
import { UserResponse } from '../user/entities/user.entity';

type DbUser = {
  id: string;
  login: string;
  password: string;
  role: 'ADMIN' | 'EDITOR' | 'VIEWER';
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class AuthService {
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

  async signup(signupDto: SignupDto): Promise<UserResponse> {
    var existingUser = await this.prisma.user.findUnique({
      where: {
        login: signupDto.login,
      },
    });

    if (existingUser) {
      throw new BadRequestException('Login is already taken');
    }

    var saltRounds = Number(process.env.CRYPT_SALT ?? 10);
    var hashedPassword = await bcrypt.hash(signupDto.password, saltRounds);

    var user = await this.prisma.user.create({
      data: {
        login: signupDto.login,
        password: hashedPassword,
        role: 'VIEWER',
      },
    });

    return this.toResponse(user);
  }
}