import {
    IsArray
    , IsEnum
    , IsOptional
    , IsString
    , IsUUID
    , MinLength
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArticleStatus } from '../entities/article.entity';

export class UpdateArticleDto {
    @ApiPropertyOptional({
        example: 'How Event Loop works in Node.js',
        description: 'Article title',
    })
    @IsOptional()
    @IsString()
    @MinLength(1)
    title?: string;

    @ApiPropertyOptional({
        example: 'Detailed explanation of timers, poll and check phases.',
        description: 'Article content',
    })
    @IsOptional()
    @IsString()
    @MinLength(1)
    content?: string;

    @ApiPropertyOptional({
        example: ArticleStatus.PUBLISHED,
        enum: ArticleStatus,
        description: 'Article status',
    })
    @IsOptional()
    @IsEnum(ArticleStatus)
    status?: ArticleStatus;

    @ApiPropertyOptional({
        example: '550e8400-e29b-41d4-a716-446655440000',
        description: 'Author identifier',
        nullable: true,
    })
    @IsOptional()
    @IsUUID('4')
    authorId?: string | null;

    @ApiPropertyOptional({
        example: '550e8400-e29b-41d4-a716-446655440001',
        description: 'Category identifier',
        nullable: true,
    })
    @IsOptional()
    @IsUUID('4')
    categoryId?: string | null;

    @ApiPropertyOptional({
        example: ['nodejs', 'event-loop', 'javascript'],
        description: 'Article tags',
        type: [String],
    })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];
}