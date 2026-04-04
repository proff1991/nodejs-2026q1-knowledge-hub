import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export enum UserRole {
    ADMIN = 'admin',
    EDITOR = 'editor',
    VIEWER = 'viewer',
}

export class CreateUserDto {
    @IsString()
    @MinLength(1)
    login: string;

    @IsString()
    @MinLength(1)
    password: string;

    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole;
}