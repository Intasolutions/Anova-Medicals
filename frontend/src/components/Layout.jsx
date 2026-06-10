import React, { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Activity,
  LogOut,
  Database,
  ChevronDown,
  ChevronRight,
  Settings,
  Package,
  Menu,
  Box,
  Wrench,
  UserCircle
} from 'lucide-react';
import { useAuth } from '../features/auth/context/AuthContext';

const Layout = () => {
  const { logout } = useAuth();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [masterDataOpen, setMasterDataOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname.split('/').pop() || 'dashboard';
    return path.charAt(0).toUpperCase() + path.slice(1).replace('-', ' ');
  };

  // Reusable Sidebar Item Component
  const SidebarItem = ({ to, icon: Icon, label, isSubItem = false }) => (
    <NavLink to={to}>
      {({ isActive }) => (
        <div
          className={`flex items-center p-3 rounded-xl transition-all duration-300 relative group cursor-pointer
            ${isActive
              ? 'bg-slate-800/80 text-white shadow-md'
              : 'text-slate-400 hover:bg-slate-800/40 hover:text-white'
            } 
            ${isSubItem ? 'py-2 mt-1' : 'mb-1'}
            ${!isSidebarOpen && isSubItem ? 'justify-center pl-0' : ''}
            ${!isSidebarOpen && !isSubItem ? 'justify-center' : 'space-x-3'}
          `}
          title={!isSidebarOpen ? label : ""}
        >
          {/* Active Accent Line */}
          {isActive && (
            <motion.div
              layoutId="activeSidebar"
              className="absolute left-0 top-2 bottom-2 w-1.5 bg-brand-primary rounded-r-full shadow-[0_0_10px_rgba(225,0,122,0.5)]"
            />
          )}

          <Icon
            size={isSubItem ? 18 : 22}
            className={`${isActive ? 'text-brand-primary' : 'group-hover:text-brand-secondary'} transition-colors`}
            strokeWidth={isActive ? 2.5 : 2}
          />

          {isSidebarOpen && (
            <span className={`font-semibold tracking-wide text-sm whitespace-nowrap ${isSubItem ? 'text-[13px]' : ''}`}>
              {label}
            </span>
          )}
        </div>
      )}
    </NavLink>
  );

  return (
    <div className="flex min-h-screen bg-[#F1F5F9] font-sans selection:bg-brand-primary/20 selection:text-brand-primary">

      {/* ========================================== */}
      {/* PREMIUM COLLAPSIBLE SIDEBAR                */}
      {/* ========================================== */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 88 }}
        className="bg-brand-dark text-white flex flex-col fixed h-full z-50 border-r border-slate-800 shadow-[20px_0_40px_rgba(0,0,0,0.03)]"
      >
        {/* Branding & Toggle */}
        <div className={`flex items-center justify-between p-6 ${!isSidebarOpen ? 'flex-col gap-4' : ''}`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <img src="/Logo/icon-only.png" alt="Favourite Logo" className="h-10 w-auto object-contain" />
            {isSidebarOpen && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="whitespace-nowrap">
                <h1 className="text-2xl font-black tracking-tight leading-none bg-gradient-to-r from-brand-accent via-brand-secondary to-brand-primary bg-clip-text text-transparent">Favourite</h1>
                <span className="text-[9px] text-brand-secondary font-black uppercase tracking-[0.25em]">Readymade Garments</span>
              </motion.div>
            )}
          </div>

          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="text-slate-500 hover:text-white transition-colors"
          >
            <Menu size={20} />
          </button>
        </div>

        <div className="px-6 mb-4">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-700 to-transparent opacity-50" />
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-4 custom-scrollbar space-y-1">
          <SidebarItem to="/dashboard" icon={LayoutDashboard} label="Salary Management" />
          <SidebarItem to="/employees" icon={Users} label="Employees" />
          <SidebarItem to="/products" icon={Package} label="Products" />
          <SidebarItem to="/inventory" icon={Database} label="Inventory" />
          <SidebarItem to="/operations" icon={Activity} label="Operations" />

          {/* Master Data Collapsible Section */}
          <div className="pt-6 mt-2 border-t border-slate-800/50">
            {isSidebarOpen && (
              <p className="px-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Configuration</p>
            )}

            <button
              onClick={() => isSidebarOpen ? setMasterDataOpen(!masterDataOpen) : setIsSidebarOpen(true)}
              className={`flex items-center w-full p-3 rounded-xl transition-all duration-300 text-slate-400 hover:bg-slate-800/40 hover:text-white ${!isSidebarOpen ? 'justify-center' : 'justify-between'}`}
              title={!isSidebarOpen ? "Master Data" : ""}
            >
              <div className={`flex items-center ${!isSidebarOpen ? 'justify-center' : 'space-x-3'}`}>
                <Settings size={22} className={masterDataOpen && isSidebarOpen ? "text-brand-primary" : ""} />
                {isSidebarOpen && <span className="font-semibold tracking-wide text-sm">Master Data</span>}
              </div>
              {isSidebarOpen && (
                masterDataOpen ? <ChevronDown size={16} className="text-brand-primary" /> : <ChevronRight size={16} />
              )}
            </button>

            <AnimatePresence>
              {masterDataOpen && isSidebarOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden ml-4 pl-3 border-l border-slate-800 mt-1"
                >
                  <SidebarItem to="/master-data/sizes" icon={Box} label="Product Sizes" isSubItem />
                  <SidebarItem to="/master-data/designations" icon={UserCircle} label="Designations" isSubItem />
                  <SidebarItem to="/master-data/operations" icon={Wrench} label="Global Operations" isSubItem />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>

        {/* User Profile Footer */}
        <div className="p-4 mt-auto border-t border-slate-800">
          <div className={`flex items-center ${!isSidebarOpen ? 'justify-center' : 'justify-between'} bg-slate-800/50 p-3 rounded-xl border border-slate-700/50 hover:bg-slate-800 transition-colors cursor-pointer group`}>
            <div className="flex items-center gap-3">
               <div className="w-9 h-9 bg-slate-900 rounded-lg flex items-center justify-center text-brand-primary font-black text-xs tracking-wider border border-slate-700">
                AK
              </div>
              {isSidebarOpen && (
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-white uppercase tracking-wider group-hover:text-brand-primary transition-colors">Akash</span>
                  <span className="text-[9px] text-slate-400 uppercase tracking-widest">Admin</span>
                </div>
              )}
            </div>
            {isSidebarOpen && (
              <button onClick={logout} className="text-slate-500 hover:text-red-400 transition-colors p-1" title="Logout">
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>
      </motion.aside>

      {/* ========================================== */}
      {/* MAIN CONTENT AREA                          */}
      {/* ========================================== */}
      <motion.main
        initial={false}
        animate={{ marginLeft: isSidebarOpen ? 280 : 88 }}
        className="flex-1 p-8 max-w-[1600px] mx-auto w-full transition-all duration-300"
      >
        {/* Floating Page Header */}
        <header className="sticky top-4 z-40 flex justify-between items-center mb-8 bg-white/90 backdrop-blur-xl border border-slate-200/60 p-4 px-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-brand-primary rounded-full shadow-[0_0_10px_rgba(225,0,122,0.4)]" />
            <h2 className="text-xl font-black text-slate-900 tracking-[0.1em] uppercase">
              {getPageTitle()}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Online</span>
          </div>
        </header>

        {/* Animated Page Renderer */}
        <div className="min-h-[calc(100vh-160px)] bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200/60 p-8 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="h-full w-full"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>

      </motion.main>
    </div>
  );
};

export default Layout;