# Product Metrics Catalog

## Purpose

Define metrics for measuring product value, user engagement, and business outcomes.

**Scope**: AARRR framework (Pirate Metrics), engagement, business health

**Target Audience**: Product Strategists, Vision Owners, Business Analysts, Metrics Analysts

**Critical Distinction**: Product metrics measure **user value and business outcomes**. Delivery metrics measure **engineering efficiency**. Both are necessary.

---

## Overview

Product metrics answer: **Is our product successful?**

**Categories**:

1. **AARRR (Pirate Metrics)** - Acquisition, Activation, Retention, Revenue, Referral
2. **Engagement Metrics** - How users interact with product
3. **Business Health** - Revenue, growth, unit economics
4. **North Star Metric** - Single metric capturing core value

**Philosophy**: Build-measure-learn loop. Ship features → measure impact → iterate.

---

## Why Product Metrics Matter in SDLC

**Problem**: Most SDLC frameworks focus on shipping features but ignore feature value.

**Evidence**:

- Project succeeds (on time, on budget, meets requirements)
- Product fails (users don't adopt, no business impact)

**Solution**: Integrate product metrics into iteration planning and assessment.

**SDLC Integration**:

- Business Case: Defines target product metrics
- Iteration Planning: Each iteration targets specific metric improvement
- Iteration Assessment: Evaluate feature delivery AND metric impact
- Transition Phase: Production metrics validate business case

---

## AARRR Framework (Pirate Metrics)

### Background

AARRR measures user journey stages:

1. **Acquisition**: How users discover product
2. **Activation**: First experience and "aha moment"
3. **Retention**: Users returning over time
4. **Revenue**: Monetization and unit economics
5. **Referral**: Viral growth and word-of-mouth

**Created by**: Dave McClure (500 Startups)

**Why It Matters**: Measures full user lifecycle, identifies drop-off points

---

## Stage 1: Acquisition Metrics

### Metric 1: User Signups

**Definition**: New user registrations per time period

**Why It Matters**: Growth indicator, top-of-funnel health

**Data Source**: Application database, authentication system

**Collection Method**:

```sql
SELECT DATE(created_at) AS signup_date, COUNT(*) AS signups
FROM users
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY signup_date
```

**Formula**: Count of new user records created in time period

**Segmentation**:

- By acquisition channel (organic, paid, referral, social)
- By user type (free, trial, paid)
- By geography

**Targets**:

- Early Growth: 10-20% week-over-week
- Mature Product: Stable with 5% variance
- Launch Phase: 100+ signups per week (varies by market)

**Thresholds**:

- Warning: Signups drop > 20% week-over-week
- Alert: Signups drop > 30%
- Investigation: Signup rate flat for 4 consecutive weeks

**Recommended Review Cadence**:

- Track: Daily
- Review: Weekly (identify trends)
- Deep Dive: Monthly (channel analysis)

**Related Metrics**:

- Traffic to signup conversion rate
- Cost per acquisition (CPA)
- Signup by channel

---

### Metric 2: Traffic to Signup Conversion Rate

**Definition**: Percentage of website visitors who create account

**Why It Matters**: Measures signup funnel efficiency

**Data Source**: Analytics tool (Google Analytics, Mixpanel, Amplitude) + application database

**Collection Method**:

```javascript
// Track page visits
analytics.page('Homepage', {
  visitor_id: getVisitorId(),
  timestamp: Date.now()
});

// Track signups
analytics.track('User Signed Up', {
  user_id: userId,
  acquisition_channel: channel,
  timestamp: Date.now()
});
```

**Formula**: (Signups / Unique Visitors) × 100

**Targets**:

- SaaS Products: 2-5%
- Consumer Apps: 5-10%
- Enterprise: 0.5-2% (longer sales cycles)

**Thresholds**:

- Warning: Conversion rate drops > 20% from baseline
- Alert: Conversion rate < 1% (funnel broken)

**Recommended Review Cadence**:

- Track: Daily
- Review: Weekly (A/B test impact)
- Optimize: Continuously

**Optimization Levers**:

- Signup form friction (too many fields)
- Value proposition clarity
- Social proof (testimonials, logos)
- Trust signals (security badges, privacy policy)

---

## Stage 2: Activation Metrics

### Metric 3: Onboarding Completion Rate

**Definition**: Percentage of new users completing key onboarding steps

**Why It Matters**: Users who complete onboarding are more likely to retain

**Data Source**: Product analytics (event tracking)

**Collection Method**:

```javascript
// Track onboarding steps
analytics.track('Onboarding Step Completed', {
  user_id: userId,
  step_name: 'profile_setup',
  step_number: 1,
  timestamp: Date.now()
});

// Track onboarding completion
analytics.track('Onboarding Completed', {
  user_id: userId,
  time_to_complete_seconds: 420,
  timestamp: Date.now()
});
```

**SQL Calculation**:

```sql
SELECT
  COUNT(DISTINCT CASE WHEN onboarding_completed THEN user_id END) AS completed_users,
  COUNT(DISTINCT user_id) AS total_users,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN onboarding_completed THEN user_id END) / COUNT(DISTINCT user_id), 2) AS completion_rate
FROM users
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
```

**Formula**: (Users completing onboarding / Total new users) × 100

**Targets**:

- Within 24 hours: > 60%
- Within 7 days: > 80%
- Best-in-class: > 70% within 1 hour

**Thresholds**:

- Warning: Completion rate < 50%
- Alert: Completion rate < 40%
- Investigation: Drop-off at specific step > 40%

**Recommended Review Cadence**:

- Track: Daily
- Review: Weekly (funnel analysis)
- Optimize: Per iteration (A/B tests)

**Step-by-Step Analysis**:

Track funnel drop-off at each step:

```
Step 1: Profile Setup - 100% start → 85% complete (15% drop)
Step 2: First Project - 85% start → 70% complete (18% drop)
Step 3: Invite Team - 70% start → 60% complete (14% drop)
```

**Optimization**: Focus on step with highest drop-off rate

---

### Metric 4: Time to Value (TTV)

**Definition**: Time from signup to first "aha moment" (user experiences core value)

**Why It Matters**: Faster value realization = higher activation and retention

**Data Source**: Product analytics

**Collection Method**:

```javascript
// Define "aha moment" for your product
// Examples:
// - Project management: First task completed
// - Analytics: First insight generated
// - Social app: First connection made

analytics.track('Aha Moment Reached', {
  user_id: userId,
  signup_time: signupTimestamp,
  aha_time: Date.now(),
  time_to_value_seconds: Date.now() - signupTimestamp
});
```

**SQL Calculation**:

```sql
SELECT
  AVG(aha_moment_time - signup_time) AS avg_ttv,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY aha_moment_time - signup_time) AS median_ttv,
  PERCENTILE_CONT(0.90) WITHIN GROUP (ORDER BY aha_moment_time - signup_time) AS p90_ttv
FROM user_events
WHERE event_type = 'aha_moment'
  AND signup_time >= NOW() - INTERVAL '30 days'
```

**Formula**: Aha moment time - Signup time

**Targets**:

- Best-in-class: < 5 minutes
- Good: < 30 minutes
- Acceptable: < 24 hours
- Poor: > 24 hours (high churn risk)

**Thresholds**:

- Warning: Median TTV > 1 hour
- Alert: Median TTV > 4 hours
- Investigation: TTV increasing 50% from baseline

**Recommended Review Cadence**:

- Track: Per user
- Review: Weekly (median and p90)
- Optimize: Per iteration

**Optimization Levers**:

- Reduce signup friction (defer optional fields)
- Interactive tutorials (show, don't tell)
- Sample data (pre-populate for exploration)
- Progress indicators (motivate completion)

---

## Stage 3: Retention Metrics

### Metric 5: Daily/Weekly/Monthly Active Users (DAU/WAU/MAU)

**Definition**: Unique users active in time period

**Why It Matters**: Core engagement metric, indicates product stickiness

**Data Source**: Product analytics

**Collection Method**:

```sql
-- Daily Active Users
SELECT DATE(event_time) AS date, COUNT(DISTINCT user_id) AS dau
FROM events
WHERE event_time >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(event_time)

-- Weekly Active Users (rolling 7 days)
SELECT COUNT(DISTINCT user_id) AS wau
FROM events
WHERE event_time >= CURRENT_DATE - INTERVAL '7 days'

-- Monthly Active Users (rolling 30 days)
SELECT COUNT(DISTINCT user_id) AS mau
FROM events
WHERE event_time >= CURRENT_DATE - INTERVAL '30 days'
```

**Formula**: Count unique users with activity in time period

**"Active" Definition** (varies by product):

- Logged in
- Performed key action (created content, sent message)
- Spent > 1 minute in app

**Engagement Ratios**:

```python
dau_mau_ratio = (dau / mau) * 100  # Stickiness
wau_mau_ratio = (wau / mau) * 100
```

**Targets**:

- DAU/MAU Ratio:
  - Highly engaged (social, messaging): > 50%
  - Engaged (productivity tools): 20-40%
  - Lower engagement (enterprise tools): 10-20%
- WAU/MAU Ratio: > 60%

**Thresholds**:

- Warning: DAU drops > 15% week-over-week
- Alert: DAU drops > 25%
- Critical: MAU declines 2 consecutive months

**Recommended Review Cadence**:

- Track: Daily (DAU)
- Review: Weekly (trends)
- Report: Monthly (MAU)

**Trend Analysis**:

- Growing DAU/MAU = increasing engagement (good)
- Stable DAU/MAU = healthy equilibrium
- Declining DAU/MAU = users becoming less engaged (investigate)

---

### Metric 6: Retention Rate (Cohort-Based)

**Definition**: Percentage of users returning after signup

**Why It Matters**: Predicts long-term product viability

**Data Source**: Product analytics

**Collection Method**:

```sql
-- D1, D7, D30 retention
WITH user_cohorts AS (
  SELECT
    user_id,
    DATE_TRUNC('week', signup_date) AS cohort_week,
    signup_date
  FROM users
),
user_activity AS (
  SELECT DISTINCT
    user_id,
    DATE(event_time) AS active_date
  FROM events
)
SELECT
  cohort_week,
  COUNT(DISTINCT uc.user_id) AS cohort_size,
  COUNT(DISTINCT CASE WHEN ua.active_date = uc.signup_date + 1 THEN uc.user_id END) AS d1_retained,
  COUNT(DISTINCT CASE WHEN ua.active_date >= uc.signup_date + 7 AND ua.active_date < uc.signup_date + 14 THEN uc.user_id END) AS d7_retained,
  COUNT(DISTINCT CASE WHEN ua.active_date >= uc.signup_date + 30 AND ua.active_date < uc.signup_date + 37 THEN uc.user_id END) AS d30_retained
FROM user_cohorts uc
LEFT JOIN user_activity ua ON uc.user_id = ua.user_id
GROUP BY cohort_week
ORDER BY cohort_week
```

**Formula**: (Users active at day N / Users in cohort) × 100

**Retention Curve**:

```
Day 0 (Signup): 100%
Day 1: 40%
Day 7: 25%
Day 30: 15%
Day 90: 10%
```

**Targets** (varies by product):

- Day 1: 40-60%
- Day 7: 20-40%
- Day 30: 10-25%
- Month 3: 5-15%

**Good Retention Curve**: Flattens after initial drop (users past Day 30 stay long-term)

**Thresholds**:

- Warning: D30 retention < 10%
- Alert: Retention curve never flattens
- Investigation: Retention drops at specific day

**Recommended Review Cadence**:

- Track: Per cohort
- Review: Weekly (new cohort analysis)
- Trend: Monthly (cohort comparison)

**Improvement Levers**:

- Email re-engagement campaigns
- Push notifications (carefully)
- New feature announcements
- Habit formation (daily streaks, reminders)

---

### Metric 7: Churn Rate

**Definition**: Percentage of users who stop using product

**Why It Matters**: Churn is opposite of retention; high churn kills growth

**Data Source**: User activity logs

**Collection Method**:

```sql
-- Monthly churn (users inactive for 30 days)
WITH active_last_month AS (
  SELECT DISTINCT user_id
  FROM events
  WHERE event_time >= CURRENT_DATE - INTERVAL '60 days'
    AND event_time < CURRENT_DATE - INTERVAL '30 days'
),
active_this_month AS (
  SELECT DISTINCT user_id
  FROM events
  WHERE event_time >= CURRENT_DATE - INTERVAL '30 days'
)
SELECT
  COUNT(DISTINCT alm.user_id) AS users_last_month,
  COUNT(DISTINCT atm.user_id) AS users_this_month,
  COUNT(DISTINCT alm.user_id) - COUNT(DISTINCT CASE WHEN atm.user_id IS NOT NULL THEN alm.user_id END) AS churned_users,
  ROUND(100.0 * (COUNT(DISTINCT alm.user_id) - COUNT(DISTINCT CASE WHEN atm.user_id IS NOT NULL THEN alm.user_id END)) / COUNT(DISTINCT alm.user_id), 2) AS churn_rate
FROM active_last_month alm
LEFT JOIN active_this_month atm ON alm.user_id = atm.user_id
```

**Formula**: (Users lost in period / Users at start of period) × 100

**Targets**:

- SaaS (SMB): < 5% monthly
- SaaS (Enterprise): < 1% monthly (annual contracts)
- Consumer Apps: < 10% monthly

**Thresholds**:

- Warning: Monthly churn > 5%
- Alert: Monthly churn > 8%
- Critical: Churn accelerating (month-over-month increase)

**Recommended Review Cadence**:

- Track: Monthly
- Review: Monthly (trend analysis)
- Deep Dive: Quarterly (exit surveys, churn reasons)

**Churn Reasons** (track with exit surveys):

- Found alternative product
- Price too high
- Missing features
- Poor onboarding experience
- Technical issues

**Relationship to Growth**:

```
Net Growth = New Users - Churned Users
```

If churn exceeds signups, product is shrinking.

---

## Stage 4: Revenue Metrics

### Metric 8: Monthly Recurring Revenue (MRR)

**Definition**: Predictable monthly revenue from subscriptions

**Why It Matters**: Core SaaS business metric, indicates business health

**Data Source**: Billing system (Stripe, Chargebee, internal)

**Collection Method**:

```sql
SELECT SUM(
  CASE
    WHEN billing_period = 'monthly' THEN price
    WHEN billing_period = 'annual' THEN price / 12
    ELSE 0
  END
) AS mrr
FROM subscriptions
WHERE status = 'active'
```

**Formula**: Sum of monthly subscription values (normalize annual to monthly)

**MRR Components**:

- New MRR: Revenue from new customers this month
- Expansion MRR: Revenue from existing customers upgrading
- Churn MRR: Lost revenue from canceled subscriptions
- Net New MRR: New + Expansion - Churn

**Targets**:

- Early Stage: 10-20% month-over-month growth
- Growth Stage: 5-10% MoM growth
- Mature: Stable with 2-5% growth

**Thresholds**:

- Warning: MRR growth < 5% MoM (growth stage)
- Alert: MRR declining
- Critical: Net new MRR negative

**Recommended Review Cadence**:

- Track: Daily
- Review: Weekly
- Report: Monthly (board/investors)

---

### Metric 9: Average Revenue Per User (ARPU)

**Definition**: Revenue per user (total revenue / # of users)

**Why It Matters**: Measures monetization efficiency

**Data Source**: Billing system + user database

**Collection Method**:

```sql
SELECT
  SUM(revenue) / COUNT(DISTINCT user_id) AS arpu
FROM subscriptions
WHERE status = 'active'
  AND created_at >= CURRENT_DATE - INTERVAL '30 days'
```

**Formula**: Total revenue / Total users

**Segmentation**:

- By plan tier (free, basic, pro, enterprise)
- By user cohort (early vs recent)
- By geography

**Targets**:

- No universal target (depends on pricing model)
- Process Target: ARPU should grow over time (upsells, cross-sells)

**Thresholds**:

- Warning: ARPU declining for 2 consecutive months
- Investigation: ARPU varies significantly by cohort

**Recommended Review Cadence**:

- Track: Monthly
- Review: Quarterly (pricing strategy)

---

### Metric 10: Customer Lifetime Value (LTV)

**Definition**: Total revenue expected from a customer over their lifetime

**Why It Matters**: Determines how much to spend on acquisition

**Data Source**: Calculated from ARPU and churn rate

**Calculation**:

```python
def calculate_ltv(arpu, churn_rate):
    # Simplified formula
    # LTV = ARPU / Churn Rate
    return arpu / (churn_rate / 100)

# Example:
# ARPU = $50/month
# Churn = 5% monthly
# LTV = $50 / 0.05 = $1000
```

**Advanced Calculation** (with gross margin):

```python
def calculate_ltv_with_margin(arpu, churn_rate, gross_margin_pct):
    return (arpu * gross_margin_pct / 100) / (churn_rate / 100)
```

**Formula**: ARPU / Monthly Churn Rate

**Targets**:

- Healthy SaaS: LTV > 3 × CAC (Customer Acquisition Cost)
- Ideal: LTV > 5 × CAC

**Thresholds**:

- Warning: LTV / CAC ratio < 3
- Alert: LTV declining

**Recommended Review Cadence**:

- Calculate: Monthly
- Review: Quarterly (business model health)

**Strategic Use**:

- Determines acceptable CAC (spend up to LTV / 3)
- Justifies sales and marketing investment

---

## Stage 5: Referral Metrics

### Metric 11: Net Promoter Score (NPS)

**Definition**: Likelihood users will recommend product (scale 0-10)

**Why It Matters**: Predicts organic growth and satisfaction

**Data Source**: In-app surveys, email campaigns

**Survey Question**: "How likely are you to recommend [Product] to a friend or colleague?"

**Segmentation**:

- Promoters (9-10): Enthusiastic advocates
- Passives (7-8): Satisfied but unenthusiastic
- Detractors (0-6): Unhappy, may spread negative word-of-mouth

**Calculation**:

```python
def calculate_nps(responses):
    promoters = sum(1 for r in responses if r >= 9)
    detractors = sum(1 for r in responses if r <= 6)
    total = len(responses)

    return ((promoters - detractors) / total) * 100

# Example: 50% Promoters, 10% Detractors → NPS = 40
```

**Formula**: (% Promoters - % Detractors) × 100

**Targets**:

- World-class: NPS > 70
- Good: NPS 30-50
- Acceptable: NPS 0-30
- Poor: NPS < 0

**Thresholds**:

- Warning: NPS < 20
- Alert: NPS drops > 10 points from baseline
- Critical: NPS negative

**Recommended Review Cadence**:

- Survey: Quarterly
- Review: Quarterly (trend analysis)

**Actionable Follow-Up**:

- Ask Detractors: "What can we improve?"
- Ask Promoters: "What do you love?"

---

### Metric 12: Viral Coefficient (K-Factor)

**Definition**: Number of new users each existing user brings

**Why It Matters**: K > 1 = exponential growth

**Data Source**: Referral tracking, analytics

**Calculation**:

```python
def calculate_k_factor(total_users, invited_users, conversion_rate):
    invites_per_user = invited_users / total_users
    k_factor = invites_per_user * (conversion_rate / 100)
    return k_factor

# Example:
# Each user invites 5 friends
# 20% of invited friends sign up
# K = 5 × 0.20 = 1.0 (viral threshold)
```

**Formula**: (Invites per user) × (Invite conversion rate)

**Targets**:

- Viral Product: K > 1.0
- Growth Product: K 0.5 - 1.0
- Non-Viral: K < 0.5 (reliant on paid acquisition)

**Thresholds**:

- Warning: K drops below 0.5
- Alert: K declining trend
- Opportunity: K approaching 1.0 (double down on viral features)

**Recommended Review Cadence**:

- Calculate: Monthly
- Review: Quarterly

**Optimization Levers**:

- Increase invites sent (incentives, referral prompts)
- Increase conversion rate (better landing pages, signup flow)

---

## North Star Metric

### Concept

**Definition**: Single metric that best captures core value delivered to users

**Why It Matters**: Aligns entire org on most important outcome

**Examples**:

- Slack: Messages sent per team
- Airbnb: Nights booked
- Facebook: Daily Active Users
- Spotify: Time spent listening

### Selecting Your North Star

**Criteria**:

1. Captures value: Users who engage with this metric get value
2. Indicates business health: Metric grows → business grows
3. Team can influence: Product/engineering can improve metric

**Anti-Patterns**:

- Revenue as North Star (lagging, doesn't indicate user value)
- Signups as North Star (vanity metric if users don't activate)

**Process**:

1. Map user journey to value moments
2. Identify metric closest to "aha moment"
3. Validate correlation with retention and revenue
4. Commit for 6-12 months (don't change frequently)

---

## Summary Table

| Metric | Category | Data Source | Frequency | Good Target | Critical Threshold |
|--------|----------|-------------|-----------|-------------|--------------------|
| Signups | Acquisition | Auth System | Daily | 10-20% WoW | -30% drop |
| Conversion Rate | Acquisition | Analytics | Daily | 2-5% | < 1% |
| Onboarding Completion | Activation | Analytics | Daily | > 60% in 24hr | < 40% |
| Time to Value | Activation | Analytics | Per User | < 30 min | > 4 hours |
| DAU/MAU | Retention | Analytics | Daily | > 20% | DAU drop 25% WoW |
| Retention Rate | Retention | Analytics | Weekly | D30 > 15% | D30 < 10% |
| Churn Rate | Retention | Activity Logs | Monthly | < 5% monthly | > 8% monthly |
| MRR | Revenue | Billing | Daily | 10-20% MoM | Negative growth |
| ARPU | Revenue | Billing | Monthly | Increasing | 2 month decline |
| LTV | Revenue | Calculated | Monthly | LTV > 3 × CAC | LTV < 3 × CAC |
| NPS | Referral | Survey | Quarterly | > 30 | < 0 |
| K-Factor | Referral | Analytics | Monthly | > 0.5 | < 0.3 |

---

## Conclusion

Product metrics bridge the gap between building software and delivering value.

**Key Takeaways**:

1. AARRR Framework covers full user lifecycle
2. North Star Metric aligns org on core value
3. Integration with SDLC connects metrics to iteration planning and assessment
4. Metrics should drive decisions, not just dashboards

**Next Steps**:

1. Define North Star Metric
2. Select 3-5 AARRR metrics most relevant to current phase
3. Instrument analytics (add event tracking)
4. Set baselines and targets in Business Case
5. Review product metrics in every Iteration Assessment

**Critical Success Factor**: Ship features → Measure impact → Learn → Iterate
