import { Link, useNavigate } from 'react-router-dom';
import {
  ShoppingCart,
   Menu,
  X,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { useState, useRef, useEffect } from 'react';

const Navbar = () => {
  const { user, profile, signOut } = useAuthStore();
  const { items } = useCartStore();
  const navigate = useNavigate();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
    await signOut();
    navigate('/login');
    setIsDropdownOpen(false);
  };

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">

          {/* LOGO */}
          <Link to="/" className="flex items-center space-x-3 group">
            <img
              src="/logo.png"
              alt="Logo"
              className="h-10 w-auto transition-transform duration-300 group-hover:scale-110"
            />

            {/* Styled Brand Text */}
            <div className="flex flex-col leading-tight">
              <span className="text-2xl font-black">
                <span className="text-gray-800">Incu</span>
                <span className="text-blue-600">Tech</span>
              </span>
              <span className="text-[10px] tracking-[4px] text-gray-500 font-semibold">
                SYSTEMS
              </span>
            </div>
          </Link>

          {/* DESKTOP MENU */}
          <div className="hidden sm:flex items-center space-x-6">
            
            {/* CART */}
            <Link to="/cart" className="relative p-2 text-gray-600 hover:text-blue-600 transition">
              <ShoppingCart size={24} />
              {cartCount > 0 && (
                <span className="absolute top-0 right-0 text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* USER */}
            {user ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center space-x-2"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center">
                    {getInitials(profile?.full_name || user.email || 'User')}
                  </div>
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border">
                    <div className="p-3 border-b">
                      <p className="font-semibold">
                        {profile?.full_name || 'User'}
                      </p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>

                    <Link to="/profile" className="block px-4 py-2 hover:bg-gray-100">
                      Profile
                    </Link>

                    {profile?.role === 'admin' && (
                      <Link to="/admin" className="block px-4 py-2 hover:bg-gray-100">
                        Dashboard
                      </Link>
                    )}

                    <button
                      onClick={handleSignOut}
                      className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link to="/login" className="text-gray-700 hover:text-blue-600">
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="bg-blue-600 text-white px-5 py-2 rounded-full hover:bg-blue-700"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* MOBILE BUTTON */}
          <div className="sm:hidden">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE MENU */}
      {isMobileMenuOpen && (
        <div className="sm:hidden bg-white border-t p-4 space-y-3">
          <Link to="/cart">Cart ({cartCount})</Link>

          {user ? (
            <>
              <Link to="/profile">Profile</Link>
              {profile?.role === 'admin' && <Link to="/admin">Admin</Link>}
              <button onClick={handleSignOut} className="text-red-600">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login">Sign In</Link>
              <Link to="/register">Sign Up</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;