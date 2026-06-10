import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X, PartyPopper } from 'lucide-react';

const NotificationContext = createContext();

export const useNotification = () => useContext(NotificationContext);

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((notification) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications((prev) => [...prev, { ...notification, id }]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ addNotification }}>
      {children}
      <div className="fixed bottom-8 right-8 z-[100] flex flex-col gap-4 pointer-events-none">
        <AnimatePresence>
          {notifications.map((n) => (
            <NotificationItem key={n.id} notification={n} onRemove={removeNotification} />
          ))}
        </AnimatePresence>
      </div>
    </NotificationContext.Provider>
  );
};

const NotificationItem = ({ notification, onRemove }) => {
  const { id, type, title, message } = notification;

  const configs = {
    success: {
      icon: <CheckCircle className="text-emerald-500" />,
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
      text: 'text-emerald-900'
    },
    error: {
      icon: <AlertCircle className="text-red-500" />,
      bg: 'bg-red-50',
      border: 'border-red-100',
      text: 'text-red-900'
    },
    finished: {
      icon: <PartyPopper className="text-amber-500" />,
      bg: 'bg-amber-50',
      border: 'border-amber-100',
      text: 'text-amber-900 shadow-xl shadow-amber-900/10'
    },
    info: {
      icon: <Info className="text-blue-500" />,
      bg: 'bg-blue-50',
      border: 'border-blue-100',
      text: 'text-blue-900'
    }
  };

  const config = configs[type] || configs.info;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 50, scale: 0.3 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
      className={`pointer-events-auto min-w-[320px] max-w-[400px] p-5 rounded-[1.5rem] border ${config.border} ${config.bg} shadow-2xl flex items-start gap-4 relative overflow-hidden`}
    >
      <div className="flex-shrink-0 mt-0.5">
        {config.icon}
      </div>
      <div className="flex-1">
        {title && <h4 className={`text-sm font-black uppercase tracking-widest ${config.text} mb-1`}>{title}</h4>}
        <p className={`text-xs font-bold ${config.text} opacity-80 leading-relaxed`}>{message}</p>
      </div>
      <button 
        onClick={() => onRemove(id)}
        className="text-slate-400 hover:text-slate-600 transition-colors"
      >
        <X size={16} />
      </button>
      
      {/* Subtle progress bar */}
      <motion.div 
        initial={{ width: '100%' }}
        animate={{ width: 0 }}
        transition={{ duration: 5, ease: 'linear' }}
        className={`absolute bottom-0 left-0 h-1 ${config.icon.props.className.replace('text-', 'bg-')} opacity-30`}
      />
    </motion.div>
  );
};
