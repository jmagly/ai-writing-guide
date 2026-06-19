# Code Reviewer — Worked Examples

Externalized from the agent definition per the few-shot-examples rule (#1587).

## Few-Shot Examples

### Example 1: Null Reference Bug Detection (Simple)

**Input:**
Review this user profile function for potential bugs.

**Output:**
```markdown
# Code Review: User Profile Function

**File**: `src/user/profile.ts`
**Severity**: CRITICAL

## Critical Issues

### Issue: Null Reference Error

**Location**: `src/user/profile.ts:23`

**Current Code:**
```typescript
function getUserDisplayName(user: User): string {
  return user.firstName + ' ' + user.lastName;
}
```

**Problem:**
Function doesn't handle null/undefined user object. Will throw `TypeError: Cannot read property 'firstName' of null` if called with null user.

**Suggested Fix:**
```typescript
function getUserDisplayName(user: User | null): string {
  if (!user) {
    return 'Unknown User';
  }

  const firstName = user.firstName ?? '';
  const lastName = user.lastName ?? '';

  return `${firstName} ${lastName}`.trim() || 'Unknown User';
}
```

**Why This Matters:**
- Prevents runtime crashes from null pointer exceptions
- Handles edge cases: null user, missing first name, missing last name
- Uses nullish coalescing (??) for cleaner null handling
- Provides graceful degradation with fallback value

**Additional Recommendations:**
- Add unit tests for: null user, partial names, empty strings
- Consider TypeScript strict null checks: `"strictNullChecks": true`
```

**Why This Is Good:**
- Specific file and line number provided
- Shows exact problematic code snippet
- Provides complete, working fix (not partial)
- Explains why the bug matters (runtime crash)
- Includes edge cases beyond the immediate fix

---

### Example 2: N+1 Query Performance Issue (Moderate)

**Input:**
Review this order listing endpoint for performance issues. It's been slow with large datasets.

**Output:**
```markdown
# Code Review: Order Listing Performance

**File**: `src/api/orders.ts`
**Severity**: HIGH

## High Priority Issues

### Issue: N+1 Query Problem

**Location**: `src/api/orders.ts:45-52`

**Current Code:**
```typescript
async function getOrdersWithCustomers() {
  // 1 query: Fetch all orders
  const orders = await Order.findAll({ limit: 100 });

  // N queries: Fetch customer for each order (100 additional queries!)
  for (const order of orders) {
    order.customer = await Customer.findByPk(order.customerId);
  }

  return orders;
}
```

**Problem:**
Classic N+1 query pattern. For 100 orders, this executes:
- 1 query to fetch orders
- 100 queries to fetch customers (one per order)
- **Total: 101 database queries**

With 100ms per query, this takes ~10 seconds instead of ~200ms.

**Performance Impact:**
| Dataset Size | Queries | Estimated Time |
|--------------|---------|----------------|
| 10 orders | 11 | 1.1 seconds |
| 100 orders | 101 | 10.1 seconds |
| 1000 orders | 1001 | 100 seconds |

**Optimized Solution (Eager Loading):**
```typescript
async function getOrdersWithCustomers() {
  // Single query with JOIN: Fetch orders with customers
  const orders = await Order.findAll({
    limit: 100,
    include: [
      {
        model: Customer,
        as: 'customer',
        attributes: ['id', 'name', 'email'] // Only fields we need
      }
    ]
  });

  return orders;
}
```

**SQL Generated (Optimized):**
```sql
SELECT
  orders.*,
  customers.id AS "customer.id",
  customers.name AS "customer.name",
  customers.email AS "customer.email"
FROM orders
LEFT JOIN customers ON orders.customer_id = customers.id
LIMIT 100;
```

**Performance After Fix:**
- **Total queries: 1**
- **Time: ~100ms** (100x faster!)

**Alternative Solution (Manual JOIN with Raw Query):**
```typescript
async function getOrdersWithCustomers() {
  const query = `
    SELECT
      o.*,
      json_build_object(
        'id', c.id,
        'name', c.name,
        'email', c.email
      ) AS customer
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    LIMIT 100
  `;

  const results = await sequelize.query(query, {
    type: QueryTypes.SELECT
  });

  return results;
}
```

**Recommended Approach:**
Use the ORM eager loading solution because:
- Easier to maintain than raw SQL
- Type-safe with TypeScript
- Handles edge cases (null customers)
- Consistent with rest of codebase

**Additional Performance Recommendations:**

1. **Add Database Index:**
   ```sql
   CREATE INDEX idx_orders_customer_id ON orders(customer_id);
   ```

2. **Add Pagination:**
   ```typescript
   async function getOrdersWithCustomers(page = 1, pageSize = 100) {
     const offset = (page - 1) * pageSize;
     return await Order.findAll({
       limit: pageSize,
       offset: offset,
       include: [{ model: Customer, as: 'customer' }]
     });
   }
   ```

3. **Add Caching (Redis):**
   ```typescript
   async function getOrdersWithCustomers() {
     const cacheKey = 'orders:with-customers:page-1';
     const cached = await redis.get(cacheKey);

     if (cached) {
       return JSON.parse(cached);
     }

     const orders = await Order.findAll({
       include: [{ model: Customer }]
     });

     await redis.setex(cacheKey, 300, JSON.stringify(orders)); // 5min cache
     return orders;
   }
   ```

**Testing:**
Add performance test to prevent regression:

```typescript
describe('Order API Performance', () => {
  test('getOrdersWithCustomers executes <=2 queries', async () => {
    const queryMonitor = new QueryMonitor();

    await getOrdersWithCustomers();

    expect(queryMonitor.count).toBeLessThanOrEqual(2);
  });

  test('getOrdersWithCustomers completes in <500ms for 100 orders', async () => {
    const start = Date.now();

    await getOrdersWithCustomers();

    const duration = Date.now() - start;
    expect(duration).toBeLessThan(500);
  });
});
```
```

**Why This Is Good:**
- Quantifies performance impact with concrete numbers (100x improvement)
- Shows before/after query counts in table format
- Provides complete optimized solution, not just hints
- Includes SQL that will be generated for transparency
- Offers alternative approaches with trade-off analysis
- Recommends related optimizations (indexing, pagination, caching)
- Includes performance test to prevent regression
- Explains why recommended approach is best for this context

---

### Example 3: JWT Validation Security Flaw (Complex)

**Input:**
Review this authentication middleware. We've had some reports of unauthorized access.

**Output:**
```markdown
# Code Review: Authentication Middleware Security

**File**: `src/middleware/auth.ts`
**Severity**: CRITICAL
**Review Scope**: Authentication flow, JWT validation, authorization checks

## Executive Summary

Found 4 security issues (2 CRITICAL, 2 HIGH) in authentication middleware that collectively allow:
- Authentication bypass via algorithm confusion
- Token reuse after logout
- Privilege escalation via token manipulation
- Timing-based token enumeration

Estimated fix time: 4 hours. Requires immediate attention before next deployment.

---

## Critical Issues

### 1. Missing Algorithm Validation (Authentication Bypass)

**Severity**: CRITICAL
**Location**: `src/middleware/auth.ts:15`

**Current Code:**
```typescript
function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET); // No algorithm specified!
  } catch (err) {
    return null;
  }
}
```

**Vulnerability: Algorithm Confusion Attack (CVE-2015-9235)**

Attacker can change JWT header from `HS256` to `none` and remove signature entirely, bypassing authentication:

```json
// Malicious token header
{
  "alg": "none",
  "typ": "JWT"
}

// Payload with admin claims
{
  "sub": "attacker",
  "role": "admin",
  "iat": 1640000000
}

// No signature needed!
```

**Impact**: Complete authentication bypass, attacker gains admin access

**Fix:**
```typescript
function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],  // REQUIRED: Whitelist allowed algorithms
      issuer: 'your-app',
      audience: 'your-app-users'
    });
  } catch (err) {
    logger.error('Token verification failed', {
      error: err.message,
      timestamp: Date.now()
    });
    return null;
  }
}
```

---

### 2. No Token Revocation (Logout Bypass)

**Severity**: CRITICAL
**Location**: `src/middleware/auth.ts:30-35`

**Current Code:**
```typescript
app.post('/logout', authenticateToken, (req, res) => {
  // Just tells client to delete token
  res.json({ message: 'Logged out successfully' });
});

function authenticateToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  const user = verifyToken(token);

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  req.user = user;
  next();
}
```

**Vulnerability: Token Remains Valid After Logout**

Logout only instructs client to delete token. The token itself remains valid until expiry. If attacker has stolen the token, they can continue using it.

**Attack Scenario:**
1. User logs in at 9:00 AM (token expiry: 9:00 PM, 12 hours)
2. Attacker steals token at 10:00 AM
3. User logs out at 11:00 AM
4. Attacker continues using stolen token until 9:00 PM

**Fix: Implement Token Blocklist (Redis)**

```typescript
// Token storage interface
interface TokenStore {
  isRevoked(jti: string): Promise<boolean>;
  revoke(jti: string, expiresIn: number): Promise<void>;
}

// Redis implementation
class RedisTokenStore implements TokenStore {
  constructor(private redis: Redis) {}

  async isRevoked(jti: string): Promise<boolean> {
    const exists = await this.redis.exists(`revoked:${jti}`);
    return exists === 1;
  }

  async revoke(jti: string, expiresIn: number): Promise<void> {
    // Store revoked token ID with TTL matching token expiry
    await this.redis.setex(`revoked:${jti}`, expiresIn, '1');
  }
}

const tokenStore = new RedisTokenStore(redisClient);

// Generate token with unique ID (jti claim)
function generateToken(userId: string, role: string) {
  const jti = crypto.randomUUID(); // Unique token ID

  return jwt.sign(
    {
      sub: userId,
      role: role,
      jti: jti  // JWT ID for revocation
    },
    JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: '12h'
    }
  );
}

// Verify token and check revocation
async function authenticateToken(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const decoded = verifyToken(token);

    // Check if token has been revoked
    const isRevoked = await tokenStore.isRevoked(decoded.jti);
    if (isRevoked) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Logout endpoint
app.post('/logout', authenticateToken, async (req, res) => {
  const decoded = req.user;

  // Calculate remaining TTL
  const now = Math.floor(Date.now() / 1000);
  const expiresIn = decoded.exp - now;

  // Revoke token
  await tokenStore.revoke(decoded.jti, expiresIn);

  res.json({ message: 'Logged out successfully' });
});
```

**Performance Note:** Redis lookup adds ~1-2ms per request. For high-traffic APIs, use local cache + Redis:

```typescript
const revokedCache = new LRUCache({ max: 10000, ttl: 60000 }); // 1min cache

async function isRevoked(jti: string): Promise<boolean> {
  // Check local cache first
  if (revokedCache.has(jti)) {
    return true;
  }

  // Check Redis
  const revoked = await tokenStore.isRevoked(jti);
  if (revoked) {
    revokedCache.set(jti, true);
  }

  return revoked;
}
```

---

## High Priority Issues

### 3. Missing Role Validation (Privilege Escalation)

**Severity**: HIGH
**Location**: `src/middleware/auth.ts:50-55`

**Current Code:**
```typescript
function requireAdmin(req, res, next) {
  if (req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ error: 'Forbidden' });
  }
}

// Protected admin route
app.delete('/users/:id', authenticateToken, requireAdmin, deleteUser);
```

**Vulnerability: Trusts Token Claims Without Re-Verification**

Token contains `role` claim set at login time. If user's role is changed (downgrade from admin to user), old tokens with `admin` claim remain valid until expiry.

**Attack Scenario:**
1. User promoted to admin at 9:00 AM
2. User logs in, gets token with `role: 'admin'` (expires 9:00 PM)
3. User abuses admin access
4. Admin revokes user's admin role at 10:00 AM
5. User continues using admin token until 9:00 PM

**Fix: Re-Validate Role on Critical Operations**

```typescript
async function requireAdmin(req, res, next) {
  const userId = req.user.sub;

  // Re-fetch user's current role from database
  const user = await User.findByPk(userId, {
    attributes: ['id', 'role']
  });

  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  if (user.role !== 'admin') {
    logger.warn('Authorization mismatch', {
      userId: userId,
      tokenRole: req.user.role,
      actualRole: user.role
    });
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  req.user.role = user.role; // Update with actual role
  next();
}

// Protected admin routes with re-validation
app.delete('/users/:id', authenticateToken, requireAdmin, deleteUser);
app.post('/admin/settings', authenticateToken, requireAdmin, updateSettings);
```

**Performance Optimization:**

Cache role checks for 60 seconds:

```typescript
const roleCache = new LRUCache({ max: 5000, ttl: 60000 }); // 1min cache

async function requireAdmin(req, res, next) {
  const userId = req.user.sub;
  const cacheKey = `role:${userId}`;

  // Check cache first
  let role = roleCache.get(cacheKey);

  if (!role) {
    const user = await User.findByPk(userId, { attributes: ['role'] });
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    role = user.role;
    roleCache.set(cacheKey, role);
  }

  if (role !== 'admin') {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }

  next();
}
```

---

### 4. Timing Attack on Token Comparison

**Severity**: HIGH
**Location**: `src/middleware/auth.ts:70`

**Current Code:**
```typescript
function validateApiKey(providedKey: string): boolean {
  const validKey = process.env.API_KEY;
  return providedKey === validKey; // Not constant-time!
}
```

**Vulnerability: Timing-Based Token Enumeration**

String comparison using `===` is not constant-time. Attacker can measure response times to determine correct API key bytes one at a time.

**Timing Attack Simulation:**
```typescript
// Attacker tries different first characters
measureTime("a...") // 10.1ms
measureTime("b...") // 10.1ms
measureTime("c...") // 10.3ms  ← Correct first byte!

// Now try second character with "c"
measureTime("ca..") // 10.3ms
measureTime("cb..") // 10.5ms  ← Correct second byte!

// Continue until full key recovered
```

**Fix: Constant-Time Comparison**

```typescript
import { timingSafeEqual } from 'crypto';

function validateApiKey(providedKey: string): boolean {
  const validKey = process.env.API_KEY;

  if (!validKey) {
    throw new Error('API_KEY not configured');
  }

  // Ensure same length
  if (providedKey.length !== validKey.length) {
    return false;
  }

  // Constant-time comparison
  return timingSafeEqual(
    Buffer.from(providedKey),
    Buffer.from(validKey)
  );
}

// Usage in middleware
function requireApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey || !validateApiKey(apiKey)) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  next();
}
```

---

## Prioritized Remediation Plan

| Priority | Issue | Impact | Time | Blocking? |
|----------|-------|--------|------|-----------|
| 1 | Algorithm confusion | Auth bypass | 30 min | YES |
| 2 | Token revocation | Logout bypass | 2 hours | YES |
| 3 | Role re-validation | Privilege escalation | 1 hour | YES |
| 4 | Timing attack | Key enumeration | 30 min | NO |

**Total: 4 hours**

**Deployment Steps:**
1. Set up Redis for token revocation
2. Apply all fixes
3. Force logout all existing sessions
4. Deploy to staging, run security tests
5. Deploy to production with monitoring

---

## Required Security Tests

Add before deployment:

```typescript
describe('Authentication Security', () => {
  test('rejects JWT with "none" algorithm', () => {
    const maliciousToken = createTokenWithAlgorithm('none');
    expect(verifyToken(maliciousToken)).toBeNull();
  });

  test('revoked token cannot be used', async () => {
    const token = generateToken('user123', 'user');
    await tokenStore.revoke(jwt.decode(token).jti, 3600);

    const response = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(401);
  });

  test('role downgrade prevents admin access', async () => {
    const token = generateToken('user123', 'admin');

    // Change user role in database
    await User.update({ role: 'user' }, { where: { id: 'user123' } });

    const response = await request(app)
      .delete('/users/456')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
  });

  test('API key comparison is constant-time', async () => {
    const timings = [];

    for (let i = 0; i < 100; i++) {
      const start = process.hrtime.bigint();
      validateApiKey('wrong-key-' + i);
      const end = process.hrtime.bigint();
      timings.push(Number(end - start));
    }

    const mean = timings.reduce((a, b) => a + b) / timings.length;
    const variance = timings.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / timings.length;
    const stdDev = Math.sqrt(variance);

    // Standard deviation should be <5% of mean for constant-time
    expect(stdDev / mean).toBeLessThan(0.05);
  });
});
```

---

## Overall Assessment

**Code Quality Score**: 3/10

**Main Strengths:**
- Clean code structure
- Consistent error handling format

**Critical Concerns:**
- Multiple authentication bypass vulnerabilities
- No token revocation mechanism
- Privilege escalation possible via stale tokens
- Timing attacks possible on API keys

**Next Steps:**
1. Implement all CRITICAL fixes immediately (2.5 hours)
2. Add security test suite (1 hour)
3. Set up Redis for token revocation (30 min)
4. Force logout all existing sessions on deployment
5. Enable security monitoring and alerting
```

**Why This Is Good:**
- Comprehensive review across multiple related security issues
- Each issue has: severity, location, vulnerability explanation, exploit scenario, complete fix
- Prioritized remediation plan with time estimates and blocking status
- Performance considerations included (caching strategies)
- Includes security test suite to prevent regression
- Executive summary for management visibility
- Overall assessment with concrete score and actionable next steps
- Shows both attack scenarios and their mitigations clearly
