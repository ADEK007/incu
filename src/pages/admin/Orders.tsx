import { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '../../lib/supabaseClient';
import { formatPrice } from '../../utils/currency';
import { ShoppingBag, Search, Filter, Clock, Package, Truck, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const AdminOrders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          user:users (
            full_name,
            email,
            country
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', orderId);

      if (error) throw error;
      toast.success(`Order status updated to ${status}`);
      fetchOrders();
    } catch (error: any) {
      toast.error(error.message || 'Update failed');
    }
  };

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

  const filteredOrders = statusFilter === 'all' 
    ? orders 
    : orders.filter(o => o.status === statusFilter);

  return (
    <AdminLayout>
      <div className="space-y-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-gray-900 flex items-center">
              <ShoppingBag size={36} className="text-indigo-600 mr-4" />
              Order Management
            </h1>
            <p className="text-gray-500 font-medium">Monitor and update all customer orders here.</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-6 items-center">
          <div className="relative flex-grow w-full">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by Order ID or User Email..."
              className="w-full pl-14 pr-6 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-medium text-gray-900"
            />
          </div>
          <div className="flex items-center space-x-4 w-full sm:w-auto">
            <Filter size={20} className="text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-6 py-4 bg-gray-50 border-2 border-transparent hover:border-indigo-600 rounded-2xl text-gray-600 font-bold outline-none transition-all cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-widest">Order ID</th>
                  <th className="px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-widest">Customer</th>
                  <th className="px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-widest">Total</th>
                  <th className="px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-8 py-6 h-20 bg-gray-50/20"></td>
                    </tr>
                  ))
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">
                      No orders found
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-indigo-50/10 transition-colors group">
                      <td className="px-8 py-6">
                        <p className="font-black text-gray-900 truncate max-w-[100px]">#{order.id.slice(0, 8)}</p>
                        <p className="text-xs text-gray-400 font-medium">{new Date(order.created_at).toLocaleDateString()}</p>
                      </td>
                      <td className="px-8 py-6">
                        <p className="font-bold text-gray-900">{order.user?.full_name || 'Unknown'}</p>
                        <p className="text-xs text-gray-500 font-medium">{order.user?.email}</p>
                      </td>
                      <td className="px-8 py-6">
                        <p className="font-black text-indigo-600">{formatPrice(order.total_amount, order.user?.country)}</p>
                      </td>
                      <td className="px-8 py-6">
                        <div className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl border ${
                          order.status === 'delivered' ? 'bg-green-50 border-green-100 text-green-700' :
                          order.status === 'cancelled' ? 'bg-red-50 border-red-100 text-red-700' :
                          'bg-blue-50 border-blue-100 text-blue-700'
                        }`}>
                          {getStatusIcon(order.status)}
                          <span className="text-xs font-bold capitalize">{order.status}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <select
                          value={order.status}
                          onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                          className="bg-gray-50 border-2 border-transparent hover:border-indigo-600 rounded-xl px-4 py-2 text-xs font-bold text-gray-600 outline-none transition-all cursor-pointer"
                        >
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminOrders;
