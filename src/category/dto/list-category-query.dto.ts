import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListCategoryQueryDto {
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
        example: 'name',
        description: 'Field for sorting',
        enum: ['name', 'description'],
    })
    @IsOptional()
    @IsIn(['name', 'description'])
    sortBy?: 'name' | 'description';

    @ApiPropertyOptional({
        example: 'asc',
        description: 'Sorting order',
        enum: ['asc', 'desc'],
    })
    @IsOptional()
    @IsIn(['asc', 'desc'])
    order?: 'asc' | 'desc';
}