import { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabaseClient';
import { useAuthStore } from '../../store/authStore';
import { formatPrice } from '../../utils/currency';

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
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="font-black text-xl text-indigo-600">ICU</div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-sm font-bold text-gray-700">{profile?.full_name ?? 'Dealer'}</span>
            <span className="px-2 py-1 rounded-lg border text-xs font-bold bg-indigo-50 text-indigo-700 border-indigo-200">Dealer Portal</span>
            <button onClick={async () => { await signOut(); navigate('/login'); }} className="border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 px-3 py-1.5 text-sm">Logout</button>
          </div>
        </div>
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-4 overflow-x-auto">
          {navLinks.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => `py-3 text-sm font-bold whitespace-nowrap border-b-2 ${isActive ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>{l.label}</NavLink>
          ))}
        </nav>
      </header>
      <main className="max-w-7xl mx-auto p-4 sm:p-6">{children}</main>
    </div>
  );
}

export default function DealerStock() {
  const { profile } = useAuthStore();
  const tenantId = profile?.tenant_id ?? profile?.id ?? '';
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<any>(null);
  const [qty, setQty] = useState<number>(1);
  const [notes, setNotes] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase.from('products') as any).select('*').eq('tenant_id', tenantId).order('name');
      if (error) throw error;
      setProducts(data || []);
    } catch (e: any) { toast.error(e.message || 'Failed'); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (profile) load(); /* eslint-disable-next-line */ }, [profile?.id]);

  const categories = useMemo(() => Array.from(new Set(products.map((p) => p.category).filter(Boolean))), [products]);
  const filtered = products.filter((p) => {
    const s = search.toLowerCase();
    const matchS = !s || p.name?.toLowerCase().includes(s);
    const matchC = !category || p.category === category;
    return matchS && matchC;
  });

  const openRequest = (p: any) => { setSelected(p); setQty(1); setNotes(''); setModalOpen(true); };
  const submitRequest = async () => {
    if (!qty || qty < 1) { toast.error('Enter quantity'); return; }
    try {
      const { error } = await (supabase.from('notices') as any).insert({
        tenant_id: tenantId,
        title: 'Stock Request: ' + selected.name,
        body: 'Dealer ' + (profile?.full_name || 'Unknown') + ' requests ' + qty + ' units of ' + selected.name + (notes ? '. Notes: ' + notes : ''),
        audience: 'admin', is_active: true, published_at: new Date().toISOString(), created_by: profile!.id,
      });
      if (error) throw error;
      toast.success('Stock request sent to administrator');
      setModalOpen(false);
    } catch (e: any) { toast.error(e.message || 'Failed'); }
  };

  const stockColor = (s: number) => s === 0 ? 'text-gray-400' : s < 5 ? 'text-red-600' : s <= 10 ? 'text-orange-600' : 'text-green-600';

  return (
    <DealerLayout>
      {loading ? (
        <div className="flex justify-center py-20"><div className="h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900">My Stock</h1>
            <p className="text-sm text-gray-500 mt-1">View available products and stock levels</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..." className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="sm:w-56 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">All Categories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center text-gray-400 text-sm font-medium">No products found</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((p) => {
                const stock = p.stock ?? 0;
                return (
                  <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                    {p.image_url ? (
                      <div className="w-full h-44 bg-slate-900/5 p-2 flex items-center justify-center border-b border-gray-100">
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-contain rounded-lg" />
                      </div>
                    ) : (
                      <div className="w-full h-44 bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center text-4xl font-black text-indigo-600">{p.name?.[0] || '?'}</div>
                    )}
                    <div className="p-4 flex-1 flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-black text-gray-900 truncate">{p.name}</div>
                          <div className="text-xs text-gray-500 truncate">{p.category || 'Uncategorized'}</div>
                        </div>
                        {p.category && <span className="px-2 py-1 rounded-lg border text-xs font-bold bg-gray-50 text-gray-600 border-gray-200 shrink-0">{p.category}</span>}
                      </div>
                      <div className="text-lg font-black text-indigo-600">{formatPrice(Number(p.price || 0), 'Bangladesh')}</div>
                      <div className={`text-sm font-bold ${stockColor(stock)}`}>{stock === 0 ? 'Out of stock' : `${stock} in stock`}</div>
                      <button onClick={() => openRequest(p)} className="mt-auto bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black px-4 py-2.5 text-sm">Request Stock</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      {modalOpen && selected && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100"><h2 className="text-xl font-black text-gray-900">Request Stock</h2></div>
            <div className="p-6 space-y-4">
              <div><label className="text-xs font-bold text-gray-500 uppercase">Product</label><input value={selected.name} disabled className="w-full mt-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium" /></div>
              <div><label className="text-xs font-bold text-gray-500 uppercase">Quantity *</label><input type="number" min={1} value={qty} onChange={(e) => setQty(parseInt(e.target.value) || 0)} className="w-full mt-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
              <div><label className="text-xs font-bold text-gray-500 uppercase">Notes</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="w-full mt-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500" /></div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setModalOpen(false)} className="border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 px-4 py-2.5 text-sm">Cancel</button>
              <button onClick={submitRequest} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black px-4 py-2.5 text-sm">Send Request</button>
            </div>
          </div>
        </div>
      )}
    </DealerLayout>
  );
}
