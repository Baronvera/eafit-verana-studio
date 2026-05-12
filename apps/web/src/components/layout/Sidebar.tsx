'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Network, Bot, Puzzle, CreditCard, Settings, LogOut } from 'lucide-react';
import { clsx } from 'clsx';

const NAV_ITEMS = [
  { name: 'My AI Bots', href: '/dashboard', icon: Bot },
  { name: 'MCP Services', href: '/dashboard/mcp', icon: Puzzle },
  { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 h-screen border-r border-white/10 bg-black/50 backdrop-blur-md flex flex-col fixed left-0 top-0">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-neon-cyan/20 border border-neon-cyan/50 flex items-center justify-center">
          <Network className="w-5 h-5 text-neon-cyan" />
        </div>
        <span className="font-bold text-lg tracking-wide">VERANA</span>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/dashboard');
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative overflow-hidden',
                isActive 
                  ? 'bg-white/10 text-white' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-white'
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-neon-cyan shadow-[0_0_10px_rgba(0,240,255,0.8)]" />
              )}
              <Icon className={clsx("w-5 h-5", isActive ? "text-neon-cyan" : "group-hover:text-gray-300")} />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <button 
          onClick={() => {
            if (typeof window !== 'undefined') localStorage.removeItem('token');
            window.location.href = '/login';
          }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white w-full transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </div>
  );
}
