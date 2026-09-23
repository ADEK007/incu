import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '../../lib/supabaseClient';
import { useAuthStore } from '../../store/authStore';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, X } from 'lucide-react';

const AUDIENCES = ['all', 'team', 'customer', 'dealer', 'farmer'] as const;
const AUDIENCE_COLORS: Record<string, string> = {
  all: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  team: 'bg-purple-50 text-purple-600 border-purple-200',
  customer: 'bg-blue-50 text-blue-600 border-blue-200',
  dealer: 'bg-orange-50 text-orange-600 border-orange-200',
  farmer: 'bg-green-50 text-green-600 border-green-200',
};

type Notice = {
  id: string; title: string; body: string; audience: string;
  published_at: string | null; expires_at: string | null; is_active: boolean;
};

const toLocalInput = (iso: string | null) => iso ? new Date(iso).toISOString().slice(0, 16) : '';

export default function Notices() {
  const { profile } = useAuthStore();
  const tenantId = profile?.tenant_id ?? profile?.id ?? '';
  const [items, setItems] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'expired' | 'draft'>('all');
  const [editing, setEditing] = useState<Partial<Notice> | null>(null);

  const load = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data } = await (supabase.from('notices') as any).select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false });
      setItems(data || []);
    } catch (e) { toast.error('Failed to load notices'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tenantId]);

  const now = Date.now();
  const isExpired = (n: Notice) => n.expires_at && new Date(n.expires_at).getTime() < now;
  const isDraft = (n: Notice) => !n.published_at;
  const isLive = (n: Notice) => n.is_active && !isDraft(n) && !isExpired(n);

  const stats = useMemo(() => ({
    total: items.length,
    active: items.filter(isLive).length,
    expired: items.filter(isExpired).length,
  }), [items]);

  const filtered = items.filter(n =>
    filter === 'all' ? true :
    filter === 'active' ? isLive(n) :
    filter === 'expired' ? isExpired(n) :
    isDraft(n)
  );

  const save = async () => {
    if (!editing?.title || !editing?.body) { toast.error('Title and body required'); return; }
    try {
      const payload: any = {
        tenant_id: tenantId, title: editing.title, body: editing.body,
        audience: editing.audience || 'all',
        published_at: editing.published_at ? new Date(editing.published_at).toISOString() : new Date().toISOString(),
        expires_at: editing.expires_at ? new Date(editing.expires_at).toISOString() : null,
        is_active: editing.is_active ?? true,
        created_by: profile?.id,
      };
      if (editing.id) {
        const { error } = await (supabase.from('notices') as any).update(payload).eq('id', editing.id);
        if (error) throw error;
        toast.success('Notice updated');
      } else {
        const { error } = await (supabase.from('notices') as any).insert(payload);
        if (error) throw error;
        toast.success('Notice created');
      }
      setEditing(null); load();
    } catch (e: any) { toast.error(e.message || 'Save failed'); }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this notice?')) return;
    try { await (supabase.from('notices') as any).delete().eq('id', id); toast.success('Deleted'); load(); }
    catch { toast.error('Delete failed'); }
  };

  const toggle = async (n: Notice) => {
    try { await (supabase.from('notices') as any).update({ is_active: !n.is_active }).eq('id', n.id); load(); }
    catch { toast.error('Toggle failed'); }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-gray-900">Notices</h1>
            <p className="text-gray-500 font-medium">Announcements for your users.</p>
          </div>
          <button onClick={() => setEditing({ audience: 'all', is_active: true, published_at: new Date().toISOString() })}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black px-5 py-2.5 text-sm flex items-center gap-2 self-start">
            <Plus size={16} />New Notice
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[{l:'Total',v:stats.total,c:'text-gray-900'},{l:'Active',v:stats.active,c:'text-green-600'},{l:'Expired',v:stats.expired,c:'text-red-600'}].map(s => (
            <div key={s.l} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{s.l}</p>
              <p className={`text-2xl font-black mt-2 ${s.c}`}>{s.v}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto">
          {(['all','active','expired','draft'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap ${filter === f ? 'bg-indigo-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {loading ? <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div> :
          filtered.length === 0 ? <div className="text-center py-12 text-gray-400 font-bold uppercase tracking-widest text-xs">No notices</div> : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map(n => {
              const expired = isExpired(n); const draft = isDraft(n);
              const stateBadge = draft ? 'bg-gray-50 text-gray-600 border-gray-200' : expired ? 'bg-red-50 text-red-600 border-red-200' : n.is_active ? 'bg-green-50 text-green-600 border-green-200' : 'bg-yellow-50 text-yellow-600 border-yellow-200';
              const stateLabel = draft ? 'Draft' : expired ? 'Expired' : n.is_active ? 'Active' : 'Paused';
              return (
                <div key={n.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                  <div className="flex justify-between items-start gap-3">
                    <h3 className="text-lg font-black text-gray-900 flex-1">{n.title}</h3>
                    <div className="flex gap-1">
                      <span className={`px-2 py-1 rounded-lg border text-xs font-bold ${AUDIENCE_COLORS[n.audience]}`}>{n.audience}</span>
                      <span className={`px-2 py-1 rounded-lg border text-xs font-bold ${stateBadge}`}>{stateLabel}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 font-medium" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{n.body}</p>
                  <div className="text-xs text-gray-400 font-bold">
                    {n.published_at && <>Published {new Date(n.published_at).toLocaleDateString()}</>}
                    {n.expires_at && <> • Expires {new Date(n.expires_at).toLocaleDateString()}</>}
                  </div>
                  <div className="flex justify-end gap-1 pt-2 border-t border-gray-100">
                    <button onClick={() => toggle(n)} className="text-xs font-bold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">{n.is_active ? 'Pause' : 'Activate'}</button>
                    <button onClick={() => setEditing({ ...n, published_at: toLocalInput(n.published_at) as any, expires_at: toLocalInput(n.expires_at) as any })} className="p-2 rounded-lg text-gray-600 hover:bg-gray-50"><Edit2 size={14} /></button>
                    <button onClick={() => remove(n.id)} className="p-2 rounded-lg text-red-400 hover:bg-red-50"><Trash2 size={14} /></button>
                  </div>
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
              <h3 className="text-xl font-black text-gray-900">{editing.id ? 'Edit' : 'New'} Notice</h3>
              <button onClick={() => setEditing(null)} className="text-gray-400 hover:bg-gray-50 rounded-lg p-1"><X size={20} /></button>
            </div>
            <Field label="Title"><input value={editing.title || ''} onChange={e => setEditing({ ...editing, title: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" /></Field>
            <Field label="Body"><textarea rows={4} value={editing.body || ''} onChange={e => setEditing({ ...editing, body: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" /></Field>
            <Field label="Audience">
              <select value={editing.audience || 'all'} onChange={e => setEditing({ ...editing, audience: e.target.value })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {AUDIENCES.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Published"><input type="datetime-local" value={editing.published_at as any || ''} onChange={e => setEditing({ ...editing, published_at: e.target.value as any })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" /></Field>
              <Field label="Expires"><input type="datetime-local" value={editing.expires_at as any || ''} onChange={e => setEditing({ ...editing, expires_at: e.target.value as any })} className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" /></Field>
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

const Field = ({ label, children }: any) => (
  <div>
    <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-1">{label}</label>
    {children}
  </div>
);
