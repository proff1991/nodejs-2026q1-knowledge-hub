import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LogoutDto {
  @ApiProperty({
    example: 'jwt-refresh-token-example',
    description: 'JWT refresh token',
  })
  @IsString()
  @MinLength(1)
  refreshToken: string;
}