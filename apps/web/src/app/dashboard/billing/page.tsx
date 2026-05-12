'use client';

import { useEffect, useState } from 'react';
import { Check, Zap, Building2, Rocket } from 'lucide-react';
import { clsx } from 'clsx';
import { api } from '@/lib/api';

interface Plan {
  id: string;
  name: string;
  maxAgents: number;
  maxConversations: number;
  maxStorageMb: number;
  mcpEnabled: boolean;
  stripePriceId: string | null;
}

interface Usage {
  plan: string;
  totals: { conversations: number; tokensUsed: number; agentCount: number };
  limits: { maxAgents: number; maxConversations: number; maxStorageMb: number };
  agents: { agentId: string; name: string; conversations: number; tokensUsed: number }[];
}

const PLAN_ICONS: Record<string, React.ElementType> = {
  free: Zap,
  pro: Rocket,
  enterprise: Building2,
};

function UsageBar({ used, max, label }: { used: number; max: number; label: string }) {
  const pct = max === -1 ? 0 : Math.min(100, Math.round((used / max) * 100));
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{label}</span>
        <span>{max === -1 ? `${used} / ∞` : `${used} / ${max}`}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full">
        <div
          className={clsx('h-2 rounded-full transition-all', pct >= 80 ? 'bg-red-500' : 'bg-verana-600')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function BillingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/billing/plans'), api.get('/billing/usage')]).then(([p, u]) => {
      setPlans(p.data);
      setUsage(u.data);
    }).finally(() => setLoading(false));
  }, []);

  const handleUpgrade = async (planId: string) => {
    const appUrl = window.location.origin;
    const { data } = await api.post('/billing/checkout', {
      plan: planId,
      successUrl: `${appUrl}/dashboard/billing?success=1`,
      cancelUrl: `${appUrl}/dashboard/billing`,
    });
    if (data.url) window.location.href = data.url;
  };

  const handleManageBilling = async () => {
    const { data } = await api.post('/billing/portal', {
      returnUrl: window.location.href,
    });
    if (data.url) window.location.href = data.url;
  };

  if (loading) return <div className="p-8 text-gray-500">Cargando...</div>;

  const currentPlan = usage?.plan ?? 'free';

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Planes y Facturación</h1>
      <p className="text-gray-500 mb-8">Gestiona tu suscripción y revisa el uso actual.</p>

      {/* Current usage */}
      {usage && (
        <div className="card p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-gray-500 font-medium uppercase mb-1">Plan actual</p>
              <p className="text-lg font-bold capitalize text-verana-600">{currentPlan}</p>
            </div>
            {currentPlan !== 'free' && (
              <button onClick={handleManageBilling} className="btn-secondary text-sm">
                Gestionar facturación
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-4">
            <UsageBar used={usage.totals.agentCount} max={usage.limits.maxAgents} label="Agentes" />
            <UsageBar used={usage.totals.conversations} max={usage.limits.maxConversations} label="Conversaciones este mes" />
            <UsageBar used={Math.round(usage.totals.tokensUsed / 1000)} max={usage.limits.maxStorageMb} label="Storage (MB)" />
          </div>
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-3 gap-6">
        {plans.map((plan) => {
          const Icon = PLAN_ICONS[plan.id] ?? Zap;
          const isCurrent = plan.id === currentPlan;
          const isPaid = !!plan.stripePriceId;

          const features = [
            `${plan.maxAgents === -1 ? 'Agentes ilimitados' : `${plan.maxAgents} agente(s)`}`,
            `${plan.maxConversations === -1 ? 'Conversaciones ilimitadas' : `${plan.maxConversations.toLocaleString()} conversaciones/mes`}`,
            `${plan.maxStorageMb === -1 ? 'Storage ilimitado' : `${plan.maxStorageMb} MB de knowledge base`}`,
            plan.mcpEnabled ? 'Integraciones MCP ilimitadas' : 'Sin integracines MCP',
          ];

          return (
            <div
              key={plan.id}
              className={clsx('card p-6 flex flex-col', isCurrent && 'ring-2 ring-verana-600')}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-verana-100 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-verana-600" />
                </div>
                <span className="font-bold text-gray-900">{plan.name}</span>
              </div>

              {isCurrent && (
                <span className="self-start px-2 py-0.5 text-xs rounded-full bg-verana-100 text-verana-700 font-medium mb-3">
                  Plan actual
                </span>
              )}

              <ul className="space-y-2 mt-2 mb-6 flex-1">
                {features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {!isCurrent && isPaid && (
                <button onClick={() => handleUpgrade(plan.id)} className="btn-primary text-sm w-full">
                  Actualizar a {plan.name}
                </button>
              )}
              {!isCurrent && !isPaid && (
                <button disabled className="btn-secondary text-sm w-full opacity-50 cursor-not-allowed">
                  Plan gratuito
                </button>
              )}
              {isCurrent && (
                <div className="text-center text-sm text-gray-400">Plan activo</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Per-agent usage breakdown */}
      {usage && usage.agents.length > 0 && (
        <div className="mt-8">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Uso por agente (mes actual)</h2>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left text-xs text-gray-500 font-medium">Agente</th>
                  <th className="px-4 py-2 text-right text-xs text-gray-500 font-medium">Conversaciones</th>
                  <th className="px-4 py-2 text-right text-xs text-gray-500 font-medium">Tokens usados</th>
                </tr>
              </thead>
              <tbody>
                {usage.agents.map((a, i) => (
                  <tr key={a.agentId} className={clsx('border-b border-gray-100', i % 2 === 0 && 'bg-white')}>
                    <td className="px-4 py-2 font-medium text-gray-900">{a.name}</td>
                    <td className="px-4 py-2 text-right text-gray-600">{a.conversations.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right text-gray-600">{a.tokensUsed.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
