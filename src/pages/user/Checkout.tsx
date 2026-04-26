import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabaseClient';
import { formatPrice } from '../../utils/currency';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, ShieldCheck, CreditCard, Truck } from 'lucide-react';

const Checkout = () => {
  const navigate = useNavigate();
  const { items, total, clearCart } = useCartStore();
  const { user, profile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState('');

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      // 1. Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          total_amount: total,
          status: 'pending',
          shipping_address: address,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Create order items
      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        price_at_time: item.price,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      toast.success('Order placed successfully!');
      clearCart();
      navigate('/profile');
    } catch (error: any) {
      toast.error(error.message || 'Checkout failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <button
        onClick={() => navigate('/cart')}
        className="flex items-center text-gray-500 hover:text-indigo-600 mb-8 transition-colors group"
      >
        <ArrowLeft size={20} className="mr-2 group-hover:-translate-x-1 transition-transform" />
        Back to cart
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        {/* Checkout Form */}
        <div className="space-y-12">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100">
              <ShieldCheck size={24} />
            </div>
            <h1 className="text-3xl font-black text-gray-900">Secure Checkout</h1>
          </div>

          <form onSubmit={handleCheckout} className="space-y-8">
            <div className="space-y-4">
              <label htmlFor="address" className="block text-sm font-bold text-gray-400 uppercase tracking-widest">
                Shipping Address
              </label>
              <textarea
                id="address"
                required
                rows={4}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter your full address..."
                className="w-full px-6 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-3xl outline-none transition-all font-medium text-gray-900"
              />
            </div>

            <div className="pt-8 space-y-4">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Payment Method</h3>
              <div className="flex items-center p-6 bg-indigo-50 border-2 border-indigo-200 rounded-3xl">
                <div className="p-3 bg-indigo-600 rounded-2xl text-white mr-4">
                  <CreditCard size={24} />
                </div>
                <div className="flex-grow">
                  <p className="font-black text-gray-900 text-lg">Cash on Delivery</p>
                  <p className="text-indigo-600 font-bold text-sm">Safe & Reliable Payment</p>
                </div>
                <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 rounded-full bg-white" />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-3xl font-black text-lg shadow-xl shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center group disabled:opacity-50"
            >
              {loading ? 'Processing Order...' : 'Place Order'}
              <ArrowRight className="ml-3 group-hover:translate-x-1 transition-transform" size={24} />
            </button>
          </form>
        </div>

        {/* Order Summary Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-8 border border-gray-100 sticky top-24 space-y-8">
            <h2 className="text-2xl font-black text-gray-900">Order Summary</h2>
            <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {items.map((item) => (
                <div key={item.id} className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-grow">
                    <h4 className="text-sm font-bold text-gray-900 truncate max-w-[150px]">{item.name}</h4>
                    <p className="text-xs text-gray-500 font-medium">Qty: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-gray-900">{formatPrice(item.price * item.quantity, profile?.country)}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-8 border-t border-gray-100 space-y-4">
              <div className="flex justify-between text-gray-500 font-bold">
                <span>Subtotal</span>
                <span>{formatPrice(total, profile?.country)}</span>
              </div>
              <div className="flex justify-between text-gray-500 font-bold">
                <span>Shipping</span>
                <span className="text-green-500 uppercase">Free</span>
              </div>
              <div className="pt-6 border-t border-gray-100 flex justify-between items-center">
                <span className="text-lg font-black text-gray-900">Total</span>
                <span className="text-3xl font-black text-indigo-600">
                  {formatPrice(total, profile?.country)}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-3 text-gray-400">
                <Truck size={18} />
                <span className="text-xs font-bold uppercase tracking-widest">Delivery in 3-5 Business Days</span>
              </div>
              <div className="flex items-center space-x-3 text-gray-400">
                <ShieldCheck size={18} />
                <span className="text-xs font-bold uppercase tracking-widest">Encrypted Checkout Process</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
