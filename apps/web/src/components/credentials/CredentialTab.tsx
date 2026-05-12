'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Award, Plus, Trash2, RotateCcw, CheckCircle,
  XCircle, Clock, ChevronDown, ChevronRight, ToggleLeft, ToggleRight, Loader2,
} from 'lucide-react';
import { clsx } from 'clsx';
import { api } from '@/lib/api';

// ── Tipos ─────────────────────────────────────────────────────────────────

interface CredType {
  id: string; name: string; version: string; credDefId?: string;
  attributes: { name: string; type: string }[];
  _count?: { issuanceFlows: number };
}

interface ClaimMapping {
  attributeName: string;
  source: 'fixed' | 'session' | 'mcp_tool';
  value?: string;
  sessionKey?: string;
  toolKey?: string;
}

interface IssuanceFlow {
  id: string; triggerType: string; active: boolean;
  credType: { name: string; version: string; credDefId?: string };
  claimsConfig: { mappings: { attributeName: string; source: string; value?: string }[]; triggerCommand?: string };
}

interface VerificationFlow {
  id: string; credDefId: string; postAction: string; active: boolean;
  requestedAttributes: { name: string; credDefId: string }[];
}

interface IssuedCred {
  id: string; type: string; status: string; issuedAt?: string; createdAt: string;
  raw?: { credDefId?: string; connectionId?: string; type?: string };
}

interface Stats {
  totalIssued: number; active: number; revoked: number; types: number;
}

type SubTab = 'types' | 'issuance' | 'verification' | 'issued';

const TRIGGER_LABELS: Record<string, string> = {
  ON_CONNECT: 'Al conectar',
  ON_AUTH: 'Tras autenticar',
  ON_COMMAND: 'Por comando',
};

// ── Componente principal ──────────────────────────────────────────────────

export function CredentialTab({ agentId }: { agentId: string }) {
  const [subTab, setSubTab] = useState<SubTab>('types');
  const [types, setTypes] = useState<CredType[]>([]);
  const [issuanceFlows, setIssuanceFlows] = useState<IssuanceFlow[]>([]);
  const [verFlows, setVerFlows] = useState<VerificationFlow[]>([]);
  const [issued, setIssued] = useState<IssuedCred[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const base = `/agents/${agentId}/credentials`;

  const fetchAll = useCallback(async () => {
    const results = await Promise.allSettled([
      api.get(`${base}/types`),
      api.get(`${base}/issuance-flows`),
      api.get(`${base}/verification-flows`),
      api.get(`${base}/issued`),
      api.get(`${base}/stats`),
    ]);
    if (results[0].status === 'fulfilled') setTypes(results[0].value.data);
    if (results[1].status === 'fulfilled') setIssuanceFlows(results[1].value.data);
    if (results[2].status === 'fulfilled') setVerFlows(results[2].value.data);
    if (results[3].status === 'fulfilled') setIssued(results[3].value.data);
    if (results[4].status === 'fulfilled') setStats(results[4].value.data);
    setLoading(false);
  }, [agentId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleDeleteType = async (id: string) => {
    if (!confirm('¿Eliminar este tipo de credencial?')) return;
    await api.delete(`${base}/types/${id}`);
    fetchAll();
  };

  const handleRevoke = async (credId: string) => {
    if (!confirm('¿Revocar esta credencial?')) return;
    await api.post(`${base}/issued/${credId}/revoke`);
    fetchAll();
  };

  const handleRevokeByType = async (credDefId: string) => {
    if (!confirm('¿Revocar TODAS las credenciales emitidas de este tipo? Esta acción es irreversible.')) return;
    await api.post(`${base}/revoke-by-type`, { credDefId });
    fetchAll();
  };

  const handleToggleIssuance = async (flowId: string, active: boolean) => {
    await api.patch(`${base}/issuance-flows/${flowId}/toggle`, { active: !active });
    fetchAll();
  };

  const handleToggleVerification = async (flowId: string, active: boolean) => {
    await api.patch(`${base}/verification-flows/${flowId}/toggle`, { active: !active });
    fetchAll();
  };

  const SUB_TABS: { id: SubTab; label: string; count?: number }[] = [
    { id: 'types', label: 'Tipos', count: types.length },
    { id: 'issuance', label: 'Emisión', count: issuanceFlows.length },
    { id: 'verification', label: 'Verificación', count: verFlows.length },
    { id: 'issued', label: 'Emitidas', count: issued.length },
  ];

  if (loading) return <div className="text-center py-8 text-gray-400 text-sm">Cargando...</div>;

  return (
    <div className="space-y-5">

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total emitidas', value: stats.totalIssued, color: 'text-gray-900' },
            { label: 'Activas', value: stats.active, color: 'text-green-600' },
            { label: 'Revocadas', value: stats.revoked, color: 'text-red-500' },
            { label: 'Tipos definidos', value: stats.types, color: 'text-verana-600' },
          ].map((s) => (
            <div key={s.label} className="card p-3 text-center">
              <p className={clsx('text-2xl font-bold', s.color)}>{s.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-gray-100 pb-0">
        {SUB_TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={clsx(
              'px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px',
              subTab === t.id
                ? 'border-verana-600 text-verana-700 bg-verana-50'
                : 'border-transparent text-gray-500 hover:text-gray-700',
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tipos de Credencial ────────────────────────────────────── */}
      {subTab === 'types' && (
        <div className="space-y-3">
          <CreateCredTypeForm agentId={agentId} onCreated={fetchAll} />
          {types.length === 0
            ? <Empty text="No hay tipos definidos" sub="Crea el primero para empezar a emitir credenciales" />
            : types.map((t) => (
              <div key={t.id} className="card p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-verana-500" />
                      <p className="font-semibold text-gray-900">{t.name}</p>
                      <span className="text-xs text-gray-400">v{t.version}</span>
                    </div>
                    {t.credDefId && (
                      <p className="text-xs font-mono text-gray-400 mt-1 truncate max-w-sm" title={t.credDefId}>
                        {t.credDefId}
                      </p>
                    )}
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {t.attributes.map((a) => (
                        <span key={a.name} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
                          {a.name} <span className="text-blue-400">({a.type})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <button onClick={() => handleDeleteType(t.id)} className="text-gray-400 hover:text-red-500 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    {t.credDefId && (
                      <button 
                        onClick={() => handleRevokeByType(t.credDefId!)}
                        className="text-[10px] text-red-500 hover:underline font-medium"
                      >
                        Revocar todas
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* ── Flujos de Emisión ──────────────────────────────────────── */}
      {subTab === 'issuance' && (
        <div className="space-y-3">
          <CreateIssuanceFlowForm agentId={agentId} types={types} onCreated={fetchAll} />
          {issuanceFlows.length === 0
            ? <Empty text="No hay flujos de emisión" sub="Crea uno para emitir credenciales automáticamente" />
            : issuanceFlows.map((flow) => (
              <div key={flow.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={clsx(
                        'px-2 py-0.5 text-xs rounded-full font-medium',
                        flow.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500',
                      )}>
                        {TRIGGER_LABELS[flow.triggerType] || flow.triggerType}
                      </span>
                      <p className="font-medium text-sm text-gray-900">{flow.credType.name}</p>
                      <span className="text-xs text-gray-400">v{flow.credType.version}</span>
                    </div>
                    {flow.claimsConfig.triggerCommand && (
                      <p className="text-xs text-gray-500 mt-1">
                        Comando: <span className="font-mono bg-gray-100 px-1 rounded">{flow.claimsConfig.triggerCommand}</span>
                      </p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {flow.claimsConfig.mappings?.length || 0} atributos mapeados
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => api.delete(`${base}/issuance-flows/${flow.id}`).then(fetchAll)} className="text-gray-400 hover:text-red-500 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleToggleIssuance(flow.id, flow.active)} className={flow.active ? 'text-verana-500' : 'text-gray-300'}>
                      {flow.active ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* ── Flujos de Verificación ─────────────────────────────────── */}
      {subTab === 'verification' && (
        <div className="space-y-3">
          <CreateVerificationFlowForm agentId={agentId} types={types} onCreated={fetchAll} />
          {verFlows.length === 0
            ? <Empty text="No hay flujos de verificación" sub="Crea uno para solicitar credenciales a los usuarios" />
            : verFlows.map((flow) => (
              <div key={flow.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={clsx(
                        'px-2 py-0.5 text-xs rounded-full font-medium',
                        flow.active ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500',
                      )}>
                        {flow.postAction}
                      </span>
                    </div>
                    <p className="text-xs font-mono text-gray-400 mt-1 truncate max-w-xs">{flow.credDefId}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Solicita: {flow.requestedAttributes.map((a) => a.name).join(', ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => api.delete(`${base}/verification-flows/${flow.id}`).then(fetchAll)} className="text-gray-400 hover:text-red-500 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleToggleVerification(flow.id, flow.active)} className={flow.active ? 'text-verana-500' : 'text-gray-300'}>
                      {flow.active ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* ── Credenciales Emitidas ──────────────────────────────────── */}
      {subTab === 'issued' && (
        <div className="space-y-2">
          {issued.length === 0
            ? <Empty text="Sin credenciales emitidas aún" sub="Las credenciales aparecen aquí cuando los usuarios las aceptan" />
            : issued.map((cred) => {
              const raw = cred.raw as any;
              const claims = raw?.claims || {};
              const claimKeys = Object.keys(claims);

              return (
                <div key={cred.id} className="card p-4">
                  <div className="flex items-start gap-3">
                    {cred.status === 'ACTIVE'
                      ? <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                      : cred.status === 'REVOKED'
                      ? <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                      : <Clock className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900">
                          {raw?.type === 'verification' ? 'Verificación' : cred.type}
                        </p>
                        <span className={clsx(
                          'px-1.5 py-0.5 text-[10px] rounded-full font-bold uppercase tracking-wider',
                          cred.status === 'ACTIVE' ? 'bg-green-100 text-green-700'
                            : cred.status === 'REVOKED' ? 'bg-red-100 text-red-600'
                            : 'bg-yellow-100 text-yellow-700',
                        )}>
                          {cred.status}
                        </span>
                      </div>
                      
                      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                        <p className="text-xs text-gray-500">
                          <span className="font-medium">ID:</span> <span className="font-mono">{cred.id.slice(0, 8)}...</span>
                        </p>
                        {raw?.connectionId && (
                          <p className="text-xs text-gray-500">
                            <span className="font-medium">Conexión:</span> <span className="font-mono text-[10px]">{raw.connectionId.slice(0, 12)}...</span>
                          </p>
                        )}
                        <p className="text-xs text-gray-400">
                          {cred.issuedAt ? new Date(cred.issuedAt).toLocaleString() : new Date(cred.createdAt).toLocaleString()}
                        </p>
                      </div>

                      {claimKeys.length > 0 && (
                        <div className="mt-2 grid grid-cols-2 gap-2 bg-gray-50 rounded-lg p-2 border border-gray-100">
                          {claimKeys.map(k => (
                            <div key={k} className="text-[10px] truncate">
                              <span className="text-gray-400 font-medium uppercase mr-1">{k}:</span>
                              <span className="text-gray-700 font-mono">{String(claims[k])}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {cred.status === 'ACTIVE' && (
                      <button onClick={() => handleRevoke(cred.id)} className="text-gray-400 hover:text-red-500 p-1 transition-colors" title="Revocar credencial">
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}

// ── Sub-formularios ───────────────────────────────────────────────────────

function Empty({ text, sub }: { text: string; sub: string }) {
  return (
    <div className="text-center py-10 border-2 border-dashed border-gray-200 rounded-xl">
      <Award className="w-8 h-8 text-gray-300 mx-auto mb-2" />
      <p className="text-gray-500 font-medium text-sm">{text}</p>
      <p className="text-gray-400 text-xs mt-1">{sub}</p>
    </div>
  );
}

function CreateCredTypeForm({ agentId, onCreated }: { agentId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [version, setVersion] = useState('1.0');
  const [attrs, setAttrs] = useState([{ name: '', type: 'text' }]);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!name || attrs.some((a) => !a.name)) return;
    setLoading(true);
    await api.post(`/agents/${agentId}/credentials/types`, {
      name, version, attributes: attrs,
    }).catch(console.error);
    setOpen(false); setName(''); setAttrs([{ name: '', type: 'text' }]);
    setLoading(false); onCreated();
  };

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <span className="flex items-center gap-2"><Plus className="w-4 h-4" /> Nuevo tipo de credencial</span>
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {open && (
        <div className="p-4 border-t border-gray-100 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Nombre *</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Membresía" />
            </div>
            <div>
              <label className="label">Versión</label>
              <input className="input" value={version} onChange={(e) => setVersion(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Atributos</label>
            <div className="space-y-2">
              {attrs.map((a, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className="input flex-1"
                    placeholder="nombre_atributo"
                    value={a.name}
                    onChange={(e) => setAttrs((prev) => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                  />
                  <select
                    className="input w-28"
                    value={a.type}
                    onChange={(e) => setAttrs((prev) => prev.map((x, j) => j === i ? { ...x, type: e.target.value } : x))}
                  >
                    {['text', 'date', 'number', 'image'].map((t) => <option key={t}>{t}</option>)}
                  </select>
                  {attrs.length > 1 && (
                    <button onClick={() => setAttrs((prev) => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button onClick={() => setAttrs((p) => [...p, { name: '', type: 'text' }])} className="text-sm text-verana-600 hover:underline flex items-center gap-1">
                <Plus className="w-3 h-3" /> Añadir atributo
              </button>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setOpen(false)} className="btn-secondary">Cancelar</button>
            <button onClick={submit} disabled={loading} className="btn-primary flex items-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} Registrar on-chain
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateIssuanceFlowForm({ agentId, types, onCreated }: { agentId: string; types: CredType[]; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [credTypeId, setCredTypeId] = useState('');
  const [trigger, setTrigger] = useState('ON_CONNECT');
  const [command, setCommand] = useState('');
  const [mappings, setMappings] = useState<ClaimMapping[]>([]);
  const [loading, setLoading] = useState(false);

  const selectedType = types.find((t) => t.id === credTypeId);

  useEffect(() => {
    if (selectedType) {
      setMappings(selectedType.attributes.map(a => ({
        attributeName: a.name,
        source: 'fixed',
        value: '',
      })));
    } else {
      setMappings([]);
    }
  }, [credTypeId, selectedType]);

  const updateMapping = (index: number, field: keyof ClaimMapping, val: string) => {
    setMappings(prev => prev.map((m, i) => i === index ? { ...m, [field]: val } : m));
  };

  const submit = async () => {
    if (!credTypeId) return;
    setLoading(true);
    await api.post(`/agents/${agentId}/credentials/issuance-flows`, {
      credTypeId,
      triggerType: trigger,
      triggerCommand: trigger === 'ON_COMMAND' ? command : undefined,
      claimsMappings: mappings,
      active: true,
    }).catch(console.error);
    setOpen(false); setLoading(false); onCreated();
  };

  if (types.length === 0) return null;

  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-4 text-sm font-medium text-gray-700 hover:bg-gray-50">
        <span className="flex items-center gap-2"><Plus className="w-4 h-4" /> Nuevo flujo de emisión</span>
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {open && (
        <div className="p-4 border-t border-gray-100 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tipo de credencial *</label>
              <select className="input" value={credTypeId} onChange={(e) => setCredTypeId(e.target.value)}>
                <option value="">— Selecciona —</option>
                {types.map((t) => <option key={t.id} value={t.id}>{t.name} v{t.version}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Trigger</label>
              <select className="input" value={trigger} onChange={(e) => setTrigger(e.target.value)}>
                <option value="ON_CONNECT">Al conectar</option>
                <option value="ON_AUTH">Tras autenticar</option>
                <option value="ON_COMMAND">Por comando</option>
              </select>
            </div>
          </div>

          {trigger === 'ON_COMMAND' && (
            <div>
              <label className="label">Frase trigger</label>
              <input className="input" value={command} onChange={(e) => setCommand(e.target.value)} placeholder="Ej: solicitar certificado" />
            </div>
          )}

          {selectedType && (
            <div className="space-y-3">
              <label className="label">Mapeo de Atributos (Claims)</label>
              <div className="space-y-2">
                {mappings.map((m, i) => (
                  <div key={m.attributeName} className="flex gap-2 items-center">
                    <span className="text-xs font-medium text-gray-600 w-24 truncate" title={m.attributeName}>
                      {m.attributeName}
                    </span>
                    <select 
                      className="input w-32" 
                      value={m.source} 
                      onChange={(e) => updateMapping(i, 'source', e.target.value)}
                    >
                      <option value="fixed">Fijo</option>
                      <option value="session">Sesión</option>
                      <option value="mcp_tool">MCP Tool</option>
                    </select>
                    <input 
                      className="input flex-1" 
                      placeholder={
                        m.source === 'fixed' ? 'Valor estático' : 
                        m.source === 'session' ? 'Clave de sesión' : 'ID del tool MCP'
                      }
                      value={m.source === 'fixed' ? (m.value || '') : (m.source === 'session' ? (m.sessionKey || '') : (m.toolKey || ''))}
                      onChange={(e) => updateMapping(i, m.source === 'fixed' ? 'value' : (m.source === 'session' ? 'sessionKey' : 'toolKey'), e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button onClick={() => setOpen(false)} className="btn-secondary">Cancelar</button>
            <button onClick={submit} disabled={loading || !credTypeId} className="btn-primary flex items-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} Crear flujo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateVerificationFlowForm({ agentId, types, onCreated }: { agentId: string; types: CredType[]; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [credTypeId, setCredTypeId] = useState('');
  const [postAction, setPostAction] = useState('continue');
  const [loading, setLoading] = useState(false);

  const selectedType = types.find((t) => t.id === credTypeId);

  const submit = async () => {
    if (!credTypeId || !selectedType?.credDefId) return;
    setLoading(true);
    await api.post(`/agents/${agentId}/credentials/verification-flows`, {
      credDefId: selectedType.credDefId,
      requestedAttributes: selectedType.attributes.map((a) => ({
        name: a.name,
        credDefId: selectedType.credDefId,
      })),
      postAction,
      active: true,
    }).catch(console.error);
    setOpen(false); setLoading(false); onCreated();
  };

  const hasTypes = types.some((t) => t.credDefId);
  if (!hasTypes) return null;

  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-4 text-sm font-medium text-gray-700 hover:bg-gray-50">
        <span className="flex items-center gap-2"><Plus className="w-4 h-4" /> Nuevo flujo de verificación</span>
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
      </button>
      {open && (
        <div className="p-4 border-t border-gray-100 space-y-3">
          <div>
            <label className="label">Tipo de credencial a verificar *</label>
            <select className="input" value={credTypeId} onChange={(e) => setCredTypeId(e.target.value)}>
              <option value="">— Selecciona —</option>
              {types.filter((t) => t.credDefId).map((t) => <option key={t.id} value={t.id}>{t.name} v{t.version}</option>)}
            </select>
          </div>
          {selectedType && (
            <div>
              <label className="label">Atributos a solicitar</label>
              <div className="flex gap-1.5 flex-wrap">
                {selectedType.attributes.map((a) => (
                  <span key={a.name} className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">{a.name}</span>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="label">Acción post-verificación</label>
            <select className="input" value={postAction} onChange={(e) => setPostAction(e.target.value)}>
              <option value="continue">Continuar conversación</option>
              <option value="block">Bloquear si falla</option>
              <option value="custom_response">Respuesta personalizada</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setOpen(false)} className="btn-secondary">Cancelar</button>
            <button onClick={submit} disabled={loading || !credTypeId} className="btn-primary flex items-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} Crear flujo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
