import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  FormLabel,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Radio,
  RadioGroup,
  Select,
  MenuItem,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Divider,
  Tabs,
  Tab,
  Alert,
} from '@mui/material';
import {
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  Visibility as PreviewIcon,
  Settings as SettingsIcon,
  Save as SaveIcon,
} from '@mui/icons-material';

/**
 * ExportPreview Component - Preview and customize exports before generation
 * 
 * @param {Object} props
 * @param {boolean} props.open - Dialog open state
 * @param {Function} props.onClose - Close handler
 * @param {Function} props.onExport - Export handler (format, options)
 * @param {string} props.title - Preview dialog title
 * @param {string} props.exportType - 'pdf' | 'excel' | 'both'
 * @param {Array} props.data - Data to preview (first 10 rows shown)
 * @param {Array} props.columns - Column definitions [{key, label, visible}]
 * @param {Object} props.defaultOptions - Default export options
 */
const ExportPreview = ({
  open,
  onClose,
  onExport,
  title = 'Export Preview',
  exportType = 'both',
  data = [],
  columns = [],
  defaultOptions = {},
}) => {
  const [activeTab, setActiveTab] = useState(0);
  const [format, setFormat] = useState('pdf');
  const [options, setOptions] = useState({
    // Page Setup
    orientation: 'landscape',
    paperSize: 'A4',
    
    // Content Options
    includeHeader: true,
    includeFooter: true,
    includeSignatures: true,
    includeLegend: true,
    includeSummary: true,
    
    // Style Options
    colorScheme: 'default',
    alternatingRows: true,
    showBorders: true,
    
    // Column Visibility
    visibleColumns: [],
    
    // Preset
    preset: 'standard',
    
    ...defaultOptions,
  });

  // Initialize visible columns
  useEffect(() => {
    if (columns.length > 0 && options.visibleColumns.length === 0) {
      setOptions(prev => ({
        ...prev,
        visibleColumns: columns.filter(c => c.visible !== false).map(c => c.key),
      }));
    }
  }, [columns]);

  // Load saved preferences from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('exportPreferences');
    if (saved) {
      try {
        const preferences = JSON.parse(saved);
        setOptions(prev => ({ ...prev, ...preferences }));
      } catch (e) {
        console.error('Failed to load export preferences:', e);
      }
    }
  }, []);

  const handleOptionChange = (key, value) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  const handleColumnToggle = (columnKey) => {
    setOptions(prev => ({
      ...prev,
      visibleColumns: prev.visibleColumns.includes(columnKey)
        ? prev.visibleColumns.filter(k => k !== columnKey)
        : [...prev.visibleColumns, columnKey],
    }));
  };

  const handlePresetChange = (preset) => {
    const presets = {
      minimal: {
        preset: 'minimal',
        includeHeader: true,
        includeFooter: false,
        includeSignatures: false,
        includeLegend: false,
        includeSummary: false,
        colorScheme: 'bw',
        alternatingRows: false,
        showBorders: true,
      },
      standard: {
        preset: 'standard',
        includeHeader: true,
        includeFooter: true,
        includeSignatures: true,
        includeLegend: false,
        includeSummary: true,
        colorScheme: 'default',
        alternatingRows: true,
        showBorders: true,
      },
      full: {
        preset: 'full',
        includeHeader: true,
        includeFooter: true,
        includeSignatures: true,
        includeLegend: true,
        includeSummary: true,
        colorScheme: 'default',
        alternatingRows: true,
        showBorders: true,
      },
    };
    
    setOptions(prev => ({ ...prev, ...presets[preset] }));
  };

  const handleSavePreferences = () => {
    try {
      localStorage.setItem('exportPreferences', JSON.stringify(options));
      alert('Export preferences saved!');
    } catch (e) {
      console.error('Failed to save preferences:', e);
    }
  };

  const handleExport = () => {
    onExport(format, options);
    onClose();
  };

  // Get visible columns for preview
  const visibleColumnsData = columns.filter(col => 
    options.visibleColumns.includes(col.key)
  );

  // Preview data (first 10 rows)
  const previewData = data.slice(0, 10);

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="lg" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '80vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <PreviewIcon />
            <Typography variant="h6">{title}</Typography>
          </Box>
          <Chip 
            label={`${data.length} records`} 
            size="small" 
            color="primary"
          />
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)}>
            <Tab icon={<PreviewIcon />} label="Preview" />
            <Tab icon={<SettingsIcon />} label="Options" />
          </Tabs>
        </Box>

        {/* Tab 1: Preview */}
        {activeTab === 0 && (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              Showing first 10 of {data.length} records. Actual export will include all data.
            </Alert>
            
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#003366' }}>
                    {visibleColumnsData.map((col) => (
                      <TableCell 
                        key={col.key}
                        sx={{ 
                          color: 'white', 
                          fontWeight: 'bold',
                          fontSize: '0.75rem',
                        }}
                      >
                        {col.label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {previewData.length === 0 ? (
                    <TableRow>
                      <TableCell 
                        colSpan={visibleColumnsData.length} 
                        align="center"
                        sx={{ py: 4 }}
                      >
                        <Typography color="text.secondary">
                          No data to preview
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    previewData.map((row, idx) => (
                      <TableRow 
                        key={idx}
                        sx={{
                          bgcolor: options.alternatingRows && idx % 2 === 1 
                            ? '#f5f5f5' 
                            : 'white',
                        }}
                      >
                        {visibleColumnsData.map((col) => (
                          <TableCell 
                            key={col.key}
                            sx={{ fontSize: '0.75rem' }}
                          >
                            {row[col.key] ?? '-'}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Tab 2: Options */}
        {activeTab === 1 && (
          <Box>
            {/* Quick Presets */}
            <Box mb={3}>
              <Typography variant="subtitle2" gutterBottom>
                Quick Presets
              </Typography>
              <Box display="flex" gap={1}>
                <Button
                  variant={options.preset === 'minimal' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => handlePresetChange('minimal')}
                >
                  Minimal
                </Button>
                <Button
                  variant={options.preset === 'standard' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => handlePresetChange('standard')}
                >
                  Standard
                </Button>
                <Button
                  variant={options.preset === 'full' ? 'contained' : 'outlined'}
                  size="small"
                  onClick={() => handlePresetChange('full')}
                >
                  Full
                </Button>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Page Setup */}
            <Box mb={3}>
              <Typography variant="subtitle2" gutterBottom>
                Page Setup
              </Typography>
              <Box display="flex" gap={2} flexWrap="wrap">
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <FormLabel>Orientation</FormLabel>
                  <RadioGroup
                    row
                    value={options.orientation}
                    onChange={(e) => handleOptionChange('orientation', e.target.value)}
                  >
                    <FormControlLabel 
                      value="portrait" 
                      control={<Radio size="small" />} 
                      label="Portrait" 
                    />
                    <FormControlLabel 
                      value="landscape" 
                      control={<Radio size="small" />} 
                      label="Landscape" 
                    />
                  </RadioGroup>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <FormLabel>Paper Size</FormLabel>
                  <Select
                    value={options.paperSize}
                    onChange={(e) => handleOptionChange('paperSize', e.target.value)}
                  >
                    <MenuItem value="A3">A3</MenuItem>
                    <MenuItem value="A4">A4</MenuItem>
                    <MenuItem value="Letter">Letter</MenuItem>
                    <MenuItem value="Legal">Legal</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Content Options */}
            <Box mb={3}>
              <Typography variant="subtitle2" gutterBottom>
                Content Options
              </Typography>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={options.includeHeader}
                      onChange={(e) => handleOptionChange('includeHeader', e.target.checked)}
                    />
                  }
                  label="Include Header"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={options.includeFooter}
                      onChange={(e) => handleOptionChange('includeFooter', e.target.checked)}
                    />
                  }
                  label="Include Footer"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={options.includeSignatures}
                      onChange={(e) => handleOptionChange('includeSignatures', e.target.checked)}
                    />
                  }
                  label="Include Signature Blocks"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={options.includeLegend}
                      onChange={(e) => handleOptionChange('includeLegend', e.target.checked)}
                    />
                  }
                  label="Include Legend"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={options.includeSummary}
                      onChange={(e) => handleOptionChange('includeSummary', e.target.checked)}
                    />
                  }
                  label="Include Summary Statistics"
                />
              </FormGroup>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Style Options */}
            <Box mb={3}>
              <Typography variant="subtitle2" gutterBottom>
                Style Options
              </Typography>
              <Box display="flex" gap={2} flexWrap="wrap" mb={2}>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <FormLabel>Color Scheme</FormLabel>
                  <Select
                    value={options.colorScheme}
                    onChange={(e) => handleOptionChange('colorScheme', e.target.value)}
                  >
                    <MenuItem value="default">DepEd Default</MenuItem>
                    <MenuItem value="bw">Black & White</MenuItem>
                    <MenuItem value="minimal">Minimal Color</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={options.alternatingRows}
                      onChange={(e) => handleOptionChange('alternatingRows', e.target.checked)}
                    />
                  }
                  label="Alternating Row Colors"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={options.showBorders}
                      onChange={(e) => handleOptionChange('showBorders', e.target.checked)}
                    />
                  }
                  label="Show Table Borders"
                />
              </FormGroup>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Column Selection */}
            <Box mb={3}>
              <Typography variant="subtitle2" gutterBottom>
                Visible Columns ({options.visibleColumns.length}/{columns.length})
              </Typography>
              <FormGroup>
                {columns.map((col) => (
                  <FormControlLabel
                    key={col.key}
                    control={
                      <Checkbox
                        size="small"
                        checked={options.visibleColumns.includes(col.key)}
                        onChange={() => handleColumnToggle(col.key)}
                      />
                    }
                    label={col.label}
                  />
                ))}
              </FormGroup>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button 
          startIcon={<SaveIcon />} 
          onClick={handleSavePreferences}
          size="small"
        >
          Save Preferences
        </Button>
        <Box flex={1} />
        <Button onClick={onClose}>
          Cancel
        </Button>
        {exportType !== 'excel' && (
          <Button
            variant="contained"
            startIcon={<PdfIcon />}
            onClick={() => {
              setFormat('pdf');
              handleExport();
            }}
            color="error"
          >
            Export PDF
          </Button>
        )}
        {exportType !== 'pdf' && (
          <Button
            variant="contained"
            startIcon={<ExcelIcon />}
            onClick={() => {
              setFormat('excel');
              handleExport();
            }}
            color="success"
          >
            Export Excel
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ExportPreview;
