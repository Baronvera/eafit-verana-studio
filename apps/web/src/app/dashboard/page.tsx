'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bot, Plus, MoreVertical, Play, Square, ExternalLink, X, QrCode } from 'lucide-react';
import api from '@/lib/api';

export default function DashboardPage() {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Hologram Modal State
  const [selectedQr, setSelectedQr] = useState<string | null>(null);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const res = await api.get('/agents');
      setAgents(res.data);
    } catch (err) {
      console.error('Failed to fetch agents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async (id: string) => {
    try {
      await api.delete(`/agents/${id}`);
      fetchAgents();
    } catch (err) {
      console.error('Failed to stop agent', err);
    }
  };

  const handleStart = async (id: string) => {
    try {
      await api.post(`/agents/${id}/restart`);
      fetchAgents();
    } catch (err) {
      console.error('Failed to start agent', err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">My AI Bots</h1>
          <p className="text-gray-400">Manage your deployed agents and their cryptographic trust policies.</p>
        </div>
        
        <Link href="/dashboard/bots/new" className="btn-glow">
          <Plus className="w-5 h-5" />
          <span>Create New Agent</span>
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="w-10 h-10 border-4 border-neon-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading your verifiable agents...</p>
        </div>
      ) : agents.length === 0 ? (
        <div className="glass-panel p-16 text-center">
          <Bot className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <h3 className="text-xl font-bold mb-2">No agents yet</h3>
          <p className="text-gray-400 mb-6">Create your first AI bot to get started.</p>
          <Link href="/dashboard/bots/new" className="btn-primary inline-flex">
            Create Agent
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <div key={agent.id} className="glass-panel p-6 group transition-all hover:border-white/20">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:shadow-[0_0_15px_rgba(0,240,255,0.2)] transition-all">
                    <Bot className="w-6 h-6 text-neon-cyan" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{agent.name}</h3>
                    <p className="text-xs text-gray-400">{agent.type}</p>
                  </div>
                </div>
                <button className="text-gray-500 hover:text-white transition-colors">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 mb-6">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Decentralized Identifier (DID)</p>
                  <div className="bg-black/30 px-3 py-2 rounded-lg border border-white/5 font-mono text-xs truncate text-gray-300">
                    {agent.did || 'Pending...'}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`status-dot status-${agent.status.toLowerCase()}`} />
                    <span className="text-sm font-medium text-gray-300">{agent.status}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/10">
                {agent.status === 'RUNNING' ? (
                  <button onClick={() => handleStop(agent.id)} className="flex-1 btn-secondary py-2 text-sm text-red-400 hover:text-red-300 border-red-500/20 hover:bg-red-500/10">
                    <Square className="w-4 h-4" /> Stop
                  </button>
                ) : (
                  <button onClick={() => handleStart(agent.id)} className="flex-1 btn-secondary py-2 text-sm text-neon-green hover:text-green-300 border-neon-green/20 hover:bg-neon-green/10" disabled={agent.status === 'PROVISIONING'}>
                    <Play className="w-4 h-4" /> Start
                  </button>
                )}
                <button 
                  className="flex-1 btn-secondary py-2 text-sm" 
                  disabled={agent.status !== 'RUNNING'}
                  onClick={() => {
                    if (agent.qrInvitation) {
                      setSelectedQr(agent.qrInvitation);
                    } else if (agent.stack?.publicPort) {
                       // Fallback si no viene el base64 del QR, igual construimos la URL
                       alert(`Link: https://hologram.app/connect?endpoint=wss://localhost:${agent.stack.publicPort}`);
                    }
                  }}
                >
                  <ExternalLink className="w-4 h-4" /> Hologram
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Hologram QR Modal */}
      {selectedQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in p-4">
          <div className="glass-panel max-w-md w-full p-8 relative shadow-[0_0_50px_rgba(0,240,255,0.2)]">
            <button 
              onClick={() => setSelectedQr(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="text-center">
              <QrCode className="w-12 h-12 text-neon-cyan mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Connect to Hologram</h2>
              <p className="text-gray-400 mb-6 text-sm">
                Scan this QR code with your Hologram mobile app to establish a secure DIDComm connection with your verifiable agent.
              </p>
              <div className="bg-white p-4 rounded-xl inline-block mx-auto">
                <img src={selectedQr} alt="QR Code" className="w-48 h-48 object-contain" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
