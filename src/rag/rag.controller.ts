import {
    Body
    , Controller
    , Delete
    , Get
    , HttpCode
    , HttpStatus
    , Param
    , ParseUUIDPipe
    , Post
} from "@nestjs/common";
import {
    ApiBearerAuth
    , ApiNoContentResponse
    , ApiNotFoundResponse
    , ApiOkResponse
    , ApiParam
    , ApiTags
} from "@nestjs/swagger";
import { RagChatRequestDto } from "./dto/rag-chat-request.dto";
import { RagSearchRequestDto } from "./dto/rag-search-request.dto";
import { ReindexRequestDto } from "./dto/reindex-request.dto";
import { RagChatService } from "./rag-chat.service";
import { RagIndexService } from "./rag-index.service";
import { RagSearchService } from "./rag-search.service";

@ApiTags("ai-rag")
@ApiBearerAuth()
@Controller("ai/rag")
export class RagController {
    constructor(
        private readonly ragIndexService: RagIndexService
        , private readonly ragSearchService: RagSearchService
        , private readonly ragChatService: RagChatService
    ) { }

    @Post("index")
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({ description: "Knowledge Hub articles were indexed into vector storage" })
    reindex(@Body() reindexRequestDto: ReindexRequestDto) {
        return this.ragIndexService.reindex(reindexRequestDto);
    }

    @Delete("index/articles/:articleId")
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiParam({
        name: "articleId"
        , example: "550e8400-e29b-41d4-a716-446655440000"
    })
    @ApiNoContentResponse({ description: "Article vectors were removed from RAG index" })
    @ApiNotFoundResponse({ description: "Article vectors were not found in RAG index" })
    deleteArticleFromIndex(
        @Param("articleId", new ParseUUIDPipe({ version: "4" })) articleId: string
    ): Promise<void> {
        return this.ragIndexService.deleteArticleFromIndex(articleId);
    }

    @Post("search")
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({ description: "Semantic search results from Knowledge Hub vector index" })
    search(@Body() ragSearchRequestDto: RagSearchRequestDto) {
        return this.ragSearchService.search(ragSearchRequestDto);
    }

    @Post("chat")
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({ description: "Grounded RAG answer with Knowledge Hub sources" })
    chat(@Body() ragChatRequestDto: RagChatRequestDto) {
        return this.ragChatService.chat(ragChatRequestDto);
    }

    @Get("chat/:conversationId/history")
    @ApiOkResponse({ description: "RAG conversation history" })
    getChatHistory(@Param("conversationId") conversationId: string) {
        return this.ragChatService.getHistory(conversationId);
    }
}