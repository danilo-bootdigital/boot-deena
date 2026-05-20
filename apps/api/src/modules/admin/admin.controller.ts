import { Controller, Get, Post, Body, UseGuards, ForbiddenException, Req } from '@nestjs/common';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';

@Controller('admin')
@UseGuards(SupabaseAuthGuard)
export class AdminController {
  private supabase;

  constructor(private configService: ConfigService) {
    this.supabase = createClient(
      this.configService.getOrThrow('app.supabaseUrl'),
      this.configService.getOrThrow('app.supabaseServiceRoleKey'),
    );
  }

  private async assertMasterAdmin(req: any) {
    const user = req.user;
    if (!user) throw new ForbiddenException('Not authenticated');

    const { data: profile } = await this.supabase
      .from('profiles')
      .select('is_master_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_master_admin) {
      throw new ForbiddenException('Acesso restrito a Master Admin');
    }
  }

  @Get('organizations')
  async listOrganizations(@Req() req: any) {
    await this.assertMasterAdmin(req);

    const { data, error } = await this.supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  @Post('organizations')
  async createOrganization(@Req() req: any, @Body() body: { name: string; slug: string }) {
    await this.assertMasterAdmin(req);

    const { data, error } = await this.supabase
      .from('organizations')
      .insert({ name: body.name, slug: body.slug })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
