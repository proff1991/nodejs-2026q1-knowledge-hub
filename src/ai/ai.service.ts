import { Injectable } from "@nestjs/common";
import { GenerateDto } from "./dto/generate.dto";
import { GeminiService } from "./gemini.service";
import { buildGenericPrompt } from "./prompts/ai-prompts";
import { GenerateAiResponse } from "./types/ai.types";

@Injectable()
export class AiService {
    constructor(private readonly geminiService: GeminiService) { }

    async generate(generateDto: GenerateDto): Promise<GenerateAiResponse> {
        var result = await this.geminiService.generateText(
            buildGenericPrompt(generateDto.prompt),
            {
                maxOutputTokens: generateDto.maxOutputTokens,
                temperature: generateDto.temperature,
            },
        );

        return {
            text: result.text,
            model: result.model,
        };
    }
}