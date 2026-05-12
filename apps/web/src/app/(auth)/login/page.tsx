'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Network, ArrowRight } from 'lucide-react';
import api from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/login', formData);
      localStorage.setItem('token', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Credenciales inválidas');
      setLoading(false);
    }
  };

  return (
    <div className="glass-panel p-8 md:p-10">
      <div className="flex justify-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-[0_0_30px_rgba(0,240,255,0.2)]">
          <Network className="w-8 h-8 text-neon-cyan" />
        </div>
      </div>
      
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Bienvenido</h1>
        <p className="text-gray-400">Ingresa tus credenciales para acceder a tu red de agentes.</p>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="glass-label">Email</label>
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
          <label className="glass-label">Contraseña</label>
          <input 
            type="password" 
            className="glass-input" 
            placeholder="••••••••" 
            value={formData.password}
            onChange={e => setFormData({...formData, password: e.target.value})}
            required 
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="btn-glow w-full mt-4"
        >
          {loading ? 'Autenticando...' : 'Iniciar Sesión'}
          {!loading && <ArrowRight className="w-4 h-4" />}
        </button>
      </form>

      <div className="mt-8 text-center text-sm text-gray-500">
        ¿No tienes cuenta?{' '}
        <Link href="/register" className="text-neon-cyan hover:underline">
          Regístrate aquí
        </Link>
      </div>
    </div>
  );
}
