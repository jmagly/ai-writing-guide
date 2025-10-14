# Technical Writing Examples

## Good vs. Bad Examples

### Example 1: System Architecture Description

#### ❌ Bad (AI-typical)

> "Our cutting-edge microservices architecture seamlessly integrates multiple components to deliver a comprehensive solution. Furthermore, this innovative approach dramatically improves scalability while maintaining robust performance. The system plays a crucial role in enabling transformative digital experiences."

#### ✅ Good (Human expert)

> "We split the monolith into 12 services. Each handles one thing: payments, auth, inventory, etc. Kubernetes orchestrates everything, though the complexity almost killed us in the beginning. Services talk through gRPC - picked it over REST for the binary protocol efficiency. Gets us 10K requests/second on moderate hardware."

### Example 2: Performance Improvement

#### ❌ Bad (AI-typical)

> "Through the implementation of advanced optimization techniques, we achieved significant performance improvements. Moreover, these enhancements underscore the importance of comprehensive performance tuning in modern applications. The results demonstrate a transformative impact on user experience."

#### ✅ Good (Human expert)

> "Page loads took 8 seconds. Unacceptable. Profiling showed N+1 queries everywhere - junior dev mistake we should've caught in review. Added eager loading, implemented Redis caching for user sessions, and moved static assets to CDN. Now loads in 1.2 seconds. Still not great, but users stopped complaining."

### Example 3: Technology Choice

#### ❌ Bad (AI-typical)

> "After careful consideration of various options, we selected MongoDB as our database solution. This innovative NoSQL platform seamlessly integrates with our stack and provides the flexibility needed for our evolving requirements. Furthermore, it offers robust scalability to support our growth trajectory."

#### ✅ Good (Human expert)

> "Chose MongoDB because the data was heavily nested JSON and kept changing shape. SQL would've meant constant migrations. Yes, we gave up ACID transactions. Yes, we hit consistency issues. But development velocity improved 3x and that's what the startup needed. Would I use it for a bank? Hell no."

### Example 4: Project Outcome

#### ❌ Bad (AI-typical)

> "The project was a resounding success, delivering transformative value to stakeholders. Our comprehensive approach ensured all objectives were met while maintaining the highest quality standards. This achievement underscores our commitment to excellence and innovation."

#### ✅ Good (Human expert)

> "Launched two weeks late but hit all the requirements. The real-time features work but eat CPU - we're burning through our AWS credits faster than expected. Customer support tickets dropped 40% though, so product's calling it a win. Next quarter we'll optimize or the CFO will kill us."

## Patterns in Good Writing

### Specific Technical Details

- Names technologies explicitly (gRPC, Redis, Kubernetes)
- Includes version numbers when relevant
- Mentions specific metrics (10K requests/second)
- Describes actual implementation choices


### Admits Reality

- "almost killed us"
- "junior dev mistake"
- "Still not great"
- "burning through AWS credits"


### Shows Trade-offs

- "gave up ACID transactions"
- "hit consistency issues"
- "Would I use it for a bank? Hell no"


### Natural Voice

- Fragments: "Unacceptable."
- Questions: "Would I use it for a bank?"
- Opinions: "junior dev mistake we should've caught"
- Context: "that's what the startup needed"


## Before/After Rewrites

### Describing a Migration

**Before (AI):**
> "We successfully executed a comprehensive migration strategy that seamlessly transitioned our legacy systems to a modern cloud-native architecture. This transformative initiative dramatically improved system reliability while reducing operational costs."

**After (Human):**
> "Migrated from on-prem to AWS over 6 months. Lifted-and-shifted first (yeah, not ideal) then refactored the critical paths. Uptime went from 98% to 99.9%. AWS bill is $30K/month vs. $45K for the data center, but that doesn't count the two DevOps engineers we had to hire."

### Explaining a Feature

**Before (AI):**
> "Our innovative real-time collaboration feature leverages cutting-edge WebSocket technology to deliver seamless synchronization across multiple users, fundamentally transforming how teams work together."

**After (Human):**
> "Built real-time collaboration using WebSockets. Phoenix channels on the backend, Redux for state management. Tricky part was handling conflicts - went with last-write-wins for MVP. Power users hate it but 90% don't notice. CRDT implementation is on the roadmap for Q3."

### Discussing Results

**Before (AI):**
> "The implementation yielded exceptional results, with metrics exceeding all projections. Moreover, user satisfaction increased dramatically, validating our comprehensive approach to solving this critical challenge."

**After (Human):**
> "Conversion increased 12% - half what we projected but still positive ROI. Mobile users love it. Desktop users keep asking for the old interface back. A/B test is still running but we're probably keeping it. Sometimes good enough is good enough."

## Key Differences to Notice

### AI Writing Characteristics:

- Always positive outcomes
- Vague descriptions
- Marketing language
- Perfect scenarios
- No specific technologies
- Formal transitions
- Everything is "seamless"


### Human Expert Characteristics:

- Mixed outcomes
- Specific tech stacks
- Honest trade-offs
- Real problems mentioned
- Exact numbers
- Natural transitions
- Things break, take time, cost money


## Practice Exercise

Try rewriting this AI-typical paragraph:

> "Our cutting-edge platform leverages innovative machine learning algorithms to deliver transformative insights. Furthermore, the comprehensive analytics dashboard seamlessly integrates with existing workflows, dramatically improving decision-making capabilities across the organization."

### Possible Human Rewrite:

> "We use scikit-learn for the ML models - nothing fancy, mostly random forests and logistic regression. The analytics dashboard pulls from Postgres and updates every 15 minutes. Tried real-time but it crushed the database. Executives like the charts. Data scientists complain it's too basic. Ship it anyway."

## Remember

The goal isn't to dumb down the content or remove all sophistication. It's to write like someone who actually built the thing, dealt with the problems, and made the trade-offs. Include the mess, the context, and the reality.
