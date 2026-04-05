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
  , Query
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Controller('comment')
export class CommentController {
  constructor(private readonly commentService: CommentService) { }

  @Post()
  create(@Body() createCommentDto: CreateCommentDto) {
    return this.commentService.create(createCommentDto);
  }

  @Get()
  findAll(
    @Query('articleId', new ParseUUIDPipe({ version: '4' })) articleId: string,
  ) {
    return this.commentService.findAll(articleId);
  }

  @Get(':id')
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.commentService.findOne(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.commentService.remove(id);
  }
}