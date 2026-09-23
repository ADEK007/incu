import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '../../lib/supabaseClient';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'sonner';
import {
  Cpu, Plus, Search, X, Trash2, Save, Send, AlertTriangle,
  Activity, Wifi, WifiOff, ChevronLeft, RefreshCw,
} from 'lucide-react';

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

const STATUS_STYLES: Record<string, string> = {
  online: 'bg-green-50 text-green-600 border-green-200',
  active: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  offline: 'bg-red-50 text-red-600 border-red-200',
  maintenance: 'bg-orange-50 text-orange-600 border-orange-200',
  inactive: 'bg-gray-100 text-gray-500 border-gray-200',
  retired: 'bg-gray-100 text-gray-400 border-gray-200',
};

const SEVERITY_STYLES: Record<string, string> = {
  low: 'bg-blue-50 text-blue-600 border-blue-200',
  medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  high: 'bg-orange-50 text-orange-600 border-orange-200',
  critical: 'bg-red-50 text-red-600 border-red-200',
};

const ISSUE_STATUS_STYLES: Record<string, string> = {
  open: 'bg-red-50 text-red-600 border-red-200',
  in_progress: 'bg-orange-50 text-orange-600 border-orange-200',
  resolved: 'bg-green-50 text-green-600 border-green-200',
  closed: 'bg-gray-100 text-gray-500 border-gray-200',
};

const CMD_STATUS_STYLES: Record<string, string> = {
  queued: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  sent: 'bg-blue-50 text-blue-600 border-blue-200',
  success: 'bg-green-50 text-green-600 border-green-200',
  failed: 'bg-red-50 text-red-600 border-red-200',
  expired: 'bg-gray-100 text-gray-500 border-gray-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
};

const STATUS_OPTIONS = ['inactive', 'active', 'online', 'offline', 'maintenance', 'retired'];
const CMD_PRESETS = ['SET_TEMPERATURE', 'SET_HUMIDITY_THRESHOLD', 'RESTART_DEVICE', 'CALIBRATE_SENSORS', 'UPDATE_FIRMWARE', 'CUSTOM'];

export default function Devices() {
  const { profile } = useAuthStore();
  const tenantId = profile?.tenant_id ?? profile?.id ?? '';

  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, online: 0, offline: 0, issues: 0 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [tab, setTab] = useState<'overview' | 'telemetry' | 'issues' | 'commands'>('overview');

  const fetchAll = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const [devRes, typeRes, issuesRes] = await Promise.all([
        (supabase.from('devices') as any).select('*').eq('tenant_id', tenantId).is('deleted_at', null).order('created_at', { ascending: false }),
        (supabase.from('device_types') as any).select('*').order('name'),
        (supabase.from('device_issue_reports') as any).select('id, device_id, status, devices!inner(tenant_id)').in('status', ['open', 'in_progress']).eq('devices.tenant_id', tenantId),
      ]);
      if (devRes.error) throw devRes.error;
      const list = devRes.data || [];
      setDevices(list);
      setTypes(typeRes.data || []);
      setStats({
        total: list.length,
        online: list.filter((d: any) => d.is_online).length,
        offline: list.filter((d: any) => !d.is_online && d.status !== 'inactive').length,
        issues: (issuesRes.data || []).length,
      });
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load devices');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); /* eslint-disable-next-line */ }, [tenantId]);

  const filtered = useMemo(() => {
    return devices.filter((d) => {
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      if (!search) return true;
      const s = search.toLowerCase();
      return (d.serial_number || '').toLowerCase().includes(s) || (d.name || '').toLowerCase().includes(s);
    });
  }, [devices, search, statusFilter]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Devices</h1>
            <p className="text-gray-500 font-medium mt-1">Manage your IoT fleet, telemetry, issues and commands</p>
          </div>
          <button onClick={() => setShowAdd(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black px-4 py-2.5 text-sm flex items-center gap-2">
            <Plus size={16} /> Add Device
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Devices" value={stats.total} icon={<Cpu size={18} />} color="indigo" />
          <StatCard label="Online Now" value={stats.online} icon={<Wifi size={18} />} color="green" />
          <StatCard label="Offline" value={stats.offline} icon={<WifiOff size={18} />} color="red" />
          <StatCard label="Issues Open" value={stats.issues} icon={<AlertTriangle size={18} />} color="orange" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* List */}
          <div className={`lg:col-span-2 ${selected ? 'hidden lg:block' : ''} bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3`}>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search serial or name" className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600">
                <option value="all">All</option>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {loading ? (
              <div className="py-16 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-gray-400 font-bold">No devices found</div>
            ) : (
              <div className="space-y-2 max-h-[70vh] overflow-y-auto">
                {filtered.map((d) => (
                  <button key={d.id} onClick={() => { setSelected(d); setTab('overview'); }} className={`w-full text-left p-3 rounded-xl border transition-all ${selected?.id === d.id ? 'border-indigo-300 bg-indigo-50/50' : 'border-gray-100 hover:border-indigo-200 hover:bg-gray-50'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <span className={`mt-1.5 inline-block h-2.5 w-2.5 rounded-full ${d.is_online ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                        <div className="min-w-0 flex-1">
                          <div className="font-black text-gray-900 text-sm truncate">{d.name || 'Unnamed'}</div>
                          <div className="text-xs text-gray-400 font-medium truncate">{d.serial_number}</div>
                          <div className="text-xs text-gray-400 font-medium mt-0.5">FW {d.firmware_version || '—'} · {timeAgo(d.last_seen)}</div>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-lg border text-xs font-bold ${STATUS_STYLES[d.status] || STATUS_STYLES.inactive}`}>{d.status}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Detail */}
          <div className={`lg:col-span-3 ${selected ? '' : 'hidden lg:block'}`}>
            {!selected ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-24 text-center text-gray-400 font-bold">
                Select a device to see details
              </div>
            ) : (
              <DeviceDetail
                device={selected}
                tab={tab}
                setTab={setTab}
                onBack={() => setSelected(null)}
                onChanged={() => { fetchAll(); }}
                onSelectedUpdated={(d) => setSelected(d)}
                profileId={profile?.id || ''}
                tenantId={tenantId}
              />
            )}
          </div>
        </div>
      </div>

      {showAdd && (
        <AddDeviceModal
          tenantId={tenantId}
          types={types}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); fetchAll(); }}
        />
      )}
    </AdminLayout>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: any; color: string }) {
  const map: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600', green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600', orange: 'bg-orange-50 text-orange-600',
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-widest text-gray-400">{label}</span>
        <span className={`p-2 rounded-lg ${map[color]}`}>{icon}</span>
      </div>
      <div className="text-3xl font-black text-gray-900 mt-2">{value}</div>
    </div>
  );
}

function AddDeviceModal({ tenantId, types, onClose, onSaved }: any) {
  const [form, setForm] = useState({ serial_number: '', name: '', device_type_id: '', firmware_version: '', status: 'inactive', notes: '' });
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!form.serial_number.trim()) { toast.error('Serial number required'); return; }
    setSaving(true);
    try {
      const { error } = await (supabase.from('devices') as any).insert({
        tenant_id: tenantId,
        serial_number: form.serial_number.trim(),
        name: form.name || null,
        device_type_id: form.device_type_id || null,
        firmware_version: form.firmware_version || null,
        status: form.status,
        metadata: form.notes ? { notes: form.notes } : {},
      });
      if (error) throw error;
      toast.success('Device created');
      onSaved();
    } catch (e: any) { toast.error(e?.message || 'Failed'); } finally { setSaving(false); }
  };
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-xl font-black text-gray-900">Add Device</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3">
          <Field label="Serial Number *"><input className="input" value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} /></Field>
          <Field label="Name"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="Device Type">
            <select className="input" value={form.device_type_id} onChange={(e) => setForm({ ...form, device_type_id: e.target.value })}>
              <option value="">— None —</option>
              {types.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="Firmware Version"><input className="input" value={form.firmware_version} onChange={(e) => setForm({ ...form, firmware_version: e.target.value })} /></Field>
          <Field label="Status">
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Notes"><textarea className="input" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
        </div>
        <div className="p-5 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 px-4 py-2 text-sm">Cancel</button>
          <button disabled={saving} onClick={submit} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black px-4 py-2 text-sm disabled:opacity-50">{saving ? 'Saving...' : 'Create'}</button>
        </div>
      </div>
      <style>{`.input{width:100%;padding:.625rem 1rem;border-radius:.75rem;border:1px solid #e5e7eb;font-size:.875rem;font-weight:500;outline:none}.input:focus{box-shadow:0 0 0 2px #6366f1}`}</style>
    </div>
  );
}

function Field({ label, children }: any) {
  return (
    <div>
      <label className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1 block">{label}</label>
      {children}
    </div>
  );
}

function DeviceDetail({ device, tab, setTab, onBack, onChanged, onSelectedUpdated, profileId, tenantId }: any) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="p-4 border-b border-gray-100 flex items-center gap-3">
        <button onClick={onBack} className="lg:hidden text-gray-500"><ChevronLeft size={20} /></button>
        <div className="flex-1 min-w-0">
          <div className="font-black text-gray-900 truncate">{device.name || device.serial_number}</div>
          <div className="text-xs text-gray-400 font-medium">{device.serial_number}</div>
        </div>
        <span className={`px-2 py-1 rounded-lg border text-xs font-bold ${STATUS_STYLES[device.status] || STATUS_STYLES.inactive}`}>{device.status}</span>
      </div>
      <div className="border-b border-gray-100 px-2 flex gap-1 overflow-x-auto">
        {(['overview', 'telemetry', 'issues', 'commands'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-3 text-xs font-black uppercase tracking-widest whitespace-nowrap ${tab === t ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>{t}</button>
        ))}
      </div>
      <div className="p-4">
        {tab === 'overview' && <OverviewTab device={device} onChanged={onChanged} onSelectedUpdated={onSelectedUpdated} profileId={profileId} tenantId={tenantId} />}
        {tab === 'telemetry' && <TelemetryTab deviceId={device.id} />}
        {tab === 'issues' && <IssuesTab deviceId={device.id} profileId={profileId} />}
        {tab === 'commands' && <CommandsTab device={device} profileId={profileId} tenantId={tenantId} />}
      </div>
    </div>
  );
}

function OverviewTab({ device, onChanged, onSelectedUpdated, profileId, tenantId }: any) {
  const [form, setForm] = useState({ name: device.name || '', firmware_version: device.firmware_version || '', status: device.status });
  const [assign, setAssign] = useState<any>(null);
  const [farmers, setFarmers] = useState<any[]>([]);
  const [showAssign, setShowAssign] = useState(false);
  const [newAssign, setNewAssign] = useState({ farmer_id: '', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm({ name: device.name || '', firmware_version: device.firmware_version || '', status: device.status }); }, [device.id]);

  const loadAssign = async () => {
    const [aRes, fRes] = await Promise.all([
      (supabase.from('device_assignments') as any).select('*, farmers(name), dealers(name)').eq('device_id', device.id).is('unassigned_at', null).maybeSingle(),
      (supabase.from('farmers') as any).select('id, name, dealer_id').eq('tenant_id', tenantId).is('deleted_at', null).order('name'),
    ]);
    setAssign(aRes.data || null);
    setFarmers(fRes.data || []);
  };
  useEffect(() => { loadAssign(); /* eslint-disable-next-line */ }, [device.id]);

  const saveDevice = async () => {
    setSaving(true);
    try {
      const { data, error } = await (supabase.from('devices') as any).update(form).eq('id', device.id).select().single();
      if (error) throw error;
      toast.success('Device updated');
      onSelectedUpdated(data); onChanged();
    } catch (e: any) { toast.error(e?.message || 'Failed'); } finally { setSaving(false); }
  };

  const submitAssign = async () => {
    if (!newAssign.farmer_id) { toast.error('Select a farmer'); return; }
    try {
      const farmer = farmers.find((f) => f.id === newAssign.farmer_id);
      const { error } = await (supabase.from('device_assignments') as any).insert({
        device_id: device.id, farmer_id: newAssign.farmer_id, dealer_id: farmer?.dealer_id || null,
        tenant_id: tenantId, assigned_by: profileId, notes: newAssign.notes || null,
      });
      if (error) throw error;
      toast.success('Assigned'); setShowAssign(false); setNewAssign({ farmer_id: '', notes: '' }); loadAssign();
    } catch (e: any) { toast.error(e?.message || 'Failed'); }
  };

  const unassign = async () => {
    if (!assign) return;
    try {
      const { error } = await (supabase.from('device_assignments') as any).update({ unassigned_at: new Date().toISOString() }).eq('id', assign.id);
      if (error) throw error;
      toast.success('Unassigned'); loadAssign();
    } catch (e: any) { toast.error(e?.message || 'Failed'); }
  };

  const softDelete = async () => {
    if (!confirm('Soft delete this device?')) return;
    try {
      const { error } = await (supabase.from('devices') as any).update({ deleted_at: new Date().toISOString() }).eq('id', device.id);
      if (error) throw error;
      toast.success('Device deleted'); onChanged();
    } catch (e: any) { toast.error(e?.message || 'Failed'); }
  };

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Name"><input className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Firmware"><input className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" value={form.firmware_version} onChange={(e) => setForm({ ...form, firmware_version: e.target.value })} /></Field>
        <Field label="Status">
          <select className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      </div>
      <button disabled={saving} onClick={saveDevice} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black px-4 py-2 text-sm disabled:opacity-50 flex items-center gap-2"><Save size={14} /> Save</button>

      <div className="border-t border-gray-100 pt-5">
        <div className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Assignment</div>
        {assign ? (
          <div className="p-4 rounded-xl border border-gray-100 bg-gray-50">
            <div className="text-sm font-bold text-gray-900">Farmer: {assign.farmers?.name || '—'}</div>
            <div className="text-xs text-gray-500 font-medium">Dealer: {assign.dealers?.name || '—'}</div>
            <div className="text-xs text-gray-400 font-medium mt-1">Assigned {timeAgo(assign.assigned_at)}</div>
            <button onClick={unassign} className="mt-3 text-red-400 hover:bg-red-50 rounded-lg px-3 py-1.5 text-xs font-bold">Unassign</button>
          </div>
        ) : showAssign ? (
          <div className="p-4 rounded-xl border border-gray-100 space-y-3">
            <Field label="Farmer">
              <select className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium" value={newAssign.farmer_id} onChange={(e) => setNewAssign({ ...newAssign, farmer_id: e.target.value })}>
                <option value="">— Select —</option>
                {farmers.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </Field>
            <Field label="Notes"><input className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium" value={newAssign.notes} onChange={(e) => setNewAssign({ ...newAssign, notes: e.target.value })} /></Field>
            <div className="flex gap-2">
              <button onClick={submitAssign} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black px-4 py-2 text-sm">Assign</button>
              <button onClick={() => setShowAssign(false)} className="border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 px-4 py-2 text-sm">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowAssign(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black px-4 py-2 text-sm">Assign Device</button>
        )}
      </div>

      <div className="border-t border-gray-100 pt-5">
        <button onClick={softDelete} className="text-red-400 hover:bg-red-50 rounded-lg px-3 py-2 text-sm font-bold flex items-center gap-2"><Trash2 size={14} /> Soft Delete Device</button>
      </div>
    </div>
  );
}

function TelemetryTab({ deviceId }: { deviceId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await (supabase.from('device_telemetry_snapshots') as any).select('*').eq('device_id', deviceId).order('recorded_at', { ascending: false }).limit(20);
      setRows(data || []); setLoading(false);
    })();
  }, [deviceId]);

  if (loading) return <div className="py-10 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>;
  if (!rows.length) return <div className="py-16 text-center text-gray-400 font-bold">No telemetry data yet — device has not reported</div>;
  const latest = rows[0];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Chip label="Temp" value={latest.temperature != null ? `${latest.temperature}°C` : '—'} emoji="🌡️" />
        <Chip label="Humidity" value={latest.humidity != null ? `${latest.humidity}%` : '—'} emoji="💧" />
        <Chip label="CO₂" value={latest.co2_level != null ? `${latest.co2_level}ppm` : '—'} emoji="🌫️" />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs font-black uppercase tracking-widest text-gray-400">
            <tr><th className="text-left p-2">Date/Time</th><th className="text-left p-2">Temp</th><th className="text-left p-2">Humidity</th><th className="text-left p-2">CO₂</th><th className="text-left p-2">Status</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-gray-100">
                <td className="p-2 text-gray-600 font-medium">{new Date(r.recorded_at).toLocaleString()}</td>
                <td className="p-2 font-bold text-gray-900">{r.temperature ?? '—'}</td>
                <td className="p-2 font-bold text-gray-900">{r.humidity ?? '—'}</td>
                <td className="p-2 font-bold text-gray-900">{r.co2_level ?? '—'}</td>
                <td className="p-2">{r.status_payload ? <span className="px-2 py-1 rounded-lg bg-gray-100 text-gray-600 text-xs font-bold">{JSON.stringify(r.status_payload).slice(0, 30)}</span> : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Chip({ label, value, emoji }: any) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
      <div className="text-2xl">{emoji}</div>
      <div className="text-xs font-black uppercase tracking-widest text-gray-400 mt-1">{label}</div>
      <div className="text-lg font-black text-gray-900">{value}</div>
    </div>
  );
}

function IssuesTab({ deviceId, profileId }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', severity: 'medium' });

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase.from('device_issue_reports') as any).select('*').eq('device_id', deviceId).order('created_at', { ascending: false });
    setItems(data || []); setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [deviceId]);

  const submit = async () => {
    if (!form.title.trim()) { toast.error('Title required'); return; }
    try {
      const { error } = await (supabase.from('device_issue_reports') as any).insert({
        device_id: deviceId, reported_by: profileId, title: form.title, description: form.description || null, severity: form.severity, status: 'open',
      });
      if (error) throw error;
      toast.success('Issue created'); setShowForm(false); setForm({ title: '', description: '', severity: 'medium' }); load();
    } catch (e: any) { toast.error(e?.message || 'Failed'); }
  };
  const resolve = async (id: string) => {
    try {
      const { error } = await (supabase.from('device_issue_reports') as any).update({ status: 'resolved', resolved_at: new Date().toISOString() }).eq('id', id);
      if (error) throw error;
      toast.success('Resolved'); load();
    } catch (e: any) { toast.error(e?.message || 'Failed'); }
  };

  return (
    <div className="space-y-3">
      {!showForm ? (
        <button onClick={() => setShowForm(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black px-4 py-2 text-sm flex items-center gap-2"><Plus size={14} /> Add Issue</button>
      ) : (
        <div className="p-4 rounded-xl border border-gray-100 space-y-3">
          <Field label="Title *"><input className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
          <Field label="Description"><textarea rows={3} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="Severity">
            <select className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium" value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>
              {['low', 'medium', 'high', 'critical'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <div className="flex gap-2">
            <button onClick={submit} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black px-4 py-2 text-sm">Save</button>
            <button onClick={() => setShowForm(false)} className="border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 px-4 py-2 text-sm">Cancel</button>
          </div>
        </div>
      )}
      {loading ? (
        <div className="py-10 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center text-gray-400 font-bold">No issues reported</div>
      ) : items.map((it) => (
        <div key={it.id} className="p-3 rounded-xl border border-gray-100">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="font-black text-gray-900 text-sm">{it.title}</div>
              {it.description && <div className="text-xs text-gray-500 font-medium mt-1">{it.description}</div>}
              <div className="text-xs text-gray-400 font-medium mt-1">{timeAgo(it.created_at)}</div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={`px-2 py-1 rounded-lg border text-xs font-bold ${SEVERITY_STYLES[it.severity]}`}>{it.severity}</span>
              <span className={`px-2 py-1 rounded-lg border text-xs font-bold ${ISSUE_STATUS_STYLES[it.status]}`}>{it.status}</span>
            </div>
          </div>
          {(it.status === 'open' || it.status === 'in_progress') && (
            <button onClick={() => resolve(it.id)} className="mt-2 text-xs font-bold text-green-600 hover:bg-green-50 rounded-lg px-2 py-1">Mark Resolved</button>
          )}
        </div>
      ))}
    </div>
  );
}

function CommandsTab({ device, profileId, tenantId }: any) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase.from('device_commands') as any).select('*').eq('device_id', device.id).order('created_at', { ascending: false }).limit(10);
    setItems(data || []); setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [device.id]);

  return (
    <div className="space-y-3">
      <button onClick={() => setShowModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black px-4 py-2 text-sm flex items-center gap-2"><Send size={14} /> Send Command</button>
      {loading ? (
        <div className="py-10 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center text-gray-400 font-bold">No commands yet</div>
      ) : items.map((c) => (
        <div key={c.id} className="p-3 rounded-xl border border-gray-100">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="font-black text-gray-900 text-sm">{c.command_type}</div>
              <div className="text-xs text-gray-500 font-mono truncate">{JSON.stringify(c.payload).slice(0, 40)}</div>
              <div className="text-xs text-gray-400 font-medium mt-1">{timeAgo(c.created_at)} · expires {c.expires_at ? new Date(c.expires_at).toLocaleString() : '—'}</div>
            </div>
            <span className={`px-2 py-1 rounded-lg border text-xs font-bold ${CMD_STATUS_STYLES[c.status]}`}>{c.status}</span>
          </div>
        </div>
      ))}
      {showModal && <SendCommandModal deviceId={device.id} tenantId={tenantId} profileId={profileId} onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load(); }} />}
    </div>
  );
}

export function SendCommandModal({ deviceId, tenantId, profileId, onClose, onSaved }: any) {
  const [type, setType] = useState('SET_TEMPERATURE');
  const [customType, setCustomType] = useState('');
  const [payload, setPayload] = useState('{}');
  const [expires, setExpires] = useState('24');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setErr('');
    let parsed: any;
    try { parsed = JSON.parse(payload || '{}'); } catch { setErr('Invalid JSON payload'); return; }
    const finalType = type === 'CUSTOM' ? customType.trim() : type;
    if (!finalType) { setErr('Command type required'); return; }
    setSaving(true);
    try {
      const expiresAt = new Date(Date.now() + parseInt(expires) * 3600 * 1000).toISOString();
      const { error } = await (supabase.from('device_commands') as any).insert({
        device_id: deviceId, tenant_id: tenantId, issued_by: profileId,
        command_type: finalType, payload: parsed, status: 'queued', expires_at: expiresAt,
      });
      if (error) throw error;
      toast.success('Command queued'); onSaved();
    } catch (e: any) { toast.error(e?.message || 'Failed'); } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-xl font-black text-gray-900">Send Command</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-3">
          <Field label="Command Type">
            <select className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium" value={type} onChange={(e) => setType(e.target.value)}>
              {CMD_PRESETS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          {type === 'CUSTOM' && <Field label="Custom Type"><input className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium" value={customType} onChange={(e) => setCustomType(e.target.value)} /></Field>}
          <Field label="Payload (JSON)"><textarea rows={4} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-mono" placeholder='{"key": "value"}' value={payload} onChange={(e) => setPayload(e.target.value)} /></Field>
          {err && <div className="text-red-500 text-xs font-bold">{err}</div>}
          <Field label="Expires In">
            <select className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium" value={expires} onChange={(e) => setExpires(e.target.value)}>
              <option value="1">1 hour</option><option value="6">6 hours</option><option value="24">24 hours</option><option value="72">72 hours</option>
            </select>
          </Field>
        </div>
        <div className="p-5 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={onClose} className="border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 px-4 py-2 text-sm">Cancel</button>
          <button disabled={saving} onClick={submit} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black px-4 py-2 text-sm disabled:opacity-50">{saving ? 'Sending...' : 'Send'}</button>
        </div>
      </div>
    </div>
  );
}
