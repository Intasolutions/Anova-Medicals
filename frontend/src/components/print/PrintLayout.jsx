import React from 'react';

const PrintLayout = ({ title, documentType, children }) => {
  return (
    <div className="print-only hidden w-full bg-white text-black p-8 font-sans">
      {/* HEADER */}
      <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-widest">Favourite Readymade Garments</h1>
          <p className="text-sm font-semibold mt-1">123 Industrial Estate, Tirupur, Tamil Nadu 641602</p>
          <p className="text-xs mt-1">Phone: +91 98765 43210 | Email: contact@favouritegarments.com</p>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold uppercase border border-black px-4 py-2 bg-slate-100">{documentType}</h2>
          <p className="text-xs font-semibold mt-2">Date: {new Date().toLocaleDateString('en-IN')}</p>
          <p className="text-xs font-semibold">Time: {new Date().toLocaleTimeString('en-IN')}</p>
        </div>
      </div>

      {/* DOCUMENT TITLE */}
      {title && (
        <div className="text-center mb-6">
          <h3 className="text-lg font-black uppercase underline underline-offset-4">{title}</h3>
        </div>
      )}

      {/* BODY */}
      <div className="mb-8">
        {children}
      </div>

      {/* FOOTER */}
      <div className="mt-8 pt-4 border-t border-black flex justify-between items-end" style={{ pageBreakInside: 'avoid' }}>
        <div className="text-center">
          <div className="w-48 border-b border-black mb-2"></div>
          <p className="text-xs font-bold uppercase">Prepared By</p>
        </div>
        <div className="text-center">
          <div className="w-48 border-b border-black mb-2"></div>
          <p className="text-xs font-bold uppercase">Authorized Signatory</p>
        </div>
      </div>
      
      <div className="mt-8 text-center text-[10px] text-gray-500">
        This is a system generated document. Powered by Antigravity MES.
      </div>
    </div>
  );
};

export default PrintLayout;
