import { Link, useLocation } from 'react-router-dom';
import { Home, Package, ShoppingCart, User, LayoutDashboard, Shield } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { useTranslation } from '../../hooks/useTranslation';
import { memo } from 'react';

const MobileBottomNav = () => {
  const location = useLocation();
  const { user, profile, isAdmin } = useAuthStore();
  const { items } = useCartStore();
  const { t } = useTranslation();

  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);
  const isUserAdmin = profile?.role === 'admin' || profile?.role === 'super_admin' || isAdmin();
  const isDealer = profile?.role === 'dealer';
  const isFarmer = profile?.role === 'farmer';

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  // Determine portal/profile destination
  let profilePath = '/profile';
  let profileLabel = t.nav?.myAccount || 'Account';
  let ProfileIcon = User;

  if (isUserAdmin) {
    profilePath = location.pathname.startsWith('/admin') ? '/admin' : '/profile';
    profileLabel = location.pathname.startsWith('/admin') ? 'Admin' : (t.nav?.myAccount || 'Account');
    ProfileIcon = location.pathname.startsWith('/admin') ? LayoutDashboard : User;
  } else if (isDealer) {
    profilePath = location.pathname.startsWith('/dealer') ? '/dealer' : '/profile';
    profileLabel = location.pathname.startsWith('/dealer') ? 'Dealer' : (t.nav?.myAccount || 'Account');
    ProfileIcon = location.pathname.startsWith('/dealer') ? LayoutDashboard : User;
  } else if (isFarmer) {
    profilePath = location.pathname.startsWith('/farmer') ? '/farmer' : '/profile';
    profileLabel = location.pathname.startsWith('/farmer') ? 'Farmer' : (t.nav?.myAccount || 'Account');
    ProfileIcon = location.pathname.startsWith('/farmer') ? LayoutDashboard : User;
  }

  // Navigation Items
  const navItems = [
    {
      label: t.nav?.home || 'Home',
      path: '/',
      icon: Home,
    },
    {
      label: t.nav?.products || 'Products',
      path: '/products',
      icon: Package,
    },
    {
      label: t.nav?.cart || 'Cart',
      path: '/cart',
      icon: ShoppingCart,
      badge: cartCount > 0 ? cartCount : undefined,
    },
    {
      label: profileLabel,
      path: profilePath,
      icon: ProfileIcon,
    },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-xl border-t border-border/80 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_20px_rgba(0,0,0,0.4)]"
      style={{
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)',
      }}
    >
      <div className="grid grid-cols-4 h-14 max-w-lg mx-auto items-center px-2">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.path + item.label}
              to={item.path}
              className={`flex flex-col items-center justify-center h-full relative transition-all duration-200 select-none ${
                active
                  ? 'text-primary font-bold scale-105'
                  : 'text-muted-foreground hover:text-foreground active:scale-95'
              }`}
            >
              <div className="relative">
                <Icon
                  size={20}
                  className={`transition-transform duration-200 ${
                    active ? 'stroke-[2.5px] text-blue-600 dark:text-blue-400' : 'stroke-[1.75px]'
                  }`}
                />
                {item.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[10px] font-black min-w-[17px] h-[17px] flex items-center justify-center rounded-full px-1 shadow-sm animate-in zoom-in-50 duration-200">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] tracking-tight mt-1 transition-colors truncate max-w-[70px] ${
                  active
                    ? 'text-blue-600 dark:text-blue-400 font-black'
                    : 'text-muted-foreground font-medium'
                }`}
              >
                {item.label}
              </span>
              {active && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-blue-600 dark:bg-blue-400" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default memo(MobileBottomNav);
