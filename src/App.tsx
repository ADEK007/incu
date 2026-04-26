import { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

// Components
import { AuthGuard } from './components/layout/AuthGuard';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import AuthCallback from './pages/AuthCallback';

function App() {
  const { setUser, setProfile, setLoading, fetchProfile, loading } = useAuthStore();

  useEffect(() => {
    console.log("App: Initializing auth...");
    
    // Safety timeout to prevent infinite loading screen
    const timeout = setTimeout(() => {
      if (useAuthStore.getState().loading) {
        console.warn("App: Auth initialization timed out, forcing load state.");
        setLoading(false);
      }
    }, 5000);

    // Initial session check
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        console.log("App: Session checked, session found:", !!session);
        if (session) {
          setUser(session.user);
          fetchProfile(session.user.id);
        } else {
          setLoading(false);
        }
        clearTimeout(timeout);
      })
      .catch((err) => {
        console.error("App: Session check error:", err);
        setLoading(false);
        clearTimeout(timeout);
      });

    // Auth listener
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

  // Loading Screen
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

        {/* NAVBAR */}
        <Navbar />

        {/* MAIN CONTENT */}
        <main className="flex-grow">
          <Routes>

            {/* Public */}
            <Route path="/" element={<Home />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

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

            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        {/* FOOTER */}
        <Footer />

        {/* TOASTER */}
        <Toaster position="top-right" richColors />

      </div>
    </Router>
  );
}

export default App;