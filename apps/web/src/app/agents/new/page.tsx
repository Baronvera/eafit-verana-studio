'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { StepIndicator } from '@/components/wizard/StepIndicator';
import { StepOrg } from '@/components/wizard/StepOrg';
import { StepService } from '@/components/wizard/StepService';
import { StepLLM } from '@/components/wizard/StepLLM';
import { StepKnowledge } from '@/components/wizard/StepKnowledge';
import { StepDeploy } from '@/components/wizard/StepDeploy';
import { DeployTerminal } from '@/components/wizard/DeployTerminal';
import { SuccessScreen } from '@/components/wizard/SuccessScreen';

export interface WizardData {
  organization: { name: string; country: string; registryId: string };
  service: { name: string; type: string; description: string; termsUrl: string; privacyUrl: string };
  llm: { provider: string; apiKey: string; model: string; prompt: string; temperature: number };
  deploy: { network: string };
}

const STEPS = [
  { id: 1, label: 'Organización' },
  { id: 2, label: 'Servicio' },
  { id: 3, label: 'LLM' },
  { id: 4, label: 'Conocimiento' },
  { id: 5, label: 'Deploy' },
];

const DEFAULT_DATA: WizardData = {
  organization: { name: '', country: 'ES', registryId: '' },
  service: { name: '', type: 'general', description: '', termsUrl: '', privacyUrl: '' },
  llm: {
    provider: 'anthropic',
    apiKey: '',
    model: 'claude-3-5-haiku-20241022',
    prompt: 'Eres un asistente de IA útil y verificable en Hologram.',
    temperature: 0.7,
  },
  deploy: { network: 'testnet' },
};

export default function NewAgentPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<WizardData>(DEFAULT_DATA);
  const [deploying, setDeploying] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [agentDid, setAgentDid] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const update = (section: keyof WizardData, values: Partial<WizardData[typeof section]>) => {
    setData((prev) => ({ ...prev, [section]: { ...prev[section], ...values } }));
  };

  const handleDeploy = async () => {
    setDeploying(true);
    try {
      const { data: res } = await api.post('/agents', {
        name: data.service.name,
        type: data.service.type,
        description: data.service.description,
        network: data.deploy.network,
        llmProvider: data.llm.provider,
        model: data.llm.model,
        llmApiKey: data.llm.apiKey,
        prompt: data.llm.prompt,
        temperature: data.llm.temperature,
        organization: data.organization,
        service: { termsUrl: data.service.termsUrl, privacyUrl: data.service.privacyUrl },
      });
      setAgentId(res.agentId);
    } catch (err) {
      console.error(err);
      setDeploying(false);
    }
  };

  const handleDeployComplete = (did: string) => {
    setAgentDid(did);
    setDone(true);
  };

  if (done && agentId && agentDid) {
    return <SuccessScreen agentId={agentId} did={agentDid} onGoToDashboard={() => router.push('/dashboard')} />;
  }

  if (deploying && agentId) {
    return (
      <DeployTerminal
        agentId={agentId}
        onComplete={handleDeployComplete}
        onError={() => setDeploying(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-2xl mx-auto px-4">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Crear nuevo agente</h1>
          <p className="text-gray-500 text-sm mt-1">Configura tu agente verificable en Hologram</p>
        </div>

        <StepIndicator steps={STEPS} currentStep={step} />

        <div className="card p-6 mt-6">
          {step === 1 && (
            <StepOrg
              data={data.organization}
              onChange={(v) => update('organization', v)}
              onNext={() => setStep(2)}
            />
          )}
          {step === 2 && (
            <StepService
              data={data.service}
              onChange={(v) => update('service', v)}
              onNext={() => setStep(3)}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <StepLLM
              data={data.llm}
              onChange={(v) => update('llm', v)}
              onNext={() => setStep(4)}
              onBack={() => setStep(2)}
            />
          )}
          {step === 4 && (
            <StepKnowledge onNext={() => setStep(5)} onBack={() => setStep(3)} />
          )}
          {step === 5 && (
            <StepDeploy
              data={data.deploy}
              onChange={(v) => update('deploy', v)}
              onDeploy={handleDeploy}
              onBack={() => setStep(4)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
