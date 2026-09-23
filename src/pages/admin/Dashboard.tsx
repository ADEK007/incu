import { useEffect, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '../../lib/supabaseClient';
import { useAuthStore } from '../../store/authStore';
import { formatPrice } from '../../utils/currency';
import { Link } from 'react-router-dom';
import { TrendingUp, Users, ShoppingBag, DollarSign, Package, AlertTriangle, Cpu } from 'lucide-react';

function timeAgo(s: string): string {
  const diff = Date.now() - new Date(s).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hr ago`;
  return `${Math.floor(h / 24)} day ago`;
}

const STATUS_COLORS: Record<string, string> = {
  online: 'bg-green-500', active: 'bg-indigo-600', offline: 'bg-red-500',
  maintenance: 'bg-orange-500', inactive: 'bg-gray-400',
};

const Dashboard = () => {
  const { profile } = useAuthStore();
  const tenantId = profile?.tenant_id ?? profile?.id ?? '';
  const [stats, setStats] = useState({ totalSales: 0, totalOrders: 0, totalUsers: 0, totalProducts: 0 });
  const [monthPnL, setMonthPnL] = useState({ revenue: 0, expenses: 0 });
  const [devStatuses, setDevStatuses] = useState<Record<string, number>>({});
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tenantId) return;
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const monthStartDate = monthStart.slice(0, 10);
    (async () => {
      try {
        const [usersC, prodsC, invAll, invMonth, expMonth, devs, recent, low] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          (supabase.from('products') as any).select('*', { count: 'exact', head: true }).eq('tenant_id', tenantId),
          (supabase.from('invoices') as any).select('total_amount').eq('tenant_id', tenantId).eq('status', 'completed'),
          (supabase.from('invoices') as any).select('total_amount').eq('tenant_id', tenantId).eq('status', 'completed').gte('created_at', monthStart),
          (supabase.from('expenses') as any).select('amount').eq('tenant_id', tenantId).is('deleted_at', null).gte('expense_date', monthStartDate),
          (supabase.from('devices') as any).select('status').eq('tenant_id', tenantId),
          (supabase.from('invoices') as any).select('id,invoice_number,total_amount,created_at,customers(name)').eq('tenant_id', tenantId).eq('status','completed').order('created_at', { ascending: false }).limit(5),
          (supabase.from('products') as any).select('id,name,stock').eq('tenant_id', tenantId).lt('stock', 5),
        ]);

        const sales = (invAll.data || []).reduce((s: number, i: any) => s + Number(i.total_amount), 0);
        const revMonth = (invMonth.data || []).reduce((s: number, i: any) => s + Number(i.total_amount), 0);
        const expM = (expMonth.data || []).reduce((s: number, e: any) => s + Number(e.amount), 0);

        const sMap: Record<string, number> = {};
        (devs.data || []).forEach((d: any) => { sMap[d.status] = (sMap[d.status] || 0) + 1; });

        setStats({ totalSales: sales, totalOrders: (invAll.data || []).length, totalUsers: usersC.count || 0, totalProducts: prodsC.count || 0 });
        setMonthPnL({ revenue: revMonth, expenses: expM });
        setDevStatuses(sMap);
        setRecentInvoices(recent.data || []);
        setLowStock(low.data || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [tenantId]);

  const net = monthPnL.revenue - monthPnL.expenses;
  const totalDev = Object.values(devStatuses).reduce((a, b) => a + b, 0);

  const statCards = [
    { label: 'Total Revenue', value: formatPrice(stats.totalSales, profile?.country), icon: <DollarSign size={24} />, color: 'bg-green-500' },
    { label: 'Total Invoices', value: stats.totalOrders, icon: <ShoppingBag size={24} />, color: 'bg-indigo-600' },
    { label: 'Total Users', value: stats.totalUsers, icon: <Users size={24} />, color: 'bg-purple-600' },
    { label: 'Total Products', value: stats.totalProducts, icon: <Package size={24} />, color: 'bg-orange-500' },
  ];

  if (loading) return <AdminLayout><div className="flex justify-center py-24"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div></AdminLayout>;

  return (
    <AdminLayout>
      <div className="space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-500 font-medium">Welcome back! Here's what's happening today.</p>
          </div>
          <div className="inline-flex items-center px-4 py-2 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-sm uppercase tracking-widest border border-indigo-100">
            <TrendingUp size={16} className="mr-2" />Live
          </div>
        </div>

        {/* Stat grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((s, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex items-center gap-4">
              <div className={`p-3 rounded-2xl text-white ${s.color}`}>{s.icon}</div>
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{s.label}</p>
                <p className="text-2xl font-black text-gray-900">{s.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* P&L */}
        <div>
          <h2 className="text-2xl font-black text-gray-900 mb-4">This Month</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Revenue</p>
              <p className="text-2xl font-black mt-2 text-green-600">{formatPrice(monthPnL.revenue, 'Bangladesh')}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Expenses</p>
              <p className="text-2xl font-black mt-2 text-red-600">{formatPrice(monthPnL.expenses, 'Bangladesh')}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Net Profit</p>
              <p className={`text-2xl font-black mt-2 ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatPrice(net, 'Bangladesh')}</p>
            </div>
          </div>
        </div>

        {/* Device fleet */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Cpu size={20} className="text-indigo-600" />
            <h2 className="text-lg font-black text-gray-900">Device Fleet Health</h2>
          </div>
          {totalDev === 0 ? <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">No devices yet</p> : (
            <>
              <div className="w-full h-6 rounded-xl overflow-hidden flex bg-gray-100">
                {Object.entries(devStatuses).map(([s, c]) => (
                  <div key={s} className={STATUS_COLORS[s] || 'bg-gray-400'} style={{ width: `${(c / totalDev) * 100}%` }} title={`${s}: ${c}`} />
                ))}
              </div>
              <div className="flex flex-wrap gap-4 mt-4">
                {Object.entries(devStatuses).map(([s, c]) => (
                  <div key={s} className="flex items-center gap-2 text-sm">
                    <span className={`w-3 h-3 rounded ${STATUS_COLORS[s] || 'bg-gray-400'}`} />
                    <span className="font-bold text-gray-700 uppercase text-xs">{s}</span>
                    <span className="font-black">{c}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent invoices */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-black text-gray-900">Recent Invoices</h2>
              <Link to="/admin/invoices" className="text-sm font-bold text-indigo-600">View all →</Link>
            </div>
            {recentInvoices.length === 0 ? <p className="text-sm text-gray-400 font-bold uppercase tracking-widest">No invoices yet</p> : (
              <div className="space-y-3">
                {recentInvoices.map(i => (
                  <div key={i.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                    <div>
                      <p className="font-black text-gray-900">{i.invoice_number}</p>
                      <p className="text-xs text-gray-500 font-medium">{i.customers?.name ?? 'Walk-in'} • {timeAgo(i.created_at)}</p>
                    </div>
                    <p className="font-black text-indigo-600 font-mono">{formatPrice(Number(i.total_amount), 'Bangladesh')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Low stock */}
          {lowStock.length > 0 && (
            <div className="bg-orange-50 rounded-2xl border border-orange-200 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={20} className="text-orange-600" />
                <h2 className="text-lg font-black text-orange-700">Low Stock Alert</h2>
              </div>
              <div className="space-y-2">
                {lowStock.map(p => (
                  <div key={p.id} className="flex justify-between text-sm">
                    <span className="font-bold text-gray-800">{p.name}</span>
                    <span className="font-mono font-black text-orange-700">{p.stock} left</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
