import { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '../../lib/supabaseClient';
import { formatPrice } from '../../utils/currency';
import { TrendingUp, Users, ShoppingBag, DollarSign, Package, Star } from 'lucide-react';

const AdminDashboard = () => {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    totalUsers: 0,
    totalProducts: 0,
  });
  const [topProducts, setTopProducts] = useState<any[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [
          { count: usersCount },
          { count: productsCount },
          { data: ordersData },
          { data: topSellingData }
        ] = await Promise.all([
          supabase.from('users').select('*', { count: 'exact', head: true }),
          supabase.from('products').select('*', { count: 'exact', head: true }),
          supabase.from('orders').select('total_amount'),
          supabase.rpc('get_top_selling_products', { limit_count: 5 })
        ]);

        const totalSales = ordersData?.reduce((acc, order) => acc + Number(order.total_amount), 0) || 0;

        setStats({
          totalSales,
          totalOrders: ordersData?.length || 0,
          totalUsers: usersCount || 0,
          totalProducts: productsCount || 0,
        });

        setTopProducts(topSellingData || []);
      } catch (error) {
        console.error('Error fetching admin stats:', error);
      }
    };

    fetchStats();
  }, []);

  const statCards = [
    { label: 'Total Revenue', value: formatPrice(stats.totalSales, 'Bangladesh'), icon: <DollarSign size={24} />, color: 'bg-green-500', shadow: 'shadow-green-100' },
    { label: 'Total Orders', value: stats.totalOrders, icon: <ShoppingBag size={24} />, color: 'bg-indigo-600', shadow: 'shadow-indigo-100' },
    { label: 'Total Users', value: stats.totalUsers, icon: <Users size={24} />, color: 'bg-purple-600', shadow: 'shadow-purple-100' },
    { label: 'Total Products', value: stats.totalProducts, icon: <Package size={24} />, color: 'bg-orange-500', shadow: 'shadow-orange-100' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-500 font-medium">Welcome back! Here's what's happening today.</p>
          </div>
          <div className="inline-flex items-center px-4 py-2 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-sm uppercase tracking-widest border border-indigo-100">
            <TrendingUp size={16} className="mr-2" />
            Live Analytics
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {statCards.map((stat, idx) => (
            <div key={idx} className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 flex items-center gap-6 group hover:shadow-xl transition-all duration-300">
              <div className={`p-4 rounded-2xl text-white ${stat.color} shadow-lg ${stat.shadow} group-hover:scale-110 transition-transform`}>
                {stat.icon}
              </div>
              <div className="space-y-1">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{stat.label}</p>
                <p className="text-2xl font-black text-gray-900">{stat.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Top Selling Products */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-black text-gray-900 flex items-center">
                <Star size={24} className="text-yellow-400 mr-3" />
                Top Selling Products
              </h2>
              <button className="text-sm font-bold text-indigo-600 hover:text-indigo-700">View All</button>
            </div>
            
            <div className="space-y-6">
              {topProducts.length === 0 ? (
                <div className="text-center py-12 text-gray-400 font-bold uppercase tracking-widest text-xs">
                  No sales data available yet
                </div>
              ) : (
                topProducts.map((product, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50/50 hover:bg-indigo-50/30 transition-colors">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center font-black text-indigo-600 border border-gray-100">
                        {idx + 1}
                      </div>
                      <div className="flex-grow min-w-0">
                        <p className="font-black text-gray-900 truncate">{product.name}</p>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">{product.total_quantity} sold</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-black text-indigo-600 font-mono">{formatPrice(Number(product.total_revenue), 'Bangladesh')}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Activity placeholder */}
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-8">
            <h2 className="text-2xl font-black text-gray-900">System Activity</h2>
            <div className="space-y-6">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="w-2 h-2 rounded-full bg-indigo-600 shadow-lg shadow-indigo-100" />
                  <div className="flex-grow">
                    <p className="text-sm font-bold text-gray-900">System check completed</p>
                    <p className="text-xs text-gray-500 font-medium">10 minutes ago</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
