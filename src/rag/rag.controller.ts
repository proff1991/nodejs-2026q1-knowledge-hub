import {
    Body
    , Controller
    , HttpCode
    , HttpStatus
    , Post
} from "@nestjs/common";
import {
    ApiBearerAuth
    , ApiOkResponse
    , ApiTags
} from "@nestjs/swagger";
import { ReindexRequestDto } from "./dto/reindex-request.dto";
import { RagIndexService } from "./rag-index.service";
import { RagSearchRequestDto } from "./dto/rag-search-request.dto";
import { RagSearchService } from "./rag-search.service";

@ApiTags("ai-rag")
@ApiBearerAuth()
@Controller("ai/rag")
export class RagController {
    constructor(
        private readonly ragIndexService: RagIndexService
        , private readonly ragSearchService: RagSearchService
    ) { }

    @Post("index")
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({ description: "Knowledge Hub articles were indexed into vector storage" })
    reindex(@Body() reindexRequestDto: ReindexRequestDto) {
        return this.ragIndexService.reindex(reindexRequestDto);
    }

    @Post("search")
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({ description: "Semantic search results from Knowledge Hub vector index" })
    search(@Body() ragSearchRequestDto: RagSearchRequestDto) {
        return this.ragSearchService.search(ragSearchRequestDto);
    }
}