# Use-Case Specification: User Authentication (Complete Example)

## Purpose

This is a complete worked example of a use-case specification for user authentication in a web application. This example demonstrates all sections filled out with realistic, production-quality content for an e-commerce platform's authentication system.

**Why this is a good example:**
- Uses specific, testable language
- Covers main flow, alternatives, and exceptions comprehensively
- Includes security-appropriate requirements
- Shows proper traceability references
- Balances completeness with clarity

---

## 1. Use-Case Identifier and Name

**ID**: UC-AUTH-001
**Name**: User Authentication via Email and Password

---

## 2. Scope and Level

**Scope**: ShopSecure E-Commerce Platform - Authentication Service
**Level**: User Goal (System Use Case)

---

## 3. Primary Actor(s)

**Primary Actor**: Registered User
**Goal**: Securely authenticate to access personalized account features and complete purchases

**Secondary Actors**:
- Authentication Service (system)
- Session Manager (system)
- Audit Logger (system)

---

## 4. Stakeholders and Interests

| Stakeholder | Interest |
|-------------|----------|
| **Customer** | Fast, reliable login; security of personal data and payment information |
| **Business Owner** | Minimize abandoned carts due to auth friction; prevent account takeover fraud |
| **Security Team** | Protect against credential stuffing, brute force, and session hijacking |
| **Support Team** | Clear error messages to reduce support tickets; audit trail for investigations |
| **Compliance Officer** | GDPR compliance (data access controls), PCI DSS (session security) |

---

## 5. Preconditions

- User has previously registered an account with valid email address
- User knows their password
- User is not currently authenticated (no active session)
- Authentication service is operational and accessible
- Database containing user credentials is available

---

## 6. Postconditions

**On Success**:
- User is authenticated with an active session token (JWT)
- Session token stored securely in HTTP-only cookie
- User redirected to intended destination (cart, account dashboard, etc.)
- Login event logged to audit system
- Failed login attempt counter reset to 0

**On Failure**:
- User remains unauthenticated
- Failed login attempt counter incremented
- Error message displayed to user
- Failed login attempt logged with IP address and timestamp

---

## 7. Trigger

One of the following events:
- User navigates directly to `/login` page
- User clicks "Login" button from homepage or product page
- System redirects unauthenticated user attempting to access protected resource
- User session expires and re-authentication is required

---

## 8. Main Success Scenario

1. User navigates to login page
   - **System**: Displays login form with email and password fields
   - **System**: Displays "Forgot Password?" and "Create Account" links

2. User enters email address
   - **Example**: "alice@example.com"

3. User enters password
   - **System**: Masks password characters for privacy

4. User clicks "Log In" button
   - **System**: Disables button to prevent double-submission
   - **System**: Displays loading indicator

5. System validates input format
   - Email matches RFC 5322 email format
   - Password is not empty

6. System queries database for user account by email
   - **System**: Retrieves stored password hash and account metadata

7. System verifies password using bcrypt comparison
   - **System**: Compares submitted password against stored hash (cost factor 12)

8. System checks account status
   - Account is active (not suspended, not deleted)
   - Email address is verified

9. System checks failed login attempt counter
   - Counter is below lockout threshold (< 5 attempts)

10. System generates session token (JWT)
    - **Payload**: user_id, email, issued_at, expires_at (24 hours)
    - **Signed with**: RS256 using private key

11. System stores session in Redis cache
    - **Key**: session_id
    - **Value**: user_id, email, ip_address, user_agent
    - **TTL**: 24 hours (86400 seconds)

12. System sets HTTP-only secure cookie
    - **Name**: `session_token`
    - **Value**: JWT
    - **Attributes**: `HttpOnly; Secure; SameSite=Strict; Max-Age=86400`

13. System resets failed login attempt counter to 0

14. System logs successful authentication event
    - **Log entry**: timestamp, user_id, email, ip_address, user_agent, action="login_success"

15. System redirects user to intended destination
    - **Default**: Account dashboard
    - **If from protected resource**: Original requested URL

16. User sees personalized welcome message
    - **Example**: "Welcome back, Alice!"

**Result**: User is authenticated and can access protected features.

---

## 9. Alternate Flows

### 9a. User Selects "Remember Me" Option

**Trigger**: User checks "Remember Me" checkbox before submitting (Step 4 in main flow)

**Alternate Steps**:
- 10a. System generates long-lived session token
  - **Expiry**: 30 days instead of 24 hours
- 11a. System stores session with extended TTL
  - **TTL**: 30 days (2592000 seconds)
- 12a. System sets cookie with extended Max-Age
  - **Max-Age**: 2592000

**Rejoin Main Flow**: Step 13

---

### 9b. User Requests "Forgot Password"

**Trigger**: User clicks "Forgot Password?" link (Step 1 alternative)

**Alternate Steps**:
- 1b. System displays password reset form (email input only)
- 2b. User enters email address
- 3b. User clicks "Send Reset Link"
- 4b. System validates email format
- 5b. System looks up account by email
  - **If found**: Generates password reset token, sends email with reset link
  - **If not found**: Displays same success message (security: don't leak account existence)
- 6b. System displays "If that email exists, a reset link has been sent" message

**Exit**: Use case ends (user proceeds to email to reset password)

---

### 9c. Multi-Factor Authentication (MFA) Enabled

**Trigger**: User account has MFA enabled (detected at Step 8 in main flow)

**Alternate Steps**:
- 8c. System verifies password matches (Step 7)
- 9c. System redirects to MFA verification page
  - **Display**: "Enter 6-digit code from authenticator app"
- 10c. User enters TOTP code from authenticator app
- 11c. User clicks "Verify"
- 12c. System validates TOTP code
  - **Validation**: 30-second time window, allowing ±1 window drift
- 13c. System checks if code has been used recently (replay protection)
  - **Cache**: Last 3 used codes for this session

**If TOTP valid**:
- **Rejoin Main Flow**: Step 10 (generate session token)

**If TOTP invalid**:
- **See Exception Flow**: 10f (Invalid MFA Code)

---

## 10. Exception Flows

### 10a. Invalid Email Format

**Trigger**: Email does not match RFC 5322 format (Step 5)

**Exception Steps**:
- 5a. System displays inline error: "Please enter a valid email address"
- 5b. System highlights email field in red
- 5c. System keeps password field masked but retains value (no re-entry needed)

**Recovery**: User corrects email and resubmits (return to Step 4)

---

### 10b. Email Not Found in Database

**Trigger**: No account exists with provided email (Step 6)

**Exception Steps**:
- 6b. System waits random delay (200-400ms) to prevent timing attacks
- 6c. System displays generic error: "Incorrect email or password"
  - **Security note**: Do not reveal whether email exists to prevent account enumeration
- 6d. System logs failed login attempt with email (for security monitoring)

**Recovery**: User can retry with correct credentials or click "Create Account"

---

### 10c. Incorrect Password

**Trigger**: Password does not match stored hash (Step 7)

**Exception Steps**:
- 7c. System increments failed login attempt counter
  - **Storage**: Redis key `failed_login:{email}`, TTL 1 hour
- 7d. System displays generic error: "Incorrect email or password"
  - **With counter**: "Incorrect email or password. You have 3 attempts remaining before temporary lockout."
- 7e. System logs failed login attempt
  - **Log**: timestamp, email, ip_address, action="login_failed_incorrect_password"

**Recovery**: User can retry (return to Step 4)

**Escalation**: If counter reaches 5, see Exception 10d (Account Lockout)

---

### 10d. Account Lockout (Too Many Failed Attempts)

**Trigger**: Failed login attempt counter ≥ 5 (Step 9)

**Exception Steps**:
- 9d. System displays error: "Account temporarily locked due to multiple failed login attempts. Try again in 15 minutes or reset your password."
- 9e. System logs account lockout event
  - **Log**: timestamp, email, ip_address, action="account_locked"
- 9f. System sends email notification to account owner
  - **Subject**: "Security Alert: Account Locked"
  - **Body**: "Your account was locked after 5 failed login attempts from IP {ip}. If this wasn't you, reset your password immediately."

**Recovery**:
- **Option 1**: Wait 15 minutes (lockout counter TTL expires)
- **Option 2**: Click "Reset Password" link in email or on login page

---

### 10e. Account Suspended or Deleted

**Trigger**: Account status is not "active" (Step 8)

**Exception Steps**:
- 8e. System displays specific error based on status:
  - **Suspended**: "Your account has been suspended. Contact support for assistance."
  - **Deleted**: "Incorrect email or password." (don't reveal deletion)
  - **Email Unverified**: "Please verify your email address. We've sent a new verification link to {email}."
- 8f. System logs login attempt for suspended/deleted account
- 8g. System sends verification email if status is "email_unverified"

**Recovery**:
- **Suspended**: User must contact support
- **Deleted**: User must create new account
- **Unverified**: User checks email and clicks verification link

---

### 10f. Invalid MFA Code (When MFA Enabled)

**Trigger**: TOTP code is incorrect or expired (Alternate Flow 9c, Step 12c)

**Exception Steps**:
- 12f. System displays error: "Invalid verification code. Please try again."
- 13f. System increments MFA failure counter (separate from password failures)
- 14f. System allows 3 MFA attempts before locking session

**Recovery**: User can retry with new TOTP code (return to Alternate Flow 9c, Step 10c)

**Escalation**: After 3 failed MFA attempts:
- System logs out user (destroys session)
- System displays: "Too many failed verification attempts. Please log in again."
- User returns to main login page (Step 1)

---

### 10g. System Error (Database Unavailable)

**Trigger**: Database query fails due to connectivity issue (Step 6)

**Exception Steps**:
- 6g. System catches database exception
- 7g. System logs critical error with stack trace
- 8g. System displays user-friendly error: "We're experiencing technical difficulties. Please try again in a few moments."
- 9g. System queues alert to operations team

**Recovery**: User waits and retries

---

### 10h. Session Store Unavailable (Redis Down)

**Trigger**: Cannot create session in Redis (Step 11)

**Exception Steps**:
- 11h. System falls back to stateless JWT-only mode (no server-side session)
  - **Tradeoff**: Cannot revoke sessions until JWT expires
- 12h. System logs degraded mode warning
- 13h. System sets JWT cookie with shorter expiry (1 hour instead of 24)
- 14h. User is authenticated but session management is degraded

**Recovery**: Operations team restores Redis; future logins resume normal session storage

---

## 11. Special Requirements

### Security Requirements

**SEC-001**: Passwords must be hashed using bcrypt with cost factor ≥ 12
- **Rationale**: OWASP recommendation for 2024

**SEC-002**: Session tokens must be cryptographically signed JWTs using RS256
- **Rationale**: Prevents token forgery; supports key rotation

**SEC-003**: Session cookies must have `HttpOnly`, `Secure`, and `SameSite=Strict` attributes
- **Rationale**: Prevents XSS theft and CSRF attacks

**SEC-004**: Failed login attempts must be rate-limited per IP address
- **Limit**: 20 attempts per IP per hour across all accounts
- **Rationale**: Mitigates distributed credential stuffing

**SEC-005**: Account lockout after 5 failed login attempts for 15 minutes
- **Rationale**: Prevents brute force while minimizing user impact

### Performance Requirements

**PERF-001**: Login request must complete within 2 seconds (p95)
- **Includes**: Form submission, password verification, session creation, redirect

**PERF-002**: System must support 1000 concurrent login requests
- **Expected peak**: Black Friday, new product launches

**PERF-003**: Database password lookup must use indexed query
- **Index**: `users.email` (unique index)

### Usability Requirements

**USE-001**: Error messages must not reveal whether email exists in system
- **Rationale**: Prevents account enumeration attacks

**USE-002**: Password field must mask characters by default
- **Option**: "Show password" toggle for user convenience

**USE-003**: Login form must be keyboard-accessible (tab navigation)
- **Rationale**: WCAG 2.1 Level AA compliance

**USE-004**: Error messages must be clear and actionable
- Example: "Incorrect email or password" (actionable: try again, reset password)

### Reliability Requirements

**REL-001**: Authentication service must have 99.9% uptime
- **Allowable downtime**: 8.76 hours per year

**REL-002**: Failed authentication requests must not affect system availability
- **Protection**: Rate limiting, circuit breakers

---

## 12. Related Business Rules

**BR-001**: Users under 13 years old cannot create accounts (COPPA compliance)
- **Enforcement**: Age gate during registration, not login

**BR-002**: Passwords must meet complexity requirements
- Minimum 8 characters, at least one uppercase, one number, one special character
- **Note**: Enforced at registration/password change, not login

**BR-003**: Sessions expire after 24 hours of inactivity
- **Idle timeout**: 24 hours
- **Absolute timeout**: 7 days (even with activity)

**BR-004**: Guest checkout does not require authentication
- **Tradeoff**: Convenience vs. retained customer data

---

## 13. Data Requirements

### Input Data

| Field | Type | Validation | Required |
|-------|------|------------|----------|
| `email` | string | RFC 5322 email format, max 255 chars | Yes |
| `password` | string | Min 1 char (complexity checked at registration) | Yes |
| `remember_me` | boolean | true/false | No (default: false) |

### Output Data

| Field | Type | Description |
|-------|------|-------------|
| `session_token` | JWT | Signed token with user claims |
| `user` | object | User profile data (id, email, name, preferences) |
| `redirect_url` | string | Where to send user after login |

### Persistent Data Changes

**User Table**:
- `last_login_at` timestamp updated
- `login_count` incremented

**Audit Log Table**:
- New row with login event details

**Session Store (Redis)**:
- New session entry with TTL

**Failed Login Attempts Cache (Redis)**:
- Counter reset to 0 on success

---

## 14. Open Issues and TODOs

- [ ] **Issue #1**: Should we support OAuth login (Google, Apple) in addition to email/password?
  - **Assigned to**: Product Owner
  - **Target date**: 2026-02-15

- [ ] **Issue #2**: Biometric authentication (WebAuthn) for mobile app?
  - **Assigned to**: Security Architect
  - **Target date**: 2026-03-01

- [x] **Issue #3**: Should failed attempts lock by IP or by account?
  - **Resolved**: By account (prevents one IP locking multiple accounts)
  - **Date**: 2026-01-15

- [ ] **Issue #4**: Session token rotation on sensitive actions (e.g., update password)?
  - **Assigned to**: Security Auditor
  - **Target date**: 2026-02-01

---

## 15. References

**Architecture**:
- @.aiwg/architecture/software-architecture-doc.md#authentication-service - Authentication service architecture
- @.aiwg/architecture/decisions/ADR-003-jwt-sessions.md - Decision to use JWT for sessions
- @.aiwg/architecture/decisions/ADR-005-bcrypt-password-hashing.md - Password hashing strategy

**Requirements**:
- @.aiwg/requirements/nfr-modules/security.md - Security requirements
- @.aiwg/requirements/nfr-modules/performance.md - Performance requirements
- @.aiwg/requirements/user-stories/US-AUTH-001.md - User login story

**Implementation**:
- @src/auth/AuthenticationService.ts - Implementation of authentication logic
- @src/auth/SessionManager.ts - Session creation and management
- @src/middleware/AuthMiddleware.ts - Authentication middleware for protected routes

**Testing**:
- @test/integration/auth/authentication.test.ts - Integration tests for auth flow
- @test/unit/auth/PasswordHasher.test.ts - Unit tests for password hashing
- @test/e2e/auth/login.spec.ts - End-to-end login flow tests

**Security**:
- @.aiwg/security/threat-models/authentication-threat-model.md - Threat model for authentication
- @.aiwg/security/controls/CTRL-001-password-hashing.md - Password hashing control

**Compliance**:
- @.aiwg/compliance/gdpr-data-access-controls.md - GDPR compliance documentation
- @.aiwg/compliance/pci-dss-session-security.md - PCI DSS session requirements

---

## Why This Example is Effective

### Completeness
- Every section filled out with realistic detail
- Main flow has 16 detailed steps showing actor interactions
- 3 alternate flows covering common variations
- 8 exception flows covering error scenarios

### Specificity
- Exact error messages shown
- Precise timing values (2 seconds, 24 hours, 15 minutes)
- Specific technologies (bcrypt cost 12, RS256, Redis)
- Concrete examples throughout

### Security Awareness
- Addresses timing attacks, account enumeration, session hijacking
- References OWASP recommendations
- Considers both usability and security (lockout duration)

### Traceability
- Links to architecture decisions (ADRs)
- References implementation files
- Points to test coverage
- Cites relevant NFRs

### Testability
- Every step can be translated to a test case
- Clear pass/fail criteria in exception flows
- Specific validation rules
- Observable outcomes (logs, database changes)

### Domain Appropriateness
- Uses e-commerce context consistently
- Considers real business concerns (Black Friday traffic)
- Balances security with user experience
- Addresses compliance (GDPR, PCI DSS, COPPA)

---

## Anti-Patterns to Avoid

### ❌ Too Vague
**Bad**: "User logs in"
**Good**: "User enters email, enters password, clicks 'Log In' button, system validates credentials, generates JWT, sets secure cookie, redirects to dashboard"

### ❌ Missing Error Handling
**Bad**: Only describing happy path
**Good**: 8 exception flows covering database errors, incorrect credentials, lockouts, etc.

### ❌ No Traceability
**Bad**: No references to other documents
**Good**: 15 @-mention references to architecture, requirements, tests, security docs

### ❌ Untestable Language
**Bad**: "System works properly"
**Good**: "System returns HTTP 200 with JWT in Set-Cookie header, session stored in Redis with TTL 86400"

### ❌ Technology-Free (Too Abstract)
**Bad**: "System stores session"
**Good**: "System stores session in Redis cache with TTL 24 hours using session_id as key"

---

**Template Version**: 1.0
**Example Author**: Requirements Analyst Agent
**Last Updated**: 2026-01-28
**Quality Review**: Passed (Test Architect, Security Auditor)
