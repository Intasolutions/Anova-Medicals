import { useState, useEffect, useRef } from 'react';
import { Search, Bell, Check, Command, Clock, Inbox, Globe, LogOut } from 'lucide-react';
import { useSearch } from '../context/SearchContext';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

const Header = () => {
    const { globalSearch, setGlobalSearch } = useSearch();
    const { user, logout } = useAuth();
    const isPharmacyOnly = user?.role === 'PHARMACY';
    const [notifications, setNotifications] = useState([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const dropdownRef = useRef(null);

    // Precise IST Clock Logic
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Formatting functions for Indian Standard Time
    const formatISTTime = (date) => {
        return date.toLocaleTimeString('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    };

    const formatISTDate = (date) => {
        return date.toLocaleDateString('en-IN', {
            timeZone: 'Asia/Kolkata',
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    };

    useEffect(() => {
        if (user) {
            fetchNotifications();
            const interval = setInterval(fetchNotifications, 30000);
            return () => clearInterval(interval);
        }
    }, [user]);

    const fetchNotifications = async () => {
        try {
            const { data } = await api.get('/core/notifications/');
            setNotifications(data.results || data);
        } catch (err) {
            console.error(err);
        }
    };

    const markAsRead = async (id) => {
        try {
            await api.post('/core/notifications/mark_read/', { ids: [id] });
            fetchNotifications();
        } catch (err) {
            console.error(err);
        }
    };

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const location = useLocation();
    
    // Generate Breadcrumbs
    const getBreadcrumbs = () => {
        const path = location.pathname.split('/').filter(Boolean);
        if (path.length === 0) return ['Dashboard'];
        return ['Dashboard', ...path.map(p => p.charAt(0).toUpperCase() + p.slice(1))];
    };
    
    const breadcrumbs = getBreadcrumbs();

    return (
        <header className="h-16 bg-white/90 backdrop-blur-xl border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-40 print:hidden">
            {/* --- Left: Breadcrumbs & Smart Search --- */}
            <div className="flex items-center gap-6 flex-1">
                <div className="flex items-center gap-2 text-sm font-bold">
                    {breadcrumbs.map((crumb, index) => (
                        <div key={index} className="flex items-center gap-2">
                            <span className={index === breadcrumbs.length - 1 ? "text-slate-900" : "text-slate-400"}>
                                {crumb}
                            </span>
                            {index < breadcrumbs.length - 1 && <span className="text-slate-300">/</span>}
                        </div>
                    ))}
                </div>

                <div className="relative w-full max-w-sm group ml-4 hidden md:block">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search by Patient Name, Phone, or ID..."
                        className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-600 focus:bg-white"
                        value={globalSearch}
                        onChange={(e) => setGlobalSearch(e.target.value)}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[9px] font-bold text-slate-400 shadow-sm">
                        Ctrl+K
                    </div>
                </div>
            </div>

            {/* --- Right: IST Clock & Tools --- */}
            <div className="flex items-center gap-5" ref={dropdownRef}>
                
                {/* Indian Standard Time Display */}
                <div className="hidden xl:flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100">
                    <div className="flex flex-col items-end">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-md uppercase tracking-wider">IST</span>
                            <span className="text-sm font-bold text-slate-950 tabular-nums">
                                {formatISTTime(currentTime)}
                            </span>
                        </div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight">
                            {formatISTDate(currentTime)}
                        </span>
                    </div>
                    <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-blue-600 shadow-sm">
                        <Clock size={16} />
                    </div>
                </div>

                {/* Notifications */}
                <div className="relative">
                    <button
                        onClick={() => setShowDropdown(!showDropdown)}
                        className={`p-2.5 rounded-2xl transition-all duration-300 relative border ${
                            showDropdown 
                            ? 'bg-slate-950 text-white border-slate-950 shadow-lg shadow-slate-900/20' 
                            : 'bg-white text-slate-500 border-slate-200 hover:border-blue-600 hover:text-blue-600'
                        }`}
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute top-0 right-0 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border-2 border-white"></span>
                            </span>
                        )}
                    </button>

                    <AnimatePresence>
                        {showDropdown && (
                            <motion.div
                                initial={{ opacity: 0, y: 12, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 12, scale: 0.95 }}
                                className="absolute right-0 mt-4 w-96 bg-white rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden z-50 origin-top-right"
                            >
                                <div className="px-6 py-6 bg-slate-950 text-white">
                                    <div className="flex justify-between items-center">
                                        <h3 className="font-bold text-lg">Notifications</h3>
                                        <span className="text-[10px] font-bold bg-blue-600 px-2 py-1 rounded-full uppercase">
                                            {unreadCount} New
                                        </span>
                                    </div>
                                </div>

                                <div className="max-h-[400px] overflow-y-auto p-2 custom-scrollbar">
                                    {notifications.length === 0 ? (
                                        <div className="py-12 text-center">
                                            <Inbox size={40} className="mx-auto text-slate-200 mb-2" />
                                            <p className="text-sm text-slate-400 font-medium">All caught up!</p>
                                        </div>
                                    ) : (
                                        notifications.map((n) => (
                                            <div 
                                                key={n.id} 
                                                className={`p-4 rounded-[20px] flex gap-4 transition-all cursor-pointer mb-1 hover:bg-slate-50 ${!n.is_read ? 'bg-blue-50/50' : ''}`}
                                                onClick={() => !n.is_read && markAsRead(n.id)}
                                            >
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${!n.is_read ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                    <Bell size={18} />
                                                </div>
                                                <div className="flex-1">
                                                    <p className={`text-sm leading-tight mb-1 ${!n.is_read ? 'font-bold text-slate-950' : 'text-slate-600'}`}>
                                                        {n.message}
                                                    </p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                                                        {new Date(n.timestamp).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* System Status Dot */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 rounded-full border border-green-100">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider">System Live</span>
                </div>

                {/* Logout Button (Important for roles without a sidebar) */}
                <button 
                    onClick={logout}
                    className="ml-2 p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition-colors border border-rose-100 flex items-center justify-center"
                    title="Logout"
                >
                    <LogOut size={16} />
                </button>
            </div>
        </header>
    );
};

export default Header;