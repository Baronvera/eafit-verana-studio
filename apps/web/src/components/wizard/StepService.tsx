'use client';

const AGENT_TYPES = [
  { value: 'general', label: 'Asistente general' },
  { value: 'support', label: 'Soporte al cliente' },
  { value: 'education', label: 'Educativo' },
  { value: 'health', label: 'Salud' },
  { value: 'commerce', label: 'Comercio' },
  { value: 'hr', label: 'Recursos humanos' },
];

interface ServiceData { name: string; type: string; description: string; termsUrl: string; privacyUrl: string }

export function StepService({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: ServiceData;
  onChange: (v: Partial<ServiceData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const valid = data.name.length > 2;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Servicio</h2>
      <p className="text-sm text-gray-500 mb-6">
        Define qué hace tu agente. Esta info se incluye en la credencial de Servicio on-chain.
      </p>

      <div className="space-y-4">
        <div>
          <label className="label">Nombre del agente *</label>
          <input
            className="input"
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Ej: Asistente de Atención al Cliente"
          />
        </div>

        <div>
          <label className="label">Tipo de agente</label>
          <select className="input" value={data.type} onChange={(e) => onChange({ type: e.target.value })}>
            {AGENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Descripción</label>
          <textarea
            className="input resize-none"
            rows={3}
            value={data.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="Ej: Resuelve dudas sobre productos, pedidos y devoluciones."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">URL Términos (opcional)</label>
            <input
              className="input"
              value={data.termsUrl}
              onChange={(e) => onChange({ termsUrl: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="label">URL Privacidad (opcional)</label>
            <input
              className="input"
              value={data.privacyUrl}
              onChange={(e) => onChange({ privacyUrl: e.target.value })}
              placeholder="https://..."
            />
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-between">
        <button className="btn-secondary" onClick={onBack}>← Atrás</button>
        <button className="btn-primary" disabled={!valid} onClick={onNext}>Siguiente →</button>
      </div>
    </div>
  );
}
