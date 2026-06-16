import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

/**
 * Standardized data export utilities for CSV, PDF, and DOC formats.
 */

// Format current date for report headers
const getFormattedDate = () => {
  return new Date().toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Export data to CSV.
 * @param {Array} data - Array of objects containing the data.
 * @param {Array} columns - Array of column definitions { header: 'Name', key: 'name' }
 * @param {String} filename - Name of the output file without extension.
 */
export const exportToCSV = (data, columns, filename) => {
  if (!data || data.length === 0) return;

  const headerRow = columns.map(c => `"${c.header}"`).join(',');
  const rows = data.map(row => 
    columns.map(c => {
      let val = row[c.key];
      if (val === null || val === undefined) val = '';
      // Escape quotes
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(',')
  );

  const csvContent = "data:text/csv;charset=utf-8," + [headerRow, ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${filename}_${new Date().getTime()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export tabular data to a professional PDF.
 * @param {String} title - Title of the report.
 * @param {Array} data - Array of objects containing the data.
 * @param {Array} columns - Array of column definitions { header: 'Name', key: 'name' }
 * @param {String} filename - Name of the output file without extension.
 */
export const exportToPDF = (title, data, columns, filename) => {
  if (!data || data.length === 0) return;

  const doc = new jsPDF();
  
  // Add Header
  doc.setFontSize(18);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(title, 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(`Generated on: ${getFormattedDate()}`, 14, 30);
  
  // Prepare Table Data
  const tableHeaders = columns.map(c => c.header);
  const tableData = data.map(row => columns.map(c => row[c.key] || ''));

  // Generate Table
  doc.autoTable({
    startY: 35,
    head: [tableHeaders],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 9,
      cellPadding: 4,
    },
    headStyles: {
      fillColor: [15, 23, 42], // slate-900
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252], // slate-50
    }
  });

  doc.save(`${filename}_${new Date().getTime()}.pdf`);
};

/**
 * Export tabular data to a MS Word compatible HTML-based .doc file.
 * @param {String} title - Title of the report.
 * @param {Array} data - Array of objects containing the data.
 * @param {Array} columns - Array of column definitions { header: 'Name', key: 'name' }
 * @param {String} filename - Name of the output file without extension.
 */
export const exportToDOC = (title, data, columns, filename) => {
  if (!data || data.length === 0) return;

  // Build HTML table for Word
  let html = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>${title}</title>
    <style>
      body { font-family: Arial, sans-serif; }
      table { border-collapse: collapse; width: 100%; margin-top: 20px; }
      th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
      th { background-color: #0f172a; color: #ffffff; }
      h1 { color: #0f172a; margin-bottom: 5px; }
      p { color: #64748b; font-size: 12px; }
    </style>
    </head>
    <body>
      <h1>${title}</h1>
      <p>Generated on: ${getFormattedDate()}</p>
      <table>
        <thead>
          <tr>${columns.map(c => `<th>${c.header}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${data.map(row => `
            <tr>${columns.map(c => `<td>${row[c.key] !== null && row[c.key] !== undefined ? row[c.key] : ''}</td>`).join('')}</tr>
          `).join('')}
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}_${new Date().getTime()}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

/**
 * Export a single detailed record to PDF.
 * @param {String} title - Title of the document.
 * @param {Array} sections - Array of { title: 'Section', data: [[k,v], [k,v]] }
 * @param {String} imageUrl - Optional image URL to embed.
 * @param {String} filename - Name of the output file.
 */
export const exportRecordToPDF = async (title, sections, imageUrl, filename) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(22);
  doc.setTextColor(15, 23, 42);
  doc.text(title, 14, 25);
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`Generated on: ${getFormattedDate()}`, 14, 32);

  let startY = 40;

  // Try embedding image if provided
  if (imageUrl) {
    try {
      // Need to load the image to canvas to get base64 if it's a URL
      // If it's already a data URI or we can fetch it
      const img = new Image();
      img.crossOrigin = "Anonymous";
      
      const loadImg = new Promise((resolve) => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/jpeg'));
        };
        img.onerror = () => resolve(null);
        img.src = imageUrl;
      });

      const base64Img = await loadImg;
      if (base64Img) {
        doc.addImage(base64Img, 'JPEG', 14, startY, 60, 60);
        startY += 70;
      }
    } catch (e) {
      console.warn('Failed to embed image in PDF', e);
    }
  }

  sections.forEach(section => {
    // Add section title if provided
    if (section.title) {
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text(section.title, 14, startY);
      startY += 5;
    }

    if (section.type === 'table') {
      doc.autoTable({
        startY: startY + 2,
        head: [section.headers],
        body: section.data,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42] }
      });
      startY = doc.lastAutoTable.finalY + 10;
    } else {
      // Key Value pairs
      doc.autoTable({
        startY: startY + 2,
        body: section.data,
        theme: 'plain',
        styles: { cellPadding: 2, fontSize: 10 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 50 } }
      });
      startY = doc.lastAutoTable.finalY + 10;
    }
  });

  doc.save(`${filename}_${new Date().getTime()}.pdf`);
};
