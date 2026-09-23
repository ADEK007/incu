import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '../../lib/supabaseClient';
import { useAuthStore } from '../../store/authStore';
import { formatPrice } from '../../utils/currency';
import { Plus, Edit2, Trash2, X, Trash } from 'lucide-react';
import { toast } from 'sonner';

interface Wastage { id: string; product_id: string | null; quantity: number; unit_cost: number; reason: string | null; wastage_date: string;
  product?: { name: string } | null; }
interface Product { id: string; name: string; cost_price: number; stock: number; }

const empty = { product_id: '', quantity: 1, unit_cost: 0, reason: '', wastage_date: new Date().toISOString().slice(0,10) };

export default function Wastage() {
  const { profile } = useAuthStore();
  const tenantId = profile?.tenant_id ?? profile?.id ?? '';
  const [items, setItems] = useState<Wastage[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [productSearch, setProductSearch] = useState('');

  const load = async () => {
    setLoading(true);
    const [{ data: w }, { data: p }] = await Promise.all([
      (supabase.from('wastage_records') as any).select('*, product:products(name)').eq('tenant_id', tenantId).order('wastage_date', { ascending: false }),
      (supabase.from('products') as any).select('id, name, cost_price, stock').order('name'),
    ]);
    setItems((w as Wastage[]) || []);
    setProducts((p as Product[]) || []);
    setLoading(false);
  };

  useEffect(() => { if (tenantId) load(); }, [tenantId]);

  const monthTotal = useMemo(() => {
    const now = new Date();
    const m = now.getMonth(); const y = now.getFullYear();
    return items.filter(x => {
      const d = new Date(x.wastage_date);
      return d.getMonth() === m && d.getFullYear() === y;
    }).reduce((s, x) => s + Number(x.quantity) * Number(x.unit_cost), 0);
  }, [items]);

  const productMatches = productSearch
    ? products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).slice(0, 8)
    : [];

  const openCreate = () => { setEditId(null); setForm(empty); setProductSearch(''); setModalOpen(true); };
  const openEdit = (w: Wastage) => {
    setEditId(w.id);
    setForm({ product_id: w.product_id || '', quantity: Number(w.quantity), unit_cost: Number(w.unit_cost), reason: w.reason || '', wastage_date: w.wastage_date });
    setProductSearch(w.product?.name || '');
    setModalOpen(true);
  };

  const pickProduct = (p: Product) => {
    setForm({ ...form, product_id: p.id, unit_cost: Number(p.cost_price) });
    setProductSearch(p.name);
  };

  const save = async () => {
    if (editId) {
      const { error } = await (supabase.from('wastage_records') as any).update({
        quantity: form.quantity, reason: form.reason,
      }).eq('id', editId);
      if (error) { toast.error(error.message); return; }
    } else {
      if (!form.product_id) { toast.error('Select a product'); return; }
      const { data: inserted, error } = await (supabase.from('wastage_records') as any).insert({
        tenant_id: tenantId, product_id: form.product_id, quantity: form.quantity,
        unit_cost: form.unit_cost, reason: form.reason, wastage_date: form.wastage_date,
      }).select('id').maybeSingle();
      if (error) { toast.error(error.message); return; }
      await (supabase.from('stock_movements') as any).insert({
        tenant_id: tenantId, product_id: form.product_id, movement_type: 'wastage',
        quantity: form.quantity, reference_id: (inserted as any)?.id,
      });
      const prod = products.find(p => p.id === form.product_id);
      if (prod) {
        await (supabase.from('products') as any).update({ stock: Math.max(0, Number(prod.stock) - Number(form.quantity)) }).eq('id', prod.id);
      }
    }
    toast.success(editId ? 'Updated' : 'Recorded'); setModalOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this wastage record?')) return;
    const { error } = await (supabase.from('wastage_records') as any).delete().eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Deleted'); load(); }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-gray-900 dark:text-white">Wastage</h1>
            <p className="text-gray-500 font-medium">Record product loss and damage.</p>
          </div>
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-sm">
            <Plus size={16} /> Add Wastage
          </button>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-400">This month's wastage</p>
            <p className="text-3xl font-black text-red-600 mt-1">{formatPrice(monthTotal, 'Bangladesh')}</p>
          </div>
          <Trash size={40} className="text-red-200" />
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>
          ) : items.length === 0 ? (
            <div className="py-20 text-center text-gray-500"><Trash size={40} className="mx-auto mb-3 opacity-30" />No wastage records.</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 text-xs font-black text-gray-500 uppercase tracking-widest">
                <tr><th className="px-5 py-3 text-left">Product</th><th className="px-5 py-3 text-left">Quantity</th><th className="px-5 py-3 text-left">Unit Cost</th><th className="px-5 py-3 text-left">Total</th><th className="px-5 py-3 text-left">Reason</th><th className="px-5 py-3 text-left">Date</th><th className="px-5 py-3 text-right">Actions</th></tr>
              </thead>
              <tbody>
                {items.map(w => (
                  <tr key={w.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="px-5 py-3 font-bold text-gray-900 dark:text-white">{w.product?.name || '—'}</td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{w.quantity}</td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{formatPrice(Number(w.unit_cost), 'Bangladesh')}</td>
                    <td className="px-5 py-3 font-bold text-gray-900 dark:text-white">{formatPrice(Number(w.quantity) * Number(w.unit_cost), 'Bangladesh')}</td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300 truncate max-w-[200px]">{w.reason || '—'}</td>
                    <td className="px-5 py-3 text-xs text-gray-500">{new Date(w.wastage_date).toLocaleDateString()}</td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => openEdit(w)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit2 size={14} /></button>
                      <button onClick={() => remove(w.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setModalOpen(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-6 space-y-4 border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-900 dark:text-white">{editId ? 'Edit' : 'Add'} Wastage</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            {!editId && (
              <div className="relative">
                <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1">Product *</label>
                <input value={productSearch} onChange={e => { setProductSearch(e.target.value); setForm({ ...form, product_id: '' }); }} placeholder="Search product..." className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" />
                {!form.product_id && productMatches.length > 0 && (
                  <div className="absolute z-10 left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                    {productMatches.map(p => (
                      <button key={p.id} type="button" onClick={() => pickProduct(p)} className="w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 dark:hover:bg-indigo-950/30">{p.name} <span className="text-xs text-gray-500">(stock {p.stock})</span></button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1">Quantity</label><input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: Number(e.target.value) })} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" /></div>
              <div><label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1">Unit Cost</label><input type="number" value={form.unit_cost} disabled={!!editId} onChange={e => setForm({ ...form, unit_cost: Number(e.target.value) })} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm disabled:opacity-60" /></div>
            </div>
            <div><label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1">Reason</label><textarea value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" /></div>
            {!editId && <div><label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1">Date</label><input type="date" value={form.wastage_date} onChange={e => setForm({ ...form, wastage_date: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" /></div>}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
              <button onClick={save} className="px-5 py-2 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white">Save</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
