/**
 * Shared Export Utilities for KNHS
 * Provides consistent branding, formatting, error handling, and progress tracking
 * for all PDF and Excel exports across the application.
 */

import toast from 'react-hot-toast';

// ══════════════════════════════════════════════════════════════════════════════
// SCHOOL BRANDING & CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

export const SCHOOL_INFO = {
  name: 'Kiwalan National High School',
  shortName: 'KNHS',
  address: 'Kiwalan, Iligan City, Lanao del Norte',
  region: 'Region X - Iligan City',
  division: 'Division of Lanao del Norte',
  contact: '(063) 221-XXXX',
  email: 'knhs@deped.gov.ph',
  website: 'www.knhs.edu.ph',
  motto: 'Excellence in Education',
  logo: '/icons/school-logo-source.png',
};

export const DEPED_COLORS = {
  primary: '#003366',      // DepEd Blue
  secondary: '#0066CC',    // Light Blue
  accent: '#FF9900',       // Orange accent
  success: '#10B981',      // Green
  warning: '#F59E0B',      // Amber
  danger: '#EF4444',       // Red
  dark: '#1E293B',         // Slate 800
  muted: '#64748B',        // Slate 500
  light: '#F8FAFC',        // Slate 50
  border: '#E2E8F0',       // Slate 200
};

// ══════════════════════════════════════════════════════════════════════════════
// EXPORT PROGRESS TRACKING
// ══════════════════════════════════════════════════════════════════════════════

export class ExportProgress {
  constructor(totalSteps, message = 'Exporting...') {
    this.totalSteps = totalSteps;
    this.currentStep = 0;
    this.toastId = toast.loading(`${message} (0%)`);
  }

  update(step, message) {
    this.currentStep = step;
    const percent = Math.round((step / this.totalSteps) * 100);
    toast.loading(`${message} (${percent}%)`, { id: this.toastId });
  }

  complete(successMessage = 'Export completed successfully') {
    toast.success(successMessage, { id: this.toastId, duration: 3000 });
  }

  error(errorMessage = 'Export failed') {
    toast.error(errorMessage, { id: this.toastId, duration: 5000 });
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PDF EXPORT HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Standard PDF page setup for KNHS documents
 */
export const getPDFPageSetup = (orientation = 'portrait') => ({
  orientation,
  unit: 'mm',
  format: 'a4',
  compress: true,
});

/**
 * Add standard KNHS header to PDF
 */
export const addPDFHeader = (doc, title, subtitle = null, options = {}) => {
  const {
    startY = 15,
    includeRepublic = true,
    includeDepEd = true,
    includeLogo = true,
    logoSize = 15,
  } = options;

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = startY;

  // Logo (if included)
  if (includeLogo) {
    try {
      doc.addImage(SCHOOL_INFO.logo, 'PNG', margin, y - 2, logoSize, logoSize);
    } catch (e) {
      console.warn('Logo not loaded:', e);
    }
  }

  const textStartX = includeLogo ? margin + logoSize + 5 : pageWidth / 2;
  const textAlign = includeLogo ? 'left' : 'center';

  // Republic of the Philippines header
  if (includeRepublic) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Republic of the Philippines', textStartX, y, { align: textAlign });
    y += 4;
  }

  // DepEd information
  if (includeDepEd) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Department of Education', textStartX, y, { align: textAlign });
    y += 3.5;
    doc.text(SCHOOL_INFO.region, textStartX, y, { align: textAlign });
    y += 3.5;
    doc.text(SCHOOL_INFO.division, textStartX, y, { align: textAlign });
    y += 5;
  }

  // School name
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 51, 102); // DepEd Blue
  doc.text(SCHOOL_INFO.name.toUpperCase(), textStartX, y, { align: textAlign });
  y += 6;

  // Title
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text(title.toUpperCase(), textStartX, y, { align: textAlign });
  y += 5;

  // Subtitle
  if (subtitle) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(subtitle, textStartX, y, { align: textAlign });
    y += 5;
  }

  // Divider line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 3;

  return y;
};

/**
 * Add standard KNHS footer to PDF
 */
export const addPDFFooter = (doc, options = {}) => {
  const {
    pageNumber = null,
    totalPages = null,
    leftText = SCHOOL_INFO.name,
    centerText = null,
    rightText = 'Internal Document',
    includeDate = true,
  } = options;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const footerY = pageHeight - 10;

  // Footer line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

  // Footer text
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);

  // Left: School name
  doc.text(leftText, margin, footerY);

  // Center: Custom text or date
  if (centerText) {
    doc.text(centerText, pageWidth / 2, footerY, { align: 'center' });
  } else if (includeDate) {
    const dateStr = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    doc.text(`Generated: ${dateStr}`, pageWidth / 2, footerY, { align: 'center' });
  }

  // Right: Page number or custom text
  if (pageNumber !== null) {
    const pageText = totalPages ? `Page ${pageNumber} of ${totalPages}` : `Page ${pageNumber}`;
    doc.text(pageText, pageWidth - margin, footerY, { align: 'right' });
  } else if (rightText) {
    doc.text(rightText, pageWidth - margin, footerY, { align: 'right' });
  }
};

/**
 * Add signature block to PDF
 */
export const addSignatureBlock = (doc, y, signatories, options = {}) => {
  const {
    columns = signatories.length,
    gap = 10,
    lineLength = 50,
    spaceAbove = 40,
  } = options;

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const availableWidth = pageWidth - 2 * margin;
  const columnWidth = (availableWidth - (columns - 1) * gap) / columns;

  y += spaceAbove;

  signatories.forEach((signatory, index) => {
    const x = margin + index * (columnWidth + gap);
    const centerX = x + columnWidth / 2;

    // Signature line
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    const lineStart = centerX - lineLength / 2;
    const lineEnd = centerX + lineLength / 2;
    doc.line(lineStart, y, lineEnd, y);

    // Name (above line if provided)
    if (signatory.name) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text(signatory.name, centerX, y - 2, { align: 'center' });
    }

    // Position/Title (below line)
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(signatory.title || '', centerX, y + 4, { align: 'center' });

    // Additional info
    if (signatory.subtitle) {
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text(signatory.subtitle, centerX, y + 8, { align: 'center' });
    }
  });

  return y + 15;
};

/**
 * Enhanced html2canvas capture with better quality
 */
export const captureElementToPDF = async (
  element,
  doc,
  options = {}
) => {
  const html2canvas = (await import('html2canvas')).default;

  const {
    scale = 3, // Higher quality
    x = 15,
    y = null,
    width = null,
    maxWidth = null,
    backgroundColor = '#ffffff',
  } = options;

  // Temporarily fix styles for capture
  const originalBg = element.style.background;
  element.style.background = backgroundColor;

  // Hide interactive elements
  const interactiveElements = element.querySelectorAll(
    'button, select, input, .no-export'
  );
  const originalDisplay = [];
  interactiveElements.forEach((el) => {
    originalDisplay.push(el.style.display);
    el.style.display = 'none';
  });

  try {
    const canvas = await html2canvas(element, {
      scale,
      useCORS: true,
      allowTaint: true,
      backgroundColor,
      logging: false,
      windowWidth: 1200,
      onclone: (cloneDoc) => {
        // Clean up cloned document for export
        const clonedEl = cloneDoc.body.querySelector('[data-export-content]') || cloneDoc.body;
        
        clonedEl.querySelectorAll('.no-export, button, select, input').forEach((n) => {
          n.style.display = 'none';
        });

        // Convert dark backgrounds to light
        clonedEl.querySelectorAll('.bg-slate-900, .bg-slate-800, .bg-gray-900').forEach((n) => {
          n.style.background = '#ffffff';
          n.style.color = '#0f172a';
          n.style.boxShadow = 'none';
        });

        // Ensure text is visible
        clonedEl.querySelectorAll('.text-white').forEach((n) => {
          n.style.color = '#1e293b';
        });
      },
    });

    // Restore original styles
    element.style.background = originalBg;
    interactiveElements.forEach((el, index) => {
      el.style.display = originalDisplay[index];
    });

    // Calculate dimensions
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const availableWidth = maxWidth || (pageWidth - 2 * margin);
    const imgWidth = width || availableWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const imgData = canvas.toDataURL('image/jpeg', 0.95); // JPEG with 95% quality for smaller size

    const startY = y !== null ? y : doc.lastAutoTable?.finalY || 20;
    
    // Check if we need pagination
    const pageHeight = doc.internal.pageSize.getHeight();
    const bottomMargin = 25;

    if (startY + imgHeight > pageHeight - bottomMargin) {
      // Split across multiple pages
      let remainingHeight = imgHeight;
      let sourceY = 0;
      let currentY = startY;

      while (remainingHeight > 0) {
        const availableHeight = pageHeight - currentY - bottomMargin;
        const captureHeight = Math.min(remainingHeight, availableHeight);
        
        const ratio = canvas.width / imgWidth;
        const sourceHeight = captureHeight * ratio;

        // Create temporary canvas for this slice
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = sourceHeight;
        const ctx = tempCanvas.getContext('2d');
        ctx.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);

        const sliceData = tempCanvas.toDataURL('image/jpeg', 0.95);
        doc.addImage(sliceData, 'JPEG', x, currentY, imgWidth, captureHeight);

        remainingHeight -= captureHeight;
        sourceY += sourceHeight;

        if (remainingHeight > 0) {
          doc.addPage();
          currentY = 20;
        } else {
          currentY += captureHeight;
        }
      }
      return currentY;
    } else {
      doc.addImage(imgData, 'JPEG', x, startY, imgWidth, imgHeight);
      return startY + imgHeight;
    }
  } catch (error) {
    // Restore on error
    element.style.background = originalBg;
    interactiveElements.forEach((el, index) => {
      el.style.display = originalDisplay[index];
    });
    throw error;
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// EXCEL EXPORT HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create Excel workbook with standard KNHS styling
 */
export const createStyledWorkbook = async (sheetName = 'Sheet1') => {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  
  wb.Props = {
    Title: sheetName,
    Subject: 'School Data Export',
    Author: SCHOOL_INFO.name,
    CreatedDate: new Date(),
  };

  return { wb, XLSX };
};

/**
 * Apply standard header styling to Excel worksheet
 */
export const styleExcelHeaders = (ws, XLSX, headerRow = 1, numColumns = null) => {
  if (!ws['!ref']) return;

  const range = XLSX.utils.decode_range(ws['!ref']);
  const lastCol = numColumns ? numColumns - 1 : range.e.c;

  for (let col = 0; col <= lastCol; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: headerRow - 1, c: col });
    if (!ws[cellAddress]) continue;

    ws[cellAddress].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
      fill: { fgColor: { rgb: '003366' } }, // DepEd Blue
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: {
        top: { style: 'thin', color: { rgb: '000000' } },
        bottom: { style: 'thin', color: { rgb: '000000' } },
        left: { style: 'thin', color: { rgb: '000000' } },
        right: { style: 'thin', color: { rgb: '000000' } },
      },
    };
  }
};

/**
 * Add KNHS header section to Excel worksheet
 */
export const addExcelHeader = (wsData, title, options = {}) => {
  const {
    includeRepublic = true,
    includeDepEd = true,
    subtitle = null,
    metadata = {},
  } = options;

  const headerRows = [];

  if (includeRepublic) {
    headerRows.push(['Republic of the Philippines']);
  }

  if (includeDepEd) {
    headerRows.push(['Department of Education']);
    headerRows.push([SCHOOL_INFO.region]);
    headerRows.push([SCHOOL_INFO.division]);
  }

  headerRows.push([SCHOOL_INFO.name.toUpperCase()]);
  headerRows.push([title.toUpperCase()]);

  if (subtitle) {
    headerRows.push([subtitle]);
  }

  if (Object.keys(metadata).length > 0) {
    headerRows.push([]);
    Object.entries(metadata).forEach(([key, value]) => {
      headerRows.push([key, value]);
    });
  }

  headerRows.push([]); // Empty row before data

  return [...headerRows, ...wsData];
};

/**
 * Auto-size columns in Excel worksheet
 */
export const autoSizeColumns = (ws, XLSX, minWidth = 10, maxWidth = 50) => {
  if (!ws['!ref']) return;

  const range = XLSX.utils.decode_range(ws['!ref']);
  const colWidths = [];

  for (let col = range.s.c; col <= range.e.c; col++) {
    let maxLen = minWidth;

    for (let row = range.s.r; row <= range.e.r; row++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = ws[cellAddress];
      
      if (cell && cell.v) {
        const cellLen = String(cell.v).length;
        maxLen = Math.max(maxLen, cellLen);
      }
    }

    colWidths.push({ wch: Math.min(maxLen + 2, maxWidth) });
  }

  ws['!cols'] = colWidths;
};

/**
 * Download Excel file
 */
export const downloadExcelFile = async (wb, XLSX, filename) => {
  try {
    XLSX.writeFile(wb, filename);
    return true;
  } catch (error) {
    console.error('Excel download failed:', error);
    throw new Error('Failed to download Excel file');
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// BLOB DOWNLOAD HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Download blob with proper MIME type and filename
 */
export const downloadBlob = (blob, filename, mimeType = null) => {
  try {
    const blobToDownload = mimeType ? new Blob([blob], { type: mimeType }) : blob;
    const url = window.URL.createObjectURL(blobToDownload);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    console.error('Download failed:', error);
    throw new Error('Failed to download file');
  }
};

/**
 * Download from API endpoint with authentication
 */
export const downloadFromAPI = async (api, endpoint, filename, options = {}) => {
  const {
    method = 'get',
    params = {},
    data = {},
    responseType = 'blob',
  } = options;

  try {
    const config = {
      params,
      responseType,
      ...options,
    };

    const response = method === 'post' 
      ? await api.post(endpoint, data, config)
      : await api.get(endpoint, config);

    downloadBlob(response.data, filename);
    return true;
  } catch (error) {
    console.error('API download failed:', error);
    throw new Error(error.response?.data?.error || 'Failed to download from server');
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// DATA VALIDATION & SANITIZATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Validate and sanitize data before export
 */
export const validateExportData = (data, requiredFields = []) => {
  if (!data || (Array.isArray(data) && data.length === 0)) {
    throw new Error('No data available to export');
  }

  if (Array.isArray(data) && requiredFields.length > 0) {
    const missingFields = requiredFields.filter(
      (field) => data.some((row) => !(field in row))
    );

    if (missingFields.length > 0) {
      console.warn('Some rows are missing fields:', missingFields);
    }
  }

  return true;
};

/**
 * Sanitize text for export (remove special characters that break formatting)
 */
export const sanitizeForExport = (text) => {
  if (!text) return '';
  return String(text)
    .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
    .trim();
};

/**
 * Format date for export
 */
export const formatDateForExport = (date, format = 'MM/DD/YYYY') => {
  if (!date) return '';
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();

  switch (format) {
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'MMMM DD, YYYY':
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    default:
      return d.toLocaleDateString();
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// ERROR HANDLING
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Standard error handler for exports
 */
export const handleExportError = (error, type = 'Export') => {
  console.error(`${type} error:`, error);

  let message = `${type} failed`;

  if (error.message) {
    message = error.message;
  } else if (error.response?.data?.error) {
    message = error.response.data.error;
  } else if (error.response?.data?.detail) {
    message = error.response.data.detail;
  }

  toast.error(message, { duration: 5000 });
  return false;
};

/**
 * Wrapper for export functions with standardized error handling
 */
export const withExportErrorHandling = async (exportFn, type = 'Export') => {
  try {
    await exportFn();
    return true;
  } catch (error) {
    return handleExportError(error, type);
  }
};

// ══════════════════════════════════════════════════════════════════════════════
// FILENAME GENERATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generate standardized filename for exports
 */
export const generateExportFilename = (baseName, extension, options = {}) => {
  const {
    includeDate = true,
    includeTime = false,
    suffix = null,
    dateFormat = 'YYYY-MM-DD',
  } = options;

  let filename = baseName.replace(/[^a-z0-9_-]/gi, '_');

  if (suffix) {
    filename += `_${suffix}`;
  }

  if (includeDate) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    if (dateFormat === 'YYYY-MM-DD') {
      filename += `_${year}-${month}-${day}`;
    } else {
      filename += `_${month}${day}${year}`;
    }

    if (includeTime) {
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      filename += `_${hours}${minutes}`;
    }
  }

  return `${filename}.${extension}`;
};

export default {
  SCHOOL_INFO,
  DEPED_COLORS,
  ExportProgress,
  getPDFPageSetup,
  addPDFHeader,
  addPDFFooter,
  addSignatureBlock,
  captureElementToPDF,
  createStyledWorkbook,
  styleExcelHeaders,
  addExcelHeader,
  autoSizeColumns,
  downloadExcelFile,
  downloadBlob,
  downloadFromAPI,
  validateExportData,
  sanitizeForExport,
  formatDateForExport,
  handleExportError,
  withExportErrorHandling,
  generateExportFilename,
};


// ══════════════════════════════════════════════════════════════════════════════

