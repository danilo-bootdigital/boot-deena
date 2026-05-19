import { Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AgentsService } from './agents.service';
import { createAgentSchema, updateAgentSchema, chatSchema } from './dto/create-agent.dto';
import type { ChatDto } from './dto/create-agent.dto';

@Controller('agents')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class AgentsController {
  constructor(private agentsService: AgentsService) {}

  @Get()
  findAll(
    @CurrentOrg() orgId: string,
    @CurrentUser('id') userId: string,
    @Req() req: any,
  ) {
    const userRole = req.orgRole || 'operator';
    return this.agentsService.findAll(orgId, userId, userRole);
  }

  @Get(':id')
  findOne(@Param('id', UuidValidationPipe) id: string, @CurrentOrg() orgId: string) {
    return this.agentsService.findOne(id, orgId);
  }

  @Post()
  @Roles('owner', 'admin')
  create(
    @Body(new ZodValidationPipe(createAgentSchema)) body: unknown,
    @CurrentOrg() orgId: string,
  ) {
    return this.agentsService.create(orgId, body as any);
  }

  @Put(':id')
  @Roles('owner', 'admin', 'manager')
  update(
    @Param('id', UuidValidationPipe) id: string,
    @Body(new ZodValidationPipe(updateAgentSchema)) body: unknown,
    @CurrentOrg() orgId: string,
  ) {
    return this.agentsService.update(id, orgId, body as any);
  }

  @Delete(':id')
  @Roles('owner', 'admin')
  remove(@Param('id', UuidValidationPipe) id: string, @CurrentOrg() orgId: string) {
    return this.agentsService.remove(id, orgId);
  }

  @Post(':id/duplicate')
  @Roles('owner', 'admin')
  duplicate(@Param('id', UuidValidationPipe) id: string, @CurrentOrg() orgId: string) {
    return this.agentsService.duplicate(id, orgId);
  }

  @Post(':id/chat')
  chat(
    @Param('id', UuidValidationPipe) id: string,
    @Body(new ZodValidationPipe(chatSchema)) body: ChatDto,
    @CurrentOrg() orgId: string,
  ) {
    return this.agentsService.chat(id, orgId, body.message, body.history || []);
  }
}
