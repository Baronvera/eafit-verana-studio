'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';

interface Step {
  step: number;
  name: string;
  status: 'pending' | 'running' | 'done' | 'error';
  message?: string;
}

const STEP_NAMES = [
  'Obtener DID del vs-agent',
  'Obtener DID Document del ECS Trust Registry',
  'Solicitar credencial de Organización',
  'Vincular credencial al DID Document',
  'Obtener schema Service del ECS',
  'Crear permiso ISSUER en blockchain Verana',
  'Esperando efectividad del permiso (15-21s)',
  'Emitir credencial de Servicio',
  'Verificar Trust Resolver',
];

export function DeployTerminal({
  agentId,
  onComplete,
  onError,
}: {
  agentId: string;
  onComplete: (did: string) => void;
  onError: () => void;
}) {
  const [steps, setSteps] = useState<Step[]>(
    STEP_NAMES.map((name, i) => ({ step: i + 1, name, status: 'pending' })),
  );
  const [agentStatus, setAgentStatus] = useState('PROVISIONING');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Poll provisioning steps y status del agente
    pollRef.current = setInterval(async () => {
      try {
        const [stepsRes, agentRes] = await Promise.all([
          api.get(`/agents/${agentId}/provisioning-steps`),
          api.get(`/agents/${agentId}`),
        ]);

        if (stepsRes.data.length > 0) {
          setSteps((prev) => {
            const updated = [...prev];
            for (const s of stepsRes.data as Step[]) {
              const idx = s.step - 1;
              if (idx >= 0 && idx < updated.length) updated[idx] = s;
            }
            return updated;
          });
        }

        const agent = agentRes.data;
        setAgentStatus(agent.status);

        if (agent.status === 'RUNNING') {
          clearInterval(pollRef.current!);
          onComplete(agent.did || '');
        } else if (agent.status === 'ERROR') {
          clearInterval(pollRef.current!);
          onError();
        }
      } catch {
        // retry
      }
    }, 2000);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [agentId, onComplete, onError]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="mb-6 text-center">
          <div className="flex items-center justify-center gap-2 text-white mb-2">
            <Loader2 className="w-5 h-5 animate-spin text-verana-500" />
            <span className="font-semibold">Desplegando agente...</span>
          </div>
          <p className="text-gray-400 text-sm">Los 9 pasos de provisioning on-chain están en progreso</p>
        </div>

        <div className="bg-gray-800 rounded-xl p-6 font-mono text-sm space-y-3">
          {steps.map((step) => (
            <div key={step.step} className="flex items-start gap-3">
              <span className="text-gray-500 w-4 shrink-0">{step.step}.</span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  {step.status === 'done' && <CheckCircle className="w-4 h-4 text-green-400 shrink-0" />}
                  {step.status === 'running' && <Loader2 className="w-4 h-4 text-verana-400 animate-spin shrink-0" />}
                  {step.status === 'error' && <XCircle className="w-4 h-4 text-red-400 shrink-0" />}
                  {step.status === 'pending' && <span className="w-4 h-4 border border-gray-600 rounded-full shrink-0" />}
                  <span
                    className={
                      step.status === 'done'
                        ? 'text-green-400'
                        : step.status === 'running'
                        ? 'text-white'
                        : step.status === 'error'
                        ? 'text-red-400'
                        : 'text-gray-500'
                    }
                  >
                    {step.name}
                  </span>
                </div>
                {step.message && (
                  <p className="text-gray-400 text-xs mt-0.5 ml-6">{step.message}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
