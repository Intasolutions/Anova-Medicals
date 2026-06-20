import React, { useEffect, useState } from 'react';

const PrintLayout = ({ title, documentType, children, hideHeader = false, hideFooter = false }) => {
  const [printDate, setPrintDate] = useState('');

  useEffect(() => {
    setPrintDate(new Date().toLocaleString('en-IN', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }));
  }, []);

  return (
    <div className="print-only hidden w-full bg-white text-black p-8 font-sans">
      <style type="text/css" media="print">
        {`
          @page { size: auto; margin: 0mm; }
          html { background-color: #FFFFFF; margin: 0px; }
          body { padding: 10mm; }
        `}
      </style>
      {/* HEADER */}
      {!hideHeader && (
        <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-black uppercase tracking-widest">Favourite Readymade Garments</h1>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold uppercase border border-black px-4 py-2 bg-slate-100">{documentType}</h2>
          </div>
        </div>
      )}

      {/* DOCUMENT TITLE */}
      {title && !hideHeader && (
        <div className="text-center mb-6">
          <h3 className="text-lg font-black uppercase underline underline-offset-4">{title}</h3>
        </div>
      )}

      {/* BODY */}
      <div className="mb-8">
        {children}
      </div>

      {/* FOOTER */}
      {!hideFooter && (
        <>
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

          <div className="mt-8 flex justify-between items-center text-[10px] text-gray-500 font-bold border-t border-gray-200 pt-2">
            <span>Printed on: {printDate}</span>
            <span>Faviourite Readymade Garments - System Generated Document | Powered by <a href="https://www.intaindia.com">IN-TA Solutions</a> </span>
          </div>
        </>
      )}
    </div>
  );
};

export default PrintLayout;
