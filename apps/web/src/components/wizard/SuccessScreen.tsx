'use client';

import { CheckCircle, Copy, ExternalLink } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useState } from 'react';

export function SuccessScreen({
  agentId,
  did,
  onGoToDashboard,
}: {
  agentId: string;
  did: string;
  onGoToDashboard: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const hologramUrl = `https://hologram.app/connect?did=${encodeURIComponent(did)}`;

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Agente desplegado</h1>
        <p className="text-gray-500 text-sm mb-8">
          Tu agente tiene identidad verificable on-chain y está listo para Hologram.
        </p>

        {/* DID */}
        <div className="card p-4 mb-6 text-left">
          <p className="text-xs text-gray-500 font-medium mb-1">DID del agente</p>
          <div className="flex items-center gap-2">
            <p className="font-mono text-xs text-gray-700 flex-1 truncate">{did}</p>
            <button onClick={() => copy(did)} className="text-gray-400 hover:text-gray-600">
              <Copy className="w-4 h-4" />
            </button>
          </div>
          {copied && <p className="text-xs text-green-600 mt-1">Copiado!</p>}
        </div>

        {/* QR Hologram */}
        <div className="card p-6 mb-6">
          <p className="text-sm font-medium text-gray-700 mb-4">
            Escanea en Hologram para conectar
          </p>
          <div className="flex justify-center">
            <QRCodeSVG value={hologramUrl} size={160} />
          </div>
          <button
            onClick={() => copy(hologramUrl)}
            className="mt-3 text-xs text-verana-600 hover:underline flex items-center gap-1 mx-auto"
          >
            <Copy className="w-3 h-3" /> Copiar URL de invitación
          </button>
        </div>

        <div className="flex gap-3">
          <button className="btn-secondary flex-1" onClick={onGoToDashboard}>
            Ver Dashboard
          </button>
          <a
            href={`/dashboard/agents/${agentId}`}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            Gestionar agente <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
