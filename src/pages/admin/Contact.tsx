import { useEffect, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '../../lib/supabaseClient';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'sonner';
import { Info, Phone, Mail, Globe, MapPin, Edit2, Trash2, X, Plus, Sparkles } from 'lucide-react';

const TYPE_ICONS: Record<string, any> = { text: Info, phone: Phone, email: Mail, url: Globe, address: MapPin };
const TYPES = ['text', 'phone', 'email', 'url', 'address'] as const;

type Contact = { id: string; label: string; value: string; type: string; sort_order: number; is_active: boolean };

export default function Contact() {
  const { profile } = useAuthStore();
  const tenantId = profile?.tenant_id ?? profile?.id ?? '';
  const [items, setItems] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Partial<Contact> | null>(null);

  const load = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data } = await (supabase.from('contact_info') as any).select('*').eq('tenant_id', tenantId).order('sort_order');
      setItems(data || []);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tenantId]);

  const save = async () => {
    if (!editing?.label || !editing?.value) { toast.error('Label and value required'); return; }
    try {
      const payload: any = {
        tenant_id: tenantId, label: editing.label, value: editing.value,
        type: editing.type || 'text', sort_order: editing.sort_order ?? 0, is_active: editing.is_active ?? true,
      };
      if (editing.id) await (supabase.from('contact_info') as any).update(payload).eq('id', editing.id);
      else await (supabase.from('contact_info') as any).insert(payload);
      toast.success('Saved'); setEditing(null); load();
    } catch (e: any) { toast.error(e.message || 'Save failed'); }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete?')) return;
    try { await (supabase.from('contact_info') as any).delete().eq('id', id); load(); toast.success('Deleted'); }
    catch { toast.error('Delete failed'); }
  };

  const toggle = async (c: Contact) => {
    try { await (supabase.from('contact_info') as any).update({ is_active: !c.is_active }).eq('id', c.id); load(); }
    catch { toast.error('Toggle failed'); }
  };

  const seed = async () => {
    if (items.length > 0) { toast.error('Already has contacts'); return; }
    const defaults = [
      { label: 'Phone', value: '+880 1700 000000', type: 'phone', sort_order: 1 },
      { label: 'Email', value: 'info@incutech.com', type: 'email', sort_order: 2 },
      { label: 'Website', value: 'https://incutech.com', type: 'url', sort_order: 3 },
      { label: 'Office Address', value: 'Dhaka, Bangladesh', type: 'address', sort_order: 4 },
    ];
    try {
      await (supabase.from('contact_info') as any).insert(defaults.map(d => ({ ...d, tenant_id: tenantId, is_active: true })));
      toast.success('Default contacts added'); load();
    } catch { toast.error('Failed to seed'); }
  };

  const active = items.filter(c => c.is_active);

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex justify-between gap-4 flex-col sm:flex-row">
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-gray-900">Contact</h1>
            <p className="text-gray-500 font-medium">Public contact information shown to your users.</p>
          </div>
          <div className="flex gap-2 self-start">
            {items.length === 0 && <button onClick={seed} className="border border-indigo-200 text-indigo-600 hover:bg-indigo-50 rounded-xl font-bold px-4 py-2.5 text-sm flex items-center gap-2"><Sparkles size={14} />Add Defaults</button>}
            <button onClick={() => setEditing({ type: 'text', is_active: true, sort_order: items.length + 1 })}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black px-5 py-2.5 text-sm flex items-center gap-2">
              <Plus size={16} />New Entry
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Live Preview</p>
          {active.length === 0 ? <p className="text-sm text-gray-400 font-medium">No active contact entries yet.</p> : (
            <div className="space-y-3">
              {active.map(c => {
                const Icon = TYPE_ICONS[c.type] || Info;
                return (
                  <div key={c.id} className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600"><Icon size={18} /></div>
                    <div className="flex-1">
                      <p className="text-xs font-bold text-gray-500 uppercase">{c.label}</p>
                      <p className="font-bold text-gray-900">{c.value}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {loading ? <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div> :
          items.length === 0 ? <div className="text-center py-12 text-gray-400 font-bold uppercase tracking-widest text-xs">No entries</div> : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-100">
            {items.map(c => {
              const Icon = TYPE_ICONS[c.type] || Info;
              return (
                <div key={c.id} className="p-4 flex items-center gap-3">
                  <Icon size={18} className="text-indigo-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-gray-900 truncate">{c.label}</p>
                    <p className="text-sm text-gray-500 truncate">{c.value}</p>
                  </div>
                  <span className="text-xs font-mono text-gray-400 hidden sm:inline">#{c.sort_order}</span>
                  <button onClick={() => toggle(c)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${c.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>{c.is_active ? 'Active' : 'Off'}</button>
                  <button onClick={() => setEditing(c)} className="p-2 rounded-lg text-gray-600 hover:bg-gray-50"><Edit2 size={14} /></button>
                  <button onClick={() => remove(c.id)} className="p-2 rounded-lg text-red-400 hover:bg-red-50"><Trash2 size={14} /></button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-black text-gray-900">{editing.id ? 'Edit' : 'New'} Contact</h3>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:bg-gray-50 rounded-lg p-1"><X size={20} /></button>
            </div>
            <div><label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1">Label</label>
              <input value={editing.label || ''} onChange={e => setEditing({ ...editing, label: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
            <div><label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1">Value</label>
              <input value={editing.value || ''} onChange={e => setEditing({ ...editing, value: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1">Type</label>
                <select value={editing.type || 'text'} onChange={e => setEditing({ ...editing, type: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium">
                  {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
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
