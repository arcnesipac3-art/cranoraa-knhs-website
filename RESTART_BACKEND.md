# Backend Server Restart Required

## Issue
"No documents uploaded" still shows in admin view even though fixes were applied.

## Root Cause
The Django backend server needs to be restarted to pick up the code changes in:
- `backend/accounts/views/enrollment.py` (line 158 - added `.prefetch_related('documents')`)
- Frontend changes are already applied (no build needed for React in development mode)

## Solution

###  1. Stop the Current Backend Server
If running in terminal:
- Press `Ctrl+C` to stop the server

If running in background/PM2/supervisor:
```bash
# PM2
pm2 restart backend

# Supervisor  
supervisorctl restart backend

# Manual process
pkill -f "python manage.py runserver"
```

### 2. Restart the Backend Server

```bash
cd backend
python manage.py runserver
```

Or if using a specific port:
```bash
python manage.py runserver 0.0.0.0:8000
```

### 3. Verify the Fix

After restarting, test in the browser:

1. **Open Admin Enrollment View** - Go to enrollment management
2. **Click on an application** that has uploaded documents
3. **Check Documents Section** - Should now show the EnrollmentDocument records instead of "No documents uploaded"

### 4. Test API Directly (Optional)

You can test the API endpoint directly to verify documents are being returned:

```bash
# Get an enrollment application ID from admin view
curl http://localhost:8000/api/v1/enrollment-applications/{id}/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Look for the `documents` array in the response - it should contain the EnrollmentDocument objects.

## What Was Fixed

### Backend (enrollment.py line 158)
**Before:**
```python
return EnrollmentApplication.objects.filter(email=user.email)
```

**After:**
```python
return EnrollmentApplication.objects.filter(email=user.email).prefetch_related('documents')
```

### Frontend (EnrollmentManagement.jsx getAppDocs function)
**Before:**
```javascript
if (app?.documents && app.documents.length > 0) return app.documents;
// Falls back to URL fields even when documents is empty array
```

**After:**
```javascript
if (app?.documents !== undefined) return app.documents;
// Only falls back to URL fields if documents property doesn't exist
```

## Expected Behavior After Restart

- ✅ Documents uploaded during enrollment will display in admin view
- ✅ EnrollmentDocument records will show with verification status
- ✅ Verify/Reject buttons will work for each document
- ✅ "No documents uploaded" only shows when truly no documents exist

## Troubleshooting

If documents still don't show after restart:

1. **Check browser console** for JavaScript errors
2. **Check Django logs** for query errors
3. **Verify database** has EnrollmentDocument records:
   ```bash
   python manage.py shell
   >>> from accounts.models import EnrollmentApplication, EnrollmentDocument
   >>> app = EnrollmentApplication.objects.first()
   >>> app.documents.all()
   >>> # Should show EnrollmentDocument queryset
   ```

4. **Clear browser cache** and reload the page
5. **Check API response** in Network tab (DevTools) - look for `documents` field in the response JSON

## Contact
If issue persists after restart, check:
- Backend logs: `backend/logs/` or console output
- Frontend console: Browser DevTools Console tab
- Network tab: Check the API response for the enrollment application endpoint
