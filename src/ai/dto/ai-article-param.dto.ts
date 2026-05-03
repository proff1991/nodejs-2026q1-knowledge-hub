import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class AiArticleParamDto {
    @ApiProperty({
        example: "5265e4e4-51d1-4c69-a851-b88ce5db86c1",
        description: "Article id",
    })
    @IsUUID()
    articleId: string;
}