import { Type } from 'class-transformer';
import {
    IsEnum
    , IsIn
    , IsInt
    , IsOptional
    , IsString
    , IsUUID
    , Min
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArticleStatus } from '../entities/article.entity';

export class ListArticleQueryDto {
    @ApiPropertyOptional({
        example: ArticleStatus.PUBLISHED,
        enum: ArticleStatus,
        description: 'Article status filter',
    })
    @IsOptional()
    @IsEnum(ArticleStatus)
    status?: ArticleStatus;

    @ApiPropertyOptional({
        example: '550e8400-e29b-41d4-a716-446655440000',
        description: 'Category identifier filter',
    })
    @IsOptional()
    @IsUUID('4')
    categoryId?: string;

    @ApiPropertyOptional({
        example: 'nodejs',
        description: 'Tag filter',
    })
    @IsOptional()
    @IsString()
    tag?: string;

    @ApiPropertyOptional({
        example: 1,
        description: 'Page number',
        minimum: 1,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number;

    @ApiPropertyOptional({
        example: 10,
        description: 'Items per page',
        minimum: 1,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number;

    @ApiPropertyOptional({
        example: 'title',
        description: 'Field for sorting',
        enum: ['title', 'status', 'createdAt', 'updatedAt'],
    })
    @IsOptional()
    @IsIn(['title', 'status', 'createdAt', 'updatedAt'])
    sortBy?: 'title' | 'status' | 'createdAt' | 'updatedAt';

    @ApiPropertyOptional({
        example: 'asc',
        description: 'Sorting order',
        enum: ['asc', 'desc'],
    })
    @IsOptional()
    @IsIn(['asc', 'desc'])
    order?: 'asc' | 'desc';
}