import { useEffect, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '../../lib/supabaseClient';
import { useAuthStore } from '../../store/authStore';
import { formatPrice } from '../../utils/currency';
import { Plus, Trash2, X, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface ReturnRow { id: string; return_number: string; reason: string | null; total_amount: number; return_date: string; invoice_id: string | null; created_by: string | null;
  invoice?: { invoice_number: string } | null; creator?: { full_name: string | null } | null; }
interface ReturnItem { id: string; product_name: string | null; quantity: number; amount: number; product_id: string | null; }
interface InvoiceItem { id: string; product_id: string | null; product_name: string | null; quantity: number; unit_price: number; }

export default function Returns() {
  const { profile } = useAuthStore();
  const tenantId = profile?.tenant_id ?? profile?.id ?? '';
  const [items, setItems] = useState<ReturnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [invoiceQuery, setInvoiceQuery] = useState('');
  const [foundInvoice, setFoundInvoice] = useState<{ id: string; invoice_number: string } | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [selected, setSelected] = useState<Record<string, { checked: boolean; quantity: number }>>({});
  const [reason, setReason] = useState('');

  const [detail, setDetail] = useState<ReturnRow | null>(null);
  const [detailItems, setDetailItems] = useState<ReturnItem[]>([]);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase.from('sales_returns') as any)
      .select('*, invoice:invoices(invoice_number), creator:profiles!sales_returns_created_by_fkey(full_name)')
      .eq('tenant_id', tenantId).order('created_at', { ascending: false });
    setItems((data as ReturnRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { if (tenantId) load(); }, [tenantId]);

  useEffect(() => {
    if (!detail) { setDetailItems([]); return; }
    (async () => {
      const { data } = await (supabase.from('sales_return_items') as any).select('*').eq('return_id', detail.id);
      setDetailItems((data as ReturnItem[]) || []);
    })();
  }, [detail?.id]);

  const lookupInvoice = async () => {
    if (!invoiceQuery.trim()) return;
    const { data: inv } = await (supabase.from('invoices') as any).select('id, invoice_number')
      .eq('tenant_id', tenantId).eq('invoice_number', invoiceQuery.trim()).maybeSingle();
    if (!inv) { toast.error('Invoice not found'); return; }
    const { data: ii } = await (supabase.from('invoice_items') as any).select('*').eq('invoice_id', (inv as any).id);
    setFoundInvoice(inv as any);
    setInvoiceItems((ii as InvoiceItem[]) || []);
    const init: Record<string, { checked: boolean; quantity: number }> = {};
    ((ii as InvoiceItem[]) || []).forEach(x => { init[x.id] = { checked: false, quantity: Number(x.quantity) }; });
    setSelected(init);
  };

  const openCreate = () => {
    setInvoiceQuery(''); setFoundInvoice(null); setInvoiceItems([]); setSelected({}); setReason('');
    setModalOpen(true);
  };

  const submit = async () => {
    if (!foundInvoice) { toast.error('Select an invoice first'); return; }
    const chosen = invoiceItems.filter(x => selected[x.id]?.checked && selected[x.id]?.quantity > 0);
    if (chosen.length === 0) { toast.error('Pick at least one item'); return; }
    const total = chosen.reduce((s, x) => s + selected[x.id].quantity * Number(x.unit_price), 0);

    // generate return_number
    const { data: rn } = await (supabase as any).rpc('next_doc_number', { p_tenant: tenantId, p_prefix: 'RET-', p_table: 'sales_returns' });

    const { data: ret, error } = await (supabase.from('sales_returns') as any).insert({
      tenant_id: tenantId, return_number: rn || `RET-${Date.now()}`, invoice_id: foundInvoice.id,
      reason, total_amount: total, created_by: profile?.id,
    }).select('id').maybeSingle();
    if (error || !ret) { toast.error(error?.message || 'Failed'); return; }

    const retId = (ret as any).id;
    const rows = chosen.map(x => ({
      return_id: retId, product_id: x.product_id, product_name: x.product_name,
      quantity: selected[x.id].quantity, amount: selected[x.id].quantity * Number(x.unit_price),
    }));
    await (supabase.from('sales_return_items') as any).insert(rows);

    const moves = chosen.map(x => ({
      tenant_id: tenantId, product_id: x.product_id, movement_type: 'return',
      quantity: selected[x.id].quantity, reference_id: retId,
    }));
    await (supabase.from('stock_movements') as any).insert(moves);

    toast.success('Return created');
    setModalOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this return?')) return;
    const { error } = await (supabase.from('sales_returns') as any).delete().eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Deleted'); load(); if (detail?.id === id) setDetail(null); }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-gray-900 dark:text-white">Sales Returns</h1>
            <p className="text-gray-500 font-medium">Track returned items and refunds.</p>
          </div>
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-sm">
            <Plus size={16} /> New Return
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden ${detail ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            {loading ? (
              <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>
            ) : items.length === 0 ? (
              <div className="py-20 text-center text-gray-500"><RotateCcw size={40} className="mx-auto mb-3 opacity-30" />No returns yet.</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800 text-xs font-black text-gray-500 uppercase tracking-widest">
                  <tr><th className="px-5 py-3 text-left">Return #</th><th className="px-5 py-3 text-left">Invoice</th><th className="px-5 py-3 text-left">Reason</th><th className="px-5 py-3 text-left">Total</th><th className="px-5 py-3 text-left">Date</th><th className="px-5 py-3 text-right">Actions</th></tr>
                </thead>
                <tbody>
                  {items.map(r => (
                    <tr key={r.id} onClick={() => setDetail(r)} className={`border-t border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 ${detail?.id === r.id ? 'bg-indigo-50/60 dark:bg-indigo-950/30' : ''}`}>
                      <td className="px-5 py-3 font-bold text-gray-900 dark:text-white">{r.return_number}</td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{r.invoice?.invoice_number || '—'}</td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-300 truncate max-w-[200px]">{r.reason || '—'}</td>
                      <td className="px-5 py-3 font-bold text-gray-900 dark:text-white">{formatPrice(Number(r.total_amount), 'Bangladesh')}</td>
                      <td className="px-5 py-3 text-xs text-gray-500">{new Date(r.return_date).toLocaleDateString()}</td>
                      <td className="px-5 py-3 text-right" onClick={e => e.stopPropagation()}>
                        <button onClick={() => remove(r.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {detail && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 space-y-4 h-fit sticky top-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white">{detail.return_number}</h3>
                  <p className="text-xs text-gray-500 mt-1">Invoice: {detail.invoice?.invoice_number || '—'}</p>
                </div>
                <button onClick={() => setDetail(null)} className="p-1 text-gray-400 hover:text-gray-600"><X size={16} /></button>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300"><span className="font-bold">Reason:</span> {detail.reason || '—'}</p>
              <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">Items</h4>
                {detailItems.length === 0 ? <p className="text-sm text-gray-400">No items.</p> : (
                  <div className="space-y-2">
                    {detailItems.map(it => (
                      <div key={it.id} className="flex justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm">
                        <div>
                          <div className="font-bold text-gray-900 dark:text-white">{it.product_name || '—'}</div>
                          <div className="text-xs text-gray-500">Qty {it.quantity}</div>
                        </div>
                        <div className="font-bold text-gray-900 dark:text-white">{formatPrice(Number(it.amount), 'Bangladesh')}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-white dark:bg-gray-900 rounded-2xl max-w-xl w-full p-6 space-y-4 border border-gray-100 dark:border-gray-800 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-900 dark:text-white">New Return</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div className="flex gap-2">
              <input value={invoiceQuery} onChange={e => setInvoiceQuery(e.target.value)} placeholder="Invoice number..." className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" />
              <button onClick={lookupInvoice} className="px-4 py-2 rounded-xl text-sm font-bold bg-gray-100 dark:bg-gray-800 hover:bg-gray-200">Find</button>
            </div>
            {foundInvoice && (
              <>
                <p className="text-sm font-bold text-indigo-600">Invoice {foundInvoice.invoice_number}</p>
                <div className="space-y-2 border border-gray-100 dark:border-gray-800 rounded-xl p-3">
                  {invoiceItems.map(it => (
                    <div key={it.id} className="flex items-center gap-3">
                      <input type="checkbox" checked={selected[it.id]?.checked || false}
                        onChange={e => setSelected(p => ({ ...p, [it.id]: { ...p[it.id], checked: e.target.checked } }))} />
                      <div className="flex-1 text-sm">
                        <div className="font-bold text-gray-900 dark:text-white">{it.product_name || '—'}</div>
                        <div className="text-xs text-gray-500">{formatPrice(Number(it.unit_price), 'Bangladesh')} each · max {it.quantity}</div>
                      </div>
                      <input type="number" min={1} max={it.quantity} value={selected[it.id]?.quantity || 1}
                        onChange={e => setSelected(p => ({ ...p, [it.id]: { ...p[it.id], quantity: Math.min(Number(it.quantity), Math.max(1, Number(e.target.value))) } }))}
                        className="w-20 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" />
                    </div>
                  ))}
                </div>
                <div><label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1">Reason</label>
                  <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" /></div>
              </>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
              <button onClick={submit} disabled={!foundInvoice} className="px-5 py-2 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40">Create Return</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
