'use client';

const PROVIDERS = [
  {
    value: 'anthropic',
    label: 'Anthropic Claude',
    models: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-3-5-haiku-20241022'],
  },
  {
    value: 'openai',
    label: 'OpenAI GPT',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo'],
  },
  {
    value: 'ollama',
    label: 'Ollama (local)',
    models: ['llama3', 'mistral', 'gemma'],
  },
];

interface LLMData { provider: string; apiKey: string; model: string; prompt: string; temperature: number }

export function StepLLM({
  data,
  onChange,
  onNext,
  onBack,
}: {
  data: LLMData;
  onChange: (v: Partial<LLMData>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const currentProvider = PROVIDERS.find((p) => p.value === data.provider) || PROVIDERS[0];
  const valid = data.model && data.prompt.length > 10 && (data.provider === 'ollama' || data.apiKey.length > 5);

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Modelo de Lenguaje</h2>
      <p className="text-sm text-gray-500 mb-6">Configura el LLM y la personalidad de tu agente.</p>

      <div className="space-y-4">
        <div>
          <label className="label">Proveedor LLM</label>
          <div className="grid grid-cols-3 gap-2">
            {PROVIDERS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => onChange({ provider: p.value, model: p.models[0] })}
                className={`border rounded-lg p-3 text-sm font-medium transition-colors ${
                  data.provider === p.value
                    ? 'border-verana-600 bg-verana-50 text-verana-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label">Modelo</label>
          <select className="input" value={data.model} onChange={(e) => onChange({ model: e.target.value })}>
            {currentProvider.models.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {data.provider !== 'ollama' && (
          <div>
            <label className="label">API Key *</label>
            <input
              className="input font-mono"
              type="password"
              value={data.apiKey}
              onChange={(e) => onChange({ apiKey: e.target.value })}
              placeholder={data.provider === 'anthropic' ? 'sk-ant-...' : 'sk-...'}
            />
          </div>
        )}

        <div>
          <label className="label">Prompt del sistema *</label>
          <textarea
            className="input resize-none font-mono text-xs"
            rows={5}
            value={data.prompt}
            onChange={(e) => onChange({ prompt: e.target.value })}
          />
        </div>

        <div>
          <label className="label">Temperatura: {data.temperature}</label>
          <input
            type="range"
            min={0}
            max={2}
            step={0.1}
            value={data.temperature}
            onChange={(e) => onChange({ temperature: parseFloat(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>Preciso (0)</span>
            <span>Creativo (2)</span>
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
