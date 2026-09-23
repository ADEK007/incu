import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '../../lib/supabaseClient';
import { useAuthStore } from '../../store/authStore';
import { Plus, Edit2, Trash2, X, Leaf } from 'lucide-react';
import { toast } from 'sonner';

interface Farmer {
  id: string; name: string; phone: string | null; email: string | null;
  address: string | null; dealer_id: string | null; is_active: boolean;
}
interface Dealer { id: string; name: string; }
interface Assignment { device: { id: string; serial_number: string; status: string; last_seen: string | null } | null }

const empty = { name: '', phone: '', email: '', address: '', dealer_id: '' };

export default function Farmers() {
  const { profile } = useAuthStore();
  const tenantId = profile?.tenant_id ?? profile?.id ?? '';
  const [items, setItems] = useState<Farmer[]>([]);
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [filterDealer, setFilterDealer] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [selected, setSelected] = useState<Farmer | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const load = async () => {
    setLoading(true);
    const [{ data: f, error }, { data: d }] = await Promise.all([
      (supabase.from('farmers') as any).select('*').eq('tenant_id', tenantId).is('deleted_at', null).order('created_at', { ascending: false }),
      (supabase.from('dealers') as any).select('id, name').eq('tenant_id', tenantId).is('deleted_at', null),
    ]);
    if (error) toast.error(error.message);
    setItems((f as Farmer[]) || []);
    setDealers((d as Dealer[]) || []);
    setLoading(false);
  };

  useEffect(() => { if (tenantId) load(); }, [tenantId]);

  useEffect(() => {
    if (!selected) { setAssignments([]); return; }
    (async () => {
      const { data } = await (supabase.from('device_assignments') as any)
        .select('device:devices(id, serial_number, status, last_seen)')
        .eq('farmer_id', selected.id).is('unassigned_at', null);
      setAssignments((data as Assignment[]) || []);
    })();
  }, [selected?.id]);

  const dealerName = (id: string | null) => dealers.find(d => d.id === id)?.name || '—';
  const filtered = useMemo(() => filterDealer ? items.filter(i => i.dealer_id === filterDealer) : items, [items, filterDealer]);

  const openCreate = () => { setEditId(null); setForm(empty); setModalOpen(true); };
  const openEdit = (f: Farmer) => {
    setEditId(f.id);
    setForm({ name: f.name, phone: f.phone || '', email: f.email || '', address: f.address || '', dealer_id: f.dealer_id || '' });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    const payload: any = { ...form, dealer_id: form.dealer_id || null, tenant_id: tenantId };
    const res = editId
      ? await (supabase.from('farmers') as any).update(payload).eq('id', editId)
      : await (supabase.from('farmers') as any).insert(payload);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success(editId ? 'Updated' : 'Added'); setModalOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete farmer?')) return;
    const { error } = await (supabase.from('farmers') as any).update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Deleted'); load(); if (selected?.id === id) setSelected(null); }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-gray-900 dark:text-white">Farmers</h1>
            <p className="text-gray-500 font-medium">Manage farmer accounts and dealer assignments.</p>
          </div>
          <div className="flex gap-3">
            <select value={filterDealer} onChange={e => setFilterDealer(e.target.value)} className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm">
              <option value="">All dealers</option>
              {dealers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <button onClick={openCreate} className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-sm">
              <Plus size={16} /> Add Farmer
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className={`bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden ${selected ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            {loading ? (
              <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center text-gray-500"><Leaf size={40} className="mx-auto mb-3 opacity-30" />No farmers yet.</div>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800 text-xs font-black text-gray-500 uppercase tracking-widest">
                  <tr>
                    <th className="px-5 py-3 text-left">Name</th>
                    <th className="px-5 py-3 text-left">Phone</th>
                    <th className="px-5 py-3 text-left">Email</th>
                    <th className="px-5 py-3 text-left">Dealer</th>
                    <th className="px-5 py-3 text-left">Status</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(f => (
                    <tr key={f.id} onClick={() => setSelected(f)} className={`border-t border-gray-100 dark:border-gray-800 cursor-pointer hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 ${selected?.id === f.id ? 'bg-indigo-50/60 dark:bg-indigo-950/30' : ''}`}>
                      <td className="px-5 py-3 font-bold text-gray-900 dark:text-white">{f.name}</td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{f.phone || '—'}</td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{f.email || '—'}</td>
                      <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{dealerName(f.dealer_id)}</td>
                      <td className="px-5 py-3">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${f.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{f.is_active ? 'Active' : 'Inactive'}</span>
                      </td>
                      <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => openEdit(f)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit2 size={14} /></button>
                        <button onClick={() => remove(f.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
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
                  <p className="text-xs text-gray-500 mt-1">Farmer details</p>
                </div>
                <button onClick={() => setSelected(null)} className="p-1 text-gray-400 hover:text-gray-600"><X size={16} /></button>
              </div>
              <div className="text-sm space-y-2 text-gray-600 dark:text-gray-300">
                <div><span className="font-bold text-gray-900 dark:text-white">Phone:</span> {selected.phone || '—'}</div>
                <div><span className="font-bold text-gray-900 dark:text-white">Email:</span> {selected.email || '—'}</div>
                <div><span className="font-bold text-gray-900 dark:text-white">Address:</span> {selected.address || '—'}</div>
                <div><span className="font-bold text-gray-900 dark:text-white">Dealer:</span> {dealerName(selected.dealer_id)}</div>
              </div>
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                <h4 className="text-xs font-black uppercase tracking-widest text-gray-500 mb-3">Assigned Devices</h4>
                {assignments.length === 0 ? <p className="text-sm text-gray-400">No devices assigned.</p> : (
                  <div className="space-y-2">
                    {assignments.map((a, i) => a.device && (
                      <div key={i} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 text-sm">
                        <div className="font-bold text-gray-900 dark:text-white">{a.device.serial_number}</div>
                        <div className="text-xs text-gray-500">Status: {a.device.status} · Last seen: {a.device.last_seen ? new Date(a.device.last_seen).toLocaleString() : '—'}</div>
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
          <div onClick={e => e.stopPropagation()} className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-6 space-y-4 border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-900 dark:text-white">{editId ? 'Edit' : 'Add'} Farmer</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            {(['name','phone','email','address'] as const).map(k => (
              <div key={k}>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1">{k}{k==='name'?' *':''}</label>
                <input value={(form as any)[k]} onChange={e => setForm({ ...form, [k]: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1">Dealer</label>
              <select value={form.dealer_id} onChange={e => setForm({ ...form, dealer_id: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm">
                <option value="">— None —</option>
                {dealers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
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
