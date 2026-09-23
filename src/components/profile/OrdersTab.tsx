import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/store/authStore';
import { formatPrice } from '@/utils/currency';
import { Package, Clock, CheckCircle, Truck, XCircle } from 'lucide-react';

interface OrderItem {
  quantity: number;
  price_at_time: number;
  product?: { name?: string; image_url?: string } | null;
}
interface Order {
  id: string;
  created_at: string;
  total_amount: number;
  status: string;
  discount_amount?: number | null;
  coupon_code?: string | null;
  order_items: OrderItem[];
}

const statusIcon = (s: string) => {
  switch (s) {
    case 'pending': return <Clock className="text-yellow-500" size={16} />;
    case 'processing': return <Package className="text-blue-500" size={16} />;
    case 'shipped': return <Truck className="text-indigo-500" size={16} />;
    case 'delivered': return <CheckCircle className="text-green-500" size={16} />;
    case 'cancelled': return <XCircle className="text-red-500" size={16} />;
    default: return <Package size={16} />;
  }
};

const OrdersTab = () => {
  const { user, profile } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('orders')
        .select('id, created_at, total_amount, status, discount_amount, coupon_code, order_items(quantity, price_at_time, product:products(name, image_url))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setOrders((data as any) || []);
      setLoading(false);
    })();
  }, [user?.id]);

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-2xl font-black text-foreground">Order History</h2>
        <p className="text-sm text-muted-foreground mt-1">Track all your past and current orders.</p>
      </header>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-32 rounded-2xl bg-muted/40 animate-pulse" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center">
          <Package className="mx-auto text-muted-foreground mb-3" size={40} />
          <h3 className="font-bold text-foreground">No orders yet</h3>
          <p className="text-sm text-muted-foreground mt-1">Your purchases will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map(o => (
            <div key={o.id} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="px-5 py-3 bg-muted/30 border-b border-border flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-5 text-xs">
                  <div><p className="font-bold text-muted-foreground uppercase tracking-wider">Order</p><p className="font-bold text-foreground">#{o.id.slice(0, 8)}</p></div>
                  <div><p className="font-bold text-muted-foreground uppercase tracking-wider">Date</p><p className="font-bold text-foreground">{new Date(o.created_at).toLocaleDateString()}</p></div>
                  {o.coupon_code && (
                    <div className="hidden sm:block">
                      <p className="font-bold text-muted-foreground uppercase tracking-wider">Coupon</p>
                      <p className="font-bold text-emerald-600">🏷️ {o.coupon_code}</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="font-black text-primary text-sm">{formatPrice(o.total_amount, profile?.country)}</span>
                    {o.discount_amount && o.discount_amount > 0 && (
                      <span className="block text-[10px] text-emerald-600 font-bold">
                        Saved {formatPrice(o.discount_amount, profile?.country)}
                      </span>
                    )}
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-background border border-border text-xs font-bold capitalize">
                    {statusIcon(o.status)} {o.status}
                  </span>
                </div>
              </div>
              <div className="p-5 space-y-3">
                {o.order_items.map((it, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <img src={it.product?.image_url || 'https://via.placeholder.com/64'} alt="" className="w-12 h-12 rounded-lg object-contain bg-slate-900/5 p-1 border border-border" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{it.product?.name || 'Product'}</p>
                      <p className="text-xs text-muted-foreground">Qty {it.quantity} × {formatPrice(it.price_at_time, profile?.country)}</p>
                    </div>
                    <p className="text-sm font-bold">{formatPrice(it.quantity * it.price_at_time, profile?.country)}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrdersTab;
