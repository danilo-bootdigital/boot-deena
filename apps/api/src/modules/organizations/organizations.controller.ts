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
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';
import { UuidValidationPipe } from '../../common/pipes/uuid-validation.pipe';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { OrganizationsService } from './organizations.service';
import {
  createOrganizationSchema,
  updateOrganizationSchema,
  inviteMemberSchema,
} from './dto/create-organization.dto';

@Controller('organizations')
@UseGuards(SupabaseAuthGuard)
export class OrganizationsController {
  constructor(private orgsService: OrganizationsService) {}

  @Get()
  findAll(@CurrentUser('id') userId: string) {
    return this.orgsService.findAllForUser(userId);
  }

  @Get(':id')
  findOne(@Param('id', UuidValidationPipe) id: string) {
    return this.orgsService.findOne(id);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createOrganizationSchema)) body: unknown,
    @CurrentUser('id') userId: string,
  ) {
    return this.orgsService.create(userId, body as any);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  update(
    @Param('id', UuidValidationPipe) _id: string,
    @Body(new ZodValidationPipe(updateOrganizationSchema)) body: unknown,
    @CurrentOrg() orgId: string,
  ) {
    return this.orgsService.update(orgId, body as any);
  }

  @Get(':id/members')
  @UseGuards(RolesGuard)
  getMembers(@CurrentOrg() orgId: string) {
    return this.orgsService.getMembers(orgId);
  }

  @Post(':id/members')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  inviteMember(
    @CurrentOrg() orgId: string,
    @Body(new ZodValidationPipe(inviteMemberSchema)) body: unknown,
  ) {
    return this.orgsService.inviteMember(orgId, body as any);
  }

  @Delete(':id/members/:userId')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  removeMember(
    @CurrentOrg() orgId: string,
    @Param('userId', UuidValidationPipe) userId: string,
  ) {
    return this.orgsService.removeMember(orgId, userId);
  }
}
