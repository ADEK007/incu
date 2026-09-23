import { useEffect, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '../../lib/supabaseClient';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'sonner';
import { Edit2, Trash2, X, ChevronDown, ChevronUp, ArrowUp, ArrowDown, Plus } from 'lucide-react';

const AUDIENCES = ['all','admin','dealer','customer','farmer','team'] as const;
const AUDIENCE_COLORS: Record<string,string> = {
  all: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  admin: 'bg-red-50 text-red-600 border-red-200',
  dealer: 'bg-orange-50 text-orange-600 border-orange-200',
  customer: 'bg-blue-50 text-blue-600 border-blue-200',
  farmer: 'bg-green-50 text-green-600 border-green-200',
  team: 'bg-purple-50 text-purple-600 border-purple-200',
};

type Faq = { id: string; question: string; answer: string; audience: string; sort_order: number; is_active: boolean };

export default function FAQs() {
  const { profile } = useAuthStore();
  const tenantId = profile?.tenant_id ?? profile?.id ?? '';
  const [items, setItems] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('All');
  const [editing, setEditing] = useState<Partial<Faq> | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [quickQ, setQuickQ] = useState('');
  const [quickAud, setQuickAud] = useState('all');

  const load = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data } = await (supabase.from('faqs') as any).select('*').eq('tenant_id', tenantId).order('sort_order');
      setItems(data || []);
    } catch { toast.error('Failed to load FAQs'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tenantId]);

  const filtered = items.filter(f => filter === 'All' || f.audience === filter.toLowerCase());

  const save = async () => {
    if (!editing?.question) { toast.error('Question required'); return; }
    try {
      const payload: any = {
        tenant_id: tenantId, question: editing.question, answer: editing.answer || '',
        audience: editing.audience || 'all', sort_order: editing.sort_order ?? 0,
        is_active: editing.is_active ?? true,
      };
      if (editing.id) {
        await (supabase.from('faqs') as any).update(payload).eq('id', editing.id);
        toast.success('Updated');
      } else {
        await (supabase.from('faqs') as any).insert(payload);
        toast.success('Added');
      }
      setEditing(null); load();
    } catch (e: any) { toast.error(e.message || 'Save failed'); }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this FAQ?')) return;
    try { await (supabase.from('faqs') as any).delete().eq('id', id); load(); toast.success('Deleted'); }
    catch { toast.error('Delete failed'); }
  };

  const move = async (idx: number, dir: -1 | 1) => {
    const arr = [...items].sort((a,b) => a.sort_order - b.sort_order);
    const i = arr.findIndex(x => x.id === filtered[idx].id);
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    const a = arr[i], b = arr[j];
    try {
      await Promise.all([
        (supabase.from('faqs') as any).update({ sort_order: b.sort_order }).eq('id', a.id),
        (supabase.from('faqs') as any).update({ sort_order: a.sort_order }).eq('id', b.id),
      ]);
      load();
    } catch { toast.error('Reorder failed'); }
  };

  const quickAdd = async () => {
    if (!quickQ.trim()) return;
    const max = items.reduce((m, f) => Math.max(m, f.sort_order), 0);
    try {
      await (supabase.from('faqs') as any).insert({ tenant_id: tenantId, question: quickQ, answer: '', audience: quickAud, sort_order: max + 1, is_active: true });
      setQuickQ(''); load(); toast.success('Added');
    } catch { toast.error('Add failed'); }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex justify-between gap-4 flex-col sm:flex-row">
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-gray-900">FAQs</h1>
            <p className="text-gray-500 font-medium">Frequently asked questions and answers.</p>
          </div>
          <button onClick={() => setEditing({ audience: 'all', is_active: true, sort_order: items.length + 1 })}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black px-5 py-2.5 text-sm flex items-center gap-2 self-start">
            <Plus size={16} />New FAQ
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto">
          {['All','Admin','Dealer','Customer','Farmer','Team'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap ${filter === f ? 'bg-indigo-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{f}</button>
          ))}
        </div>

        {loading ? <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div> :
          filtered.length === 0 ? <div className="text-center py-12 text-gray-400 font-bold uppercase tracking-widest text-xs">No FAQs</div> : (
          <div className="space-y-3">
            {filtered.map((f, idx) => (
              <div key={f.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm">
                <button onClick={() => setExpanded(e => ({ ...e, [f.id]: !e[f.id] }))} className="w-full p-4 flex items-start gap-3 text-left">
                  <span className="text-xs font-mono font-black text-gray-400 w-6">{f.sort_order}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-gray-900">{f.question}</span>
                      <span className={`px-2 py-1 rounded-lg border text-xs font-bold ${AUDIENCE_COLORS[f.audience]}`}>{f.audience}</span>
                      {!f.is_active && <span className="px-2 py-1 rounded-lg border text-xs font-bold bg-gray-50 text-gray-500 border-gray-200">inactive</span>}
                    </div>
                  </div>
                  {expanded[f.id] ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                </button>
                {expanded[f.id] && (
                  <div className="px-4 pb-4 pl-12 space-y-3">
                    <p className="text-sm text-gray-700 font-medium whitespace-pre-wrap">{f.answer || <span className="text-gray-400 italic">No answer yet</span>}</p>
                    <div className="flex gap-1">
                      <button onClick={() => move(idx, -1)} className="p-2 rounded-lg text-gray-600 hover:bg-gray-50"><ArrowUp size={14} /></button>
                      <button onClick={() => move(idx, 1)} className="p-2 rounded-lg text-gray-600 hover:bg-gray-50"><ArrowDown size={14} /></button>
                      <button onClick={() => setEditing(f)} className="p-2 rounded-lg text-gray-600 hover:bg-gray-50"><Edit2 size={14} /></button>
                      <button onClick={() => remove(f.id)} className="p-2 rounded-lg text-red-400 hover:bg-red-50"><Trash2 size={14} /></button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Quick add */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row gap-2">
          <input value={quickQ} onChange={e => setQuickQ(e.target.value)} placeholder="Quick add question..." className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <select value={quickAud} onChange={e => setQuickAud(e.target.value)} className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium">
            {AUDIENCES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button onClick={quickAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black px-5 py-2.5 text-sm">Add FAQ</button>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-gray-900">{editing.id ? 'Edit' : 'New'} FAQ</h3>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:bg-gray-50 rounded-lg p-1"><X size={20} /></button>
            </div>
            <div><label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1">Question</label>
              <textarea rows={2} value={editing.question || ''} onChange={e => setEditing({ ...editing, question: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
            <div><label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1">Answer</label>
              <textarea rows={4} value={editing.answer || ''} onChange={e => setEditing({ ...editing, answer: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1">Audience</label>
                <select value={editing.audience || 'all'} onChange={e => setEditing({ ...editing, audience: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium">
                  {AUDIENCES.map(a => <option key={a} value={a}>{a}</option>)}
                </select></div>
              <div><label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1">Sort Order</label>
                <input type="number" value={editing.sort_order ?? 0} onChange={e => setEditing({ ...editing, sort_order: Number(e.target.value) })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium" /></div>
            </div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
              <input type="checkbox" checked={editing.is_active ?? true} onChange={e => setEditing({ ...editing, is_active: e.target.checked })} />Active
            </label>
            <div className="flex justify-end gap-2 pt-3">
              <button onClick={() => setEditing(null)} className="border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 px-4 py-2 text-sm">Cancel</button>
              <button onClick={save} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black px-5 py-2 text-sm">Save</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
