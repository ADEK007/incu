import { useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { formatPrice } from '../../utils/currency';
import { Package, Clock, CheckCircle, Truck, XCircle, ShoppingBag } from 'lucide-react';

const Profile = () => {
  const { profile, orders, fetchOrders } = useAuthStore();

  useEffect(() => {
    fetchOrders();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="text-yellow-500" size={18} />;
      case 'processing': return <Package className="text-blue-500" size={18} />;
      case 'shipped': return <Truck className="text-indigo-500" size={18} />;
      case 'delivered': return <CheckCircle className="text-green-500" size={18} />;
      case 'cancelled': return <XCircle className="text-red-500" size={18} />;
      default: return <Package size={18} />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Profile Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-8 border border-gray-100 sticky top-24">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-24 h-24 rounded-full bg-indigo-600 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-indigo-200">
                {profile?.full_name?.[0] || 'U'}
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-gray-900">{profile?.full_name}</h2>
                <p className="text-gray-500 font-medium">{profile?.email}</p>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold uppercase tracking-wider">
                  {profile?.role}
                </div>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-gray-100 space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Phone</span>
                <span className="text-gray-900 font-semibold">{profile?.phone || 'Not provided'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Country</span>
                <span className="text-gray-900 font-semibold">{profile?.country}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Joined</span>
                <span className="text-gray-900 font-semibold">
                  {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Order History */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100">
              <ShoppingBag size={24} />
            </div>
            <h2 className="text-3xl font-black text-gray-900">Order History</h2>
          </div>

          {orders.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border-2 border-dashed border-gray-200">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                <Package size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">No orders yet</h3>
              <p className="text-gray-500 mt-2 max-w-xs mx-auto">
                Once you make your first purchase, your order history will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {orders.map((order) => (
                <div key={order.id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                  <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center space-x-6">
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Order ID</p>
                        <p className="text-sm font-bold text-gray-900">#{order.id.slice(0, 8)}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Date</p>
                        <p className="text-sm font-bold text-gray-900">{new Date(order.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Amount</p>
                        <p className="text-xl font-black text-indigo-600">{formatPrice(order.total_amount, profile?.country)}</p>
                      </div>
                      <div className={`flex items-center space-x-2 px-4 py-2 rounded-xl border ${
                        order.status === 'delivered' ? 'bg-green-50 border-green-100 text-green-700' :
                        order.status === 'cancelled' ? 'bg-red-50 border-red-100 text-red-700' :
                        'bg-blue-50 border-blue-100 text-blue-700'
                      }`}>
                        {getStatusIcon(order.status)}
                        <span className="text-sm font-bold capitalize">{order.status}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    {order.order_items.map((item, idx) => (
                      <div key={idx} className="flex items-center space-x-4">
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                          <img 
                            src={item.product?.image_url || 'https://via.placeholder.com/400?text=Hardware'} 
                            alt={item.product?.name} 
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400?text=Hardware';
                            }}
                          />
                        </div>
                        <div className="flex-grow">
                          <h4 className="text-sm font-bold text-gray-900">{item.product?.name || 'Unknown Product'}</h4>
                          <p className="text-xs text-gray-500 font-medium">Qty: {item.quantity} × {formatPrice(item.price_at_time, profile?.country)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900">{formatPrice(item.quantity * item.price_at_time, profile?.country)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
