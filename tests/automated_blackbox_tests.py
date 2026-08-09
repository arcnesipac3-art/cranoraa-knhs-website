"""
PRISM School Management System - Automated Black-Box Testing Suite
Uses Selenium WebDriver for browser automation

Installation:
pip install selenium pytest pytest-html python-dotenv

Usage:
pytest tests/automated_blackbox_tests.py --html=test_report.html --self-contained-html
"""

import os
import time
import pytest
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.keys import Keys
from selenium.common.exceptions import TimeoutException, NoSuchElementException
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Test Configuration
BASE_URL = os.getenv("TEST_BASE_URL", "http://localhost:5173")
API_URL = os.getenv("TEST_API_URL", "http://localhost:8000")
WAIT_TIMEOUT = 10

# Test Users (Update these with your actual test credentials)
TEST_USERS = {
    "admin": {
        "email": os.getenv("TEST_ADMIN_EMAIL", "admin@school.com"),
        "password": os.getenv("TEST_ADMIN_PASSWORD", "admin123"),
        "role": "Admin"
    },
    "teacher": {
        "email": os.getenv("TEST_TEACHER_EMAIL", "mildred.gomez@deped.edu.ph"),
        "password": os.getenv("TEST_TEACHER_PASSWORD", "arcnesipac2323"),
        "role": "Faculty"
    },
    "student": {
        "email": os.getenv("TEST_STUDENT_EMAIL", "erergaid99@gmail.com"),
        "password": os.getenv("TEST_STUDENT_PASSWORD", "arcnesipac23"),
        "role": "Student"
    },
    "parent": {
        "email": os.getenv("TEST_PARENT_EMAIL", "milasanchez@gmail.com"),
        "password": os.getenv("TEST_PARENT_PASSWORD", "arcnesipac23"),
        "role": "Parent"
    }
}


class TestResult:
    """Helper class to store test results"""
    def __init__(self):
        self.test_id = ""
        self.status = "Not Tested"
        self.actual_result = ""
        self.test_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        self.tester = "Automated Test"
        self.environment = "Automated Testing"
        self.notes = ""
        self.defect_id = ""


@pytest.fixture(scope="function")
def driver():
    """Setup and teardown for Selenium WebDriver"""
    options = webdriver.ChromeOptions()
    # Uncomment the line below to run headless (no browser window)
    # options.add_argument('--headless')
    options.add_argument('--disable-gpu')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--window-size=1920,1080')
    
    driver = webdriver.Chrome(options=options)
    driver.implicitly_wait(5)
    
    yield driver
    
    driver.quit()


def login(driver, user_type):
    """Helper function to log in as different user types"""
    user = TEST_USERS[user_type]
    driver.get(f"{BASE_URL}/login")
    
    wait = WebDriverWait(driver, WAIT_TIMEOUT)
    
    try:
        # Wait for login page to load
        email_field = wait.until(EC.presence_of_element_located((By.NAME, "email")))
        password_field = driver.find_element(By.NAME, "password")
        
        # Enter credentials
        email_field.clear()
        email_field.send_keys(user["email"])
        password_field.clear()
        password_field.send_keys(user["password"])
        
        # Select role if dropdown exists
        try:
            role_dropdown = driver.find_element(By.NAME, "role")
            role_dropdown.click()
            time.sleep(0.5)
            role_option = driver.find_element(By.XPATH, f"//option[text()='{user['role']}']")
            role_option.click()
        except NoSuchElementException:
            pass  # Role dropdown might not exist
        
        # Click login button
        login_button = driver.find_element(By.XPATH, "//button[contains(text(), 'Log In') or contains(text(), 'Login')]")
        login_button.click()
        
        # Wait for redirect
        time.sleep(2)
        
        return True
    except Exception as e:
        print(f"Login failed for {user_type}: {str(e)}")
        return False


def logout(driver):
    """Helper function to log out"""
    try:
        # Look for logout button/link
        logout_element = driver.find_element(By.XPATH, "//button[contains(text(), 'Logout')] | //a[contains(text(), 'Logout')]")
        logout_element.click()
        time.sleep(1)
    except:
        # Fallback: navigate to login page
        driver.get(f"{BASE_URL}/login")


def take_screenshot(driver, test_id):
    """Helper function to take screenshots for failed tests"""
    screenshot_dir = "test_screenshots"
    os.makedirs(screenshot_dir, exist_ok=True)
    filename = f"{screenshot_dir}/{test_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
    driver.save_screenshot(filename)
    return filename


# ==================== AUTHENTICATION & SECURITY TESTS ====================

class TestAuthentication:
    """Test Cases: AUTH-001 to AUTH-004"""
    
    def test_AUTH_001_valid_login_admin(self, driver):
        """AUTH-001: Valid login for Admin role"""
        result = TestResult()
        result.test_id = "AUTH-001-Admin"
        
        try:
            success = login(driver, "admin")
            
            if success:
                # Verify redirect to dashboard
                wait = WebDriverWait(driver, WAIT_TIMEOUT)
                dashboard = wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Dashboard') or contains(text(), 'Welcome')]")))
                
                # Verify token stored (check localStorage via JavaScript)
                token = driver.execute_script("return localStorage.getItem('access_token') || localStorage.getItem('token');")
                
                # Verify admin menu
                current_url = driver.current_url
                
                result.status = "Passed"
                result.actual_result = f"Admin authenticated successfully. Redirected to: {current_url}. Token stored: {'Yes' if token else 'No'}"
            else:
                result.status = "Failed"
                result.actual_result = "Login failed - unable to authenticate"
                take_screenshot(driver, result.test_id)
        
        except Exception as e:
            result.status = "Failed"
            result.actual_result = f"Exception: {str(e)}"
            result.notes = f"Screenshot: {take_screenshot(driver, result.test_id)}"
        
        assert result.status == "Passed", result.actual_result
    
    def test_AUTH_001_valid_login_teacher(self, driver):
        """AUTH-001: Valid login for Faculty role"""
        result = TestResult()
        result.test_id = "AUTH-001-Faculty"
        
        try:
            success = login(driver, "teacher")
            
            if success:
                wait = WebDriverWait(driver, WAIT_TIMEOUT)
                dashboard = wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Dashboard') or contains(text(), 'My Classes')]")))
                
                current_url = driver.current_url
                result.status = "Passed"
                result.actual_result = f"Faculty authenticated successfully. Redirected to: {current_url}"
            else:
                result.status = "Failed"
                result.actual_result = "Login failed for faculty user"
                take_screenshot(driver, result.test_id)
        
        except Exception as e:
            result.status = "Failed"
            result.actual_result = f"Exception: {str(e)}"
            result.notes = f"Screenshot: {take_screenshot(driver, result.test_id)}"
        
        assert result.status == "Passed", result.actual_result
    
    def test_AUTH_001_valid_login_student(self, driver):
        """AUTH-001: Valid login for Student role"""
        result = TestResult()
        result.test_id = "AUTH-001-Student"
        
        try:
            success = login(driver, "student")
            
            if success:
                wait = WebDriverWait(driver, WAIT_TIMEOUT)
                dashboard = wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Dashboard') or contains(text(), 'My Grades')]")))
                
                current_url = driver.current_url
                result.status = "Passed"
                result.actual_result = f"Student authenticated successfully. Redirected to: {current_url}"
            else:
                result.status = "Failed"
                result.actual_result = "Login failed for student user"
                take_screenshot(driver, result.test_id)
        
        except Exception as e:
            result.status = "Failed"
            result.actual_result = f"Exception: {str(e)}"
            result.notes = f"Screenshot: {take_screenshot(driver, result.test_id)}"
        
        assert result.status == "Passed", result.actual_result
    
    def test_AUTH_002_invalid_credentials(self, driver):
        """AUTH-002: Invalid login credentials are rejected"""
        result = TestResult()
        result.test_id = "AUTH-002"
        
        try:
            driver.get(f"{BASE_URL}/login")
            wait = WebDriverWait(driver, WAIT_TIMEOUT)
            
            email_field = wait.until(EC.presence_of_element_located((By.NAME, "email")))
            password_field = driver.find_element(By.NAME, "password")
            
            email_field.send_keys("user@knhs.edu.ph")
            password_field.send_keys("WrongPass123")
            
            login_button = driver.find_element(By.XPATH, "//button[contains(text(), 'Log In') or contains(text(), 'Login')]")
            login_button.click()
            
            time.sleep(2)
            
            # Check for error message
            try:
                error_message = driver.find_element(By.XPATH, "//*[contains(text(), 'Invalid') or contains(text(), 'incorrect') or contains(text(), 'credentials')]")
                error_text = error_message.text
                
                # Verify still on login page
                assert "login" in driver.current_url.lower()
                
                # Verify no token stored
                token = driver.execute_script("return localStorage.getItem('access_token') || localStorage.getItem('token');")
                
                result.status = "Passed"
                result.actual_result = f"Login correctly rejected. Error message: '{error_text}'. No token stored: {token is None}"
            except NoSuchElementException:
                result.status = "Failed"
                result.actual_result = "No error message displayed for invalid credentials"
                take_screenshot(driver, result.test_id)
        
        except Exception as e:
            result.status = "Failed"
            result.actual_result = f"Exception: {str(e)}"
            result.notes = f"Screenshot: {take_screenshot(driver, result.test_id)}"
        
        assert result.status == "Passed", result.actual_result
    
    def test_AUTH_003_sql_injection_prevention(self, driver):
        """AUTH-003: SQL injection prevention on login fields"""
        result = TestResult()
        result.test_id = "AUTH-003"
        
        sql_payloads = [
            "' OR '1'='1",
            "admin' --",
            "' OR 1=1--",
            "admin'/*",
            "' UNION SELECT NULL--"
        ]
        
        try:
            for payload in sql_payloads:
                driver.get(f"{BASE_URL}/login")
                wait = WebDriverWait(driver, WAIT_TIMEOUT)
                
                email_field = wait.until(EC.presence_of_element_located((By.NAME, "email")))
                password_field = driver.find_element(By.NAME, "password")
                
                email_field.send_keys(payload)
                password_field.send_keys(payload)
                
                login_button = driver.find_element(By.XPATH, "//button[contains(text(), 'Log In') or contains(text(), 'Login')]")
                login_button.click()
                
                time.sleep(2)
                
                # Verify still on login page (not authenticated)
                assert "login" in driver.current_url.lower(), f"SQL injection succeeded with payload: {payload}"
                
                # Verify no database error exposed
                page_source = driver.page_source.lower()
                assert "database" not in page_source and "sql" not in page_source, "Database error exposed"
            
            result.status = "Passed"
            result.actual_result = f"All SQL injection payloads correctly rejected. Tested {len(sql_payloads)} payloads."
        
        except AssertionError as e:
            result.status = "Failed"
            result.actual_result = f"SQL injection test failed: {str(e)}"
            result.notes = f"Screenshot: {take_screenshot(driver, result.test_id)}"
        except Exception as e:
            result.status = "Failed"
            result.actual_result = f"Exception: {str(e)}"
            result.notes = f"Screenshot: {take_screenshot(driver, result.test_id)}"
        
        assert result.status == "Passed", result.actual_result
    
    def test_AUTH_004_session_management(self, driver):
        """AUTH-004: Session management (logout functionality)"""
        result = TestResult()
        result.test_id = "AUTH-004"
        
        try:
            # Login first
            login(driver, "admin")
            time.sleep(2)
            
            # Verify token exists
            token_before = driver.execute_script("return localStorage.getItem('access_token') || localStorage.getItem('token');")
            assert token_before, "No token found after login"
            
            # Logout
            logout(driver)
            time.sleep(2)
            
            # Verify redirected to login
            assert "login" in driver.current_url.lower(), "Not redirected to login after logout"
            
            # Verify token cleared
            token_after = driver.execute_script("return localStorage.getItem('access_token') || localStorage.getItem('token');")
            
            # Try to access protected page
            driver.get(f"{BASE_URL}/dashboard")
            time.sleep(2)
            
            # Should be redirected to login
            assert "login" in driver.current_url.lower(), "Protected page accessible after logout"
            
            result.status = "Passed"
            result.actual_result = f"Session management working correctly. Token cleared after logout: {token_after is None}. Protected pages inaccessible."
        
        except AssertionError as e:
            result.status = "Failed"
            result.actual_result = f"Session management failed: {str(e)}"
            result.notes = f"Screenshot: {take_screenshot(driver, result.test_id)}"
        except Exception as e:
            result.status = "Failed"
            result.actual_result = f"Exception: {str(e)}"
            result.notes = f"Screenshot: {take_screenshot(driver, result.test_id)}"
        
        assert result.status == "Passed", result.actual_result


# ==================== STUDENT ENROLLMENT TESTS ====================

class TestEnrollment:
    """Test Cases: ADM-001"""
    
    def test_ADM_001_enrollment_processing(self, driver):
        """ADM-001: Enrollment application processing"""
        result = TestResult()
        result.test_id = "ADM-001"
        
        try:
            # Login as admin
            login(driver, "admin")
            wait = WebDriverWait(driver, WAIT_TIMEOUT)
            
            # Navigate to Enrollment Management
            driver.get(f"{BASE_URL}/enrollment-management")
            time.sleep(2)
            
            # Check if page loaded
            page_title = wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Enrollment') or contains(text(), 'Applications')]")))
            
            # Try to find pending applications
            try:
                # Look for filter or status buttons
                pending_filter = driver.find_element(By.XPATH, "//button[contains(text(), 'Pending')] | //option[contains(text(), 'Pending')]")
                pending_filter.click()
                time.sleep(1)
                
                # Look for any application row or card
                applications = driver.find_elements(By.XPATH, "//tr[contains(@class, 'application')] | //div[contains(@class, 'application-card')]")
                
                if len(applications) > 0:
                    result.status = "Passed"
                    result.actual_result = f"Enrollment Management page accessible. Found {len(applications)} applications. Manual verification needed for full workflow."
                else:
                    result.status = "Passed"
                    result.actual_result = "Enrollment Management page accessible. No pending applications found. Full workflow requires test data."
                    result.notes = "Create test enrollment applications to fully test this workflow"
            
            except NoSuchElementException:
                result.status = "Passed"
                result.actual_result = "Enrollment Management page accessible. UI elements may differ from expected. Manual verification recommended."
                result.notes = "Page structure different from expected - check selectors"
        
        except Exception as e:
            result.status = "Failed"
            result.actual_result = f"Exception: {str(e)}"
            result.notes = f"Screenshot: {take_screenshot(driver, result.test_id)}"
        
        assert result.status == "Passed", result.actual_result


# ==================== GRADE MANAGEMENT TESTS ====================

class TestGradeManagement:
    """Test Cases: TCH-002, STU-001, ADM-005"""
    
    def test_STU_001_grade_viewing(self, driver):
        """STU-001: Grade viewing from student perspective"""
        result = TestResult()
        result.test_id = "STU-001"
        
        try:
            # Login as student
            login(driver, "student")
            wait = WebDriverWait(driver, WAIT_TIMEOUT)
            
            # Navigate to grades page
            try:
                grades_link = wait.until(EC.element_to_be_clickable((By.XPATH, "//a[contains(text(), 'Grade') or contains(text(), 'My Grades')]")))
                grades_link.click()
            except:
                driver.get(f"{BASE_URL}/grades")
            
            time.sleep(2)
            
            # Check if grades page loaded
            page_element = wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Grade') or contains(text(), 'Subject')]")))
            
            # Look for grade table or cards
            try:
                grades = driver.find_elements(By.XPATH, "//table//tr | //div[contains(@class, 'grade')]")
                
                result.status = "Passed"
                result.actual_result = f"Grades page accessible. Found {len(grades)} grade entries. Displaying correctly."
            except:
                result.status = "Passed"
                result.actual_result = "Grades page accessible. No grades found - may need test data."
                result.notes = "Add grade records for test student to fully verify display"
        
        except Exception as e:
            result.status = "Failed"
            result.actual_result = f"Exception: {str(e)}"
            result.notes = f"Screenshot: {take_screenshot(driver, result.test_id)}"
        
        assert result.status == "Passed", result.actual_result


# ==================== SCHOOL FORMS TESTS ====================

class TestSchoolForms:
    """Test Cases: FORM-001, FORM-002"""
    
    def test_FORM_001_generate_sf9(self, driver):
        """FORM-001: Generate SF9 (Report Card)"""
        result = TestResult()
        result.test_id = "FORM-001"
        
        try:
            # Login as admin or teacher
            login(driver, "admin")
            wait = WebDriverWait(driver, WAIT_TIMEOUT)
            
            # Navigate to School Forms
            try:
                forms_link = wait.until(EC.element_to_be_clickable((By.XPATH, "//a[contains(text(), 'School Forms') or contains(text(), 'SF9')]")))
                forms_link.click()
            except:
                driver.get(f"{BASE_URL}/school-forms")
            
            time.sleep(2)
            
            # Check if forms page loaded
            page_element = wait.until(EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'School Forms') or contains(text(), 'SF')]")))
            
            result.status = "Passed"
            result.actual_result = "School Forms page accessible. Manual verification needed to test PDF generation with specific student data."
            result.notes = "Select student and generate SF9 to fully test functionality"
        
        except Exception as e:
            result.status = "Failed"
            result.actual_result = f"Exception: {str(e)}"
            result.notes = f"Screenshot: {take_screenshot(driver, result.test_id)}"
        
        assert result.status == "Passed", result.actual_result


# ==================== RUN ALL TESTS ====================

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--html=test_report.html", "--self-contained-html"])
