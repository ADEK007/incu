import { Link, useNavigate } from 'react-router-dom';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { formatPrice } from '../../utils/currency';
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight, ArrowLeft } from 'lucide-react';

const Cart = () => {
  const { items, removeItem, updateQuantity, total } = useCartStore();
  const { profile } = useAuthStore();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center space-y-8">
        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
          <ShoppingBag size={48} />
        </div>
        <div className="space-y-4">
          <h2 className="text-4xl font-black text-gray-900">Your cart is empty</h2>
          <p className="text-gray-500 font-medium text-lg max-w-md mx-auto">
            Looks like you haven't added anything to your cart yet. Explore our latest products and find something you'll love!
          </p>
        </div>
        <Link
          to="/"
          className="inline-flex items-center px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 group"
        >
          <ArrowLeft className="mr-3 group-hover:-translate-x-1 transition-transform" size={24} />
          Go Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-12">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100">
            <ShoppingBag size={24} />
          </div>
          <h1 className="text-3xl font-black text-gray-900">Shopping Cart</h1>
        </div>
        <span className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-sm font-black uppercase tracking-wider">
          {items.length} {items.length === 1 ? 'Item' : 'Items'}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-6">
          {items.map((item) => (
            <div key={item.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center gap-6 group hover:shadow-md transition-shadow">
              <div className="w-full sm:w-32 h-32 rounded-2xl overflow-hidden bg-gray-50 flex-shrink-0">
                <img 
                  src={item.image_url || 'https://via.placeholder.com/400?text=Hardware'} 
                  alt={item.name} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400?text=Hardware';
                  }}
                />
              </div>
              <div className="flex-grow space-y-2 w-full text-center sm:text-left">
                <h3 className="text-xl font-black text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
                  {item.name}
                </h3>
                <p className="text-2xl font-black text-indigo-600">
                  {formatPrice(item.price, profile?.country)}
                </p>
              </div>
              <div className="flex items-center space-x-6 w-full sm:w-auto justify-center">
                <div className="flex items-center border-2 border-gray-100 rounded-xl p-1 bg-gray-50/50">
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="w-10 h-10 flex items-center justify-center text-gray-600 hover:text-indigo-600 font-black"
                  >
                    <Minus size={18} />
                  </button>
                  <span className="w-10 text-center font-black text-lg text-gray-900">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-10 h-10 flex items-center justify-center text-gray-600 hover:text-indigo-600 font-black"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <button
                  onClick={() => removeItem(item.id)}
                  className="p-3 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                >
                  <Trash2 size={22} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-8 border border-gray-100 sticky top-24 space-y-8">
            <h2 className="text-2xl font-black text-gray-900">Order Summary</h2>
            <div className="space-y-4">
              <div className="flex justify-between text-gray-500 font-bold">
                <span>Subtotal</span>
                <span>{formatPrice(total, profile?.country)}</span>
              </div>
              {/* <div className="flex justify-between text-gray-500 font-bold">
                <span>Shipping</span>
                <span className="text-green-500 uppercase">Free</span>
              </div> */}
              <div className="flex justify-between text-gray-500 font-bold">
                <span>Tax (0%)</span>
                <span>{formatPrice(0, profile?.country)}</span>
              </div>
              <div className="pt-6 border-t border-gray-100 flex justify-between items-center">
                <span className="text-lg font-black text-gray-900">Total</span>
                <span className="text-3xl font-black text-indigo-600">
                  {formatPrice(total, profile?.country)}
                </span>
              </div>
            </div>
            <button
              onClick={() => navigate('/checkout')}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 transition-all active:scale-95 flex items-center justify-center group"
            >
              Checkout Now
              <ArrowRight className="ml-3 group-hover:translate-x-1 transition-transform" size={24} />
            </button>
            <p className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
              Secure Checkout • Fast Delivery
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
