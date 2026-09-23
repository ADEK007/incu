import { useEffect, useState } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '../../lib/supabaseClient';
import { useAuthStore } from '../../store/authStore';
import { formatPrice } from '../../utils/currency';
import { toast } from 'sonner';
import { Check, X, CreditCard } from 'lucide-react';

const PLANS = [
  { key: 'Basic', amount: 2000, recommended: false, features: ['Up to 100 products', 'Up to 50 customers', '5 team members', 'Basic reports', 'Email support'] },
  { key: 'Pro', amount: 5000, recommended: true, features: ['Unlimited products', 'Unlimited customers', '20 team members', 'All 12 reports + export', 'Device management (up to 10)', 'Priority support'] },
  { key: 'Enterprise', amount: 12000, recommended: false, features: ['Everything in Pro', 'Unlimited devices', 'Custom integrations', 'Dedicated support', 'SLA guarantee'] },
];

const statusColor = (s: string) => {
  const map: Record<string, string> = {
    active: 'bg-green-50 text-green-600 border-green-200',
    pending: 'bg-yellow-50 text-yellow-600 border-yellow-200',
    expired: 'bg-red-50 text-red-600 border-red-200',
    suspended: 'bg-red-50 text-red-600 border-red-200',
    cancelled: 'bg-gray-50 text-gray-600 border-gray-200',
    success: 'bg-green-50 text-green-600 border-green-200',
    failed: 'bg-red-50 text-red-600 border-red-200',
  };
  return map[s] || 'bg-gray-50 text-gray-600 border-gray-200';
};

export default function Subscription() {
  const { profile } = useAuthStore();
  const tenantId = profile?.tenant_id ?? profile?.id ?? '';
  const [sub, setSub] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<{ key: string; amount: number } | null>(null);
  const [processing, setProcessing] = useState(false);

  const load = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const [subRes, payRes] = await Promise.all([
        (supabase.from('tenant_subscriptions') as any).select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        (supabase.from('payments') as any).select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }).limit(20),
      ]);
      setSub(subRes.data);
      setPayments(payRes.data || []);
    } catch (e) { console.error(e); toast.error('Failed to load'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tenantId]);

  const subscribe = async () => {
    if (!selected) return;
    setProcessing(true);
    try {
      const ends = new Date(); ends.setMonth(ends.getMonth() + 1);
      const { data: newSub, error } = await (supabase.from('tenant_subscriptions') as any)
        .insert({ tenant_id: tenantId, plan_name: selected.key, status: 'pending', amount: selected.amount, currency: 'BDT', ends_at: ends.toISOString() })
        .select().single();
      if (error) throw error;
      const txn = 'TXN-' + Date.now();
      await (supabase.from('payments') as any).insert({
        tenant_id: tenantId, subscription_id: newSub.id, gateway: 'sslcommerz',
        gateway_tran_id: txn, amount: selected.amount, currency: 'BDT', status: 'pending',
      });
      toast.success('Payment record created. Redirecting to SSLCommerz...');
      setTimeout(() => {
        toast(`In production, you'd be redirected to SSLCommerz. Your transaction ID: ${txn}`);
        setSelected(null); load();
      }, 1500);
    } catch (e: any) { toast.error(e.message || 'Subscription failed'); }
    finally { setProcessing(false); }
  };

  const activeSub = sub && (sub.status === 'active' || sub.status === 'pending');
  let daysRemaining = 0, totalDays = 30, elapsedPct = 0;
  if (activeSub && sub.ends_at) {
    daysRemaining = Math.max(0, Math.round((new Date(sub.ends_at).getTime() - Date.now()) / 86400000));
    totalDays = Math.max(1, Math.round((new Date(sub.ends_at).getTime() - new Date(sub.starts_at).getTime()) / 86400000));
    elapsedPct = Math.min(100, Math.max(0, ((totalDays - daysRemaining) / totalDays) * 100));
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div className="space-y-2">
          <h1 className="text-4xl font-black text-gray-900">Subscription</h1>
          <p className="text-gray-500 font-medium">Manage your plan and billing.</p>
        </div>

        {loading ? <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div> : (
          <>
            {/* Current plan */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <h2 className="text-lg font-black text-gray-900 mb-4">Current Plan</h2>
              {activeSub ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="px-3 py-1.5 rounded-xl bg-indigo-100 text-indigo-700 font-black text-sm">{sub.plan_name}</span>
                    <span className={`px-2 py-1 rounded-lg border text-xs font-bold ${statusColor(sub.status)}`}>{sub.status}</span>
                    <span className="text-sm text-gray-500 font-medium">Amount: <b>{formatPrice(Number(sub.amount), 'Bangladesh')}</b></span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-gray-500 font-bold">Started:</span> <span className="font-medium">{sub.starts_at?.slice(0, 10)}</span></div>
                    <div><span className="text-gray-500 font-bold">Ends:</span> <span className="font-medium">{sub.ends_at?.slice(0, 10)}</span></div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-bold mb-1">{daysRemaining} days remaining</p>
                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${daysRemaining < 7 ? 'bg-red-500' : 'bg-indigo-600'}`} style={{ width: `${elapsedPct}%` }} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <p className="font-black text-gray-700 mb-3">No active subscription</p>
                  <button onClick={() => setSelected({ key: 'Pro', amount: 5000 })} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black px-6 py-2.5 text-sm">Subscribe Now</button>
                </div>
              )}
            </div>

            {/* Plans */}
            <div>
              <h2 className="text-lg font-black text-gray-900 mb-4">Choose a Plan</h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {PLANS.map(p => (
                  <div key={p.key} className={`bg-white rounded-2xl shadow-sm p-6 border ${p.recommended ? 'border-indigo-500 border-2' : 'border-gray-100'} flex flex-col`}>
                    {p.recommended && <span className="self-start mb-3 px-2 py-1 rounded-lg border text-xs font-bold bg-indigo-50 text-indigo-600 border-indigo-200">RECOMMENDED</span>}
                    <h3 className="text-2xl font-black text-gray-900">{p.key}</h3>
                    <p className="text-3xl font-black text-indigo-600 mt-2">{formatPrice(p.amount, 'Bangladesh')}<span className="text-sm text-gray-400 font-medium">/mo</span></p>
                    <ul className="space-y-2 mt-4 mb-6 flex-1">
                      {p.features.map(f => <li key={f} className="flex gap-2 text-sm text-gray-700 font-medium"><Check size={16} className="text-green-500 shrink-0 mt-0.5" />{f}</li>)}
                    </ul>
                    <button onClick={() => setSelected({ key: p.key, amount: p.amount })} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black py-2.5 text-sm">Subscribe</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Payment history */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
              <div className="p-5 border-b border-gray-100"><h2 className="text-lg font-black text-gray-900">Payment History</h2></div>
              {payments.length === 0 ? <div className="text-center py-12 text-gray-400 font-bold uppercase tracking-widest text-xs">No payments yet</div> : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50"><tr>{['Date','Transaction','Amount','Gateway','Status'].map(h => <th key={h} className="px-3 py-3 text-left text-xs font-black uppercase tracking-widest text-gray-500">{h}</th>)}</tr></thead>
                  <tbody>
                    {payments.map(p => (
                      <tr key={p.id} className="border-t border-gray-100">
                        <td className="px-3 py-3 text-gray-600">{p.created_at?.slice(0, 10)}</td>
                        <td className="px-3 py-3 font-mono text-xs">{p.gateway_tran_id}</td>
                        <td className="px-3 py-3 font-mono font-bold">{formatPrice(Number(p.amount), 'Bangladesh')}</td>
                        <td className="px-3 py-3 text-gray-600">{p.gateway}</td>
                        <td className="px-3 py-3"><span className={`px-2 py-1 rounded-lg border text-xs font-bold ${statusColor(p.status)}`}>{p.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}

        {selected && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => !processing && setSelected(null)}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-black text-gray-900">Subscribe to {selected.key}</h3>
                  <p className="text-3xl font-black text-indigo-600 mt-2">{formatPrice(selected.amount, 'Bangladesh')}<span className="text-sm text-gray-400 font-medium">/mo</span></p>
                </div>
                <button onClick={() => !processing && setSelected(null)} className="text-gray-400 hover:bg-gray-50 rounded-lg p-1"><X size={20} /></button>
              </div>
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex gap-3">
                <CreditCard className="text-indigo-600 shrink-0" size={20} />
                <div className="text-sm">
                  <p className="font-black text-indigo-700">Powered by SSLCommerz</p>
                  <p className="text-gray-600 mt-1">Supports bKash, Nagad, Rocket, Visa, Mastercard</p>
                  <p className="text-xs text-gray-500 mt-2 font-mono">[bKash] [Nagad] [Rocket] [VISA] [MasterCard]</p>
                </div>
              </div>
              <button onClick={subscribe} disabled={processing} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl font-black py-3">
                {processing ? 'Processing...' : 'Proceed to Payment'}
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
