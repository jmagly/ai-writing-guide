# Use-Case Specification Template

## Purpose

Detail the interactions between actors and the system to fulfill specific goals. Use this template to inform analysis,
design, testing, and traceability matrices.

## Ownership & Collaboration

- Document Owner: System Analyst
- Contributor Roles: Business Process Analyst, Test Architect, Designer
- Automation Inputs: Approved personas, business use-case spec, stakeholder walkthroughs
- Automation Outputs: `use-case-<id>.md` with main and alternate flows

## Phase 1: Core (ESSENTIAL)

Complete these fields immediately when creating a use case:

### Use-Case Identifier and Name

- **ID**: `UC-###` (e.g., UC-042)

<!-- EXAMPLE: UC-042 - User Login via Email/Password -->

- **Name**: Descriptive name that clearly identifies the goal

<!-- EXAMPLE: "Authenticate User via Email and Password" -->
<!-- ANTI-PATTERN: "Login" (too vague) -->

### Primary Actor(s)

**Actor**: [Role or user type initiating this use case]

<!-- EXAMPLE: Registered User attempting to access their account -->

**Goal**: [What the actor wants to achieve]

<!-- EXAMPLE: Securely access personalized dashboard to view account information -->

### Scope and Level

- **Scope**: [What system/subsystem does this use case cover?]

<!-- EXAMPLE: Authentication Service, User Dashboard -->

- **Level**: [user goal | subfunction | summary]

<!-- EXAMPLE: user goal -->

### Preconditions

List conditions that must be true before this use case can begin:

<!-- EXAMPLE:
- User has a registered account with verified email
- User is not currently authenticated
- System is operational and accessible
-->

- [Precondition 1]
- [Precondition 2]

### Trigger

**Event**: [What event or action starts this use case?]

<!-- EXAMPLE: User navigates to the login page and submits email/password -->
<!-- ANTI-PATTERN: "User wants to log in" (describes intent, not trigger event) -->

## Phase 2: Flow Details (EXPAND WHEN READY)

<details>
<summary>Click to expand flow scenarios and variations</summary>

### Main Success Scenario

The primary happy path from trigger to success:

1. [Step 1: Actor action or system response]
2. [Step 2: Next action in sequence]
3. [Step 3: Continue until goal achieved]

<!-- EXAMPLE:
1. User navigates to the login page (https://example.com/login)
2. User enters registered email address in the "Email" field
3. User enters password in the "Password" field
4. User clicks "Sign In" button
5. System validates email format and password presence
6. System queries user database for matching credentials
7. System verifies password hash matches stored value
8. System generates session token (JWT) with 24-hour expiration
9. System sets secure, HTTP-only session cookie
10. System redirects user to personalized dashboard (/dashboard)
11. User sees welcome message with their name
-->

### Alternate Flows

Variations from the main path that still achieve the goal:

#### Alternate Flow: [Name]

**Branch Point**: After step [N] of Main Success Scenario

**Condition**: [What triggers this alternate path?]

<!-- EXAMPLE:
**Branch Point**: After step 4 of Main Success Scenario
**Condition**: User selects "Remember Me" checkbox before clicking "Sign In"
-->

**Steps**:
1. [Alternate step 1]
2. [Alternate step 2]
3. [Rejoin main flow at step X or conclude]

<!-- EXAMPLE:
1. System generates long-lived session token (30 days)
2. System sets persistent cookie with extended expiration
3. Rejoin main flow at step 10 (redirect to dashboard)
-->

### Exception Flows

Error conditions and how the system handles them:

#### Exception: [Error Name]

**Condition**: [What error or exceptional condition occurs?]

<!-- EXAMPLE:
**Condition**: User enters invalid email/password combination
-->

**Steps**:
1. [Error handling step 1]
2. [Recovery or termination]

<!-- EXAMPLE:
1. System displays error message: "Invalid email or password"
2. System increments failed login attempt counter for this account
3. System clears password field but preserves email field
4. User can retry (maximum 5 attempts within 15 minutes)
5. If 5 attempts exceeded: System locks account for 15 minutes and displays "Account temporarily locked due to multiple failed attempts. Try again in 15 minutes."
-->

</details>

## Phase 3: Technical & Acceptance Details (ADVANCED)

<details>
<summary>Click to expand technical specifications and acceptance criteria</summary>

### Postconditions

**On Success**:
- [State of system after successful completion]

<!-- EXAMPLE:
- User session created with valid JWT token
- User authenticated and authorized to access protected resources
- Last login timestamp updated in user profile
- Failed login attempt counter reset to zero
- User redirected to appropriate landing page based on role
-->

**On Failure**:
- [State of system after exception or error]

<!-- EXAMPLE:
- No session created
- User remains unauthenticated
- Failed attempt counter incremented
- Account locked if threshold exceeded
-->

### Stakeholders and Interests

**Stakeholder**: [Role or group]
**Interest**: [What they care about in this use case]

<!-- EXAMPLE:
**Stakeholder**: Security Team
**Interest**: Ensure authentication follows security best practices (password hashing, rate limiting, account lockout)

**Stakeholder**: Support Team
**Interest**: Clear error messages that reduce support tickets, self-service account recovery

**Stakeholder**: End Users
**Interest**: Fast, reliable login that remembers them on trusted devices
-->

### Special Requirements

Non-functional requirements specific to this use case:

#### Performance
- [Response time, throughput expectations]

<!-- EXAMPLE:
- Login request completes within 2 seconds under normal load
- System handles 100 concurrent login requests without degradation
-->

#### Security
- [Security constraints or requirements]

<!-- EXAMPLE:
- Passwords hashed with bcrypt (cost factor 12)
- Session tokens cryptographically secure (256-bit entropy)
- HTTPS required for all authentication endpoints
- Rate limiting: max 5 attempts per 15 minutes per account
-->

#### Usability
- [User experience requirements]

<!-- EXAMPLE:
- Error messages clear and actionable
- Password field masked with option to reveal
- Email field remembers previous entry (browser autocomplete)
-->

#### Reliability
- [Availability, error handling expectations]

<!-- EXAMPLE:
- Authentication service 99.9% uptime
- Graceful degradation if user database unavailable
-->

### Related Business Rules

Reference any business rules or policies:

- [Rule or policy and how it affects this use case]

<!-- EXAMPLE:
- BR-SEC-001: Passwords must meet complexity requirements (8+ chars, 1 uppercase, 1 number, 1 special char)
- BR-SEC-002: Accounts locked after 5 failed attempts within 15 minutes
- BR-GDPR-003: Login activity logged for security audit (retained 90 days)
-->

### Data Requirements

**Inputs**:
- [Data required from actor or other systems]

<!-- EXAMPLE:
- User-provided email (string, valid email format, max 255 chars)
- User-provided password (string, 8-255 chars)
- Optional: "Remember Me" flag (boolean)
-->

**Outputs**:
- [Data produced or updated by this use case]

<!-- EXAMPLE:
- Session token (JWT, 256 bytes, 24-hour expiration)
- User profile data (name, role, preferences)
- Last login timestamp (ISO 8601 datetime)
-->

**Validation**:
- [Data validation rules]

<!-- EXAMPLE:
- Email: must match RFC 5322 format, case-insensitive comparison
- Password: minimum 8 characters, no leading/trailing whitespace
- Failed attempt counter: integer, range 0-5
-->

### Acceptance Criteria

Testable criteria that define "done":

- [ ] [Criterion 1: Happy path behavior]
- [ ] [Criterion 2: Alternate flow behavior]
- [ ] [Criterion 3: Error handling]
- [ ] [Criterion 4: Non-functional requirement met]

<!-- EXAMPLE:
- [ ] User can successfully log in with valid email/password
- [ ] Invalid credentials show clear error message
- [ ] Account locks after 5 failed attempts within 15 minutes
- [ ] Login completes within 2 seconds under normal load
- [ ] Session expires after 24 hours of inactivity
- [ ] "Remember Me" extends session to 30 days
- [ ] Locked account displays time remaining until unlock
- [ ] Password field is masked by default with reveal option
- [ ] HTTPS enforced for login endpoint (HTTP redirects to HTTPS)
-->

### Open Issues and TODOs

Track unresolved questions or decisions:

- [ ] [Open question or decision needed]

<!-- EXAMPLE:
- [ ] Should we support social login (Google, Facebook) in this use case or separate?
- [ ] Clarify: Does account lockout apply per IP address or per account globally?
- [ ] Decision needed: Do we send email notification on failed login attempts?
- [ ] TODO: Define specific error codes for different failure scenarios
-->

</details>

## References

Wire @-mentions for traceability:

- @.aiwg/architecture/software-architecture-doc.md - Architecture context
- @src/auth/login.ts - Implementation (when complete)
- @test/integration/auth/login.test.ts - Test coverage
- @.aiwg/requirements/nfr-modules/security.md - Security requirements
- @.aiwg/requirements/nfr-modules/performance.md - Performance requirements

## Completion Checklist

Before marking this use case as complete:

- [ ] All Phase 1 (ESSENTIAL) fields completed
- [ ] Main success scenario fully detailed with numbered steps
- [ ] All alternate flows identified and documented
- [ ] Exception flows include error handling and recovery
- [ ] Acceptance criteria are testable and unambiguous
- [ ] Non-functional requirements specified
- [ ] Open issues tracked or resolved
- [ ] @-mentions wired for traceability

## Agent Notes

- Use consistent numbering for steps; include actor names to clarify responsibility
- Keep language testable—statements should translate to acceptance criteria
- Sync updates with QA to ensure tests reflect the latest flows
- Verify the Automation Outputs entry is satisfied before signaling completion
- Progressive disclosure: Focus on Phase 1 during inception, expand Phases 2-3 during elaboration

## Related Templates

- @agentic/code/frameworks/sdlc-complete/templates/requirements/user-story-card.md - For Agile user stories
- @agentic/code/frameworks/sdlc-complete/templates/test/use-case-test-card.md - Test cases derived from use case
- @agentic/code/frameworks/sdlc-complete/templates/analysis-design/use-case-realization-template.md - Design realization
