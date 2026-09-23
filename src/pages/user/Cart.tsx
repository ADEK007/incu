import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { formatPrice } from '../../utils/currency';
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight, ArrowLeft } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

const Cart = () => {
  const { items, removeItem, updateQuantity, total } = useCartStore();
  const { profile } = useAuthStore();
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-8">
        <div className="w-24 h-24 bg-gray-50 dark:bg-slate-800/60 rounded-full flex items-center justify-center mx-auto text-gray-300 dark:text-slate-600">
          <ShoppingBag size={48} />
        </div>
        <div className="space-y-4">
          <h2 className="text-4xl font-black text-gray-900 dark:text-white">{t.cart.empty}</h2>
          <p className="text-gray-500 dark:text-gray-400 font-medium text-lg max-w-md mx-auto">
            {t.cart.emptySubtitle}
          </p>
        </div>
        <Link
          to="/products"
          className="inline-flex items-center px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 dark:shadow-none transition-all active:scale-95 group"
        >
          <ArrowLeft className="mr-3 group-hover:-translate-x-1 transition-transform" size={24} />
          {t.cart.startShopping}
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-12 pb-24 md:pb-12">
      <div className="flex items-center justify-between mb-6 sm:mb-12">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className="p-2.5 sm:p-3 bg-indigo-600 rounded-xl sm:rounded-2xl text-white shadow-lg shadow-indigo-100">
            <ShoppingBag size={20} className="sm:w-6 sm:h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">{t.cart.title}</h1>
        </div>
        <span className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wider border border-indigo-100 dark:border-indigo-900">
          {items.length} {items.length === 1 ? t.cart.item : t.cart.items}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-12">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-3 sm:space-y-6">
          {items.map((item) => (
            <div key={item.id} className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 border border-gray-100 dark:border-slate-800 shadow-xs sm:shadow-sm flex flex-row items-center gap-3 sm:gap-6 group hover:shadow-md transition-shadow">
              <div className="w-20 h-20 sm:w-32 sm:h-32 rounded-xl sm:rounded-2xl overflow-hidden bg-slate-900/5 dark:bg-slate-800/40 p-1.5 sm:p-2 flex items-center justify-center flex-shrink-0 border border-gray-100 dark:border-slate-800">
                <img 
                  src={item.image_url || 'https://via.placeholder.com/400?text=Hardware'} 
                  alt={item.name} 
                  className="w-full h-full object-contain rounded-lg sm:rounded-xl"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400?text=Hardware';
                  }}
                />
              </div>

              <div className="flex-grow min-w-0 space-y-1">
                <h3 className="text-sm sm:text-xl font-bold sm:font-black text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
                  {item.name}
                </h3>
                <p className="text-base sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                  {formatPrice(item.price, profile?.country)}
                </p>

                {/* Mobile Stepper & Delete */}
                <div className="flex sm:hidden items-center justify-between pt-1">
                  <div className="flex items-center border border-gray-200 dark:border-slate-800 rounded-lg p-0.5 bg-gray-50/50 dark:bg-slate-800/50">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-7 h-7 flex items-center justify-center text-gray-600 dark:text-slate-300 active:scale-95"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-6 text-center font-bold text-xs text-gray-900 dark:text-white">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-7 h-7 flex items-center justify-center text-gray-600 dark:text-slate-300 active:scale-95"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    title={t.cart.remove}
                    className="p-1.5 text-red-400 hover:text-red-600 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Desktop Stepper & Delete */}
              <div className="hidden sm:flex items-center space-x-6 flex-shrink-0">
                <div className="flex items-center border-2 border-gray-100 dark:border-slate-800 rounded-xl p-1 bg-gray-50/50 dark:bg-slate-800/50">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="w-10 h-10 flex items-center justify-center text-gray-600 dark:text-slate-300 hover:text-indigo-600 font-black"
                  >
                    <Minus size={18} />
                  </button>
                  <span className="w-10 text-center font-black text-lg text-gray-900 dark:text-white">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-10 h-10 flex items-center justify-center text-gray-600 dark:text-slate-300 hover:text-indigo-600 font-black"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  title={t.cart.remove}
                  className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-all"
                >
                  <Trash2 size={22} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-900 rounded-2xl sm:rounded-3xl shadow-xl shadow-gray-200/50 dark:shadow-none p-5 sm:p-8 border border-gray-100 dark:border-slate-800 sticky top-24 space-y-6 sm:space-y-8">
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">{t.cart.summary}</h2>
            <div className="space-y-3 sm:space-y-4 text-sm sm:text-base">
              <div className="flex justify-between text-gray-500 dark:text-slate-400 font-bold">
                <span>{t.cart.subtotal}</span>
                <span className="font-mono">{formatPrice(total, profile?.country)}</span>
              </div>
              <div className="flex justify-between text-gray-500 dark:text-slate-400 font-bold">
                <span>{t.cart.tax}</span>
                <span className="font-mono">{formatPrice(0, profile?.country)}</span>
              </div>
              <div className="pt-4 sm:pt-6 border-t border-gray-100 dark:border-slate-800 flex justify-between items-center">
                <span className="text-base sm:text-lg font-black text-gray-900 dark:text-white">{t.cart.total}</span>
                <span className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                  {formatPrice(total, profile?.country)}
                </span>
              </div>
            </div>
            <button
              onClick={() => navigate('/checkout')}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl sm:rounded-2xl font-black text-base sm:text-lg shadow-xl shadow-indigo-100 dark:shadow-none transition-all active:scale-95 flex items-center justify-center group cursor-pointer"
            >
              {t.cart.checkoutNow}
              <ArrowRight className="ml-3 group-hover:translate-x-1 transition-transform" size={20} />
            </button>
            <p className="text-center text-[10px] sm:text-xs font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest">
              {t.cart.secureCheckout}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
