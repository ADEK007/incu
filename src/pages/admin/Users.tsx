import { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import { supabase } from '../../lib/supabaseClient';
import { Users as UsersIcon, Search, Shield, ShieldAlert, Phone, Globe } from 'lucide-react';
import { toast } from 'sonner';

const AdminUsers = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const ROLES = ['user', 'admin', 'manager', 'developer', 'writer', 'dealer', 'farmer', 'customer'];

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const ids = (profiles || []).map((p) => p.id);
      const { data: roles } = ids.length
        ? await (supabase.from('user_roles') as any).select('user_id, role').in('user_id', ids)
        : { data: [] as { user_id: string; role: string }[] };

      const ROLE_PRIORITY = ['super_admin', 'admin', 'manager', 'developer', 'dealer', 'farmer', 'customer', 'writer', 'user'];
      const pickRole = (uid: string) => {
        const userRoles = (roles || []).filter((r: any) => r.user_id === uid).map((r: any) => r.role);
        for (const r of ROLE_PRIORITY) if (userRoles.includes(r)) return r;
        return 'user';
      };

      setUsers(
        (profiles || []).map((p) => ({ ...p, role: pickRole(p.id) }))
      );
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    if (!window.confirm(`Are you sure you want to change this user's role to "${newRole.toUpperCase()}"?`)) return;

    try {
      // Remove existing roles, then assign the new one
      const { error: delError } = await (supabase.from('user_roles') as any)
        .delete()
        .eq('user_id', userId);
      if (delError) throw delError;

      const { error: insError } = await (supabase.from('user_roles') as any)
        .insert({ user_id: userId, role: newRole });
      if (insError) throw insError;

      toast.success(`User role updated to ${newRole.toUpperCase()} 🎉`);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.message || 'Update failed');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
      case 'super_admin': return 'bg-purple-100 border-purple-200 text-purple-700 font-black';
      case 'manager': return 'bg-blue-100 border-blue-200 text-blue-700 font-black';
      case 'developer': return 'bg-emerald-100 border-emerald-200 text-emerald-700 font-black';
      case 'writer': return 'bg-amber-100 border-amber-200 text-amber-700 font-black';
      case 'dealer': return 'bg-indigo-100 border-indigo-200 text-indigo-700 font-black';
      case 'farmer': return 'bg-teal-100 border-teal-200 text-teal-700 font-black';
      case 'customer': return 'bg-sky-100 border-sky-200 text-sky-700 font-black';
      default: return 'bg-gray-100 border-gray-200 text-gray-600 font-bold';
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role?.toLowerCase().includes(searchTerm.toLowerCase())
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
            <p className="text-gray-500 font-medium">Manage all registered users, permissions, and role assignments.</p>
          </div>
          <div className="bg-indigo-50 border border-indigo-100 px-6 py-3 rounded-2xl flex items-center gap-3">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Users</span>
            <span className="text-2xl font-black text-indigo-600">{users.length}</span>
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
