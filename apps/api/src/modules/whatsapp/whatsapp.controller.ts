import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { SupabaseAuthGuard } from '../../common/guards/supabase-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentOrg } from '../../common/decorators/current-org.decorator';
import { WhatsappService } from './whatsapp.service';
import { ConfigService } from '@nestjs/config';
import { createSupabaseAdmin } from '@agente-ia/database';

@Controller('whatsapp')
@UseGuards(SupabaseAuthGuard, RolesGuard)
export class WhatsappController {
  private supabase;

  constructor(
    private whatsappService: WhatsappService,
    private configService: ConfigService,
  ) {
    this.supabase = createSupabaseAdmin(
      this.configService.getOrThrow('app.supabaseUrl'),
      this.configService.getOrThrow('app.supabaseServiceRoleKey'),
    );
  }

  @Get('instances')
  async listInstances(@CurrentOrg() orgId: string) {
    const { data, error } = await this.supabase
      .from('whatsapp_instances')
      .select('*, agents(id, name)')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  @Post('instances')
  @Roles('owner', 'admin')
  async createInstance(
    @Body() body: { name: string; agentId?: string },
    @CurrentOrg() orgId: string,
  ) {
    if (!body.name || !/^[a-zA-Z0-9_-]+$/.test(body.name)) {
      throw new BadRequestException('Nome inválido. Use apenas letras, números, - e _');
    }

    const webhookUrl = `${this.configService.get('app.publicUrl') || process.env.API_PUBLIC_URL || 'http://localhost:3001'}/api/v1/webhook/evolution`;

    // Criar no Evolution API
    const result = await this.whatsappService.createInstance(body.name, webhookUrl) as any;

    // Salvar no banco
    const { data: instance, error } = await this.supabase
      .from('whatsapp_instances')
      .insert({
        organization_id: orgId,
        instance_name: body.name,
        instance_id: result?.instance?.instanceId || null,
        status: 'qr_pending',
        evolution_instance_data: result,
      })
      .select()
      .single();

    if (error) throw error;

    // Vincular ao agente se informado
    if (body.agentId) {
      await this.supabase
        .from('agents')
        .update({ whatsapp_instance_id: instance.id })
        .eq('id', body.agentId)
        .eq('organization_id', orgId);
    }

    return instance;
  }

  @Get('instances/:name/status')
  async getStatus(@Param('name') name: string, @CurrentOrg() orgId: string) {
    try {
      const status = await this.whatsappService.getInstanceStatus(name) as any;

      // Atualizar status no banco
      const newStatus = status?.state === 'open' ? 'connected' : 'disconnected';
      await this.supabase
        .from('whatsapp_instances')
        .update({ status: newStatus, phone_number: status?.instance?.wuid?.split(':')[0] || null })
        .eq('instance_name', name)
        .eq('organization_id', orgId);

      return { state: status?.state, dbStatus: newStatus };
    } catch {
      return { state: 'close', dbStatus: 'disconnected' };
    }
  }

  @Get('instances/:name/qr')
  async getQrCode(@Param('name') name: string) {
    return this.whatsappService.getQrCode(name);
  }

  @Put('instances/:instanceId/agent')
  @Roles('owner', 'admin')
  async linkAgent(
    @Param('instanceId') instanceId: string,
    @Body() body: { agentId: string | null },
    @CurrentOrg() orgId: string,
  ) {
    // Desvincular agente anterior
    await this.supabase
      .from('agents')
      .update({ whatsapp_instance_id: null })
      .eq('whatsapp_instance_id', instanceId)
      .eq('organization_id', orgId);

    // Vincular novo agente
    if (body.agentId) {
      await this.supabase
        .from('agents')
        .update({ whatsapp_instance_id: instanceId })
        .eq('id', body.agentId)
        .eq('organization_id', orgId);
    }

    return { linked: true };
  }

  @Delete('instances/:name')
  @Roles('owner', 'admin')
  async deleteInstance(@Param('name') name: string, @CurrentOrg() orgId: string) {
    // Remover do Evolution API
    try {
      await this.whatsappService.deleteInstance(name);
    } catch {
      // Pode já não existir no Evolution
    }

    // Remover do banco
    const { error } = await this.supabase
      .from('whatsapp_instances')
      .delete()
      .eq('instance_name', name)
      .eq('organization_id', orgId);

    if (error) throw error;
    return { deleted: true };
  }
}
