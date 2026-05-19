import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createSupabaseAdmin } from '@agente-ia/database';

export interface DashboardMetrics {
  agents_active: number;
  agents_total: number;
  conversations_today: number;
  conversations_total: number;
  messages_today: number;
  messages_total: number;
  tokens_today: { input: number; output: number };
  tokens_total: { input: number; output: number };
  avg_response_time_ms: number | null;
  conversations_by_status: Record<string, number>;
  messages_by_hour: { hour: number; count: number }[];
  top_agents: { id: string; name: string; conversations: number; messages: number }[];
}

@Injectable()
export class MetricsService {
  private supabase;

  constructor(private configService: ConfigService) {
    this.supabase = createSupabaseAdmin(
      this.configService.getOrThrow('app.supabaseUrl'),
      this.configService.getOrThrow('app.supabaseServiceRoleKey'),
    );
  }

  async getDashboardMetrics(organizationId: string): Promise<DashboardMetrics> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    // Queries em paralelo
    const [
      agentsResult,
      convsResult,
      convsTodayResult,
      msgsTotalResult,
      msgsTodayResult,
      tokensTotalResult,
      tokensTodayResult,
      convsByStatusResult,
      msgsByHourResult,
      topAgentsResult,
    ] = await Promise.all([
      // Agentes
      this.supabase
        .from('agents')
        .select('id, status')
        .eq('organization_id', organizationId),
      // Conversas total
      this.supabase
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId),
      // Conversas hoje
      this.supabase
        .from('conversations')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .gte('created_at', todayISO),
      // Mensagens total
      this.supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId),
      // Mensagens hoje
      this.supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .gte('created_at', todayISO),
      // Tokens total
      this.supabase
        .from('messages')
        .select('tokens_input, tokens_output')
        .eq('organization_id', organizationId)
        .eq('role', 'assistant')
        .not('tokens_input', 'is', null),
      // Tokens hoje
      this.supabase
        .from('messages')
        .select('tokens_input, tokens_output')
        .eq('organization_id', organizationId)
        .eq('role', 'assistant')
        .gte('created_at', todayISO)
        .not('tokens_input', 'is', null),
      // Conversas por status
      this.supabase
        .from('conversations')
        .select('status')
        .eq('organization_id', organizationId),
      // Mensagens por hora (últimas 24h)
      this.supabase
        .from('messages')
        .select('created_at')
        .eq('organization_id', organizationId)
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
      // Top agentes
      this.supabase
        .from('agents')
        .select('id, name, conversations(id), messages:conversations(messages(id))')
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .limit(5),
    ]);

    // Processar agentes
    const agents = agentsResult.data || [];
    const agents_active = agents.filter((a) => a.status === 'active').length;
    const agents_total = agents.length;

    // Processar tokens
    const tokensTotal = (tokensTotalResult.data || []).reduce(
      (acc, m) => ({ input: acc.input + (m.tokens_input || 0), output: acc.output + (m.tokens_output || 0) }),
      { input: 0, output: 0 },
    );
    const tokensToday = (tokensTodayResult.data || []).reduce(
      (acc, m) => ({ input: acc.input + (m.tokens_input || 0), output: acc.output + (m.tokens_output || 0) }),
      { input: 0, output: 0 },
    );

    // Conversas por status
    const conversations_by_status: Record<string, number> = {};
    (convsByStatusResult.data || []).forEach((c) => {
      conversations_by_status[c.status] = (conversations_by_status[c.status] || 0) + 1;
    });

    // Mensagens por hora
    const hourCounts: Record<number, number> = {};
    (msgsByHourResult.data || []).forEach((m) => {
      const hour = new Date(m.created_at).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    const messages_by_hour = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: hourCounts[i] || 0,
    }));

    // Top agentes (simplificado)
    const top_agents = (topAgentsResult.data || []).map((a: any) => ({
      id: a.id,
      name: a.name,
      conversations: Array.isArray(a.conversations) ? a.conversations.length : 0,
      messages: 0,
    }));

    return {
      agents_active,
      agents_total,
      conversations_today: convsTodayResult.count || 0,
      conversations_total: convsResult.count || 0,
      messages_today: msgsTodayResult.count || 0,
      messages_total: msgsTotalResult.count || 0,
      tokens_today: tokensToday,
      tokens_total: tokensTotal,
      avg_response_time_ms: null,
      conversations_by_status,
      messages_by_hour,
      top_agents,
    };
  }
}
