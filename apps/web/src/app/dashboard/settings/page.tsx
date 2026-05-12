'use client';

import { useEffect, useState } from 'react';
import { User, Shield, Users, Mail } from 'lucide-react';
import { clsx } from 'clsx';
import { api } from '@/lib/api';

type SettingsTab = 'profile' | 'security' | 'team';

interface Profile {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  emailVerified: boolean;
  oauthProvider?: string;
  subscriptionStatus?: string;
  organizations: { orgId: string; role: string; org: { id: string; name: string } }[];
}

interface TeamData {
  members: { id: string; userId: string; role: string; user: { id: string; email: string; name?: string; avatarUrl?: string } }[];
  invitations: { id: string; email: string; role: string; createdAt: string }[];
}

const TABS: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: 'profile', label: 'Perfil', icon: User },
  { id: 'security', label: 'Seguridad', icon: Shield },
  { id: 'team', label: 'Equipo', icon: Users },
];

export default function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>('profile');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // Profile form
  const [name, setName] = useState('');

  // Security form
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');

  // Team invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'VIEWER' | 'EDITOR' | 'OWNER'>('VIEWER');

  useEffect(() => {
    api.get('/auth/profile').then((r) => {
      setProfile(r.data);
      setName(r.data.name ?? '');
    });
  }, []);

  const activeOrg = profile?.organizations?.[0]?.org;

  useEffect(() => {
    if (tab === 'team' && activeOrg) {
      api.get(`/auth/orgs/${activeOrg.id}/members`).then((r) => setTeamData(r.data));
    }
  }, [tab, activeOrg]);

  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(''), 3000);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await api.patch('/auth/profile', { name });
      setProfile((p) => p ? { ...p, name } : p);
      flash('Perfil actualizado');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    setSaving(true);
    try {
      await api.post('/auth/change-password', { oldPassword: oldPw, newPassword: newPw });
      setOldPw(''); setNewPw('');
      flash('Contraseña actualizada');
    } catch {
      flash('Error al cambiar contraseña');
    } finally {
      setSaving(false);
    }
  };

  const resendVerification = async () => {
    await api.post('/auth/resend-verification');
    flash('Email de verificación enviado');
  };

  const sendInvite = async () => {
    if (!activeOrg) return;
    setSaving(true);
    try {
      await api.post(`/auth/orgs/${activeOrg.id}/invite`, { email: inviteEmail, role: inviteRole });
      setInviteEmail('');
      flash(`Invitación enviada a ${inviteEmail}`);
      const r = await api.get(`/auth/orgs/${activeOrg.id}/members`);
      setTeamData(r.data);
    } finally {
      setSaving(false);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!activeOrg || !confirm('¿Eliminar este miembro?')) return;
    await api.delete(`/auth/orgs/${activeOrg.id}/members/${memberId}`);
    const r = await api.get(`/auth/orgs/${activeOrg.id}/members`);
    setTeamData(r.data);
  };

  const ROLE_BADGE: Record<string, string> = {
    OWNER: 'bg-purple-100 text-purple-700',
    EDITOR: 'bg-blue-100 text-blue-700',
    VIEWER: 'bg-gray-100 text-gray-600',
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Configuración</h1>

      {msg && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-green-50 text-green-700 text-sm border border-green-200">
          {msg}
        </div>
      )}

      {/* Tab nav */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                tab === t.id
                  ? 'border-verana-600 text-verana-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700',
              )}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Profile tab */}
      {tab === 'profile' && profile && (
        <div className="space-y-4">
          <div>
            <label className="label">Email</label>
            <div className="flex items-center gap-2">
              <input className="input flex-1" value={profile.email} disabled />
              {profile.emailVerified ? (
                <span className="px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Verificado</span>
              ) : (
                <button onClick={resendVerification} className="btn-secondary text-xs">
                  Reenviar verificación
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="label">Nombre</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Tu nombre"
            />
          </div>
          {profile.oauthProvider && (
            <div className="card p-3 bg-blue-50 border-blue-200">
              <p className="text-sm text-blue-700">
                Cuenta conectada via <strong>{profile.oauthProvider}</strong>
              </p>
            </div>
          )}
          <button onClick={saveProfile} disabled={saving} className="btn-primary">
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      )}

      {/* Security tab */}
      {tab === 'security' && (
        <div className="space-y-4">
          {profile?.oauthProvider ? (
            <div className="card p-4">
              <p className="text-sm text-gray-600">
                Tu cuenta usa autenticación OAuth con <strong>{profile.oauthProvider}</strong>.
                No puedes cambiar la contraseña desde aquí.
              </p>
            </div>
          ) : (
            <>
              <div>
                <label className="label">Contraseña actual</label>
                <input
                  type="password"
                  className="input"
                  value={oldPw}
                  onChange={(e) => setOldPw(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Nueva contraseña</label>
                <input
                  type="password"
                  className="input"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="Mínimo 8 caracteres"
                />
              </div>
              <button
                onClick={changePassword}
                disabled={saving || !oldPw || newPw.length < 8}
                className="btn-primary"
              >
                {saving ? 'Cambiando...' : 'Cambiar contraseña'}
              </button>
            </>
          )}
        </div>
      )}

      {/* Team tab */}
      {tab === 'team' && (
        <div className="space-y-6">
          {activeOrg && (
            <div className="card p-4 bg-gray-50">
              <p className="text-xs text-gray-500 font-medium mb-1">Organización</p>
              <p className="font-semibold text-gray-900">{activeOrg.name}</p>
            </div>
          )}

          {/* Invite form */}
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Mail className="w-4 h-4" /> Invitar miembro
            </h3>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                type="email"
                placeholder="email@ejemplo.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <select
                className="input w-28"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as any)}
              >
                <option value="VIEWER">Viewer</option>
                <option value="EDITOR">Editor</option>
                <option value="OWNER">Owner</option>
              </select>
              <button
                onClick={sendInvite}
                disabled={saving || !inviteEmail}
                className="btn-primary shrink-0"
              >
                Invitar
              </button>
            </div>
          </div>

          {/* Members list */}
          {teamData && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Miembros</h3>
              <div className="space-y-2">
                {teamData.members.map((m) => (
                  <div key={m.id} className="card p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-verana-100 flex items-center justify-center text-sm font-medium text-verana-700">
                        {(m.user.name?.[0] ?? m.user.email[0]).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{m.user.name ?? m.user.email}</p>
                        {m.user.name && <p className="text-xs text-gray-500">{m.user.email}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={clsx('px-2 py-0.5 text-xs rounded-full font-medium', ROLE_BADGE[m.role])}>
                        {m.role}
                      </span>
                      {m.role !== 'OWNER' && (
                        <button
                          onClick={() => removeMember(m.userId)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {teamData.invitations.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-2">Invitaciones pendientes</h3>
                  <div className="space-y-2">
                    {teamData.invitations.map((inv) => (
                      <div key={inv.id} className="card p-3 flex items-center justify-between opacity-70">
                        <span className="text-sm text-gray-700">{inv.email}</span>
                        <span className={clsx('px-2 py-0.5 text-xs rounded-full font-medium', ROLE_BADGE[inv.role])}>
                          {inv.role} · Pendiente
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
