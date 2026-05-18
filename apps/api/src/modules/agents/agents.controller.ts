import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';
import { AgentsService } from './agents.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { createAgentSchema, updateAgentSchema } from './dto/create-agent.dto';

@Controller('agents')
@UseGuards(SupabaseAuthGuard)
export class AgentsController {
  constructor(private agentsService: AgentsService) {}

  @Get()
  findAll(@CurrentOrg() orgId: string) {
    return this.agentsService.findAll(orgId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentOrg() orgId: string) {
    return this.agentsService.findOne(id, orgId);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createAgentSchema)) body: unknown,
    @CurrentOrg() orgId: string,
  ) {
    return this.agentsService.create(orgId, body as any);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateAgentSchema)) body: unknown,
    @CurrentOrg() orgId: string,
  ) {
    return this.agentsService.update(id, orgId, body as any);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentOrg() orgId: string) {
    return this.agentsService.remove(id, orgId);
  }

  @Post(':id/chat')
  chat(
    @Param('id') id: string,
    @Body() body: { message: string; history?: Array<{ role: string; content: string }> },
    @CurrentOrg() orgId: string,
  ) {
    return this.agentsService.chat(id, orgId, body.message, body.history || []);
  }
}
