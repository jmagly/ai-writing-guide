# Debugging Patterns

## Common Issues

<!-- Learned from debugging sessions and recurring problems -->

### Category: [Issue Type]

<!-- Examples: Authentication, Database, API Integration, Performance, etc. -->

**Symptom**: <!-- What the error looks like -->
**Root Cause**: <!-- Why it happens -->
**Resolution**: <!-- How to fix it -->
**Prevention**: <!-- How to avoid in future -->

---

## Development Environment

### Setup Issues

<!-- Learned from initial setup and onboarding -->

**Common Problems**:
<!-- e.g., "Node version mismatch causes package installation failures" -->
<!-- e.g., "Missing environment variables prevent application startup" -->

**Solutions**:
<!-- e.g., "Use .nvmrc to lock Node version" -->
<!-- e.g., "Copy .env.example to .env and fill in values" -->

### Tool Configuration

<!-- Learned from debugging tool issues -->

**Debugger Setup**: <!-- e.g., "VS Code launch.json configuration" -->
**Breakpoint Gotchas**: <!-- e.g., "Breakpoints don't work in transpiled TypeScript without sourcemaps" -->

## Resolution Strategies

### Systematic Debugging Process

<!-- Learned from successful debugging sessions -->

1. **Reproduce Reliably**
   - Isolate the failing case
   - Create minimal reproduction
   - Document steps to reproduce

2. **Gather Information**
   - Check error messages and stack traces
   - Review recent changes (git log, git blame)
   - Check logs (application, database, external services)
   - Verify environment configuration

3. **Form Hypothesis**
   - Identify likely root cause
   - Consider alternative explanations
   - Prioritize by probability

4. **Test Hypothesis**
   - Add logging/debugging statements
   - Use debugger to inspect state
   - Modify one variable at a time
   - Verify fix resolves issue

5. **Prevent Recurrence**
   - Add test case for the bug
   - Update documentation
   - Add validation/error handling
   - Record in this file for future reference

### Debugging Tools

<!-- Learned from effective debugging -->

**Logging**:
- <!-- e.g., "Use structured logging with context" -->
- <!-- e.g., "Log levels: debug for development, info for production" -->

**Debugger**:
- <!-- e.g., "Use VS Code debugger with launch configurations" -->
- <!-- e.g., "Remote debugging: node --inspect" -->

**Profiling**:
- <!-- e.g., "Use Chrome DevTools for Node.js profiling" -->
- <!-- e.g., "Memory leaks: use heap snapshots" -->

**Network**:
- <!-- e.g., "Use curl or Postman for API debugging" -->
- <!-- e.g., "Proxy traffic through Charles/mitmproxy for inspection" -->

## Stack-Specific Issues

### [Technology Stack]

<!-- Examples: TypeScript, React, Node.js, PostgreSQL, etc. -->

#### Common Errors

**Error**: <!-- e.g., "Cannot read property 'x' of undefined" -->
**Cause**: <!-- e.g., "Accessing nested property without null checking" -->
**Fix**: <!-- e.g., "Use optional chaining: obj?.nested?.property" -->

**Error**: <!-- e.g., "UnhandledPromiseRejectionWarning" -->
**Cause**: <!-- e.g., "Async function threw error without .catch()" -->
**Fix**: <!-- e.g., "Always handle promise rejections or use async/await with try/catch" -->

#### Known Quirks

<!-- e.g., "TypeScript strict mode catches issues at compile time" -->
<!-- e.g., "React hooks can't be called conditionally" -->

## Integration Issues

### External Services

<!-- Learned from debugging external API calls -->

**Service**: <!-- e.g., "Payment Gateway API" -->
**Common Issue**: <!-- e.g., "Timeout on payment confirmation webhook" -->
**Debug Strategy**: <!-- e.g., "Check webhook delivery logs in service dashboard" -->
**Resolution**: <!-- e.g., "Increase timeout, add retry logic" -->

### Database

<!-- Learned from database debugging -->

**Connection Issues**:
- <!-- e.g., "Connection pool exhaustion" -->
- <!-- Fix: "Ensure connections are released after queries" -->

**Query Performance**:
- <!-- e.g., "Slow queries on large tables" -->
- <!-- Fix: "Add index on frequently queried columns" -->

**Migration Problems**:
- <!-- e.g., "Migration fails in production but passes locally" -->
- <!-- Fix: "Check for data differences, add migration rollback" -->

## Performance Issues

### Identification

<!-- Learned from performance debugging -->

**Symptoms**:
- <!-- e.g., "Slow API response times" -->
- <!-- e.g., "High memory usage" -->
- <!-- e.g., "CPU spikes" -->

**Profiling Tools**:
- <!-- e.g., "Node.js profiler: node --prof" -->
- <!-- e.g., "APM: New Relic, DataDog" -->

### Common Bottlenecks

**N+1 Queries**: <!-- e.g., "Loading related data in loop instead of join" -->
**Fix**: <!-- e.g., "Use eager loading or batch loading" -->

**Memory Leaks**: <!-- e.g., "Event listeners not cleaned up" -->
**Fix**: <!-- e.g., "Remove listeners in cleanup phase" -->

**Inefficient Algorithms**: <!-- e.g., "O(n²) where O(n) is possible" -->
**Fix**: <!-- e.g., "Use hash map for lookups instead of nested loops" -->

## Error Patterns

### Transient Errors

<!-- Learned from intermittent failures -->

**Pattern**: <!-- e.g., "Network timeout on external API" -->
**Strategy**: <!-- e.g., "Retry with exponential backoff" -->
**Implementation**: <!-- e.g., "Use retry library with max attempts: 3" -->

### Configuration Errors

<!-- Learned from misconfiguration -->

**Pattern**: <!-- e.g., "Missing environment variable" -->
**Detection**: <!-- e.g., "Validate config on startup, fail fast" -->
**Prevention**: <!-- e.g., "Use config schema validation (e.g., zod)" -->

### Data Validation Errors

<!-- Learned from invalid data issues -->

**Pattern**: <!-- e.g., "Invalid input passes validation, fails downstream" -->
**Strategy**: <!-- e.g., "Validate at boundaries: API input, database writes" -->
**Tools**: <!-- e.g., "Use schema validation: joi, zod, ajv" -->

## Debugging Checklist

### Before Diving Deep

- [ ] Can you reproduce the issue reliably?
- [ ] Have you checked recent changes (git log)?
- [ ] Have you reviewed error logs?
- [ ] Have you checked environment configuration?
- [ ] Is this issue documented here already?

### During Investigation

- [ ] Are you testing one variable at a time?
- [ ] Are you documenting your findings?
- [ ] Have you formed a clear hypothesis?
- [ ] Are you using appropriate debugging tools?

### After Resolution

- [ ] Have you added a test case?
- [ ] Have you documented the issue here?
- [ ] Have you updated related documentation?
- [ ] Have you committed the fix with clear message?

## Lessons Learned

### Debugging Anti-Patterns

<!-- Learned from ineffective debugging approaches -->

**Random Changes**: <!-- e.g., "Changing code without understanding the problem" -->
**Why Ineffective**: <!-- e.g., "May mask the real issue or introduce new bugs" -->
**Better Approach**: <!-- e.g., "Form hypothesis, test systematically" -->

**Insufficient Logging**: <!-- e.g., "Not enough context in logs to diagnose" -->
**Why Ineffective**: <!-- e.g., "Can't reconstruct what happened" -->
**Better Approach**: <!-- e.g., "Log with context: user ID, request ID, timestamps" -->

### Effective Practices

<!-- Learned from successful debugging -->

**Rubber Duck Debugging**: <!-- e.g., "Explaining the problem often reveals the solution" -->
**Binary Search**: <!-- e.g., "Narrow down the issue by bisecting the code path" -->
**Fresh Eyes**: <!-- e.g., "Take a break or ask for help when stuck" -->

## Project-Specific Debug Notes

<!-- Add project-specific debugging knowledge -->

### Critical Paths

<!-- e.g., "Authentication flow is critical - debug with care" -->
<!-- e.g., "Payment processing has strict timing requirements" -->

### Debug Flags

<!-- e.g., "Set DEBUG=app:* to enable verbose logging" -->
<!-- e.g., "NODE_ENV=development enables detailed error pages" -->

### Known Workarounds

<!-- e.g., "Restart Redis cache to clear stale data" -->
<!-- e.g., "Delete node_modules and reinstall if dependency issues persist" -->

## Continuous Improvement

<!-- Track debugging efficiency over time -->

**Metrics**:
- <!-- e.g., "Average time to resolution" -->
- <!-- e.g., "Recurring issues (need permanent fix)" -->

**Process Improvements**:
- <!-- e.g., "Added pre-commit hooks to catch common errors" -->
- <!-- e.g., "Improved logging to include request IDs" -->
