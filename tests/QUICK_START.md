# 🚀 Quick Start - Automated Testing

## Get Running in 5 Minutes!

### 1️⃣ Install Python
- Download from https://www.python.org/downloads/
- Install Python 3.8 or higher
- ✅ Check: Open terminal and run `python --version`

### 2️⃣ Install Dependencies
```bash
cd tests
pip install -r requirements.txt
```

### 3️⃣ Setup Configuration
```bash
# Copy example config
copy .env.example .env

# Edit with your test credentials
notepad .env
```

**Update these:**
```env
TEST_ADMIN_EMAIL=admin@knhs.edu.ph
TEST_ADMIN_PASSWORD=YourPassword

TEST_TEACHER_EMAIL=teacher@knhs.edu.ph  
TEST_TEACHER_PASSWORD=YourPassword

TEST_STUDENT_EMAIL=student@knhs.edu.ph
TEST_STUDENT_PASSWORD=YourPassword
```

### 4️⃣ Start Your App

**Terminal 1:**
```bash
cd backend
python manage.py runserver
```

**Terminal 2:**
```bash
cd frontend
npm run dev
```

### 5️⃣ Run Tests!

**Windows PowerShell:**
```powershell
.\run_tests.ps1
```

**Or directly:**
```bash
pytest automated_blackbox_tests.py -v --html=test_report.html
```

### 6️⃣ View Results
Open `test_report.html` in your browser!

---

## What Gets Tested?

✅ **Authentication**
- Valid login (Admin, Teacher, Student, Parent)
- Invalid credentials rejection
- SQL injection prevention
- Session management

✅ **API Endpoints**
- User management
- Classrooms
- Grades
- Enrollment

⚠️ **Partial** (needs test data)
- Enrollment workflow
- Grade entry
- School forms generation

---

## Need Help?

See `AUTOMATED_TESTING_GUIDE.md` for complete documentation!

Common issues:
- **ChromeDriver error**: Run `pip install webdriver-manager`
- **Login failed**: Check credentials in `.env`
- **Slow tests**: Edit script to enable headless mode
