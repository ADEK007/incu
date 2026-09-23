import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '../../lib/supabaseClient';
import { useAuthStore } from '../../store/authStore';
import { formatPrice } from '../../utils/currency';
import { Plus, Edit2, Trash2, X, Receipt } from 'lucide-react';
import { toast } from 'sonner';

interface Sector { id: string; name: string; code: string | null; allocation_percent: number; description: string | null; parent_id: string | null; is_active: boolean; }
interface Expense { id: string; title: string; amount: number; expense_date: string; sector_id: string | null; description: string | null; receipt_url: string | null; }

const emptyExp = { title: '', amount: 0, expense_date: new Date().toISOString().slice(0,10), sector_id: '', description: '', receipt_url: '' };
const emptySec = { name: '', code: '', allocation_percent: 0, description: '', parent_id: '' };

export default function Expenses() {
  const { profile } = useAuthStore();
  const tenantId = profile?.tenant_id ?? profile?.id ?? '';
  const [tab, setTab] = useState<'expenses' | 'sectors'>('expenses');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSector, setFilterSector] = useState('');
  const [from, setFrom] = useState(''); const [to, setTo] = useState('');

  const [expModal, setExpModal] = useState(false);
  const [expEditId, setExpEditId] = useState<string | null>(null);
  const [expForm, setExpForm] = useState(emptyExp);

  const [secModal, setSecModal] = useState(false);
  const [secEditId, setSecEditId] = useState<string | null>(null);
  const [secForm, setSecForm] = useState(emptySec);

  const load = async () => {
    setLoading(true);
    const [{ data: e }, { data: s }] = await Promise.all([
      (supabase.from('expenses') as any).select('*').eq('tenant_id', tenantId).is('deleted_at', null).order('expense_date', { ascending: false }),
      (supabase.from('expense_sectors') as any).select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
    ]);
    setExpenses((e as Expense[]) || []);
    setSectors((s as Sector[]) || []);
    setLoading(false);
  };

  useEffect(() => { if (tenantId) load(); }, [tenantId]);

  const filteredExp = useMemo(() => expenses.filter(x => {
    if (filterSector && x.sector_id !== filterSector) return false;
    if (from && x.expense_date < from) return false;
    if (to && x.expense_date > to) return false;
    return true;
  }), [expenses, filterSector, from, to]);

  const total = filteredExp.reduce((s, x) => s + Number(x.amount), 0);
  const totalAlloc = sectors.reduce((s, x) => s + Number(x.allocation_percent), 0);
  const sectorName = (id: string | null) => sectors.find(s => s.id === id)?.name || '—';

  // Expense actions
  const openExpCreate = () => { setExpEditId(null); setExpForm(emptyExp); setExpModal(true); };
  const openExpEdit = (e: Expense) => {
    setExpEditId(e.id);
    setExpForm({ title: e.title, amount: Number(e.amount), expense_date: e.expense_date, sector_id: e.sector_id || '', description: e.description || '', receipt_url: e.receipt_url || '' });
    setExpModal(true);
  };
  const saveExp = async () => {
    if (!expForm.title.trim() || !expForm.amount) { toast.error('Title and amount required'); return; }
    const payload: any = { ...expForm, sector_id: expForm.sector_id || null, tenant_id: tenantId };
    const res = expEditId
      ? await (supabase.from('expenses') as any).update(payload).eq('id', expEditId)
      : await (supabase.from('expenses') as any).insert(payload);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success(expEditId ? 'Updated' : 'Added'); setExpModal(false); load();
  };
  const removeExp = async (id: string) => {
    if (!confirm('Delete expense?')) return;
    const { error } = await (supabase.from('expenses') as any).update({ deleted_at: new Date().toISOString() }).eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Deleted'); load(); }
  };

  // Sector actions
  const openSecCreate = () => { setSecEditId(null); setSecForm(emptySec); setSecModal(true); };
  const openSecEdit = (s: Sector) => {
    setSecEditId(s.id);
    setSecForm({ name: s.name, code: s.code || '', allocation_percent: Number(s.allocation_percent), description: s.description || '', parent_id: s.parent_id || '' });
    setSecModal(true);
  };
  const saveSec = async () => {
    if (!secForm.name.trim()) { toast.error('Name required'); return; }
    const payload: any = { ...secForm, parent_id: secForm.parent_id || null, tenant_id: tenantId };
    const res = secEditId
      ? await (supabase.from('expense_sectors') as any).update(payload).eq('id', secEditId)
      : await (supabase.from('expense_sectors') as any).insert(payload);
    if (res.error) { toast.error(res.error.message); return; }
    toast.success(secEditId ? 'Updated' : 'Added'); setSecModal(false); load();
  };
  const toggleSec = async (s: Sector) => {
    const { error } = await (supabase.from('expense_sectors') as any).update({ is_active: !s.is_active }).eq('id', s.id);
    if (error) toast.error(error.message); else load();
  };
  const removeSec = async (id: string) => {
    if (!confirm('Delete sector?')) return;
    const { error } = await (supabase.from('expense_sectors') as any).delete().eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Deleted'); load(); }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white">Expenses</h1>
          <p className="text-gray-500 font-medium">Track spending and budget allocation.</p>
        </div>

        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-800">
          {(['expenses','sectors'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-5 py-2.5 text-sm font-black uppercase tracking-wider ${tab === t ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-400'}`}>{t}</button>
          ))}
        </div>

        {tab === 'expenses' && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-3 items-end">
              <select value={filterSector} onChange={e => setFilterSector(e.target.value)} className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm">
                <option value="">All sectors</option>
                {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" />
              <input type="date" value={to} onChange={e => setTo(e.target.value)} className="px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" />
              <button onClick={openExpCreate} className="ml-auto inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm">
                <Plus size={16} /> Add Expense
              </button>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>
              ) : filteredExp.length === 0 ? (
                <div className="py-20 text-center text-gray-500"><Receipt size={40} className="mx-auto mb-3 opacity-30" />No expenses.</div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800 text-xs font-black text-gray-500 uppercase tracking-widest">
                    <tr><th className="px-5 py-3 text-left">Title</th><th className="px-5 py-3 text-left">Sector</th><th className="px-5 py-3 text-left">Amount</th><th className="px-5 py-3 text-left">Date</th><th className="px-5 py-3 text-left">Description</th><th className="px-5 py-3 text-right">Actions</th></tr>
                  </thead>
                  <tbody>
                    {filteredExp.map(e => (
                      <tr key={e.id} className="border-t border-gray-100 dark:border-gray-800">
                        <td className="px-5 py-3 font-bold text-gray-900 dark:text-white">{e.title}</td>
                        <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{sectorName(e.sector_id)}</td>
                        <td className="px-5 py-3 font-bold text-gray-900 dark:text-white">{formatPrice(Number(e.amount), 'Bangladesh')}</td>
                        <td className="px-5 py-3 text-gray-500 text-xs">{new Date(e.expense_date).toLocaleDateString()}</td>
                        <td className="px-5 py-3 text-gray-500 truncate max-w-[200px]">{e.description || '—'}</td>
                        <td className="px-5 py-3 text-right">
                          <button onClick={() => openExpEdit(e)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit2 size={14} /></button>
                          <button onClick={() => removeExp(e.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end items-center gap-3 bg-gray-50/50 dark:bg-gray-800/30">
                <span className="text-xs font-black uppercase tracking-widest text-gray-500">Total</span>
                <span className="text-xl font-black text-gray-900 dark:text-white">{formatPrice(total, 'Bangladesh')}</span>
              </div>
            </div>
          </div>
        )}

        {tab === 'sectors' && (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button onClick={openSecCreate} className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm">
                <Plus size={16} /> Add Sector
              </button>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sectors.map(s => (
                  <div key={s.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-black text-gray-900 dark:text-white">{s.name}</h3>
                        <p className="text-xs text-gray-500">{s.code || '—'}</p>
                      </div>
                      <button onClick={() => toggleSec(s)} className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{s.is_active ? 'Active' : 'Inactive'}</button>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">{s.description || '—'}</p>
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1"><span>Allocation</span><span className="font-bold">{s.allocation_percent}%</span></div>
                      <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                        <div className="h-full bg-indigo-600" style={{ width: `${Math.min(100, Number(s.allocation_percent))}%` }} />
                      </div>
                    </div>
                    <div className="flex justify-end gap-1 pt-2">
                      <button onClick={() => openSecEdit(s)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit2 size={14} /></button>
                      <button onClick={() => removeSec(s.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className={`px-5 py-4 rounded-2xl ${totalAlloc === 100 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'} font-bold text-sm`}>
              Total allocation: {totalAlloc}% {totalAlloc !== 100 && '(should equal 100%)'}
            </div>
          </div>
        )}
      </div>

      {expModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setExpModal(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-6 space-y-4 border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-900 dark:text-white">{expEditId ? 'Edit' : 'Add'} Expense</h2>
              <button onClick={() => setExpModal(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div><label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1">Title *</label><input value={expForm.title} onChange={e => setExpForm({ ...expForm, title: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1">Amount *</label><input type="number" value={expForm.amount} onChange={e => setExpForm({ ...expForm, amount: Number(e.target.value) })} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" /></div>
              <div><label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1">Date</label><input type="date" value={expForm.expense_date} onChange={e => setExpForm({ ...expForm, expense_date: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" /></div>
            </div>
            <div><label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1">Sector</label><select value={expForm.sector_id} onChange={e => setExpForm({ ...expForm, sector_id: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"><option value="">— None —</option>{sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div><label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1">Description</label><textarea value={expForm.description} onChange={e => setExpForm({ ...expForm, description: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" /></div>
            <div><label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1">Receipt URL</label><input value={expForm.receipt_url} onChange={e => setExpForm({ ...expForm, receipt_url: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" /></div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setExpModal(false)} className="px-4 py-2 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
              <button onClick={saveExp} className="px-5 py-2 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white">Save</button>
            </div>
          </div>
        </div>
      )}

      {secModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setSecModal(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-white dark:bg-gray-900 rounded-2xl max-w-md w-full p-6 space-y-4 border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-900 dark:text-white">{secEditId ? 'Edit' : 'Add'} Sector</h2>
              <button onClick={() => setSecModal(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <div><label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1">Name *</label><input value={secForm.name} onChange={e => setSecForm({ ...secForm, name: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1">Code</label><input value={secForm.code} onChange={e => setSecForm({ ...secForm, code: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" /></div>
              <div><label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1">Allocation %</label><input type="number" value={secForm.allocation_percent} onChange={e => setSecForm({ ...secForm, allocation_percent: Number(e.target.value) })} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" /></div>
            </div>
            <div><label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1">Description</label><textarea value={secForm.description} onChange={e => setSecForm({ ...secForm, description: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm" /></div>
            <div><label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1">Parent Sector</label><select value={secForm.parent_id} onChange={e => setSecForm({ ...secForm, parent_id: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm"><option value="">— None —</option>{sectors.filter(s => s.id !== secEditId).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setSecModal(false)} className="px-4 py-2 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800">Cancel</button>
              <button onClick={saveSec} className="px-5 py-2 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-700 text-white">Save</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
