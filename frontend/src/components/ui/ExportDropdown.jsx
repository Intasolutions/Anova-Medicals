import React, { useState, useRef, useEffect } from 'react';
import { Download, FileText, FileSpreadsheet, File } from 'lucide-react';
import { exportToCSV, exportToPDF, exportToDOC } from '../../utils/exportUtils';

const ExportDropdown = ({ data, columns, filename, title }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = (type) => {
    setIsOpen(false);
    if (type === 'csv') exportToCSV(data, columns, filename);
    if (type === 'pdf') exportToPDF(title, data, columns, filename);
    if (type === 'doc') exportToDOC(title, data, columns, filename);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-[10px] font-black text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-4 py-2.5 rounded-xl border border-emerald-200 transition-all uppercase tracking-widest flex-shrink-0 shadow-sm"
      >
        <Download size={14} strokeWidth={3} /> Export Data
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200/60 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
          <button onClick={() => handleExport('csv')} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 border-b border-slate-100 flex items-center gap-3 transition-colors">
            <FileSpreadsheet size={16} className="text-emerald-500" /> Export as CSV
          </button>
          <button onClick={() => handleExport('pdf')} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 border-b border-slate-100 flex items-center gap-3 transition-colors">
            <FileText size={16} className="text-red-500" /> Export as PDF
          </button>
          <button onClick={() => handleExport('doc')} className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3 transition-colors">
            <File size={16} className="text-blue-500" /> Export as DOC
          </button>
        </div>
      )}
    </div>
  );
};

export default ExportDropdown;
