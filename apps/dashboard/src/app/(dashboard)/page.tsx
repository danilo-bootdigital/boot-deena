'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { useApiClient } from '@/hooks/use-api-client';

interface DashboardMetrics {
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
  top_agents: { id: string; name: string; conversations: number }[];
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

export default function DashboardPage() {
  const api = useApiClient();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  async function loadMetrics() {
    try {
      const data = await api.get<DashboardMetrics>('/metrics/dashboard');
      setMetrics(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-dark-50 tracking-tight">Dashboard</h1>
        <p className="text-sm text-dark-400">Carregando métricas...</p>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-dark-50 tracking-tight">Dashboard</h1>
        <p className="text-sm text-dark-400">Não foi possível carregar as métricas.</p>
      </div>
    );
  }

  const maxHourCount = Math.max(...metrics.messages_by_hour.map((h) => h.count), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-dark-50 tracking-tight">Dashboard</h1>
        <span className="text-xs text-dark-400">Atualizado agora</span>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label="Agentes Ativos"
          value={metrics.agents_active}
          subtitle={`${metrics.agents_total} total`}
          color="brand"
        />
        <MetricCard
          label="Conversas Hoje"
          value={metrics.conversations_today}
          subtitle={`${formatNumber(metrics.conversations_total)} total`}
          color="accent"
        />
        <MetricCard
          label="Mensagens Hoje"
          value={metrics.messages_today}
          subtitle={`${formatNumber(metrics.messages_total)} total`}
          color="brand"
        />
        <MetricCard
          label="Tokens Hoje"
          value={formatNumber(metrics.tokens_today.input + metrics.tokens_today.output)}
          subtitle={`${formatNumber(metrics.tokens_total.input + metrics.tokens_total.output)} total`}
          color="accent"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Chart */}
        <Card className="lg:col-span-2">
          <CardContent>
            <h2 className="text-xs font-medium text-dark-300 uppercase tracking-wide mb-5">Mensagens — últimas 24h</h2>
            <div className="flex items-end gap-[3px] h-36">
              {metrics.messages_by_hour.map((h) => (
                <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-sm bg-brand-500/60 hover:bg-brand-500 transition-colors"
                    style={{ height: `${(h.count / maxHourCount) * 100}%`, minHeight: h.count > 0 ? '3px' : '0' }}
                    title={`${h.hour}h: ${h.count}`}
                  />
                  {h.hour % 6 === 0 && (
                    <span className="text-[9px] text-dark-500 mt-1">{h.hour}h</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Status */}
        <Card>
          <CardContent>
            <h2 className="text-xs font-medium text-dark-300 uppercase tracking-wide mb-5">Por Status</h2>
            <div className="space-y-3">
              {Object.entries(metrics.conversations_by_status).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2 h-2 rounded-full ${
                      status === 'open' ? 'bg-accent-500' :
                      status === 'closed' ? 'bg-dark-500' :
                      status === 'archived' ? 'bg-yellow-500' :
                      'bg-brand-500'
                    }`} />
                    <span className="text-sm text-dark-200">{
                      status === 'open' ? 'Abertas' :
                      status === 'closed' ? 'Encerradas' :
                      status === 'archived' ? 'Arquivadas' :
                      status
                    }</span>
                  </div>
                  <span className="text-sm font-medium text-dark-100">{count}</span>
                </div>
              ))}
              {Object.keys(metrics.conversations_by_status).length === 0 && (
                <p className="text-xs text-dark-500">Nenhuma conversa ainda</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Agents */}
        <Card>
          <CardContent>
            <h2 className="text-xs font-medium text-dark-300 uppercase tracking-wide mb-5">Top Agentes</h2>
            {metrics.top_agents.length === 0 ? (
              <p className="text-xs text-dark-500">Nenhum agente ativo</p>
            ) : (
              <div className="space-y-3">
                {metrics.top_agents.map((agent, i) => (
                  <div key={agent.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-dark-500 w-4">{String(i + 1).padStart(2, '0')}</span>
                      <span className="text-sm text-dark-100">{agent.name}</span>
                    </div>
                    <span className="text-xs text-dark-400">{agent.conversations} conversas</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tokens */}
        <Card>
          <CardContent>
            <h2 className="text-xs font-medium text-dark-300 uppercase tracking-wide mb-5">Consumo de Tokens</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] text-dark-400 uppercase tracking-wide mb-2">Hoje</p>
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-semibold text-brand-400">{formatNumber(metrics.tokens_today.input)}</span>
                    <span className="text-[10px] text-dark-500">input</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-semibold text-accent-500">{formatNumber(metrics.tokens_today.output)}</span>
                    <span className="text-[10px] text-dark-500">output</span>
                  </div>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-dark-400 uppercase tracking-wide mb-2">Total</p>
                <div className="space-y-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-semibold text-brand-400">{formatNumber(metrics.tokens_total.input)}</span>
                    <span className="text-[10px] text-dark-500">input</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-semibold text-accent-500">{formatNumber(metrics.tokens_total.output)}</span>
                    <span className="text-[10px] text-dark-500">output</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ label, value, subtitle, color }: { label: string; value: string | number; subtitle: string; color: 'brand' | 'accent' }) {
  return (
    <Card>
      <CardContent>
        <p className="text-xs text-dark-400 mb-1">{label}</p>
        <p className={`text-2xl font-semibold tracking-tight ${color === 'brand' ? 'text-dark-50' : 'text-dark-50'}`}>
          {value}
        </p>
        <p className="text-[11px] text-dark-500 mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}
