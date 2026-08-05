# Load Testing Quick Start Guide

Get started with load testing your KNHS School Portal in 5 minutes.

## Step 1: Install k6

### Windows (PowerShell as Administrator)
```powershell
# Using Chocolatey
choco install k6

# OR using Winget
winget install k6 --source winget
```

### macOS
```bash
brew install k6
```

### Linux
```bash
# Ubuntu/Debian
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

Verify installation:
```bash
k6 version
```

## Step 2: Setup Test Data

Navigate to the load-tests directory and run the setup script:

```bash
cd load-tests
python setup-test-data.py
```

This creates three test users:
- **Username**: `test_student`, `test_teacher`, `test_admin`
- **Password**: `TestPassword123!`

## Step 3: Start Your Backend

Make sure your Django backend is running:

```bash
cd backend
python manage.py runserver
```

For production-like testing, use gunicorn:
```bash
gunicorn school_portal.wsgi:application --bind 0.0.0.0:8000 --workers 4
```

## Step 4: Run Your First Test

### Quick Smoke Test (1 minute)
```powershell
# Windows
.\run-tests.ps1 smoke

# Linux/macOS
./run-tests.sh smoke
```

### Full Load Test (recommended)
```powershell
# Windows
.\run-tests.ps1 load

# Linux/macOS
./run-tests.sh load
```

This will:
- Ramp up to 100 concurrent users over 24 minutes
- Test all major user journeys (student, teacher, admin)
- Generate an HTML report

## Step 5: View Results

After the test completes, you'll see:

```
✓ health check status is 200
✓ login status is 200
✓ student profile status is 200

checks.........................: 95.23% ✓ 1234      ✗ 62
http_req_duration..............: avg=245ms  p(95)=850ms
http_req_failed................: 2.45%
iterations.....................: 456    1.5/s
```

Open the generated HTML report:
- **File**: `load-test-summary.html`
- **Location**: `load-tests/` directory

## Understanding Your Results

### Good Performance ✓
- Most requests < 1 second
- Error rate < 2%
- p95 response time < 2 seconds

### Needs Improvement ⚠
- Many requests > 2 seconds
- Error rate > 5%
- p95 response time > 3 seconds

### Critical Issues ✗
- Frequent timeouts
- Error rate > 10%
- System unresponsive

## Common Test Scenarios

```powershell
# Windows PowerShell

# Smoke test (quick validation)
.\run-tests.ps1 smoke

# Load test (normal capacity)
.\run-tests.ps1 load

# Stress test (find breaking point)
.\run-tests.ps1 stress

# Spike test (sudden traffic surge)
.\run-tests.ps1 spike

# Endpoint test (identify bottlenecks)
.\run-tests.ps1 endpoints

# Run all tests
.\run-tests.ps1 all
```

```bash
# Linux/macOS

# Smoke test (quick validation)
./run-tests.sh smoke

# Load test (normal capacity)
./run-tests.sh load

# Stress test (find breaking point)
./run-tests.sh stress

# Spike test (sudden traffic surge)
./run-tests.sh spike

# Endpoint test (identify bottlenecks)
./run-tests.sh endpoints

# Run all tests
./run-tests.sh all
```

## Troubleshooting

### "k6 is not installed"
- Follow Step 1 to install k6
- Make sure k6 is in your PATH

### "Backend is not responding"
- Ensure Django is running: `python manage.py runserver`
- Check the URL is correct: `http://localhost:8000`
- Test manually: `curl http://localhost:8000/api/health/`

### "Login failed" errors
- Run the setup script: `python setup-test-data.py`
- Verify test users exist in your database
- Check Django logs for authentication errors

### High error rates during testing
- Check Django logs: `backend/logs/`
- Review database connection limits
- Monitor CPU/memory usage
- Check rate limiting settings

## Next Steps

1. **Read the full guide**: See `README.md` for detailed information
2. **Optimize performance**: Based on test results, identify bottlenecks
3. **Set up CI/CD**: Integrate tests into your deployment pipeline
4. **Monitor production**: Use similar metrics in production monitoring

## Quick Reference

| Scenario | Duration | Max Users | Purpose |
|----------|----------|-----------|---------|
| smoke | 1 min | 1 | Quick validation |
| load | 24 min | 100 | Normal capacity |
| stress | 28 min | 300 | Find limits |
| spike | 8 min | 200 | Traffic surge |
| soak | 30 min | 50 | Stability test |

## Support

For detailed documentation:
- Load testing: `load-tests/README.md`
- Admin manual: `ADMIN_MANUAL.md`
- k6 docs: https://k6.io/docs/

## Clean Up

To remove test data after testing:
```bash
python setup-test-data.py --cleanup
```
