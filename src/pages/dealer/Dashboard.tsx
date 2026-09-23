import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'sonner';
import { formatPrice } from '../../utils/currency';
import { Leaf, Cpu, DollarSign, RotateCcw, LogOut, UserPlus, Package } from 'lucide-react';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

function DealerLayout({ children, dealerName, onLogout }: any) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <Link to="/dealer" className="flex items-center gap-2">
            <img src="/logo.png" alt="Logo" className="h-7 w-auto" />
            <span className="font-black text-gray-900">IncuTech</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-black text-gray-900">{dealerName}</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">Dealer Portal</span>
            </div>
            <button onClick={onLogout} className="text-red-400 hover:bg-red-50 rounded-lg p-2"><LogOut size={16} /></button>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">{children}</main>
    </div>
  );
}

export default function DealerDashboard() {
  const { profile, signOut } = useAuthStore();
  const tenantId = profile?.tenant_id ?? profile?.id ?? '';
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dealer, setDealer] = useState<any>(null);
  const [stats, setStats] = useState({ farmers: 0, devices: 0, sales: 0, returns: 0 });
  const [farmers, setFarmers] = useState<any[]>([]);
  const [activity, setActivity] = useState<any[]>([]);

  const logout = async () => { await signOut(); nav('/login'); };

  useEffect(() => {
    (async () => {
      if (!profile?.id) return;
      setLoading(true);
      try {
        const { data: d } = await (supabase.from('dealers') as any).select('*').eq('user_id', profile.id).eq('tenant_id', tenantId).maybeSingle();
        if (!d) { setDealer(null); setLoading(false); return; }
        setDealer(d);

        const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
        const [farmersRes, devicesRes, salesRes, returnsRes, farmersListRes, assignsRes] = await Promise.all([
          (supabase.from('farmers') as any).select('id', { count: 'exact', head: true }).eq('dealer_id', d.id),
          (supabase.from('device_assignments') as any).select('id', { count: 'exact', head: true }).eq('dealer_id', d.id).is('unassigned_at', null),
          (supabase.from('invoices') as any).select('total_amount').eq('created_by', profile.id).eq('status', 'completed').gte('created_at', monthStart.toISOString()),
          (supabase.from('sales_returns') as any).select('id', { count: 'exact', head: true }).eq('created_by', profile.id).gte('created_at', monthStart.toISOString()),
          (supabase.from('farmers') as any).select('*').eq('dealer_id', d.id).is('deleted_at', null).order('created_at', { ascending: false }).limit(10),
          (supabase.from('device_assignments') as any).select('*, devices(name, serial_number), farmers(name)').eq('dealer_id', d.id).order('assigned_at', { ascending: false }).limit(5),
        ]);
        const sales = (salesRes.data || []).reduce((s: number, r: any) => s + Number(r.total_amount || 0), 0);
        setStats({ farmers: farmersRes.count || 0, devices: devicesRes.count || 0, sales, returns: returnsRes.count || 0 });

        const farmersList = farmersListRes.data || [];
        // count devices per farmer
        const fIds = farmersList.map((f: any) => f.id);
        let counts: Record<string, number> = {};
        if (fIds.length) {
          const { data: ca } = await (supabase.from('device_assignments') as any).select('farmer_id').in('farmer_id', fIds).is('unassigned_at', null);
          (ca || []).forEach((r: any) => { counts[r.farmer_id] = (counts[r.farmer_id] || 0) + 1; });
        }
        setFarmers(farmersList.map((f: any) => ({ ...f, device_count: counts[f.id] || 0 })));

        const acts: any[] = [];
        farmersList.slice(0, 5).forEach((f: any) => acts.push({ id: 'f' + f.id, type: 'farmer', label: `Farmer ${f.name} added`, date: f.created_at }));
        (assignsRes.data || []).forEach((a: any) => acts.push({ id: 'a' + a.id, type: 'device', label: `${a.devices?.name || a.devices?.serial_number || 'Device'} → ${a.farmers?.name || 'farmer'}`, date: a.assigned_at }));
        acts.sort((x, y) => +new Date(y.date) - +new Date(x.date));
        setActivity(acts.slice(0, 5));
      } catch (e: any) { toast.error(e?.message || 'Failed'); } finally { setLoading(false); }
    })();
  }, [profile?.id, tenantId]);

  if (loading) {
    return <DealerLayout dealerName={profile?.full_name || ''} onLogout={logout}><div className="py-24 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div></DealerLayout>;
  }
  if (!dealer) {
    return (
      <DealerLayout dealerName={profile?.full_name || ''} onLogout={logout}>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <div className="text-2xl font-black text-gray-900 mb-2">Welcome!</div>
          <p className="text-gray-500 font-medium">Your dealer account is being set up. Please contact your administrator.</p>
        </div>
      </DealerLayout>
    );
  }

  return (
    <DealerLayout dealerName={dealer.name} onLogout={logout}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900">{greeting()}, {dealer.name}!</h1>
          <p className="text-gray-500 font-medium mt-1">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="My Farmers" value={stats.farmers} icon={<Leaf size={18} />} color="green" />
          <StatCard label="My Devices" value={stats.devices} icon={<Cpu size={18} />} color="indigo" />
          <StatCard label="This Month" value={formatPrice(stats.sales)} icon={<DollarSign size={18} />} color="emerald" />
          <StatCard label="Pending Returns" value={stats.returns} icon={<RotateCcw size={18} />} color="orange" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-black text-gray-900">My Farmers</h2>
              <Link to="/dealer/farmers" className="text-xs font-bold text-indigo-600 hover:underline">View all</Link>
            </div>
            {farmers.length === 0 ? (
              <div className="py-12 text-center text-gray-400 font-bold">No farmers yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs font-black uppercase tracking-widest text-gray-400">
                    <tr><th className="text-left p-2">Name</th><th className="text-left p-2">Phone</th><th className="text-left p-2">Devices</th><th className="text-left p-2">Status</th></tr>
                  </thead>
                  <tbody>
                    {farmers.map((f) => (
                      <tr key={f.id} className="border-t border-gray-100">
                        <td className="p-2 font-bold text-gray-900">{f.name}</td>
                        <td className="p-2 text-gray-500 font-medium">{f.phone || '—'}</td>
                        <td className="p-2 font-bold text-gray-900">{f.device_count}</td>
                        <td className="p-2"><span className={`px-2 py-1 rounded-lg border text-xs font-bold ${f.is_active ? 'bg-green-50 text-green-600 border-green-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>{f.is_active ? 'active' : 'inactive'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <h2 className="font-black text-gray-900 mb-3">Recent Activity</h2>
            {activity.length === 0 ? (
              <div className="py-8 text-center text-gray-400 font-bold text-sm">No activity yet</div>
            ) : (
              <ul className="space-y-3">
                {activity.map((a) => (
                  <li key={a.id} className="flex items-start gap-3">
                    <span className={`p-2 rounded-lg ${a.type === 'farmer' ? 'bg-green-50 text-green-600' : 'bg-indigo-50 text-indigo-600'}`}>
                      {a.type === 'farmer' ? <Leaf size={14} /> : <Cpu size={14} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-gray-900 truncate">{a.label}</div>
                      <div className="text-xs text-gray-400 font-medium">{new Date(a.date).toLocaleDateString()}</div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button onClick={() => nav('/dealer/farmers')} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-indigo-300 transition-all text-left flex items-center gap-3">
            <span className="p-3 rounded-xl bg-green-50 text-green-600"><UserPlus size={20} /></span>
            <div><div className="font-black text-gray-900">Add Farmer</div><div className="text-xs text-gray-400 font-medium">Register a new farmer</div></div>
          </button>
          <button onClick={() => nav('/dealer/devices')} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-indigo-300 transition-all text-left flex items-center gap-3">
            <span className="p-3 rounded-xl bg-indigo-50 text-indigo-600"><Cpu size={20} /></span>
            <div><div className="font-black text-gray-900">View My Devices</div><div className="text-xs text-gray-400 font-medium">See assigned devices</div></div>
          </button>
          <button onClick={() => nav('/dealer/stock')} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-indigo-300 transition-all text-left flex items-center gap-3">
            <span className="p-3 rounded-xl bg-orange-50 text-orange-600"><Package size={20} /></span>
            <div><div className="font-black text-gray-900">View Stock</div><div className="text-xs text-gray-400 font-medium">Inventory levels</div></div>
          </button>
        </div>
      </div>
    </DealerLayout>
  );
}

function StatCard({ label, value, icon, color }: any) {
  const map: Record<string, string> = {
    indigo: 'bg-indigo-50 text-indigo-600', green: 'bg-green-50 text-green-600',
    emerald: 'bg-emerald-50 text-emerald-600', orange: 'bg-orange-50 text-orange-600',
  };
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-widest text-gray-400">{label}</span>
        <span className={`p-2 rounded-lg ${map[color]}`}>{icon}</span>
      </div>
      <div className="text-2xl font-black text-gray-900 mt-2">{value}</div>
    </div>
  );
}
