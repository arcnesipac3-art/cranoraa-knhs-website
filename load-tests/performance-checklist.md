# Performance Testing Checklist

Use this checklist before and after running load tests to ensure accurate results.

## Pre-Test Checklist

### Environment Setup
- [ ] Backend is running on appropriate hardware
- [ ] Database is properly configured and optimized
- [ ] Redis cache is running (if using)
- [ ] Test users are created in database
- [ ] No other heavy processes running on test machine

### Configuration
- [ ] DEBUG mode is set to False for production-like testing
- [ ] Rate limiting is configured appropriately
- [ ] Database connection pool is properly sized
- [ ] Static files are collected and served efficiently
- [ ] CORS and CSRF settings are configured

### Test Data
- [ ] Test users exist: test_student, test_teacher, test_admin
- [ ] Sample classrooms and subjects are created
- [ ] Database has representative data volume
- [ ] No production data in test database

### Monitoring Setup
- [ ] Resource monitoring tools ready (htop, Task Manager, etc.)
- [ ] Database query logging enabled (if needed)
- [ ] Django logging configured
- [ ] Network monitoring available

## During Test Checklist

### Observe
- [ ] Monitor CPU usage on backend server
- [ ] Monitor memory usage
- [ ] Watch database connections
- [ ] Check network bandwidth
- [ ] Observe response times in k6 output
- [ ] Watch for error spikes

### Record
- [ ] Note peak resource usage
- [ ] Document any errors or warnings
- [ ] Screenshot system metrics if needed
- [ ] Save k6 output and HTML report

## Post-Test Checklist

### Results Analysis
- [ ] Review k6 HTML report
- [ ] Check error rates against thresholds
- [ ] Analyze response time percentiles (p50, p95, p99)
- [ ] Identify slowest endpoints
- [ ] Compare results with previous tests

### System Review
- [ ] Check Django error logs
- [ ] Review database slow query logs
- [ ] Examine any timeout errors
- [ ] Check for memory leaks
- [ ] Review connection pool usage

### Documentation
- [ ] Document test results
- [ ] Note system specifications used
- [ ] Record test scenario and configuration
- [ ] List any issues discovered
- [ ] Document recommendations

## Performance Metrics Reference

### Excellent Performance ✓✓✓
- Average response time: < 200ms
- 95th percentile: < 500ms
- Error rate: < 0.5%
- Concurrent users: Meets or exceeds target
- Resource usage: < 70% CPU, < 80% memory

### Good Performance ✓✓
- Average response time: < 500ms
- 95th percentile: < 1000ms
- Error rate: < 2%
- Concurrent users: Approaches target
- Resource usage: < 85% CPU, < 90% memory

### Acceptable Performance ✓
- Average response time: < 1000ms
- 95th percentile: < 2000ms
- Error rate: < 5%
- Concurrent users: Below target but functional
- Resource usage: < 95% CPU, < 95% memory

### Poor Performance ✗
- Average response time: > 1000ms
- 95th percentile: > 2000ms
- Error rate: > 5%
- Frequent timeouts or crashes
- Resource exhaustion

## Common Issues and Solutions

### High Response Times
**Symptoms:**
- p95 > 2000ms
- Average > 1000ms

**Check:**
- [ ] Database query efficiency
- [ ] Missing database indexes
- [ ] N+1 query problems
- [ ] Unoptimized serializers
- [ ] Lack of caching

**Solutions:**
- Add database indexes
- Use select_related() and prefetch_related()
- Implement caching for frequent queries
- Optimize serializers
- Use pagination for large result sets

### High Error Rates
**Symptoms:**
- http_req_failed > 5%
- Many 500/502/503 errors

**Check:**
- [ ] Django error logs
- [ ] Database connection limits
- [ ] Worker/thread exhaustion
- [ ] Memory issues
- [ ] Rate limiting triggers

**Solutions:**
- Increase database connection pool
- Add more workers/threads
- Optimize memory usage
- Adjust rate limits
- Fix application errors

### Database Bottlenecks
**Symptoms:**
- High database CPU
- Connection pool exhausted
- Slow query logs

**Check:**
- [ ] Missing indexes
- [ ] Complex queries
- [ ] Lock contention
- [ ] Connection pool size
- [ ] Query optimization

**Solutions:**
- Add strategic indexes
- Optimize complex queries
- Use read replicas
- Implement connection pooling (PgBouncer)
- Cache frequent queries

### Memory Leaks
**Symptoms:**
- Memory usage grows continuously
- System becomes unresponsive over time
- OOM (Out of Memory) errors

**Check:**
- [ ] Django query result caching
- [ ] File handle leaks
- [ ] WebSocket connection cleanup
- [ ] Large data processing
- [ ] Circular references

**Solutions:**
- Use iterator() for large querysets
- Properly close file handles
- Implement WebSocket cleanup
- Process data in chunks
- Profile memory usage

### Connection Timeouts
**Symptoms:**
- http_req_failed with timeout errors
- Long-running requests

**Check:**
- [ ] Database connection timeout
- [ ] External API calls
- [ ] File upload/download operations
- [ ] Complex computation in views
- [ ] Blocking operations

**Solutions:**
- Increase timeout settings
- Use async processing for long tasks
- Implement task queues (Celery)
- Optimize blocking operations
- Add request timeout limits

## Optimization Priorities

### Priority 1: Critical (Do First)
1. Fix application errors causing 500 responses
2. Add missing database indexes
3. Optimize N+1 queries
4. Configure proper connection pooling
5. Enable caching for static data

### Priority 2: Important
1. Implement pagination for large lists
2. Optimize serializers
3. Add query result caching
4. Optimize file uploads/downloads
5. Configure CDN for static files

### Priority 3: Nice to Have
1. Implement advanced caching strategies
2. Add database read replicas
3. Use async views for I/O operations
4. Implement load balancing
5. Add performance monitoring (APM)

## Capacity Planning

Based on test results, document:

### Current Capacity
- Maximum concurrent users: _______
- At X users: average response time = _____ ms
- At X users: error rate = _____ %
- Resource limits reached at: _______

### Target Capacity
- Expected concurrent users: _______
- Desired response time: < _____ ms
- Acceptable error rate: < _____ %

### Required Improvements
1. _________________________________
2. _________________________________
3. _________________________________

### Infrastructure Recommendations
- CPU cores: _______
- RAM: _______
- Workers: _______
- Database connections: _______
- Caching: _______

## Sign-Off

Test completed by: _______________
Date: _______________
Test scenario: _______________
Results: [ ] Pass  [ ] Fail  [ ] Needs Improvement
Next test date: _______________

Notes:
_________________________________
_________________________________
_________________________________
