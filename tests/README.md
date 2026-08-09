# PRISM Automated Black-Box Testing Suite

Automated functional testing for the PRISM School Information Management System using Selenium WebDriver and Pytest.

## 📋 Prerequisites

1. **Python 3.8 or higher** installed on your system
2. **Google Chrome** browser installed
3. **ChromeDriver** (will be auto-installed by webdriver-manager)

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Navigate to the tests directory
cd tests

# Install Python packages
pip install -r requirements.txt
```

### 2. Configure Test Environment

Copy `.env.example` to `.env` and update with your test credentials:

```bash
copy .env.example .env
```

Edit `.env` file:
```env
TEST_BASE_URL=http://localhost:5173
TEST_API_URL=http://localhost:8000

# Update these with actual test account credentials
TEST_ADMIN_EMAIL=admin@knhs.edu.ph
TEST_ADMIN_PASSWORD=YourAdminPassword

TEST_TEACHER_EMAIL=teacher@knhs.edu.ph
TEST_TEACHER_PASSWORD=YourTeacherPassword

TEST_STUDENT_EMAIL=student@knhs.edu.ph
TEST_STUDENT_PASSWORD=YourStudentPassword

TEST_PARENT_EMAIL=parent@email.com
TEST_PARENT_PASSWORD=YourParentPassword
```

### 3. Ensure Application is Running

**Backend:**
```bash
cd backend
python manage.py runserver
```

**Frontend:**
```bash
cd frontend
npm run dev
```

### 4. Run Tests

**Run all tests:**
```bash
pytest automated_blackbox_tests.py -v --html=test_report.html --self-contained-html
```

**Run specific test class:**
```bash
# Authentication tests only
pytest automated_blackbox_tests.py::TestAuthentication -v

# Enrollment tests only
pytest automated_blackbox_tests.py::TestEnrollment -v

# Grade management tests only
pytest automated_blackbox_tests.py::TestGradeManagement -v
```

**Run specific test case:**
```bash
pytest automated_blackbox_tests.py::TestAuthentication::test_AUTH_001_valid_login_admin -v
```

**Run tests in headless mode (no browser window):**
Edit `automated_blackbox_tests.py` and uncomment line 77:
```python
options.add_argument('--headless')
```

## 📊 Test Reports

After running tests, you'll get:

1. **HTML Report**: `test_report.html` - Open in browser for detailed results
2. **Screenshots**: `test_screenshots/` folder - Screenshots of failed tests
3. **Console Output**: Real-time test execution status

## 🧪 Test Coverage

### Priority 1: Critical (P1)

**Authentication & Security (AUTH-001 to AUTH-004)**
- ✅ AUTH-001: Valid login for all roles (Admin/Faculty/Student/Parent)
- ✅ AUTH-002: Invalid credentials rejection
- ✅ AUTH-003: SQL injection prevention
- ✅ AUTH-004: Session management (logout)

**Student Enrollment (ADM-001)**
- ⚠️ ADM-001: Enrollment processing (partial - requires test data)

**Grade Management (STU-001)**
- ⚠️ STU-001: Grade viewing (partial - requires test data)

**School Forms (FORM-001)**
- ⚠️ FORM-001: SF9 generation (partial - requires test data)

### Priority 2: High (P2)
- Future implementation

### Priority 3: Medium (P3)
- Future implementation

**Legend:**
- ✅ Fully automated
- ⚠️ Partial automation (requires test data setup)
- ❌ Not yet implemented

## 🔧 Troubleshooting

### Issue: ChromeDriver not found
**Solution:** Install webdriver-manager which auto-downloads ChromeDriver:
```bash
pip install webdriver-manager
```

Then modify the driver fixture in `automated_blackbox_tests.py`:
```python
from webdriver_manager.chrome import ChromeDriverManager
driver = webdriver.Chrome(ChromeDriverManager().install(), options=options)
```

### Issue: Tests timing out
**Solution:** Increase `WAIT_TIMEOUT` in `automated_blackbox_tests.py`:
```python
WAIT_TIMEOUT = 20  # Increase from 10 to 20 seconds
```

### Issue: Element not found errors
**Solution:** Check if your page structure matches the expected selectors. Update XPath selectors in the test file to match your actual HTML.

### Issue: Tests failing with "Login failed"
**Solution:** 
1. Verify test user accounts exist in your database
2. Check credentials in `.env` file
3. Ensure backend API is running
4. Check console for any CORS or authentication errors

## 📝 Adding More Test Cases

To add a new test case:

1. **Create a new test method** in the appropriate class:
```python
def test_NEW_TESTCASE_ID(self, driver):
    """NEW-ID: Test case description"""
    result = TestResult()
    result.test_id = "NEW-ID"
    
    try:
        # Your test logic here
        login(driver, "admin")
        # ... test steps ...
        
        result.status = "Passed"
        result.actual_result = "Test passed successfully"
    except Exception as e:
        result.status = "Failed"
        result.actual_result = f"Exception: {str(e)}"
        take_screenshot(driver, result.test_id)
    
    assert result.status == "Passed", result.actual_result
```

2. **Run the new test:**
```bash
pytest automated_blackbox_tests.py::ClassName::test_NEW_TESTCASE_ID -v
```

## 🎯 Best Practices

1. **Always run tests in a test environment** - Never run automated tests in production
2. **Keep test data isolated** - Use dedicated test accounts
3. **Review screenshots** for failed tests to understand what went wrong
4. **Update selectors** if UI changes
5. **Run tests frequently** - Integrate with CI/CD pipeline

## 📞 Support

For issues or questions about the automated tests:
1. Check the HTML test report for detailed error messages
2. Review screenshots in `test_screenshots/` folder
3. Check console output for stack traces
4. Verify application is running and accessible

## 🔄 CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/automated-tests.yml`:

```yaml
name: Automated Black-Box Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest
    
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
        TEST_BASE_URL: ${{ secrets.TEST_BASE_URL }}
        TEST_ADMIN_EMAIL: ${{ secrets.TEST_ADMIN_EMAIL }}
        TEST_ADMIN_PASSWORD: ${{ secrets.TEST_ADMIN_PASSWORD }}
      run: |
        cd tests
        pytest automated_blackbox_tests.py -v --html=test_report.html
    
    - name: Upload test report
      if: always()
      uses: actions/upload-artifact@v3
      with:
        name: test-report
        path: tests/test_report.html
```

## 📈 Future Enhancements

- [ ] Add API testing with requests library
- [ ] Implement parallel test execution
- [ ] Add performance benchmarking
- [ ] Integrate with test management tools
- [ ] Add visual regression testing
- [ ] Implement database snapshot/restore for test isolation
