import { Controller, Get, Put, Post, Body, Param, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { RoleValidationPipe } from '../../common/pipes/role-validation.pipe';
import { AccessLevelsService } from './access-levels.service';
import { updateAccessLevelSchema } from './dto/access-level.dto';

@Controller('access-levels')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class AccessLevelsController {
  constructor(private accessLevelsService: AccessLevelsService) {}

  @Get()
  findAll(@CurrentOrg() orgId: string) {
    return this.accessLevelsService.findAllForOrg(orgId);
  }

  @Get(':role')
  findByRole(
    @CurrentOrg() orgId: string,
    @Param('role', RoleValidationPipe) role: string,
  ) {
    return this.accessLevelsService.findByRole(orgId, role);
  }

  @Put(':role')
  @Roles('owner', 'admin')
  update(
    @CurrentOrg() orgId: string,
    @Param('role', RoleValidationPipe) role: string,
    @Body(new ZodValidationPipe(updateAccessLevelSchema)) body: unknown,
  ) {
    return this.accessLevelsService.upsert(orgId, role, body as any);
  }

  @Post('seed-defaults')
  @Roles('owner')
  seedDefaults(@CurrentOrg() orgId: string) {
    return this.accessLevelsService.seedDefaults(orgId);
  }
}
