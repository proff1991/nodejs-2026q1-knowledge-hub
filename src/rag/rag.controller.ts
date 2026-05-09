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

@ApiTags("ai-rag")
@ApiBearerAuth()
@Controller("ai/rag")
export class RagController {
    constructor(private readonly ragIndexService: RagIndexService) { }

    @Post("index")
    @HttpCode(HttpStatus.OK)
    @ApiOkResponse({ description: "Knowledge Hub articles were indexed into vector storage" })
    reindex(@Body() reindexRequestDto: ReindexRequestDto) {
        return this.ragIndexService.reindex(reindexRequestDto);
    }
}