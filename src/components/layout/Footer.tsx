import { useEffect, useState } from 'react';

const SITE_KEY = 'Incutech_Site_v1';

interface SiteSettings {
  siteName: string;
  tagline: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  whatsapp: string;
  facebook: string;
  instagram: string;
  linkedin: string;
  youtube: string;
  businessHours: string;
}

const defaultSettings: SiteSettings = {
  siteName: 'IncuTech Systems',
  tagline: 'High-precision automation and incubator control systems for modern environments.',
  contactEmail: 'incutechsystems@gmail.com',
  contactPhone: '+8801917974820',
  address: 'Nobinagar, Saver, Dhaka',
  whatsapp: '',
  facebook: '',
  instagram: '',
  linkedin: '',
  youtube: '',
  businessHours: 'Sat-Thu, 9:00 AM - 6:00 PM',
};

const Footer = () => {
  const [s, setS] = useState<SiteSettings>(defaultSettings);

  useEffect(() => {
    const load = () => {
      try {
        const raw = localStorage.getItem(SITE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setS({ ...defaultSettings, ...(parsed.settings || {}) });
        }
      } catch {}
    };

    load();

    // Works across tabs AND same tab (Management dispatches StorageEvent manually)
    const onStorage = (e: StorageEvent) => {
      if (e.key === SITE_KEY) load();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const socialLinks = [
    { label: 'Facebook',  url: s.facebook,  icon: '📘' },
    { label: 'Instagram', url: s.instagram, icon: '📸' },
    { label: 'LinkedIn',  url: s.linkedin,  icon: '💼' },
    { label: 'YouTube',   url: s.youtube,   icon: '▶️' },
    { label: 'WhatsApp',  url: s.whatsapp ? `https://wa.me/${s.whatsapp.replace(/\D/g,'')}` : '', icon: '💬' },
  ].filter(l => l.url && l.url.trim() !== '');

  return (
    <footer className="bg-slate-900 text-slate-300 mt-16 pb-20 md:pb-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 sm:gap-10 text-center sm:text-left">

        {/* BRAND */}
        <div className="flex flex-col items-center md:items-start">
          <div className="flex items-center space-x-3 mb-4">
            <img src="/logo.png" className="h-10" alt="logo" />
            <div>
              <p className="font-bold text-white text-lg">
                <span className="text-gray-300">Incu</span>
                <span className="text-blue-500">Tech</span>
              </p>
              <p className="text-xs tracking-[3px] text-gray-500">SYSTEMS</p>
            </div>
          </div>

          <p className="text-sm text-slate-400 max-w-xs">
            {s.tagline || defaultSettings.tagline}
          </p>

          {socialLinks.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-5">
              {socialLinks.map(link => (
                <a
                  key={link.label}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-400 hover:text-white text-sm transition"
                >
                  {link.icon} {link.label}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* COMPANY */}
        <div>
          <h4 className="text-white font-semibold mb-4">Company</h4>
          <ul className="space-y-2 text-sm">
            <li className="hover:text-white cursor-pointer">About</li>
            <li className="hover:text-white cursor-pointer">Services</li>
            <li className="hover:text-white cursor-pointer">Contact</li>
          </ul>
          {s.businessHours && (
            <div className="mt-5">
              <p className="text-white text-xs font-semibold mb-1">🕐 Business Hours</p>
              <p className="text-xs text-slate-400">{s.businessHours}</p>
            </div>
          )}
        </div>

        {/* CONTACT */}
        <div>
          <h4 className="text-white font-semibold mb-4">Contact</h4>
          <div className="space-y-2 text-sm">
            {s.address && <p>📍 {s.address}</p>}
            {s.contactPhone && (
              <p>📞 <a href={`tel:${s.contactPhone}`} className="hover:text-white transition">{s.contactPhone}</a></p>
            )}
            {s.contactEmail && (
              <p>📧 <a href={`mailto:${s.contactEmail}`} className="hover:text-white transition">{s.contactEmail}</a></p>
            )}
            {s.whatsapp && (
              <p>💬 <a href={`https://wa.me/${s.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noopener noreferrer" className="hover:text-white transition">WhatsApp</a></p>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM */}
      <div className="border-t border-slate-800 text-center py-4 text-sm text-slate-500">
        © {new Date().getFullYear()} {s.siteName}. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
