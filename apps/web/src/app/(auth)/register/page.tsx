'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Network, ArrowRight, Building2, Globe } from 'lucide-react';
import api from '@/lib/api';

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

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'account' | 'organization'>('account');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    orgName: '',
    country: 'CO',
    registryId: '', // NIT / RUT
  });

  const selectedCountry = COUNTRIES.find(c => c.code === formData.country) || COUNTRIES[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 'account') {
      if (formData.password !== formData.confirmPassword) {
        setError('Las contraseñas no coinciden');
        return;
      }
      if (formData.password.length < 8) {
        setError('La contraseña debe tener al menos 8 caracteres');
        return;
      }
      setError(null);
      setStep('organization');
      return;
    }

    // Step 2: Submit
    if (!formData.orgName.trim()) {
      setError('El nombre de la organización es obligatorio');
      return;
    }
    if (!formData.registryId.trim()) {
      setError(`El ${selectedCountry.taxLabel} es obligatorio para registrarse`);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/register', {
        email: formData.email,
        password: formData.password,
        name: formData.name,
        organization: {
          name: formData.orgName,
          country: formData.country,
          registryId: formData.registryId,
        },
      });
      localStorage.setItem('token', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al registrarse');
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel p-8 md:p-10">
      <div className="flex justify-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-[0_0_30px_rgba(0,240,255,0.2)]">
          {step === 'account' 
            ? <Network className="w-8 h-8 text-neon-cyan" />
            : <Building2 className="w-8 h-8 text-neon-cyan" />
          }
        </div>
      </div>
      
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          {step === 'account' ? 'Crear Cuenta' : 'Tu Organización'}
        </h1>
        <p className="text-gray-400">
          {step === 'account' 
            ? 'Registra tus credenciales de acceso'
            : 'Datos de tu empresa u organización (obligatorio)'
          }
        </p>
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <div className={`w-2.5 h-2.5 rounded-full transition-all ${step === 'account' ? 'bg-neon-cyan shadow-[0_0_8px_rgba(0,240,255,0.6)]' : 'bg-white/20'}`} />
          <div className={`w-8 h-0.5 ${step === 'organization' ? 'bg-neon-cyan' : 'bg-white/10'}`} />
          <div className={`w-2.5 h-2.5 rounded-full transition-all ${step === 'organization' ? 'bg-neon-cyan shadow-[0_0_8px_rgba(0,240,255,0.6)]' : 'bg-white/20'}`} />
        </div>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {step === 'account' && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <label className="glass-label">Nombre completo</label>
              <input 
                type="text" 
                className="glass-input" 
                placeholder="Tu nombre"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>

            <div>
              <label className="glass-label">Email *</label>
              <input 
                type="email" 
                className="glass-input" 
                placeholder="tu@organizacion.com"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                required 
              />
            </div>

            <div>
              <label className="glass-label">Contraseña * (mínimo 8 caracteres)</label>
              <input 
                type="password" 
                className="glass-input" 
                placeholder="••••••••"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                minLength={8}
                required 
              />
            </div>

            <div>
              <label className="glass-label">Confirmar contraseña *</label>
              <input 
                type="password" 
                className="glass-input" 
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                minLength={8}
                required 
              />
            </div>
          </div>
        )}

        {step === 'organization' && (
          <div className="space-y-5 animate-fade-in">
            <div>
              <label className="glass-label">Nombre de la Organización *</label>
              <input 
                type="text" 
                className="glass-input" 
                placeholder="Ej: Acme Corp S.A.S"
                value={formData.orgName}
                onChange={e => setFormData({...formData, orgName: e.target.value})}
                required 
              />
            </div>

            <div>
              <label className="glass-label flex items-center gap-2">
                <Globe className="w-4 h-4" /> País *
              </label>
              <select 
                className="glass-input appearance-none bg-black/40"
                value={formData.country}
                onChange={e => setFormData({...formData, country: e.target.value})}
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
                  formData.country === 'CO' ? 'Ej: 900.123.456-7' :
                  formData.country === 'CL' ? 'Ej: 12.345.678-9' :
                  formData.country === 'MX' ? 'Ej: XAXX010101000' :
                  `${selectedCountry.taxLabel} de tu organización`
                }
                value={formData.registryId}
                onChange={e => setFormData({...formData, registryId: e.target.value})}
                required 
              />
              <p className="text-xs text-gray-500 mt-1.5">
                Este identificador fiscal es necesario para verificar tu organización en la red Verana.
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          {step === 'organization' && (
            <button 
              type="button"
              onClick={() => { setStep('account'); setError(null); }}
              className="btn-secondary flex-1"
            >
              Atrás
            </button>
          )}
          <button 
            type="submit" 
            disabled={loading}
            className="btn-glow flex-1"
          >
            {step === 'account' ? (
              <>Siguiente <ArrowRight className="w-4 h-4" /></>
            ) : loading ? (
              'Registrando...'
            ) : (
              <>Crear Cuenta <ArrowRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </form>

      <div className="mt-8 text-center text-sm text-gray-500">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="text-neon-cyan hover:underline">
          Iniciar sesión
        </Link>
      </div>
    </div>
  );
}
