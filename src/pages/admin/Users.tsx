import { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '../../lib/supabaseClient';
import { Users as UsersIcon, Search, Shield, ShieldAlert, Phone, Globe } from 'lucide-react';
import { toast } from 'sonner';

const AdminUsers = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const ROLES = ['user', 'admin', 'manager', 'developer', 'writer'];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    if (!window.confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return;

    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;
      toast.success(`User role updated to ${newRole}`);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Update failed');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-50 border-purple-100 text-purple-700';
      case 'manager': return 'bg-blue-50 border-blue-100 text-blue-700';
      case 'developer': return 'bg-green-50 border-green-100 text-green-700';
      case 'writer': return 'bg-orange-50 border-orange-100 text-orange-700';
      default: return 'bg-gray-50 border-gray-100 text-gray-500';
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="space-y-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-black text-gray-900 flex items-center">
              <UsersIcon size={36} className="text-indigo-600 mr-4" />
              User Management
            </h1>
            <p className="text-gray-500 font-medium">Manage user accounts and administrative privileges.</p>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 flex items-center">
          <div className="relative flex-grow w-full">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by Name or Email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-gray-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white rounded-2xl outline-none transition-all font-medium text-gray-900"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-widest">User Profile</th>
                  <th className="px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-widest">Contact Info</th>
                  <th className="px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-widest">Role</th>
                  <th className="px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-widest">Joined Date</th>
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
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs">
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-indigo-50/10 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-indigo-100 group-hover:scale-110 transition-transform">
                            {user.full_name?.[0] || 'U'}
                          </div>
                          <div>
                            <p className="font-black text-gray-900">{user.full_name || 'Anonymous'}</p>
                            <p className="text-xs text-gray-500 font-medium truncate max-w-[150px]">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 space-y-2">
                        <div className="flex items-center space-x-2 text-xs font-bold text-gray-600">
                          <Phone size={14} className="text-indigo-400" />
                          <span>{user.phone || 'N/A'}</span>
                        </div>
                        <div className="flex items-center space-x-2 text-xs font-bold text-gray-600">
                          <Globe size={14} className="text-indigo-400" />
                          <span>{user.country || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className={`inline-flex items-center px-3 py-1.5 rounded-xl border text-xs font-black uppercase tracking-wider ${getRoleBadgeColor(user.role)}`}>
                          {user.role === 'admin' ? <ShieldAlert size={14} className="mr-2" /> : <Shield size={14} className="mr-2" />}
                          {user.role}
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <p className="text-sm font-bold text-gray-900">{new Date(user.created_at).toLocaleDateString()}</p>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <select
                          value={user.role}
                          onChange={(e) => updateUserRole(user.id, e.target.value)}
                          className="bg-gray-50 border-2 border-transparent hover:border-indigo-600 rounded-xl px-4 py-2 text-xs font-bold text-gray-600 outline-none transition-all cursor-pointer"
                        >
                          {ROLES.map((role) => (
                            <option key={role} value={role}>
                              Set as {role.charAt(0).toUpperCase() + role.slice(1)}
                            </option>
                          ))}
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

export default AdminUsers;
