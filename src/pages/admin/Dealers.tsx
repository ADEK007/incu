import { useEffect, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '../../lib/supabaseClient';
import { useAuthStore } from '../../store/authStore';
import { Plus, Edit2, Trash2, X, Users } from 'lucide-react';
import { toast } from 'sonner';

interface Dealer {
  id: string; user_id: string | null; name: string; phone: string | null; email: string | null;
  commission_rate: number; commission_type: 'percent' | 'fixed'; is_active: boolean;
  farmer_count?: number;
}

const empty = { name: '', phone: '', email: '', commission_rate: 0, commission_type: 'percent' as 'percent' | 'fixed' };

export default function Dealers() {
  const { profile } = useAuthStore();
  const tenantId = profile?.tenant_id ?? profile?.id ?? '';
  const [items, setItems] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [lookupMsg, setLookupMsg] = useState('');

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase.from('dealers') as any)
      .select('*').eq('tenant_id', tenantId).is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (error) { toast.error(error.message); setLoading(false); return; }
    const dealers = (data as Dealer[]) || [];
    const { data: farmers } = await (supabase.from('farmers') as any)
      .select('dealer_id').eq('tenant_id', tenantId).is('deleted_at', null);
    const counts: Record<string, number> = {};
    ((farmers as any[]) || []).forEach((f) => { if (f.dealer_id) counts[f.dealer_id] = (counts[f.dealer_id] || 0) + 1; });
    setItems(dealers.map(d => ({ ...d, farmer_count: counts[d.id] || 0 })));
    setLoading(false);
  };

  useEffect(() => { if (tenantId) load(); }, [tenantId]);

  const openCreate = () => { setEditId(null); setForm(empty); setLookupMsg(''); setModalOpen(true); };
  const openEdit = (d: Dealer) => {
    setEditId(d.id);
    setForm({ name: d.name, phone: d.phone || '', email: d.email || '', commission_rate: Number(d.commission_rate), commission_type: d.commission_type });
    setLookupMsg(''); setModalOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    if (editId) {
      const { error } = await (supabase.from('dealers') as any).update({
        name: form.name, phone: form.phone, email: form.email,
        commission_rate: form.commission_rate, commission_type: form.commission_type,
      }).eq('id', editId);
      if (error) { toast.error(error.message); return; }
    } else {
      // lookup profile by email
      let userId: string | null = null;
      if (form.email) {
        const { data: prof } = await (supabase.from('profiles') as any)
          .select('id').eq('email', form.email).maybeSingle();
        if (!prof) { setLookupMsg('User must register first then you can assign as dealer'); return; }
        userId = (prof as any).id;
      }
      const { error } = await (supabase.from('dealers') as any).insert({
        tenant_id: tenantId, user_id: userId, name: form.name, phone: form.phone, email: form.email,
        commission_rate: form.commission_rate, commission_type: form.commission_type, is_active: true,
      });
      if (error) { toast.error(error.message); return; }
      if (userId) {
        await (supabase.from('user_roles') as any).insert({ user_id: userId, role: 'dealer' });
      }
    }
    toast.success(editId ? 'Dealer updated' : 'Dealer added');
    setModalOpen(false); load();
  };

  const toggleActive = async (d: Dealer) => {
    const { error } = await (supabase.from('dealers') as any).update({ is_active: !d.is_active }).eq('id', d.id);
    if (error) toast.error(error.message); else { toast.success('Updated'); load(); }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this dealer?')) return;
    const { error } = await (supabase.from('dealers') as any).update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Deleted'); load(); }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-gray-900 dark:text-white">Dealers</h1>
            <p className="text-gray-500 font-medium">Manage dealers and their commissions.</p>
          </div>
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-sm">
            <Plus size={16} /> Add Dealer
          </button>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>
          ) : items.length === 0 ? (
            <div className="py-20 text-center text-gray-500"><Users size={40} className="mx-auto mb-3 opacity-30" />No dealers yet.</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 text-xs font-black text-gray-500 uppercase tracking-widest">
                <tr>
                  <th className="px-5 py-3 text-left">Name</th>
                  <th className="px-5 py-3 text-left">Phone</th>
                  <th className="px-5 py-3 text-left">Email</th>
                  <th className="px-5 py-3 text-left">Commission</th>
                  <th className="px-5 py-3 text-left">Farmers</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(d => (
                  <tr key={d.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="px-5 py-3 font-bold text-gray-900 dark:text-white">{d.name}</td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{d.phone || '—'}</td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{d.email || '—'}</td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{d.commission_rate}{d.commission_type === 'percent' ? '%' : ' (fixed)'}</td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{d.farmer_count}</td>
                    <td className="px-5 py-3">
                      <button onClick={() => toggleActive(d)} className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${d.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {d.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => openEdit(d)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit2 size={14} /></button>
                      <button onClick={() => remove(d.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
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
          <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-6 space-y-4 border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-900 dark:text-white">{editId ? 'Edit' : 'Add'} Dealer</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div><label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1">Name *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:border-indigo-500" /></div>
            <div><label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1">Phone</label>
              <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:border-indigo-500" /></div>
            <div><label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1">Email (registered user)</label>
              <input value={form.email} onChange={e => { setForm({ ...form, email: e.target.value }); setLookupMsg(''); }} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:border-indigo-500" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1">Commission</label>
                <input type="number" value={form.commission_rate} onChange={e => setForm({ ...form, commission_rate: Number(e.target.value) })} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:border-indigo-500" /></div>
              <div><label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1">Type</label>
                <select value={form.commission_type} onChange={e => setForm({ ...form, commission_type: e.target.value as any })} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:border-indigo-500">
                  <option value="percent">Percent</option><option value="fixed">Fixed</option>
                </select></div>
            </div>
            {lookupMsg && <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-xl p-3">{lookupMsg}</p>}
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
