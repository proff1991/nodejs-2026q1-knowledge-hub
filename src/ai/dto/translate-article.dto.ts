import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MinLength } from "class-validator";

export class TranslateArticleDto {
    @ApiProperty({
        example: "Ukrainian",
        description: "Target language for translation",
    })
    @IsString()
    @MinLength(1)
    targetLanguage: string;

    @ApiPropertyOptional({
        example: "English",
        description: "Optional source language",
    })
    @IsOptional()
    @IsString()
    @MinLength(1)
    sourceLanguage?: string;
}