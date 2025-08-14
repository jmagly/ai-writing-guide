# Rewrite Exercises

## Exercise 1: The Corporate Update

### Original (AI-style):
> "We are thrilled to announce the successful deployment of our comprehensive cloud migration initiative. This transformative project seamlessly transitioned our entire infrastructure to AWS, dramatically improving system performance while simultaneously reducing operational costs. Furthermore, this achievement underscores our commitment to leveraging cutting-edge technology to deliver exceptional value to our stakeholders."

### Rewrite (Human expert):
> "Finished the AWS migration. Took 4 months instead of 2 because the legacy database connections were a nightmare. Performance is better - page loads dropped from 3s to 800ms. Monthly costs went from $50K on-prem to $35K cloud, though that doesn't include the contractor we hired to fix our terraform. Overall, worth it, but the 'lift and shift' part was definitely not as easy as AWS sales promised."

### Key Changes:
- Added timeline reality (4 months vs 2)
- Specific problem (legacy database)
- Real metrics (3s to 800ms, $50K to $35K)
- Hidden cost (contractor)
- Opinion about vendor promises

## Exercise 2: Feature Announcement

### Original (AI-style):
> "Our innovative new feature leverages advanced machine learning algorithms to provide unprecedented insights into user behavior. Moreover, this comprehensive analytics platform seamlessly integrates with existing workflows, empowering teams to make data-driven decisions with confidence."

### Rewrite (Human expert):
> "Built user behavior prediction using XGBoost. Nothing fancy - just feature engineering on clickstream data. Accuracy is around 72%, which beats our old rule-based system but isn't magic. Dumps results to a Postgres table that Tableau reads. Data team loves it. Product team says it's too technical. Such is life."

### Key Changes:
- Named specific technology (XGBoost)
- Admitted limitations (72% accuracy, "nothing fancy")
- Specific integration (Postgres → Tableau)
- Included team friction
- Added resignation about reality

## Exercise 3: Technical Architecture

### Original (AI-style):
> "Our robust microservices architecture enables unparalleled scalability and flexibility. Each service is meticulously designed to handle specific business functions, ensuring optimal performance and maintainability. This comprehensive approach facilitates rapid development and deployment cycles."

### Rewrite (Human expert):
> "Split into 8 microservices. Probably should've been 5 - auth and user could've stayed together. Each runs in its own container, talks via gRPC. The good: we can deploy payments without touching inventory. The bad: debugging across services is hell. Distributed tracing helps but our Jaeger setup needs work."

### Key Changes:
- Specific number (8 services)
- Admitted mistake (should've been 5)
- Technical specifics (containers, gRPC)
- Clear trade-offs (good vs bad)
- Current problem (Jaeger setup)

## Exercise 4: Project Success Story

### Original (AI-style):
> "The implementation was an unqualified success, exceeding all projected metrics and delivering transformative value across the organization. Stakeholders praised the seamless execution and comprehensive approach that ensured every requirement was met with excellence."

### Rewrite (Human expert):
> "Launched on time, which honestly surprised everyone. Hit 4 out of 5 KPIs - missed the mobile performance target because iOS Safari is weird with websockets. Sales is happy because conversions are up 15%. Engineering is stressed because we accumulated 3 months of technical debt to hit the deadline. Already planning the cleanup sprint."

### Key Changes:
- Honest surprise about success
- Specific failure (1 of 5 KPIs)
- Technical reason (iOS Safari websockets)
- Mixed stakeholder reactions
- Technical debt admission

## Exercise 5: Problem Solution

### Original (AI-style):
> "To address the scalability challenges, we implemented a comprehensive caching strategy that dramatically improved response times. This innovative solution leverages distributed caching mechanisms to ensure optimal performance across all user touchpoints."

### Rewrite (Human expert):
> "Database was melting under load. Slapped Redis in front of it. Cache hit rate is 85%, which bought us 6 months before we need to actually fix the query performance. Yes, it's a band-aid. No, we're not proud. But Black Friday is in 2 weeks and this will hold."

### Key Changes:
- Vivid problem description ("melting")
- Casual solution ("slapped Redis")
- Specific metric (85% hit rate)
- Admitted it's temporary
- Business context (Black Friday)

## Practice Exercises

### Try rewriting these:

#### 1. The Partnership Announcement
**AI-style**: "We're excited to announce a groundbreaking partnership that will revolutionize how businesses approach digital transformation. This strategic alliance combines our innovative platform with their industry-leading expertise to deliver unprecedented value."

**Your rewrite**: [Try it yourself - remember: specific names, what it actually does, why you partnered]

#### 2. The Performance Update
**AI-style**: "Through comprehensive optimization efforts, we've achieved remarkable improvements in system performance. These enhancements significantly reduce latency while dramatically increasing throughput, ensuring a superior user experience."

**Your rewrite**: [Include actual numbers, what you optimized, what still needs work]

#### 3. The New Hire
**AI-style**: "We're thrilled to welcome a seasoned professional who brings extensive expertise and innovative thinking to our team. Their proven track record of delivering transformative solutions will be invaluable as we continue our growth journey."

**Your rewrite**: [Who is it, what will they actually do, what problem does this solve]

## Rewriting Checklist

When rewriting AI content:

1. **Add specifics**: Numbers, names, technologies
2. **Add problems**: What broke, what's hard, what's annoying
3. **Add context**: Why this decision, what constraint existed
4. **Add opinion**: What you think, what you'd change
5. **Remove fluff**: Adjectives, transitions, summaries
6. **Vary structure**: Different sentence and paragraph lengths

## Common Patterns

### AI loves:
- Everything working perfectly
- Comprehensive solutions
- Transformative impacts
- Seamless integrations
- Exceeding expectations
- Delighting stakeholders

### Humans mention:
- Stuff that broke
- Temporary fixes
- Technical debt
- Team disagreements
- Time pressure
- Budget limits

## The Rewrite Test

After rewriting, ask:
1. Can I picture a specific person saying this?
2. Does it include at least one problem?
3. Are there specific technologies or numbers?
4. Does it sound like someone who actually did the work?
5. Would this appear in a Slack channel?

If you answered "no" to any, keep rewriting.

## Remember

The goal isn't to make the content worse or overly casual. It's to make it sound like it came from someone who actually lived through the project, dealt with the problems, and has opinions about what happened.

Real experience includes frustration, surprises, and imperfect solutions. That's what makes writing authentic.