import { useEffect, useMemo, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '../../lib/supabaseClient';
import { useAuthStore } from '../../store/authStore';
import { Plus, Edit2, Trash2, X, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

interface TeamMember {
  id: string; user_id: string; role_label: string | null; department: string | null;
  joined_at: string | null; is_active: boolean;
  profile?: { full_name: string | null; email: string | null } | null;
}

const empty = { email: '', role_label: '', department: '', joined_at: new Date().toISOString().slice(0, 10), is_active: true };

export default function Team() {
  const { profile } = useAuthStore();
  const tenantId = profile?.tenant_id ?? profile?.id ?? '';
  const [items, setItems] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [lookupMsg, setLookupMsg] = useState('');

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase.from('team_members') as any)
      .select('*, profile:profiles(full_name, email)')
      .eq('tenant_id', tenantId).order('created_at', { ascending: false });
    if (error) toast.error(error.message);
    setItems((data as TeamMember[]) || []);
    setLoading(false);
  };

  useEffect(() => { if (tenantId) load(); }, [tenantId]);

  const summary = useMemo(() => {
    const active = items.filter(i => i.is_active).length;
    const depts = [...new Set(items.map(i => i.department).filter(Boolean))] as string[];
    return { total: items.length, active, depts };
  }, [items]);

  const openCreate = () => { setEditId(null); setForm(empty); setLookupMsg(''); setModalOpen(true); };
  const openEdit = (m: TeamMember) => {
    setEditId(m.id);
    setForm({
      email: m.profile?.email || '',
      role_label: m.role_label || '', department: m.department || '',
      joined_at: m.joined_at || new Date().toISOString().slice(0, 10), is_active: m.is_active,
    });
    setLookupMsg(''); setModalOpen(true);
  };

  const save = async () => {
    if (editId) {
      const { error } = await (supabase.from('team_members') as any).update({
        role_label: form.role_label, department: form.department,
        joined_at: form.joined_at || null, is_active: form.is_active,
      }).eq('id', editId);
      if (error) { toast.error(error.message); return; }
    } else {
      if (!form.email) { toast.error('Email required'); return; }
      const { data: prof } = await (supabase.from('profiles') as any).select('id').eq('email', form.email).maybeSingle();
      if (!prof) { setLookupMsg('User must register first'); return; }
      const { error } = await (supabase.from('team_members') as any).insert({
        tenant_id: tenantId, user_id: (prof as any).id,
        role_label: form.role_label, department: form.department,
        joined_at: form.joined_at || null, is_active: form.is_active,
      });
      if (error) { toast.error(error.message); return; }
    }
    toast.success(editId ? 'Updated' : 'Added'); setModalOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm('Remove this team member?')) return;
    const { error } = await (supabase.from('team_members') as any).delete().eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Removed'); load(); }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-gray-900 dark:text-white">Team</h1>
            <p className="text-gray-500 font-medium">Manage internal team members.</p>
          </div>
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-sm">
            <Plus size={16} /> Add Member
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
            <p className="text-xs font-black uppercase text-gray-400 tracking-widest">Total members</p>
            <p className="text-3xl font-black text-gray-900 dark:text-white mt-1">{summary.total}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
            <p className="text-xs font-black uppercase text-gray-400 tracking-widest">Active</p>
            <p className="text-3xl font-black text-green-600 mt-1">{summary.active}</p>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
            <p className="text-xs font-black uppercase text-gray-400 tracking-widest">Departments</p>
            <p className="text-sm font-bold text-gray-700 dark:text-gray-200 mt-1">{summary.depts.join(', ') || '—'}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>
          ) : items.length === 0 ? (
            <div className="py-20 text-center text-gray-500"><UserCheck size={40} className="mx-auto mb-3 opacity-30" />No team members yet.</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800 text-xs font-black text-gray-500 uppercase tracking-widest">
                <tr>
                  <th className="px-5 py-3 text-left">Name</th>
                  <th className="px-5 py-3 text-left">Email</th>
                  <th className="px-5 py-3 text-left">Role</th>
                  <th className="px-5 py-3 text-left">Department</th>
                  <th className="px-5 py-3 text-left">Status</th>
                  <th className="px-5 py-3 text-left">Joined</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map(m => (
                  <tr key={m.id} className="border-t border-gray-100 dark:border-gray-800">
                    <td className="px-5 py-3 font-bold text-gray-900 dark:text-white">{m.profile?.full_name || '—'}</td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{m.profile?.email || '—'}</td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{m.role_label || '—'}</td>
                    <td className="px-5 py-3 text-gray-600 dark:text-gray-300">{m.department || '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${m.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{m.is_active ? 'Active' : 'Inactive'}</span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-500">{m.joined_at ? new Date(m.joined_at).toLocaleDateString() : '—'}</td>
                    <td className="px-5 py-3 text-right">
                      <button onClick={() => openEdit(m)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit2 size={14} /></button>
                      <button onClick={() => remove(m.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
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
              <h2 className="text-xl font-black text-gray-900 dark:text-white">{editId ? 'Edit' : 'Add'} Team Member</h2>
              <button onClick={() => setModalOpen(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            {!editId && (
              <div>
                <label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1">User Email *</label>
                <input value={form.email} onChange={e => { setForm({ ...form, email: e.target.value }); setLookupMsg(''); }} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:border-indigo-500" />
              </div>
            )}
            <div><label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1">Role Label</label>
              <input value={form.role_label} onChange={e => setForm({ ...form, role_label: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:border-indigo-500" /></div>
            <div><label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1">Department</label>
              <input value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:border-indigo-500" /></div>
            <div><label className="block text-xs font-black uppercase tracking-widest text-gray-500 mb-1">Joined At</label>
              <input type="date" value={form.joined_at} onChange={e => setForm({ ...form, joined_at: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:border-indigo-500" /></div>
            <label className="flex items-center gap-2 text-sm font-bold text-gray-700 dark:text-gray-200">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} /> Active
            </label>
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
