import { Controller, Get, Post, Param, Query, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';
import { ConversationsService } from './conversations.service';

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
  getMessages(@Param('id') id: string, @CurrentOrg() orgId: string) {
    return this.conversationsService.getMessages(id, orgId);
  }

  @Post(':id/messages')
  sendMessage(
    @Param('id') id: string,
    @Body() body: { content: string },
    @CurrentOrg() orgId: string,
  ) {
    if (!body.content || typeof body.content !== 'string' || !body.content.trim()) {
      throw new BadRequestException('content is required and must be a non-empty string');
    }
    return this.conversationsService.sendMessage(id, orgId, body.content.trim());
  }
}
