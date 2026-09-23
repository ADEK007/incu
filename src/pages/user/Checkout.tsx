import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../lib/supabaseClient';
import { formatPrice } from '../../utils/currency';
import { toast } from 'sonner';
import { ArrowLeft, ArrowRight, ShieldCheck, CreditCard, Truck, Tag, CheckCircle2, X } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

interface Coupon {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  description: string;
}

const AVAILABLE_COUPONS: Record<string, Coupon> = {
  INCU10: {
    code: 'INCU10',
    discountType: 'percentage',
    discountValue: 10,
    description: '10% OFF on entire order',
  },
  INCU20: {
    code: 'INCU20',
    discountType: 'percentage',
    discountValue: 20,
    description: '20% OFF Special Discount',
  },
  WELCOME50: {
    code: 'WELCOME50',
    discountType: 'fixed',
    discountValue: 50,
    description: '৳50 Flat Welcome Discount',
  },
  INCUTECH: {
    code: 'INCUTECH',
    discountType: 'fixed',
    discountValue: 100,
    description: '৳100 Flat IncuTech Special',
  },
};

const Checkout = () => {
  const navigate = useNavigate();
  const { items, total, clearCart } = useCartStore();
  const { user, profile } = useAuthStore();
  const { t, language } = useTranslation();
  const isBn = language === 'bn';

  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState('');
  
  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);

  // Calculate discount and final amount
  const calculateDiscount = () => {
    if (!appliedCoupon) return 0;
    if (appliedCoupon.discountType === 'percentage') {
      return (total * appliedCoupon.discountValue) / 100;
    }
    return Math.min(appliedCoupon.discountValue, total);
  };

  const discountAmount = calculateDiscount();
  const finalTotal = Math.max(0, total - discountAmount);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = couponInput.trim().toUpperCase();

    if (!cleanCode) {
      toast.error(isBn ? 'অনুগ্রহ করে একটি কুপন কোড দিন' : 'Please enter a coupon code');
      return;
    }

    const coupon = AVAILABLE_COUPONS[cleanCode];
    if (coupon) {
      setAppliedCoupon(coupon);
      setCouponInput('');
      toast.success(isBn ? `কুপন "${coupon.code}" যুক্ত হয়েছে! 🎉` : `Coupon "${coupon.code}" applied! 🎉`);
    } else {
      toast.error(isBn ? `অবৈধ কুপন কোড "${cleanCode}"। "INCU10" বা "INCUTECH" ট্রাই করুন!` : `Invalid coupon code "${cleanCode}". Try "INCU10" or "INCUTECH"!`);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    toast.info(isBn ? 'কুপন সরানো হয়েছে' : 'Coupon removed');
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error(isBn ? 'অর্ডার করতে অনুগ্রহ করে সাইন ইন করুন।' : 'Please sign in to place an order.');
      return;
    }

    if (items.length === 0) {
      toast.error(isBn ? 'আপনার কার্ট খালি।' : 'Your cart is empty.');
      navigate('/cart');
      return;
    }

    setLoading(true);

    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: user.id,
          total_amount: finalTotal,
          discount_amount: discountAmount,
          coupon_code: appliedCoupon ? appliedCoupon.code : null,
          shipping_address: address,
          status: 'pending',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const orderItems = items.map((item) => ({
        order_id: orderData.id,
        product_id: item.id,
        quantity: item.quantity,
        price_at_time: item.price,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      toast.success(t.checkout.successTitle);
      clearCart();
      navigate('/profile');
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || (isBn ? 'চেকআউট ব্যর্থ হয়েছে। আবার চেষ্টা করুন।' : 'Checkout failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12 pb-24 md:pb-12">
      <button
        onClick={() => navigate('/cart')}
        className="flex items-center text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 mb-6 sm:mb-8 transition-colors group font-semibold text-sm sm:text-base cursor-pointer"
      >
        <ArrowLeft size={18} className="mr-2 group-hover:-translate-x-1 transition-transform" />
        {isBn ? '← কার্টে ফিরে যান' : 'Back to cart'}
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
        {/* Checkout Form */}
        <div className="space-y-6 sm:space-y-12">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="p-2.5 sm:p-3 bg-indigo-600 rounded-xl sm:rounded-2xl text-white shadow-lg shadow-indigo-100">
              <ShieldCheck size={20} className="sm:w-6 sm:h-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">{t.checkout.title}</h1>
          </div>

          <form onSubmit={handleCheckout} className="space-y-6 sm:space-y-8">
            <div className="space-y-2 sm:space-y-4">
              <label htmlFor="address" className="block text-xs sm:text-sm font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                {t.checkout.address}
              </label>
              <textarea
                id="address"
                required
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder={t.checkout.addressPlaceholder}
                className="w-full px-4 sm:px-6 py-3.5 sm:py-4 bg-gray-50 dark:bg-slate-800/60 border-2 border-transparent focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 rounded-2xl sm:rounded-3xl outline-none transition-all font-medium text-sm sm:text-base text-gray-900 dark:text-white border-gray-100 dark:border-slate-700"
              />
            </div>

            <div className="pt-2 sm:pt-4 space-y-3 sm:space-y-4">
              <h3 className="text-xs sm:text-sm font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">{t.checkout.paymentMethod}</h3>
              <div className="flex items-center p-4 sm:p-6 bg-indigo-50/80 dark:bg-indigo-950/40 border-2 border-indigo-200 dark:border-indigo-800 rounded-2xl sm:rounded-3xl">
                <div className="p-2.5 sm:p-3 bg-indigo-600 rounded-xl sm:rounded-2xl text-white mr-3 sm:mr-4 flex-shrink-0">
                  <CreditCard size={20} className="sm:w-6 sm:h-6" />
                </div>
                <div className="flex-grow min-w-0">
                  <p className="font-black text-gray-900 dark:text-white text-base sm:text-lg">{t.checkout.cod}</p>
                  <p className="text-indigo-600 dark:text-indigo-400 font-bold text-xs sm:text-sm">{t.checkout.codDesc}</p>
                </div>
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-indigo-600 flex items-center justify-center flex-shrink-0">
                  <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-white" />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || items.length === 0}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl sm:rounded-3xl font-black text-base sm:text-lg shadow-xl shadow-indigo-100 dark:shadow-none transition-all active:scale-95 flex items-center justify-center group disabled:opacity-50 cursor-pointer"
            >
              {loading ? t.checkout.placingOrder : `${t.checkout.placeOrder} • ${formatPrice(finalTotal, profile?.country)}`}
              <ArrowRight className="ml-3 group-hover:translate-x-1 transition-transform" size={20} />
            </button>
          </form>
        </div>

        {/* Order Summary & Coupon Code Section */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-xl shadow-gray-200/50 dark:shadow-none p-5 sm:p-8 border border-gray-100 dark:border-slate-800 sticky top-24 space-y-6 sm:space-y-8">
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">{t.checkout.orderSummary}</h2>

            {/* Cart Items List */}
            <div className="space-y-6 max-h-[320px] overflow-y-auto pr-2 divide-y divide-gray-50 dark:divide-slate-800">
              {items.map((item) => (
                <div key={item.id} className="flex items-center space-x-4 pt-4 first:pt-0">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-900/5 dark:bg-slate-800/40 p-1 flex items-center justify-center flex-shrink-0 border border-gray-100 dark:border-slate-800">
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-contain rounded-lg" />
                  </div>
                  <div className="flex-grow min-w-0">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">{item.name}</h4>
                    <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">
                      {isBn ? 'পরিমাণ: ' : 'Qty: '}{item.quantity}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-black text-gray-900 dark:text-white font-mono">
                      {formatPrice(item.price * item.quantity, profile?.country)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Coupon Code Input & Applied Display */}
            <div className="pt-6 border-t border-gray-100 dark:border-slate-800 space-y-3">
              <label className="text-xs font-black text-gray-400 dark:text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <Tag size={14} className="text-indigo-600 dark:text-indigo-400" />
                <span>{t.checkout.couponCode}</span>
              </label>

              {appliedCoupon ? (
                <div className="flex items-center justify-between p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl">
                  <div className="flex items-center space-x-2.5">
                    <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-emerald-800 dark:text-emerald-300 text-sm tracking-wider">
                          {appliedCoupon.code}
                        </span>
                        <span className="bg-emerald-200/70 dark:bg-emerald-800/70 text-emerald-800 dark:text-emerald-200 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                          {t.checkout.applied}
                        </span>
                      </div>
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">{appliedCoupon.description}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    className="p-1.5 text-emerald-700 dark:text-emerald-400 hover:text-red-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-xl transition-colors"
                    title="Remove coupon"
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder={t.checkout.couponPlaceholder}
                    className="flex-grow px-4 py-3 bg-gray-50 dark:bg-slate-800/60 border-2 border-transparent focus:border-indigo-600 focus:bg-white dark:focus:bg-slate-900 rounded-2xl outline-none text-xs font-bold uppercase tracking-wider transition-all placeholder:normal-case placeholder:font-normal text-foreground border-gray-100 dark:border-slate-700"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleApplyCoupon(e);
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    className="px-5 py-3 bg-gray-900 dark:bg-indigo-600 hover:bg-indigo-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md active:scale-95 flex-shrink-0 cursor-pointer"
                  >
                    {t.checkout.apply}
                  </button>
                </div>
              )}
            </div>

            {/* Price Calculations */}
            <div className="pt-6 border-t border-gray-100 dark:border-slate-800 space-y-3">
              <div className="flex justify-between text-gray-500 dark:text-slate-400 font-bold text-sm">
                <span>{t.cart.subtotal}</span>
                <span className="font-mono">{formatPrice(total, profile?.country)}</span>
              </div>

              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                  <span className="flex items-center gap-1">
                    <span>{t.checkout.discount} ({appliedCoupon?.code})</span>
                  </span>
                  <span className="font-mono">-{formatPrice(discountAmount, profile?.country)}</span>
                </div>
              )}

              <div className="flex justify-between text-gray-500 dark:text-slate-400 font-bold text-sm">
                <span>{t.cart.shipping}</span>
                <span className="text-emerald-600 uppercase font-black text-xs">{t.cart.free}</span>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center">
                <span className="text-lg font-black text-gray-900 dark:text-white">{t.cart.total}</span>
                <span className="text-3xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                  {formatPrice(finalTotal, profile?.country)}
                </span>
              </div>
            </div>

            {/* Trust Badges */}
            <div className="pt-2 space-y-3">
              <div className="flex items-center space-x-3 text-gray-400 dark:text-slate-500">
                <Truck size={18} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  {isBn ? '৩-৫ কার্যদিবসে দ্রুত ডেলিভারি' : 'Delivery in 3-5 Business Days'}
                </span>
              </div>
              <div className="flex items-center space-x-3 text-gray-400 dark:text-slate-500">
                <ShieldCheck size={18} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider">
                  {isBn ? 'সম্পূর্ণ নিরাপদ ও সুরক্ষিত অর্ডার' : 'Encrypted & Safe Checkout'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
