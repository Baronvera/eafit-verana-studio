'use client';

const COUNTRIES = ['ES', 'MX', 'CO', 'AR', 'US', 'FR', 'DE', 'GB'];

interface OrgData { name: string; country: string; registryId: string }

export function StepOrg({
  data,
  onChange,
  onNext,
}: {
  data: OrgData;
  onChange: (v: Partial<OrgData>) => void;
  onNext: () => void;
}) {
  const valid = data.name.length > 2;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Organización</h2>
      <p className="text-sm text-gray-500 mb-6">
        Esta información genera tu credencial de organización on-chain en Verana.
      </p>

      <div className="space-y-4">
        <div>
          <label className="label">Nombre de la organización *</label>
          <input
            className="input"
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Ej: Acme Corp"
          />
        </div>

        <div>
          <label className="label">País *</label>
          <select className="input" value={data.country} onChange={(e) => onChange({ country: e.target.value })}>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">ID de registro legal (opcional)</label>
          <input
            className="input"
            value={data.registryId}
            onChange={(e) => onChange({ registryId: e.target.value })}
            placeholder="Ej: B-12345678 (CIF/NIF)"
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <button className="btn-primary" disabled={!valid} onClick={onNext}>
          Siguiente →
        </button>
      </div>
    </div>
  );
}
