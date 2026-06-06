'use client';

import { useEffect, useState } from 'react';
import { authClient } from '@/lib/authClient';
import { errMsg } from '@/lib/utils';
import { Save, Plus, Trash2 } from 'lucide-react';

// ── Tab: Organización ─────────────────────────────────────────

function OrgSection() {
  const [form,    setForm]    = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    authClient.get('/organization')
      .then(r => setForm(r.data))
      .catch(ex => setError(errMsg(ex)))
      .finally(() => setLoading(false));
  }, []);

  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p: any) => ({ ...p, [f]: e.target.value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess(false);
    try {
      await authClient.put('/organization', {
        name: form.name, legalName: form.legalName, taxId: form.taxId,
        address: form.address, phone: form.phone, email: form.email,
        logoUrl: form.logoUrl, timezone: form.timezone, baseCurrency: form.baseCurrency,
      });
      setSuccess(true);
    } catch (ex) { setError(errMsg(ex)); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="mx-skeleton h-64 rounded-2xl" />;

  return (
    <div className="mx-card p-6 max-w-2xl">
      {error   && <div className="mb-4 p-3 rounded-xl bg-[#FCEBEB] text-sm text-[#791F1F]">{error}</div>}
      {success && <div className="mb-4 p-3 rounded-xl bg-[#EAF3DE] text-sm text-[#27500A]">Guardado correctamente</div>}
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Nombre comercial', field: 'name' },
            { label: 'Razón social', field: 'legalName' },
            { label: 'RUC', field: 'taxId' },
            { label: 'Teléfono', field: 'phone' },
            { label: 'Email', field: 'email' },
            { label: 'Moneda base', field: 'baseCurrency' },
            { label: 'Zona horaria', field: 'timezone' },
            { label: 'Logo URL', field: 'logoUrl' },
          ].map(({ label, field }) => (
            <div key={field}>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">{label}</label>
              <input className="mx-input" value={form[field] ?? ''} onChange={set(field)} />
            </div>
          ))}
          <div className="col-span-2">
            <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Dirección</label>
            <input className="mx-input" value={form.address ?? ''} onChange={set('address')} />
          </div>
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="mx-btn-primary">
            <Save size={14} /> {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Tab: Series de documentos ─────────────────────────────────

function SeriesSection() {
  const [series,   setSeries]   = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState<string | null>(null);
  const [form,     setForm]     = useState({ series: '', documentType: 'FACTURA', isActive: true });

  const load = () => {
    setLoading(true);
    authClient.get('/document-series')
      .then(r => setSeries(Array.isArray(r.data) ? r.data : r.data?.data ?? []))
      .catch(ex => setError(errMsg(ex)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await authClient.post('/document-series', form);
      setShowForm(false);
      setForm({ series: '', documentType: 'FACTURA', isActive: true });
      load();
    } catch (ex) { setError(errMsg(ex)); }
  };

  const handleUpdate = async (id: string, data: any) => {
    try {
      await authClient.put(`/document-series/${id}`, data);
      setEditing(null);
      load();
    } catch (ex) { setError(errMsg(ex)); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta serie?')) return;
    try {
      await authClient.delete(`/document-series/${id}`);
      load();
    } catch (ex) { setError(errMsg(ex)); }
  };

  return (
    <div className="max-w-2xl">
      {error && <div className="mb-4 p-3 rounded-xl bg-[#FCEBEB] text-sm text-[#791F1F]">{error}</div>}
      <div className="mx-card overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5E5EA] flex items-center justify-between">
          <h3 className="text-sm font-medium">Series de documentos</h3>
          <button onClick={() => setShowForm(!showForm)} className="mx-btn-primary text-xs px-3 py-1.5">
            <Plus size={13} /> Nueva serie
          </button>
        </div>
        {showForm && (
          <form onSubmit={handleCreate} className="p-4 border-b border-[#E5E5EA] bg-[#F9F9FB] flex gap-3">
            <input className="mx-input w-28" placeholder="F001" value={form.series}
              onChange={e => setForm(p => ({ ...p, series: e.target.value }))} required />
            <select className="mx-select w-36" value={form.documentType}
              onChange={e => setForm(p => ({ ...p, documentType: e.target.value }))}>
              <option value="FACTURA">Factura</option>
              <option value="BOLETA">Boleta</option>
              <option value="NOTA_CREDITO">Nota crédito</option>
              <option value="NOTA_DEBITO">Nota débito</option>
            </select>
            <button type="submit" className="mx-btn-primary">Crear</button>
            <button type="button" onClick={() => setShowForm(false)} className="mx-btn-secondary">Cancelar</button>
          </form>
        )}
        {loading ? (
          <div className="p-4 space-y-2">{[1,2].map(i => <div key={i} className="mx-skeleton h-10 rounded-lg" />)}</div>
        ) : (
          <table className="mx-table">
            <thead><tr><th>Serie</th><th>Tipo</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {series.map(s => (
                <tr key={s.id}>
                  <td className="font-mono font-medium">{s.series}</td>
                  <td className="text-[#86868B]">{s.documentType}</td>
                  <td>
                    <button onClick={() => handleUpdate(s.id, { series: s.series, documentType: s.documentType, isActive: !s.isActive })}
                      className={s.isActive ? 'mx-badge mx-badge-success cursor-pointer' : 'mx-badge mx-badge-neutral cursor-pointer'}>
                      {s.isActive ? 'Activa' : 'Inactiva'}
                    </button>
                  </td>
                  <td>
                    <button onClick={() => handleDelete(s.id)} className="text-[#FF3B30] hover:opacity-70 p-1">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Tab: SMTP ─────────────────────────────────────────────────

function SmtpSection() {
  const [form,    setForm]    = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [testing, setTesting] = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState('');
  const [testEmail, setTestEmail] = useState('');

  useEffect(() => {
    authClient.get('/smtp-config')
      .then(r => setForm(r.data ?? {}))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p: any) => ({ ...p, [f]: e.target.value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess('');
    try {
      await authClient.put('/smtp-config', {
        host: form.host, port: Number(form.port), secure: form.secure,
        user: form.user, password: form.password,
        fromName: form.fromName, fromEmail: form.fromEmail,
      });
      setSuccess('Configuración guardada');
    } catch (ex) { setError(errMsg(ex)); }
    finally { setSaving(false); }
  };

  const handleTest = async () => {
    if (!testEmail) { setError('Ingresa un email de prueba'); return; }
    setTesting(true); setError(''); setSuccess('');
    try {
      await authClient.post('/smtp-config/test', { toEmail: testEmail });
      setSuccess('Email de prueba enviado correctamente');
    } catch (ex) { setError(errMsg(ex)); }
    finally { setTesting(false); }
  };

  if (loading) return <div className="mx-skeleton h-48 rounded-2xl" />;

  return (
    <div className="mx-card p-6 max-w-2xl">
      {error   && <div className="mb-4 p-3 rounded-xl bg-[#FCEBEB] text-sm text-[#791F1F]">{error}</div>}
      {success && <div className="mb-4 p-3 rounded-xl bg-[#EAF3DE] text-sm text-[#27500A]">{success}</div>}
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Host SMTP', field: 'host' },
            { label: 'Puerto', field: 'port' },
            { label: 'Usuario', field: 'user' },
            { label: 'Contraseña', field: 'password' },
            { label: 'Nombre remitente', field: 'fromName' },
            { label: 'Email remitente', field: 'fromEmail' },
          ].map(({ label, field }) => (
            <div key={field}>
              <label className="block text-xs font-medium text-[#1D1D1F] mb-1">{label}</label>
              <input className="mx-input" type={field === 'password' ? 'password' : 'text'}
                value={form[field] ?? ''} onChange={set(field)} />
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="mx-btn-primary">
            <Save size={14} /> {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
      <div className="mt-4 pt-4 border-t border-[#E5E5EA] flex gap-3">
        <input className="mx-input flex-1" type="email" placeholder="Email de prueba"
          value={testEmail} onChange={e => setTestEmail(e.target.value)} />
        <button onClick={handleTest} disabled={testing} className="mx-btn-secondary">
          {testing ? 'Enviando…' : 'Probar conexión'}
        </button>
      </div>
    </div>
  );
}

// ── Tab: Preferencias ─────────────────────────────────────────

function PreferencesSection() {
  const [form,    setForm]    = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    authClient.get('/org-preferences')
      .then(r => setForm(r.data ?? {}))
      .catch(ex => setError(errMsg(ex)))
      .finally(() => setLoading(false));
  }, []);

  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((p: any) => ({ ...p, [f]: e.target.value }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(''); setSuccess(false);
    try {
      await authClient.put('/org-preferences', {
        closingDay:      form.closingDay,
        roundingMode:    form.roundingMode,
        defaultCurrency: form.defaultCurrency,
        enableAlerts:    form.enableAlerts,
        alertDaysBefore: form.alertDaysBefore,
        timezone:        form.timezone,
        fiscalYearStart: form.fiscalYearStart,
      });
      setSuccess(true);
    } catch (ex) { setError(errMsg(ex)); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="mx-skeleton h-48 rounded-2xl" />;

  return (
    <div className="mx-card p-6 max-w-2xl">
      {error   && <div className="mb-4 p-3 rounded-xl bg-[#FCEBEB] text-sm text-[#791F1F]">{error}</div>}
      {success && <div className="mb-4 p-3 rounded-xl bg-[#EAF3DE] text-sm text-[#27500A]">Guardado correctamente</div>}
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Día de cierre mensual</label>
            <input type="number" className="mx-input" min={1} max={31} value={form.closingDay ?? ''} onChange={set('closingDay')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Moneda por defecto</label>
            <select className="mx-select" value={form.defaultCurrency ?? 'PEN'} onChange={set('defaultCurrency')}>
              <option value="PEN">PEN — Soles</option>
              <option value="USD">USD — Dólares</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Días de alerta anticipada</label>
            <input type="number" className="mx-input" min={0} value={form.alertDaysBefore ?? ''} onChange={set('alertDaysBefore')} />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#1D1D1F] mb-1">Redondeo</label>
            <select className="mx-select" value={form.roundingMode ?? 'HALF_UP'} onChange={set('roundingMode')}>
              <option value="HALF_UP">Redondear arriba</option>
              <option value="HALF_DOWN">Redondear abajo</option>
              <option value="TRUNCATE">Truncar</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="mx-btn-primary">
            <Save size={14} /> {saving ? 'Guardando…' : 'Guardar preferencias'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ── Tab: Usuarios ─────────────────────────────────────────────

function UsersSection() {
  const [users,    setUsers]    = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState({ firstName: '', lastName: '', email: '', password: '', role: 'OPERATOR' });
  const [editing,  setEditing]  = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  const load = () => {
    setLoading(true);
    authClient.get('/users')
      .then(r => setUsers(Array.isArray(r.data) ? r.data : r.data?.data ?? []))
      .catch(ex => setError(errMsg(ex)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await authClient.post('/users', form);
      setShowForm(false);
      setForm({ firstName: '', lastName: '', email: '', password: '', role: 'OPERATOR' });
      load();
    } catch (ex) { setError(errMsg(ex)); }
  };

  const handleUpdate = async (id: string) => {
    try {
      await authClient.put(`/users/${id}`, {
        firstName: editForm.firstName, lastName: editForm.lastName,
        role: editForm.role, isActive: editForm.isActive,
      });
      setEditing(null);
      load();
    } catch (ex) { setError(errMsg(ex)); }
  };

  const ROLES = ['ADMIN','ACCOUNTANT','SUPERVISOR','OPERATOR','VIEWER'];

  return (
    <div className="max-w-3xl">
      {error && <div className="mb-4 p-3 rounded-xl bg-[#FCEBEB] text-sm text-[#791F1F]">{error}</div>}
      <div className="mx-card overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5E5EA] flex items-center justify-between">
          <h3 className="text-sm font-medium">Usuarios</h3>
          <button onClick={() => setShowForm(!showForm)} className="mx-btn-primary text-xs px-3 py-1.5">
            <Plus size={13} /> Nuevo usuario
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} className="p-4 border-b border-[#E5E5EA] bg-[#F9F9FB]">
            <div className="grid grid-cols-3 gap-3">
              <input className="mx-input" placeholder="Nombre" value={form.firstName}
                onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))} required />
              <input className="mx-input" placeholder="Apellido" value={form.lastName}
                onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))} />
              <input type="email" className="mx-input" placeholder="Email" value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required />
              <input type="password" className="mx-input" placeholder="Contraseña" value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))} required />
              <select className="mx-select" value={form.role}
                onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <div className="flex gap-2">
                <button type="submit" className="mx-btn-primary flex-1">Crear</button>
                <button type="button" onClick={() => setShowForm(false)} className="mx-btn-secondary">✕</button>
              </div>
            </div>
          </form>
        )}

        {loading ? (
          <div className="p-4 space-y-2">{[1,2].map(i => <div key={i} className="mx-skeleton h-10 rounded-lg" />)}</div>
        ) : (
          <table className="mx-table">
            <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  {editing === u.id ? (
                    <>
                      <td>
                        <div className="flex gap-1">
                          <input className="mx-input text-xs py-1" value={editForm.firstName ?? ''}
                            onChange={e => setEditForm((p: any) => ({ ...p, firstName: e.target.value }))} />
                          <input className="mx-input text-xs py-1" value={editForm.lastName ?? ''}
                            onChange={e => setEditForm((p: any) => ({ ...p, lastName: e.target.value }))} />
                        </div>
                      </td>
                      <td className="text-[#86868B]">{u.email}</td>
                      <td>
                        <select className="mx-select text-xs py-1" value={editForm.role ?? ''}
                          onChange={e => setEditForm((p: any) => ({ ...p, role: e.target.value }))}>
                          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </td>
                      <td>
                        <button onClick={() => setEditForm((p: any) => ({ ...p, isActive: !p.isActive }))}
                          className={editForm.isActive ? 'mx-badge mx-badge-success cursor-pointer' : 'mx-badge mx-badge-neutral cursor-pointer'}>
                          {editForm.isActive ? 'Activo' : 'Inactivo'}
                        </button>
                      </td>
                      <td>
                        <div className="flex gap-1">
                          <button onClick={() => handleUpdate(u.id)} className="text-xs text-[#0071E3] hover:underline">Guardar</button>
                          <button onClick={() => setEditing(null)} className="text-xs text-[#86868B] hover:underline">Cancelar</button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="font-medium">{u.firstName} {u.lastName}</td>
                      <td className="text-[#86868B]">{u.email}</td>
                      <td><span className="mx-badge mx-badge-neutral">{u.role}</span></td>
                      <td><span className={u.isActive ? 'mx-badge mx-badge-success' : 'mx-badge mx-badge-neutral'}>{u.isActive ? 'Activo' : 'Inactivo'}</span></td>
                      <td>
                        <button onClick={() => { setEditing(u.id); setEditForm(u); }}
                          className="text-xs text-[#0071E3] hover:underline">Editar</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────

const TABS = ['Organización', 'Series', 'Correo SMTP', 'Preferencias', 'Usuarios'];

export default function SettingsPage() {
  const [tab, setTab] = useState(0);

  return (
    <div className="mx-fade-in">
      <div className="mx-page-header">
        <h1 className="mx-page-title">Configuración</h1>
      </div>

      <div className="flex gap-1 mb-6 bg-[#F2F2F7] p-1 rounded-xl w-fit">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === i ? 'bg-white text-[#1D1D1F] shadow-sm' : 'text-[#86868B] hover:text-[#1D1D1F]'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && <OrgSection />}
      {tab === 1 && <SeriesSection />}
      {tab === 2 && <SmtpSection />}
      {tab === 3 && <PreferencesSection />}
      {tab === 4 && <UsersSection />}
    </div>
  );
}
