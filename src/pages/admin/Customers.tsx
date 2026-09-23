import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '../../lib/supabaseClient';
import { useAuthStore } from '../../store/authStore';
import { formatPrice } from '../../utils/currency';
import { Plus, Search, Edit2, Trash2, X, Users } from 'lucide-react';
import { toast } from 'sonner';

interface Customer {
  id: string; name: string; phone: string | null; email: string | null;
  address: string | null; notes: string | null; created_at: string;
}
interface Invoice { id: string; invoice_number: string; total_amount: number; status: string; invoice_date: string; }

const STATUS_COLOR: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  cancelled: 'bg-red-100 text-red-700',
  refunded: 'bg-gray-100 text-gray-700',
};

const empty = { name: '', phone: '', email: '', address: '', notes: '' };

export default function Customers() {
  const { profile } = useAuthStore();
  const tenantId = profile?.tenant_id ?? profile?.id ?? '';
  const [items, setItems] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase.from('customers') as any)
      .select('*').eq('tenant_id', tenantId).is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) toast.error(error.message); else setItems((data as Customer[]) || []);
    setLoading(false);
  };

  useEffect(() => { if (tenantId) load(); }, [tenantId]);

  useEffect(() => {
    if (!selected) { setInvoices([]); return; }
    (async () => {
      const { data } = await (supabase.from('invoices') as any)
        .select('id, invoice_number, total_amount, status, invoice_date')
        .eq('customer_id', selected.id).order('invoice_date', { ascending: false });
      setInvoices((data as Invoice[]) || []);
    })();
  }, [selected?.id]);

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();
    if (!s) return items;
    return items.filter(c => c.name.toLowerCase().includes(s) || (c.phone || '').toLowerCase().includes(s));
  }, [items, search]);

  const openCreate = () => { setEditId(null); setForm(empty); setModalOpen(true); };
  const openEdit = (c: Customer) => {
    setEditId(c.id);
    setForm({ name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '', notes: c.notes || '' });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    const payload = { ...form, tenant_id: tenantId };
    const res = editId
      ? await (supabase.from('customers') as any).update(payload).eq('id', editId)
      : await (supabase.from('customers') as any).insert(payload);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success(editId ? 'Customer updated' : 'Customer added');
    setModalOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this customer?')) return;
    const { error } = await (supabase.from('customers') as any).update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Deleted'); load(); if (selected?.id === id) setSelected(null); }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-gray-900 dark:text-white">Customers</h1>
            <p className="text-gray-500 font-medium">Manage your customer directory.</p>
          </div>
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-sm transition">
            <Plus size={16} /> Add Customer
          </button>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or phone..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:border-indigo-500" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden ${selected ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center text-gray-500">
                <Users size={40} className="mx-auto mb-3 opacity-30" />
                No customers yet.
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800 text-xs font-black text-gray-500 uppercase tracking-widest">
                  <tr>
                    <th className="px-5 py-3 text-left">Name</th>
                    <th className="px-5 py-3 text-left">Phone</th>
                    <th className="px-5 py-3 text-left">Email</th>
                    <th className="px-5 py-3 text-left">Address</th>
                    <th className="px-5 py-3 text-left">Joined</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((c) => (
                    <tr key={c.id} onClick={() => setSelected(c)}
                      className={`border-t border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 ${selected?.id === c.id ? 'bg-indigo-50/60 dark:bg-indigo-950/30' : ''}`}>
                      <td className="px-5 py-3 font-bold text-gray-900 dark:text-white">{c.name}</td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{c.phone || '—'}</td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{c.email || '—'}</td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-300 truncate max-w-[160px]">{c.address || '—'}</td>
                      <td className="px-5 py-3 text-gray-500 text-xs">{new Date(c.created_at).toLocaleDateString()}</td>
                      <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => openEdit(c)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit2 size={14} /></button>
                        <button onClick={() => remove(c.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {selected && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-6 space-y-4 h-fit sticky top-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white">{selected.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">Customer details</p>
                </div>
                <button onClick={() => setSelected(null)} className="p-1 text-gray-400 hover:text-gray-600"><X size={16} /></button>
              </div>
              <div className="text-sm space-y-2 text-gray-600 dark:text-gray-300">
                <div><span className="font-bold text-gray-900 dark:text-white">Phone:</span> {selected.phone || '—'}</div>
                <div><span className="font-bold text-gray-900 dark:text-white">Email:</span> {selected.email || '—'}</div>
                <div><span className="font-bold text-gray-900 dark:text-white">Address:</span> {selected.address || '—'}</div>
                <div><span className="font-bold text-gray-900 dark:text-white">Notes:</span> {selected.notes || '—'}</div>
              </div>
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">Invoice History</h4>
                {invoices.length === 0 ? (
                  <p className="text-sm text-gray-400">No invoices yet.</p>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {invoices.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm">
                        <div>
                          <div className="font-bold text-gray-900 dark:text-white">{inv.invoice_number}</div>
                          <div className="text-xs text-gray-500">{new Date(inv.invoice_date).toLocaleDateString()}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-gray-900 dark:text-white">{formatPrice(Number(inv.total_amount), 'Bangladesh')}</div>
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${STATUS_COLOR[inv.status] || 'bg-gray-100 text-gray-700'}`}>{inv.status}</span>
                        </div>
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
          <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-6 space-y-4 border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-900 dark:text-white">{editId ? 'Edit' : 'Add'} Customer</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            {(['name','phone','email','address','notes'] as const).map(k => (
              <div key={k}>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1">{k}{k==='name'?' *':''}</label>
                {k === 'notes' || k === 'address' ? (
                  <textarea value={(form as any)[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:border-indigo-500" rows={2} />
                ) : (
                  <input value={(form as any)[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:border-indigo-500" />
                )}
              </div>
            ))}
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
