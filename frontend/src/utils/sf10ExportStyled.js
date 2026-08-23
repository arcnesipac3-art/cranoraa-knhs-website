/**
 * SF10-JHS Direct Template Download
 *
 * Due to browser limitations with Excel formatting preservation,
 * this downloads the template file for manual completion.
 * 
 * JavaScript libraries cannot reliably preserve complex Excel formatting
 * when modifying files in the browser. For automated data filling,
 * a backend service using openpyxl (Python) or similar would be required.
 */

// Template path
const TEMPLATE_PATH = '/templates/SF10_Template.xlsx';

/**
 * Download the SF10 template for manual completion
 */
export async function exportSF10(classroom, enrollments, allGrades, info = {}) {
  try {
    // Fetch the template file
    const response = await fetch(TEMPLATE_PATH);
    
    if (!response.ok) {
      throw new Error(`Template file not found. Status: ${response.status}`);
    }
    
    const blob = await response.blob();
    
    // Download the template as-is for manual data entry
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = `SF10_Template_${classroom.name.replace(/[^a-zA-Z0-9]/g, '_')}_${info.schoolYear || 'SY'}.xlsx`;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('SF10 download error:', error);
    throw error;
  }
}
