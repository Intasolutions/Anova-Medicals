import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const Card = ({ children, className = '', noPadding = false }) => (
  <div className={`bg-white rounded-[2rem] border border-slate-200/60 shadow-[0_12px_40px_rgb(0,0,0,0.06)] overflow-hidden relative ${className}`}>
    <div className={`h-full ${noPadding ? '' : 'p-8'}`}>
      {children}
    </div>
  </div>
);

export const Button = ({ children, variant = 'primary', className = '', ...props }) => {
  const variants = {
    primary: 'bg-brand-primary hover:bg-brand-primary-hover text-white shadow-[0_8px_20px_-6px_rgba(225,0,122,0.5)] active:scale-95 uppercase tracking-widest',
    secondary: 'bg-brand-secondary hover:bg-brand-secondary-hover text-white shadow-[0_8px_20px_-6px_rgba(0,160,227,0.5)] active:scale-95 uppercase tracking-widest',
    outline: 'bg-white border-2 border-slate-200 hover:border-brand-primary hover:text-brand-primary text-slate-700 active:scale-95 uppercase tracking-widest',
    ghost: 'bg-slate-50 hover:bg-slate-100 text-slate-600 active:scale-95 uppercase tracking-widest',
  };

  return (
    <button
      className={`px-6 py-3.5 rounded-xl font-black text-[11px] transition-all duration-300 disabled:opacity-50 disabled:active:scale-100 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export const Input = ({ label, error, className = '', ...props }) => (
  <div className={`flex flex-col gap-2 ${className}`}>
    {label && (
      <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">
        {label}
      </label>
    )}
    <input
      className={`w-full p-4 bg-[#F8FAFC] border border-slate-200/60 rounded-xl focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all font-semibold text-slate-900 placeholder:text-slate-400 ${error ? 'border-red-500 bg-red-50' : ''}`}
      {...props}
    />
    {error && <span className="text-[10px] font-black text-red-500 ml-1">{error}</span>}
  </div>
);

export const Select = ({ label, error, children, className = '', ...props }) => (
  <div className={`flex flex-col gap-2 ${className}`}>
    {label && (
      <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">
        {label}
      </label>
    )}
    <div className="relative">
      <select
        className={`w-full p-4 bg-[#F8FAFC] border border-slate-200/60 rounded-xl focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all font-semibold text-slate-900 appearance-none cursor-pointer ${error ? 'border-red-500 bg-red-50' : ''}`}
        {...props}
      >
        {children}
      </select>
      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
      </div>
    </div>
    {error && <span className="text-[10px] font-black text-red-500 ml-1">{error}</span>}
  </div>
);

export const TableContainer = ({ children, className = '' }) => (
  <div className={`overflow-x-auto bg-white rounded-[2rem] border border-slate-200/60 shadow-[0_12px_40px_rgb(0,0,0,0.06)] p-1 ${className}`}>
    <table className="w-full text-left border-collapse">
      {children}
    </table>
  </div>
);

export const Thead = ({ children, className = '' }) => (
  <thead className={className}>
    <tr className="bg-[#F8FAFC] border-b border-slate-200/60 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
      {children}
    </tr>
  </thead>
);

export const Th = ({ children, className = '', ...props }) => (
  <th className={`px-6 py-5 ${className}`} {...props}>
    {children}
  </th>
);

export const Tbody = ({ children, className = '' }) => (
  <tbody className={`divide-y divide-slate-100 ${className}`}>
    {children}
  </tbody>
);

export const Tr = ({ children, className = '', ...props }) => (
  <tr className={`hover:bg-slate-50/80 transition-colors ${className}`} {...props}>
    {children}
  </tr>
);

export const Td = ({ children, className = '', ...props }) => (
  <td className={`px-6 py-4 ${className}`} {...props}>
    {children}
  </td>
);

export const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  rowsPerPage,
  onRowsPerPageChange,
  totalItems
}) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-5 bg-[#F8FAFC] border-t border-slate-100">
      <div className="flex items-center gap-4">
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Page Size:</span>
        <select
          value={rowsPerPage}
          onChange={(e) => onRowsPerPageChange(e.target.value)}
          className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-black text-slate-700 outline-none focus:border-brand-primary transition-all cursor-pointer shadow-sm"
        >
          <option value="20">20 Entries</option>
          <option value="50">50 Entries</option>
          <option value="100">100 Entries</option>
          <option value="9999">View All</option>
        </select>
      </div>

      <div className="flex items-center gap-8">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em]">
          Showing Page <span className="text-slate-900">{currentPage}</span> of <span className="text-slate-900">{totalPages || 1}</span>
          {totalItems && <span className="ml-3 text-slate-400">Total Records: {totalItems}</span>}
        </span>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-brand-primary hover:text-brand-primary text-slate-600 disabled:opacity-30 disabled:hover:bg-white disabled:hover:border-slate-200 transition-all shadow-sm group"
          >
            <ChevronLeft size={18} strokeWidth={3} className="group-hover:scale-110 transition-transform" />
          </button>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-brand-primary hover:text-brand-primary text-slate-600 disabled:opacity-30 disabled:hover:bg-white disabled:hover:border-slate-200 transition-all shadow-sm group"
          >
            <ChevronRight size={18} strokeWidth={3} className="group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
};
