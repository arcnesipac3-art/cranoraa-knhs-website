# Load Testing Guide for KNHS School Portal

This directory contains load testing scripts using k6 to measure the concurrent user capacity of the school portal.

## Prerequisites

### Install k6

**Windows:**
```powershell
choco install k6
```
or download from: https://k6.io/docs/getting-started/installation/

**Alternative (using winget):**
```powershell
winget install k6 --source winget
```

**macOS:**
```bash
brew install k6
```

**Linux:**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## Setup

### 1. Create Test Users

Before running load tests, create test users in your database:

```bash
# Navigate to backend directory
cd backend

# Create test student
python manage.py shell
```

```python
from accounts.models import User, Profile
from django.contrib.auth.hashers import make_password

# Create test student
student = User.objects.create(
    username='test_student',
    password=make_password('TestPassword123!'),
    email='test_student@example.com',
    role='student'
)
Profile.objects.create(user=student)

# Create test teacher
teacher = User.objects.create(
    username='test_teacher',
    password=make_password('TestPassword123!'),
    email='test_teacher@example.com',
    role='teacher'
)
Profile.objects.create(user=teacher)

# Create test admin
admin = User.objects.create(
    username='test_admin',
    password=make_password('TestPassword123!'),
    email='test_admin@example.com',
    role='admin',
    is_staff=True
)
Profile.objects.create(user=admin)
```

### 2. Configure Test Environment

Set environment variables for your test environment:

```powershell
# Windows PowerShell
$env:BASE_URL = "http://localhost:8000"
$env:FRONTEND_URL = "http://localhost:5173"
```

```bash
# Linux/macOS
export BASE_URL="http://localhost:8000"
export FRONTEND_URL="http://localhost:5173"
```

Or edit the script directly to change the default values.

### 3. Ensure Backend is Running

Make sure your Django backend is running before executing tests:

```bash
cd backend
python manage.py runserver
```

For production-like testing, use gunicorn:

```bash
gunicorn school_portal.wsgi:application --bind 0.0.0.0:8000 --workers 4
```

## Running Load Tests

### Test Scenarios

The script includes several pre-configured scenarios:

1. **Smoke Test** - Quick validation with 1 user for 1 minute
2. **Load Test** - Gradual ramp-up to 100 concurrent users (default)
3. **Stress Test** - Push system to 300 concurrent users
4. **Spike Test** - Sudden traffic surge to 200 users
5. **Soak Test** - 50 users for 30 minutes (endurance test)

### Running Tests

**Smoke Test (Quick validation):**
```powershell
k6 run --env SCENARIO=smoke load-tests/k6-load-test.js
```

**Load Test (Default - Recommended first test):**
```powershell
k6 run load-tests/k6-load-test.js
# or explicitly:
k6 run --env SCENARIO=load load-tests/k6-load-test.js
```

**Stress Test (Find breaking point):**
```powershell
k6 run --env SCENARIO=stress load-tests/k6-load-test.js
```

**Spike Test (Sudden traffic surge):**
```powershell
k6 run --env SCENARIO=spike load-tests/k6-load-test.js
```

**Soak Test (Long-duration stability):**
```powershell
k6 run --env SCENARIO=soak load-tests/k6-load-test.js
```

**Custom Configuration:**
```powershell
k6 run --env BASE_URL=http://your-server:8000 --env SCENARIO=load load-tests/k6-load-test.js
```

### Running with Cloud (k6 Cloud)

For distributed load testing from multiple regions:

```powershell
k6 cloud load-tests/k6-load-test.js
```

Note: Requires k6 Cloud account and API token.

## Understanding Results

### Key Metrics

- **http_req_duration**: Request response time
  - Target: p95 < 2000ms (95% of requests under 2 seconds)
  
- **http_req_failed**: Failed request rate
  - Target: < 5%
  
- **login_failures**: Authentication failure rate
  - Target: < 10%
  
- **api_errors**: API error rate
  - Target: < 5%
  
- **iterations**: Number of complete user journeys
  - Higher is better

### Example Output

```
     ✓ health check status is 200
     ✓ login status is 200
     ✓ login returns access token
     ✓ student profile status is 200

     checks.........................: 95.23% ✓ 1234      ✗ 62
     data_received..................: 5.2 MB 17 kB/s
     data_sent......................: 2.1 MB 7.0 kB/s
     http_req_duration..............: avg=245ms  min=50ms  med=200ms  max=3s    p(95)=850ms
     http_req_failed................: 2.45%  ✓ 62        ✗ 2472
     iterations.....................: 456    1.5/s
     vus............................: 100    min=0       max=100
     vus_max........................: 100    min=100     max=100
```

### Interpreting Results

**Good Performance:**
- Most requests < 1 second
- Error rate < 2%
- p95 response time < 2 seconds

**Acceptable Performance:**
- Most requests < 2 seconds
- Error rate < 5%
- p95 response time < 3 seconds

**Poor Performance:**
- Many requests > 3 seconds
- Error rate > 5%
- System unresponsive or timing out

### Reports

After each test run, an HTML report is generated:
- **File**: `load-test-summary.html`
- **Location**: Same directory as the script
- Open in browser to view detailed charts and graphs

## User Journey Simulation

The test simulates realistic user behavior:

### Student Journey (50% of traffic)
1. Login
2. View profile
3. Check dashboard stats
4. Browse announcements
5. View assignments
6. Check calendar
7. Check notifications
8. Logout

### Teacher Journey (30% of traffic)
1. Login
2. View profile
3. Check teacher stats
4. View classrooms
5. Record attendance
6. Manage assignments
7. Upload materials
8. Logout

### Admin Journey (10% of traffic)
1. Login
2. View admin statistics
3. Check system metrics
4. Manage users
5. View analytics
6. Logout

### Public Browsing (10% of traffic)
1. Health check
2. View public announcements
3. Check maintenance status

## Troubleshooting

### Common Issues

**Connection Refused:**
- Ensure backend server is running
- Check BASE_URL is correct
- Verify firewall isn't blocking requests

**High Error Rates:**
- Check Django logs for errors
- Verify test users exist in database
- Ensure database can handle connections
- Check rate limiting settings

**Slow Response Times:**
- Monitor CPU/memory usage on server
- Check database query performance
- Review Django Debug Toolbar in dev
- Consider adding caching

**Login Failures:**
- Verify test user credentials
- Check Django Axes isn't locking accounts
- Ensure JWT tokens are being generated

### Database Connection Limits

PostgreSQL default max connections: 100

For load testing, increase in `postgresql.conf`:
```
max_connections = 200
```

Or use connection pooling (PgBouncer).

### Django Settings for Load Testing

Temporarily adjust in `settings.py`:

```python
# Increase rate limits
REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {
    'anon': '600/minute',
    'user': '3000/minute',
}

# Adjust Axes for testing
AXES_FAILURE_LIMIT = 100
AXES_COOLOFF_TIME = timedelta(minutes=60)
```

## Performance Optimization Tips

### Backend Optimizations

1. **Database Indexing**
   ```python
   # Add indexes to frequently queried fields
   class Meta:
       indexes = [
           models.Index(fields=['created_at']),
           models.Index(fields=['user', 'classroom']),
       ]
   ```

2. **Query Optimization**
   - Use `select_related()` for foreign keys
   - Use `prefetch_related()` for reverse relations
   - Implement pagination for large result sets

3. **Caching**
   - Enable Redis caching
   - Cache expensive queries
   - Use template fragment caching

4. **Connection Pooling**
   - Use PgBouncer for PostgreSQL
   - Configure `conn_max_age` in database settings

5. **Async Views**
   - Use Django async views for I/O-bound operations
   - Implement WebSocket with Channels for real-time features

### Infrastructure Recommendations

- **< 50 concurrent users**: 2 CPU cores, 2GB RAM
- **50-100 concurrent users**: 4 CPU cores, 4GB RAM
- **100-200 concurrent users**: 8 CPU cores, 8GB RAM
- **200+ concurrent users**: Scale horizontally with load balancer

## Continuous Performance Testing

### Integration with CI/CD

Add to `.github/workflows/performance-test.yml`:

```yaml
name: Performance Test

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
  workflow_dispatch:

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run k6 smoke test
        uses: grafana/k6-action@v0.3.0
        with:
          filename: load-tests/k6-load-test.js
          flags: --env SCENARIO=smoke
```

## Additional Resources

- [k6 Documentation](https://k6.io/docs/)
- [k6 Examples](https://k6.io/docs/examples/)
- [Performance Testing Best Practices](https://k6.io/docs/testing-guides/automated-performance-testing/)
- [Django Performance Optimization](https://docs.djangoproject.com/en/stable/topics/performance/)

## Support

For issues or questions:
1. Check Django logs: `backend/logs/`
2. Review k6 output for specific error messages
3. Monitor system resources during tests
4. Consult the admin manual: `ADMIN_MANUAL.md`
