# Requirements Analyst — Worked Examples

Externalized from the agent definition per the `few-shot-examples` rule (#1587).
Simple / moderate / complex few-shot examples for the Requirements Analyst agent.
The agent definition keeps one compact inline anchor; these are the full set.

## Few-Shot Examples

### Example 1: Simple - User Story Creation

**Input:**
"Create a user story for login functionality in our healthcare portal."

**Output:**
```markdown
# User Story: Healthcare Portal Login

**As a** healthcare provider
**I want to** log in with my NPI number and password
**So that** I can access patient records securely

## Acceptance Criteria

- [ ] Provider can enter NPI number and password
- [ ] System validates NPI against registry
- [ ] MFA required for all logins
- [ ] Session timeout after 15 minutes of inactivity
- [ ] Failed attempts trigger account lockout after 5 tries

## Non-Functional Requirements

- HIPAA-compliant audit logging
- Login must complete within 3 seconds
- Support for SSO via SAML 2.0

## Edge Cases

- Expired NPI number
- NPI format validation failure
- MFA device unavailable
- Concurrent sessions from different devices
```

**Why This Is Good:**
- Uses domain-specific terminology (NPI, HIPAA, SAML 2.0)
- Includes security requirements appropriate for healthcare
- Acceptance criteria are testable and specific
- Edge cases cover realistic failure scenarios

### Example 2: Moderate - Use Case with Alternative Flows

**Input:**
"Document the use case for a multi-step checkout process in our e-commerce platform that supports guest checkout, saved addresses, and multiple payment methods."

**Output:**
```markdown
# Use Case: UC-CHECKOUT-001 Multi-Step Checkout

## Primary Actor
Registered Customer or Guest Shopper

## Preconditions
- Cart contains at least one item
- All cart items are in stock
- User has reviewed cart contents

## Main Success Scenario
1. System displays shipping address form
2. User enters or selects saved shipping address
3. System validates address with USPS API
4. System calculates shipping options and displays costs
5. User selects shipping method
6. System displays payment options
7. User enters payment details or selects saved payment method
8. System tokenizes payment via Stripe
9. System displays order summary with itemized costs
10. User confirms order
11. System processes payment
12. System creates order record and sends confirmation email
13. System reduces inventory counts

## Alternative Flows

**AF-1: Guest Checkout**
- At step 2, guest enters address manually (no saved addresses)
- At step 7, guest must enter payment details (no saved methods)
- After step 12, system offers account creation with pre-filled data

**AF-2: Address Validation Failure**
- At step 3, USPS API returns "address not found"
- System displays suggested corrections
- User accepts suggestion or overrides with manual entry
- System logs override for fraud review

**AF-3: Payment Decline**
- At step 11, payment processor returns decline
- System displays specific error (insufficient funds, expired card, etc.)
- User can retry with same or different payment method
- After 3 consecutive declines, system suggests contacting bank

## Exception Flows

**EF-1: Inventory Changed During Checkout**
- At any step, background check detects item out of stock
- System notifies user with affected items highlighted
- User can remove item or select alternative
- Cart totals recalculate automatically

**EF-2: Session Timeout**
- After 30 minutes of inactivity, session expires
- Cart contents preserved for 7 days
- User redirected to login with return URL to checkout

## Postconditions
- Order created with unique order ID
- Payment authorized (captured on shipment)
- Inventory reserved
- Confirmation email sent within 60 seconds
- Order visible in user's order history (if registered)

## Non-Functional Requirements
- Checkout flow completes in <5 steps
- Page transitions <1 second
- Payment tokenization PCI DSS compliant
- Support 500 concurrent checkout sessions
```

**Why This Is Good:**
- Covers guest and registered user paths
- Alternative flows handle realistic edge cases
- Exception flows include inventory and session scenarios
- NFRs are quantified and measurable
- Postconditions define verifiable system state

### Example 3: Complex - Non-Functional Requirements Analysis

**Input:**
"Analyze and document the non-functional requirements for a real-time financial trading platform that must handle 100K orders per second with sub-millisecond latency, comply with SEC/FINRA regulations, and operate 24/5 with 99.999% uptime."

**Output:**
```markdown
# Non-Functional Requirements: Trading Platform

## NFR-PERF: Performance Requirements

### NFR-PERF-001: Order Processing Throughput
- **Requirement:** System MUST process ≥100,000 orders per second sustained
- **Peak:** System MUST handle 300,000 orders/sec for 15-minute bursts
- **Measurement:** Orders acknowledged end-to-end (receipt to exchange confirmation)
- **Test Method:** Load test with realistic order distribution (60% limit, 25% market, 15% stop)

### NFR-PERF-002: Latency
- **Requirement:** Order-to-acknowledgment latency MUST be <1ms at p99
- **Internal processing:** <100μs for order validation and risk check
- **Network:** <500μs to exchange gateway
- **Measurement:** Hardware timestamping at network interface
- **Test Method:** Latency histogram under sustained 100K orders/sec load

### NFR-PERF-003: Market Data Processing
- **Requirement:** Market data feed processing <50μs per tick
- **Throughput:** Handle 5M ticks/second across all instruments
- **Measurement:** Feed handler output timestamp vs input timestamp

## NFR-REL: Reliability Requirements

### NFR-REL-001: Availability
- **Requirement:** 99.999% uptime during trading hours (24/5)
- **Planned downtime:** ≤26 seconds/week (weekends only)
- **Recovery:** Automatic failover in <100ms
- **Measurement:** Trading session availability monitored per-second

### NFR-REL-002: Data Durability
- **Requirement:** Zero order loss under any single failure
- **Mechanism:** Synchronous replication to 3 data centers
- **RPO:** 0 (zero data loss)
- **RTO:** <100ms automatic failover

## NFR-SEC: Security Requirements

### NFR-SEC-001: Regulatory Compliance
- **SEC Rule 15c3-5:** Pre-trade risk controls on all orders
- **FINRA Rule 3110:** Supervisory system with audit trail
- **Reg SCI:** Systems compliance and integrity
- **SOX:** Financial reporting controls
- **Measurement:** Quarterly compliance audit, annual penetration test

### NFR-SEC-002: Access Control
- **Requirement:** Role-based access with trader/risk/compliance/admin roles
- **Authentication:** Hardware token MFA for all trading operations
- **Session:** Auto-lock after 5 minutes inactivity during trading hours
- **Audit:** Every action logged with microsecond timestamp, user ID, source IP

## NFR-SCALE: Scalability Requirements

### NFR-SCALE-001: Horizontal Scaling
- **Requirement:** Scale from 10K to 300K orders/sec without restart
- **Mechanism:** Partition by instrument symbol hash
- **Add capacity:** New matching engine instance online in <30 seconds
- **Rebalance:** Automatic partition rebalancing with zero downtime

## Traceability Matrix

| NFR ID | Regulation | Test Strategy | Priority |
|--------|------------|---------------|----------|
| NFR-PERF-001 | SEC 15c3-5 | Load test | Critical |
| NFR-PERF-002 | Market competitiveness | Latency benchmark | Critical |
| NFR-REL-001 | Reg SCI | Chaos engineering | Critical |
| NFR-REL-002 | FINRA 4370 | Failover drill | Critical |
| NFR-SEC-001 | SEC/FINRA | Compliance audit | Critical |
| NFR-SEC-002 | SOX | Penetration test | High |
| NFR-SCALE-001 | Business growth | Capacity test | High |

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Latency spike >1ms | Order rejection, revenue loss | Medium | Kernel bypass networking, FPGA acceleration |
| Data center failure | Trading halt | Low | 3-site active-active with <100ms failover |
| Regulatory change | Non-compliance penalty | Medium | Quarterly compliance review, modular rule engine |
| Capacity exceeded | Degraded service | Medium | Auto-scaling with 3x headroom, circuit breakers |
```

**Why This Is Good:**
- Each NFR has unique ID for traceability
- Requirements use RFC 2119 language (MUST, SHOULD)
- Quantified with specific measurable thresholds
- Includes test methods for each requirement
- Maps to specific regulations
- Risk assessment with concrete mitigations
- Covers performance, reliability, security, and scalability

