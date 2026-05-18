import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { z } from 'zod';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ConversationsService } from './conversations.service';

const sendMessageSchema = z.object({
  content: z.string().min(1).max(5000).transform((v) => v.trim()),
});

@Controller('conversations')
@UseGuards(SupabaseAuthGuard)
export class ConversationsController {
  constructor(private conversationsService: ConversationsService) {}

  @Get()
  findAll(
    @CurrentOrg() orgId: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.conversationsService.findAll(orgId, status, search);
  }

  @Get(':id/messages')
  getMessages(
    @Param('id', UuidValidationPipe) id: string,
    @CurrentOrg() orgId: string,
  ) {
    return this.conversationsService.getMessages(id, orgId);
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
