import { ApiPropertyOptional } from "@nestjs/swagger";
import {
    ArrayMaxSize
    , IsArray
    , IsBoolean
    , IsOptional
    , IsUUID
} from "class-validator";

export class ReindexRequestDto {
    @ApiPropertyOptional({
        example: true,
        default: true,
        description: "Index only published articles by default",
    })
    @IsOptional()
    @IsBoolean()
    onlyPublished?: boolean;

    @ApiPropertyOptional({
        example: ["550e8400-e29b-41d4-a716-446655440000"],
        description: "Optional list of article IDs for selective reindex",
        type: [String],
    })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(100)
    @IsUUID("4", { each: true })
    articleIds?: string[];
}