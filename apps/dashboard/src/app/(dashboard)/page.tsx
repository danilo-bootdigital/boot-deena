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
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-400">Carregando métricas...</p>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">Não foi possível carregar as métricas.</p>
      </div>
    );
  }

  const maxHourCount = Math.max(...metrics.messages_by_hour.map((h) => h.count), 1);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>

      {/* Cards principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Agentes Ativos</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{metrics.agents_active}</p>
            <p className="text-xs text-gray-400 mt-1">{metrics.agents_total} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Conversas Hoje</p>
            <p className="text-3xl font-bold text-blue-600 mt-1">{metrics.conversations_today}</p>
            <p className="text-xs text-gray-400 mt-1">{formatNumber(metrics.conversations_total)} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Mensagens Hoje</p>
            <p className="text-3xl font-bold text-green-600 mt-1">{formatNumber(metrics.messages_today)}</p>
            <p className="text-xs text-gray-400 mt-1">{formatNumber(metrics.messages_total)} total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500">Tokens Hoje</p>
            <p className="text-3xl font-bold text-purple-600 mt-1">
              {formatNumber(metrics.tokens_today.input + metrics.tokens_today.output)}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {formatNumber(metrics.tokens_total.input + metrics.tokens_total.output)} total
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Gráfico de mensagens por hora */}
        <Card className="lg:col-span-2">
          <CardContent className="pt-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Mensagens nas últimas 24h</h2>
            <div className="flex items-end gap-1 h-32">
              {metrics.messages_by_hour.map((h) => (
                <div key={h.hour} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full bg-blue-400 rounded-t transition-all hover:bg-blue-500"
                    style={{ height: `${(h.count / maxHourCount) * 100}%`, minHeight: h.count > 0 ? '4px' : '0' }}
                    title={`${h.hour}h: ${h.count} mensagens`}
                  />
                  {h.hour % 4 === 0 && (
                    <span className="text-[9px] text-gray-400">{h.hour}h</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Conversas por status */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Conversas por Status</h2>
            <div className="space-y-3">
              {Object.entries(metrics.conversations_by_status).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${
                      status === 'open' ? 'bg-green-500' :
                      status === 'closed' ? 'bg-gray-400' :
                      status === 'archived' ? 'bg-yellow-500' :
                      'bg-blue-500'
                    }`} />
                    <span className="text-sm text-gray-600 capitalize">{
                      status === 'open' ? 'Abertas' :
                      status === 'closed' ? 'Encerradas' :
                      status === 'archived' ? 'Arquivadas' :
                      status
                    }</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{count}</span>
                </div>
              ))}
              {Object.keys(metrics.conversations_by_status).length === 0 && (
                <p className="text-sm text-gray-400">Nenhuma conversa ainda</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top agentes e tokens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top agentes */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Top Agentes</h2>
            {metrics.top_agents.length === 0 ? (
              <p className="text-sm text-gray-400">Nenhum agente ativo</p>
            ) : (
              <div className="space-y-3">
                {metrics.top_agents.map((agent, i) => (
                  <div key={agent.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400 w-4">{i + 1}.</span>
                      <span className="text-sm text-gray-700">{agent.name}</span>
                    </div>
                    <span className="text-xs text-gray-500">{agent.conversations} conversas</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detalhamento de tokens */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Consumo de Tokens</h2>
            <div className="space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Hoje</p>
                <div className="flex gap-4">
                  <div>
                    <p className="text-lg font-bold text-blue-600">{formatNumber(metrics.tokens_today.input)}</p>
                    <p className="text-[10px] text-gray-400">Input</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-green-600">{formatNumber(metrics.tokens_today.output)}</p>
                    <p className="text-[10px] text-gray-400">Output</p>
                  </div>
                </div>
              </div>
              <div className="border-t pt-3">
                <p className="text-xs text-gray-500 mb-1">Total acumulado</p>
                <div className="flex gap-4">
                  <div>
                    <p className="text-lg font-bold text-blue-600">{formatNumber(metrics.tokens_total.input)}</p>
                    <p className="text-[10px] text-gray-400">Input</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-green-600">{formatNumber(metrics.tokens_total.output)}</p>
                    <p className="text-[10px] text-gray-400">Output</p>
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
