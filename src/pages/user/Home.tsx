import { Cpu, Microchip, Cloud, Settings, Thermometer, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

const Home = () => {
  return (
    <div className="space-y-12 pb-16">

      {/* ================= HERO (ADVANCED HARDWARE) ================= */}
      <section className="relative pt-32 pb-24 lg:pt-56 lg:pb-40 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        
        {/* Background Pattern */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: 'radial-gradient(#ffffff 0.5px, transparent 0.5px)',
            backgroundSize: '30px 30px',
          }}
        />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* LEFT */}
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center space-x-2 bg-blue-500/10 border border-blue-500/20 px-4 py-1.5 rounded-full mb-8 text-blue-400 text-xs font-bold uppercase tracking-widest">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                <span>Advanced Automation Systems</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-bold text-white leading-[1.1] mb-8 tracking-tight">
                Intelligence for <span className="text-[#005fa3]">Incubation</span>
              </h1>

              <p className="text-xl text-slate-400 mb-12 max-w-xl leading-relaxed">
                We design and manufacture high-precision control hardware for biological environments.
                From egg to hatchling, our systems ensure absolute environmental stability.
              </p>

              <div className="flex flex-wrap justify-center lg:justify-start gap-5">
                <Link
                  to="/products"
                  className="px-8 py-4 bg-[#005fa3] text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-xl shadow-blue-900/20"
                >
                  Explore Hardware
                </Link>
                
              </div>
            </div>

            {/* RIGHT UI MOCK - Enhanced with CSS styling */}
            <div className="relative group">
              {/* Animated gradient orb behind the UI */}
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
              
              {/* Main card container */}
              <div className="bg-gradient-to-br from-slate-800/70 via-slate-800/50 to-slate-900/50 rounded-[2.5rem] p-5 border border-white/20 shadow-2xl backdrop-blur-xl transition-all duration-500 hover:scale-[1.02] hover:shadow-blue-500/20">
                <div className="bg-gradient-to-br from-black/90 to-slate-900 rounded-[2rem] p-6 border border-white/10 aspect-video flex flex-col justify-between relative overflow-hidden">
                  
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
                  <div className="absolute top-4 right-4 z-10">
                    <div className="relative">
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_15px_#22c55e] animate-pulse"></div>
                      <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-green-500 animate-ping opacity-75"></div>
                    </div>
                  </div>

                  {/* Top left - Node info */}
                  <div className="relative z-10">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400"></div>
                      </div>
                      <div className="text-[11px] text-blue-400 font-mono font-bold tracking-wider">
                        ENVIRONMENTAL_NODE_01
                      </div>
                    </div>
                    <div className="text-5xl font-bold text-white tracking-tighter font-mono">
                      37.58<span className="text-blue-400 text-2xl">°C</span>
                    </div>
                  </div>

                  {/* Right side - Humidity */}
                  <div className="absolute top-4 right-12 text-right z-10">
                    <div className="text-[10px] text-slate-500 font-mono font-bold mb-1 tracking-wider">
                      HUMIDITY_RH
                    </div>
                    <div className="text-3xl font-bold text-slate-200 font-mono tracking-tight">
                      64.2<span className="text-slate-500 text-sm">%</span>
                    </div>
                  </div>

                  {/* Middle - Chart visualization */}
                  <div className="relative z-10 mt-8">
                    <div className="flex items-end space-x-1 h-16">
                      {[65, 45, 70, 55, 80, 60, 75, 50, 85, 65].map((height, i) => (
                        <div 
                          key={i} 
                          className="flex-1 bg-gradient-to-t from-blue-600 to-blue-400 rounded-sm transition-all duration-500 hover:from-blue-500 hover:to-cyan-400"
                          style={{ height: `${height * 0.5}%` }}
                        ></div>
                      ))}
                    </div>
                    <div className="flex justify-between mt-1 text-[8px] text-slate-600 font-mono">
                      <span>00:00</span><span>04:00</span><span>08:00</span><span>12:00</span><span>16:00</span><span>20:00</span>
                    </div>
                  </div>

                  {/* Bottom - Heater control with progress bar */}
                  <div className="relative z-10 mt-4 space-y-2">
                    <div className="flex items-center space-x-3">
                      <div className="flex-1 h-2 bg-slate-800/80 rounded-full overflow-hidden">
                        <div className="w-[75%] h-full bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20 animate-shimmer"></div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-[11px] text-blue-400 font-mono font-bold">Heater</span>
                        <span className="text-[11px] text-slate-400 font-mono">75%</span>
                      </div>
                    </div>
                    
                    {/* Motor control indicator */}
                    <div className="flex items-center space-x-3">
                      <div className="flex-1 h-2 bg-slate-800/80 rounded-full overflow-hidden">
                        <div className="w-[42%] h-full bg-gradient-to-r from-emerald-600 to-green-500 rounded-full"></div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-[11px] text-emerald-400 font-mono font-bold">Motor</span>
                        <span className="text-[11px] text-slate-400 font-mono">42%</span>
                      </div>
                    </div>
                  </div>

                  {/* Data stream overlay effect */}
                  <div className="absolute bottom-2 left-2 text-[8px] text-slate-700 font-mono z-10">
                    <span className="text-green-500/50">▶</span> STREAM_ACTIVE
                  </div>
                </div>
              </div>

              {/* Floating badge - bottom right */}
              <div className="absolute -bottom-6 -right-6 bg-gradient-to-br from-white to-slate-100 p-4 rounded-2xl shadow-2xl border border-slate-200 flex items-center space-x-4 transition-all duration-300 hover:scale-105 hover:shadow-blue-500/20">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                    Controller Gen
                  </div>
                  <div className="text-lg font-bold text-slate-900">
                    v4.2 Enterprise
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ================= EXPERTISE ================= */}
      <section id="services" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Our Expertise
            </h2>
            <p className="text-slate-600">
              Specialized services for modern hardware engineering
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { title: 'Hardware Design', desc: 'Custom schematic and PCB layout design with EMI/EMC compliance focus.', icon: <Cpu className="w-6 h-6 text-blue-600" /> },
              { title: 'Firmware Dev', desc: 'Optimized low-level coding for ARM, ESP32, and AVR platforms.', icon: <Microchip className="w-6 h-6 text-blue-600" /> },
              { title: 'IoT Solutions', desc: 'Connecting hardware to the cloud with secure MQTT and REST protocols.', icon: <Cloud className="w-6 h-6 text-blue-600" /> },
              { title: 'Control Systems', desc: 'PLC and microcontroller based industrial control logic engineering.', icon: <Settings className="w-6 h-6 text-blue-600" /> },
            ].map((item, i) => (
              <div key={i} className="bg-white p-8 rounded-2xl border border-slate-200 hover:border-blue-400 hover:shadow-xl transition-all duration-300 group">
                <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-5 group-hover:bg-blue-500 transition-colors duration-300">
                  <div className="group-hover:text-white transition-colors duration-300">
                    {item.icon}
                  </div>
                </div>
                <h3 className="font-bold text-xl mb-3 text-slate-900">{item.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= SOLUTIONS ================= */}
      <section id="solutions" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-12 items-start">
            
            {/* Core Competencies Box - Using 3rd pic text */}
            <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
              <div className="inline-flex items-center space-x-2 bg-blue-100 px-3 py-1 rounded-full mb-6">
                <span className="text-blue-700 text-sm font-bold">Core Competencies</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 leading-tight">
                We bridge the gap between biological needs and electronic precision
              </h2>
              <p className="text-slate-500 mb-8 leading-relaxed text-sm">
                Through reliable hardware architecture and intelligent control systems.
              </p>
              <ul className="space-y-4">
                {['Incubator Control Units', 'Sensor Fusion Nodes', 'Remote Monitoring Hubs'].map((item, i) => (
                  <li key={i} className="flex items-center space-x-3 text-slate-700 font-medium">
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

            {/* Right side - Two competency cards */}
            <div className="lg:col-span-2 grid md:grid-cols-2 gap-6">
              {/* Precision Thermal Mgmt */}
              <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 hover:border-blue-200 transition-all duration-300">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                  <Thermometer className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-2xl font-bold text-slate-900">8°</span>
                  <span className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">±0.1°C</span>
                </div>
                <h3 className="font-bold text-xl mb-3 text-slate-900">Precision Thermal Mgmt</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  PID algorithm-based temperature regulation with ±0.1°C accuracy for maximum hatching rates.
                </p>
              </div>

              {/* Automated Dynamics */}
              <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100 hover:border-blue-200 transition-all duration-300">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex items-center space-x-2 mb-3">
                  <span className="text-2xl font-bold text-slate-900">2°</span>
                  <span className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Programmable</span>
                </div>
                <h3 className="font-bold text-xl mb-3 text-slate-900">Automated Dynamics</h3>
                <p className="text-sm text-slate-500 leading-relaxed">
                  Programmable motor drivers for egg turning cycles and smart ventilation synchronization.
                </p>
              </div>
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