import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ListCommentQueryDto {
    @ApiProperty({
        example: '550e8400-e29b-41d4-a716-446655440000',
        description: 'Article identifier',
    })
    @IsUUID('4')
    articleId: string;

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
        example: 'createdAt',
        description: 'Field for sorting',
        enum: ['content', 'createdAt'],
    })
    @IsOptional()
    @IsIn(['content', 'createdAt'])
    sortBy?: 'content' | 'createdAt';

    @ApiPropertyOptional({
        example: 'asc',
        description: 'Sorting order',
        enum: ['asc', 'desc'],
    })
    @IsOptional()
    @IsIn(['asc', 'desc'])
    order?: 'asc' | 'desc';
}