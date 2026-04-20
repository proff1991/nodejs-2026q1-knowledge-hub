import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from './create-user.dto';

export class UpdateUserDto {
  @ApiPropertyOptional({
    example: 'old-password',
    description: 'Current user password',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  oldPassword?: string;

  @ApiPropertyOptional({
    example: 'new-password',
    description: 'New user password',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  newPassword?: string;

  @ApiPropertyOptional({
    example: UserRole.EDITOR,
    enum: UserRole,
    description: 'New user role',
  })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}