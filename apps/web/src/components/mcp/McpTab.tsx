'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Plus, Trash2, ToggleLeft, ToggleRight,
  Play, Loader2, CheckCircle, XCircle, Clock, Info, X
} from 'lucide-react';
import { clsx } from 'clsx';
import { api } from '@/lib/api';

// ── Tipos ─────────────────────────────────────────────────────────────────

interface ConnectorTemplate {
  id: string; name: string; description: string; icon: string;
  authType: string; toolCount: number;
  type?: string;
  urlTemplate?: string;
  credentialFields: { key: string; label: string; type: string; required?: boolean }[];
}

interface McpServer {
  id: string; name: string; status: string; authType: string; url: string;
  tools: { id: string; name: string; description: string; enabled: boolean }[];
}

interface InvocationLog {
  id: string; toolName: string; durationMs?: number; error?: string;
  input?: any; output?: any;
  createdAt: string; mcpServer: { name: string };
}

const STATUS_COLOR: Record<string, string> = {
  CONNECTED: 'text-green-600 bg-green-50',
  CONNECTING: 'text-yellow-600 bg-yellow-50',
  ERROR: 'text-red-600 bg-red-50',
  DISCONNECTED: 'text-gray-500 bg-gray-100',
};

// ── Componente principal ──────────────────────────────────────────────────

export function McpTab({ agentId }: { agentId: string }) {
  const [servers, setServers] = useState<McpServer[]>([]);
  const [catalog, setCatalog] = useState<ConnectorTemplate[]>([]);
  const [logs, setLogs] = useState<InvocationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState<InvocationLog | null>(null);
  const [testResult, setTestResult] = useState<{ toolKey: string; result: unknown } | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'servers' | 'logs'>('servers');

  const fetchAll = useCallback(async () => {
    const [serversRes, catalogRes, logsRes] = await Promise.allSettled([
      api.get(`/agents/${agentId}/mcp`),
      api.get(`${process.env.NEXT_PUBLIC_BRIDGE_URL || 'http://localhost:3002'}/connectors`),
      api.get(`/agents/${agentId}/mcp/logs?limit=50`),
    ]);
    if (serversRes.status === 'fulfilled') setServers(serversRes.value.data);
    if (catalogRes.status === 'fulfilled') setCatalog(catalogRes.value.data);
    if (logsRes.status === 'fulfilled') setLogs(logsRes.value.data);
    setLoading(false);
  }, [agentId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleRemove = async (serverId: string) => {
    if (!confirm('¿Desconectar este MCP server?')) return;
    await api.delete(`/agents/${agentId}/mcp/${serverId}`);
    fetchAll();
  };

  const handleToggleTool = async (toolId: string, enabled: boolean) => {
    await api.patch(`/agents/${agentId}/mcp/tools/${toolId}`, { enabled: !enabled });
    fetchAll();
  };

  const handleTestTool = async (toolKey: string, input: any = {}) => {
    setTesting(toolKey);
    try {
      const { data } = await api.post(`/agents/${agentId}/mcp/test`, { toolKey, input });
      setTestResult({ toolKey, result: data });
      // Refresh logs after a manual test
      setTimeout(fetchAll, 1000);
    } catch (err: any) {
      setTestResult({ toolKey, result: { error: err.response?.data?.message || err.message } });
    } finally {
      setTesting(null);
    }
  };

  if (loading) return <div className="text-center py-8 text-gray-400 text-sm">Cargando...</div>;

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveView('servers')}
            className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium', activeView === 'servers' ? 'bg-verana-50 text-verana-700' : 'text-gray-500 hover:bg-gray-100')}
          >
            Servidores ({servers.length})
          </button>
          <button
            onClick={() => setActiveView('logs')}
            className={clsx('px-3 py-1.5 rounded-lg text-sm font-medium', activeView === 'logs' ? 'bg-verana-50 text-verana-700' : 'text-gray-500 hover:bg-gray-100')}
          >
            Logs ({logs.length})
          </button>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Conectar MCP
        </button>
      </div>

      {/* Vista Servidores */}
      {activeView === 'servers' && (
        <div>
          {servers.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl">
              <p className="text-gray-400 font-medium">No hay MCPs conectados</p>
              <p className="text-gray-400 text-sm mt-1">Conecta Notion, GitHub, Slack o tu propia API</p>
              <button onClick={() => setShowAddModal(true)} className="btn-primary mt-4 inline-flex items-center gap-2">
                <Plus className="w-4 h-4" /> Conectar primer MCP
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {servers.map((server) => (
                <ServerCard
                  key={server.id}
                  server={server}
                  onRemove={() => handleRemove(server.id)}
                  onToggleTool={handleToggleTool}
                  onTestTool={handleTestTool}
                  testing={testing}
                  testResult={testResult?.toolKey.startsWith(server.name) ? testResult : null}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Vista Logs */}
      {activeView === 'logs' && (
        <div className="space-y-2">
          {logs.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">No hay invocaciones aún</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="card p-3 flex items-center gap-3 text-sm">
                {log.error
                  ? <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                  : <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-gray-800">{log.mcpServer?.name || 'Unknown'}</span>
                  <span className="text-gray-400 mx-1">·</span>
                  <span className="text-gray-600 font-mono text-xs">{log.toolName}</span>
                  {log.error && <p className="text-red-500 text-xs truncate">{log.error}</p>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                   <button 
                    onClick={() => setSelectedLog(log)}
                    className="p-1 text-gray-400 hover:text-verana-600 transition-colors"
                    title="Inspeccionar JSON"
                   >
                    <Info className="w-4 h-4" />
                   </button>
                  <div className="flex flex-col items-end text-[10px] text-gray-400 leading-tight">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />{log.durationMs || '?'}ms
                    </span>
                    <span>{new Date(log.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddMcpModal
          agentId={agentId}
          catalog={catalog}
          onClose={() => { setShowAddModal(false); fetchAll(); }}
        />
      )}

      {selectedLog && (
        <LogInspectorModal log={selectedLog} onClose={() => setSelectedLog(null)} />
      )}
    </div>
  );
}

// ── ServerCard ────────────────────────────────────────────────────────────

function ServerCard({
  server, onRemove, onToggleTool, onTestTool, testing, testResult,
}: {
  server: McpServer;
  onRemove: () => void;
  onToggleTool: (id: string, enabled: boolean) => void;
  onTestTool: (toolKey: string, input: any) => void;
  testing: string | null;
  testResult: { toolKey: string; result: unknown } | null;
}) {
  const [showTestForm, setShowTestForm] = useState<string | null>(null);
  const [testInput, setTestInput] = useState('{}');

  const runTest = (toolName: string) => {
    try {
      const input = JSON.parse(testInput);
      onTestTool(`${server.name}__${toolName}`, input);
    } catch {
      alert('JSON de entrada inválido');
    }
  };

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div>
            <p className="font-semibold text-gray-900">{server.name}</p>
            <p className="text-xs text-gray-400 font-mono truncate max-w-xs">{server.url}</p>
          </div>
          <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLOR[server.status] || STATUS_COLOR.DISCONNECTED)}>
            {server.status.toLowerCase()}
          </span>
        </div>
        <button onClick={onRemove} className="text-gray-400 hover:text-red-500 p-1 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Tools */}
      {server.tools.length > 0 && (
        <div className="divide-y divide-gray-50">
          {server.tools.map((tool) => {
            const toolKey = `${server.name}__${tool.name}`;
            const isTestingThis = testing === toolKey;
            const hasResult = testResult?.toolKey === toolKey;
            const isFormOpen = showTestForm === tool.name;

            return (
              <div key={tool.id} className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{tool.name}</p>
                    <p className="text-xs text-gray-400 truncate">{tool.description}</p>
                  </div>
                  <button
                    onClick={() => setShowTestForm(isFormOpen ? null : tool.name)}
                    disabled={!tool.enabled || isTestingThis}
                    className="text-xs text-verana-600 hover:text-verana-700 font-medium disabled:opacity-40"
                  >
                    {isFormOpen ? 'Cerrar' : 'Probar'}
                  </button>
                  <button
                    onClick={() => onToggleTool(tool.id, tool.enabled)}
                    className={clsx('transition-colors', tool.enabled ? 'text-verana-500' : 'text-gray-300')}
                  >
                    {tool.enabled
                      ? <ToggleRight className="w-5 h-5" />
                      : <ToggleLeft className="w-5 h-5" />}
                  </button>
                </div>

                {/* Test Form */}
                {isFormOpen && (
                  <div className="mt-3 space-y-2 animate-fade-in">
                    <label className="text-[10px] uppercase font-bold text-gray-400">Argumentos JSON</label>
                    <textarea 
                      className="input font-mono text-xs h-24"
                      value={testInput}
                      onChange={(e) => setTestInput(e.target.value)}
                    />
                    <div className="flex justify-end">
                      <button 
                        onClick={() => runTest(tool.name)}
                        disabled={isTestingThis}
                        className="btn-primary py-1 px-3 text-xs flex items-center gap-2"
                      >
                        {isTestingThis ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                        Ejecutar Tool
                      </button>
                    </div>
                  </div>
                )}

                {/* Test result */}
                {hasResult && !isFormOpen && (
                  <div className="mt-2">
                    <label className="text-[10px] uppercase font-bold text-gray-400">Resultado</label>
                    <pre className="text-xs bg-gray-900 rounded-lg p-3 overflow-auto max-h-48 text-green-400 font-mono">
                      {JSON.stringify(testResult!.result, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── LogInspectorModal ─────────────────────────────────────────────────────

function LogInspectorModal({ log, onClose }: { log: InvocationLog; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Detalle de Invocación</h2>
            <p className="text-xs text-gray-500">{log.mcpServer.name} · {log.toolName} · {new Date(log.createdAt).toLocaleString()}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 overflow-auto space-y-6 flex-1">
          {/* Input */}
          <section>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Input (Arguments)</h3>
            <pre className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs font-mono text-gray-700 overflow-auto">
              {JSON.stringify(log.input || {}, null, 2)}
            </pre>
          </section>

          {/* Output / Error */}
          <section>
            <h3 className={clsx('text-xs font-bold uppercase tracking-wider mb-2', log.error ? 'text-red-500' : 'text-gray-400')}>
              {log.error ? 'Error' : 'Output (Result)'}
            </h3>
            <pre className={clsx(
              'rounded-xl p-4 text-xs font-mono overflow-auto border',
              log.error ? 'bg-red-50 border-red-100 text-red-700' : 'bg-gray-900 border-gray-800 text-green-400'
            )}>
              {log.error || JSON.stringify(log.output || {}, null, 2)}
            </pre>
          </section>
        </div>

        <div className="p-4 border-t border-gray-100 flex justify-end">
          <button onClick={onClose} className="btn-secondary">Cerrar</button>
        </div>
      </div>
    </div>
  );
}

// ── AddMcpModal ───────────────────────────────────────────────────────────

function AddMcpModal({
  agentId, catalog, onClose,
}: {
  agentId: string;
  catalog: ConnectorTemplate[];
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<ConnectorTemplate | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!selected) return;
    setLoading(true);
    setError('');
    try {
      const url = form.url || selected.urlTemplate || '';
      const credentials: Record<string, string> = {};
      for (const field of selected.credentialFields) {
        if (form[field.key]) credentials[field.key] = form[field.key];
      }

      await api.post(`/agents/${agentId}/mcp`, {
        name: selected.id,
        type: selected.type,
        url,
        authType: selected.authType,
        credentials,
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al conectar el MCP server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Conectar MCP Server</h2>
          <p className="text-sm text-gray-500 mt-0.5">Elige un conector o configura tu propia API</p>
        </div>

        <div className="p-6 space-y-4">
          {/* Galería */}
          {!selected && (
            <div className="grid grid-cols-2 gap-3">
              {catalog.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className="border border-gray-200 rounded-xl p-4 text-left hover:border-verana-400 hover:bg-verana-50 transition-colors"
                >
                  <div className="text-2xl mb-2">{c.icon}</div>
                  <p className="font-medium text-sm text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{c.description}</p>
                  <p className="text-xs text-verana-600 mt-1">{c.toolCount} tools</p>
                </button>
              ))}
            </div>
          )}

          {/* Formulario de credenciales */}
          {selected && (
            <div>
              <button onClick={() => setSelected(null)} className="text-sm text-verana-600 hover:underline mb-4">
                ← Volver al catálogo
              </button>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{selected.icon}</span>
                <div>
                  <p className="font-semibold">{selected.name}</p>
                  <p className="text-xs text-gray-500">{selected.authType.replace('_', ' ').toUpperCase()}</p>
                </div>
              </div>

              <div className="space-y-3">
                {selected.credentialFields.map((field) => (
                  <div key={field.key}>
                    <label className="label">{field.label}{field.required && ' *'}</label>
                    <input
                      className="input"
                      type={field.type === 'password' ? 'password' : 'text'}
                      value={form[field.key] || ''}
                      onChange={(e) => setForm((p) => ({ ...p, [field.key]: e.target.value }))}
                      placeholder={field.type === 'url' ? 'https://...' : ''}
                    />
                  </div>
                ))}
              </div>

              {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          {selected && (
            <button onClick={handleSubmit} disabled={loading} className="btn-primary flex items-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Conectar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
