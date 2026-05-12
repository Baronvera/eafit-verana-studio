'use client';

import Link from 'next/link';
import { MoreVertical, RefreshCw, Square, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { useState } from 'react';
import { api } from '@/lib/api';

interface Agent {
  id: string;
  name: string;
  status: string;
  did?: string;
  network: string;
  llmProvider: string;
  model: string;
  org: { name: string };
  _count?: { documents: number; mcpServers: number };
}

const STATUS_LABELS: Record<string, string> = {
  RUNNING: 'Activo',
  PENDING: 'Pendiente',
  PROVISIONING: 'Desplegando',
  STOPPED: 'Detenido',
  ERROR: 'Error',
};

const LLM_LABELS: Record<string, string> = {
  anthropic: 'Claude',
  openai: 'GPT-4o',
  ollama: 'Ollama',
};

export function AgentCard({ agent, onRefresh }: { agent: Agent; onRefresh: () => void }) {
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const handleRestart = async () => {
    setLoading(true);
    try {
      await api.post(`/agents/${agent.id}/restart`);
      onRefresh();
    } finally {
      setLoading(false);
      setShowMenu(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`¿Eliminar el agente "${agent.name}"? Esta acción no se puede deshacer.`)) return;
    setLoading(true);
    try {
      await api.delete(`/agents/${agent.id}`);
      onRefresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-5 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={clsx('status-dot', `status-${agent.status.toLowerCase()}`)} />
          <span className="text-xs text-gray-500 font-medium">{STATUS_LABELS[agent.status] || agent.status}</span>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="text-gray-400 hover:text-gray-600 p-1 rounded"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {showMenu && (
            <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10 text-sm">
              <button
                onClick={handleRestart}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 w-full text-left"
              >
                <RefreshCw className="w-3 h-3" /> Reiniciar AI
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-3 py-2 hover:bg-red-50 text-red-600 w-full text-left"
              >
                <Trash2 className="w-3 h-3" /> Eliminar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Name & Org */}
      <Link href={`/dashboard/agents/${agent.id}`}>
        <h3 className="font-semibold text-gray-900 hover:text-verana-600 transition-colors">{agent.name}</h3>
      </Link>
      <p className="text-xs text-gray-500 mt-0.5">{agent.org.name}</p>

      {/* DID */}
      {agent.did && (
        <p className="text-xs font-mono text-gray-400 mt-2 truncate" title={agent.did}>
          {agent.did.slice(0, 40)}...
        </p>
      )}

      {/* Tags */}
      <div className="flex gap-2 mt-3 flex-wrap">
        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
          {LLM_LABELS[agent.llmProvider] || agent.llmProvider}
        </span>
        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
          {agent.network}
        </span>
        {agent._count && (
          <>
            <span className="px-2 py-0.5 bg-purple-50 text-purple-700 text-xs rounded-full">
              {agent._count.documents} docs
            </span>
            {agent._count.mcpServers > 0 && (
              <span className="px-2 py-0.5 bg-orange-50 text-orange-700 text-xs rounded-full">
                {agent._count.mcpServers} MCP
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
