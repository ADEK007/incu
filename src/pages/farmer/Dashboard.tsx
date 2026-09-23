import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'sonner';
import { Cpu, LogOut, LayoutDashboard, Terminal, Send } from 'lucide-react';

function timeAgo(d?: string | null) {
  if (!d) return 'Never';
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h} hr ago`;
  const days = Math.floor(h / 24); return `${days} day${days > 1 ? 's' : ''} ago`;
}

export function FarmerLayout({ children, farmerName, onLogout }: any) {
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

export default function FarmerDashboard() {
  const { profile, signOut } = useAuthStore();
  const navigate = useNavigate();
  const [farmer, setFarmer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [commands, setCommands] = useState<any[]>([]);
  const [now, setNow] = useState(new Date());

  const logout = async () => { await signOut(); navigate('/login'); };

  useEffect(() => { const id = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(id); }, []);

  useEffect(() => {
    (async () => {
      if (!profile?.id) return;
      setLoading(true);
      try {
        const { data: f } = await (supabase.from('farmers') as any).select('*, dealers(name, phone)').eq('user_id', profile.id).maybeSingle();
        if (!f) { setFarmer(null); setLoading(false); return; }
        setFarmer(f);

        const [aRes, cRes] = await Promise.all([
          (supabase.from('device_assignments') as any).select('*, devices(*, device_telemetry_snapshots(temperature, humidity, co2_level, recorded_at))').eq('farmer_id', f.id).is('unassigned_at', null),
          (supabase.from('device_commands') as any).select('*, devices(name, serial_number)').eq('issued_by', profile.id).order('created_at', { ascending: false }).limit(5),
        ]);
        setAssignments(aRes.data || []);
        setCommands(cRes.data || []);
      } catch (e: any) { toast.error(e?.message || 'Failed'); } finally { setLoading(false); }
    })();
  }, [profile?.id]);

  if (loading) {
    return <FarmerLayout farmerName={profile?.full_name || ''} onLogout={logout}><div className="py-24 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div></FarmerLayout>;
  }
  if (!farmer) {
    return (
      <FarmerLayout farmerName={profile?.full_name || ''} onLogout={logout}>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <div className="text-2xl font-black text-gray-900 mb-2">Welcome!</div>
          <p className="text-gray-500 font-medium">Your farmer account is being set up. Contact your dealer or administrator.</p>
        </div>
      </FarmerLayout>
    );
  }

  return (
    <FarmerLayout farmerName={farmer.name} onLogout={logout}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Hello, {farmer.name}!</h1>
          <p className="text-gray-500 font-medium mt-1">{now.toLocaleString()}</p>
        </div>

        <div>
          <h2 className="font-black text-gray-900 mb-3">My Devices</h2>
          {assignments.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
              <Cpu size={32} className="mx-auto text-gray-300 mb-2" />
              <div className="text-gray-400 font-bold">No devices assigned yet. Contact your dealer.</div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {assignments.map((a) => {
                const d = a.devices; if (!d) return null;
                const snaps = (d.device_telemetry_snapshots || []).slice().sort((x: any, y: any) => +new Date(y.recorded_at) - +new Date(x.recorded_at));
                const latest = snaps[0];
                const tempColor = !latest?.temperature ? 'bg-gray-50 text-gray-500' : latest.temperature < 25 ? 'bg-blue-50 text-blue-600' : latest.temperature <= 35 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600';
                const humColor = !latest?.humidity ? 'bg-gray-50 text-gray-500' : (latest.humidity < 40 || latest.humidity > 80) ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600';
                const co2Color = !latest?.co2_level ? 'bg-gray-50 text-gray-500' : latest.co2_level < 1000 ? 'bg-green-50 text-green-600' : latest.co2_level <= 2000 ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-600';
                return (
                  <div key={a.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`inline-block h-2.5 w-2.5 rounded-full ${d.is_online ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                          <div className="font-black text-gray-900 truncate">{d.name || d.serial_number}</div>
                        </div>
                        <div className="text-xs text-gray-400 font-medium ml-4.5">{d.serial_number}</div>
                        <div className="text-xs text-gray-400 font-medium mt-1">Last seen {timeAgo(d.last_seen)}</div>
                      </div>
                      <button onClick={() => navigate(`/farmer/commands?device_id=${d.id}`)} className="text-indigo-600 hover:bg-indigo-50 rounded-lg p-2"><Send size={14} /></button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      <div className={`p-2 rounded-xl text-center ${tempColor}`}>
                        <div className="text-[10px] font-black uppercase tracking-widest opacity-70">Temp</div>
                        <div className="text-sm font-black">{latest?.temperature ?? '—'}°C</div>
                      </div>
                      <div className={`p-2 rounded-xl text-center ${humColor}`}>
                        <div className="text-[10px] font-black uppercase tracking-widest opacity-70">Humidity</div>
                        <div className="text-sm font-black">{latest?.humidity ?? '—'}%</div>
                      </div>
                      <div className={`p-2 rounded-xl text-center ${co2Color}`}>
                        <div className="text-[10px] font-black uppercase tracking-widest opacity-70">CO₂</div>
                        <div className="text-sm font-black">{latest?.co2_level ?? '—'}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <h2 className="font-black text-gray-900 mb-3">Recent Commands</h2>
          {commands.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-8 text-center text-gray-400 font-bold">No commands yet</div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100">
              {commands.map((c) => (
                <div key={c.id} className="p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-gray-900 text-sm truncate">{c.command_type}</div>
                    <div className="text-xs text-gray-400 font-medium truncate">{c.devices?.name || c.devices?.serial_number} · {timeAgo(c.created_at)}</div>
                  </div>
                  <span className="px-2 py-1 rounded-lg border text-xs font-bold bg-gray-50 text-gray-600 border-gray-200">{c.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </FarmerLayout>
  );
}
