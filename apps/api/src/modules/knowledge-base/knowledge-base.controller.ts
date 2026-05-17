import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { KnowledgeBaseService } from './knowledge-base.service';
import {
  createKnowledgeBaseSchema,
  updateKnowledgeBaseSchema,
} from './dto/create-knowledge-base.dto';

@Controller('knowledge-bases')
@UseGuards(SupabaseAuthGuard)
export class KnowledgeBaseController {
  constructor(private kbService: KnowledgeBaseService) {}

  @Get()
  findAll(@CurrentOrg() orgId: string) {
    return this.kbService.findAll(orgId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentOrg() orgId: string) {
    return this.kbService.findOne(id, orgId);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createKnowledgeBaseSchema)) body: unknown,
    @CurrentOrg() orgId: string,
  ) {
    return this.kbService.create(orgId, body as any);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateKnowledgeBaseSchema)) body: unknown,
    @CurrentOrg() orgId: string,
  ) {
    return this.kbService.update(id, orgId, body as any);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentOrg() orgId: string) {
    return this.kbService.remove(id, orgId);
  }

  @Post(':id/documents')
  addDocument(
    @Param('id') id: string,
    @Body() body: { name: string; source_url: string; mime_type?: string; size_bytes?: number },
    @CurrentOrg() orgId: string,
  ) {
    return this.kbService.addDocument(id, orgId, body);
  }

  @Delete(':kbId/documents/:docId')
  removeDocument(
    @Param('docId') docId: string,
    @CurrentOrg() orgId: string,
  ) {
    return this.kbService.removeDocument(docId, orgId);
  }
}
