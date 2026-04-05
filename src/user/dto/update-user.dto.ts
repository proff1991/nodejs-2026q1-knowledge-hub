import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiProperty({
    example: 'old-password',
    description: 'Current user password',
  })
  @IsString()
  @MinLength(1)
  oldPassword: string;

  @ApiProperty({
    example: 'new-password',
    description: 'New user password',
  })
  @IsString()
  @MinLength(1)
  newPassword: string;
}