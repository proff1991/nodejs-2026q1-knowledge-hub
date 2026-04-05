import { IsOptional, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCategoryDto {
  @ApiPropertyOptional({
    example: 'Node.js',
    description: 'Category name',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiPropertyOptional({
    example: 'Articles about Node.js backend development',
    description: 'Category description',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  description?: string;
}