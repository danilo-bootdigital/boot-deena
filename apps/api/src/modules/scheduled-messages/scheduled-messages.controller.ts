import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ScheduledMessagesService } from './scheduled-messages.service';
import { createScheduledMessageSchema } from './dto/scheduled-message.dto';

@Controller('scheduled-messages')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class ScheduledMessagesController {
  constructor(private scheduledMessagesService: ScheduledMessagesService) {}

  @Get()
  findAll(
    @CurrentOrg() orgId: string,
    @Query('conversation_id') conversationId?: string,
    @Query('agent_id') agentId?: string,
    @Query('status') status?: string,
  ) {
    return this.scheduledMessagesService.findAll(orgId, {
      conversation_id: conversationId,
      agent_id: agentId,
      status,
    });
  }

  @Post()
  @Roles('owner', 'admin', 'manager')
  create(
    @CurrentOrg() orgId: string,
    @Body(new ZodValidationPipe(createScheduledMessageSchema)) body: unknown,
  ) {
    return this.scheduledMessagesService.create(orgId, body as any);
  }

  @Put(':id/cancel')
  @Roles('owner', 'admin', 'manager')
  cancel(
    @Param('id', UuidValidationPipe) id: string,
    @CurrentOrg() orgId: string,
  ) {
    return this.scheduledMessagesService.cancel(id, orgId);
  }

  @Delete(':id')
  @Roles('owner', 'admin')
  remove(
    @Param('id', UuidValidationPipe) id: string,
    @CurrentOrg() orgId: string,
  ) {
    return this.scheduledMessagesService.remove(id, orgId);
  }
}
