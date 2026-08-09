# 🤖 PRISM Automated Testing Guide

Complete guide for running automated black-box tests on the PRISM School Information Management System.

## 📦 What's Included

Your automated testing suite includes:

### 1. **UI/Browser Tests** (`tests/automated_blackbox_tests.py`)
- Selenium WebDriver-based testing
- Tests user workflows through the browser
- Covers authentication, enrollment, grades, forms
- Generates screenshots for failures

### 2. **API Tests** (`tests/api_tests.py`)
- Direct API endpoint testing
- Faster than UI tests
- Tests backend logic without browser overhead
- Validates authentication, authorization, data integrity

### 3. **Test Runner** (`tests/run_tests.ps1`)
- PowerShell script for easy test execution
- Interactive menu for test selection
- Auto-installs dependencies
- Opens HTML reports automatically

## 🚀 Quick Start (5 Minutes)

### Step 1: Install Python
Download and install Python 3.8+ from [python.org](https://www.python.org/downloads/)

**Verify installation:**
```bash
python --version
```

### Step 2: Install Dependencies
```bash
cd "c:\Users\dragon\Desktop\AI-made Website\tests"
pip install -r requirements.txt
```

### Step 3: Configure Test Users
```bash
# Copy example config
copy .env.example .env

# Edit .env with your test credentials
notepad .env
```

**Update these lines in `.env`:**
```env
TEST_ADMIN_EMAIL=your-admin@knhs.edu.ph
TEST_ADMIN_PASSWORD=YourActualPassword

TEST_TEACHER_EMAIL=your-teacher@knhs.edu.ph
TEST_TEACHER_PASSWORD=YourActualPassword

TEST_STUDENT_EMAIL=your-student@knhs.edu.ph
TEST_STUDENT_PASSWORD=YourActualPassword
```

### Step 4: Start Your Application

**Terminal 1 - Backend:**
```bash
cd backend
python manage.py runserver
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### Step 5: Run Tests!

**Option A: PowerShell Script (Recommended for Windows)**
```powershell
cd tests
.\run_tests.ps1
```

**Option B: Direct Pytest**
```bash
cd tests
pytest automated_blackbox_tests.py -v --html=test_report.html
```

## 📊 Understanding Test Results

### HTML Report
After tests run, open `test_report.html` in your browser:
- ✅ Green = Passed
- ❌ Red = Failed
- ⚠️ Yellow = Skipped
- Click on test names for detailed logs

### Console Output
```
tests/automated_blackbox_tests.py::TestAuthentication::test_AUTH_001_valid_login_admin PASSED [ 10%]
tests/automated_blackbox_tests.py::TestAuthentication::test_AUTH_002_invalid_credentials PASSED [ 20%]
```

### Screenshots
Failed tests automatically save screenshots to `test_screenshots/`

## 🧪 Test Coverage Matrix

| Test ID | Module | Status | Notes |
|---------|--------|--------|-------|
| AUTH-001 | Authentication | ✅ Automated | All roles tested |
| AUTH-002 | Authentication | ✅ Automated | Invalid credentials |
| AUTH-003 | Authentication | ✅ Automated | SQL injection |
| AUTH-004 | Authentication | ✅ Automated | Session management |
| ADM-001 | Enrollment | ⚠️ Partial | Needs test data |
| STU-001 | Grade Viewing | ⚠️ Partial | Needs test data |
| FORM-001 | SF9 Generation | ⚠️ Partial | Needs test data |

**Legend:**
- ✅ Fully Automated
- ⚠️ Partially Automated (requires test data setup)
- ❌ Not Implemented

## 🎯 Running Specific Tests

### Run only Authentication tests:
```bash
pytest automated_blackbox_tests.py::TestAuthentication -v
```

### Run a single test case:
```bash
pytest automated_blackbox_tests.py::TestAuthentication::test_AUTH_001_valid_login_admin -v
```

### Run API tests:
```bash
pytest api_tests.py -v --html=api_report.html
```

### Run tests for specific test ID:
```bash
pytest automated_blackbox_tests.py -k "AUTH-001" -v
```

## 🔧 Configuration Options

### Running in Headless Mode (No Browser Window)

Edit `automated_blackbox_tests.py`, line 77:
```python
# Uncomment this line:
options.add_argument('--headless')
```

### Changing Wait Timeout

Edit `automated_blackbox_tests.py`, line 31:
```python
WAIT_TIMEOUT = 20  # Increase from 10 to 20 seconds
```

### Testing Production Environment

Update `.env`:
```env
TEST_BASE_URL=https://cranoraa-eng-cranoraa-knhs-website.vercel.app
TEST_API_URL=https://cranoraa-knhs-website-1.onrender.com
```

⚠️ **Warning:** Never run automated tests in production without permission!

## 🐛 Troubleshooting

### Problem: "ChromeDriver not found"
**Solution:**
```bash
pip install webdriver-manager
```

Then update `automated_blackbox_tests.py`:
```python
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.service import Service

service = Service(ChromeDriverManager().install())
driver = webdriver.Chrome(service=service, options=options)
```

### Problem: "Login failed" for all tests
**Checklist:**
1. ✅ Backend is running (`http://localhost:8000`)
2. ✅ Frontend is running (`http://localhost:5173`)
3. ✅ Test user accounts exist in database
4. ✅ Credentials in `.env` are correct
5. ✅ No CORS errors in browser console

**Verify manually:**
1. Open `http://localhost:5173/login` in browser
2. Try logging in with test credentials
3. Check browser console (F12) for errors

### Problem: Element not found errors
**Cause:** Page structure changed or different from expected

**Solution:** Update XPath selectors in test file:
```python
# Example: If login button changed
login_button = driver.find_element(By.XPATH, "//button[@id='login-btn']")
```

**Find correct selector:**
1. Open browser DevTools (F12)
2. Use Element Inspector
3. Right-click element → Copy → Copy XPath

### Problem: Tests are too slow
**Solutions:**
1. Run in headless mode (no browser window)
2. Increase test data preparation
3. Run API tests instead of UI tests
4. Run tests in parallel:
```bash
pytest automated_blackbox_tests.py -n 4  # 4 parallel workers
# Requires: pip install pytest-xdist
```

### Problem: Port already in use
```
Error: Address already in use: 8000
```
**Solution:**
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Or use different port
python manage.py runserver 8001
# Update TEST_API_URL in .env
```

## 📈 Advanced Usage

### CI/CD Integration

Create `.github/workflows/tests.yml`:
```yaml
name: Automated Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: windows-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    
    - name: Install dependencies
      run: |
        cd tests
        pip install -r requirements.txt
    
    - name: Run tests
      env:
        TEST_ADMIN_EMAIL: ${{ secrets.TEST_ADMIN_EMAIL }}
        TEST_ADMIN_PASSWORD: ${{ secrets.TEST_ADMIN_PASSWORD }}
      run: |
        cd tests
        pytest automated_blackbox_tests.py --html=report.html
    
    - name: Upload report
      uses: actions/upload-artifact@v3
      with:
        name: test-report
        path: tests/report.html
```

### Scheduled Testing

Run tests automatically every day at 2 AM:
```yaml
# .github/workflows/scheduled-tests.yml
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
```

### Database Snapshot/Restore

For test isolation, create database snapshots:

```python
# Add to conftest.py
import pytest

@pytest.fixture(scope="session", autouse=True)
def db_snapshot():
    # Backup database before tests
    os.system("python manage.py dumpdata > test_backup.json")
    
    yield
    
    # Restore after tests
    os.system("python manage.py flush --noinput")
    os.system("python manage.py loaddata test_backup.json")
```

## 📝 Adding New Test Cases

### Example: Add Attendance Marking Test

```python
# In automated_blackbox_tests.py

class TestAttendance:
    """Test Cases: TCH-001, PAR-002"""
    
    def test_TCH_001_mark_attendance(self, driver):
        """TCH-001: Daily attendance marking"""
        result = TestResult()
        result.test_id = "TCH-001"
        
        try:
            # Login as teacher
            login(driver, "teacher")
            
            # Navigate to My Classes
            driver.get(f"{BASE_URL}/my-classes")
            wait = WebDriverWait(driver, WAIT_TIMEOUT)
            
            # Select first class
            first_class = wait.until(EC.element_to_be_clickable(
                (By.XPATH, "//div[@class='class-card'][1]")
            ))
            first_class.click()
            
            # Open Attendance tab
            attendance_tab = driver.find_element(
                By.XPATH, "//button[contains(text(), 'Attendance')]"
            )
            attendance_tab.click()
            time.sleep(1)
            
            # Mark first student as present
            present_btn = driver.find_element(
                By.XPATH, "(//button[contains(text(), 'P')])[1]"
            )
            present_btn.click()
            
            # Save attendance
            save_btn = driver.find_element(
                By.XPATH, "//button[contains(text(), 'Save')]"
            )
            save_btn.click()
            time.sleep(2)
            
            # Verify success message
            success_msg = driver.find_element(
                By.XPATH, "//*[contains(text(), 'saved') or contains(text(), 'Success')]"
            )
            
            result.status = "Passed"
            result.actual_result = f"Attendance marked successfully. Message: {success_msg.text}"
        
        except Exception as e:
            result.status = "Failed"
            result.actual_result = f"Exception: {str(e)}"
            take_screenshot(driver, result.test_id)
        
        assert result.status == "Passed", result.actual_result
```

## 🎓 Best Practices

### 1. Use Test Data Isolation
- Create dedicated test accounts
- Use test-specific data that won't interfere with real data
- Clean up after tests (delete created records)

### 2. Make Tests Independent
```python
# BAD: Test B depends on Test A
def test_A_create_user(driver):
    # Creates user
    pass

def test_B_edit_user(driver):
    # Assumes user from test_A exists
    pass

# GOOD: Each test is independent
def test_A_create_user(driver):
    # Creates and cleans up
    pass

def test_B_edit_user(driver):
    # Creates own test user
    # Edits user
    # Cleans up
    pass
```

### 3. Use Meaningful Assertions
```python
# BAD
assert len(data) > 0

# GOOD
assert len(data) > 0, f"Expected at least 1 user, found {len(data)}"
```

### 4. Add Waits Appropriately
```python
# Explicit waits (GOOD)
wait = WebDriverWait(driver, 10)
element = wait.until(EC.presence_of_element_located((By.ID, "myElement")))

# Implicit waits (OK)
driver.implicitly_wait(10)

# Sleep (BAD - only use as last resort)
time.sleep(5)
```

## 📞 Support & Resources

### Documentation
- Selenium: https://selenium-python.readthedocs.io/
- Pytest: https://docs.pytest.org/
- Requests: https://requests.readthedocs.io/

### Getting Help
1. Check `test_report.html` for detailed error messages
2. Review screenshots in `test_screenshots/` folder
3. Check console output for stack traces
4. Search error messages online

### Common Issues & Solutions
- **Stale Element Reference**: Element changed after finding it - refind the element
- **Timeout**: Increase WAIT_TIMEOUT or fix slow-loading pages
- **No Such Element**: XPath selector wrong - inspect element and update
- **Chrome Version Mismatch**: Update Chrome or use webdriver-manager

## 🚦 Test Status Interpretation

### All Tests Pass ✅
- System is functioning correctly for tested scenarios
- Safe to proceed with deployment
- Document test results

### Some Tests Fail ❌
1. Review failed test reports
2. Check screenshots
3. Reproduce manually
4. Fix bugs if found
5. Update tests if requirements changed

### Tests are Flaky (Sometimes Pass/Fail) ⚠️
- Add more explicit waits
- Check for race conditions
- Ensure test data consistency
- Review network/timing issues

## 🎯 Next Steps

1. **Run tests now** to establish baseline
2. **Add more test cases** for remaining features
3. **Integrate with CI/CD** for automatic testing
4. **Schedule regular runs** (daily/weekly)
5. **Review and update** tests as features evolve

## 📊 Generating Final Test Report

After running all tests:

```bash
# Run all tests and generate comprehensive report
pytest automated_blackbox_tests.py api_tests.py -v --html=comprehensive_report.html --self-contained-html

# Open the report
start comprehensive_report.html
```

Use this report for your **Chapter 4: Black-Box Testing** documentation!

---

**Happy Testing! 🧪**
