import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
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
}