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
import { CurrentUser } from '../../common/decorators/current-user.decorator';
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
  findOne(@Param('id') id: string) {
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
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateOrganizationSchema)) body: unknown,
  ) {
    return this.orgsService.update(id, body as any);
  }

  @Get(':id/members')
  getMembers(@Param('id') id: string) {
    return this.orgsService.getMembers(id);
  }

  @Post(':id/members')
  inviteMember(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(inviteMemberSchema)) body: unknown,
  ) {
    return this.orgsService.inviteMember(id, body as any);
  }

  @Delete(':id/members/:userId')
  removeMember(@Param('id') id: string, @Param('userId') userId: string) {
    return this.orgsService.removeMember(id, userId);
  }
}
