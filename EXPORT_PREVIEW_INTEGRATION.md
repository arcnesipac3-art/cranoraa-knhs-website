# ExportPreview Integration Guide

This guide shows how to integrate the new ExportPreview component into existing pages.

## Quick Start

### 1. Import the Component

```javascript
import { ExportPreview } from '../utils/exportHelpers';
```

### 2. Add State Management

```javascript
const [previewOpen, setPreviewOpen] = useState(false);
```

### 3. Replace Direct Export with Preview

**Before:**
```javascript
<Button onClick={handleExportPDF}>
  Export PDF
</Button>
```

**After:**
```javascript
<Button onClick={() => setPreviewOpen(true)}>
  Export with Preview
</Button>

<ExportPreview
  open={previewOpen}
  onClose={() => setPreviewOpen(false)}
  onExport={handleExportWithOptions}
  title="Export Preview"
  exportType="both"
  data={students}
  columns={columns}
/>
```

## Complete Integration Examples

### Example 1: MasterSheet Integration

```javascript
import React, { useState } from 'react';
import { ExportPreview } from '../utils/exportHelpers';

const MasterSheet = () => {
  const [students, setStudents] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);

  // Define columns for preview
  const columns = [
    { key: 'no', label: 'No.' },
    { key: 'lrn', label: 'LRN' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'firstName', label: 'First Name' },
    { key: 'q1', label: 'Q1' },
    { key: 'q2', label: 'Q2' },
    { key: 'q3', label: 'Q3' },
    { key: 'q4', label: 'Q4' },
    { key: 'final', label: 'Final' },
    { key: 'remarks', label: 'Remarks' },
  ];

  // Handle export with options from preview
  const handleExportWithOptions = async (format, options) => {
    if (format === 'pdf') {
      await exportToPDF(students, options);
    } else {
      await exportToExcel(students, options);
    }
  };

  // Existing export functions updated to accept options
  const exportToPDF = async (data, options = {}) => {
    // Use options.orientation, options.includeHeader, etc.
    const doc = new jsPDF({
      orientation: options.orientation || 'landscape',
      unit: 'mm',
      format: options.paperSize || 'A4',
    });

    // Filter columns based on options.visibleColumns
    const visibleData = data.map(row => {
      const filtered = {};
      options.visibleColumns?.forEach(col => {
        filtered[col] = row[col];
      });
      return filtered;
    });

    // Apply other options...
    if (options.includeHeader) {
      // Add header
    }
    if (options.includeFooter) {
      // Add footer
    }
    if (options.includeSignatures) {
      // Add signatures
    }

    // Generate PDF...
  };

  const exportToExcel = async (data, options = {}) => {
    // Similar implementation for Excel
  };

  return (
    <div>
      {/* Your existing UI */}
      
      <Button
        variant="contained"
        onClick={() => setPreviewOpen(true)}
      >
        Export with Preview
      </Button>

      <ExportPreview
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onExport={handleExportWithOptions}
        title="Master Sheet Export Preview"
        exportType="both"
        data={students}
        columns={columns}
        defaultOptions={{
          orientation: 'landscape',
          paperSize: 'A4',
          includeHeader: true,
          includeFooter: true,
          includeSignatures: true,
          includeSummary: true,
        }}
      />
    </div>
  );
};
```

### Example 2: Teachers Directory Integration

```javascript
import React, { useState } from 'react';
import { ExportPreview } from '../utils/exportHelpers';

const Teachers = () => {
  const [teachers, setTeachers] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);

  const columns = [
    { key: 'no', label: 'No.' },
    { key: 'title', label: 'Title' },
    { key: 'lastName', label: 'Last Name' },
    { key: 'firstName', label: 'First Name' },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'department', label: 'Department' },
    { key: 'position', label: 'Position' },
    { key: 'employeeId', label: 'Employee ID' },
    { key: 'status', label: 'Status' },
    { key: 'passwordStatus', label: 'Password Status' },
    { key: 'lastLogin', label: 'Last Login' },
  ];

  const handleExportWithOptions = async (format, options) => {
    // Filter visible columns
    const visibleColumns = columns.filter(col => 
      options.visibleColumns.includes(col.key)
    );

    if (format === 'pdf') {
      await exportTeachersPDF(teachers, visibleColumns, options);
    } else {
      await exportTeachersExcel(teachers, visibleColumns, options);
    }
  };

  return (
    <div>
      <Button onClick={() => setPreviewOpen(true)}>
        Export Directory
      </Button>

      <ExportPreview
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onExport={handleExportWithOptions}
        title="Teachers Directory Export"
        exportType="both"
        data={teachers}
        columns={columns}
        defaultOptions={{
          orientation: 'portrait',
          paperSize: 'Letter',
          includeHeader: true,
          includeFooter: true,
          includeSummary: true,
        }}
      />
    </div>
  );
};
```

### Example 3: SF1 School Register Integration

```javascript
import React, { useState } from 'react';
import { ExportPreview } from '../utils/exportHelpers';

const SF1SchoolRegister = () => {
  const [students, setStudents] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);

  const columns = [
    { key: 'no', label: 'No.' },
    { key: 'lrn', label: 'LRN' },
    { key: 'name', label: 'Name' },
    { key: 'sex', label: 'Sex' },
    { key: 'birthdate', label: 'Birth Date' },
    { key: 'age', label: 'Age' },
    { key: 'motherTongue', label: 'Mother Tongue' },
    { key: 'indigenousPeople', label: 'IP/Ethnic Group' },
    { key: 'religion', label: 'Religion' },
    { key: 'address', label: 'Address' },
    { key: 'barangay', label: 'Barangay' },
    { key: 'municipality', label: 'Municipality' },
    { key: 'province', label: 'Province' },
    { key: 'fatherName', label: "Father's Name" },
    { key: 'motherName', label: "Mother's Name" },
    { key: 'guardianName', label: 'Guardian' },
    { key: 'relationship', label: 'Relationship' },
    { key: 'contactNumber', label: 'Contact Number' },
    { key: 'learningModality', label: 'Learning Modality' },
    { key: 'remarks', label: 'Remarks' },
  ];

  const handleExportWithOptions = async (format, options) => {
    // For SF1, we can only export to Excel via backend
    // But we can still use options for column filtering
    
    const payload = {
      students: students,
      options: {
        visible_columns: options.visibleColumns,
        include_legend: options.includeLegend,
        include_signatures: options.includeSignatures,
      },
    };

    const response = await api.post('/api/school-forms/sf1/export/', payload);
    // Handle download...
  };

  return (
    <div>
      <Button onClick={() => setPreviewOpen(true)}>
        Export SF1
      </Button>

      <ExportPreview
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onExport={handleExportWithOptions}
        title="SF1 School Register Export"
        exportType="excel"  // SF1 only supports Excel
        data={students}
        columns={columns}
        defaultOptions={{
          orientation: 'landscape',
          paperSize: 'A3',
          includeHeader: true,
          includeFooter: true,
          includeSignatures: true,
          includeLegend: true,
        }}
      />
    </div>
  );
};
```

## Component Props Reference

```typescript
interface ExportPreviewProps {
  // Required
  open: boolean;                    // Dialog open state
  onClose: () => void;              // Close handler
  onExport: (format, options) => void;  // Export handler
  
  // Optional
  title?: string;                   // Dialog title (default: "Export Preview")
  exportType?: 'pdf' | 'excel' | 'both';  // Available formats (default: "both")
  data?: Array<any>;                // Data to preview (first 10 rows)
  columns?: Array<{                 // Column definitions
    key: string;                    // Data key
    label: string;                  // Display label
    visible?: boolean;              // Initially visible (default: true)
  }>;
  defaultOptions?: {                // Default export options
    orientation?: 'portrait' | 'landscape';
    paperSize?: 'A3' | 'A4' | 'Letter' | 'Legal';
    includeHeader?: boolean;
    includeFooter?: boolean;
    includeSignatures?: boolean;
    includeLegend?: boolean;
    includeSummary?: boolean;
    colorScheme?: 'default' | 'bw' | 'minimal';
    alternatingRows?: boolean;
    showBorders?: boolean;
  };
}
```

## Export Options Object

The `onExport` callback receives these options:

```javascript
{
  // Page Setup
  orientation: 'portrait' | 'landscape',
  paperSize: 'A3' | 'A4' | 'Letter' | 'Legal',
  
  // Content Options
  includeHeader: boolean,
  includeFooter: boolean,
  includeSignatures: boolean,
  includeLegend: boolean,
  includeSummary: boolean,
  
  // Style Options
  colorScheme: 'default' | 'bw' | 'minimal',
  alternatingRows: boolean,
  showBorders: boolean,
  
  // Column Visibility
  visibleColumns: string[],  // Array of column keys to include
  
  // Preset
  preset: 'minimal' | 'standard' | 'full',
}
```

## Migration Checklist

For each page with exports:

- [ ] Import ExportPreview component
- [ ] Add preview state (`previewOpen`)
- [ ] Define columns array
- [ ] Update export functions to accept options
- [ ] Replace direct export buttons with preview trigger
- [ ] Add ExportPreview component to JSX
- [ ] Test preview functionality
- [ ] Test export with different options
- [ ] Test saved preferences

## Tips & Best Practices

### 1. Column Definitions
Always define all columns, even if not all data fields are included:

```javascript
const columns = [
  { key: 'id', label: 'ID', visible: false },  // Hidden by default
  { key: 'name', label: 'Name' },
  { key: 'grade', label: 'Grade' },
];
```

### 2. Handling Options in Export Functions

```javascript
const exportToPDF = async (data, options) => {
  // Filter data by visible columns
  const visibleColumns = columns.filter(col => 
    options.visibleColumns.includes(col.key)
  );
  
  // Apply page setup
  const doc = new jsPDF({
    orientation: options.orientation,
    unit: 'mm',
    format: options.paperSize,
  });
  
  // Conditional sections
  if (options.includeHeader) {
    addPDFHeader(doc, 'Title', 'Subtitle');
  }
  
  if (options.includeFooter) {
    addPDFFooter(doc, { pageNumber: 1 });
  }
  
  // Apply styles
  const rowColor = options.alternatingRows ? '#f5f5f5' : 'white';
  const borderStyle = options.showBorders ? 'solid' : 'none';
};
```

### 3. Preserving User Preferences

The component automatically saves preferences to localStorage. No additional code needed!

### 4. Backend Integration

For backend exports (like SF1), send options in the request:

```javascript
const handleExportWithOptions = async (format, options) => {
  const response = await api.post('/api/export/sf1/', {
    classroom_id: selectedClassroom,
    export_options: {
      visible_columns: options.visibleColumns,
      include_signatures: options.includeSignatures,
      include_legend: options.includeLegend,
    },
  });
};
```

Then update the backend view to accept and use these options.

## Troubleshooting

### Issue: Preview not showing data
**Solution**: Ensure data prop is an array of objects with keys matching column keys.

### Issue: Columns not appearing
**Solution**: Check that column `key` values match the keys in your data objects.

### Issue: Preferences not saving
**Solution**: Check browser localStorage permissions. Try in incognito mode to test.

### Issue: Export fails with options
**Solution**: Ensure your export functions handle all option parameters gracefully with defaults.

## Support

For questions or issues:
- Review complete examples in this document
- Check the ExportPreview component source code
- Refer to EXPORT_IMPROVEMENTS.md for detailed specifications
- Contact IT support: knhs@deped.gov.ph
