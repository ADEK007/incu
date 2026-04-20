const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-300 mt-20">
      <div className="max-w-7xl mx-auto px-4 py-16 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-10 text-center md:text-left">

        {/* BRAND */}
        <div className="flex flex-col items-center md:items-start">
          <div className="flex items-center space-x-3 mb-4">
            <img src="/logo.png" className="h-10" alt="logo" />

            <div>
              <p className="font-bold text-white text-lg">
                <span className="text-gray-300">Incu</span>
                <span className="text-blue-500">Tech</span>
              </p>
              <p className="text-xs tracking-[3px] text-gray-500">
                SYSTEMS
              </p>
            </div>
          </div>

          <p className="text-sm text-slate-400 max-w-xs">
            High-precision automation and incubator control systems for modern environments.
          </p>
        </div>

        {/* COMPANY */}
        <div>
          <h4 className="text-white font-semibold mb-4">Company</h4>
          <ul className="space-y-2 text-sm">
            <li className="hover:text-white cursor-pointer">About</li>
            <li className="hover:text-white cursor-pointer">Services</li>
            <li className="hover:text-white cursor-pointer">Contact</li>
          </ul>
        </div>

        {/* CONTACT */}
        <div>
          <h4 className="text-white font-semibold mb-4">Contact</h4>
          <div className="space-y-2 text-sm">
            <p>📍 Nobinagar, Saver, Dhaka</p>
            <p>📞 +8801917974820</p>
            <p>📧 incutechsystems@gmail.com</p>
          </div>
        </div>
      </div>

      {/* BOTTOM */}
      <div className="border-t border-slate-800 text-center py-4 text-sm text-slate-500">
        © {new Date().getFullYear()} IncuTech Systems. All rights reserved 2026.
      </div>
    </footer>
  );
};

export default Footer;