'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Bot, BrainCircuit, Blocks, Database, ArrowRight, ArrowLeft, Check, UploadCloud, Key, Globe } from 'lucide-react';
import { clsx } from 'clsx';
import api from '@/lib/api';

const STEPS = [
  { id: 'org', title: 'Organization', icon: Building2 },
  { id: 'persona', title: 'Persona & Identity', icon: Bot },
  { id: 'brain', title: 'Brain & Policy', icon: BrainCircuit },
  { id: 'mcp', title: 'MCP Integrations', icon: Blocks },
  { id: 'rag', title: 'Knowledge Base', icon: Database },
];

const MCP_CATALOG = [
  { id: 'weather', name: 'Open-Meteo Weather', desc: 'Real-time weather forecasts (No API Key)' },
  { id: 'google-maps', name: 'Google Maps Planner', desc: 'Routing, geocoding & places (Requires API Key)' },
  { id: 'tavily', name: 'Tavily Web Search', desc: 'Real-time AI web search (Requires API Key)' },
  { id: 'github', name: 'GitHub Integration', desc: 'Manage issues and PRs (Standard EAFIT MCP)' },
  { id: 'wikipedia', name: 'Wikipedia', desc: 'Search and read Wikipedia articles (No API Key)' },
  { id: 'twitter', name: 'X (Twitter)', desc: 'Post tweets and read timelines (Requires API Key)' },
  { id: 'google-calendar', name: 'Google Calendar', desc: 'Read and create events (Requires Google OAuth)' },
  { id: 'gmail', name: 'Gmail', desc: 'Read and send emails (Requires Google OAuth)' },
  { id: 'google-sheets', name: 'Google Sheets', desc: 'Read and write spreadsheets (Requires Google OAuth)' },
];

const COUNTRIES = [
  { code: 'CO', name: 'Colombia', taxLabel: 'NIT' },
  { code: 'MX', name: 'México', taxLabel: 'RFC' },
  { code: 'AR', name: 'Argentina', taxLabel: 'CUIT' },
  { code: 'ES', name: 'España', taxLabel: 'CIF/NIF' },
  { code: 'US', name: 'Estados Unidos', taxLabel: 'EIN' },
  { code: 'BR', name: 'Brasil', taxLabel: 'CNPJ' },
  { code: 'CL', name: 'Chile', taxLabel: 'RUT' },
  { code: 'PE', name: 'Perú', taxLabel: 'RUC' },
  { code: 'EC', name: 'Ecuador', taxLabel: 'RUC' },
  { code: 'DE', name: 'Alemania', taxLabel: 'USt-IdNr' },
  { code: 'FR', name: 'Francia', taxLabel: 'SIREN' },
  { code: 'GB', name: 'Reino Unido', taxLabel: 'Company Number' },
];

const MODELS_BY_PROVIDER: Record<string, { id: string, name: string }[]> = {
  openai: [
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
    { id: 'gpt-4o', name: 'GPT-4o' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' }
  ],
  anthropic: [
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' }
  ],
  ollama: [
    { id: 'llama3', name: 'Llama 3 (8B)' },
    { id: 'mistral', name: 'Mistral (7B)' },
    { id: 'phi3', name: 'Phi-3 Mini' }
  ]
};

export default function NewBotWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ragFiles, setRagFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    // Organization
    orgName: '',
    orgCountry: 'CO',
    orgRegistryId: '', // NIT / RUT
    // Persona
    name: '',
    role: '',
    description: '',
    // Brain
    provider: 'openai',
    model: 'gpt-4o-mini',
    llmApiKey: '',
    prompt: 'You are a helpful assistant...',
    temperature: 0.7,
    // MCP
    selectedMcps: [] as string[],
    googleMapsApiKey: '',
    tavilyApiKey: '',
    twitterApiKey: '',
    googleClientId: '',
    googleClientSecret: '',
  });

  const selectedCountry = COUNTRIES.find(c => c.code === formData.orgCountry) || COUNTRIES[0];

  const handleProviderChange = (provider: string) => {
    setFormData(prev => ({
      ...prev,
      provider,
      model: MODELS_BY_PROVIDER[provider][0].id
    }));
  };

  const nextStep = () => {
    // Validate organization step
    if (currentStep === 0) {
      if (!formData.orgName.trim()) {
        setError('El nombre de la organización es obligatorio');
        return;
      }
      if (!formData.orgRegistryId.trim()) {
        setError(`El ${selectedCountry.taxLabel} es obligatorio`);
        return;
      }
    }
    setError(null);
    setCurrentStep(s => Math.min(s + 1, STEPS.length - 1));
  };
  const prevStep = () => { setError(null); setCurrentStep(s => Math.max(s - 1, 0)); };

  const toggleMcp = (id: string) => {
    setFormData(prev => ({
      ...prev,
      selectedMcps: prev.selectedMcps.includes(id)
        ? prev.selectedMcps.filter(m => m !== id)
        : [...prev.selectedMcps, id]
    }));
  };

  const handlePublish = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = {
        name: formData.name || 'Untitled Agent',
        type: formData.role || 'General',
        description: formData.description,
        network: 'testnet',
        llmProvider: formData.provider,
        model: formData.model,
        llmApiKey: formData.llmApiKey || 'sk-dummy-key-for-local',
        prompt: formData.prompt,
        temperature: Number(formData.temperature),
        selectedMcps: formData.selectedMcps,
        googleMapsApiKey: formData.googleMapsApiKey,
        tavilyApiKey: formData.tavilyApiKey,
        twitterApiKey: formData.twitterApiKey,
        googleClientId: formData.googleClientId,
        googleClientSecret: formData.googleClientSecret,
        organization: {
          name: formData.orgName,
          country: formData.orgCountry,
          registryId: formData.orgRegistryId,
        },
        service: {}
      };

      const { data } = await api.post('/agents', payload);
      const agentId = data.agentId;

      if (ragFiles.length > 0) {
        for (const file of ragFiles) {
          const fd = new FormData();
          fd.append('file', file);
          await api.post(`/agents/${agentId}/knowledge/upload`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        }
      }

      router.push(`/dashboard/agents/${agentId}`);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Error deploying agent');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Create Persona Agent</h1>
        <p className="text-gray-400">Configure your verifiable AI agent and deploy it to the Verana network.</p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-between mb-12 relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-white/10 -z-10" />
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-neon-cyan transition-all duration-500 shadow-[0_0_10px_rgba(0,240,255,0.8)]"
          style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
        />
        
        {STEPS.map((step, idx) => {
          const isCompleted = idx < currentStep;
          const isActive = idx === currentStep;
          const Icon = step.icon;

          return (
            <div key={step.id} className="flex flex-col items-center gap-3 bg-background px-4">
              <div className={clsx(
                "w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                isActive ? "border-neon-cyan bg-neon-cyan/20 text-neon-cyan shadow-[0_0_15px_rgba(0,240,255,0.4)]" :
                isCompleted ? "border-neon-cyan bg-neon-cyan text-black" :
                "border-white/20 bg-black text-gray-500"
              )}>
                {isCompleted ? <Check className="w-6 h-6" /> : <Icon className="w-5 h-5" />}
              </div>
              <span className={clsx(
                "text-sm font-medium",
                isActive ? "text-white" : "text-gray-500"
              )}>{step.title}</span>
            </div>
          );
        })}
      </div>

      {/* Forms */}
      <div className="glass-panel p-8 min-h-[400px]">
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400">
            {error}
          </div>
        )}

        {/* Step 0: Organization */}
        {currentStep === 0 && (
          <div className="animate-fade-in space-y-6">
            <h2 className="text-xl font-semibold mb-2">Organización</h2>
            <p className="text-gray-400 text-sm mb-6">Datos de la organización que operará este agente. El identificador fiscal es obligatorio.</p>
            <div className="grid grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="glass-label">Nombre de la Organización *</label>
                <input 
                  type="text" 
                  className="glass-input" 
                  placeholder="Ej: Acme Corp S.A.S"
                  value={formData.orgName}
                  onChange={e => setFormData({...formData, orgName: e.target.value})}
                />
              </div>
              <div>
                <label className="glass-label flex items-center gap-2">
                  <Globe className="w-4 h-4" /> País *
                </label>
                <select 
                  className="glass-input appearance-none bg-black/40"
                  value={formData.orgCountry}
                  onChange={e => setFormData({...formData, orgCountry: e.target.value})}
                >
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="glass-label flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  {selectedCountry.taxLabel} *
                  <span className="text-xs text-neon-cyan ml-auto">Obligatorio</span>
                </label>
                <input 
                  type="text" 
                  className="glass-input border-neon-cyan/30 focus:border-neon-cyan"
                  placeholder={
                    formData.orgCountry === 'CO' ? 'Ej: 900.123.456-7' :
                    formData.orgCountry === 'CL' ? 'Ej: 12.345.678-9' :
                    formData.orgCountry === 'MX' ? 'Ej: XAXX010101000' :
                    `${selectedCountry.taxLabel} de tu organización`
                  }
                  value={formData.orgRegistryId}
                  onChange={e => setFormData({...formData, orgRegistryId: e.target.value})}
                />
                <p className="text-xs text-gray-500 mt-1.5">
                  Identificador fiscal requerido para la credencial verificable on-chain.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Persona */}
        {currentStep === 1 && (
          <div className="animate-fade-in space-y-6">
            <h2 className="text-xl font-semibold mb-6">Agent Identity (W3C Verifiable Credential)</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="glass-label">Agent Name</label>
                <input 
                  type="text" 
                  className="glass-input" 
                  placeholder="e.g. Acme Support Bot"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="glass-label">Role / Type</label>
                <input 
                  type="text" 
                  className="glass-input" 
                  placeholder="e.g. Customer Support"
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                />
              </div>
              <div className="col-span-2">
                <label className="glass-label">Public Description</label>
                <textarea 
                  className="glass-input h-32 resize-none" 
                  placeholder="Describe what this agent does..."
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Brain */}
        {currentStep === 2 && (
          <div className="animate-fade-in space-y-6">
            <h2 className="text-xl font-semibold mb-6">Brain Configuration</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="glass-label">LLM Provider</label>
                <select 
                  className="glass-input appearance-none bg-black"
                  value={formData.provider}
                  onChange={e => handleProviderChange(e.target.value)}
                >
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="ollama">Ollama (Local)</option>
                </select>
              </div>
              <div>
                <label className="glass-label">Model</label>
                <select 
                  className="glass-input appearance-none bg-black"
                  value={formData.model}
                  onChange={e => setFormData({...formData, model: e.target.value})}
                >
                  {MODELS_BY_PROVIDER[formData.provider]?.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="glass-label">API Key (if required)</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="password" 
                    className="glass-input pl-10" 
                    placeholder={formData.provider === 'ollama' ? 'Not required for Ollama' : `sk-...`}
                    value={formData.llmApiKey}
                    onChange={e => setFormData({...formData, llmApiKey: e.target.value})}
                    disabled={formData.provider === 'ollama'}
                  />
                </div>
              </div>
              <div className="col-span-2">
                <label className="glass-label flex justify-between">
                  <span>System Prompt / Personality</span>
                  <span className="text-neon-cyan">Temp: {formData.temperature}</span>
                </label>
                <input 
                  type="range" min="0" max="1" step="0.1" 
                  value={formData.temperature}
                  onChange={e => setFormData({...formData, temperature: parseFloat(e.target.value)})}
                  className="w-full mb-4 accent-neon-cyan"
                />
                <textarea 
                  className="glass-input h-48 resize-none font-mono text-sm" 
                  value={formData.prompt}
                  onChange={e => setFormData({...formData, prompt: e.target.value})}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: MCP */}
        {currentStep === 3 && (
          <div className="animate-fade-in space-y-6">
            <h2 className="text-xl font-semibold mb-6">Model Context Protocol (MCP)</h2>
            <p className="text-gray-400 mb-6">Select the tools this agent is authorized to use.</p>
            
            <div className="grid grid-cols-2 gap-4">
              {MCP_CATALOG.map(mcp => {
                const isSelected = formData.selectedMcps.includes(mcp.id);
                return (
                  <div 
                    key={mcp.id}
                    onClick={() => toggleMcp(mcp.id)}
                    className={clsx(
                      "p-4 rounded-xl border cursor-pointer transition-all relative overflow-hidden",
                      isSelected 
                        ? "bg-neon-cyan/10 border-neon-cyan shadow-[0_0_15px_rgba(0,240,255,0.15)]" 
                        : "bg-black/40 border-white/10 hover:border-white/30"
                    )}
                  >
                    {isSelected && <div className="absolute top-0 left-0 w-1 h-full bg-neon-cyan" />}
                    <div className="flex items-center justify-between mb-2">
                      <h3 className={clsx("font-semibold", isSelected ? "text-neon-cyan" : "text-white")}>
                        {mcp.name}
                      </h3>
                      <div className={clsx(
                        "w-5 h-5 rounded-full border flex items-center justify-center",
                        isSelected ? "border-neon-cyan bg-neon-cyan text-black" : "border-gray-500"
                      )}>
                        {isSelected && <Check className="w-3 h-3" />}
                      </div>
                    </div>
                    <p className="text-sm text-gray-500">{mcp.desc}</p>
                  </div>
                );
              })}
            </div>
            
            {formData.selectedMcps.includes('google-maps') && (
              <div className="mt-6 p-4 border border-neon-purple/50 bg-neon-purple/5 rounded-xl animate-fade-in">
                <label className="glass-label text-neon-purple">Google Maps API Key</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="password" 
                    className="glass-input pl-10 border-neon-purple/30 focus:border-neon-purple" 
                    placeholder="AIzaSyB..."
                    value={formData.googleMapsApiKey}
                    onChange={e => setFormData({...formData, googleMapsApiKey: e.target.value})}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2">Required by the Google Maps MCP to calculate routes and fetch places.</p>
              </div>
            )}

            {formData.selectedMcps.includes('tavily') && (
              <div className="mt-6 p-4 border border-neon-cyan/50 bg-neon-cyan/5 rounded-xl animate-fade-in">
                <label className="glass-label text-neon-cyan">Tavily API Key</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="password" 
                    className="glass-input pl-10 border-neon-cyan/30 focus:border-neon-cyan" 
                    placeholder="tvly-..."
                    value={formData.tavilyApiKey}
                    onChange={e => setFormData({...formData, tavilyApiKey: e.target.value})}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2">Required by Tavily to perform high-speed, real-time web searches.</p>
              </div>
            )}

            {formData.selectedMcps.includes('twitter') && (
              <div className="mt-6 p-4 border border-blue-500/50 bg-blue-500/5 rounded-xl animate-fade-in">
                <label className="glass-label text-blue-400">X (Twitter) API Key</label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="password" 
                    className="glass-input pl-10 border-blue-500/30 focus:border-blue-500" 
                    placeholder="Twitter Bearer Token or API Key"
                    value={formData.twitterApiKey}
                    onChange={e => setFormData({...formData, twitterApiKey: e.target.value})}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2">Required by X to read timelines and post tweets.</p>
              </div>
            )}

            {formData.selectedMcps.some(m => ['google-calendar', 'gmail', 'google-sheets'].includes(m)) && (
              <div className="mt-6 p-4 border border-green-500/50 bg-green-500/5 rounded-xl animate-fade-in space-y-4">
                <p className="text-sm font-medium text-green-400 mb-2">Google Workspace Credentials</p>
                <p className="text-xs text-gray-400">Required because you selected Calendar, Gmail, or Sheets.</p>
                
                <div>
                  <label className="glass-label text-green-400">Google Client ID</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input 
                      type="text" 
                      className="glass-input pl-10 border-green-500/30 focus:border-green-500" 
                      placeholder="...apps.googleusercontent.com"
                      value={formData.googleClientId}
                      onChange={e => setFormData({...formData, googleClientId: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="glass-label text-green-400">Google Client Secret</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input 
                      type="password" 
                      className="glass-input pl-10 border-green-500/30 focus:border-green-500" 
                      placeholder="GOCSPX-..."
                      value={formData.googleClientSecret}
                      onChange={e => setFormData({...formData, googleClientSecret: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: RAG Knowledge */}
        {currentStep === 4 && (
          <div className="animate-fade-in space-y-6">
            <h2 className="text-xl font-semibold mb-6">Upload Knowledge Base</h2>
            <div 
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); setRagFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]); }}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-600 hover:border-neon-purple rounded-xl p-10 text-center cursor-pointer transition-colors bg-white/5"
            >
              <UploadCloud className="w-10 h-10 text-neon-purple mx-auto mb-4" />
              <p className="text-gray-300 mb-2">Drag and drop files here, or click to select</p>
              <p className="text-sm text-gray-500">Supported: PDF, MD, TXT, CSV, DOCX</p>
              <input 
                ref={fileInputRef} 
                type="file" 
                multiple 
                className="hidden" 
                accept=".pdf,.md,.txt,.csv,.docx"
                onChange={(e) => setRagFiles(prev => [...prev, ...Array.from(e.target.files || [])])}
              />
            </div>

            {ragFiles.length > 0 && (
              <div className="mt-6 space-y-2">
                <h3 className="text-sm font-medium text-gray-400">Selected Files:</h3>
                {ragFiles.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-black/40 border border-white/10 rounded-lg">
                    <span className="text-sm text-white truncate">{f.name}</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setRagFiles(prev => prev.filter((_, idx) => idx !== i)); }}
                      className="text-red-500 hover:text-red-400 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="mt-8 flex justify-between">
        <button 
          onClick={prevStep}
          disabled={currentStep === 0 || loading}
          className="btn-secondary"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        
        {currentStep < STEPS.length - 1 ? (
          <button onClick={nextStep} className="btn-primary">
            Next Step <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button onClick={handlePublish} disabled={loading} className="btn-glow">
            {loading ? 'Deploying to k8s...' : 'Publish Agent'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
