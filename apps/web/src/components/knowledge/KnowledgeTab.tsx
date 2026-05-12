'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Upload,
  FileText,
  Trash2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader2,
  HardDrive,
} from 'lucide-react';
import { clsx } from 'clsx';
import { api } from '@/lib/api';

interface Document {
  id: string;
  name: string;
  size: number;
  mimetype: string;
  status: 'UPLOADING' | 'INDEXING' | 'READY' | 'ERROR';
  indexedAt?: string;
  createdAt: string;
}

const STATUS_CONFIG = {
  UPLOADING: { label: 'Subiendo', color: 'bg-blue-100 text-blue-700', icon: Loader2, spin: true },
  INDEXING:  { label: 'Indexando', color: 'bg-yellow-100 text-yellow-700', icon: Loader2, spin: true },
  READY:     { label: 'Listo', color: 'bg-green-100 text-green-700', icon: CheckCircle, spin: false },
  ERROR:     { label: 'Error', color: 'bg-red-100 text-red-700', icon: AlertCircle, spin: false },
};

const ALLOWED = '.pdf,.md,.txt,.csv,.docx';
const MAX_MB = 50;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRelative(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora mismo';
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

export function KnowledgeTab({ agentId }: { agentId: string }) {
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [reindexing, setReindexing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDocs = useCallback(async () => {
    try {
      const { data } = await api.get(`/agents/${agentId}/knowledge`);
      setDocs(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  // Poll mientras haya docs en estado no-final
  useEffect(() => {
    fetchDocs();
    pollRef.current = setInterval(() => {
      const hasActive = docs.some((d) => d.status === 'INDEXING' || d.status === 'UPLOADING');
      if (hasActive) fetchDocs();
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchDocs, docs.length]);

  const uploadFiles = async (files: File[]) => {
    setUploading(true);
    for (const file of files) {
      if (file.size > MAX_MB * 1024 * 1024) {
        alert(`${file.name} supera los ${MAX_MB}MB`);
        continue;
      }

      const formData = new FormData();
      formData.append('file', file);

      try {
        await api.post(`/agents/${agentId}/knowledge/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (e) => {
            const pct = Math.round(((e.loaded || 0) / (e.total || 1)) * 100);
            setUploadProgress((prev) => ({ ...prev, [file.name]: pct }));
          },
        });
      } catch (err: any) {
        alert(`Error al subir ${file.name}: ${err.response?.data?.message || err.message}`);
      } finally {
        setUploadProgress((prev) => {
          const next = { ...prev };
          delete next[file.name];
          return next;
        });
      }
    }
    setUploading(false);
    fetchDocs();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    uploadFiles(files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    uploadFiles(files);
    e.target.value = '';
  };

  const handleDelete = async (docId: string, name: string) => {
    if (!confirm(`¿Eliminar "${name}"? El agente dejará de usar este documento.`)) return;
    await api.delete(`/agents/${agentId}/knowledge/${docId}`);
    fetchDocs();
  };

  const handleReindex = async () => {
    setReindexing(true);
    await api.post(`/agents/${agentId}/knowledge/reindex`).catch(console.error);
    setTimeout(() => { setReindexing(false); fetchDocs(); }, 2000);
  };

  const totalSize = docs.reduce((acc, d) => acc + d.size, 0);
  const readyDocs = docs.filter((d) => d.status === 'READY');
  const lastIndexed = readyDocs.sort((a, b) =>
    new Date(b.indexedAt || 0).getTime() - new Date(a.indexedAt || 0).getTime(),
  )[0];

  return (
    <div className="space-y-4">
      {/* Header stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <FileText className="w-4 h-4" />
            {docs.length} documento{docs.length !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1">
            <HardDrive className="w-4 h-4" />
            {formatBytes(totalSize)}
          </span>
          {lastIndexed?.indexedAt && (
            <span className="text-gray-400">
              Última indexación: {formatRelative(lastIndexed.indexedAt)}
            </span>
          )}
        </div>
        <button
          onClick={handleReindex}
          disabled={reindexing || docs.length === 0}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <RefreshCw className={clsx('w-4 h-4', reindexing && 'animate-spin')} />
          Re-indexar todo
        </button>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={clsx(
          'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
          dragging
            ? 'border-verana-500 bg-verana-50'
            : 'border-gray-200 hover:border-verana-400 hover:bg-gray-50',
        )}
      >
        <Upload className={clsx('w-8 h-8 mx-auto mb-2', dragging ? 'text-verana-500' : 'text-gray-400')} />
        <p className="text-sm font-medium text-gray-700">
          {dragging ? 'Suelta los archivos aquí' : 'Arrastra documentos o haz clic para subir'}
        </p>
        <p className="text-xs text-gray-400 mt-1">PDF, MD, TXT, CSV, DOCX · Máx {MAX_MB}MB por archivo</p>
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED}
          multiple
          className="hidden"
          onChange={handleFileInput}
        />
      </div>

      {/* Upload progress */}
      {Object.entries(uploadProgress).map(([name, pct]) => (
        <div key={name} className="card p-3">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-gray-700 truncate">{name}</span>
            <span className="text-gray-500 text-xs">{pct}%</span>
          </div>
          <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-verana-500 transition-all duration-200"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      ))}

      {/* Document list */}
      {loading ? (
        <div className="text-center py-8 text-gray-400 text-sm">Cargando documentos...</div>
      ) : docs.length === 0 && Object.keys(uploadProgress).length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          No hay documentos. Sube el primero para activar el RAG.
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => {
            const cfg = STATUS_CONFIG[doc.status];
            const Icon = cfg.icon;
            return (
              <div key={doc.id} className="card p-4 flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatBytes(doc.size)}
                    {doc.indexedAt && ` · indexado ${formatRelative(doc.indexedAt)}`}
                  </p>
                </div>
                <span className={clsx('flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', cfg.color)}>
                  <Icon className={clsx('w-3 h-3', cfg.spin && 'animate-spin')} />
                  {cfg.label}
                </span>
                <button
                  onClick={() => handleDelete(doc.id, doc.name)}
                  className="text-gray-400 hover:text-red-500 transition-colors p-1"
                  title="Eliminar"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
