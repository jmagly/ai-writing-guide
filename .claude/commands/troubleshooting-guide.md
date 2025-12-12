---
description: Generate troubleshooting documentation
category: documentation-changelogs
argument-hint: 1. **System Overview and Architecture**
---

# Troubleshooting Guide Generator Command

Generate troubleshooting documentation

## Instructions

Follow this systematic approach to create troubleshooting guides: **$ARGUMENTS**

1. **System Overview and Architecture**
   - Document the system architecture and components
   - Map out dependencies and integrations
   - Identify critical paths and failure points
   - Create system topology diagrams
   - Document data flow and communication patterns

2. **Common Issues Identification**
   - Collect historical support tickets and issues
   - Interview team members about frequent problems
   - Analyze error logs and monitoring data
   - Review user feedback and complaints
   - Identify patterns in system failures

3. **Troubleshooting Framework**
   - Establish systematic diagnostic procedures
   - Create problem isolation methodologies
   - Document escalation paths and procedures
   - Set up logging and monitoring checkpoints
   - Define severity levels and response times

4. **Diagnostic Tools and Commands**
   
   ```markdown
   ## Essential Diagnostic Commands
   
   ### System Health
   ```bash
   # Check system resources
   top                    # CPU and memory usage
   df -h                 # Disk space
   free -m               # Memory usage
   netstat -tuln         # Network connections
   
   # Application logs
   tail -f /var/log/app.log
   journalctl -u service-name -f
   
   # Database connectivity
   mysql -u user -p -e "SELECT 1"
   psql -h host -U user -d db -c "SELECT 1"
   ```
   ```

5. **Issue Categories and Solutions**

   **Performance Issues:**
   ```markdown
   ### Slow Response Times
   
   **Symptoms:**
   - API responses > 5 seconds
   - User interface freezing
   - Database timeouts
   
   **Diagnostic Steps:**
   1. Check system resources (CPU, memory, disk)
   2. Review application logs for errors
   3. Analyze database query performance
   4. Check network connectivity and latency
   
   **Common Causes:**
   - Database connection pool exhaustion
   - Inefficient database queries
   - Memory leaks in application
   - Network bandwidth limitations
   
   **Solutions:**
   - Restart application services
   - Optimize database queries
   - Increase connection pool size
   - Scale infrastructure resources
   ```

6. **Error Code Documentation**
   
   ```markdown
   ## Error Code Reference
   
   ### HTTP Status Codes
   - **500 Internal Server Error**
     - Check application logs for stack traces
     - Verify database connectivity
     - Check environment variables
   
   - **404 Not Found**
     - Verify URL routing configuration
     - Check if resources exist
     - Review API endpoint documentation
   
   - **503 Service Unavailable**
     - Check service health status
     - Verify load balancer configuration
     - Check for maintenance mode
   ```

7. **Environment-Specific Issues**
   - Document development environment problems
   - Address staging/testing environment issues
   - Cover production-specific troubleshooting
   - Include local development setup problems

8. **Database Troubleshooting**
   
   ```markdown
   ### Database Connection Issues
   
   **Symptoms:**
   - "Connection refused" errors
   - "Too many connections" errors
   - Slow query performance
   
   **Diagnostic Commands:**
   ```sql
   -- Check active connections
   SHOW PROCESSLIST;
   
   -- Check database size
   SELECT table_schema, 
          ROUND(SUM(data_length + index_length) / 1024 / 1024, 1) AS 'DB Size in MB' 
   FROM information_schema.tables 
   GROUP BY table_schema;
   
   -- Check slow queries
   SHOW VARIABLES LIKE 'slow_query_log';
   ```
   ```

9. **Network and Connectivity Issues**
   
   ```markdown
   ### Network Troubleshooting
   
   **Basic Connectivity:**
   ```bash
   # Test basic connectivity
   ping example.com
   telnet host port
   curl -v https://api.example.com/health
   
   # DNS resolution
   nslookup example.com
   dig example.com
   
   # Network routing
   traceroute example.com
   ```
   
   **SSL/TLS Issues:**
   ```bash
   # Check SSL certificate
   openssl s_client -connect example.com:443
   curl -vI https://example.com
   ```
   ```

10. **Application-Specific Troubleshooting**
    
    **Memory Issues:**
    ```markdown
    ### Out of Memory Errors
    
    **Java Applications:**
    ```bash
    # Check heap usage
    jstat -gc [PID]
    jmap -dump:format=b,file=heapdump.hprof [PID]
    
    # Analyze heap dump
    jhat heapdump.hprof
    ```
    
    **Node.js Applications:**
    ```bash
    # Monitor memory usage
    node --inspect app.js
    # Use Chrome DevTools for memory profiling
    ```
    ```

11. **Security and Authentication Issues**
    
    ```markdown
    ### Authentication Failures
    
    **Symptoms:**
    - 401 Unauthorized responses
    - Token validation errors
    - Session timeout issues
    
    **Diagnostic Steps:**
    1. Verify credentials and tokens
    2. Check token expiration
    3. Validate authentication service
    4. Review CORS configuration
    
    **Common Solutions:**
    - Refresh authentication tokens
    - Clear browser cookies/cache
    - Verify CORS headers
    - Check API key permissions
    ```

12. **Deployment and Configuration Issues**
    
    ```markdown
    ### Deployment Failures
    
    **Container Issues:**
    ```bash
    # Check container status
    docker ps -a
    docker logs container-name
    
    # Check resource limits
    docker stats
    
    # Debug container
    docker exec -it container-name /bin/bash
    ```
    
    **Kubernetes Issues:**
    ```bash
    # Check pod status
    kubectl get pods
    kubectl describe pod pod-name
    kubectl logs pod-name
    
    # Check service connectivity
    kubectl get svc
    kubectl port-forward pod-name 8080:8080
    ```
    ```

13. **Monitoring and Alerting Setup**
    - Configure health checks and monitoring
    - Set up log aggregation and analysis
    - Implement alerting for critical issues
    - Create dashboards for system metrics
    - Document monitoring thresholds

14. **Escalation Procedures**
    
    ```markdown
    ## Escalation Matrix
    
    ### Severity Levels
    
    **Critical (P1):** System down, data loss
    - Immediate response required
    - Escalate to on-call engineer
    - Notify management within 30 minutes
    
    **High (P2):** Major functionality impaired
    - Response within 2 hours
    - Escalate to senior engineer
    - Provide hourly updates
    
    **Medium (P3):** Minor functionality issues
    - Response within 8 hours
    - Assign to appropriate team member
    - Provide daily updates
    ```

15. **Recovery Procedures**
    - Document system recovery steps
    - Create data backup and restore procedures
    - Establish rollback procedures for deployments
    - Document disaster recovery processes
    - Test recovery procedures regularly

16. **Preventive Measures**
    - Implement monitoring and alerting
    - Set up automated health checks
    - Create deployment validation procedures
    - Establish code review processes
    - Document maintenance procedures

17. **Knowledge Base Integration**
    - Link to relevant documentation
    - Reference API documentation
    - Include links to monitoring dashboards
    - Connect to team communication channels
    - Integrate with ticketing systems

18. **Team Communication**
    
    ```markdown
    ## Communication Channels
    
    ### Immediate Response
    - Slack: #incidents channel
    - Phone: On-call rotation
    - Email: alerts@company.com
    
    ### Status Updates
    - Status page: status.company.com
    - Twitter: @company_status
    - Internal wiki: troubleshooting section
    ```

19. **Documentation Maintenance**
    - Regular review and updates
    - Version control for troubleshooting guides
    - Feedback collection from users
    - Integration with incident post-mortems
    - Continuous improvement processes

20. **Self-Service Tools**
    - Create diagnostic scripts and tools
    - Build automated recovery procedures
    - Implement self-healing systems
    - Provide user-friendly diagnostic interfaces
    - Create chatbot integration for common issues

21. **Regression Testing and Validation**

    > **CRITICAL**: When troubleshooting issues, regression testing validates that fixes work and don't break existing functionality.

    **When to Run Regression Tests:**
    ```markdown
    ### Regression Testing Triggers

    **Mandatory Regression Testing:**
    - After any bug fix (prove the fix works)
    - After dependency updates (detect breaking changes)
    - After configuration changes (validate system behavior)
    - After infrastructure changes (verify integrations)
    - Before any production deployment (final validation)

    **Recommended Additional Testing:**
    - After codebase refactoring
    - After performance optimizations
    - After security patches
    - When onboarding brownfield projects
    ```

    **Regression Test Types:**
    ```markdown
    ### Test Suite Categories

    **Smoke Tests (5-10 minutes):**
    - Critical path validation
    - Basic functionality check
    - Use after quick fixes
    ```bash
    npm run test:smoke
    pytest -m smoke
    ```

    **Core Regression (15-30 minutes):**
    - Unit tests for changed components
    - Integration tests for affected services
    - Use for standard bug fixes
    ```bash
    npm run test:affected
    pytest --lf  # last failed
    ```

    **Full Regression (1-2 hours):**
    - Complete unit test suite
    - All integration tests
    - E2E critical paths
    - Use before deployments
    ```bash
    npm run test:all
    pytest --cov
    ```

    **Extended Validation (4-8 hours):**
    - Performance baseline comparison
    - Security scans
    - Load testing
    - Use for major releases
    ```bash
    npm run test:extended
    ```
    ```

    **Regression Analysis Workflow:**
    ```markdown
    ### Post-Fix Validation Checklist

    1. **Reproduce Original Issue**
       - [ ] Confirm bug exists in affected branch
       - [ ] Document exact reproduction steps
       - [ ] Capture error logs/screenshots

    2. **Write Regression Test**
       - [ ] Create test that fails without fix
       - [ ] Test covers the specific bug scenario
       - [ ] Test includes edge cases

    3. **Apply Fix and Validate**
       - [ ] Regression test now passes
       - [ ] Related tests still pass
       - [ ] No new warnings or errors

    4. **Run Extended Validation**
       - [ ] Full unit test suite passes
       - [ ] Integration tests pass
       - [ ] Coverage not decreased
       - [ ] No performance regression

    5. **Document and Close**
       - [ ] Update changelog
       - [ ] Document root cause
       - [ ] Link test to issue
    ```

    **Coverage Validation During Troubleshooting:**
    ```markdown
    ### Coverage Analysis Commands

    **Check Current Coverage:**
    ```bash
    # Node.js
    npm run test:coverage
    npx vitest run --coverage

    # Python
    pytest --cov=src --cov-report=html
    coverage report -m

    # Java
    mvn test jacoco:report
    ```

    **Compare Coverage Before/After Fix:**
    ```bash
    # Save baseline
    npm run test:coverage -- --json > coverage-before.json

    # After fix
    npm run test:coverage -- --json > coverage-after.json

    # Compare
    diff coverage-before.json coverage-after.json
    ```

    **Identify Uncovered Code:**
    ```bash
    # Node.js - find uncovered lines
    npx vitest run --coverage --reporter=json | jq '.coverage'

    # Python - show missing lines
    pytest --cov=src --cov-report=term-missing
    ```
    ```

    **Test Health Assessment:**
    ```markdown
    ### Test Suite Health Check

    **Identify Flaky Tests:**
    ```bash
    # Run tests multiple times to find flaky ones
    for i in {1..10}; do npm test 2>&1 | grep -E "FAIL|PASS" >> test-results.log; done

    # Analyze results
    grep FAIL test-results.log | sort | uniq -c | sort -nr
    ```

    **Check for Skipped Tests:**
    ```bash
    # Node.js
    npm test 2>&1 | grep -E "skipped|pending"

    # Python
    pytest --co -q | grep "skip"
    ```

    **Find Trivial Tests:**
    ```bash
    # Search for tests that always pass
    grep -rn "expect(true).toBe(true)" test/
    grep -rn "assert True" tests/
    ```

    **Test Data Validation:**
    ```bash
    # Verify test fixtures exist
    ls -la test/fixtures/
    find . -name "*.fixture.*" -o -name "*.mock.*"

    # Check for hard-coded data
    grep -rn "password123\|test@test.com\|12345" test/
    ```
    ```

    **Brownfield Project Test Assessment:**
    ```markdown
    ### Existing Codebase Test Validation

    When inheriting or troubleshooting a brownfield project:

    **Step 1: Assess Current Test State**
    ```bash
    # Count test files
    find . -name "*.test.*" -o -name "*.spec.*" | wc -l

    # Check if tests run
    npm test 2>&1 | head -50
    pytest --collect-only 2>&1 | head -50

    # Get coverage baseline
    npm run test:coverage 2>&1 | tail -20
    ```

    **Step 2: Identify Critical Gaps**
    - Authentication/authorization code without tests
    - Payment processing without tests
    - Data validation without tests
    - Error handlers without tests

    **Step 3: Create Test Remediation Plan**
    - Phase 1: Critical path tests (authentication, payments)
    - Phase 2: Test infrastructure (factories, mocks)
    - Phase 3: Comprehensive coverage (80% target)
    - Phase 4: Quality gates (CI integration)

    **Step 4: Establish Baseline**
    ```bash
    # Document current state
    echo "Test Coverage Baseline: $(date)" > .aiwg/testing/baseline.md
    npm run test:coverage >> .aiwg/testing/baseline.md
    ```
    ```

    **Automated Regression Prevention:**
    ```markdown
    ### CI/CD Regression Gates

    **GitHub Actions Example:**
    ```yaml
    name: Regression Tests
    on: [pull_request]
    jobs:
      regression:
        runs-on: ubuntu-latest
        steps:
          - uses: actions/checkout@v4
          - name: Run regression tests
            run: npm run test:regression
          - name: Coverage check
            run: |
              npm run test:coverage
              if [ $(jq '.total.lines.pct' coverage/coverage-summary.json) -lt 80 ]; then
                echo "Coverage below 80%"
                exit 1
              fi
          - name: Upload coverage
            uses: codecov/codecov-action@v3
    ```

    **Branch Protection Rules:**
    - Require status checks to pass
    - Require branches to be up to date
    - Require linear history
    - Include administrators in restrictions
    ```

**Advanced Troubleshooting Techniques:**

**Log Analysis:**
```bash
# Search for specific errors
grep -i "error" /var/log/app.log | tail -50

# Analyze log patterns
awk '{print $1}' access.log | sort | uniq -c | sort -nr

# Monitor logs in real-time
tail -f /var/log/app.log | grep -i "exception"
```

**Performance Profiling:**
```bash
# System performance
iostat -x 1
sar -u 1 10
vmstat 1 10

# Application profiling
strace -p [PID]
perf record -p [PID]
```

**Test-Driven Debugging:**
```markdown
### Using Tests to Debug Issues

1. **Write a failing test that reproduces the bug**
   ```javascript
   it('should handle edge case that caused bug #123', () => {
     // Exact scenario that caused the issue
     const result = functionUnderTest(bugTriggeringInput);
     expect(result).not.toThrow();
   });
   ```

2. **Run the test to confirm it fails**
   ```bash
   npm test -- --grep "bug #123"
   ```

3. **Debug with test runner**
   ```bash
   # Node.js with debugger
   node --inspect-brk ./node_modules/.bin/vitest run --testNamePattern "bug #123"

   # Python with pdb
   pytest -s --pdb test_module.py::test_bug_123
   ```

4. **Fix and verify**
   - Test now passes
   - All other tests still pass
   - Coverage not decreased
```

Remember to:
- Keep troubleshooting guides up-to-date
- Test all documented procedures regularly
- Collect feedback from users and improve guides
- Include screenshots and visual aids where helpful
- Make guides searchable and well-organized