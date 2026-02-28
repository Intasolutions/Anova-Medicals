import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, Activity, ArrowRight, Lock, ExternalLink, Phone } from 'lucide-react';

const NoiseFilter = () => (
  <svg className="fixed inset-0 w-full h-full opacity-[0.03] pointer-events-none z-50">
    <filter id="noise">
      <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves="3" stitchTiles="stitch" />
    </filter>
    <rect width="100%" height="100%" filter="url(#noise)" />
  </svg>
);

const MeshBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none bg-[#020617]">
    <motion.div
      animate={{ x: [0, 80, 0], y: [0, 40, 0], scale: [1, 1.2, 1] }}
      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      className="absolute -top-[10%] -left-[5%] w-[50%] h-[50%] bg-red-600/10 blur-[120px] rounded-full mix-blend-screen"
    />
    <motion.div
      animate={{ x: [0, -60, 0], y: [0, 60, 0], scale: [1, 1.1, 1] }}
      transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[130px] rounded-full mix-blend-screen"
    />
  </div>
);

const StatusPill = ({ icon: Icon, label, value, colorClass = "text-slate-300" }) => (
  <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-xl p-3 flex items-center gap-3 transition-all duration-300 shadow-lg flex-1">
    <div className="w-10 h-10 rounded-lg bg-slate-800/80 flex items-center justify-center text-slate-400">
      <Icon className="w-4 h-4" />
    </div>
    <div className="text-left">
      <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black mb-0.5">{label}</p>
      <p className={`text-xs font-bold tracking-wide ${colorClass}`}>{value}</p>
    </div>
  </div>
);

const App = () => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-6 font-sans bg-[#020617] antialiased overflow-hidden">
      <NoiseFilter />
      <MeshBackground />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 max-w-2xl w-full"
      >
        <div className="relative bg-[#0a0f1e]/80 backdrop-blur-[40px] border border-white/10 rounded-[2.5rem] p-8 md:p-12 shadow-2xl flex flex-col items-center text-center">

          {/* Header Icon */}
          <div className="relative mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-red-500/20 to-red-700/5 rounded-2xl flex items-center justify-center border border-red-500/20 shadow-xl relative z-10">
              <ShieldAlert className="w-10 h-10 text-red-500" />
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-red-500/10 blur-[30px] rounded-full animate-pulse" />
          </div>

          {/* Typography */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="h-px w-6 bg-slate-800" />
            <h2 className="text-slate-500 text-[10px] font-black tracking-[0.4em] uppercase">Status Report</h2>
            <span className="h-px w-6 bg-slate-800" />
          </div>

          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white mb-4">
            Revive HMS <span className="text-red-500">Suspended</span>
          </h1>

          <p className="text-slate-400 text-sm md:text-base mb-8 leading-relaxed max-w-md">
            The environment is currently <span className="text-white font-semibold">inactive</span>.
            Please reach out to our support channel for restoration or inquiries.
          </p>

          {/* Status Grid */}
          <div className="flex flex-col sm:flex-row gap-3 w-full mb-8">
            <StatusPill icon={Activity} label="State" value="Offline" colorClass="text-red-400" />
            <StatusPill icon={Lock} label="Access" value="Restricted" />
          </div>

          {/* Action Area */}
          <div className="flex flex-col items-center gap-6">
            <motion.a
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              href="mailto:info@in-tasolutions.com"
              className="px-8 py-4 bg-red-600 text-white font-bold rounded-2xl shadow-lg shadow-red-900/20 flex items-center gap-2 hover:bg-red-500 transition-colors"
            >
              Connect With Support <ArrowRight className="w-4 h-4" />
            </motion.a>

            <a href="https://in-tasolutions.com" target="_blank" rel="noreferrer" className="text-slate-500 text-[10px] font-black tracking-[0.3em] uppercase flex items-center gap-2 hover:text-white transition-colors">
              IN-TA SOLUTIONS <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="tel:+919447595381"
              className="group flex items-center gap-3 px-4 py-2 bg-slate-900/50 border border-white/5 rounded-full hover:border-red-500/30 transition-all duration-500"
            >
              <Phone className="w-3.5 h-3.5 text-slate-500 group-hover:text-red-500 transition-colors" />
              <span className="text-slate-400 text-xs font-bold tracking-widest group-hover:text-white transition-colors">
                +91 94475 95381
              </span>
            </a>
            <p className="text-slate-500 text-[10px] font-black tracking-[0.3em] uppercase flex items-center gap-2 hover:text-white transition-colors">
              Powered by {new Date().getFullYear()} IN-TA SOLUTIONS..
            </p>

          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default App;