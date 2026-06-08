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
    authClient.get('/organization').then(r => setForm(r.data ?? {})).catch(ex => setError(errMsg(ex))).finally(() => setLoading(false));
  }, []);

  const set = (f:string) => (e:React.ChangeEvent<HTMLInputElement>) => setForm((p:any) => ({...p,[f]:e.target.value}));

  const handleSave = async (e:React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(''); setSuccess(false);
    try { await authClient.put('/organization', { name:form.name, legalName:form.legalName, taxId:form.taxId, address:form.address, phone:form.phone, email:form.email, logoUrl:form.logoUrl, timezone:form.timezone, baseCurrency:form.baseCurrency }); setSuccess(true); }
    catch (ex) { setError(errMsg(ex)); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="mx-skeleton" style={{ height:280, borderRadius:16, maxWidth:640 }}/>;

  return (
    <form onSubmit={handleSave} style={{ maxWidth:640 }}>
      {error   && <div className="mx-alert mx-alert-error"   style={{ marginBottom:16 }}>{error}</div>}
      {success && <div className="mx-alert mx-alert-success" style={{ marginBottom:16 }}>Guardado correctamente</div>}
      <div className="mx-form-card">
        <div className="mx-form-title">Datos de la organización</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          {[{label:'Nombre comercial',field:'name'},{label:'Razón social',field:'legalName'},{label:'RUC',field:'taxId'},{label:'Teléfono',field:'phone'},{label:'Email',field:'email'},{label:'Moneda base',field:'baseCurrency'},{label:'Zona horaria',field:'timezone'},{label:'Logo URL',field:'logoUrl'}].map(({label,field})=>(
            <div key={field}><label className="mx-label">{label}</label><input className="mx-input" value={form[field]??''} onChange={set(field)}/></div>
          ))}
          <div style={{ gridColumn:'1/-1' }}><label className="mx-label">Dirección</label><input className="mx-input" value={form.address??''} onChange={set('address')}/></div>
        </div>
      </div>
      <div style={{ display:'flex', justifyContent:'flex-end' }}>
        <button type="submit" disabled={saving} className="mx-btn mx-btn-primary"><Save size={14}/>{saving?'Guardando…':'Guardar cambios'}</button>
      </div>
    </form>
  );
}

// ── Tab: Series ───────────────────────────────────────────────

function SeriesSection() {
  const [series,   setSeries]   = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState({ series:'', documentType:'FACTURA', isActive:true });

  const load = () => { setLoading(true); authClient.get('/document-series').then(r=>setSeries(Array.isArray(r.data)?r.data:r.data?.data??[])).catch(ex=>setError(errMsg(ex))).finally(()=>setLoading(false)); };
  useEffect(() => { load(); }, []);

  const handleCreate = async (e:React.FormEvent) => {
    e.preventDefault();
    try { await authClient.post('/document-series', form); setShowForm(false); setForm({ series:'', documentType:'FACTURA', isActive:true }); load(); }
    catch (ex) { setError(errMsg(ex)); }
  };

  const handleDelete = async (id:string) => {
    if (!confirm('¿Eliminar esta serie?')) return;
    try { await authClient.delete(`/document-series/${id}`); load(); }
    catch (ex) { setError(errMsg(ex)); }
  };

  return (
    <div style={{ maxWidth:520 }}>
      {error && <div className="mx-alert mx-alert-error" style={{ marginBottom:16 }}>{error}</div>}
      <div className="mx-card-section">
        <div style={{ padding:'14px 20px', borderBottom:'0.5px solid #E5E5EA', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3 style={{ fontSize:14, fontWeight:600 }}>Series de documentos</h3>
          <button onClick={() => setShowForm(!showForm)} className="mx-btn mx-btn-primary" style={{ padding:'6px 14px', fontSize:12 }}><Plus size={13}/>Nueva serie</button>
        </div>
        {showForm && (
          <form onSubmit={handleCreate} style={{ padding:'12px 20px', background:'#F9F9FB', borderBottom:'0.5px solid #E5E5EA', display:'flex', gap:8 }}>
            <input className="mx-input" placeholder="F001" value={form.series} onChange={e=>setForm(p=>({...p,series:e.target.value}))} required style={{ width:90 }}/>
            <select className="mx-select" value={form.documentType} onChange={e=>setForm(p=>({...p,documentType:e.target.value}))}>
              <option value="FACTURA">Factura</option>
              <option value="BOLETA">Boleta</option>
              <option value="NOTA_CREDITO">Nota crédito</option>
              <option value="NOTA_DEBITO">Nota débito</option>
            </select>
            <button type="submit" className="mx-btn mx-btn-primary">Crear</button>
            <button type="button" onClick={() => setShowForm(false)} className="mx-btn mx-btn-secondary">✕</button>
          </form>
        )}
        {loading ? <div style={{ padding:16 }}><div className="mx-skeleton" style={{ height:36, borderRadius:8 }}/></div> : (
          <table className="mx-table">
            <thead><tr><th>Serie</th><th>Tipo</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {series.map(s => (
                <tr key={s.id}>
                  <td style={{ fontFamily:'monospace', fontWeight:600 }}>{s.series}</td>
                  <td style={{ color:'#86868B' }}>{s.documentType}</td>
                  <td><span className={s.isActive?'mx-badge mx-badge-success':'mx-badge mx-badge-neutral'}>{s.isActive?'Activa':'Inactiva'}</span></td>
                  <td><button onClick={() => handleDelete(s.id)} style={{ background:'none', border:'none', cursor:'pointer', color:'#FF3B30' }}><Trash2 size={14}/></button></td>
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

  useEffect(() => { authClient.get('/smtp-config').then(r=>setForm(r.data??{})).catch(()=>{}).finally(()=>setLoading(false)); }, []);

  const set = (f:string) => (e:React.ChangeEvent<HTMLInputElement>) => setForm((p:any) => ({...p,[f]:e.target.value}));

  const handleSave = async (e:React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(''); setSuccess('');
    try { await authClient.put('/smtp-config', { host:form.host, port:Number(form.port), secure:form.secure, user:form.user, password:form.password, fromName:form.fromName, fromEmail:form.fromEmail }); setSuccess('Configuración guardada'); }
    catch (ex) { setError(errMsg(ex)); }
    finally { setSaving(false); }
  };

  const handleTest = async () => {
    if (!testEmail) { setError('Ingresa un email de prueba'); return; }
    setTesting(true); setError(''); setSuccess('');
    try { await authClient.post('/smtp-config/test', { toEmail:testEmail }); setSuccess('Email de prueba enviado'); }
    catch (ex) { setError(errMsg(ex)); }
    finally { setTesting(false); }
  };

  if (loading) return <div className="mx-skeleton" style={{ height:200, borderRadius:16, maxWidth:520 }}/>;

  return (
    <div style={{ maxWidth:520 }}>
      {error   && <div className="mx-alert mx-alert-error"   style={{ marginBottom:16 }}>{error}</div>}
      {success && <div className="mx-alert mx-alert-success" style={{ marginBottom:16 }}>{success}</div>}
      <form onSubmit={handleSave}>
        <div className="mx-form-card">
          <div className="mx-form-title">Configuración SMTP</div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            {[{label:'Host SMTP',field:'host'},{label:'Puerto',field:'port'},{label:'Usuario',field:'user'},{label:'Contraseña',field:'password'},{label:'Nombre remitente',field:'fromName'},{label:'Email remitente',field:'fromEmail'}].map(({label,field})=>(
              <div key={field}><label className="mx-label">{label}</label><input className="mx-input" type={field==='password'?'password':'text'} value={form[field]??''} onChange={set(field)}/></div>
            ))}
          </div>
        </div>
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
          <button type="submit" disabled={saving} className="mx-btn mx-btn-primary"><Save size={14}/>{saving?'Guardando…':'Guardar'}</button>
        </div>
      </form>
      <div className="mx-form-card">
        <div className="mx-form-title">Probar conexión</div>
        <div style={{ display:'flex', gap:8 }}>
          <input type="email" className="mx-input" placeholder="Email de prueba" value={testEmail} onChange={e=>setTestEmail(e.target.value)}/>
          <button onClick={handleTest} disabled={testing} className="mx-btn mx-btn-secondary" style={{ whiteSpace:'nowrap' }}>{testing?'Enviando…':'Enviar prueba'}</button>
        </div>
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

  useEffect(() => { authClient.get('/org-preferences').then(r=>setForm(r.data??{})).catch(ex=>setError(errMsg(ex))).finally(()=>setLoading(false)); }, []);

  const set = (f:string) => (e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) => setForm((p:any) => ({...p,[f]:e.target.value}));

  const handleSave = async (e:React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError(''); setSuccess(false);
    try { await authClient.put('/org-preferences', { closingDay:form.closingDay, roundingMode:form.roundingMode, defaultCurrency:form.defaultCurrency, enableAlerts:form.enableAlerts, alertDaysBefore:form.alertDaysBefore, timezone:form.timezone }); setSuccess(true); }
    catch (ex) { setError(errMsg(ex)); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="mx-skeleton" style={{ height:160, borderRadius:16, maxWidth:520 }}/>;

  return (
    <form onSubmit={handleSave} style={{ maxWidth:520 }}>
      {error   && <div className="mx-alert mx-alert-error"   style={{ marginBottom:16 }}>{error}</div>}
      {success && <div className="mx-alert mx-alert-success" style={{ marginBottom:16 }}>Preferencias guardadas</div>}
      <div className="mx-form-card">
        <div className="mx-form-title">Preferencias operativas</div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          <div><label className="mx-label">Día de cierre mensual</label><input type="number" className="mx-input" min={1} max={31} value={form.closingDay??''} onChange={set('closingDay')}/></div>
          <div><label className="mx-label">Moneda por defecto</label><select className="mx-select" value={form.defaultCurrency??'PEN'} onChange={set('defaultCurrency')}><option value="PEN">PEN — Soles</option><option value="USD">USD — Dólares</option></select></div>
          <div><label className="mx-label">Días de alerta anticipada</label><input type="number" className="mx-input" min={0} value={form.alertDaysBefore??''} onChange={set('alertDaysBefore')}/></div>
          <div><label className="mx-label">Redondeo</label><select className="mx-select" value={form.roundingMode??'HALF_UP'} onChange={set('roundingMode')}><option value="HALF_UP">Redondear arriba</option><option value="HALF_DOWN">Redondear abajo</option><option value="TRUNCATE">Truncar</option></select></div>
        </div>
      </div>
      <div style={{ display:'flex', justifyContent:'flex-end' }}>
        <button type="submit" disabled={saving} className="mx-btn mx-btn-primary"><Save size={14}/>{saving?'Guardando…':'Guardar preferencias'}</button>
      </div>
    </form>
  );
}

// ── Tab: Usuarios ─────────────────────────────────────────────

function UsersSection() {
  const [users,    setUsers]    = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form,     setForm]     = useState({ firstName:'', lastName:'', email:'', password:'', role:'OPERATOR' });
  const [editing,  setEditing]  = useState<string|null>(null);
  const [editForm, setEditForm] = useState<any>({});

  const load = () => { setLoading(true); authClient.get('/users').then(r=>setUsers(Array.isArray(r.data)?r.data:r.data?.data??[])).catch(ex=>setError(errMsg(ex))).finally(()=>setLoading(false)); };
  useEffect(() => { load(); }, []);

  const handleCreate = async (e:React.FormEvent) => {
    e.preventDefault();
    try { await authClient.post('/users', form); setShowForm(false); setForm({ firstName:'', lastName:'', email:'', password:'', role:'OPERATOR' }); load(); }
    catch (ex) { setError(errMsg(ex)); }
  };

  const handleUpdate = async (id:string) => {
    try { await authClient.put(`/users/${id}`, { firstName:editForm.firstName, lastName:editForm.lastName, role:editForm.role, isActive:editForm.isActive }); setEditing(null); load(); }
    catch (ex) { setError(errMsg(ex)); }
  };

  const ROLES = ['ADMIN','ACCOUNTANT','SUPERVISOR','OPERATOR','VIEWER'];

  return (
    <div style={{ maxWidth:720 }}>
      {error && <div className="mx-alert mx-alert-error" style={{ marginBottom:16 }}>{error}</div>}
      <div className="mx-card-section">
        <div style={{ padding:'14px 20px', borderBottom:'0.5px solid #E5E5EA', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h3 style={{ fontSize:14, fontWeight:600 }}>Usuarios del sistema</h3>
          <button onClick={() => setShowForm(!showForm)} className="mx-btn mx-btn-primary" style={{ padding:'6px 14px', fontSize:12 }}><Plus size={13}/>Nuevo usuario</button>
        </div>

        {showForm && (
          <form onSubmit={handleCreate} style={{ padding:'16px 20px', background:'#F9F9FB', borderBottom:'0.5px solid #E5E5EA' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
              <div><label className="mx-label">Nombre</label><input className="mx-input" value={form.firstName} onChange={e=>setForm(p=>({...p,firstName:e.target.value}))} required/></div>
              <div><label className="mx-label">Apellido</label><input className="mx-input" value={form.lastName} onChange={e=>setForm(p=>({...p,lastName:e.target.value}))}/></div>
              <div><label className="mx-label">Email</label><input type="email" className="mx-input" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} required/></div>
              <div><label className="mx-label">Contraseña</label><input type="password" className="mx-input" value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))} required/></div>
              <div><label className="mx-label">Rol</label><select className="mx-select" value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))}>{ROLES.map(r=><option key={r} value={r}>{r}</option>)}</select></div>
              <div style={{ display:'flex', alignItems:'flex-end', gap:8 }}>
                <button type="submit" className="mx-btn mx-btn-primary" style={{ flex:1 }}>Crear</button>
                <button type="button" onClick={() => setShowForm(false)} className="mx-btn mx-btn-secondary">✕</button>
              </div>
            </div>
          </form>
        )}

        {loading ? <div style={{ padding:16 }}><div className="mx-skeleton" style={{ height:44, borderRadius:8 }}/></div> : (
          <table className="mx-table">
            <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  {editing===u.id ? (
                    <>
                      <td>
                        <div style={{ display:'flex', gap:6 }}>
                          <input className="mx-input" style={{ padding:'6px 8px', fontSize:12 }} value={editForm.firstName??''} onChange={e=>setEditForm((p:any)=>({...p,firstName:e.target.value}))}/>
                          <input className="mx-input" style={{ padding:'6px 8px', fontSize:12 }} value={editForm.lastName??''} onChange={e=>setEditForm((p:any)=>({...p,lastName:e.target.value}))}/>
                        </div>
                      </td>
                      <td style={{ color:'#86868B' }}>{u.email}</td>
                      <td><select className="mx-select" style={{ padding:'6px 8px', fontSize:12 }} value={editForm.role??''} onChange={e=>setEditForm((p:any)=>({...p,role:e.target.value}))}>{ROLES.map(r=><option key={r} value={r}>{r}</option>)}</select></td>
                      <td><button onClick={() => setEditForm((p:any)=>({...p,isActive:!p.isActive}))} className={editForm.isActive?'mx-badge mx-badge-success':'mx-badge mx-badge-neutral'} style={{ border:'none', cursor:'pointer' }}>{editForm.isActive?'Activo':'Inactivo'}</button></td>
                      <td><div style={{ display:'flex', gap:6 }}><button onClick={() => handleUpdate(u.id)} style={{ fontSize:12, color:'#0071E3', background:'none', border:'none', cursor:'pointer' }}>Guardar</button><button onClick={() => setEditing(null)} style={{ fontSize:12, color:'#86868B', background:'none', border:'none', cursor:'pointer' }}>Cancelar</button></div></td>
                    </>
                  ) : (
                    <>
                      <td style={{ fontWeight:500 }}>{u.firstName} {u.lastName}</td>
                      <td style={{ color:'#86868B' }}>{u.email}</td>
                      <td><span className="mx-badge mx-badge-neutral">{u.role}</span></td>
                      <td><span className={u.isActive?'mx-badge mx-badge-success':'mx-badge mx-badge-neutral'}>{u.isActive?'Activo':'Inactivo'}</span></td>
                      <td><button onClick={() => { setEditing(u.id); setEditForm(u); }} style={{ fontSize:12, color:'#0071E3', background:'none', border:'none', cursor:'pointer' }}>Editar</button></td>
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

const TABS = ['Organización','Series','Correo SMTP','Preferencias','Usuarios'];

export default function SettingsPage() {
  const [tab, setTab] = useState(0);
  return (
    <div className="mx-fade-in">
      <div className="mx-page-header">
        <div><h1 className="mx-page-title">Configuración</h1><p className="mx-page-subtitle">Organización, series de documentos, SMTP y usuarios</p></div>
      </div>
      <div style={{ display:'flex', gap:2, background:'rgba(0,0,0,0.05)', padding:3, borderRadius:12, width:'fit-content', marginBottom:24 }}>
        {TABS.map((t,i) => (
          <button key={t} onClick={() => setTab(i)}
            style={{ padding:'7px 16px', borderRadius:8, border:'none', fontSize:13, fontWeight:500, cursor:'pointer', fontFamily:'inherit', background: tab===i ? '#fff' : 'transparent', color: tab===i ? '#1D1D1F' : '#86868B', boxShadow: tab===i ? '0 1px 4px rgba(0,0,0,0.10)' : 'none', transition:'all 0.12s' }}>
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
