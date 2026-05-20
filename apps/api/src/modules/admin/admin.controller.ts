import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

@Controller('admin')
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('master_admin')
export class AdminController {
  private supabase;

  constructor(private configService: ConfigService) {
    this.supabase = createClient(
      this.configService.getOrThrow('app.supabaseUrl'),
      this.configService.getOrThrow('app.supabaseServiceRoleKey'),
    );
  }

  @Get('organizations')
  async listOrganizations() {
    const { data, error } = await this.supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  @Post('organizations')
  async createOrganization(@Body() body: { name: string; slug: string }) {
    const { data, error } = await this.supabase
      .from('organizations')
      .insert({ name: body.name, slug: body.slug })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
