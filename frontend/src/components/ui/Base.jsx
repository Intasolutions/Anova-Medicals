import React from 'react';
import ReactDOM from 'react-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const Card = ({ children, className = '', noPadding = false }) => (
  <div className={`bg-white rounded-[2rem] border border-slate-200/60 shadow-[0_12px_40px_rgb(0,0,0,0.06)] relative ${className}`}>
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

export const Select = ({ label, error, children, className = '', ref, ...props }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [displayValue, setDisplayValue] = React.useState(props.value || props.defaultValue || '');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [dropdownStyle, setDropdownStyle] = React.useState({});
  const containerRef = React.useRef(null);
  const triggerRef = React.useRef(null);
  const selectRef = React.useRef(null);

  // Extract options from children
  const options = React.Children.toArray(children).reduce((acc, child) => {
    if (React.isValidElement(child) && child.type === 'option') {
      acc.push({
        value: child.props.value !== undefined ? child.props.value : child.props.children,
        label: child.props.children,
        disabled: child.props.disabled,
      });
    }
    return acc;
  }, []);

  // Handle click outside to close
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current && !containerRef.current.contains(event.target) &&
        !document.getElementById('select-portal-root')?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync with controlled value if provided
  React.useEffect(() => {
    if (props.value !== undefined) {
      setDisplayValue(props.value);
    }
  }, [props.value]);

  // Handle form reset to update custom UI
  React.useEffect(() => {
    const form = selectRef.current?.closest('form');
    if (!form) return;
    const handleReset = () => {
      setTimeout(() => {
        if (selectRef.current) setDisplayValue(selectRef.current.value);
      }, 0);
    };
    form.addEventListener('reset', handleReset);
    return () => form.removeEventListener('reset', handleReset);
  }, []);

  // Reposition dropdown when it opens
  React.useEffect(() => {
    if (isOpen && triggerRef.current) {
      setSearchTerm(''); // Reset search when opening
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 6,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    }
  }, [isOpen]);

  // Close on scroll/resize (but NOT when scrolling inside the dropdown itself)
  React.useEffect(() => {
    if (!isOpen) return;
    const handleScroll = (e) => {
      const portal = document.getElementById('select-portal-root');
      if (portal && portal.contains(e.target)) return; // ignore scroll inside dropdown
      setIsOpen(false);
    };
    const handleResize = () => setIsOpen(false);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  const handleRef = (node) => {
    selectRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  const handleSelect = (val) => {
    setDisplayValue(val);
    setIsOpen(false);
    if (selectRef.current) {
      selectRef.current.value = val;
      selectRef.current.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (props.onChange) {
      props.onChange({ target: { name: props.name, value: val }, currentTarget: { name: props.name, value: val } });
    }
  };

  const selectedOption = options.find(opt => String(opt.value) === String(displayValue));
  const displayText = selectedOption ? selectedOption.label : (options[0]?.label || 'Select...');

  const filteredOptions = options.filter(opt => 
    String(opt.label).toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  // Big data optimization: only render top 100 matches to prevent DOM freezing
  const visibleOptions = filteredOptions.slice(0, 100);

  const dropdown = isOpen ? ReactDOM.createPortal(
    <div
      id="select-portal-root"
      style={dropdownStyle}
      className="bg-white border border-slate-200/80 rounded-xl shadow-[0_12px_40px_rgb(0,0,0,0.18)] max-h-72 overflow-hidden flex flex-col"
    >
      <div className="p-2 border-b border-slate-100 bg-slate-50/50 sticky top-0 z-10">
        <div className="relative">
          <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input 
            type="text" 
            autoFocus
            placeholder="Search options..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all"
            onClick={(e) => e.stopPropagation()} // Prevent closing
          />
        </div>
      </div>
      <div className="overflow-y-auto py-1">
        {visibleOptions.length === 0 ? (
          <div className="px-4 py-3 text-xs text-slate-400 text-center font-medium italic">No results found</div>
        ) : (
          visibleOptions.map((opt, idx) => (
            <div
              key={idx}
              onMouseDown={(e) => { e.preventDefault(); !opt.disabled && handleSelect(opt.value); }}
              className={`px-4 py-3 text-sm font-semibold transition-colors ${
                opt.disabled ? 'text-slate-300 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-50 cursor-pointer'
              } ${String(opt.value) === String(displayValue) ? 'bg-brand-primary/5 text-brand-primary' : ''}`}
            >
              {opt.label}
            </div>
          ))
        )}
        {filteredOptions.length > 100 && (
          <div className="px-4 py-2 text-[10px] text-center text-slate-400 font-bold uppercase tracking-widest bg-slate-50 border-t border-slate-100">
            {filteredOptions.length - 100} more results. Keep typing to filter.
          </div>
        )}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className={`flex flex-col gap-2 ${className}`} ref={containerRef}>
      {label && (
        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">
          {label}
        </label>
      )}
      <div className="relative" ref={triggerRef}>
        <select className="hidden" ref={handleRef} {...props} value={displayValue} onChange={() => {}}>
          {children}
        </select>

        <div
          onClick={() => !props.disabled && setIsOpen(!isOpen)}
          className={`w-full p-4 bg-[#F8FAFC] border border-slate-200/60 rounded-xl focus:ring-4 focus:ring-brand-primary/10 focus:border-brand-primary outline-none transition-all font-semibold cursor-pointer flex justify-between items-center ${
            displayValue === '' && selectedOption?.value === '' ? 'text-slate-500' : 'text-slate-900'
          } ${error ? 'border-red-500 bg-red-50' : ''} ${props.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <span className="truncate text-sm">{displayText}</span>
          <div className={`text-slate-400 transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`}>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
          </div>
        </div>
        {dropdown}
      </div>
      {error && <span className="text-[10px] font-black text-red-500 ml-1">{error}</span>}
    </div>
  );
};

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
          <option value="15">15 Entries</option>
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
