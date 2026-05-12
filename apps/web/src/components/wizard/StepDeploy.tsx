'use client';

import { Rocket } from 'lucide-react';

interface DeployData { network: string }

export function StepDeploy({
  data,
  onChange,
  onDeploy,
  onBack,
}: {
  data: DeployData;
  onChange: (v: Partial<DeployData>) => void;
  onDeploy: () => void;
  onBack: () => void;
}) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Desplegar agente</h2>
      <p className="text-sm text-gray-500 mb-6">
        Elige la red Verana y lanza el deploy automático de 9 pasos.
      </p>

      <div className="space-y-4">
        <div>
          <label className="label">Red Verana</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'testnet', label: 'Testnet', desc: 'Para desarrollo y pruebas' },
              { value: 'mainnet', label: 'Mainnet', desc: 'Producción — identidad real' },
            ].map((n) => (
              <button
                key={n.value}
                type="button"
                onClick={() => onChange({ network: n.value })}
                className={`border rounded-lg p-4 text-left transition-colors ${
                  data.network === n.value
                    ? 'border-verana-600 bg-verana-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <p className={`font-medium text-sm ${data.network === n.value ? 'text-verana-700' : 'text-gray-900'}`}>
                  {n.label}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{n.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">
          <strong>9 pasos automáticos:</strong> El deploy genera el DID, solicita credenciales al ECS Trust Registry,
          crea permiso ISSUER en blockchain y verifica el Trust Resolver. Tarda ~30-60 segundos.
        </div>
      </div>

      <div className="mt-6 flex justify-between">
        <button className="btn-secondary" onClick={onBack}>← Atrás</button>
        <button className="btn-primary flex items-center gap-2" onClick={onDeploy}>
          <Rocket className="w-4 h-4" />
          Lanzar deploy
        </button>
      </div>
    </div>
  );
}
