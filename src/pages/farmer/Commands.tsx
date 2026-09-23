import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'sonner';
import { Cpu, LogOut, LayoutDashboard, Terminal, ChevronDown, ChevronRight } from 'lucide-react';

function timeAgo(d?: string | null) {
  if (!d) return '—';
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h} hr ago`;
  return `${Math.floor(h / 24)} days ago`;
}

const CMD_STATUS: Record<string, string> = {
  queued: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  sent: 'bg-blue-50 text-blue-600 border-blue-200',
  success: 'bg-green-50 text-green-600 border-green-200',
  failed: 'bg-red-50 text-red-600 border-red-200',
  expired: 'bg-gray-100 text-gray-500 border-gray-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
};
const PRESETS = ['SET_TEMPERATURE', 'SET_HUMIDITY_THRESHOLD', 'RESTART_DEVICE', 'CALIBRATE_SENSORS', 'CUSTOM'];

function FarmerLayout({ children, farmerName, onLogout }: any) {
  const loc = useLocation();
  const nav = [
    { label: 'Dashboard', to: '/farmer', icon: <LayoutDashboard size={16} /> },
    { label: 'My Devices', to: '/farmer/devices', icon: <Cpu size={16} /> },
    { label: 'Commands', to: '/farmer/commands', icon: <Terminal size={16} /> },
  ];
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link to="/farmer" className="flex items-center gap-2">
            <img src="/logo.png" alt="Logo" className="h-7 w-auto" />
            <span className="font-black text-gray-900">IncuTech</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-black text-gray-900">{farmerName}</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-green-600 bg-green-50 px-2 py-0.5 rounded">Farmer Portal</span>
            </div>
            <button onClick={onLogout} className="text-red-400 hover:bg-red-50 rounded-lg p-2"><LogOut size={16} /></button>
          </div>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row gap-6">
        <aside className="sm:w-48 flex sm:flex-col gap-1 overflow-x-auto">
          {nav.map((n) => {
            const active = loc.pathname === n.to;
            return (
              <Link key={n.to} to={n.to} className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold whitespace-nowrap ${active ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-indigo-50 hover:text-indigo-600'}`}>
                {n.icon}{n.label}
              </Link>
            );
          })}
        </aside>
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}

export default function FarmerCommands() {
  const { profile, signOut } = useAuthStore();
  const tenantId = profile?.tenant_id ?? profile?.id ?? '';
  const navigate = useNavigate();
  const search = new URLSearchParams(useLocation().search);
  const presetDeviceId = search.get('device_id') || '';

  const [farmer, setFarmer] = useState<any>(null);
  const [devices, setDevices] = useState<any[]>([]);
  const [commands, setCommands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'queued' | 'success' | 'failed'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const [form, setForm] = useState({ device_id: presetDeviceId, type: 'SET_TEMPERATURE', customType: '', payload: '{}', expires: '24' });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const logout = async () => { await signOut(); navigate('/login'); };

  const load = async () => {
    if (!profile?.id) return;
    setLoading(true);
    try {
      const { data: f } = await (supabase.from('farmers') as any).select('*').eq('user_id', profile.id).maybeSingle();
      setFarmer(f || null);
      if (!f) { setLoading(false); return; }
      const [aRes, cRes] = await Promise.all([
        (supabase.from('device_assignments') as any).select('devices(id, name, serial_number)').eq('farmer_id', f.id).is('unassigned_at', null),
        (supabase.from('device_commands') as any).select('*, devices(name, serial_number)').eq('issued_by', profile.id).order('created_at', { ascending: false }).limit(50),
      ]);
      setDevices((aRes.data || []).map((r: any) => r.devices).filter(Boolean));
      setCommands(cRes.data || []);
    } catch (e: any) { toast.error(e?.message || 'Failed'); } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [profile?.id]);

  const submit = async () => {
    setErr('');
    if (!form.device_id) { setErr('Select a device'); return; }
    let parsed: any;
    try { parsed = JSON.parse(form.payload || '{}'); } catch { setErr('Invalid JSON payload'); return; }
    const finalType = form.type === 'CUSTOM' ? form.customType.trim() : form.type;
    if (!finalType) { setErr('Command type required'); return; }
    setSaving(true);
    try {
      const expiresAt = new Date(Date.now() + parseInt(form.expires) * 3600 * 1000).toISOString();
      const { error } = await (supabase.from('device_commands') as any).insert({
        device_id: form.device_id, tenant_id: tenantId, issued_by: profile?.id,
        command_type: finalType, payload: parsed, status: 'queued', expires_at: expiresAt,
      });
      if (error) throw error;
      toast.success('Command queued'); setForm({ ...form, payload: '{}', customType: '' }); load();
    } catch (e: any) { toast.error(e?.message || 'Failed'); } finally { setSaving(false); }
  };

  const cancel = async (id: string) => {
    try {
      const { error } = await (supabase.from('device_commands') as any).update({ status: 'cancelled' }).eq('id', id);
      if (error) throw error;
      toast.success('Cancelled'); load();
    } catch (e: any) { toast.error(e?.message || 'Failed'); }
  };

  const filtered = commands.filter((c) => filter === 'all' ? true : c.status === filter);

  if (loading) {
    return <FarmerLayout farmerName={profile?.full_name || ''} onLogout={logout}><div className="py-24 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div></FarmerLayout>;
  }
  if (!farmer) {
    return (
      <FarmerLayout farmerName={profile?.full_name || ''} onLogout={logout}>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <p className="text-gray-500 font-medium">Your farmer account is being set up.</p>
        </div>
      </FarmerLayout>
    );
  }

  return (
    <FarmerLayout farmerName={farmer.name} onLogout={logout}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900">My Commands</h1>
          <p className="text-gray-500 font-medium mt-1">Send and track device commands</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <h2 className="font-black text-gray-900">Send Command</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1 block">Device</label>
              <select className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium" value={form.device_id} onChange={(e) => setForm({ ...form, device_id: e.target.value })}>
                <option value="">— Select device —</option>
                {devices.map((d: any) => <option key={d.id} value={d.id}>{d.name || d.serial_number}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1 block">Command Type</label>
              <select className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                {PRESETS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            {form.type === 'CUSTOM' && (
              <div className="sm:col-span-2">
                <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1 block">Custom Type</label>
                <input className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium" value={form.customType} onChange={(e) => setForm({ ...form, customType: e.target.value })} />
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1 block">Payload (JSON)</label>
              <textarea rows={3} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-mono" placeholder='{"key": "value"}' value={form.payload} onChange={(e) => setForm({ ...form, payload: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1 block">Expires In</label>
              <select className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium" value={form.expires} onChange={(e) => setForm({ ...form, expires: e.target.value })}>
                <option value="1">1 hour</option><option value="6">6 hours</option><option value="24">24 hours</option>
              </select>
            </div>
          </div>
          {err && <div className="text-red-500 text-xs font-bold">{err}</div>}
          <button disabled={saving} onClick={submit} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black px-4 py-2 text-sm disabled:opacity-50">{saving ? 'Sending...' : 'Send Command'}</button>
        </div>

        <div>
          <div className="flex gap-1 flex-wrap mb-3">
            {(['all', 'queued', 'success', 'failed'] as const).map((t) => (
              <button key={t} onClick={() => setFilter(t)} className={`px-3 py-1.5 rounded-xl text-xs font-bold ${filter === t ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-100 text-gray-600 hover:bg-gray-50'}`}>{t}</button>
            ))}
          </div>
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-12 text-center text-gray-400 font-bold">No commands</div>
          ) : (
            <div className="space-y-2">
              {filtered.map((c) => (
                <div key={c.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3">
                  <div className="flex items-start justify-between gap-2">
                    <button onClick={() => setExpanded(expanded === c.id ? null : c.id)} className="flex items-start gap-2 min-w-0 flex-1 text-left">
                      {expanded === c.id ? <ChevronDown size={14} className="mt-1 flex-shrink-0" /> : <ChevronRight size={14} className="mt-1 flex-shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <div className="font-black text-gray-900 text-sm">{c.devices?.name || c.devices?.serial_number || '—'}</div>
                        <div className="text-xs"><span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 font-bold">{c.command_type}</span></div>
                        <div className="text-xs text-gray-500 font-mono truncate mt-1">{JSON.stringify(c.payload).slice(0, 60)}</div>
                        <div className="text-xs text-gray-400 font-medium mt-1">{timeAgo(c.created_at)} · expires {c.expires_at ? new Date(c.expires_at).toLocaleString() : '—'}</div>
                      </div>
                    </button>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-1 rounded-lg border text-xs font-bold ${CMD_STATUS[c.status]}`}>{c.status}</span>
                      {c.status === 'queued' && <button onClick={() => cancel(c.id)} className="text-red-400 hover:bg-red-50 rounded-lg px-2 py-1 text-xs font-bold">Cancel</button>}
                    </div>
                  </div>
                  {expanded === c.id && (
                    <pre className="mt-2 bg-gray-50 p-3 rounded-xl text-xs overflow-x-auto">{JSON.stringify(c.payload, null, 2)}</pre>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </FarmerLayout>
  );
}
