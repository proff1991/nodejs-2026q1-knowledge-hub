import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
    ArrayMaxSize
    , IsArray
    , IsIn
    , IsInt
    , IsNotEmpty
    , IsOptional
    , IsString
    , IsUUID
    , Max
    , Min
} from "class-validator";

export class RagSearchRequestDto {
    @ApiProperty({
        example: "How does authentication work in Knowledge Hub?",
    })
    @IsString()
    @IsNotEmpty()
    query!: string;

    @ApiPropertyOptional({
        example: 5
        , default: 5
        , maximum: 20
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(20)
    limit?: number;

    @ApiPropertyOptional({
        example: "published"
        , enum: ["draft", "published", "archived"]
    })
    @IsOptional()
    @IsString()
    @IsIn(["draft", "published", "archived"])
    articleStatus?: "draft" | "published" | "archived";

    @ApiPropertyOptional({
        example: "550e8400-e29b-41d4-a716-446655440000",
    })
    @IsOptional()
    @IsUUID("4")
    categoryId?: string;

    @ApiPropertyOptional({
        example: ["nestjs", "auth"]
        , type: [String]
    })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(20)
    @IsString({ each: true })
    tags?: string[];
}