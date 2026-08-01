# SF10 Template Setup Instructions

## ✅ Completed Changes

The SF10 export has been refactored to use a **template-based approach** with ExcelJS:

- ✅ Switched from programmatic Excel generation to template loading
- ✅ Installed `exceljs` package (v4.4.0)
- ✅ Created template-loading utility that preserves all formatting
- ✅ Maps data to specific cells without touching styles/formulas
- ✅ Committed and pushed to main branch (commit: 752b005)

## 📋 Required Setup Step

**You need to place the SF10 template file in the correct location:**

### 1. Locate Your Template File
The template you provided: `SF10-Grade-9-Emerald-2026-2027 (1).xlsx`

### 2. Rename and Place It
```
1. Rename it to: SF10_Template.xlsx
2. Place it in: frontend/public/templates/SF10_Template.xlsx
```

### 3. Verify Template Structure
The template must have:
- **Sheet name "FRONT"** or be the first sheet (for Grade 7 & 8)
- **Sheet name "BACK"** or be the second sheet (for Grade 9 & 10)

## 📍 Cell Mapping Reference

The export fills these cells with student/school data:

### Student Information (FRONT sheet):
- B7: Last Name
- F7: First Name
- M7: Middle Name
- B8: LRN
- H8: Birthdate
- M8: Sex

### School Information (FRONT sheet):
- B20: School Name
- G20: School ID
- I20: District
- N20: Division
- Q20: Region
- B21: Grade Level
- D21: Section
- G21: School Year
- J21: Adviser Name

### Grades (Quarterly):
**FRONT Sheet:**
- Rows 24-34: Grade 7 (Columns G=Q1, H=Q2, I=Q3, J=Q4, K=Final)
- Rows 46-56: Grade 8 (Columns G=Q1, H=Q2, I=Q3, J=Q4, K=Final)

**BACK Sheet:**
- Rows 1-11: Grade 9 (Columns G=Q1, H=Q2, I=Q3, J=Q4, K=Final)
- Rows 25-35: Grade 10 (Columns G=Q1, H=Q2, I=Q3, J=Q4, K=Final)

## 🎯 How It Works

1. Teacher clicks "Export SF10 Excel" in ClassroomHub Grade Management
2. System loads the template from `/templates/SF10_Template.xlsx`
3. Fills in student data in mapped cells
4. **Preserves all:**
   - Cell borders and styles
   - Merged cells
   - Formulas (e.g., Final Rating calculations)
   - Colors and fonts
   - Page layout
5. Downloads the filled template as `SF10_StudentName_2026-2027.xlsx`

## 🔧 Testing

After placing the template file:

1. Go to ClassroomHub → Select a classroom → Grade Management
2. Click "Export SF10 Excel" button
3. Check the downloaded file has:
   - ✅ All original template formatting
   - ✅ Student name, LRN, and other info filled in
   - ✅ Grades displayed in correct cells
   - ✅ Formulas still working (Final Rating auto-calculates)

## 📦 Package Dependencies

The following packages were added:

```json
{
  "exceljs": "^4.4.0"
}
```

Run `npm install` in the frontend directory if deploying to a new environment.

## ⚠️ Important Notes

1. **Template Location**: Must be in `frontend/public/templates/` (accessible via public URL)
2. **File Name**: Must be exactly `SF10_Template.xlsx`
3. **Sheet Names**: Use "FRONT" and "BACK" or ensure they are sheets 1 and 2
4. **Cell References**: The mapping assumes the template structure from the provided example
5. **Formula Preservation**: Column K (Final Rating) formulas are NOT overwritten

## 🚀 Next Steps

1. Place `SF10_Template.xlsx` in `frontend/public/templates/`
2. Test the export functionality
3. Adjust cell mappings if template structure differs
4. (Optional) Extend to export all students instead of just the first one
