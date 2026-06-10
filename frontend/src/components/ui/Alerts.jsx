import React, { useEffect } from 'react';
import { CheckCircle, AlertOctagon, AlertTriangle, X, Info } from 'lucide-react';

export const Alert = ({ isOpen, type = 'success', message, title, onClose, autoClose = 5000 }) => {
  useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        if (onClose) onClose();
      }, autoClose);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, onClose]);

  if (!isOpen) return null;

  const styles = {
    success: {
      bg: 'bg-[#F0FDF4]',
      border: 'border-[#16A34A]/20',
      icon: <CheckCircle className="text-[#16A34A]" size={24} />,
      titleColor: 'text-[#16A34A]',
      textColor: 'text-green-800'
    },
    error: {
      bg: 'bg-[#FEF2F2]',
      border: 'border-[#DC2626]/20',
      icon: <AlertOctagon className="text-[#DC2626]" size={24} />,
      titleColor: 'text-[#DC2626]',
      textColor: 'text-red-800'
    },
    warning: {
      bg: 'bg-[#FFFBEB]',
      border: 'border-[#D97706]/20',
      icon: <AlertTriangle className="text-[#D97706]" size={24} />,
      titleColor: 'text-[#D97706]',
      textColor: 'text-amber-800'
    },
    info: {
      bg: 'bg-[#EFF6FF]',
      border: 'border-[#2563EB]/20',
      icon: <Info className="text-[#2563EB]" size={24} />,
      titleColor: 'text-[#2563EB]',
      textColor: 'text-blue-800'
    }
  };

  const currentStyle = styles[type] || styles.info;

  return (
    <div className="fixed top-6 right-6 z-50 animate-in slide-in-from-top-5 fade-in duration-300">
      <div className={`flex items-start gap-4 p-5 min-w-[320px] max-w-md ${currentStyle.bg} border ${currentStyle.border} rounded-2xl shadow-[0_12px_40px_rgb(0,0,0,0.08)] backdrop-blur-md`}>
        <div className="flex-shrink-0 mt-0.5">
          {currentStyle.icon}
        </div>
        <div className="flex-1 pr-2">
          {title && <h4 className={`text-[12px] font-black uppercase tracking-widest ${currentStyle.titleColor} mb-1.5`}>{title}</h4>}
          <p className={`text-[13px] font-medium leading-relaxed ${currentStyle.textColor}`}>
            {message}
          </p>
        </div>
        {onClose && (
          <button 
            onClick={onClose}
            className={`flex-shrink-0 p-1.5 rounded-xl hover:bg-black/5 transition-colors ${currentStyle.textColor} opacity-60 hover:opacity-100`}
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        )}
      </div>
    </div>
  );
};

