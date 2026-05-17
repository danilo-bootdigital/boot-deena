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
import { FlowsService } from './flows.service';
import { createFlowSchema, updateFlowSchema } from './dto/create-flow.dto';

@Controller('flows')
@UseGuards(SupabaseAuthGuard)
export class FlowsController {
  constructor(private flowsService: FlowsService) {}

  @Get()
  findAll(@CurrentOrg() orgId: string) {
    return this.flowsService.findAll(orgId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentOrg() orgId: string) {
    return this.flowsService.findOne(id, orgId);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createFlowSchema)) body: unknown,
    @CurrentOrg() orgId: string,
  ) {
    return this.flowsService.create(orgId, body as any);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateFlowSchema)) body: unknown,
    @CurrentOrg() orgId: string,
  ) {
    return this.flowsService.update(id, orgId, body as any);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentOrg() orgId: string) {
    return this.flowsService.remove(id, orgId);
  }

  @Post(':flowId/agents/:agentId')
  attachToAgent(
    @Param('flowId') flowId: string,
    @Param('agentId') agentId: string,
    @Body() body: { priority?: number },
  ) {
    return this.flowsService.attachToAgent(agentId, flowId, body.priority);
  }

  @Delete(':flowId/agents/:agentId')
  detachFromAgent(
    @Param('flowId') flowId: string,
    @Param('agentId') agentId: string,
  ) {
    return this.flowsService.detachFromAgent(agentId, flowId);
  }
}
