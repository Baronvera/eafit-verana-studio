'use client';

import { FileText } from 'lucide-react';

export function StepKnowledge({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Base de Conocimiento</h2>
      <p className="text-sm text-gray-500 mb-6">
        Sube PDFs, docs y CSV para que el agente los use como contexto (RAG).
      </p>

      <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center bg-gray-50">
        <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">Disponible después del deploy</p>
        <p className="text-gray-400 text-sm mt-1">
          Una vez que tu agente esté activo, podrás subir documentos desde el panel de detalle.
        </p>
        <span className="inline-block mt-3 px-3 py-1 bg-blue-50 text-blue-600 text-xs rounded-full font-medium">
          Fase F2 — disponible en breve
        </span>
      </div>

      <div className="mt-6 flex justify-between">
        <button className="btn-secondary" onClick={onBack}>← Atrás</button>
        <button className="btn-primary" onClick={onNext}>Siguiente →</button>
      </div>
    </div>
  );
}
