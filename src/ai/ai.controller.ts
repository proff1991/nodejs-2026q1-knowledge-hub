import {
    Body
    , Controller
    , Get
    , HttpCode
    , HttpStatus
    , Param
    , Post
} from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { AiService } from "./ai.service";
import { AiArticleParamDto } from "./dto/ai-article-param.dto";
import { AnalyzeArticleDto } from "./dto/analyze-article.dto";
import { GenerateDto } from "./dto/generate.dto";
import { SummarizeArticleDto } from "./dto/summarize-article.dto";
import { TranslateArticleDto } from "./dto/translate-article.dto";

@ApiTags("ai")
@ApiBearerAuth()
@Controller("ai")
export class AiController {
    constructor(private readonly aiService: AiService) { }

    @Post("generate")
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({ description: "Generated AI response" })
    generate(@Body() generateDto: GenerateDto) {
        return this.aiService.generate(generateDto);
    }

    @Post("articles/:articleId/summarize")
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({ description: "Generated article summary" })
    summarizeArticle(
        @Param() params: AiArticleParamDto,
        @Body() summarizeArticleDto: SummarizeArticleDto,
    ) {
        return this.aiService.summarizeArticle(params.articleId, summarizeArticleDto);
    }

    @Post("articles/:articleId/translate")
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({ description: "Generated article translation" })
    translateArticle(
        @Param() params: AiArticleParamDto,
        @Body() translateArticleDto: TranslateArticleDto,
    ) {
        return this.aiService.translateArticle(params.articleId, translateArticleDto);
    }

    @Post("articles/:articleId/analyze")
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({ description: "Generated article analysis" })
    analyzeArticle(
        @Param() params: AiArticleParamDto,
        @Body() analyzeArticleDto: AnalyzeArticleDto,
    ) {
        return this.aiService.analyzeArticle(params.articleId, analyzeArticleDto);
    }

    @Get("usage")
    @ApiOkResponse({ description: "AI usage statistics since service startup" })
    getUsageStats() {
        return this.aiService.getUsageStats();
    }
}