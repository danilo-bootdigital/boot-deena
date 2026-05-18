import { Controller, Get, Put, Body, UseGuards, ForbiddenException } from '@nestjs/common';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ProfilesService } from './profiles.service';
import { updateProfileSchema } from './dto/update-profile.dto';

@Controller('profiles')
@UseGuards(SupabaseAuthGuard)
export class ProfilesController {
  constructor(private profilesService: ProfilesService) {}

  @Get('me')
  getMyProfile(@CurrentUser('id') userId: string) {
    return this.profilesService.findOne(userId);
  }

  @Put('me')
  updateMyProfile(
    @CurrentUser('id') userId: string,
    @Body(new ZodValidationPipe(updateProfileSchema)) body: unknown,
  ) {
    return this.profilesService.update(userId, body as any);
  }

  @Get('organization')
  getOrgProfiles(@CurrentOrg() orgId: string) {
    if (!orgId) {
      throw new ForbiddenException('Organization ID is required');
    }
    return this.profilesService.findByOrganization(orgId);
  }
}
