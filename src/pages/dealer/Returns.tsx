import { Fragment as FragmentRow, useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabaseClient';
import { useAuthStore } from '../../store/authStore';
import { formatPrice } from '../../utils/currency';

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

export default function DealerReturns() {
  const { profile } = useAuthStore();
  const tenantId = profile?.tenant_id ?? profile?.id ?? '';
  const [loading, setLoading] = useState(true);
  const [returns, setReturns] = useState<any[]>([]);
  const [returnItems, setReturnItems] = useState<Record<string, any[]>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [invSearch, setInvSearch] = useState('');
  const [invoice, setInvoice] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase.from('sales_returns') as any)
        .select('*, invoices(invoice_number, total_amount, customer_id, customers(name))')
        .eq('tenant_id', tenantId).order('created_at', { ascending: false });
      if (error) throw error;
      setReturns(data || []);
    } catch (e: any) { toast.error(e.message || 'Failed to load returns'); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (profile) load(); /* eslint-disable-next-line */ }, [profile?.id]);

  const loadItems = async (returnId: string) => {
    if (returnItems[returnId]) return;
    try {
      const { data } = await (supabase.from('sales_return_items') as any).select('*').eq('return_id', returnId);
      setReturnItems((prev) => ({ ...prev, [returnId]: data || [] }));
    } catch { /* ignore */ }
  };

  const toggleExpand = (id: string) => {
    if (expanded === id) setExpanded(null);
    else { setExpanded(id); loadItems(id); }
  };

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthReturns = returns.filter((r) => r.created_at >= monthStart);
  const stats = {
    monthCount: monthReturns.length,
    monthValue: monthReturns.reduce((s, r) => s + Number(r.total_amount || 0), 0),
    pending: returns.length,
  };

  const filtered = returns.filter((r) => {
    const s = search.toLowerCase(); if (!s) return true;
    return (r.invoices?.invoice_number || '').toLowerCase().includes(s) || (r.invoices?.customers?.name || '').toLowerCase().includes(s);
  });

  const openNew = () => { setStep(1); setInvSearch(''); setInvoice(null); setSelectedItems({}); setReason(''); setModalOpen(true); };

  const findInvoice = async () => {
    if (!invSearch.trim()) return;
    try {
      const { data, error } = await (supabase.from('invoices') as any)
        .select('*, invoice_items(*), customers(name)')
        .eq('tenant_id', tenantId).eq('invoice_number', invSearch.trim()).maybeSingle();
      if (error) throw error;
      if (!data) { toast.error('Invoice not found'); return; }
      setInvoice(data); setStep(2);
    } catch (e: any) { toast.error(e.message || 'Search failed'); }
  };

  const submitReturn = async () => {
    const items = Object.entries(selectedItems).filter(([, q]) => q > 0);
    if (!items.length) { toast.error('Select items to return'); return; }
    if (!reason.trim()) { toast.error('Reason required'); return; }
    setSubmitting(true);
    try {
      const itemsData = items.map(([itemId, q]) => {
        const it = invoice.invoice_items.find((x: any) => x.id === itemId);
        return { item: it, qty: q, amount: Number(it.unit_price) * Number(q) };
      });
      const total = itemsData.reduce((s, x) => s + x.amount, 0);
      const { data: ret, error: e1 } = await (supabase.from('sales_returns') as any).insert({
        tenant_id: tenantId, invoice_id: invoice.id, reason, total_amount: total, created_by: profile!.id, return_date: new Date().toISOString().slice(0, 10),
      }).select().single();
      if (e1) throw e1;
      const itemRows = itemsData.map((x) => ({ return_id: ret.id, product_id: x.item.product_id, product_name: x.item.product_name, quantity: x.qty, amount: x.amount }));
      const { error: e2 } = await (supabase.from('sales_return_items') as any).insert(itemRows);
      if (e2) throw e2;
      const moves = itemsData.filter((x) => x.item.product_id).map((x) => ({ tenant_id: tenantId, product_id: x.item.product_id, movement_type: 'return', quantity: x.qty, reference_id: ret.id, notes: 'Sales return ' + (ret.return_number || ret.id) }));
      if (moves.length) await (supabase.from('stock_movements') as any).insert(moves);
      for (const x of itemsData) {
        if (!x.item.product_id) continue;
        const { data: p } = await (supabase.from('products') as any).select('stock').eq('id', x.item.product_id).maybeSingle();
        const current = Number(p?.stock || 0);
        await (supabase.from('products') as any).update({ stock: current + Number(x.qty) }).eq('id', x.item.product_id);
      }
      toast.success('Return processed successfully');
      setModalOpen(false); load();
    } catch (e: any) { toast.error(e.message || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const displayNum = (r: any, idx: number) => r.return_number || `RET-${String(returns.length - idx).padStart(3, '0')}`;

  return (
    <DealerLayout>
      {loading ? (
        <div className="flex justify-center py-20"><div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900">Returns</h1>
              <p className="text-sm text-gray-500 mt-1">Manage sales returns</p>
            </div>
            <button onClick={openNew} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black px-4 py-2.5 text-sm">+ New Return</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"><div className="text-xs font-bold text-gray-500 uppercase">Returns This Month</div><div className="text-3xl font-black text-gray-900 mt-1">{stats.monthCount}</div></div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"><div className="text-xs font-bold text-gray-500 uppercase">Return Value This Month</div><div className="text-2xl font-black text-gray-900 mt-1">{formatPrice(stats.monthValue, 'Bangladesh')}</div></div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"><div className="text-xs font-bold text-gray-500 uppercase">Total Returns</div><div className="text-3xl font-black text-gray-900 mt-1">{stats.pending}</div></div>
          </div>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by invoice or customer..." className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {filtered.length === 0 ? (
              <div className="p-12 text-center text-gray-400 text-sm font-medium">No returns yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
                    <tr><th className="p-3 text-left">Return #</th><th className="p-3 text-left">Invoice #</th><th className="p-3 text-left">Customer</th><th className="p-3 text-left">Amount</th><th className="p-3 text-left">Reason</th><th className="p-3 text-left">Date</th><th className="p-3 text-right">Actions</th></tr>
                  </thead>
                  <tbody>
                    {filtered.map((r, idx) => (
                      <FragmentRow key={r.id}>
                        <tr className="border-t border-gray-100">
                          <td className="p-3 font-bold text-gray-900">{displayNum(r, idx)}</td>
                          <td className="p-3 text-gray-600">{r.invoices?.invoice_number || '—'}</td>
                          <td className="p-3 text-gray-600">{r.invoices?.customers?.name || '—'}</td>
                          <td className="p-3 font-bold text-gray-900">{formatPrice(Number(r.total_amount || 0), 'Bangladesh')}</td>
                          <td className="p-3 text-gray-600 max-w-xs truncate">{r.reason || '—'}</td>
                          <td className="p-3 text-gray-500 text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                          <td className="p-3 text-right"><button onClick={() => toggleExpand(r.id)} className="text-indigo-600 hover:bg-indigo-50 rounded-lg p-1.5 text-xs font-bold">{expanded === r.id ? 'Hide' : 'View'}</button></td>
                        </tr>
                        {expanded === r.id && (
                          <tr className="bg-gray-50">
                            <td colSpan={7} className="p-4">
                              {!returnItems[r.id] ? <div className="text-xs text-gray-500">Loading...</div> :
                                returnItems[r.id].length === 0 ? <div className="text-xs text-gray-500">No items</div> :
                                  <div className="space-y-1">{returnItems[r.id].map((it: any) => (
                                    <div key={it.id} className="flex justify-between text-xs"><span className="font-bold">{it.product_name}</span><span>Qty: {it.quantity} · {formatPrice(Number(it.amount || 0), 'Bangladesh')}</span></div>
                                  ))}</div>}
                            </td>
                          </tr>
                        )}
                      </FragmentRow>
                    ))}

                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-900">New Return — Step {step}/2</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:bg-gray-50 rounded-lg p-1.5">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {step === 1 && (
                <>
                  <div><label className="text-xs font-bold text-gray-500 uppercase">Invoice Number</label><input value={invSearch} onChange={(e) => setInvSearch(e.target.value)} className="w-full mt-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                  <button onClick={findInvoice} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black px-4 py-2.5 text-sm">Search Invoice</button>
                </>
              )}
              {step === 2 && invoice && (
                <>
                  <div className="bg-gray-50 rounded-xl p-3 text-sm">
                    <div className="font-bold">{invoice.invoice_number}</div>
                    <div className="text-xs text-gray-600">Customer: {invoice.customers?.name || '—'}</div>
                    <div className="text-xs text-gray-600">Total: {formatPrice(Number(invoice.total_amount || 0), 'Bangladesh')}</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-gray-500 uppercase mb-2">Items</div>
                    <div className="space-y-2">
                      {invoice.invoice_items?.map((it: any) => (
                        <div key={it.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl">
                          <input type="checkbox" checked={(selectedItems[it.id] || 0) > 0} onChange={(e) => setSelectedItems((p) => ({ ...p, [it.id]: e.target.checked ? Number(it.quantity) : 0 }))} />
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-sm truncate">{it.product_name}</div>
                            <div className="text-xs text-gray-500">Qty: {it.quantity} · {formatPrice(Number(it.unit_price), 'Bangladesh')}</div>
                          </div>
                          {(selectedItems[it.id] || 0) > 0 && (
                            <input type="number" min={1} max={Number(it.quantity)} value={selectedItems[it.id]} onChange={(e) => setSelectedItems((p) => ({ ...p, [it.id]: Math.min(Number(it.quantity), Math.max(1, parseInt(e.target.value) || 1)) }))} className="w-20 px-2 py-1 rounded-lg border border-gray-200 text-sm" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div><label className="text-xs font-bold text-gray-500 uppercase">Reason *</label><textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} className="w-full mt-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
                </>
              )}
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setModalOpen(false)} className="border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 px-4 py-2.5 text-sm">Cancel</button>
              {step === 2 && <button disabled={submitting} onClick={submitReturn} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black px-4 py-2.5 text-sm disabled:opacity-60">{submitting ? 'Processing...' : 'Submit Return'}</button>}
            </div>
          </div>
        </div>
      )}
    </DealerLayout>
  );
}
