import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, ShoppingCart, Users, Settings,
  ArrowLeft, ShoppingBag, FileText, BarChart2, Truck,
  Cpu, Terminal, Receipt, RotateCcw, Trash2, DollarSign,
  Bell, HelpCircle, Phone, CreditCard, UserCheck, Leaf,
  ChevronDown, ChevronRight, Menu, X, Store
} from 'lucide-react';
import { useState, useEffect } from 'react';

interface AdminLayoutProps { children: ReactNode; }

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { icon: <LayoutDashboard size={18} />, label: 'Dashboard', path: '/admin' },
    ]
  },
  {
    label: 'Sales',
    items: [
      { icon: <ShoppingBag size={18} />, label: 'POS', path: '/admin/pos' },
      { icon: <FileText size={18} />, label: 'Invoices', path: '/admin/invoices' },
      { icon: <RotateCcw size={18} />, label: 'Returns', path: '/admin/returns' },
      { icon: <Trash2 size={18} />, label: 'Wastage', path: '/admin/wastage' },
    ]
  },
  {
    label: 'Inventory',
    items: [
      { icon: <Package size={18} />, label: 'Inventory', path: '/admin/inventory' },
      { icon: <Package size={18} />, label: 'Products', path: '/admin/products' },
    ]
  },
  {
    label: 'People',
    items: [
      { icon: <Users size={18} />, label: 'Customers', path: '/admin/customers' },
      { icon: <Truck size={18} />, label: 'Dealers', path: '/admin/dealers' },
      { icon: <Leaf size={18} />, label: 'Farmers', path: '/admin/farmers' },
      { icon: <UserCheck size={18} />, label: 'Team', path: '/admin/team' },
      { icon: <Users size={18} />, label: 'All Users', path: '/admin/users' },
    ]
  },
  {
    label: 'Devices',
    items: [
      { icon: <Cpu size={18} />, label: 'Devices', path: '/admin/devices' },
      { icon: <Terminal size={18} />, label: 'Commands', path: '/admin/commands' },
    ]
  },
  {
    label: 'Finance',
    items: [
      { icon: <Receipt size={18} />, label: 'Expenses', path: '/admin/expenses' },
      { icon: <BarChart2 size={18} />, label: 'Reports', path: '/admin/reports' },
      { icon: <CreditCard size={18} />, label: 'Subscription', path: '/admin/subscription' },
    ]
  },
  {
    label: 'Content',
    items: [
      { icon: <Bell size={18} />, label: 'Notices', path: '/admin/notices' },
      { icon: <HelpCircle size={18} />, label: 'FAQs', path: '/admin/faqs' },
      { icon: <Phone size={18} />, label: 'Contact Info', path: '/admin/contact' },
    ]
  },
  {
    label: 'System',
    items: [
      { icon: <ShoppingCart size={18} />, label: 'Orders', path: '/admin/orders' },
      { icon: <Settings size={18} />, label: 'Management', path: '/admin/management' },
    ]
  },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const toggle = (label: string) => setCollapsed(p => ({ ...p, [label]: !p[label] }));
  const isActive = (path: string) => location.pathname === path;

  // Find active label
  let currentTitle = 'Admin';
  for (const group of NAV_GROUPS) {
    const match = group.items.find(i => i.path === location.pathname);
    if (match) {
      currentTitle = match.label;
      break;
    }
  }

  // Close drawer on path change
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [location.pathname]);

  const renderNavList = () => (
    <nav className="flex-grow p-3 space-y-1 overflow-y-auto">
      {NAV_GROUPS.map((group) => {
        const open = collapsed[group.label] === undefined ? true : !collapsed[group.label];
        return (
          <div key={group.label} className="mb-1">
            <button
              onClick={() => toggle(group.label)}
              className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            >
              <span>{group.label}</span>
              {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
            {open && (
              <div className="space-y-0.5 mt-0.5">
                {group.items.map((item) => {
                  const active = isActive(item.path);
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileDrawerOpen(false)}
                      className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        active
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 hover:text-indigo-600'
                      }`}
                    >
                      {item.icon}
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background flex flex-col md:flex-row">
      {/* MOBILE TOP BAR */}
      <header className="md:hidden sticky top-0 z-30 bg-white/95 dark:bg-card/95 backdrop-blur-md border-b border-gray-200 dark:border-border px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="p-2 rounded-xl bg-gray-100 dark:bg-muted text-gray-700 dark:text-foreground hover:bg-gray-200 active:scale-95 transition"
            aria-label="Open admin navigation menu"
          >
            <Menu size={20} />
          </button>
          <div className="flex flex-col">
            <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Admin Panel</span>
            <span className="text-sm font-bold text-gray-900 dark:text-foreground truncate max-w-[160px] sm:max-w-xs">{currentTitle}</span>
          </div>
        </div>

        <Link
          to="/"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-600 dark:text-muted-foreground bg-gray-100 dark:bg-muted hover:bg-gray-200 transition"
        >
          <Store size={14} />
          <span>Store</span>
        </Link>
      </header>

      {/* MOBILE OFF-CANVAS DRAWER */}
      {mobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setMobileDrawerOpen(false)}
          />

          {/* Drawer panel */}
          <div className="relative w-4/5 max-w-xs bg-white dark:bg-card shadow-2xl flex flex-col h-full z-10 animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b border-gray-100 dark:border-border flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <img src="/logo.png" alt="Logo" className="h-7 w-auto" />
                <span className="text-base font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  IncuTech Admin
                </span>
              </div>
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-muted"
                aria-label="Close admin navigation menu"
              >
                <X size={20} />
              </button>
            </div>

            {renderNavList()}

            <div className="p-3 border-t border-gray-100 dark:border-border">
              <Link
                to="/"
                onClick={() => setMobileDrawerOpen(false)}
                className="flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-muted transition-all"
              >
                <ArrowLeft size={18} />
                <span>Back to Store</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* DESKTOP SIDEBAR */}
      <aside className="w-60 bg-white dark:bg-card border-r border-gray-200 dark:border-border hidden md:flex flex-col sticky top-0 h-screen overflow-y-auto">
        <div className="p-5 border-b border-gray-100 dark:border-border">
          <Link to="/" className="flex items-center space-x-2 group mb-3">
            <img src="/logo.png" alt="Logo" className="h-7 w-auto" />
            <span className="text-base font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent leading-tight">
              IncuTech
            </span>
          </Link>
          <div className="inline-flex items-center px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-wider">
            Admin Panel
          </div>
        </div>

        {renderNavList()}

        <div className="p-3 border-t border-gray-100 dark:border-border">
          <Link to="/" className="flex items-center space-x-3 px-3 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-muted transition-all">
            <ArrowLeft size={18} />
            <span>Back to Store</span>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow p-3 sm:p-6 lg:p-8 overflow-y-auto overflow-x-hidden min-w-0 pb-24 md:pb-8">
        <div className="max-w-7xl mx-auto min-w-0">
          {children}
        </div>
      </main>
    </div>
  );
}
