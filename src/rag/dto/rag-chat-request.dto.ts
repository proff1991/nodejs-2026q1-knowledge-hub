import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
    IsNotEmpty
    , IsOptional
    , IsString
    , IsUUID
} from "class-validator";

export class RagChatRequestDto {
    @ApiProperty({
        example: "How does JWT authentication work in Knowledge Hub?",
    })
    @IsString()
    @IsNotEmpty()
    question!: string;

    @ApiPropertyOptional({
        example: "550e8400-e29b-41d4-a716-446655440000",
        description: "Optional conversation ID for continuing RAG chat memory",
    })
    @IsOptional()
    @IsUUID("4")
    conversationId?: string;
}