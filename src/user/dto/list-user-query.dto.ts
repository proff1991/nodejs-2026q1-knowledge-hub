import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListUserQueryDto {
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
        example: 'login',
        description: 'Field for sorting',
        enum: ['login', 'role', 'createdAt', 'updatedAt'],
    })
    @IsOptional()
    @IsIn(['login', 'role', 'createdAt', 'updatedAt'])
    sortBy?: 'login' | 'role' | 'createdAt' | 'updatedAt';

    @ApiPropertyOptional({
        example: 'asc',
        description: 'Sorting order',
        enum: ['asc', 'desc'],
    })
    @IsOptional()
    @IsIn(['asc', 'desc'])
    order?: 'asc' | 'desc';
}