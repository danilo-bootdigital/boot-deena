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
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { KnowledgeBaseService } from './knowledge-base.service';
import {
  createKnowledgeBaseSchema,
  updateKnowledgeBaseSchema,
  addDocumentSchema,
} from './dto/create-knowledge-base.dto';
import type { AddDocumentDto } from './dto/create-knowledge-base.dto';

@Controller('knowledge-bases')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class KnowledgeBaseController {
  constructor(private kbService: KnowledgeBaseService) {}

  @Get()
  findAll(@CurrentOrg() orgId: string) {
    return this.kbService.findAll(orgId);
  }

  @Get(':id')
  findOne(@Param('id', UuidValidationPipe) id: string, @CurrentOrg() orgId: string) {
    return this.kbService.findOne(id, orgId);
  }

  @Post()
  @Roles('owner', 'admin')
  create(
    @Body(new ZodValidationPipe(createKnowledgeBaseSchema)) body: unknown,
    @CurrentOrg() orgId: string,
  ) {
    return this.kbService.create(orgId, body as any);
  }

  @Put(':id')
  @Roles('owner', 'admin')
  update(
    @Param('id', UuidValidationPipe) id: string,
    @Body(new ZodValidationPipe(updateKnowledgeBaseSchema)) body: unknown,
    @CurrentOrg() orgId: string,
  ) {
    return this.kbService.update(id, orgId, body as any);
  }

  @Delete(':id')
  @Roles('owner', 'admin')
  remove(@Param('id', UuidValidationPipe) id: string, @CurrentOrg() orgId: string) {
    return this.kbService.remove(id, orgId);
  }

  @Post(':id/documents')
  @Roles('owner', 'admin')
  addDocument(
    @Param('id', UuidValidationPipe) id: string,
    @Body(new ZodValidationPipe(addDocumentSchema)) body: AddDocumentDto,
    @CurrentOrg() orgId: string,
  ) {
    return this.kbService.addDocument(id, orgId, body);
  }

  @Delete(':kbId/documents/:docId')
  @Roles('owner', 'admin')
  removeDocument(
    @Param('docId', UuidValidationPipe) docId: string,
    @CurrentOrg() orgId: string,
  ) {
    return this.kbService.removeDocument(docId, orgId);
  }
}
