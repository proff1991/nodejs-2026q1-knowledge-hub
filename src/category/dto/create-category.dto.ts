import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({
    example: 'Node.js',
    description: 'Category name',
  })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({
    example: 'Articles about Node.js backend development',
    description: 'Category description',
  })
  @IsString()
  @MinLength(1)
  description: string;
}