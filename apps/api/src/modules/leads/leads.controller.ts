import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, UseGuards, ForbiddenException } from '@nestjs/common';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { TenantFilterGuard } from '../../common/guards/tenant-filter.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';
import { GetTenantFilter, TenantFilterData } from '../../common/decorators/tenant-filter.decorator';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { LeadsService } from './leads.service';
import { createLeadSchema, updateLeadSchema, moveLeadSchema } from './dto/lead.dto';

@Controller('leads')
@UseGuards(SupabaseAuthGuard, RolesGuard, TenantFilterGuard)
export class LeadsController {
  constructor(private leadsService: LeadsService) {}

  @Get()
  findAll(@CurrentOrg() orgId: string, @Query('stage') stage?: string, @GetTenantFilter() filter?: TenantFilterData) {
    if (filter && !filter.allAccess && !filter.pipeline.can_view) {
      throw new ForbiddenException('Sem permissão para visualizar pipeline');
    }
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
  create(
    @Body(new ZodValidationPipe(createLeadSchema)) body: unknown,
    @CurrentOrg() orgId: string,
    @GetTenantFilter() filter?: TenantFilterData,
  ) {
    if (filter && !filter.allAccess && !filter.pipeline.can_create) {
      throw new ForbiddenException('Sem permissão para criar leads');
    }
    return this.leadsService.create(orgId, body as any);
  }

  @Put(':id')
  update(
    @Param('id', UuidValidationPipe) id: string,
    @Body(new ZodValidationPipe(updateLeadSchema)) body: unknown,
    @CurrentOrg() orgId: string,
    @GetTenantFilter() filter?: TenantFilterData,
  ) {
    if (filter && !filter.allAccess && !filter.pipeline.can_move) {
      throw new ForbiddenException('Sem permissão para editar leads');
    }
    return this.leadsService.update(id, orgId, body as any);
  }

  @Patch(':id/move')
  move(
    @Param('id', UuidValidationPipe) id: string,
    @Body(new ZodValidationPipe(moveLeadSchema)) body: unknown,
    @CurrentOrg() orgId: string,
    @GetTenantFilter() filter?: TenantFilterData,
  ) {
    if (filter && !filter.allAccess && !filter.pipeline.can_move) {
      throw new ForbiddenException('Sem permissão para mover leads');
    }
    return this.leadsService.move(id, orgId, body as any);
  }

  @Delete(':id')
  @Roles('owner', 'admin')
  remove(@Param('id', UuidValidationPipe) id: string, @CurrentOrg() orgId: string) {
    return this.leadsService.remove(id, orgId);
  }
}
