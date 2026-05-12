'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  RefreshCw,
  Trash2,
  Activity,
  FileText,
  Wrench,
  Award,
  QrCode,
  Terminal,
  BarChart2,
  Globe,
} from 'lucide-react';
import { clsx } from 'clsx';
import { api } from '@/lib/api';
import { QRCodeSVG } from 'qrcode.react';
import { KnowledgeTab } from '@/components/knowledge/KnowledgeTab';
import { McpTab } from '@/components/mcp/McpTab';
import { CredentialTab } from '@/components/credentials/CredentialTab';
import { AnalyticsTab } from '@/components/analytics/AnalyticsTab';

type Tab = 'overview' | 'knowledge' | 'mcp' | 'credentials' | 'terminal' | 'qr' | 'analytics' | 'domain';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'knowledge', label: 'Conocimiento', icon: FileText },
  { id: 'mcp', label: 'Herramientas', icon: Wrench },
  { id: 'credentials', label: 'Credenciales', icon: Award },
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  { id: 'terminal', label: 'Logs', icon: Terminal },
  { id: 'qr', label: 'QR Hologram', icon: QrCode },
  { id: 'domain', label: 'Dominio', icon: Globe },
];

function DomainTab({ agentId }: { agentId: string }) {
  const [status, setStatus] = useState<any>(null);
  const [domain, setDomain] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/agents/${agentId}/domain`).then((r) => setStatus(r.data)).catch(() => {});
  }, [agentId]);

  const setCustomDomain = async () => {
    if (!domain) return;
    setSaving(true);
    try {
      const r = await api.post(`/agents/${agentId}/domain`, { domain });
      setStatus(r.data);
      setDomain('');
    } finally {
      setSaving(false);
    }
  };

  const removeDomain = async () => {
    if (!confirm('¿Eliminar dominio personalizado?')) return;
    await api.delete(`/agents/${agentId}/domain`);
    setStatus(null);
  };

  return (
    <div className="space-y-4 max-w-lg">
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">Dominio personalizado</h3>
        <p className="text-xs text-gray-500 mb-4">
          Conecta tu propio dominio al agente. Requiere plan Pro o Enterprise.
        </p>

        {status?.domain ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono text-gray-800">{status.domain}</span>
              <span className={clsx(
                'px-2 py-0.5 text-xs rounded-full font-medium',
                status.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700',
              )}>
                {status.status === 'active' ? 'Activo' : 'Verificando...'}
              </span>
            </div>
            {status.status !== 'active' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                <p className="font-semibold mb-1">Crea este registro CNAME en tu DNS:</p>
                <p className="font-mono">{status.domain} → {status.cnameTarget}</p>
                <p className="mt-1 text-blue-500">Verificación automática cada 5 minutos.</p>
              </div>
            )}
            <button onClick={removeDomain} className="text-xs text-red-500 hover:text-red-700">
              Eliminar dominio
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              className="input flex-1"
              placeholder="mi-agente.miempresa.com"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
            />
            <button onClick={setCustomDomain} disabled={saving || !domain} className="btn-primary shrink-0">
              {saving ? '...' : 'Configurar'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [agent, setAgent] = useState<any>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAgent = () =>
    api.get(`/agents/${id}`).then((r) => setAgent(r.data)).catch(console.error);

  useEffect(() => {
    fetchAgent().finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (tab !== 'terminal') return;
    const es = new EventSource(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/agents/${id}/logs`);
    es.onmessage = (e) => setLogs((prev) => [...prev.slice(-200), e.data]);
    return () => es.close();
  }, [tab, id]);

  const handleRestart = async () => {
    await api.post(`/agents/${id}/restart`);
    fetchAgent();
  };

  const handleDelete = async () => {
    if (!confirm('¿Eliminar este agente? Esta acción es irreversible.')) return;
    await api.delete(`/agents/${id}`);
    window.location.href = '/dashboard';
  };

  if (loading) return <div className="p-8 text-gray-500">Cargando...</div>;
  if (!agent) return <div className="p-8 text-red-500">Agente no encontrado</div>;

  const hologramUrl = agent.did ? `https://hologram.app/connect?did=${encodeURIComponent(agent.did)}` : '';

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={clsx('status-dot', `status-${agent.status.toLowerCase()}`)} />
            <span className="text-xs text-gray-500 font-medium uppercase">{agent.status}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{agent.name}</h1>
          <p className="text-sm text-gray-500">{agent.org?.name} · {agent.network}</p>
          {agent.did && (
            <p className="text-xs font-mono text-gray-400 mt-1 truncate max-w-lg">{agent.did}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={handleRestart} className="btn-secondary flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Reiniciar AI
          </button>
          <button onClick={handleDelete} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm font-medium">
            <Trash2 className="w-4 h-4" /> Eliminar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <div className="flex gap-0">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                  tab === t.id
                    ? 'border-verana-600 text-verana-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700',
                )}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="grid grid-cols-2 gap-4">
          <div className="card p-4">
            <p className="text-xs text-gray-500 font-medium mb-3">Configuración LLM</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Proveedor</span><span className="font-medium">{agent.llmProvider}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Modelo</span><span className="font-medium">{agent.model}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Temperatura</span><span className="font-medium">{agent.temperature}</span></div>
            </div>
          </div>
          <div className="card p-4">
            <p className="text-xs text-gray-500 font-medium mb-3">Stack</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Puerto público</span><span className="font-mono">{agent.stack?.publicPort || '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Documentos</span><span className="font-medium">{agent.documents?.length || 0}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">MCPs</span><span className="font-medium">{agent.mcpServers?.length || 0}</span></div>
            </div>
          </div>
          <div className="card p-4 col-span-2">
            <p className="text-xs text-gray-500 font-medium mb-2">Prompt del sistema</p>
            <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap bg-gray-50 rounded-lg p-3 max-h-40 overflow-auto">
              {agent.prompt}
            </pre>
          </div>
        </div>
      )}

      {tab === 'knowledge' && <KnowledgeTab agentId={id} />}

      {tab === 'mcp' && <McpTab agentId={id} />}

      {tab === 'credentials' && <CredentialTab agentId={id} />}

      {tab === 'analytics' && <AnalyticsTab agentId={id} />}

      {tab === 'domain' && <DomainTab agentId={id} />}

      {tab === 'terminal' && (
        <div className="bg-gray-900 rounded-xl p-4 h-96 overflow-auto font-mono text-xs text-green-400">
          {logs.length === 0 ? (
            <p className="text-gray-500">Esperando logs...</p>
          ) : (
            logs.map((line, i) => <div key={i}>{line}</div>)
          )}
        </div>
      )}

      {tab === 'qr' && (
        <div className="flex flex-col items-center py-8">
          <p className="text-sm text-gray-600 mb-6">
            Comparte este QR para que los usuarios se conecten a tu agente desde Hologram.
          </p>
          {hologramUrl ? (
            <>
              <div className="card p-6">
                <QRCodeSVG value={hologramUrl} size={200} />
              </div>
              <p className="text-xs font-mono text-gray-400 mt-4 max-w-sm text-center break-all">{hologramUrl}</p>
              <button
                onClick={() => navigator.clipboard.writeText(hologramUrl)}
                className="btn-secondary mt-4"
              >
                Copiar URL de invitación
              </button>
            </>
          ) : (
            <p className="text-gray-500 text-sm">El agente aún no tiene DID asignado.</p>
          )}
        </div>
      )}
    </div>
  );
}
