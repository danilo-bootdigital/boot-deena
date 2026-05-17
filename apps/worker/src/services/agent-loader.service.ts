import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createSupabaseAdmin } from '@agente-ia/database';
import type { AgentConfig } from '@agente-ia/ai';

@Injectable()
export class AgentLoaderService {
  private supabase;

  constructor(private configService: ConfigService) {
    this.supabase = createSupabaseAdmin(
      this.configService.getOrThrow('worker.supabaseUrl'),
      this.configService.getOrThrow('worker.supabaseServiceRoleKey'),
    );
  }

  async load(agentId: string): Promise<AgentConfig> {
    const { data, error } = await this.supabase
      .from('agents')
      .select('id, organization_id, name, system_prompt, provider, model, temperature, max_tokens, settings')
      .eq('id', agentId)
      .single();

    if (error || !data) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    return {
      id: data.id,
      organizationId: data.organization_id,
      name: data.name,
      systemPrompt: data.system_prompt,
      provider: data.provider,
      model: data.model,
      temperature: Number(data.temperature),
      maxTokens: data.max_tokens,
      settings: data.settings || {},
    };
  }
}
