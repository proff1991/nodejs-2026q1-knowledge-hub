import {
    IsInt
    , IsNumber
    , IsOptional
    , IsString
    , Max
    , Min
    , MinLength
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class GenerateDto {
    @ApiProperty({
        example: "Explain dependency injection in Nest.js in simple terms.",
        description: "Prompt text for generic AI generation",
    })
    @IsString()
    @MinLength(1)
    prompt: string;

    @ApiPropertyOptional({
        example: 1024,
        minimum: 1,
        maximum: 8192,
        description: "Maximum number of output tokens",
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(8192)
    maxOutputTokens?: number;

    @ApiPropertyOptional({
        example: 0.4,
        minimum: 0,
        maximum: 2,
        description: "Gemini generation temperature",
    })
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(0)
    @Max(2)
    temperature?: number;
}