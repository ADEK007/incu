import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import { useAuthStore } from './store/authStore';
import { Toaster } from 'sonner';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/user/Home';
import ProductDetail from './pages/user/ProductDetail';
import Cart from './pages/user/Cart';
import Checkout from './pages/user/Checkout';
import Profile from './pages/user/Profile';
import AdminDashboard from './pages/admin/Dashboard';
import AdminProducts from './pages/admin/Products';
import AdminOrders from './pages/admin/Orders';
import AdminUsers from './pages/admin/Users';
import Products from './pages/user/Products';
import AuthCallback from './pages/AuthCallback';

// Components
import { AuthGuard } from './components/layout/AuthGuard';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

function App() {
  const { setUser, setProfile, setLoading, fetchProfile, loading } = useAuthStore();

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (useAuthStore.getState().loading) {
        setLoading(false);
      }
    }, 5000);

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (session) {
          setUser(session.user);
          fetchProfile(session.user.id);
        } else {
          setLoading(false);
        }
        clearTimeout(timeout);
      })
      .catch(() => {
        setLoading(false);
        clearTimeout(timeout);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) {
          setUser(session.user);
          fetchProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navbar />

        <main className="flex-grow">
          <Routes>

            {/* Public */}
            <Route path="/" element={<Home />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* OAuth Callback */}
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* User */}
            <Route path="/cart" element={<Cart />} />

            <Route
              path="/checkout"
              element={
                <AuthGuard allowedRoles={['user', 'admin']}>
                  <Checkout />
                </AuthGuard>
              }
            />

            <Route
              path="/profile"
              element={
                <AuthGuard allowedRoles={['user', 'admin']}>
                  <Profile />
                </AuthGuard>
              }
            />

            {/* Admin */}
            <Route
              path="/admin"
              element={
                <AuthGuard allowedRoles={['admin']}>
                  <AdminDashboard />
                </AuthGuard>
              }
            />

            <Route
              path="/admin/products"
              element={
                <AuthGuard allowedRoles={['admin']}>
                  <AdminProducts />
                </AuthGuard>
              }
            />

            <Route
              path="/admin/orders"
              element={
                <AuthGuard allowedRoles={['admin']}>
                  <AdminOrders />
                </AuthGuard>
              }
            />

            <Route
              path="/admin/users"
              element={
                <AuthGuard allowedRoles={['admin']}>
                  <AdminUsers />
                </AuthGuard>
              }
            />

            <Route path="/products" element={<Products />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />

          </Routes>
        </main>

        <Footer />
        <Toaster position="top-right" richColors />
      </div>
    </Router>
  );
}

export default App;