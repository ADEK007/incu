import { Fragment, useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '../../lib/supabaseClient';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'sonner';
import { Search, RefreshCw, ChevronDown, ChevronRight, Zap } from 'lucide-react';

const CMD_STATUS: Record<string, string> = {
  queued: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  sent: 'bg-blue-50 text-blue-600 border-blue-200',
  success: 'bg-green-50 text-green-600 border-green-200',
  failed: 'bg-red-50 text-red-600 border-red-200',
  expired: 'bg-gray-100 text-gray-500 border-gray-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
};
const STATUS_TABS = ['all', 'queued', 'sent', 'success', 'failed', 'expired', 'cancelled'];

export default function Commands() {
  const { profile } = useAuthStore();
  const tenantId = profile?.tenant_id ?? profile?.id ?? '';
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [dateRange, setDateRange] = useState<'today' | '7' | '30' | 'all'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [logs, setLogs] = useState<Record<string, any[]>>({});

  const load = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase.from('device_commands') as any)
        .select('*, devices(serial_number, name)')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      setRows(data || []);
    } catch (e: any) { toast.error(e?.message || 'Failed to load'); } finally { setLoading(false); }
  };

  useEffect(() => { load(); const id = setInterval(load, 30000); return () => clearInterval(id); /* eslint-disable-next-line */ }, [tenantId]);

  const filtered = useMemo(() => {
    const now = Date.now();
    const cutoff = dateRange === 'today' ? new Date().setHours(0, 0, 0, 0) : dateRange === '7' ? now - 7 * 86400000 : dateRange === '30' ? now - 30 * 86400000 : 0;
    return rows.filter((r) => {
      if (status !== 'all' && r.status !== status) return false;
      if (cutoff && new Date(r.created_at).getTime() < cutoff) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!(r.command_type || '').toLowerCase().includes(s) && !(r.devices?.serial_number || '').toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [rows, status, search, dateRange]);

  const stats = useMemo(() => ({
    queued: rows.filter((r) => r.status === 'queued').length,
    success: rows.filter((r) => r.status === 'success').length,
    failed: rows.filter((r) => r.status === 'failed').length,
    expired: rows.filter((r) => r.status === 'expired').length,
  }), [rows]);

  const cancel = async (id: string) => {
    try {
      const { error } = await (supabase.from('device_commands') as any).update({ status: 'cancelled' }).eq('id', id);
      if (error) throw error;
      toast.success('Cancelled'); load();
    } catch (e: any) { toast.error(e?.message || 'Failed'); }
  };
  const retry = async (r: any) => {
    try {
      const { error } = await (supabase.from('device_commands') as any).insert({
        device_id: r.device_id, tenant_id: r.tenant_id, issued_by: r.issued_by,
        command_type: r.command_type, payload: r.payload, status: 'queued',
        expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      });
      if (error) throw error;
      toast.success('Retried'); load();
    } catch (e: any) { toast.error(e?.message || 'Failed'); }
  };
  const expireStale = async () => {
    try {
      const { error } = await (supabase as any).rpc('expire_stale_commands');
      if (error) throw error;
      toast.success('Stale commands expired'); load();
    } catch (e: any) { toast.error(e?.message || 'Failed'); }
  };
  const toggleExpand = async (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!logs[id]) {
      const { data } = await (supabase.from('device_command_logs') as any).select('*').eq('command_id', id).order('logged_at', { ascending: false });
      setLogs((p) => ({ ...p, [id]: data || [] }));
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black text-gray-900">Commands</h1>
            <p className="text-gray-500 font-medium mt-1">Central control room for device commands across all your fleet</p>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 px-3 py-2 text-sm flex items-center gap-2"><RefreshCw size={14} /> Refresh</button>
            <button onClick={expireStale} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black px-4 py-2 text-sm flex items-center gap-2"><Zap size={14} /> Expire Stale</button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Queued', value: stats.queued, color: 'yellow' },
            { label: 'Success', value: stats.success, color: 'green' },
            { label: 'Failed', value: stats.failed, color: 'red' },
            { label: 'Expired', value: stats.expired, color: 'gray' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="text-xs font-black uppercase tracking-widest text-gray-400">{s.label}</div>
              <div className="text-3xl font-black text-gray-900 mt-2">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search command type or serial" className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <select value={dateRange} onChange={(e) => setDateRange(e.target.value as any)} className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm font-bold text-gray-600">
              <option value="today">Today</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="all">All time</option>
            </select>
          </div>
          <div className="flex gap-1 flex-wrap">
            {STATUS_TABS.map((t) => (
              <button key={t} onClick={() => setStatus(t)} className={`px-3 py-1.5 rounded-xl text-xs font-bold ${status === t ? 'bg-indigo-600 text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>{t}</button>
            ))}
          </div>

          {loading ? (
            <div className="py-16 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-gray-400 font-bold">No commands</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs font-black uppercase tracking-widest text-gray-400">
                  <tr>
                    <th className="text-left p-2"></th>
                    <th className="text-left p-2">Device</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-left p-2">Payload</th>
                    <th className="text-left p-2">Status</th>
                    <th className="text-left p-2">Created</th>
                    <th className="text-left p-2">Expires</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <Fragment key={r.id}>
                      <tr key={r.id} className="border-t border-gray-100 hover:bg-gray-50/50 cursor-pointer" onClick={() => toggleExpand(r.id)}>
                        <td className="p-2">{expanded === r.id ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
                        <td className="p-2 font-bold text-gray-900">
                          <div>{r.devices?.name || r.devices?.serial_number || '—'}</div>
                          <div className="text-xs text-gray-400 font-medium">{r.devices?.serial_number}</div>
                        </td>
                        <td className="p-2 font-bold text-gray-900">{r.command_type}</td>
                        <td className="p-2 text-xs text-gray-500 font-mono max-w-[200px] truncate">{JSON.stringify(r.payload).slice(0, 40)}</td>
                        <td className="p-2"><span className={`px-2 py-1 rounded-lg border text-xs font-bold ${CMD_STATUS[r.status]}`}>{r.status}</span></td>
                        <td className="p-2 text-gray-500 font-medium text-xs">{new Date(r.created_at).toLocaleString()}</td>
                        <td className="p-2 text-gray-500 font-medium text-xs">{r.expires_at ? new Date(r.expires_at).toLocaleString() : '—'}</td>
                        <td className="p-2" onClick={(e) => e.stopPropagation()}>
                          {r.status === 'queued' && <button onClick={() => cancel(r.id)} className="text-red-400 hover:bg-red-50 rounded-lg px-2 py-1 text-xs font-bold">Cancel</button>}
                          {(r.status === 'failed' || r.status === 'expired') && <button onClick={() => retry(r)} className="text-indigo-600 hover:bg-indigo-50 rounded-lg px-2 py-1 text-xs font-bold">Retry</button>}
                        </td>
                      </tr>
                      {expanded === r.id && (
                        <tr className="bg-gray-50/50">
                          <td colSpan={8} className="p-4 space-y-3">
                            <div>
                              <div className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Payload</div>
                              <pre className="bg-white p-3 rounded-xl border border-gray-100 text-xs overflow-x-auto">{JSON.stringify(r.payload, null, 2)}</pre>
                            </div>
                            <div>
                              <div className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">Logs</div>
                              {(logs[r.id] || []).length === 0 ? (
                                <div className="text-xs text-gray-400 font-bold">No logs</div>
                              ) : (
                                <div className="space-y-1">
                                  {logs[r.id].map((l: any) => (
                                    <div key={l.id} className="text-xs text-gray-600 font-medium flex gap-2">
                                      <span className="text-gray-400">{new Date(l.logged_at).toLocaleString()}</span>
                                      <span className="font-bold">{l.status}</span>
                                      <span>{l.message}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
