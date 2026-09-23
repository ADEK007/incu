import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  Package,
  ShoppingBag,
  Settings,
  User,
  LogOut,
} from 'lucide-react';
import { useClerk } from '@clerk/react';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { memo, useState, useRef, useEffect } from 'react';
import { ThemeToggle } from '../theme/ThemeToggle';
import LanguageSwitcher from '../ui/LanguageSwitcher';
import { useTranslation } from '../../hooks/useTranslation';

const Navbar = () => {
  const { user, profile, signOut, isAdmin } = useAuthStore();
  const { items } = useCartStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const clerk = useClerk();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAdminSubOpen, setIsAdminSubOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileAdminOpen, setIsMobileAdminOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const cartCount = items.reduce((acc, item) => acc + item.quantity, 0);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    try {
      await clerk.signOut();
    } catch (err) {
      console.error('Clerk signOut error:', err);
    }
    await signOut();
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
    navigate('/');
  };

  const handleOpenProfile = () => {
    setIsDropdownOpen(false);
    setIsMobileMenuOpen(false);
    clerk.openUserProfile();
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'U';
    return parts
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const isUserAdmin = profile?.role === 'admin' || profile?.role === 'super_admin' || isAdmin();
  const displayName = profile?.full_name || user?.user_metadata?.full_name || 'User';
  const displayEmail = profile?.email || user?.email || '';

  return (
    <nav className="bg-background/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">

          {/* LOGO & NAV LINKS */}
          <div className="flex items-center space-x-8">
            <Link to="/" className="flex items-center space-x-3 group">
              <picture>
                <source srcSet="/logo.webp" type="image/webp" />
                <img
                  src="/logo.png"
                  alt="IncuTech logo"
                  width={40}
                  height={40}
                  loading="eager"
                  decoding="async"
                  className="h-10 w-auto transition-transform duration-300 group-hover:scale-110"
                />
              </picture>

              <div className="flex flex-col leading-tight">
                <span className="text-2xl font-black">
                  <span className="text-foreground">Incu</span>
                  <span className="text-blue-600 dark:text-blue-400">Tech</span>
                </span>
                <span className="text-[10px] tracking-[4px] text-muted-foreground font-semibold">
                  SYSTEMS
                </span>
              </div>
            </Link>

            <div className="hidden md:flex items-center space-x-1">
              <Link
                to="/"
                className="px-3 py-1.5 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition"
              >
                {t.nav.home}
              </Link>
              <Link
                to="/products"
                className="px-3 py-1.5 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition"
              >
                {t.nav.products}
              </Link>
            </div>
          </div>

          {/* DESKTOP MENU */}
          <div className="hidden sm:flex items-center space-x-3">
            {/* Language Switcher */}
            <LanguageSwitcher />

            <ThemeToggle />

            <Link to="/cart" className="relative p-2 text-muted-foreground hover:text-foreground transition">
              <ShoppingCart size={22} />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 text-xs bg-red-500 text-white px-1.5 py-0.2 rounded-full font-bold">
                  {cartCount}
                </span>
              )}
            </Link>

            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center space-x-2 focus:outline-none"
                  aria-label="User menu"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm tracking-wider shadow-md hover:bg-blue-700 transition">
                    {getInitials(displayName)}
                  </div>
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-60 bg-popover text-popover-foreground rounded-xl shadow-xl border border-border overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-100">
                    {/* User Info */}
                    <div className="p-3.5 border-b border-border bg-muted/40">
                      <p className="font-semibold text-sm truncate text-foreground">{displayName}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{displayEmail}</p>
                    </div>

                    {/* Account */}
                    <div className="py-1">
                      <Link
                        to="/profile"
                        onClick={() => setIsDropdownOpen(false)}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-foreground hover:bg-accent transition text-left font-medium"
                      >
                        <User size={16} className="text-muted-foreground" />
                        <span>{t.nav.myAccount}</span>
                      </Link>
                    </div>

                    {/* Admin Dashboard Submenu */}
                    {isUserAdmin && (
                      <div className="border-t border-border py-1">
                        <button
                          onClick={() => setIsAdminSubOpen(!isAdminSubOpen)}
                          className="w-full flex items-center justify-between px-4 py-2 text-sm text-foreground hover:bg-accent transition"
                        >
                          <span className="flex items-center gap-2.5">
                            <LayoutDashboard size={16} className="text-muted-foreground" />
                            <span>{t.nav.adminDashboard}</span>
                          </span>
                          {isAdminSubOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </button>
                        {isAdminSubOpen && (
                          <div className="bg-muted/40 border-y border-border/50 py-1 pl-4 space-y-0.5">
                            <Link
                              to="/admin"
                              onClick={() => setIsDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-4 py-1.5 text-xs text-foreground/90 hover:bg-accent rounded-md transition"
                            >
                              <LayoutDashboard size={14} className="text-muted-foreground" />
                              <span>Overview</span>
                            </Link>
                            <Link
                              to="/admin/products"
                              onClick={() => setIsDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-4 py-1.5 text-xs text-foreground/90 hover:bg-accent rounded-md transition"
                            >
                              <Package size={14} className="text-muted-foreground" />
                              <span>Products</span>
                            </Link>
                            <Link
                              to="/admin/orders"
                              onClick={() => setIsDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-4 py-1.5 text-xs text-foreground/90 hover:bg-accent rounded-md transition"
                            >
                              <ShoppingBag size={14} className="text-muted-foreground" />
                              <span>Orders</span>
                            </Link>
                            <Link
                              to="/admin/management"
                              onClick={() => setIsDropdownOpen(false)}
                              className="flex items-center gap-2.5 px-4 py-1.5 text-xs text-foreground/90 hover:bg-accent rounded-md transition"
                            >
                              <Settings size={14} className="text-muted-foreground" />
                              <span>Management</span>
                            </Link>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Logout */}
                    <div className="border-t border-border py-1">
                      <button
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-500/10 transition text-left font-medium cursor-pointer"
                      >
                        <LogOut size={16} />
                        <span>{t.nav.signOut}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => clerk.openSignIn()}
                  className="bg-blue-600 text-white px-5 py-2 rounded-full hover:bg-blue-700 font-bold text-sm transition shadow-sm cursor-pointer"
                >
                  {t.nav.signIn}
                </button>
              </div>
            )}
          </div>

          {/* MOBILE BUTTONS */}
          <div className="sm:hidden flex items-center gap-1.5">
            <Link
              to="/cart"
              className="relative p-2 text-muted-foreground hover:text-foreground active:scale-95 transition"
              aria-label="Shopping Cart"
            >
              <ShoppingCart size={21} />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 text-[10px] bg-red-500 text-white min-w-[17px] h-[17px] flex items-center justify-center rounded-full font-black px-1 shadow-sm animate-in zoom-in-50 duration-200">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Link>
            <LanguageSwitcher />
            <ThemeToggle />
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="text-foreground p-2 rounded-lg hover:bg-muted active:scale-95 transition"
              aria-label="Toggle navigation menu"
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE MENU WITH OVERLAY */}
      {isMobileMenuOpen && (
        <div className="sm:hidden border-t border-border bg-background/95 backdrop-blur-xl animate-in slide-in-from-top-2 duration-200 shadow-2xl">
          <div className="p-4 space-y-3 max-h-[calc(100dvh-5rem)] overflow-y-auto">
            {/* User header if logged in */}
            {user ? (
              <div className="p-3 bg-muted/50 rounded-2xl border border-border/60 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-sm shadow-sm flex-shrink-0">
                  {getInitials(displayName)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-foreground truncate">{displayName}</p>
                    {profile?.role && (
                      <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        {profile.role}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
                </div>
              </div>
            ) : null}

            {/* Core Links */}
            <div className="grid grid-cols-2 gap-2">
              <Link
                to="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold text-foreground bg-muted/40 hover:bg-muted transition"
              >
                <span>🏠</span> {t.nav.home}
              </Link>
              <Link
                to="/products"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold text-foreground bg-muted/40 hover:bg-muted transition"
              >
                <span>📦</span> {t.nav.products}
              </Link>
            </div>

            {user ? (
              <>
                <Link
                  to="/profile"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-foreground hover:bg-muted transition font-semibold"
                >
                  <User size={18} className="text-muted-foreground" />
                  <span>{t.nav.myAccount}</span>
                </Link>

                {isUserAdmin && (
                  <div className="bg-muted/30 rounded-2xl border border-border/50 p-2">
                    <button
                      onClick={() => setIsMobileAdminOpen(!isMobileAdminOpen)}
                      className="w-full flex items-center justify-between px-2 py-1.5 text-sm font-bold text-foreground cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <LayoutDashboard size={18} className="text-blue-600 dark:text-blue-400" />
                        <span>{t.nav.adminDashboard}</span>
                      </span>
                      {isMobileAdminOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                    {isMobileAdminOpen && (
                      <div className="grid grid-cols-2 gap-1.5 pt-2 mt-1 border-t border-border/40">
                        <Link
                          to="/admin"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-foreground/90 hover:bg-muted rounded-lg transition"
                        >
                          <LayoutDashboard size={14} className="text-muted-foreground" />
                          <span>Overview</span>
                        </Link>
                        <Link
                          to="/admin/products"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-foreground/90 hover:bg-muted rounded-lg transition"
                        >
                          <Package size={14} className="text-muted-foreground" />
                          <span>Products</span>
                        </Link>
                        <Link
                          to="/admin/orders"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-foreground/90 hover:bg-muted rounded-lg transition"
                        >
                          <ShoppingBag size={14} className="text-muted-foreground" />
                          <span>Orders</span>
                        </Link>
                        <Link
                          to="/admin/management"
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-foreground/90 hover:bg-muted rounded-lg transition"
                        >
                          <Settings size={14} className="text-muted-foreground" />
                          <span>Management</span>
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-600 dark:text-red-400 hover:bg-red-500/10 transition text-left font-bold cursor-pointer"
                >
                  <LogOut size={18} />
                  <span>{t.nav.signOut}</span>
                </button>
              </>
            ) : (
              <div className="pt-2">
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    clerk.openSignIn();
                  }}
                  className="w-full py-3 text-center bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition shadow-md active:scale-95 cursor-pointer"
                >
                  {t.nav.signIn}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default memo(Navbar);

