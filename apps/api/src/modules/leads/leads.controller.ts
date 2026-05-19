import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { LeadsService } from './leads.service';
import { createLeadSchema, updateLeadSchema, moveLeadSchema } from './dto/lead.dto';

@Controller('leads')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class LeadsController {
  constructor(private leadsService: LeadsService) {}

  @Get()
  findAll(@CurrentOrg() orgId: string, @Query('stage') stage?: string) {
    return this.leadsService.findAll(orgId, stage);
  }

  @Get('stats')
  getStats(@CurrentOrg() orgId: string) {
    return this.leadsService.getStats(orgId);
  }

  @Get(':id')
  findOne(@Param('id', UuidValidationPipe) id: string, @CurrentOrg() orgId: string) {
    return this.leadsService.findOne(id, orgId);
  }

  @Post()
  create(@Body(new ZodValidationPipe(createLeadSchema)) body: unknown, @CurrentOrg() orgId: string) {
    return this.leadsService.create(orgId, body as any);
  }

  @Put(':id')
  update(
    @Param('id', UuidValidationPipe) id: string,
    @Body(new ZodValidationPipe(updateLeadSchema)) body: unknown,
    @CurrentOrg() orgId: string,
  ) {
    return this.leadsService.update(id, orgId, body as any);
  }

  @Patch(':id/move')
  move(
    @Param('id', UuidValidationPipe) id: string,
    @Body(new ZodValidationPipe(moveLeadSchema)) body: unknown,
    @CurrentOrg() orgId: string,
  ) {
    return this.leadsService.move(id, orgId, body as any);
  }

  @Delete(':id')
  @Roles('owner', 'admin')
  remove(@Param('id', UuidValidationPipe) id: string, @CurrentOrg() orgId: string) {
    return this.leadsService.remove(id, orgId);
  }
}
