import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { TenantFilterGuard } from '../../common/guards/tenant-filter.guard';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { GetTenantFilter, TenantFilterData } from '../../common/decorators/tenant-filter.decorator';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ConversationsService } from './conversations.service';

const sendMessageSchema = z.object({
  content: z.string().min(1).max(5000).transform((v) => v.trim()),
});

@Controller('conversations')
@UseGuards(SupabaseAuthGuard, TenantFilterGuard)
export class ConversationsController {
  constructor(private conversationsService: ConversationsService) {}

  @Get()
  findAll(
    @CurrentOrg() orgId: string,
    @CurrentUser('id') userId: string,
    @GetTenantFilter() filter: TenantFilterData,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.conversationsService.findAll(orgId, status, search, userId, filter);
  }

  @Get(':id/messages')
  getMessages(
    @Param('id', UuidValidationPipe) id: string,
    @CurrentOrg() orgId: string,
  ) {
    return this.conversationsService.getMessages(id, orgId);
  }

  @Get(':id/attachments')
  getAttachments(
    @Param('id', UuidValidationPipe) id: string,
    @CurrentOrg() orgId: string,
  ) {
    return this.conversationsService.getAttachments(id, orgId);
  }

  @Post(':id/messages')
  sendMessage(
    @Param('id', UuidValidationPipe) id: string,
    @Body(new ZodValidationPipe(sendMessageSchema)) body: { content: string },
    @CurrentOrg() orgId: string,
  ) {
    return this.conversationsService.sendMessage(id, orgId, body.content);
  }
}
