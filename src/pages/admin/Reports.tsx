import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '../../lib/supabaseClient';
import { useAuthStore } from '../../store/authStore';
import { formatPrice } from '../../utils/currency';
import { toast } from 'sonner';
import {
  BarChart2, TrendingUp, FileText, Package, Receipt, Users,
  Truck, Leaf, Cpu, RotateCcw, CreditCard, DollarSign, Star, Download, ArrowUp, ArrowDown,
} from 'lucide-react';

type ReportKey =
  | 'sales' | 'pnl' | 'invoice' | 'stock' | 'expense' | 'customer'
  | 'dealer' | 'farmer' | 'device' | 'return_wastage' | 'payment_methods' | 'commission';

const REPORTS: { key: ReportKey; label: string; Icon: any }[] = [
  { key: 'sales', label: 'Sales Summary', Icon: BarChart2 },
  { key: 'pnl', label: 'P&L', Icon: TrendingUp },
  { key: 'invoice', label: 'Invoice Report', Icon: FileText },
  { key: 'stock', label: 'Stock Report', Icon: Package },
  { key: 'expense', label: 'Expense Report', Icon: Receipt },
  { key: 'customer', label: 'Customer Report', Icon: Users },
  { key: 'dealer', label: 'Dealer Report', Icon: Truck },
  { key: 'farmer', label: 'Farmer Report', Icon: Leaf },
  { key: 'device', label: 'Device Report', Icon: Cpu },
  { key: 'return_wastage', label: 'Return & Wastage', Icon: RotateCcw },
  { key: 'payment_methods', label: 'Payment Methods', Icon: CreditCard },
  { key: 'commission', label: 'Commission Report', Icon: DollarSign },
];

const PIE_COLORS = ['#6366f1','#22c55e','#f59e0b','#ef4444','#0ea5e9','#a855f7','#14b8a6','#f97316','#84cc16','#ec4899'];

function downloadCSV(data: any[], filename: string) {
  if (!data.length) { toast.error('Nothing to export'); return; }
  const keys = Object.keys(data[0]);
  const csv = [keys.join(','), ...data.map(row => keys.map(k => JSON.stringify(row[k] ?? '')).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function firstDayOfMonth(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function today(): string { return new Date().toISOString().slice(0, 10); }

const Badge = ({ children, className = '' }: any) => (
  <span className={`px-2 py-1 rounded-lg border text-xs font-bold ${className}`}>{children}</span>
);

const Spinner = () => (
  <div className="flex justify-center py-12">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
  </div>
);

const Empty = ({ msg }: { msg: string }) => (
  <div className="text-center py-12 text-gray-400 font-bold uppercase tracking-widest text-xs">{msg}</div>
);

const StatCard = ({ label, value, color = 'text-gray-900' }: any) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{label}</p>
    <p className={`text-2xl font-black mt-2 ${color}`}>{value}</p>
  </div>
);

export default function Reports() {
  const { profile } = useAuthStore();
  const tenantId = profile?.tenant_id ?? profile?.id ?? '';
  const [active, setActive] = useState<ReportKey>('sales');
  const [dateFrom, setDateFrom] = useState(firstDayOfMonth());
  const [dateTo, setDateTo] = useState(today());
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);

  const fromISO = useMemo(() => new Date(dateFrom + 'T00:00:00').toISOString(), [dateFrom]);
  const toISO = useMemo(() => new Date(dateTo + 'T23:59:59').toISOString(), [dateTo]);

  const fetchReport = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      if (active === 'sales') {
        const { data: inv } = await (supabase.from('invoices') as any)
          .select('id,total_amount,created_at,status')
          .eq('tenant_id', tenantId).eq('status', 'completed')
          .gte('created_at', fromISO).lte('created_at', toISO);
        setData({ invoices: inv || [] });
      } else if (active === 'pnl') {
        const [invRes, expRes, wasRes, prodRes, secRes] = await Promise.all([
          (supabase.from('invoices') as any).select('id,total_amount,created_at').eq('tenant_id', tenantId).eq('status','completed').gte('created_at', fromISO).lte('created_at', toISO),
          (supabase.from('expenses') as any).select('amount,sector_id,expense_date').eq('tenant_id', tenantId).is('deleted_at', null).gte('expense_date', dateFrom).lte('expense_date', dateTo),
          (supabase.from('wastage_records') as any).select('quantity,unit_cost,wastage_date').eq('tenant_id', tenantId).gte('wastage_date', dateFrom).lte('wastage_date', dateTo),
          (supabase.from('products') as any).select('id,cost_price').eq('tenant_id', tenantId),
          (supabase.from('expense_sectors') as any).select('id,name').eq('tenant_id', tenantId),
        ]);
        const invIds = (invRes.data || []).map((i: any) => i.id);
        let items: any[] = [];
        if (invIds.length) {
          const { data: itm } = await (supabase.from('invoice_items') as any)
            .select('invoice_id,product_id,quantity').in('invoice_id', invIds);
          items = itm || [];
        }
        setData({ inv: invRes.data || [], exp: expRes.data || [], was: wasRes.data || [], prods: prodRes.data || [], secs: secRes.data || [], items });
      } else if (active === 'invoice') {
        const { data: inv } = await (supabase.from('invoices') as any)
          .select('*,customers(name)').eq('tenant_id', tenantId)
          .gte('created_at', fromISO).lte('created_at', toISO).order('created_at', { ascending: false });
        setData({ invoices: inv || [] });
      } else if (active === 'stock') {
        const [prodRes, movRes] = await Promise.all([
          (supabase.from('products') as any).select('id,name,category,stock,price,cost_price').eq('tenant_id', tenantId),
          (supabase.from('stock_movements') as any).select('product_id,movement_type,quantity,created_at').eq('tenant_id', tenantId).gte('created_at', fromISO).lte('created_at', toISO),
        ]);
        setData({ prods: prodRes.data || [], movs: movRes.data || [] });
      } else if (active === 'expense') {
        const { data: exp } = await (supabase.from('expenses') as any)
          .select('*,expense_sectors(name)').eq('tenant_id', tenantId).is('deleted_at', null)
          .gte('expense_date', dateFrom).lte('expense_date', dateTo).order('expense_date', { ascending: false });
        setData({ expenses: exp || [] });
      } else if (active === 'customer') {
        const [custRes, invRes] = await Promise.all([
          (supabase.from('customers') as any).select('id,name,phone').eq('tenant_id', tenantId).is('deleted_at', null),
          (supabase.from('invoices') as any).select('customer_id,total_amount').eq('tenant_id', tenantId).eq('status','completed').gte('created_at', fromISO).lte('created_at', toISO),
        ]);
        setData({ customers: custRes.data || [], invoices: invRes.data || [] });
      } else if (active === 'dealer') {
        const [dRes, fRes, iRes] = await Promise.all([
          (supabase.from('dealers') as any).select('*').eq('tenant_id', tenantId).is('deleted_at', null),
          (supabase.from('farmers') as any).select('dealer_id').eq('tenant_id', tenantId),
          (supabase.from('invoices') as any).select('created_by,total_amount').eq('tenant_id', tenantId).eq('status','completed').gte('created_at', fromISO).lte('created_at', toISO),
        ]);
        setData({ dealers: dRes.data || [], farmers: fRes.data || [], invoices: iRes.data || [] });
      } else if (active === 'farmer') {
        const [fRes, dRes, aRes] = await Promise.all([
          (supabase.from('farmers') as any).select('*,dealers(name)').eq('tenant_id', tenantId),
          (supabase.from('dealers') as any).select('id,name').eq('tenant_id', tenantId),
          (supabase.from('device_assignments') as any).select('farmer_id').eq('tenant_id', tenantId),
        ]);
        setData({ farmers: fRes.data || [], dealers: dRes.data || [], assignments: aRes.data || [] });
      } else if (active === 'device') {
        const [dRes, aRes, fRes] = await Promise.all([
          (supabase.from('devices') as any).select('*').eq('tenant_id', tenantId),
          (supabase.from('device_assignments') as any).select('device_id,farmer_id,created_at').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
          (supabase.from('farmers') as any).select('id,name').eq('tenant_id', tenantId),
        ]);
        setData({ devices: dRes.data || [], assignments: aRes.data || [], farmers: fRes.data || [] });
      } else if (active === 'return_wastage') {
        const [rRes, wRes] = await Promise.all([
          (supabase.from('sales_returns') as any).select('*').eq('tenant_id', tenantId).is('deleted_at', null).gte('created_at', fromISO).lte('created_at', toISO),
          (supabase.from('wastage_records') as any).select('*,products(name)').eq('tenant_id', tenantId).gte('wastage_date', dateFrom).lte('wastage_date', dateTo),
        ]);
        setData({ returns: rRes.data || [], wastage: wRes.data || [] });
      } else if (active === 'payment_methods') {
        const { data: pays } = await (supabase.from('invoice_payments') as any)
          .select('method,amount,paid_at').eq('tenant_id', tenantId)
          .gte('paid_at', fromISO).lte('paid_at', toISO);
        setData({ payments: pays || [] });
      } else if (active === 'commission') {
        const [dRes, iRes] = await Promise.all([
          (supabase.from('dealers') as any).select('*').eq('tenant_id', tenantId).is('deleted_at', null),
          (supabase.from('invoices') as any).select('created_by,total_amount').eq('tenant_id', tenantId).eq('status','completed').gte('created_at', fromISO).lte('created_at', toISO),
        ]);
        setData({ dealers: dRes.data || [], invoices: iRes.data || [] });
      }
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); /* eslint-disable-next-line */ }, [active, tenantId]);

  const exportCurrent = () => {
    if (!data) return;
    if (active === 'sales') {
      const grouped: Record<string, { date: string; invoices: number; revenue: number }> = {};
      (data.invoices || []).forEach((i: any) => {
        const d = i.created_at.slice(0, 10);
        grouped[d] = grouped[d] || { date: d, invoices: 0, revenue: 0 };
        grouped[d].invoices += 1; grouped[d].revenue += Number(i.total_amount);
      });
      downloadCSV(Object.values(grouped), `sales-${dateFrom}-${dateTo}.csv`);
    } else if (active === 'invoice') {
      downloadCSV((data.invoices || []).map((i: any) => ({
        invoice_number: i.invoice_number, customer: i.customers?.name ?? '',
        date: i.created_at?.slice(0,10), total: i.total_amount, status: i.status,
      })), `invoices-${dateFrom}-${dateTo}.csv`);
    } else if (active === 'stock') {
      downloadCSV((data.prods || []).map((p: any) => ({ name: p.name, stock: p.stock, value: Number(p.stock)*Number(p.cost_price) })), `stock.csv`);
    } else if (active === 'expense') {
      downloadCSV((data.expenses || []).map((e: any) => ({ date: e.expense_date, title: e.title, sector: e.expense_sectors?.name ?? '', amount: e.amount })), `expenses-${dateFrom}-${dateTo}.csv`);
    } else if (active === 'customer') {
      const map = new Map<string, { orders: number; spend: number }>();
      (data.invoices || []).forEach((i: any) => {
        if (!i.customer_id) return;
        const cur = map.get(i.customer_id) || { orders: 0, spend: 0 };
        cur.orders += 1; cur.spend += Number(i.total_amount); map.set(i.customer_id, cur);
      });
      downloadCSV((data.customers || []).map((c: any) => {
        const s = map.get(c.id) || { orders: 0, spend: 0 };
        return { name: c.name, phone: c.phone, orders: s.orders, spend: s.spend };
      }), `customers-${dateFrom}-${dateTo}.csv`);
    } else if (active === 'dealer' || active === 'commission') {
      downloadCSV((data.dealers || []).map((d: any) => ({ name: d.name, rate: d.commission_rate, type: d.commission_type })), `dealers-${dateFrom}-${dateTo}.csv`);
    } else if (active === 'farmer') {
      downloadCSV((data.farmers || []).map((f: any) => ({ name: f.name, dealer: f.dealers?.name ?? '', phone: f.phone })), `farmers.csv`);
    } else if (active === 'device') {
      downloadCSV((data.devices || []).map((d: any) => ({ serial: d.serial_number, status: d.status, is_online: d.is_online })), `devices.csv`);
    } else if (active === 'return_wastage') {
      downloadCSV([...(data.returns || []).map((r: any) => ({ type: 'return', ref: r.return_number, amount: r.total_amount, date: r.created_at?.slice(0,10) })),
                   ...(data.wastage || []).map((w: any) => ({ type: 'wastage', ref: w.products?.name ?? '', amount: Number(w.quantity)*Number(w.unit_cost), date: w.wastage_date }))], `returns-wastage-${dateFrom}-${dateTo}.csv`);
    } else if (active === 'payment_methods') {
      downloadCSV(data.payments || [], `payments-${dateFrom}-${dateTo}.csv`);
    } else if (active === 'pnl') {
      const revenue = (data.inv || []).reduce((s: number, i: any) => s + Number(i.total_amount), 0);
      const expenses = (data.exp || []).reduce((s: number, i: any) => s + Number(i.amount), 0);
      const wastage = (data.was || []).reduce((s: number, w: any) => s + Number(w.quantity) * Number(w.unit_cost), 0);
      const productMap = new Map<string, number>((data.prods || []).map((p: any) => [p.id, Number(p.cost_price)]));
      const cogs = (data.items || []).reduce((s: number, it: any) => s + Number(it.quantity) * (productMap.get(it.product_id) || 0), 0);
      downloadCSV([{ revenue, cogs, gross_profit: revenue - cogs, expenses, wastage, net_profit: revenue - cogs - expenses - wastage }], `pnl-${dateFrom}-${dateTo}.csv`);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-gray-900">Reports</h1>
          <p className="text-gray-500 font-medium">Insights, exports and analytics across your business.</p>
        </div>

        {/* Filter bar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1">From</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1">To</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={fetchReport} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black px-5 py-2.5 text-sm">Apply Filters</button>
            <button onClick={exportCurrent} className="border border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-xl font-bold px-5 py-2.5 text-sm flex items-center gap-2"><Download size={14} />Export CSV</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-6">
          {/* Sidebar */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 overflow-x-auto">
            <div className="flex lg:flex-col gap-1 min-w-max lg:min-w-0">
              {REPORTS.map(r => {
                const Icon = r.Icon;
                const isActive = active === r.key;
                return (
                  <button key={r.key} onClick={() => setActive(r.key)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap text-left transition-colors ${isActive ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                    <Icon size={16} />{r.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Body */}
          <div className="space-y-6 min-w-0">
            {loading ? <Spinner /> : !data ? <Empty msg="No data" /> : (
              <>
                {active === 'sales' && <SalesReport invoices={data.invoices} />}
                {active === 'pnl' && <PnLReport {...data} />}
                {active === 'invoice' && <InvoiceReport invoices={data.invoices} />}
                {active === 'stock' && <StockReport prods={data.prods} movs={data.movs} />}
                {active === 'expense' && <ExpenseReport expenses={data.expenses} />}
                {active === 'customer' && <CustomerReport customers={data.customers} invoices={data.invoices} />}
                {active === 'dealer' && <DealerReport dealers={data.dealers} farmers={data.farmers} invoices={data.invoices} />}
                {active === 'farmer' && <FarmerReport farmers={data.farmers} dealers={data.dealers} assignments={data.assignments} />}
                {active === 'device' && <DeviceReport devices={data.devices} assignments={data.assignments} farmers={data.farmers} />}
                {active === 'return_wastage' && <ReturnWastageReport returns={data.returns} wastage={data.wastage} />}
                {active === 'payment_methods' && <PaymentMethodsReport payments={data.payments} />}
                {active === 'commission' && <CommissionReport dealers={data.dealers} invoices={data.invoices} />}
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

/* ---------- 1. Sales Summary ---------- */
function SalesReport({ invoices }: { invoices: any[] }) {
  const total = invoices.reduce((s, i) => s + Number(i.total_amount), 0);
  const count = invoices.length;
  const avg = count ? total / count : 0;
  const due = 0;
  const grouped: Record<string, { date: string; invoices: number; revenue: number; paid: number; due: number }> = {};
  invoices.forEach(i => {
    const d = i.created_at.slice(0, 10);
    grouped[d] = grouped[d] || { date: d, invoices: 0, revenue: 0, paid: 0, due: 0 };
    grouped[d].invoices += 1;
    grouped[d].revenue += Number(i.total_amount);
    grouped[d].paid += Number(i.total_amount);
  });
  const rows = Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
  const barRows = rows.slice(-14);
  const maxRev = Math.max(1, ...barRows.map(r => r.revenue));
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Revenue" value={formatPrice(total, 'Bangladesh')} color="text-green-600" />
        <StatCard label="Total Invoices" value={count} />
        <StatCard label="Avg Invoice" value={formatPrice(avg, 'Bangladesh')} />
        <StatCard label="Total Due" value={formatPrice(due, 'Bangladesh')} color="text-orange-600" />
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-sm font-black text-gray-700 mb-4">Revenue (last 14 days in range)</p>
        {barRows.length === 0 ? <Empty msg="No sales" /> : (
          <svg viewBox="0 0 400 200" className="w-full h-[200px]">
            {barRows.map((r, idx) => {
              const w = 400 / barRows.length;
              const h = (r.revenue / maxRev) * 170;
              return (
                <g key={r.date}>
                  <rect x={idx * w + 4} y={200 - h - 20} width={w - 8} height={h} fill="#6366f1" rx={4}>
                    <title>{r.date}: {formatPrice(r.revenue, 'Bangladesh')}</title>
                  </rect>
                  <text x={idx * w + w / 2} y={196} textAnchor="middle" fontSize="9" fill="#6b7280">{r.date.slice(5)}</text>
                </g>
              );
            })}
          </svg>
        )}
      </div>
      <ReportTable
        cols={['Date', 'Invoices', 'Revenue', 'Paid', 'Due']}
        rows={rows.map(r => [r.date, r.invoices, formatPrice(r.revenue, 'Bangladesh'), formatPrice(r.paid, 'Bangladesh'), formatPrice(r.due, 'Bangladesh')])}
      />
    </div>
  );
}

/* ---------- 2. P&L ---------- */
function PnLReport({ inv, exp, was, prods, secs, items }: any) {
  const revenue = inv.reduce((s: number, i: any) => s + Number(i.total_amount), 0);
  const productMap = new Map<string, number>(prods.map((p: any) => [p.id, Number(p.cost_price)]));
  const cogs = items.reduce((s: number, it: any) => s + Number(it.quantity) * (productMap.get(it.product_id) || 0), 0);
  const grossProfit = revenue - cogs;
  const totalExp = exp.reduce((s: number, e: any) => s + Number(e.amount), 0);
  const wastageCost = was.reduce((s: number, w: any) => s + Number(w.quantity) * Number(w.unit_cost), 0);
  const net = grossProfit - totalExp - wastageCost;
  const secMap = new Map<string, string>(secs.map((s: any) => [s.id, s.name]));
  const expBySector = new Map<string, number>();
  exp.forEach((e: any) => {
    const name = secMap.get(e.sector_id) || 'Uncategorized';
    expBySector.set(name, (expBySector.get(name) || 0) + Number(e.amount));
  });
  const Row = ({ label, amount, bold = false, indent = 0, cls = '' }: any) => (
    <div className={`flex justify-between py-2 ${bold ? 'border-t-2 border-gray-200 font-black' : 'font-medium'} ${cls}`} style={{ paddingLeft: indent * 16 }}>
      <span className="text-gray-700">{label}</span>
      <span className="font-mono">{formatPrice(amount, 'Bangladesh')}</span>
    </div>
  );
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-1">
      <p className="text-sm font-black uppercase tracking-widest text-gray-500 mb-3">Income</p>
      <Row label="Sales Revenue" amount={revenue} indent={1} />
      <Row label="Cost of Goods Sold" amount={-cogs} indent={1} cls="text-red-600" />
      <Row label="Gross Profit" amount={grossProfit} bold cls={grossProfit >= 0 ? 'text-green-600' : 'text-red-600'} />

      <p className="text-sm font-black uppercase tracking-widest text-gray-500 mt-6 mb-3">Expenses</p>
      {Array.from(expBySector.entries()).map(([name, amt]) => (
        <Row key={name} label={name} amount={amt} indent={1} cls="text-red-600" />
      ))}
      <Row label="Total Expenses" amount={totalExp} bold cls="text-red-600" />

      <p className="text-sm font-black uppercase tracking-widest text-gray-500 mt-6 mb-3">Other</p>
      <Row label="Wastage Costs" amount={wastageCost} indent={1} cls="text-red-600" />

      <div className={`flex justify-between py-3 mt-4 border-t-4 rounded-lg px-4 ${net >= 0 ? 'bg-green-50 border-green-500 text-green-700' : 'bg-red-50 border-red-500 text-red-700'}`}>
        <span className="font-black uppercase tracking-widest">Net Profit</span>
        <span className="font-black font-mono">{formatPrice(net, 'Bangladesh')}</span>
      </div>
    </div>
  );
}

/* ---------- 3. Invoice Report ---------- */
function InvoiceReport({ invoices }: { invoices: any[] }) {
  const [sortKey, setSortKey] = useState<string>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const sorted = [...invoices].sort((a, b) => {
    const av = a[sortKey] ?? ''; const bv = b[sortKey] ?? '';
    const cmp = typeof av === 'number' ? av - bv : String(av).localeCompare(String(bv));
    return sortDir === 'asc' ? cmp : -cmp;
  });
  const total = invoices.reduce((s, i) => s + Number(i.total_amount), 0);
  const toggleSort = (k: string) => { if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortKey(k); setSortDir('asc'); } };
  const SortHead = ({ k, label }: any) => (
    <th onClick={() => toggleSort(k)} className="px-3 py-3 text-left text-xs font-black uppercase tracking-widest text-gray-500 cursor-pointer hover:bg-gray-50">
      <div className="inline-flex items-center gap-1">{label}{sortKey === k && (sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}</div>
    </th>
  );
  const statusColor = (s: string) => s === 'completed' ? 'bg-green-50 text-green-600 border-green-200' : s === 'pending' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' : 'bg-gray-50 text-gray-600 border-gray-200';
  if (!invoices.length) return <Empty msg="No invoices in range" />;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <SortHead k="invoice_number" label="Invoice #" />
            <th className="px-3 py-3 text-left text-xs font-black uppercase tracking-widest text-gray-500">Customer</th>
            <SortHead k="created_at" label="Date" />
            <SortHead k="total_amount" label="Total" />
            <SortHead k="status" label="Status" />
          </tr>
        </thead>
        <tbody>
          {sorted.map(i => (
            <tr key={i.id} className="border-t border-gray-100">
              <td className="px-3 py-3 font-bold text-gray-900">{i.invoice_number}</td>
              <td className="px-3 py-3 text-gray-700">{i.customers?.name ?? '—'}</td>
              <td className="px-3 py-3 text-gray-600">{i.created_at?.slice(0, 10)}</td>
              <td className="px-3 py-3 font-mono font-bold">{formatPrice(Number(i.total_amount), 'Bangladesh')}</td>
              <td className="px-3 py-3"><Badge className={statusColor(i.status)}>{i.status}</Badge></td>
            </tr>
          ))}
          <tr className="border-t-2 border-gray-300 bg-gray-50 font-black">
            <td colSpan={3} className="px-3 py-3 text-right uppercase tracking-widest text-xs text-gray-500">Total</td>
            <td className="px-3 py-3 font-mono text-indigo-600">{formatPrice(total, 'Bangladesh')}</td>
            <td />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/* ---------- 4. Stock Report ---------- */
function StockReport({ prods, movs }: any) {
  const totalProducts = prods.length;
  const totalValue = prods.reduce((s: number, p: any) => s + Number(p.stock) * Number(p.cost_price), 0);
  const low = prods.filter((p: any) => Number(p.stock) < 5 && Number(p.stock) > 0).length;
  const out = prods.filter((p: any) => Number(p.stock) === 0).length;
  const movMap = new Map<string, { in: number; out: number }>();
  movs.forEach((m: any) => {
    if (!m.product_id) return;
    const cur = movMap.get(m.product_id) || { in: 0, out: 0 };
    if (m.movement_type === 'in' || m.movement_type === 'restock') cur.in += Number(m.quantity);
    else cur.out += Number(m.quantity);
    movMap.set(m.product_id, cur);
  });
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Products" value={totalProducts} />
        <StatCard label="Stock Value" value={formatPrice(totalValue, 'Bangladesh')} color="text-green-600" />
        <StatCard label="Low Stock" value={low} color="text-orange-600" />
        <StatCard label="Out of Stock" value={out} color="text-red-600" />
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {['Product','Category','Stock','Value','In','Out','Net'].map(h =>
                <th key={h} className="px-3 py-3 text-left text-xs font-black uppercase tracking-widest text-gray-500">{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {prods.map((p: any) => {
              const mv = movMap.get(p.id) || { in: 0, out: 0 };
              const isLow = Number(p.stock) < 5;
              return (
                <tr key={p.id} className={`border-t border-gray-100 ${isLow ? 'bg-orange-50' : ''}`}>
                  <td className="px-3 py-3 font-bold text-gray-900">{p.name}</td>
                  <td className="px-3 py-3 text-gray-600">{p.category ?? '—'}</td>
                  <td className="px-3 py-3 font-mono">{p.stock}</td>
                  <td className="px-3 py-3 font-mono">{formatPrice(Number(p.stock)*Number(p.cost_price), 'Bangladesh')}</td>
                  <td className="px-3 py-3 font-mono text-green-600">+{mv.in}</td>
                  <td className="px-3 py-3 font-mono text-red-600">-{mv.out}</td>
                  <td className="px-3 py-3 font-mono font-bold">{mv.in - mv.out}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- 5. Expense Report ---------- */
function ExpenseReport({ expenses }: any) {
  const total = expenses.reduce((s: number, e: any) => s + Number(e.amount), 0);
  const bySector = new Map<string, number>();
  expenses.forEach((e: any) => {
    const n = e.expense_sectors?.name ?? 'Uncategorized';
    bySector.set(n, (bySector.get(n) || 0) + Number(e.amount));
  });
  const slices = Array.from(bySector.entries());
  let acc = 0;
  return (
    <div className="space-y-6">
      <StatCard label="Total Expenses" value={formatPrice(total, 'Bangladesh')} color="text-red-600" />
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <p className="text-sm font-black text-gray-700 mb-4">Expenses by Sector</p>
        {slices.length === 0 ? <Empty msg="No expenses" /> : (
          <div className="flex flex-col sm:flex-row gap-6 items-center">
            <svg viewBox="0 0 40 40" className="w-40 h-40 -rotate-90">
              <circle cx="20" cy="20" r="15.9" fill="transparent" stroke="#f3f4f6" strokeWidth="6" />
              {slices.map(([name, amt], i) => {
                const pct = (amt / total) * 100;
                const dash = `${pct} ${100 - pct}`;
                const offset = -acc;
                acc += pct;
                return <circle key={name} cx="20" cy="20" r="15.9" fill="transparent" stroke={PIE_COLORS[i % PIE_COLORS.length]} strokeWidth="6" strokeDasharray={dash} strokeDashoffset={offset} />;
              })}
            </svg>
            <div className="space-y-2 flex-1">
              {slices.map(([name, amt], i) => (
                <div key={name} className="flex items-center gap-2 text-sm">
                  <span className="w-3 h-3 rounded" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="font-bold text-gray-700 flex-1">{name}</span>
                  <span className="font-mono">{formatPrice(amt, 'Bangladesh')}</span>
                  <span className="text-xs text-gray-400 w-12 text-right">{((amt/total)*100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <ReportTable
        cols={['Date', 'Title', 'Sector', 'Amount']}
        rows={expenses.map((e: any) => [e.expense_date, e.title, e.expense_sectors?.name ?? '—', formatPrice(Number(e.amount), 'Bangladesh')])}
      />
    </div>
  );
}

/* ---------- 6. Customer Report ---------- */
function CustomerReport({ customers, invoices }: any) {
  const map = new Map<string, { orders: number; spend: number }>();
  invoices.forEach((i: any) => {
    if (!i.customer_id) return;
    const cur = map.get(i.customer_id) || { orders: 0, spend: 0 };
    cur.orders += 1; cur.spend += Number(i.total_amount);
    map.set(i.customer_id, cur);
  });
  const rows = customers.map((c: any) => ({ ...c, ...(map.get(c.id) || { orders: 0, spend: 0 }) }))
    .sort((a: any, b: any) => b.spend - a.spend);
  if (!rows.length) return <Empty msg="No customers" />;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>{['Customer','Phone','Orders','Total Spend','Avg Order'].map(h => <th key={h} className="px-3 py-3 text-left text-xs font-black uppercase tracking-widest text-gray-500">{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((c: any, idx: number) => (
            <tr key={c.id} className="border-t border-gray-100">
              <td className="px-3 py-3 font-bold text-gray-900 flex items-center gap-2">{idx === 0 && c.spend > 0 && <Star size={14} className="text-yellow-400 fill-yellow-400" />}{c.name}</td>
              <td className="px-3 py-3 text-gray-600">{c.phone ?? '—'}</td>
              <td className="px-3 py-3 font-mono">{c.orders}</td>
              <td className="px-3 py-3 font-mono font-bold text-indigo-600">{formatPrice(c.spend, 'Bangladesh')}</td>
              <td className="px-3 py-3 font-mono">{formatPrice(c.orders ? c.spend / c.orders : 0, 'Bangladesh')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- 7. Dealer Report ---------- */
function DealerReport({ dealers, farmers, invoices }: any) {
  const farmerCount = new Map<string, number>();
  farmers.forEach((f: any) => farmerCount.set(f.dealer_id, (farmerCount.get(f.dealer_id) || 0) + 1));
  const salesByUser = new Map<string, number>();
  invoices.forEach((i: any) => { if (!i.created_by) return; salesByUser.set(i.created_by, (salesByUser.get(i.created_by) || 0) + Number(i.total_amount)); });
  let totalCommission = 0;
  const rows = dealers.map((d: any) => {
    const sales = salesByUser.get(d.user_id) || 0;
    const comm = d.commission_type === 'percent' ? sales * (Number(d.commission_rate) / 100) : Number(d.commission_rate);
    totalCommission += comm;
    return { ...d, fcount: farmerCount.get(d.id) || 0, sales, comm };
  });
  return (
    <div className="space-y-6">
      <StatCard label="Total Commissions Payable" value={formatPrice(totalCommission, 'Bangladesh')} color="text-orange-600" />
      <ReportTable cols={['Dealer','Farmers','Sales','Rate','Commission']}
        rows={rows.map((d: any) => [d.name, d.fcount, formatPrice(d.sales, 'Bangladesh'), `${d.commission_rate}${d.commission_type === 'percent' ? '%' : ' fixed'}`, formatPrice(d.comm, 'Bangladesh')])} />
    </div>
  );
}

/* ---------- 8. Farmer Report ---------- */
function FarmerReport({ farmers, dealers, assignments }: any) {
  const [dealerFilter, setDealerFilter] = useState('all');
  const devCount = new Map<string, number>();
  assignments.forEach((a: any) => devCount.set(a.farmer_id, (devCount.get(a.farmer_id) || 0) + 1));
  const filtered = farmers.filter((f: any) => dealerFilter === 'all' || f.dealer_id === dealerFilter);
  return (
    <div className="space-y-4">
      <select value={dealerFilter} onChange={e => setDealerFilter(e.target.value)} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium">
        <option value="all">All Dealers</option>
        {dealers.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>
      <ReportTable cols={['Farmer','Dealer','Phone','Devices','Joined']}
        rows={filtered.map((f: any) => [f.name, f.dealers?.name ?? '—', f.phone ?? '—', devCount.get(f.id) || 0, f.created_at?.slice(0,10) ?? '—'])} />
    </div>
  );
}

/* ---------- 9. Device Report ---------- */
function DeviceReport({ devices, assignments, farmers }: any) {
  const statuses = new Map<string, number>();
  devices.forEach((d: any) => statuses.set(d.status, (statuses.get(d.status) || 0) + 1));
  const maxCount = Math.max(1, ...statuses.values());
  const onlineCount = devices.filter((d: any) => d.is_online).length;
  const offlineCount = devices.length - onlineCount;
  const onlinePct = devices.length ? (onlineCount / devices.length) * 100 : 0;
  const farmerMap = new Map(farmers.map((f: any) => [f.id, f.name]));
  const latestAssign = new Map<string, string>();
  assignments.forEach((a: any) => { if (!latestAssign.has(a.device_id)) latestAssign.set(a.device_id, a.farmer_id); });
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-sm font-black text-gray-700 mb-4">Status Breakdown</p>
          <div className="space-y-2">
            {Array.from(statuses.entries()).map(([s, c]) => (
              <div key={s} className="flex items-center gap-3">
                <span className="w-20 text-xs font-bold text-gray-600 uppercase">{s}</span>
                <div className="flex-1 h-6 bg-gray-100 rounded-lg overflow-hidden">
                  <div className="h-full bg-indigo-600" style={{ width: `${(c / maxCount) * 100}%` }} />
                </div>
                <span className="w-8 text-right font-bold text-sm">{c}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-6">
          <svg viewBox="0 0 40 40" className="w-32 h-32 -rotate-90">
            <circle cx="20" cy="20" r="15.9" fill="transparent" stroke="#fee2e2" strokeWidth="6" />
            <circle cx="20" cy="20" r="15.9" fill="transparent" stroke="#22c55e" strokeWidth="6" strokeDasharray={`${onlinePct} ${100 - onlinePct}`} strokeDashoffset="0" />
          </svg>
          <div className="space-y-2">
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-green-500" /><span className="font-bold text-sm">Online: {onlineCount}</span></div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded bg-red-200" /><span className="font-bold text-sm">Offline: {offlineCount}</span></div>
          </div>
        </div>
      </div>
      <ReportTable cols={['Serial','Name','Status','Online','Last Seen','Firmware','Assigned To']}
        rows={devices.map((d: any) => [d.serial_number, d.name ?? '—', d.status, d.is_online ? 'Yes' : 'No', d.last_seen?.slice(0,10) ?? '—', d.firmware_version ?? '—', farmerMap.get(latestAssign.get(d.id)!) ?? '—'])} />
    </div>
  );
}

/* ---------- 10. Return & Wastage ---------- */
function ReturnWastageReport({ returns, wastage }: any) {
  const returnTotal = returns.reduce((s: number, r: any) => s + Number(r.total_amount), 0);
  const wastageTotal = wastage.reduce((s: number, w: any) => s + Number(w.quantity) * Number(w.unit_cost), 0);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Returns Value" value={formatPrice(returnTotal, 'Bangladesh')} color="text-red-600" />
        <StatCard label="Wastage Cost" value={formatPrice(wastageTotal, 'Bangladesh')} color="text-red-600" />
        <StatCard label="Combined Loss" value={formatPrice(returnTotal + wastageTotal, 'Bangladesh')} color="text-red-700" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <p className="text-sm font-black text-gray-700 mb-2">Returns</p>
          <ReportTable cols={['Return #','Amount','Date']}
            rows={returns.map((r: any) => [r.return_number, formatPrice(Number(r.total_amount), 'Bangladesh'), r.created_at?.slice(0,10)])} />
        </div>
        <div>
          <p className="text-sm font-black text-gray-700 mb-2">Wastage</p>
          <ReportTable cols={['Product','Qty','Unit','Total','Date']}
            rows={wastage.map((w: any) => [w.products?.name ?? '—', w.quantity, formatPrice(Number(w.unit_cost), 'Bangladesh'), formatPrice(Number(w.quantity)*Number(w.unit_cost), 'Bangladesh'), w.wastage_date])} />
        </div>
      </div>
    </div>
  );
}

/* ---------- 11. Payment Methods ---------- */
function PaymentMethodsReport({ payments }: any) {
  const methods = ['cash','card','mobile_banking','bank_transfer','credit','other'];
  const totals = new Map<string, { count: number; amount: number }>();
  methods.forEach(m => totals.set(m, { count: 0, amount: 0 }));
  payments.forEach((p: any) => {
    const cur = totals.get(p.method) || { count: 0, amount: 0 };
    cur.count += 1; cur.amount += Number(p.amount);
    totals.set(p.method, cur);
  });
  const total = payments.reduce((s: number, p: any) => s + Number(p.amount), 0);
  const max = Math.max(1, ...Array.from(totals.values()).map(v => v.amount));
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <p className="text-sm font-black text-gray-700">Payment Volume</p>
        {methods.map(m => {
          const v = totals.get(m)!;
          return (
            <div key={m} className="flex items-center gap-3">
              <span className="w-32 text-xs font-bold text-gray-600 uppercase">{m.replace('_',' ')}</span>
              <div className="flex-1 h-6 bg-gray-100 rounded-lg overflow-hidden">
                <div className="h-full bg-indigo-600" style={{ width: `${(v.amount / max) * 100}%` }} />
              </div>
              <span className="w-28 text-right font-mono text-sm">{formatPrice(v.amount, 'Bangladesh')}</span>
            </div>
          );
        })}
      </div>
      <ReportTable cols={['Method','Count','Amount','% of Total']}
        rows={methods.map(m => { const v = totals.get(m)!; return [m, v.count, formatPrice(v.amount, 'Bangladesh'), total ? `${((v.amount/total)*100).toFixed(1)}%` : '0%']; })} />
    </div>
  );
}

/* ---------- 12. Commission Report ---------- */
function CommissionReport({ dealers, invoices }: any) {
  const salesByUser = new Map<string, { sales: number; count: number }>();
  invoices.forEach((i: any) => {
    if (!i.created_by) return;
    const cur = salesByUser.get(i.created_by) || { sales: 0, count: 0 };
    cur.sales += Number(i.total_amount); cur.count += 1;
    salesByUser.set(i.created_by, cur);
  });
  let total = 0;
  const rows = dealers.map((d: any) => {
    const s = salesByUser.get(d.user_id) || { sales: 0, count: 0 };
    const comm = d.commission_type === 'percent' ? s.sales * (Number(d.commission_rate) / 100) : Number(d.commission_rate) * s.count;
    total += comm;
    return { d, s, comm };
  });
  return (
    <div className="space-y-6">
      <StatCard label="Total Commissions Payable" value={formatPrice(total, 'Bangladesh')} color="text-orange-600" />
      <ReportTable cols={['Dealer','Type','Rate','Sales','Commission','Status']}
        rows={rows.map(({ d, s, comm }: any) => [d.name, d.commission_type, d.commission_rate, formatPrice(s.sales, 'Bangladesh'), formatPrice(comm, 'Bangladesh'), 'Unpaid'])} />
    </div>
  );
}

/* ---------- Shared table ---------- */
function ReportTable({ cols, rows }: { cols: string[]; rows: any[][] }) {
  if (!rows.length) return <Empty msg="No data" />;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>{cols.map(c => <th key={c} className="px-3 py-3 text-left text-xs font-black uppercase tracking-widest text-gray-500">{c}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-gray-100">
              {r.map((cell, j) => <td key={j} className="px-3 py-3 text-gray-700">{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
