import React from 'react';
import { Button } from './Base';
import { AlertCircle, X, HelpCircle } from 'lucide-react';

export const ConfirmDialog = ({ 
  isOpen, 
  title = "Confirm Action", 
  message = "Are you sure you want to proceed? This action cannot be undone.", 
  confirmText = "Confirm", 
  cancelText = "Cancel", 
  onConfirm, 
  onClose,
  isDestructive = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-0">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-[0_24px_80px_-15px_rgba(0,0,0,0.4)] border border-slate-100 overflow-hidden animate-in zoom-in-95 fade-in duration-300">
        <div className="p-8 sm:p-10">
          <div className="flex justify-between items-start mb-6">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner ${isDestructive ? 'bg-red-50 text-red-500 border border-red-100' : 'bg-blue-50 text-blue-500 border border-blue-100'}`}>
              {isDestructive ? <AlertCircle size={28} strokeWidth={2.5} /> : <HelpCircle size={28} strokeWidth={2.5} />}
            </div>
            <button 
              onClick={onClose}
              className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all active:scale-95"
            >
              <X size={20} strokeWidth={3} />
            </button>
          </div>
          
          <h3 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">
            {title}
          </h3>
          <p className="text-[15px] font-medium text-slate-500 leading-relaxed mb-10">
            {message}
          </p>
          
          <div className="flex items-center justify-end gap-3">
            <Button variant="ghost" onClick={onClose} className="!px-6 !py-3.5 bg-slate-50 hover:bg-slate-100 border border-slate-200">
              {cancelText}
            </Button>
            <Button 
              variant={isDestructive ? 'primary' : 'secondary'} 
              onClick={() => {
                onConfirm();
                if (onClose) onClose();
              }}
              className="!px-8 !py-3.5 shadow-xl"
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
