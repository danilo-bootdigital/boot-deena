import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, ForbiddenException, Req } from '@nestjs/common';
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
      .insert({
        name: body.name,
        slug: body.slug,
        plan: 'free',
        max_agents: 3,
        max_conversations_per_month: 1000,
        settings: {},
      })
      .select()
      .single();

    if (error) throw error;

    // Vincular o master admin como owner da nova empresa
    const user = req.user;
    await this.supabase.from('org_members').insert({
      organization_id: data.id,
      user_id: user.id,
      role: 'owner',
      all_agents: true,
    });

    return data;
  }

  @Put('organizations/:id')
  async updateOrganization(@Req() req: any, @Param('id') id: string, @Body() body: { name: string; slug: string }) {
    await this.assertMasterAdmin(req);

    const { data, error } = await this.supabase
      .from('organizations')
      .update({ name: body.name, slug: body.slug })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  @Delete('organizations/:id')
  async deleteOrganization(@Req() req: any, @Param('id') id: string) {
    await this.assertMasterAdmin(req);

    // Remover membros da org
    await this.supabase.from('org_members').delete().eq('organization_id', id);
    // Remover agentes da org
    await this.supabase.from('agents').delete().eq('organization_id', id);
    // Remover conversas da org
    await this.supabase.from('conversations').delete().eq('organization_id', id);
    // Remover leads da org
    await this.supabase.from('leads').delete().eq('organization_id', id);
    // Remover a organização
    const { error } = await this.supabase.from('organizations').delete().eq('id', id);

    if (error) throw error;
    return { deleted: true };
  }
}
