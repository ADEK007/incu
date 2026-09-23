import { Cpu, Microchip, Cloud, Settings, Thermometer, Zap, Award, ShieldCheck, Headphones, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';

const Home = () => {
  const { t, language } = useTranslation();

  const isBn = language === 'bn';

  return (
    <div className="space-y-12 pb-16">

      {/* ================= HERO (ADVANCED HARDWARE) ================= */}
      <section className="relative pt-12 pb-14 sm:pt-24 sm:pb-20 lg:pt-36 lg:pb-32 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        
        {/* Background Pattern */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'radial-gradient(#ffffff 0.5px, transparent 0.5px)',
            backgroundSize: '30px 30px',
          }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">

            {/* LEFT HERO TEXT */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center space-x-2 bg-blue-500/10 border border-blue-500/20 px-3.5 py-1 sm:px-4 sm:py-1.5 rounded-full mb-4 sm:mb-6 text-blue-400 text-[11px] sm:text-xs font-bold uppercase tracking-widest">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                <span>{t.home.heroBadge}</span>
              </div>

              <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-white leading-[1.15] mb-4 sm:mb-6 tracking-tight">
                {t.home.heroTitle1} <span className="text-blue-500">{t.home.heroTitle2}</span>
              </h1>

              <p className="text-sm sm:text-lg lg:text-xl text-slate-300 mb-6 sm:mb-8 max-w-xl leading-relaxed mx-auto lg:mx-0">
                {t.home.heroSubtitle}
              </p>

              <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-3 sm:gap-4">
                <Link
                  to="/products"
                  className="w-full sm:w-auto text-center px-6 sm:px-8 py-3.5 sm:py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-sm sm:text-base transition-all shadow-xl shadow-blue-900/30 active:scale-95"
                >
                  {t.home.exploreBtn}
                </Link>
                <a
                  href="#why-us"
                  className="w-full sm:w-auto text-center px-6 sm:px-8 py-3.5 sm:py-4 bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl font-bold text-sm sm:text-base transition-all"
                >
                  {isBn ? 'বিস্তারিত জানুন' : 'Learn More'}
                </a>
              </div>

              {/* STATS STRIP */}
              <div className="grid grid-cols-3 gap-2 sm:gap-4 mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-slate-800/80 text-left">
                <div>
                  <div className="text-xl sm:text-3xl font-black text-blue-400 font-mono">
                    {t.home.statsHatchRate}
                  </div>
                  <div className="text-[10px] sm:text-xs text-slate-400 font-medium mt-0.5 sm:mt-1 truncate">
                    {t.home.statsHatchRateLabel}
                  </div>
                </div>
                <div>
                  <div className="text-xl sm:text-3xl font-black text-emerald-400 font-mono">
                    {t.home.statsDevices}
                  </div>
                  <div className="text-[10px] sm:text-xs text-slate-400 font-medium mt-0.5 sm:mt-1 truncate">
                    {t.home.statsDevicesLabel}
                  </div>
                </div>
                <div>
                  <div className="text-xl sm:text-3xl font-black text-cyan-400 font-mono">
                    {t.home.statsWarranty}
                  </div>
                  <div className="text-[10px] sm:text-xs text-slate-400 font-medium mt-0.5 sm:mt-1 truncate">
                    {t.home.statsWarrantyLabel}
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT UI MOCK - Smart Node Telemetry preview */}
            <div className="relative group max-w-md mx-auto lg:max-w-none w-full">
              <div className="absolute -top-10 -right-10 w-48 h-48 sm:w-64 sm:h-64 bg-blue-500/20 rounded-full blur-3xl animate-pulse pointer-events-none"></div>
              <div className="absolute -bottom-10 -left-10 w-48 h-48 sm:w-64 sm:h-64 bg-cyan-500/20 rounded-full blur-3xl animate-pulse delay-1000 pointer-events-none"></div>
              
              <div className="bg-gradient-to-br from-slate-800/80 via-slate-800/60 to-slate-900/60 rounded-[2rem] sm:rounded-[2.5rem] p-3.5 sm:p-5 border border-white/20 shadow-2xl backdrop-blur-xl transition-all duration-500 hover:scale-[1.01] hover:shadow-blue-500/20">
                <div className="bg-gradient-to-br from-black/95 to-slate-950 rounded-[1.5rem] sm:rounded-[2rem] p-4 sm:p-6 border border-white/10 aspect-[4/3] sm:aspect-video flex flex-col justify-between relative overflow-hidden">
                  
                  {/* Grid overlay pattern */}
                  <div className="absolute inset-0 opacity-10" style={{
                    backgroundImage: 'linear-gradient(#0ff 1px, transparent 1px), linear-gradient(90deg, #0ff 1px, transparent 1px)',
                    backgroundSize: '20px 20px',
                  }}></div>
                  
                  {/* Scanning line animation */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent animate-scan"></div>
                  </div>

                  {/* Top right status indicator with glow */}
                  <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10">
                    <div className="relative">
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_15px_#22c55e] animate-pulse"></div>
                      <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-green-500 animate-ping opacity-75"></div>
                    </div>
                  </div>

                  {/* Top left - Node info */}
                  <div className="relative z-10">
                    <div className="flex items-center space-x-2 mb-1 sm:mb-2">
                      <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                      </div>
                      <div className="text-[10px] sm:text-[11px] text-blue-400 font-mono font-bold tracking-wider">
                        {t.home.nodeTitle}
                      </div>
                    </div>
                    <div className="text-3xl sm:text-5xl font-black text-white tracking-tighter font-mono">
                      37.58<span className="text-blue-400 text-xl sm:text-2xl">°C</span>
                    </div>
                    <div className="text-[9px] sm:text-[10px] text-slate-400 font-mono mt-0.5">
                      {isBn ? 'টার্গেট: ৩৭.৮°C | স্ট্যাটাস: স্থিতিশীল' : 'Target: 37.8°C | Status: Optimal'}
                    </div>
                  </div>

                  {/* Right side - Humidity */}
                  <div className="absolute top-3 right-10 sm:top-4 sm:right-12 text-right z-10">
                    <div className="text-[9px] sm:text-[10px] text-slate-400 font-mono font-bold mb-0.5 sm:mb-1 tracking-wider">
                      {t.home.humidity}
                    </div>
                    <div className="text-xl sm:text-3xl font-black text-slate-100 font-mono tracking-tight">
                      64.2<span className="text-blue-400 text-base sm:text-lg">%</span>
                    </div>
                  </div>

                  {/* Middle - Chart visualization */}
                  <div className="relative z-10 mt-3 sm:mt-6">
                    <div className="flex items-end space-x-1 h-10 sm:h-14">
                      {[65, 45, 70, 55, 80, 60, 75, 50, 85, 65].map((height, i) => (
                        <div 
                          key={i} 
                          className="flex-1 bg-gradient-to-t from-blue-600 to-blue-400 rounded-xs transition-all duration-500"
                          style={{ height: `${height * 0.5}%` }}
                        ></div>
                      ))}
                    </div>
                    <div className="flex justify-between mt-1 text-[7px] sm:text-[8px] text-slate-500 font-mono">
                      <span>00:00</span><span>04:00</span><span>08:00</span><span>12:00</span><span>16:00</span><span>20:00</span>
                    </div>
                  </div>

                  {/* Bottom - Controls with progress bar */}
                  <div className="relative z-10 mt-2 sm:mt-3 space-y-1.5 sm:space-y-2">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <div className="flex-1 h-1.5 sm:h-2 bg-slate-800/80 rounded-full overflow-hidden">
                        <div className="w-[75%] h-full bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20 animate-shimmer"></div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-[10px] sm:text-[11px] text-blue-400 font-mono font-bold">{t.home.heater}</span>
                        <span className="text-[10px] sm:text-[11px] text-slate-400 font-mono">75%</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <div className="flex-1 h-1.5 sm:h-2 bg-slate-800/80 rounded-full overflow-hidden">
                        <div className="w-[42%] h-full bg-gradient-to-r from-emerald-600 to-green-500 rounded-full"></div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-[10px] sm:text-[11px] text-emerald-400 font-mono font-bold">{t.home.turner}</span>
                        <span className="text-[10px] sm:text-[11px] text-slate-400 font-mono">{t.home.auto}</span>
                      </div>
                    </div>
                  </div>

                  {/* Data stream overlay effect */}
                  <div className="absolute bottom-1.5 left-2 text-[7px] sm:text-[8px] text-slate-500 font-mono z-10 flex items-center gap-1">
                    <span className="text-green-500">●</span> {t.home.powerStateVal}
                  </div>
                </div>
              </div>

              {/* Floating badge - bottom right */}
              <div className="absolute -bottom-4 right-2 sm:-bottom-6 sm:-right-6 bg-slate-900/90 text-white p-2.5 sm:p-4 rounded-xl sm:rounded-2xl shadow-2xl border border-slate-700 backdrop-blur-md flex items-center space-x-3 sm:space-x-4 transition-all duration-300">
                <div className="w-8 h-8 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
                  <ShieldCheck className="w-4 h-4 sm:w-6 sm:h-6 text-white" />
                </div>
                <div>
                  <div className="text-[10px] sm:text-xs text-slate-400 font-bold uppercase tracking-wider">
                    {isBn ? 'কন্ট্রোলার প্রজন্ম' : 'Controller Gen'}
                  </div>
                  <div className="text-xs sm:text-lg font-black text-white">
                    v4.2 Enterprise Pro
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ================= WHY INCUTECH / FEATURES ================= */}
      <section id="why-us" className="py-20 bg-slate-50 dark:bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center space-x-2 bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-4">
              {t.home.featuresBadge}
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white mb-4">
              {t.home.featuresTitle}
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg">
              {t.home.featuresSubtitle}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                title: t.home.feature1Title,
                desc: t.home.feature1Desc,
                icon: <Thermometer className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
                tag: '±0.1°C Precision',
              },
              {
                title: t.home.feature2Title,
                desc: t.home.feature2Desc,
                icon: <RefreshCw className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />,
                tag: 'Automated',
              },
              {
                title: t.home.feature3Title,
                desc: t.home.feature3Desc,
                icon: <Zap className="w-6 h-6 text-amber-600 dark:text-amber-400" />,
                tag: '12V Auto Switch',
              },
              {
                title: t.home.feature4Title,
                desc: t.home.feature4Desc,
                icon: <Cloud className="w-6 h-6 text-purple-600 dark:text-purple-400" />,
                tag: 'Cloud IoT',
              },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-800/80 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 hover:border-blue-500/50 hover:shadow-xl transition-all duration-300 group"
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="w-12 h-12 bg-slate-100 dark:bg-slate-700 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                    {item.icon}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                    {item.tag}
                  </span>
                </div>
                <h3 className="font-black text-xl mb-3 text-slate-900 dark:text-white">
                  {item.title}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= CORE COMPETENCIES ================= */}
      <section id="solutions" className="py-20 bg-white dark:bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-12 items-center">
            
            {/* Core Box */}
            <div className="bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-900 p-8 sm:p-10 rounded-3xl text-white shadow-xl">
              <div className="inline-flex items-center space-x-2 bg-blue-500/20 border border-blue-400/30 px-3 py-1 rounded-full mb-6">
                <span className="text-blue-300 text-xs font-black uppercase tracking-wider">
                  {isBn ? 'আমাদের বিশেষত্ব' : 'Core Focus'}
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black mb-4 leading-tight">
                {isBn
                  ? 'জৈবিক চাহিদা এবং আধুনিক ইলেকট্রনিক্সের নিখুঁত সমন্বয়'
                  : 'Bridging Biological Needs & Electronic Precision'}
              </h2>
              <p className="text-slate-300 mb-8 leading-relaxed text-sm">
                {isBn
                  ? 'উন্নত সার্কিট ডিজাইন, মাইক্রোকন্ট্রোলার আর্কিটেকচার এবং টেকসই হার্ডওয়্যার।'
                  : 'Engineered through high-reliability hardware architecture and intelligent PID algorithms.'}
              </p>
              <ul className="space-y-4">
                {[
                  isBn ? 'স্মার্ট ইনকিউবেটর কন্ট্রোল ইউনিট' : 'Incubator Control Units',
                  isBn ? 'মাল্টি-সেন্সর ফিউশন হাব' : 'Sensor Fusion Nodes',
                  isBn ? 'রিমোট ক্লাউড টেলিমেট্রি' : 'Remote Monitoring Hubs',
                ].map((item, i) => (
                  <li key={i} className="flex items-center space-x-3 text-slate-200 font-medium text-sm">
                    <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right side - 2 Feature highlights */}
            <div className="lg:col-span-2 grid md:grid-cols-2 gap-6">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 transition-all duration-300">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/60 rounded-2xl flex items-center justify-center mb-5">
                  <Thermometer className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">37.8°</span>
                  <span className="text-xs font-mono text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded-full font-bold">±0.1°C</span>
                </div>
                <h3 className="font-black text-xl mb-3 text-slate-900 dark:text-white">
                  {isBn ? 'নির্ভুল তাপমাত্রা নিয়ন্ত্রণ' : 'Precision Thermal Management'}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {isBn
                    ? 'উন্নত পিআইডি অ্যালগরিদমের মাধ্যমে ইনকিউবেটরের ভেতরের তাপমাত্রা নিখুঁতভাবে নিয়ন্ত্রণ করা হয়।'
                    : 'PID algorithm-based temperature regulation with ±0.1°C accuracy for maximum hatching rates.'}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/60 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 transition-all duration-300">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/60 rounded-2xl flex items-center justify-center mb-5">
                  <Zap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">12V</span>
                  <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full font-bold">
                    {isBn ? 'স্বয়ংক্রিয় ব্যাকআপ' : 'Auto Battery'}
                  </span>
                </div>
                <h3 className="font-black text-xl mb-3 text-slate-900 dark:text-white">
                  {isBn ? 'অটো পাওয়ার ফল্ট প্রোটেকশন' : 'Automated Power Failover'}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {isBn
                    ? 'বিদ্যুৎ বিপর্যয়েও ইনকিউবেটরের তাপমাত্রা ও ডিম টার্নিং বজায় রাখতে ডুয়াল ব্যাকআপ সুবিধা।'
                    : 'Programmable motor drivers for egg turning cycles and smart ventilation synchronization.'}
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ================= CALL TO ACTION ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-10 sm:p-14 text-white text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="relative z-10 max-w-3xl mx-auto space-y-6">
            <h2 className="text-3xl sm:text-4xl font-black leading-tight">
              {t.home.ctaTitle}
            </h2>
            <p className="text-blue-100 text-base sm:text-lg">
              {t.home.ctaSubtitle}
            </p>
            <div className="pt-4 flex flex-wrap justify-center gap-4">
              <Link
                to="/products"
                className="px-8 py-4 bg-white text-blue-700 hover:bg-blue-50 rounded-xl font-black text-base transition shadow-lg hover:scale-105 active:scale-95"
              >
                {t.home.orderNow}
              </Link>
              <Link
                to="/profile"
                className="px-8 py-4 bg-blue-700/60 hover:bg-blue-700 text-white border border-blue-400/40 rounded-xl font-bold text-base transition"
              >
                {t.home.contactSales}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(1000%); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-scan {
          animation: scan 3s linear infinite;
        }
        .animate-shimmer {
          animation: shimmer 1.5s ease-in-out infinite;
        }
        .delay-1000 {
          animation-delay: 1s;
        }
      `}</style>

    </div>
  );
};

export default Home;
