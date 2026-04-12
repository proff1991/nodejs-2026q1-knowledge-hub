import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum UserRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer',
}

export class CreateUserDto {
  @ApiProperty({
    example: 'alex',
    description: 'User login',
  })
  @IsString()
  @MinLength(1)
  login: string;

  @ApiProperty({
    example: 'my-password',
    description: 'User password',
  })
  @IsString()
  @MinLength(1)
  password: string;

  @ApiPropertyOptional({
    example: UserRole.VIEWER,
    enum: UserRole,
    description: 'User role',
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}