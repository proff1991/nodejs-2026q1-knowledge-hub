import {
    Body
    , Controller
    , HttpCode
    , HttpStatus
    , Post
} from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { AiService } from "./ai.service";
import { GenerateDto } from "./dto/generate.dto";

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
}