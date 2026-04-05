import { IsOptional, IsString, IsUUID, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({
    example: 'Very useful article, thanks!',
    description: 'Comment content',
  })
  @IsString()
  @MinLength(1)
  content: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Article identifier',
  })
  @IsUUID('4')
  articleId: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440001',
    description: 'Author identifier',
    nullable: true,
  })
  @IsOptional()
  @IsUUID('4')
  authorId?: string | null;
}