import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabaseClient';
import { useAuthStore } from '../../store/authStore';

const navLinks = [
  { to: '/dealer', label: 'Dashboard', end: true },
  { to: '/dealer/farmers', label: 'My Farmers' },
  { to: '/dealer/devices', label: 'My Devices' },
  { to: '/dealer/stock', label: 'My Stock' },
  { to: '/dealer/returns', label: 'Returns' },
];

function DealerLayout({ children }: { children: React.ReactNode }) {
  const { profile, signOut } = useAuthStore();
  const navigate = useNavigate();
  const handleLogout = async () => { await signOut(); navigate('/login'); };
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="font-black text-xl text-indigo-600">ICU</div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm font-bold text-gray-700">{profile?.full_name ?? 'Dealer'}</span>
            <span className="px-2 py-1 rounded-lg border text-xs font-bold bg-indigo-50 text-indigo-700 border-indigo-200">Dealer Portal</span>
            <button onClick={handleLogout} className="border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 px-3 py-1.5 text-sm">Logout</button>
          </div>
        </div>
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-4 overflow-x-auto">
          {navLinks.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}
              className={({ isActive }) => `py-3 text-sm font-bold whitespace-nowrap border-b-2 ${isActive ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
              {l.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="max-w-7xl mx-auto p-4 sm:p-6">{children}</main>
    </div>
  );
}

interface Farmer { id: string; name: string; phone: string | null; email: string | null; address: string | null; is_active: boolean; created_at: string; }

export default function DealerFarmers() {
  const { profile } = useAuthStore();
  const tenantId = profile?.tenant_id ?? profile?.id ?? '';
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [dealer, setDealer] = useState<any>(null);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [deviceCounts, setDeviceCounts] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Farmer | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', is_active: true });

  const load = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const { data: d } = await (supabase.from('dealers') as any).select('*').eq('user_id', profile.id).eq('tenant_id', tenantId).maybeSingle();
      setDealer(d);
      if (!d) { setLoading(false); return; }
      const { data: fs, error } = await (supabase.from('farmers') as any).select('*').eq('dealer_id', d.id).order('created_at', { ascending: false });
      if (error) throw error;
      setFarmers(fs || []);
      const ids = (fs || []).map((f: any) => f.id);
      if (ids.length) {
        const { data: as } = await (supabase.from('device_assignments') as any).select('farmer_id').in('farmer_id', ids).is('unassigned_at', null);
        const counts: Record<string, number> = {};
        (as || []).forEach((a: any) => { counts[a.farmer_id] = (counts[a.farmer_id] || 0) + 1; });
        setDeviceCounts(counts);
      } else setDeviceCounts({});
    } catch (e: any) { toast.error(e.message || 'Failed to load farmers'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [profile?.id]);

  const openAdd = () => { setEditing(null); setForm({ name: '', phone: '', email: '', address: '', is_active: true }); setModalOpen(true); };
  const openEdit = (f: Farmer) => { setEditing(f); setForm({ name: f.name, phone: f.phone || '', email: f.email || '', address: f.address || '', is_active: f.is_active }); setModalOpen(true); };

  const save = async () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    try {
      if (editing) {
        const { error } = await (supabase.from('farmers') as any).update({ name: form.name, phone: form.phone || null, email: form.email || null, address: form.address || null, is_active: form.is_active }).eq('id', editing.id).eq('dealer_id', dealer.id);
        if (error) throw error;
        toast.success('Farmer updated');
      } else {
        const { error } = await (supabase.from('farmers') as any).insert({ tenant_id: tenantId, dealer_id: dealer.id, name: form.name, phone: form.phone || null, email: form.email || null, address: form.address || null, is_active: form.is_active });
        if (error) throw error;
        toast.success('Farmer added');
      }
      setModalOpen(false); load();
    } catch (e: any) { toast.error(e.message || 'Save failed'); }
  };

  const toggleActive = async (f: Farmer) => {
    try {
      const { error } = await (supabase.from('farmers') as any).update({ is_active: !f.is_active }).eq('id', f.id).eq('dealer_id', dealer.id);
      if (error) throw error;
      load();
    } catch (e: any) { toast.error(e.message || 'Failed'); }
  };

  const filtered = farmers.filter((f) => {
    const s = search.toLowerCase();
    return !s || f.name.toLowerCase().includes(s) || (f.phone || '').toLowerCase().includes(s);
  });

  const stats = {
    total: farmers.length,
    active: farmers.filter((f) => f.is_active).length,
    withDevices: Object.keys(deviceCounts).filter((k) => deviceCounts[k] > 0).length,
  };

  return (
    <DealerLayout>
      {loading ? (
        <div className="flex justify-center py-20"><div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : !dealer ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center text-gray-500">Dealer account not found.</div>
      ) : (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900">My Farmers</h1>
            <p className="text-sm text-gray-500 mt-1">Manage farmers under your dealership</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[{ l: 'Total Farmers', v: stats.total }, { l: 'Active', v: stats.active }, { l: 'With Devices', v: stats.withDevices }].map((s) => (
              <div key={s.l} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="text-xs font-bold text-gray-500 uppercase">{s.l}</div>
                <div className="text-3xl font-black text-gray-900 mt-1">{s.v}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or phone..." className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <button onClick={openAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black px-4 py-2.5 text-sm">+ Add Farmer</button>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {filtered.length === 0 ? (
              <div className="p-12 text-center text-gray-400 text-sm font-medium">No farmers yet</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
                    <tr><th className="p-3 text-left">Name</th><th className="p-3 text-left">Phone</th><th className="p-3 text-left">Email</th><th className="p-3 text-left">Address</th><th className="p-3 text-left">Devices</th><th className="p-3 text-left">Status</th><th className="p-3 text-left">Joined</th><th className="p-3 text-right">Actions</th></tr>
                  </thead>
                  <tbody>
                    {filtered.map((f) => (
                      <tr key={f.id} className="border-t border-gray-100">
                        <td className="p-3 font-bold text-gray-900">{f.name}</td>
                        <td className="p-3 text-gray-600">{f.phone || '—'}</td>
                        <td className="p-3 text-gray-600">{f.email || '—'}</td>
                        <td className="p-3 text-gray-600 max-w-xs truncate">{f.address || '—'}</td>
                        <td className="p-3 text-gray-900 font-bold">{deviceCounts[f.id] || 0}</td>
                        <td className="p-3"><span className={`px-2 py-1 rounded-lg border text-xs font-bold ${f.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>{f.is_active ? 'Active' : 'Inactive'}</span></td>
                        <td className="p-3 text-gray-500 text-xs">{new Date(f.created_at).toLocaleDateString()}</td>
                        <td className="p-3 text-right space-x-1 whitespace-nowrap">
                          <button onClick={() => openEdit(f)} className="text-indigo-600 hover:bg-indigo-50 rounded-lg p-1.5 text-xs font-bold">Edit</button>
                          <button onClick={() => toggleActive(f)} className="text-gray-600 hover:bg-gray-50 rounded-lg p-1.5 text-xs font-bold">{f.is_active ? 'Disable' : 'Enable'}</button>
                          <button onClick={() => navigate(`/dealer/devices?farmer_id=${f.id}`)} className="text-indigo-600 hover:bg-indigo-50 rounded-lg p-1.5 text-xs font-bold">Devices</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-900">{editing ? 'Edit Farmer' : 'Add Farmer'}</h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:bg-gray-50 rounded-lg p-1.5">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {(['name', 'phone', 'email'] as const).map((k) => (
                <div key={k}>
                  <label className="text-xs font-bold text-gray-500 uppercase">{k}{k === 'name' && ' *'}</label>
                  <input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="w-full mt-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              ))}
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase">Address</label>
                <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={3} className="w-full mt-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active
              </label>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setModalOpen(false)} className="border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 px-4 py-2.5 text-sm">Cancel</button>
              <button onClick={save} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black px-4 py-2.5 text-sm">Save</button>
            </div>
          </div>
        </div>
      )}
    </DealerLayout>
  );
}
