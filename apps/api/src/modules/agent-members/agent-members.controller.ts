import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';
import { AgentMembersService } from './agent-members.service';
import { assignAgentMemberSchema, updateAgentMemberSchema } from './dto/agent-member.dto';

@Controller('agents/:agentId/members')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class AgentMembersController {
  constructor(private agentMembersService: AgentMembersService) {}

  @Get()
  findByAgent(
    @Param('agentId', UuidValidationPipe) agentId: string,
    @CurrentOrg() orgId: string,
  ) {
    return this.agentMembersService.findByAgent(agentId, orgId);
  }

  @Post()
  @Roles('owner', 'admin')
  assign(
    @Param('agentId', UuidValidationPipe) agentId: string,
    @CurrentOrg() orgId: string,
    @Body(new ZodValidationPipe(assignAgentMemberSchema)) body: unknown,
    @CurrentUser('id') currentUserId: string,
  ) {
    return this.agentMembersService.assign(agentId, orgId, body as any, currentUserId);
  }

  @Put(':userId')
  @Roles('owner', 'admin')
  updatePermission(
    @Param('agentId', UuidValidationPipe) agentId: string,
    @Param('userId', UuidValidationPipe) userId: string,
    @CurrentOrg() orgId: string,
    @Body(new ZodValidationPipe(updateAgentMemberSchema)) body: unknown,
  ) {
    return this.agentMembersService.updatePermission(agentId, orgId, userId, body as any);
  }

  @Delete(':userId')
  @Roles('owner', 'admin')
  remove(
    @Param('agentId', UuidValidationPipe) agentId: string,
    @Param('userId', UuidValidationPipe) userId: string,
    @CurrentOrg() orgId: string,
  ) {
    return this.agentMembersService.remove(agentId, orgId, userId);
  }
}

@Controller('my-agents')
@UseGuards(SupabaseAuthGuard)
export class MyAgentsController {
  constructor(private agentMembersService: AgentMembersService) {}

  @Get()
  findMyAgents(
    @CurrentUser('id') userId: string,
    @CurrentOrg() orgId: string,
  ) {
    return this.agentMembersService.findByUser(userId, orgId);
  }
}
