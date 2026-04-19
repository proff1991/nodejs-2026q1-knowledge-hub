import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { SignupDto } from './dto/signup.dto';

@Injectable()
export class AuthService {
    constructor(private readonly prisma: PrismaService) { }

    async signup(signupDto: SignupDto) {
        const existingUser = await this.prisma.user.findFirst({
            where: {
                login: signupDto.login,
            },
        });

        if (existingUser) {
            throw new BadRequestException('Login is already taken');
        }

        const saltRounds = Number(process.env.CRYPT_SALT ?? 10);
        const hashedPassword = await bcrypt.hash(signupDto.password, saltRounds);

        const user = await this.prisma.user.create({
            data: {
                login: signupDto.login,
                password: hashedPassword,
                role: 'VIEWER',
            },
        });

        return {
            id: user.id,
            login: user.login,
            role: user.role.toLowerCase(),
            createdAt: user.createdAt.getTime(),
            updatedAt: user.updatedAt.getTime(),
        };
    }
}