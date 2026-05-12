'use client';

import { useEffect, useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare, Zap, Download, TrendingUp } from 'lucide-react';
import { clsx } from 'clsx';
import { api } from '@/lib/api';

interface DashboardData {
  period: { days: number; since: string };
  totals: { messages: number; conversations: number; tokensUsed: number };
  dailyMessages: { date: string; user: number; agent: number }[];
  hourlyDistribution: { hour: number; count: number }[];
  avgSessionDurationMs: number | null;
  satisfaction: { thumbsUp: number; thumbsDown: number; total: number; rated: number; scorePercent: number | null };
  topCitedDocs: { docId: string; name: string; citations: number }[];
}

interface Intent {
  keyword: string;
  count: number;
}

interface AnalyticsTabProps {
  agentId: string;
}

function StatCard({ label, value, sub, icon: Icon }: { label: string; value: string | number; sub?: string; icon: React.ElementType }) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium mb-1">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className="w-8 h-8 rounded-lg bg-verana-100 flex items-center justify-center">
          <Icon className="w-4 h-4 text-verana-600" />
        </div>
      </div>
    </div>
  );
}

function SimpleBarChart({ data, maxVal }: { data: { label: string; value: number }[]; maxVal: number }) {
  return (
    <div className="space-y-1">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-2 text-xs">
          <span className="w-8 text-gray-500 text-right">{d.label}</span>
          <div className="flex-1 h-4 bg-gray-100 rounded">
            <div
              className="h-4 bg-verana-500 rounded"
              style={{ width: maxVal > 0 ? `${(d.value / maxVal) * 100}%` : '0%' }}
            />
          </div>
          <span className="w-8 text-gray-600">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

export function AnalyticsTab({ agentId }: AnalyticsTabProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [intents, setIntents] = useState<Intent[]>([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/agents/${agentId}/analytics/dashboard?days=${days}`),
      api.get(`/agents/${agentId}/analytics/intents?days=${days}&limit=15`),
    ]).then(([d, i]) => {
      setData(d.data);
      setIntents(i.data);
    }).finally(() => setLoading(false));
  }, [agentId, days]);

  const handleExport = () => {
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/agents/${agentId}/analytics/export?days=${days}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${agentId}.csv`;
    a.click();
  };

  if (loading) return <div className="text-sm text-gray-500">Cargando analytics...</div>;
  if (!data) return null;

  const { totals, satisfaction, dailyMessages, hourlyDistribution, topCitedDocs, avgSessionDurationMs } = data;
  const maxHourlyCount = Math.max(...hourlyDistribution.map((h) => h.count), 1);
  const maxDocCitations = Math.max(...topCitedDocs.map((d) => d.citations), 1);

  const formatDuration = (ms: number | null) => {
    if (!ms) return '—';
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={clsx(
                'px-3 py-1 text-sm rounded-lg font-medium border transition-colors',
                days === d
                  ? 'border-verana-600 bg-verana-50 text-verana-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300',
              )}
            >
              {d}d
            </button>
          ))}
        </div>
        <button onClick={handleExport} className="btn-secondary flex items-center gap-2 text-sm">
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Conversaciones" value={totals.conversations.toLocaleString()} icon={MessageSquare} />
        <StatCard label="Mensajes totales" value={totals.messages.toLocaleString()} icon={MessageSquare} />
        <StatCard label="Tokens usados" value={totals.tokensUsed.toLocaleString()} icon={Zap} />
        <StatCard
          label="Satisfacción"
          value={satisfaction.scorePercent !== null ? `${satisfaction.scorePercent}%` : '—'}
          sub={`${satisfaction.thumbsUp} 👍 · ${satisfaction.thumbsDown} 👎`}
          icon={ThumbsUp}
        />
      </div>

      {/* Session duration */}
      <div className="card p-4 flex items-center justify-between">
        <span className="text-sm text-gray-600">Duración promedio de sesión</span>
        <span className="font-semibold text-gray-900">{formatDuration(avgSessionDurationMs)}</span>
      </div>

      {/* Daily messages chart */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" /> Mensajes por día
        </h3>
        <div className="space-y-1 max-h-48 overflow-auto">
          {dailyMessages.slice(-14).map((d) => {
            const total = d.user + d.agent;
            const maxTotal = Math.max(...dailyMessages.map((x) => x.user + x.agent), 1);
            return (
              <div key={d.date} className="flex items-center gap-2 text-xs">
                <span className="w-20 text-gray-500 shrink-0">{d.date.slice(5)}</span>
                <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden flex">
                  <div className="bg-verana-400 h-4" style={{ width: `${(d.user / maxTotal) * 100}%` }} />
                  <div className="bg-verana-200 h-4" style={{ width: `${(d.agent / maxTotal) * 100}%` }} />
                </div>
                <span className="w-8 text-gray-600 text-right">{total}</span>
              </div>
            );
          })}
        </div>
        <div className="flex gap-4 mt-2">
          <span className="flex items-center gap-1 text-xs text-gray-500"><span className="w-3 h-3 rounded bg-verana-400 inline-block" /> Usuario</span>
          <span className="flex items-center gap-1 text-xs text-gray-500"><span className="w-3 h-3 rounded bg-verana-200 inline-block" /> Agente</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Hourly distribution */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Horas pico</h3>
          <SimpleBarChart
            data={hourlyDistribution.map((h) => ({ label: `${h.hour}h`, value: h.count }))}
            maxVal={maxHourlyCount}
          />
        </div>

        {/* Top intents */}
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Palabras clave frecuentes</h3>
          <div className="space-y-2">
            {intents.slice(0, 10).map((intent, i) => (
              <div key={intent.keyword} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-4">{i + 1}</span>
                  <span className="text-gray-800 font-medium">{intent.keyword}</span>
                </span>
                <span className="text-xs text-gray-500 font-mono">{intent.count}</span>
              </div>
            ))}
            {intents.length === 0 && <p className="text-sm text-gray-400">Sin datos aún</p>}
          </div>
        </div>
      </div>

      {/* Top cited documents */}
      {topCitedDocs.length > 0 && (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Documentos más citados</h3>
          <SimpleBarChart
            data={topCitedDocs.map((d) => ({ label: d.name.slice(0, 20), value: d.citations }))}
            maxVal={maxDocCitations}
          />
        </div>
      )}
    </div>
  );
}
