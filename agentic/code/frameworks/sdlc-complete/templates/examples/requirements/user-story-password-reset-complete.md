# User Story: Password Reset (Complete Example)

## Why This Example

This is a complete, production-ready user story for a password reset feature in an e-commerce platform. It demonstrates:

- ✅ Clear INVEST criteria adherence
- ✅ Comprehensive acceptance criteria with Gherkin syntax
- ✅ Security-appropriate requirements
- ✅ Realistic task breakdown and estimation
- ✅ Proper dependency and risk identification
- ✅ Quality annotations explaining good practices

This example can be copied and adapted for similar authentication/security features.

---

## Metadata

- **ID**: `US-AUTH-005`
- **Type**: Requirement Card (User Story)
- **Status**: Ready (moved from Draft after refinement)
- **Owner**: Product Owner (Sarah Chen)
- **Contributors**: Security Auditor, UX Designer, Backend Engineer
- **Reviewers**: Product Owner, Security Lead, Technical Lead
- **Team**: Platform Authentication Team
- **Stakeholders**: Security Team, Customer Support, Legal/Compliance
- **Created**: 2026-01-10
- **Last Updated**: 2026-01-28
- **Priority**: High (security-critical feature, blocks regulatory compliance)
- **Story Points**: 5 (team consensus after refinement)
- **Sprint**: Sprint 12 (starting 2026-02-01)
- **Related**:
  - Epic: `EP-AUTH-001` (User Authentication & Security)
  - Feature: `FEAT-AUTH-PASSWORD-MGMT` (Password Management)
  - Requirements: `REQ-SEC-003` (Account Recovery), `REQ-COMP-GDPR-004` (User Data Access)
  - Test Cases: `TC-AUTH-201` (password reset flow), `TC-SEC-105` (security validations)
  - Tasks: `TASK-AUTH-051` to `TASK-AUTH-059`
  - Dependencies: `US-AUTH-001` (User Authentication - completed), `TECH-019` (Email service - completed)
  - Architecture: `ADR-006` (Password Reset Token Design), `ADR-003` (JWT Sessions)

---

## Story

### User Story Statement

**As a** registered user who forgot their password
**I want** to reset my password via a secure email link
**So that** I can regain access to my account without contacting customer support

---

### Story Context

**Problem**:
Users who forget passwords currently have no self-service recovery option. Support receives 200+ password reset requests per week, consuming 15 minutes per request (50 hours/week). 85% of users who forget passwords abandon checkout without completing purchase.

**Value**:
- **For Users**: Immediate account recovery (0 wait time vs. 2-4 hour support response)
- **For Business**: Reduce support costs by ~$50K/year (50 hours/week × $20/hour × 52 weeks)
- **For Business**: Recover ~$120K/year in abandoned cart revenue (85% of 200 users/week × $140 avg cart value × 52 weeks)

**Scope**:
- **Included**: Email-based password reset for registered users with verified email addresses
- **Included**: Token-based reset link valid for 1 hour
- **Included**: Password complexity validation
- **Excluded**: SMS-based reset (future story: US-AUTH-007)
- **Excluded**: Social account recovery (Google, Apple) - not applicable
- **Excluded**: Support-initiated password reset (separate admin tool)

**User Persona**:
"Alice, Busy Professional" - 35 years old, shops online weekly, uses password manager but occasionally forgets master password. Values speed and security equally. Mobile-first user (70% of interactions on mobile).

---

### Supporting Information

**User Journey**:
This story fits at the "Account Access Problem" step in the user journey. User realizes they forgot password at Login → Clicks "Forgot Password?" → Receives email → Resets password → Resumes shopping.

**Frequency**:
Estimated 200 requests per week (4% of weekly logins), concentrated during holiday shopping seasons (300+ per week in November/December).

**Current Workaround**:
Users email support@example.com or use live chat. Average response time: 2-4 hours. Process is manual: support agent verifies identity via security questions, then manually resets password and emails user. 60% of users abandon and don't complete the support flow.

---

## Acceptance Criteria

**INVEST Check** (Is this story ready?):

- ✅ **Independent**: No dependencies on other in-sprint stories (US-AUTH-001 already complete)
- ✅ **Negotiable**: Implementation details (token storage, email template) can be refined during development
- ✅ **Valuable**: Delivers measurable business value ($170K/year cost savings + revenue recovery)
- ✅ **Estimable**: Team estimated at 5 story points with high confidence
- ✅ **Small**: Can complete in one 2-week sprint (5 points within team velocity of 20-25 points/sprint)
- ✅ **Testable**: Clear pass/fail criteria for each acceptance criterion

---

### Criterion 1: Request Password Reset

**Given** I am on the login page and forgot my password
**When** I click the "Forgot Password?" link
**Then** I am redirected to the password reset request page
**And** I see a form with an email address input field
**And** I see a "Send Reset Link" button
**And** I see help text: "Enter your email address and we'll send you a link to reset your password"

---

### Criterion 2: Submit Valid Email Address

**Given** I am on the password reset request page
**When** I enter my registered email address "alice@example.com" and click "Send Reset Link"
**Then** I see a success message: "If that email address is in our system, you'll receive a password reset link within 5 minutes. Check your spam folder if you don't see it."
**And** I receive an email within 2 minutes with subject "Reset Your Password"
**And** the email contains a password reset link valid for 1 hour
**And** the email contains my account email address (for verification)
**And** the email contains a "If you didn't request this, ignore this email" disclaimer
**And** the reset link format is: `https://example.com/reset-password?token={secure_token}`

**Quality Note**: Success message is intentionally vague (doesn't confirm email exists) to prevent account enumeration attacks.

---

### Criterion 3: Submit Unregistered Email Address

**Given** I am on the password reset request page
**When** I enter an email address that is NOT registered in the system
**Then** I see the same success message as Criterion 2 (security: don't reveal whether email exists)
**And** NO email is sent
**And** a security log entry is created with the attempted email and IP address

**Quality Note**: This prevents attackers from discovering which email addresses have accounts (account enumeration vulnerability).

---

### Criterion 4: Invalid Email Format

**Given** I am on the password reset request page
**When** I enter an invalid email format (e.g., "notanemail") and click "Send Reset Link"
**Then** I see an inline error message: "Please enter a valid email address"
**And** the email field is highlighted in red
**And** the form does not submit

---

### Criterion 5: Reset Password via Email Link (Happy Path)

**Given** I received a password reset email
**When** I click the reset link within 1 hour
**Then** I am redirected to the password reset form page
**And** I see two password input fields: "New Password" and "Confirm New Password"
**And** I see password requirements:
  - At least 8 characters
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character (!@#$%^&*)
**And** I see a "Reset Password" button

---

### Criterion 6: Set New Password Successfully

**Given** I am on the password reset form page with a valid token
**When** I enter "NewSecurePass123!" in both password fields and click "Reset Password"
**Then** my password is updated to the new password
**And** I see a success message: "Your password has been reset successfully. You can now log in."
**And** I am redirected to the login page after 3 seconds (with countdown)
**And** I receive a confirmation email: "Your password was changed"
**And** all my existing sessions are invalidated (logged out from all devices)
**And** the reset token is marked as used and cannot be reused

---

### Criterion 7: Password Complexity Validation

**Given** I am on the password reset form page
**When** I enter a password that does not meet complexity requirements (e.g., "password")
**Then** I see specific inline error messages for each failed requirement:
  - ❌ "Must contain at least one uppercase letter"
  - ❌ "Must contain at least one number"
  - ❌ "Must contain at least one special character"
**And** the "Reset Password" button remains disabled
**And** the form does not submit

**When** I correct the password to meet all requirements (e.g., "Password123!")
**Then** all error messages disappear
**And** all requirements show green checkmarks
**And** the "Reset Password" button becomes enabled

---

### Criterion 8: Password Mismatch

**Given** I am on the password reset form page
**When** I enter "Password123!" in the "New Password" field and "DifferentPassword123!" in "Confirm Password" field
**Then** I see an error message: "Passwords do not match"
**And** the form does not submit

---

### Criterion 9: Expired Reset Token

**Given** I received a password reset email over 1 hour ago
**When** I click the reset link
**Then** I am redirected to an error page
**And** I see the message: "This password reset link has expired. Password reset links are valid for 1 hour."
**And** I see a "Request New Reset Link" button
**And** clicking the button redirects me to the password reset request page

---

### Criterion 10: Already-Used Reset Token

**Given** I have already successfully reset my password using a reset token
**When** I try to use the same reset link again (token reuse attempt)
**Then** I am redirected to an error page
**And** I see the message: "This password reset link has already been used. For security, each link can only be used once."
**And** I see a "Request New Reset Link" button

---

### Criterion 11: Rate Limiting

**Given** I have requested 5 password reset emails in the last hour
**When** I try to request a 6th reset email
**Then** I see an error message: "Too many password reset requests. Please wait 1 hour before trying again, or contact support if you need immediate assistance."
**And** no email is sent
**And** a security log entry is created flagging potential abuse

**Quality Note**: Rate limiting prevents attackers from flooding user inboxes with reset emails (denial of service / harassment attack).

---

### Acceptance Criteria Checklist

- ✅ All happy path scenarios covered (Criteria 1, 2, 5, 6)
- ✅ Edge cases and boundary conditions defined (Criteria 3, 9, 10, 11)
- ✅ Error handling specified (Criteria 4, 7, 8)
- ✅ Performance expectations stated (email within 2 minutes, page loads within 2 seconds)
- ✅ Security requirements included (token expiry, rate limiting, account enumeration prevention)
- ✅ Accessibility requirements specified (keyboard navigation, WCAG 2.1 AA - see NFRs below)

---

## Non-Functional Requirements

### Performance

- **Response Time**: Password reset request page loads within 2 seconds (p95)
- **Email Delivery**: Reset email sent within 2 minutes of request (p99)
- **Token Validation**: Reset link validation completes within 500ms (p95)
- **Throughput**: Support 100 concurrent password reset requests without degradation

### Security

- **Token Cryptography**: Reset tokens must be cryptographically secure (256-bit entropy, generated via `crypto.randomBytes(32)`)
- **Token Storage**: Tokens stored hashed in database (SHA-256), never in plaintext
- **Token Expiry**: Tokens expire after 1 hour (3600 seconds), enforced server-side
- **Token Single-Use**: Each token can only be used once; mark as used after successful reset
- **Rate Limiting**: 5 reset requests per email per hour, 20 requests per IP per hour
- **Account Enumeration Prevention**: Same success message regardless of email existence
- **Session Invalidation**: All existing user sessions terminated after password change
- **Audit Logging**: All reset requests, successes, failures logged with timestamp, IP, user agent
- **HTTPS Only**: All password reset pages must use HTTPS (redirect HTTP to HTTPS)

### Usability

- **User Experience**:
  - Clear, actionable error messages (no technical jargon)
  - Password strength indicator (visual feedback: weak/medium/strong)
  - Show/hide password toggle on password fields
- **Accessibility**:
  - WCAG 2.1 Level AA compliant
  - Keyboard navigable (tab order: email field → button → link)
  - Screen reader compatible (proper ARIA labels)
  - Color contrast ratio ≥ 4.5:1 for all text
- **Mobile**:
  - Touch-friendly on screens ≥ 320px wide
  - Email field uses `type="email"` for mobile keyboard optimization
  - No pinch/zoom required (responsive design)

### Reliability

- **Uptime**: Password reset service must have 99.9% uptime (same as authentication service)
- **Error Handling**:
  - Graceful degradation if email service is down (queue email, retry 3 times)
  - Display fallback message: "We're having trouble sending emails. Please try again in a few minutes or contact support."
- **Monitoring**: Alert if email delivery failure rate > 5% or latency > 5 minutes

### Compliance

- **GDPR**:
  - User can reset password without contacting support (data access control)
  - Password reset emails sent only to verified email addresses
  - Reset tokens and logs deleted after 90 days
- **PCI DSS**:
  - Password complexity requirements meet PCI DSS 8.2.3
  - Session invalidation meets PCI DSS 8.2.4
- **CAN-SPAM**:
  - Password reset emails include unsubscribe link (for non-transactional email footer)
  - Physical mailing address in email footer

---

## Dependencies

### Upstream Dependencies

- **`US-AUTH-001`** (User Authentication): COMPLETED ✅
  - **Why needed**: Password reset depends on existing user accounts and authentication infrastructure

- **`TECH-019`** (Email Service Integration): COMPLETED ✅
  - **Why needed**: Sending password reset emails requires functioning email service (SendGrid integration)

- **`US-AUTH-002`** (Email Verification): COMPLETED ✅
  - **Why needed**: Password reset only sent to verified email addresses

### Downstream Impact

- **`US-AUTH-007`** (SMS-Based Password Reset): DEPENDS ON THIS STORY
  - **How**: SMS reset will reuse token generation and validation logic

- **`US-SUPPORT-012`** (Support Dashboard - Account Recovery): DEPENDS ON THIS STORY
  - **How**: Support agents will use same password reset mechanism for manual resets

### External Dependencies

- **SendGrid Email Service**: Production dependency
  - **Status**: Operational, 99.95% uptime SLA
  - **Risk**: Low (fallback: AWS SES configured as backup)

- **Redis Token Store**: Production dependency
  - **Status**: Operational, Redis cluster with replication
  - **Risk**: Low (auth service already depends on Redis)

---

## Technical Considerations

**Note**: This section provides guidance and context, not prescriptive solutions. Implementation team determines specific approaches.

### Integration Points

**Systems**:
- Authentication service (user lookup, password hashing)
- Email service (SendGrid API for reset emails)
- Redis (token storage with TTL)
- PostgreSQL (user accounts, audit logs)

**Data**:
- **Read**: User account (email, hashed password, verification status)
- **Write**: New hashed password in `users` table
- **Create**: Reset token in Redis with TTL
- **Create**: Audit log entries in `password_reset_logs` table
- **Delete**: All user sessions from Redis on password change

**APIs**:
- `POST /api/auth/password-reset/request` - Request reset email
- `GET /api/auth/password-reset/validate?token={token}` - Validate token before showing form
- `POST /api/auth/password-reset/confirm` - Submit new password

### Implementation Guidance

**Backend**:

Token Generation:
```typescript
// Generate cryptographically secure token
const token = crypto.randomBytes(32).toString('hex'); // 64-character hex string
const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

// Store hashed token in Redis with 1-hour TTL
await redis.setex(`password_reset:${tokenHash}`, 3600, JSON.stringify({
  user_id: user.id,
  email: user.email,
  created_at: Date.now(),
  ip_address: req.ip
}));

// Send unhashed token via email (one-time use)
await sendEmail({
  to: user.email,
  subject: 'Reset Your Password',
  resetLink: `https://example.com/reset-password?token=${token}`
});
```

Password Update:
```typescript
// Validate token, hash new password, invalidate sessions
const tokenData = await redis.get(`password_reset:${tokenHash}`);
if (!tokenData) {
  throw new Error('Invalid or expired token');
}

const newPasswordHash = await bcrypt.hash(newPassword, 12);
await db.users.update({ id: tokenData.user_id }, { password_hash: newPasswordHash });

// Invalidate all sessions
await redis.del(`sessions:user:${tokenData.user_id}`);

// Mark token as used
await redis.del(`password_reset:${tokenHash}`);
```

**Frontend**:
- Use React/Vue form with real-time password strength indicator
- Debounce password validation (wait 300ms after user stops typing)
- Show/hide password toggle (Material UI eye icon)
- Loading states during API calls
- Success/error toast notifications

**Testing**:
- **Unit tests**: Token generation, password validation, rate limiting logic
- **Integration tests**: Full reset flow (request → email → reset → login)
- **E2E tests**: Selenium/Cypress tests for user flows
- **Security tests**: Token reuse, expired token, rate limit enforcement

### Constraints

**Platform**:
- Browsers: Chrome, Firefox, Safari, Edge (latest 2 versions)
- Mobile: iOS Safari, Android Chrome
- Responsive: 320px to 1920px screen widths

**Technology**:
- Backend: Node.js 20+, Express.js
- Frontend: React 18+, Material UI
- Email: SendGrid API v3
- Token storage: Redis 7+

**Data**:
- Reset tokens: 64-character hex strings (256-bit entropy)
- Password hashes: bcrypt with cost factor 12
- Token TTL: 3600 seconds (1 hour)

**Legal**:
- GDPR Article 32 (security of processing)
- PCI DSS 8.2.3 (password complexity)
- CAN-SPAM Act (transactional email compliance)

### Risks

**Technical Risk**: Email deliverability
- **Risk**: Reset emails land in spam (10-15% typical spam rate)
- **Impact**: Users can't reset passwords, contact support (defeats purpose)
- **Mitigation**:
  - Use reputable email service (SendGrid) with good IP reputation
  - Implement DKIM, SPF, DMARC email authentication
  - Provide "Check spam folder" hint in success message
  - Add "Didn't receive email?" link to resend

**Security Risk**: Token guessing
- **Risk**: Attacker tries to brute-force reset tokens
- **Impact**: Account takeover
- **Mitigation**:
  - 256-bit entropy (2^256 possible tokens = computationally infeasible to guess)
  - 1-hour expiry limits attack window
  - Rate limiting prevents rapid guessing
  - Tokens hashed in database (even if database leaked, tokens unusable)

**Usability Risk**: Password requirements too strict
- **Risk**: Users frustrated by complexity requirements, give up
- **Impact**: Abandoned resets, increased support tickets
- **Mitigation**:
  - Real-time password strength feedback (visual indicator)
  - Show requirements before user types (not just errors after)
  - Allow spaces in passwords (passphrases are strong and memorable)
  - UX testing with 5-10 users before launch

**Business Risk**: Support ticket increase during rollout
- **Risk**: Users confused by new process, contact support anyway
- **Impact**: Support costs don't decrease as expected
- **Mitigation**:
  - Clear help text and examples in UI
  - FAQ page linked from reset form: "How do I reset my password?"
  - Train support team on new self-service process
  - Monitor support tickets for common confusion points, iterate on UX

---

## Task Breakdown

**Total Estimated Hours**: 32h (matches 5 story points at team velocity of 6.5h/point)

### Backend Tasks

- [x] **TASK-AUTH-051**: Design reset token generation and storage schema - 3h
  - Owner: Backend Engineer
  - Output: Token schema, Redis key structure, API endpoint design doc

- [ ] **TASK-AUTH-052**: Implement `POST /api/auth/password-reset/request` endpoint - 4h
  - Owner: Backend Engineer
  - Output: API endpoint, token generation, email trigger

- [ ] **TASK-AUTH-053**: Implement `GET /api/auth/password-reset/validate` endpoint - 2h
  - Owner: Backend Engineer
  - Output: Token validation endpoint

- [ ] **TASK-AUTH-054**: Implement `POST /api/auth/password-reset/confirm` endpoint - 4h
  - Owner: Backend Engineer
  - Output: Password update logic, session invalidation, audit logging

- [ ] **TASK-AUTH-055**: Add rate limiting middleware - 3h
  - Owner: Backend Engineer
  - Output: Rate limiter (5/email/hour, 20/IP/hour)

### Frontend Tasks

- [ ] **TASK-AUTH-056**: Build password reset request form (email input) - 3h
  - Owner: Frontend Engineer
  - Output: React component, form validation, API integration

- [ ] **TASK-AUTH-057**: Build password reset form (new password + confirm) - 4h
  - Owner: Frontend Engineer
  - Output: React component, real-time validation, password strength indicator

- [ ] **TASK-AUTH-058**: Build error pages (expired token, used token) - 2h
  - Owner: Frontend Engineer
  - Output: React components, error handling

### Email + Testing Tasks

- [ ] **TASK-AUTH-059**: Design and implement password reset email template - 2h
  - Owner: Frontend Engineer + UX Designer
  - Output: HTML email template, SendGrid template configuration

- [ ] **TASK-AUTH-060**: Write unit tests for backend logic - 3h
  - Owner: Backend Engineer
  - Output: Jest tests for token generation, validation, password update

- [ ] **TASK-AUTH-061**: Write integration tests for reset flow - 3h
  - Owner: Test Engineer
  - Output: API integration tests (request → validate → confirm)

- [ ] **TASK-AUTH-062**: Write E2E tests for user flows - 4h
  - Owner: Test Engineer
  - Output: Cypress tests for full reset flows (happy + error paths)

### Documentation + Review

- [ ] **TASK-AUTH-063**: Update API documentation - 1h
  - Owner: Technical Writer
  - Output: OpenAPI spec for 3 new endpoints

- [ ] **TASK-AUTH-064**: Code review and refinement - 2h
  - Owner: Technical Lead
  - Output: Approved pull request

---

## Notes & Attachments

### Conversation Log

- **2026-01-10**: Initial story drafted by Product Owner
- **2026-01-15**: Security Auditor added security NFRs (token expiry, rate limiting, audit logging)
- **2026-01-18**: Refined with team during backlog grooming, estimated at 5 points
- **2026-01-22**: UX Designer added wireframes, simplified password requirements after user testing
- **2026-01-25**: Technical Lead confirmed Redis token storage approach (ADR-006 created)

### Attachments

- **Wireframes**: `@.aiwg/ux/wireframes/password-reset-flow.fig` - Figma designs for all screens
- **Email Template**: `@.aiwg/ux/email-templates/password-reset.html` - Draft email design
- **User Research**: `@.aiwg/ux/research/password-reset-usability-test.md` - Findings from 5 user tests
- **API Contract**: `@.aiwg/api/specs/auth-password-reset-openapi.yaml` - OpenAPI 3.0 spec
- **Architecture Decision**: `@.aiwg/architecture/decisions/ADR-006-password-reset-tokens.md` - Token design ADR

### Open Questions

- [x] **Q1**: Should reset links work multiple times within 1 hour, or single-use only?
  - **Resolved**: Single-use for security (prevents token reuse after device compromise)
  - **Date**: 2026-01-18

- [x] **Q2**: What should rate limit be? 5 per hour too strict?
  - **Resolved**: 5 per email per hour is appropriate (prevents abuse), user can contact support if legitimate need
  - **Date**: 2026-01-18

- [x] **Q3**: Should we support "security question" alternative for users without email access?
  - **Resolved**: No, security questions are weak (easily guessable). User must contact support if lost email access.
  - **Date**: 2026-01-20

- [ ] **Q4**: Should password reset invalidate only web sessions, or mobile app sessions too?
  - **Pending**: Technical investigation of mobile app session architecture
  - **Assigned to**: Mobile Lead
  - **Target date**: 2026-02-05

---

## Definition of Ready

- ✅ Story statement clear, complete, follows "As a... I want... So that..." format
- ✅ Acceptance criteria defined (11 criteria), testable, unambiguous
- ✅ Story sized: 5 story points (team consensus)
- ✅ Dependencies identified and resolved (US-AUTH-001, TECH-019 both complete)
- ✅ NFRs documented (performance, security, usability, reliability, compliance)
- ✅ Team reviewed, estimated, asked clarifying questions (backlog grooming 2026-01-18)
- ✅ Product Owner confirmed priority (High) and business value ($170K/year)
- ✅ No open questions remain that block implementation (Q4 doesn't block MVP)
- ✅ Story is small enough for one sprint (5 points within 20-25 point velocity)

---

## Definition of Done

### Code Completion

- [ ] All acceptance criteria met (11/11 passing)
- [ ] Code follows team coding standards (ESLint, Prettier, TypeScript strict mode)
- [ ] Code peer-reviewed and approved (minimum 2 reviewers: Backend Lead + Security Auditor)
- [ ] No critical or high-severity code review findings
- [ ] Code merged to `main` branch

### Testing

- [ ] Unit tests pass with ≥80% coverage for new code (target: 90%+)
- [ ] Integration tests pass (full reset flow validated)
- [ ] E2E tests pass (Cypress tests for all user flows)
- [ ] Security tests pass (token reuse, expiry, rate limiting)
- [ ] Manual QA testing completed (QA engineer sign-off)
- [ ] No high or critical severity defects remain

### Documentation

- [ ] Code comments added for complex logic (token generation, rate limiting)
- [ ] API documentation updated (OpenAPI spec published to developer portal)
- [ ] User-facing help article created ("How to reset your password")
- [ ] Release notes updated with user-visible feature announcement

### Deployment & Acceptance

- [ ] Feature deployed to staging environment
- [ ] Smoke tests pass in staging (password reset end-to-end)
- [ ] Product Owner reviewed and accepted in staging
- [ ] Deployed to production (canary: 5% traffic for 24h)
- [ ] Production monitoring shows no errors (email delivery rate ≥95%, latency <2s)
- [ ] No regression in existing authentication functionality
- [ ] Story marked "Done" in Jira

### Additional Criteria (Security)

- [ ] Security audit passed (Security Auditor review)
- [ ] Penetration testing passed (no token guessing, no account enumeration)
- [ ] GDPR compliance verified (data access control requirement met)
- [ ] PCI DSS compliance verified (password complexity requirements met)

---

## Why This Example is Effective

### INVEST Adherence
- **Independent**: No in-sprint dependencies, can be developed in isolation
- **Negotiable**: Implementation details flexible (token storage, email service choice)
- **Valuable**: Quantified value ($170K/year), clear user benefit
- **Estimable**: Team estimated confidently (5 points, 32 hours)
- **Small**: Fits in one sprint (5 of 20-25 points)
- **Testable**: 11 clear acceptance criteria, all have pass/fail conditions

### Comprehensive Acceptance Criteria
- 11 criteria covering happy path, edge cases, errors, security
- Gherkin syntax (Given/When/Then) makes criteria unambiguous
- Includes quality annotations explaining security decisions

### Security Rigor
- Addresses account enumeration, token guessing, rate limiting, CSRF
- References compliance requirements (GDPR, PCI DSS)
- Security NFRs are specific and testable

### Realistic Sizing
- Task breakdown totals 32 hours across backend, frontend, testing, docs
- Matches 5 story points at team velocity of 6.5h/point
- Tasks are right-sized (2-4 hours each), not too granular or too large

### Business Context
- Quantified problem ($50K support costs, $120K abandoned carts)
- Clear stakeholder interests (users, support, security, compliance)
- Downstream impact identified (SMS reset, support dashboard depend on this)

### Traceability
- Links to epic, feature, requirements, ADRs, tasks, test cases
- References wireframes, research, API specs
- Conversation log shows evolution of story through refinement

---

## Anti-Patterns Avoided

### ❌ Vague Acceptance Criteria
**Bad**: "User can reset password"
**Good**: 11 specific criteria with Given/When/Then format, covering happy path + 7 error scenarios

### ❌ Missing Security Considerations
**Bad**: No mention of token expiry, rate limiting, or session invalidation
**Good**: Comprehensive security NFRs, token design (256-bit entropy, SHA-256 hashing), rate limits (5/hour)

### ❌ Unrealistic Estimation
**Bad**: "2 points" for a feature requiring email service, token management, rate limiting, etc.
**Good**: "5 points" based on detailed task breakdown (32 hours), team consensus

### ❌ No Dependencies Identified
**Bad**: Starting implementation without verifying email service is integrated
**Good**: Explicit upstream dependencies (US-AUTH-001, TECH-019), confirmed as complete

### ❌ No Business Value
**Bad**: "We need password reset because other sites have it"
**Good**: Quantified value: $50K support cost reduction + $120K abandoned cart recovery

---

**Story Version**: 1.3
**Template Version**: 1.1
**Example Author**: Requirements Analyst + Product Owner
**Last Updated**: 2026-01-28
**Quality Review**: Passed (Security Auditor, Technical Lead, Test Architect)
