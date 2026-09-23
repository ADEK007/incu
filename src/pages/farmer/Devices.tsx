import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabaseClient';
import { useAuthStore } from '../../store/authStore';

const navLinks = [
  { to: '/farmer', label: 'Dashboard', end: true },
  { to: '/farmer/devices', label: 'My Devices' },
  { to: '/farmer/commands', label: 'Commands' },
];

function FarmerLayout({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen(!open)} className="md:hidden p-2 rounded-lg border border-gray-200">☰</button>
            <div className="font-black text-xl text-indigo-600">ICU</div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm font-bold text-gray-700">{profile?.full_name ?? 'Farmer'}</span>
            <span className="px-2 py-1 rounded-lg border text-xs font-bold bg-green-50 text-green-700 border-green-200">Farmer Portal</span>
            <button onClick={async () => { await signOut(); navigate('/login'); }} className="border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 px-3 py-1.5 text-sm">Logout</button>
          </div>
        </div>
      </header>
      <div className="max-w-7xl mx-auto flex">
        <aside className={`${open ? 'block' : 'hidden'} md:block w-56 border-r border-gray-100 bg-white min-h-[calc(100vh-4rem)] p-4`}>
          <nav className="space-y-1">
            {navLinks.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.end} onClick={() => setOpen(false)}
                className={({ isActive }) => `block px-3 py-2 rounded-xl text-sm font-bold ${isActive ? 'bg-indigo-50 text-indigo-600' : 'text-gray-600 hover:bg-gray-50'}`}>{l.label}</NavLink>
            ))}
          </nav>
        </aside>
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

function timeAgo(d: string) {
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return m + ' min ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + ' hr ago';
  return Math.floor(h / 24) + ' days ago';
}

const tempChip = (t: number | null) => {
  if (t == null) return { cls: 'bg-gray-50 text-gray-400', label: 'No data' };
  if (t < 25) return { cls: 'bg-blue-50 text-blue-700', label: 'Low' };
  if (t > 35) return { cls: 'bg-red-50 text-red-700', label: 'High' };
  return { cls: 'bg-green-50 text-green-700', label: 'Normal' };
};
const humChip = (h: number | null) => {
  if (h == null) return { cls: 'bg-gray-50 text-gray-400', label: 'No data' };
  if (h < 40 || h > 80) return { cls: 'bg-red-50 text-red-700', label: 'Warning' };
  return { cls: 'bg-green-50 text-green-700', label: 'Normal' };
};
const co2Chip = (c: number | null) => {
  if (c == null) return { cls: 'bg-gray-50 text-gray-400', label: 'No data' };
  if (c < 1000) return { cls: 'bg-green-50 text-green-700', label: 'Good' };
  if (c < 2000) return { cls: 'bg-yellow-50 text-yellow-700', label: 'Moderate' };
  return { cls: 'bg-red-50 text-red-700', label: 'Poor' };
};

export default function FarmerDevices() {
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [farmer, setFarmer] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [tick, setTick] = useState(0);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportDevice, setReportDevice] = useState<any>(null);
  const [report, setReport] = useState({ title: '', description: '', severity: 'medium' });
  const intervalRef = useRef<any>();

  const load = async (showSpinner = true) => {
    if (!profile) return;
    if (showSpinner) setLoading(true);
    try {
      let f = farmer;
      if (!f) {
        const { data } = await (supabase.from('farmers') as any).select('*').eq('email', profile.email).maybeSingle();
        f = data; setFarmer(data);
      }
      if (!f) { setLoading(false); return; }
      const { data: as, error } = await (supabase.from('device_assignments') as any)
        .select('*, devices(*, device_telemetry_snapshots(temperature, humidity, co2_level, status_payload, recorded_at))')
        .eq('farmer_id', f.id).is('unassigned_at', null);
      if (error) throw error;
      setAssignments(as || []);
      setLastUpdate(Date.now());
    } catch (e: any) { toast.error(e.message || 'Failed'); }
    finally { if (showSpinner) setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [profile?.id]);
  useEffect(() => {
    intervalRef.current = setInterval(() => load(false), 30000);
    const t = setInterval(() => setTick((x) => x + 1), 1000);
    return () => { clearInterval(intervalRef.current); clearInterval(t); };
    // eslint-disable-next-line
  }, [farmer?.id]);

  const stats = {
    total: assignments.length,
    online: assignments.filter((a) => a.devices?.is_online).length,
    offline: assignments.filter((a) => !a.devices?.is_online).length,
  };

  const sortedSnapshots = (snaps: any[] | null) => (snaps || []).slice().sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime());

  const openReport = (device: any) => { setReportDevice(device); setReport({ title: '', description: '', severity: 'medium' }); setReportOpen(true); };
  const submitReport = async () => {
    if (!report.title.trim()) { toast.error('Title required'); return; }
    try {
      const { error } = await (supabase.from('device_issue_reports') as any).insert({ device_id: reportDevice.id, reported_by: profile!.id, title: report.title, description: report.description || null, severity: report.severity, status: 'open' });
      if (error) throw error;
      toast.success('Issue reported. Our team will review it shortly.');
      setReportOpen(false);
    } catch (e: any) { toast.error(e.message || 'Failed'); }
  };

  const secsAgo = Math.floor((Date.now() - lastUpdate) / 1000);

  return (
    <FarmerLayout>
      {loading ? (
        <div className="flex justify-center py-20"><div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : !farmer ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-500">Farmer account not set up</div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900">My Devices</h1>
              <p className="text-xs text-gray-500 mt-1">Last updated: {secsAgo}s ago {tick >= 0 ? '' : ''}</p>
            </div>
            <button onClick={() => load()} className="border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 px-4 py-2.5 text-sm">Refresh now</button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[{ l: 'Devices', v: stats.total }, { l: 'Online', v: stats.online }, { l: 'Offline', v: stats.offline }].map((s) => (
              <div key={s.l} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                <div className="text-xs font-bold text-gray-500 uppercase">{s.l}</div>
                <div className="text-2xl font-black text-gray-900 mt-1">{s.v}</div>
              </div>
            ))}
          </div>
          {assignments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-gray-400 text-sm font-medium">No devices assigned yet</div>
          ) : (
            <div className="space-y-4">
              {assignments.map((a) => {
                const dev = a.devices; if (!dev) return null;
                const snaps = sortedSnapshots(dev.device_telemetry_snapshots);
                const t = snaps[0];
                const tc = tempChip(t?.temperature ?? null);
                const hc = humChip(t?.humidity ?? null);
                const cc = co2Chip(t?.co2_level ?? null);
                return (
                  <div key={a.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`inline-block w-3 h-3 rounded-full ${dev.is_online ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                        <div className="min-w-0">
                          <div className="font-black text-lg text-gray-900 truncate">{dev.name}</div>
                          <div className="text-xs text-gray-500">{dev.serial_number}</div>
                          <div className="text-xs text-gray-400 mt-0.5">FW: {dev.firmware_version || '—'} · Last seen: {dev.last_seen ? timeAgo(dev.last_seen) : 'Never'}</div>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-lg border text-xs font-bold ${dev.is_online ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200'} self-start`}>{dev.is_online ? 'Online' : (dev.status || 'Offline')}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                      <div className={`rounded-xl p-4 ${tc.cls}`}><div className="text-xs font-bold">🌡️ Temperature</div><div className="text-2xl font-black mt-1">{t?.temperature ?? '—'}°C</div><div className="text-xs font-bold mt-1">{tc.label}</div></div>
                      <div className={`rounded-xl p-4 ${hc.cls}`}><div className="text-xs font-bold">💧 Humidity</div><div className="text-2xl font-black mt-1">{t?.humidity ?? '—'}%</div><div className="text-xs font-bold mt-1">{hc.label}</div></div>
                      <div className={`rounded-xl p-4 ${cc.cls}`}><div className="text-xs font-bold">🌫️ CO₂</div><div className="text-2xl font-black mt-1">{t?.co2_level ?? '—'} ppm</div><div className="text-xs font-bold mt-1">{cc.label}</div></div>
                    </div>
                    <button onClick={() => setExpanded((p) => ({ ...p, [dev.id]: !p[dev.id] }))} className="mt-3 text-xs font-bold text-indigo-600 hover:underline">{expanded[dev.id] ? 'Hide history' : 'Show history'}</button>
                    {expanded[dev.id] && (
                      <div className="mt-2 overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead className="text-gray-500 uppercase font-bold"><tr><th className="p-2 text-left">Time</th><th className="p-2 text-left">Temp</th><th className="p-2 text-left">Humidity</th><th className="p-2 text-left">CO₂</th></tr></thead>
                          <tbody>
                            {snaps.slice(0, 5).map((s, i) => (
                              <tr key={i} className="border-t border-gray-100"><td className="p-2">{timeAgo(s.recorded_at)}</td><td className="p-2">{s.temperature ?? '—'}</td><td className="p-2">{s.humidity ?? '—'}</td><td className="p-2">{s.co2_level ?? '—'}</td></tr>
                            ))}
                            {snaps.length === 0 && <tr><td colSpan={4} className="p-2 text-gray-400">No readings</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <div className="flex flex-col sm:flex-row gap-2 mt-4">
                      <button onClick={() => navigate(`/farmer/commands?device_id=${dev.id}`)} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black px-4 py-2.5 text-sm flex-1">Send Command</button>
                      <button onClick={() => openReport(dev)} className="border border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-bold px-4 py-2.5 text-sm flex-1">Report Issue</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {reportOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100"><h2 className="text-xl font-black text-gray-900">Report Issue</h2><p className="text-xs text-gray-500 mt-1">{reportDevice?.name}</p></div>
            <div className="p-6 space-y-4">
              <div><label className="text-xs font-bold text-gray-500 uppercase">Title *</label><input value={report.title} onChange={(e) => setReport({ ...report, title: e.target.value })} className="w-full mt-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              <div><label className="text-xs font-bold text-gray-500 uppercase">Description</label><textarea value={report.description} onChange={(e) => setReport({ ...report, description: e.target.value })} rows={3} className="w-full mt-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              <div><label className="text-xs font-bold text-gray-500 uppercase">Severity</label>
                <select value={report.severity} onChange={(e) => setReport({ ...report, severity: e.target.value })} className="w-full mt-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setReportOpen(false)} className="border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 px-4 py-2.5 text-sm">Cancel</button>
              <button onClick={submitReport} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black px-4 py-2.5 text-sm">Submit</button>
            </div>
          </div>
        </div>
      )}
    </FarmerLayout>
  );
}
