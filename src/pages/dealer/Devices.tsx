import { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabaseClient';
import { useAuthStore } from '../../store/authStore';

const navLinks = [
  { to: '/dealer', label: 'Dashboard', end: true },
  { to: '/dealer/farmers', label: 'My Farmers' },
  { to: '/dealer/devices', label: 'My Devices' },
  { to: '/dealer/stock', label: 'My Stock' },
  { to: '/dealer/returns', label: 'Returns' },
];

function DealerLayout({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuthStore();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="font-black text-xl text-indigo-600">ICU</div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm font-bold text-gray-700">{profile?.full_name ?? 'Dealer'}</span>
            <span className="px-2 py-1 rounded-lg border text-xs font-bold bg-indigo-50 text-indigo-700 border-indigo-200">Dealer Portal</span>
            <button onClick={async () => { await signOut(); navigate('/login'); }} className="border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 px-3 py-1.5 text-sm">Logout</button>
          </div>
        </div>
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-4 overflow-x-auto">
          {navLinks.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `py-3 text-sm font-bold whitespace-nowrap border-b-2 ${isActive ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>{l.label}</NavLink>
          ))}
        </nav>
      </header>
      <main className="max-w-7xl mx-auto p-4 sm:p-6">{children}</main>
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

const statusClass = (s: string, online: boolean) => {
  if (online) return 'bg-green-50 text-green-700 border-green-200';
  if (s === 'maintenance') return 'bg-orange-50 text-orange-700 border-orange-200';
  if (s === 'active') return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  if (s === 'offline') return 'bg-red-50 text-red-700 border-red-200';
  return 'bg-gray-50 text-gray-600 border-gray-200';
};

export default function DealerDevices() {
  const { profile } = useAuthStore();
  const tenantId = profile?.tenant_id ?? profile?.id ?? '';
  const [params] = useSearchParams();
  const filterFarmer = params.get('farmer_id') || '';

  const [loading, setLoading] = useState(true);
  const [dealer, setDealer] = useState<any>(null);
  const [farmers, setFarmers] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [issueCounts, setIssueCounts] = useState<Record<string, number>>({});
  const [selectedFarmer, setSelectedFarmer] = useState<string>(filterFarmer);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportDevice, setReportDevice] = useState<any>(null);
  const [report, setReport] = useState({ title: '', description: '', severity: 'medium' });

  const load = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const { data: d } = await (supabase.from('dealers') as any).select('*').eq('user_id', profile.id).eq('tenant_id', tenantId).maybeSingle();
      setDealer(d);
      if (!d) { setLoading(false); return; }
      const { data: fs } = await (supabase.from('farmers') as any).select('id, name').eq('dealer_id', d.id);
      setFarmers(fs || []);
      const farmerIds = (fs || []).map((f: any) => f.id);
      if (!farmerIds.length) { setAssignments([]); setLoading(false); return; }
      const { data: as, error } = await (supabase.from('device_assignments') as any)
        .select('*, devices(*, device_telemetry_snapshots(temperature, humidity, co2_level, recorded_at)), farmers(name)')
        .in('farmer_id', farmerIds).is('unassigned_at', null);
      if (error) throw error;
      setAssignments(as || []);
      const deviceIds = (as || []).map((a: any) => a.device_id);
      if (deviceIds.length) {
        const { data: issues } = await (supabase.from('device_issue_reports') as any).select('device_id').in('device_id', deviceIds).neq('status', 'resolved');
        const counts: Record<string, number> = {};
        (issues || []).forEach((i: any) => { counts[i.device_id] = (counts[i.device_id] || 0) + 1; });
        setIssueCounts(counts);
      }
    } catch (e: any) { toast.error(e.message || 'Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [profile?.id]);

  const filtered = useMemo(() => selectedFarmer ? assignments.filter((a) => a.farmer_id === selectedFarmer) : assignments, [assignments, selectedFarmer]);

  const stats = {
    total: assignments.length,
    online: assignments.filter((a) => a.devices?.is_online).length,
    offline: assignments.filter((a) => !a.devices?.is_online).length,
    issues: Object.values(issueCounts).filter((v) => v > 0).length,
  };

  const openReport = (device: any) => { setReportDevice(device); setReport({ title: '', description: '', severity: 'medium' }); setReportOpen(true); };
  const submitReport = async () => {
    if (!report.title.trim()) { toast.error('Title required'); return; }
    try {
      const { error } = await (supabase.from('device_issue_reports') as any).insert({ device_id: reportDevice.id, reported_by: profile!.id, title: report.title, description: report.description || null, severity: report.severity, status: 'open' });
      if (error) throw error;
      toast.success('Issue reported to administrator');
      setReportOpen(false); load();
    } catch (e: any) { toast.error(e.message || 'Failed'); }
  };

  const latestTelem = (snapshots: any[] | null) => {
    if (!snapshots?.length) return null;
    return [...snapshots].sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())[0];
  };

  return (
    <DealerLayout>
      {loading ? (
        <div className="flex justify-center py-20"><div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : !dealer ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-500">Dealer account not found.</div>
      ) : (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900">My Devices</h1>
            <p className="text-sm text-gray-500 mt-1">Devices assigned to your farmers</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[{ l: 'Total', v: stats.total }, { l: 'Online', v: stats.online }, { l: 'Offline', v: stats.offline }, { l: 'With Issues', v: stats.issues }].map((s) => (
              <div key={s.l} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="text-xs font-bold text-gray-500 uppercase">{s.l}</div>
                <div className="text-3xl font-black text-gray-900 mt-1">{s.v}</div>
              </div>
            ))}
          </div>
          <select value={selectedFarmer} onChange={(e) => setSelectedFarmer(e.target.value)} className="w-full sm:w-64 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="">All Farmers</option>
            {farmers.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-gray-400 text-sm font-medium">No devices found</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filtered.map((a) => {
                const dev = a.devices; if (!dev) return null;
                const t = latestTelem(dev.device_telemetry_snapshots);
                return (
                  <div key={a.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`inline-block w-3 h-3 rounded-full ${dev.is_online ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                        <div className="min-w-0">
                          <div className="font-black text-gray-900 truncate">{dev.name}</div>
                          <div className="text-xs text-gray-500 truncate">{dev.serial_number}</div>
                          <div className="text-xs text-indigo-600 font-bold mt-0.5">Farmer: {a.farmers?.name || '—'}</div>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-lg border text-xs font-bold ${statusClass(dev.status, dev.is_online)}`}>{dev.is_online ? 'Online' : (dev.status || 'Offline')}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">Last seen: {dev.last_seen ? timeAgo(dev.last_seen) : 'Never'}</div>
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      {t ? (
                        <>
                          <div className="bg-gray-50 rounded-xl p-2 text-center"><div className="text-xs">🌡️</div><div className="text-sm font-black text-gray-900">{t.temperature ?? '—'}°C</div></div>
                          <div className="bg-gray-50 rounded-xl p-2 text-center"><div className="text-xs">💧</div><div className="text-sm font-black text-gray-900">{t.humidity ?? '—'}%</div></div>
                          <div className="bg-gray-50 rounded-xl p-2 text-center"><div className="text-xs">🌫️</div><div className="text-sm font-black text-gray-900">{t.co2_level ?? '—'}</div></div>
                        </>
                      ) : <div className="col-span-3 text-center text-xs font-bold text-gray-400 py-2">No telemetry data</div>}
                    </div>
                    {issueCounts[dev.id] > 0 && <div className="mt-3 text-xs font-bold text-red-600">⚠ {issueCounts[dev.id]} open issue(s)</div>}
                    <button onClick={() => openReport(dev)} className="mt-3 w-full border border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-bold px-4 py-2 text-sm">Report Issue</button>
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
    </DealerLayout>
  );
}
