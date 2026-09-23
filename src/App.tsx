import { lazy, Suspense, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/react';
import { supabase } from '@/integrations/supabase/client';
import { getProfileRole, useAuthStore, getDefaultRouteForRole, resolveUserRole } from './store/authStore';
import { Toaster } from 'sonner';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthGuard } from './components/layout/AuthGuard';
import ProtectedAdminRoute from './components/layout/ProtectedAdminRoute';
import ProtectedRoleRoute from './components/layout/ProtectedRoleRoute';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import MobileBottomNav from './components/layout/MobileBottomNav';
import { ThemeProvider } from './components/theme/ThemeProvider';

// Auth
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const QRLogin = lazy(() => import('./pages/QRLogin'));

// User/public
const Home = lazy(() => import('./pages/user/Home'));
const Products = lazy(() => import('./pages/user/Products'));
const ProductDetail = lazy(() => import('./pages/user/ProductDetail'));
const Cart = lazy(() => import('./pages/user/Cart'));
const Checkout = lazy(() => import('./pages/user/Checkout'));
const Profile = lazy(() => import('./pages/user/Profile'));

// Admin
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminProducts = lazy(() => import('./pages/admin/Products'));
const AdminOrders = lazy(() => import('./pages/admin/Orders'));
const AdminUsers = lazy(() => import('./pages/admin/Users'));
const AdminManagement = lazy(() => import('./pages/admin/Management'));
const AdminPOS = lazy(() => import('./pages/admin/POS'));
const AdminInvoices = lazy(() => import('./pages/admin/Invoices'));
const AdminInventory = lazy(() => import('./pages/admin/Inventory'));
const AdminCustomers = lazy(() => import('./pages/admin/Customers'));
const AdminDealers = lazy(() => import('./pages/admin/Dealers'));
const AdminFarmers = lazy(() => import('./pages/admin/Farmers'));
const AdminTeam = lazy(() => import('./pages/admin/Team'));
const AdminDevices = lazy(() => import('./pages/admin/Devices'));
const AdminCommands = lazy(() => import('./pages/admin/Commands'));
const AdminExpenses = lazy(() => import('./pages/admin/Expenses'));
const AdminReports = lazy(() => import('./pages/admin/Reports'));
const AdminReturns = lazy(() => import('./pages/admin/Returns'));
const AdminWastage = lazy(() => import('./pages/admin/Wastage'));
const AdminSubscription = lazy(() => import('./pages/admin/Subscription'));
const AdminNotices = lazy(() => import('./pages/admin/Notices'));
const AdminFAQs = lazy(() => import('./pages/admin/FAQs'));
const AdminContact = lazy(() => import('./pages/admin/Contact'));

// Dealer
const DealerDashboard = lazy(() => import('./pages/dealer/Dashboard'));
const DealerFarmers = lazy(() => import('./pages/dealer/Farmers'));
const DealerDevices = lazy(() => import('./pages/dealer/Devices'));
const DealerReturns = lazy(() => import('./pages/dealer/Returns'));
const DealerStock = lazy(() => import('./pages/dealer/Stock'));

// Farmer
const FarmerDashboard = lazy(() => import('./pages/farmer/Dashboard'));
const FarmerDevices = lazy(() => import('./pages/farmer/Devices'));
const FarmerCommands = lazy(() => import('./pages/farmer/Commands'));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, refetchOnWindowFocus: false } },
});

const PageFallback = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
  </div>
);

function AuthListener() {
  const { setUser, setProfile, setLoading, fetchProfile, syncClerkUser } = useAuthStore();
  const { user: clerkUser, isLoaded: isClerkLoaded, isSignedIn: isClerkSignedIn } = useUser();
  const navigate = useNavigate();
  const redirectedRef = useRef(false);

  // Sync Clerk User State
  useEffect(() => {
    if (!isClerkLoaded) return;

    if (isClerkSignedIn && clerkUser) {
      void (async () => {
        await syncClerkUser(clerkUser);
        const role = await resolveUserRole(clerkUser, clerkUser.id);
        const authPages = ['/auth/callback', '/login', '/register', '/forgot-password', '/qr-login'];
        const onAuthPage = authPages.includes(window.location.pathname);
        if (onAuthPage && !redirectedRef.current) {
          redirectedRef.current = true;
          navigate(getDefaultRouteForRole(role), { replace: true });
        }
      })();
    } else {
      // Check fallback Supabase session if Clerk is not signed in
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          setUser(session.user);
          fetchProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
          setLoading(false);
        }
      }).catch(() => {
        setUser(null);
        setProfile(null);
        setLoading(false);
      });
    }
  }, [isClerkLoaded, isClerkSignedIn, clerkUser, syncClerkUser, setUser, setProfile, setLoading, fetchProfile, navigate]);

  // Supabase fallback listener for non-Clerk auth sessions
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (isClerkSignedIn) return;

      if (session) {
        setUser(session.user);
        (async () => {
          await fetchProfile(session.user.id);
          const role = await getProfileRole(session.user.id).catch(() => 'user' as const);
          const authPages = ['/auth/callback','/login','/register','/forgot-password','/qr-login'];
          const onAuthPage = authPages.includes(window.location.pathname);
          if (event === 'SIGNED_IN' && onAuthPage && !redirectedRef.current) {
            redirectedRef.current = true;
            navigate(getDefaultRouteForRole(role), { replace: true });
          }
        })();
      } else {
        redirectedRef.current = false;
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, [isClerkSignedIn, setUser, setProfile, setLoading, fetchProfile, navigate]);

  return null;
}

function AppRoutes() {
  const loading = useAuthStore((s) => s.loading);
  const { isLoaded: isClerkLoaded } = useUser();

  if (!isClerkLoaded || loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Navbar />
      <main className="flex-grow">
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* Public */}
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/qr-login" element={<QRLogin />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/cart" element={<Cart />} />

            {/* Authenticated any role */}
            <Route path="/checkout" element={<AuthGuard allowedRoles={['user','customer','admin','super_admin']}><Checkout /></AuthGuard>} />
            <Route path="/profile" element={<AuthGuard allowedRoles={['user','customer','admin','super_admin','dealer','farmer','developer','manager','writer']}><Profile /></AuthGuard>} />

            {/* Admin */}
            <Route path="/admin" element={<ProtectedAdminRoute><AdminDashboard /></ProtectedAdminRoute>} />
            <Route path="/admin/pos" element={<ProtectedAdminRoute><AdminPOS /></ProtectedAdminRoute>} />
            <Route path="/admin/invoices" element={<ProtectedAdminRoute><AdminInvoices /></ProtectedAdminRoute>} />
            <Route path="/admin/products" element={<ProtectedAdminRoute><AdminProducts /></ProtectedAdminRoute>} />
            <Route path="/admin/inventory" element={<ProtectedAdminRoute><AdminInventory /></ProtectedAdminRoute>} />
            <Route path="/admin/orders" element={<ProtectedAdminRoute><AdminOrders /></ProtectedAdminRoute>} />
            <Route path="/admin/customers" element={<ProtectedAdminRoute><AdminCustomers /></ProtectedAdminRoute>} />
            <Route path="/admin/dealers" element={<ProtectedAdminRoute><AdminDealers /></ProtectedAdminRoute>} />
            <Route path="/admin/farmers" element={<ProtectedAdminRoute><AdminFarmers /></ProtectedAdminRoute>} />
            <Route path="/admin/team" element={<ProtectedAdminRoute><AdminTeam /></ProtectedAdminRoute>} />
            <Route path="/admin/devices" element={<ProtectedAdminRoute><AdminDevices /></ProtectedAdminRoute>} />
            <Route path="/admin/commands" element={<ProtectedAdminRoute><AdminCommands /></ProtectedAdminRoute>} />
            <Route path="/admin/expenses" element={<ProtectedAdminRoute><AdminExpenses /></ProtectedAdminRoute>} />
            <Route path="/admin/returns" element={<ProtectedAdminRoute><AdminReturns /></ProtectedAdminRoute>} />
            <Route path="/admin/wastage" element={<ProtectedAdminRoute><AdminWastage /></ProtectedAdminRoute>} />
            <Route path="/admin/reports" element={<ProtectedAdminRoute><AdminReports /></ProtectedAdminRoute>} />
            <Route path="/admin/subscription" element={<ProtectedAdminRoute><AdminSubscription /></ProtectedAdminRoute>} />
            <Route path="/admin/notices" element={<ProtectedAdminRoute><AdminNotices /></ProtectedAdminRoute>} />
            <Route path="/admin/faqs" element={<ProtectedAdminRoute><AdminFAQs /></ProtectedAdminRoute>} />
            <Route path="/admin/contact" element={<ProtectedAdminRoute><AdminContact /></ProtectedAdminRoute>} />
            <Route path="/admin/users" element={<ProtectedAdminRoute><AdminUsers /></ProtectedAdminRoute>} />
            <Route path="/admin/management" element={<ProtectedAdminRoute><AdminManagement /></ProtectedAdminRoute>} />

            {/* Dealer */}
            <Route path="/dealer" element={<ProtectedRoleRoute allowedRoles={['dealer','admin','super_admin']}><DealerDashboard /></ProtectedRoleRoute>} />
            <Route path="/dealer/farmers" element={<ProtectedRoleRoute allowedRoles={['dealer','admin','super_admin']}><DealerFarmers /></ProtectedRoleRoute>} />
            <Route path="/dealer/devices" element={<ProtectedRoleRoute allowedRoles={['dealer','admin','super_admin']}><DealerDevices /></ProtectedRoleRoute>} />
            <Route path="/dealer/returns" element={<ProtectedRoleRoute allowedRoles={['dealer','admin','super_admin']}><DealerReturns /></ProtectedRoleRoute>} />
            <Route path="/dealer/stock" element={<ProtectedRoleRoute allowedRoles={['dealer','admin','super_admin']}><DealerStock /></ProtectedRoleRoute>} />

            {/* Farmer */}
            <Route path="/farmer" element={<ProtectedRoleRoute allowedRoles={['farmer','admin','super_admin']}><FarmerDashboard /></ProtectedRoleRoute>} />
            <Route path="/farmer/devices" element={<ProtectedRoleRoute allowedRoles={['farmer','admin','super_admin']}><FarmerDevices /></ProtectedRoleRoute>} />
            <Route path="/farmer/commands" element={<ProtectedRoleRoute allowedRoles={['farmer','admin','super_admin']}><FarmerCommands /></ProtectedRoleRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
      <MobileBottomNav />
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <Router>
          <AuthListener />
          <AppRoutes />
        </Router>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
