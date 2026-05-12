'use client';

import { useEffect, useState } from 'react';
import { Bell, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

export function Topbar() {
  const router = useRouter();
  const [user, setUser] = useState<{ name: string, email: string } | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/auth/profile');
        setUser(res.data);
      } catch (err: any) {
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          router.push('/login');
        }
      }
    };
    fetchProfile();
  }, [router]);

  const displayName = user?.name || user?.email?.split('@')[0] || 'Loading...';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="h-20 border-b border-white/10 bg-black/50 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-4 w-96">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input 
            type="text" 
            placeholder="Search agents, tools..." 
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-neon-cyan/50 text-white placeholder-gray-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <button className="relative text-gray-400 hover:text-white transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-neon-purple shadow-[0_0_5px_rgba(177,79,255,0.8)]" />
        </button>
        
        <div className="flex items-center gap-3 pl-6 border-l border-white/10">
          <div className="text-right">
            <div className="text-sm font-medium">{displayName}</div>
            <div className="text-xs text-neon-green">Pro Plan</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-neon-cyan to-neon-purple p-[1px]">
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center font-bold text-sm">
              {initial}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
