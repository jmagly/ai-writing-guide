# Retargeting Strategy

**Card ID**: `ADV-{PROJECT}-{NNNN}`
**Version**: 1.0
**Status**: Draft | Approved | Active
**Campaign**: {CAMPAIGN_NAME}
**Owner**: {OWNER_NAME}

---

## Strategy Overview

### Objectives

| Objective | KPI | Target |
|-----------|-----|--------|
| Primary | {Metric} | {Target} |
| Secondary | {Metric} | {Target} |

### Budget Allocation

| Audience Tier | Budget | % of Total |
|---------------|--------|------------|
| High intent | ${Amount} | {%} |
| Mid intent | ${Amount} | {%} |
| Low intent | ${Amount} | {%} |
| **Total** | **${Amount}** | **100%** |

---

## Audience Segmentation

### Website Behavior Audiences

| Audience | Definition | Size Est. | Window | Priority |
|----------|------------|-----------|--------|----------|
| Cart abandoners | Added to cart, no purchase | {#} | 7 days | High |
| Product viewers | Viewed product, no cart | {#} | 14 days | High |
| Category browsers | Viewed 2+ category pages | {#} | 30 days | Medium |
| Homepage only | Homepage bounce | {#} | 7 days | Low |
| Past purchasers | Completed purchase | {#} | 180 days | Medium |
| High-value customers | 2+ purchases or $X+ | {#} | 365 days | High |

### Engagement Audiences

| Audience | Source | Definition | Size Est. |
|----------|--------|------------|-----------|
| Video viewers | YouTube/Social | 75%+ completion | {#} |
| Engaged visitors | Website | 2+ pages, 2+ min | {#} |
| Email engagers | ESP | Opened/clicked 30d | {#} |
| App users | App | Active 30d | {#} |
| Lead form starts | Website/Ad | Started, not submitted | {#} |

### CRM/First-Party Audiences

| Audience | Source | Criteria | Size Est. |
|----------|--------|----------|-----------|
| Customer list | CRM | All customers | {#} |
| High LTV | CRM | Top 20% LTV | {#} |
| Lapsed customers | CRM | No purchase 90d+ | {#} |
| Newsletter subscribers | ESP | Active subscribers | {#} |
| Trial users | Product | Trial, not converted | {#} |

---

## Audience Tiers & Messaging

### Tier 1: High Intent (Hot)

**Audiences**: Cart abandoners, checkout abandoners, lead form starters

| Attribute | Value |
|-----------|-------|
| Recency window | 1-7 days |
| Frequency cap | 5-7 impressions/day |
| Budget priority | Highest |
| Bid adjustment | +50-100% |
| Creative focus | Urgency, incentive, reminder |
| Messaging | "Complete your order", "Still thinking?" |

**Creative Variants**:
| Variant | Trigger | Message |
|---------|---------|---------|
| A | 0-24 hours | Gentle reminder |
| B | 24-72 hours | Highlight benefits |
| C | 72+ hours | Limited time offer |

### Tier 2: Mid Intent (Warm)

**Audiences**: Product viewers, engaged visitors, content consumers

| Attribute | Value |
|-----------|-------|
| Recency window | 7-30 days |
| Frequency cap | 3-5 impressions/day |
| Budget priority | Medium |
| Bid adjustment | +25-50% |
| Creative focus | Education, social proof |
| Messaging | "Customers love...", "Learn more about..." |

**Creative Variants**:
| Variant | Trigger | Message |
|---------|---------|---------|
| A | Product viewers | Dynamic product ads |
| B | Content readers | Related content/products |
| C | Engaged visitors | Brand value props |

### Tier 3: Low Intent (Cool)

**Audiences**: Homepage visitors, category browsers, email opens

| Attribute | Value |
|-----------|-------|
| Recency window | 30-90 days |
| Frequency cap | 1-2 impressions/day |
| Budget priority | Low |
| Bid adjustment | Baseline |
| Creative focus | Brand awareness, new products |
| Messaging | "New arrivals", "Discover..." |

---

## Platform Strategy

### Meta (Facebook/Instagram)

**Audience Setup**:
| Audience | Pixel Event | Window | Exclusions |
|----------|-------------|--------|------------|
| Add to cart | AddToCart | 7d | Purchase 7d |
| View content | ViewContent | 14d | AddToCart 14d |
| Page views | PageView | 30d | ViewContent 30d |

**Placements**: Feed, Stories, Reels (high intent only)

**Format Mix**:
| Audience | Formats | Dynamic |
|----------|---------|---------|
| Cart abandoners | Carousel, Collection | Yes - DPA |
| Product viewers | Carousel, Single image | Yes - DPA |
| Browsers | Video, Carousel | No |

### Google Ads

**Audience Setup**:
| Audience | Definition | Campaign Type |
|----------|------------|---------------|
| All visitors | Website visitors | Display, YouTube |
| Converters | Past purchasers | Search (RLSA), Display |
| Cart abandoners | Cart + no purchase | Performance Max |
| Similar audiences | Lookalike of converters | Display |

**RLSA Strategy**:
| Audience | Bid Adjustment | Keywords |
|----------|----------------|----------|
| All visitors | +30% | Brand + non-brand |
| Converters | +50% | Cross-sell keywords |
| Cart abandoners | +75% | Product keywords |

### LinkedIn

**Audience Setup**:
| Audience | Source | Use Case |
|----------|--------|----------|
| Website visitors | Insight Tag | Decision makers |
| Company list match | CRM | ABM retargeting |
| Lead gen engagers | Lead forms | Nurture |

### TikTok

**Audience Setup**:
| Audience | Pixel Event | Window |
|----------|-------------|--------|
| Add to cart | AddToCart | 7d |
| Video viewers | Video views 75%+ | 30d |
| Page views | PageView | 14d |

---

## Creative Strategy

### Dynamic Product Ads (DPA)

**Catalog Setup**:
- Product feed: {Feed URL}
- Update frequency: {Daily/Real-time}
- Product set rules: {Criteria}

**DPA Templates**:
| Template | Trigger | Elements |
|----------|---------|----------|
| Single product | Product view | Image, price, name |
| Carousel | Category view | Multi-product |
| Collection | Homepage | Best sellers |

### Sequential Messaging

| Touchpoint | Timing | Message Focus |
|------------|--------|---------------|
| 1st exposure | Day 1 | Reminder |
| 2nd exposure | Day 2-3 | Benefits |
| 3rd exposure | Day 4-5 | Social proof |
| 4th exposure | Day 6-7 | Incentive |

### Creative Rotation

| Week | Creative Theme | Offer |
|------|----------------|-------|
| 1-2 | Product focus | None |
| 3-4 | Social proof | None |
| 5-6 | Urgency | Limited time |
| 7-8 | Incentive | Discount code |

---

## Frequency Management

### Frequency Caps

| Audience Tier | Daily Cap | Weekly Cap | Monthly Cap |
|---------------|-----------|------------|-------------|
| High intent | 7 | 21 | 60 |
| Mid intent | 5 | 15 | 45 |
| Low intent | 2 | 7 | 20 |

### Cross-Platform Frequency

| Approach | Method |
|----------|--------|
| Platform allocation | Budget split to manage exposure |
| Sequential messaging | Different messages per platform |
| Exclusion syncing | Suppress converters across platforms |

### Burn Pixel Implementation

| Platform | Burn Event | Action |
|----------|------------|--------|
| Meta | Purchase | Exclude from all retargeting |
| Google | Conversion | Add to customer list |
| LinkedIn | Form submit | Move to nurture |

---

## Exclusion Strategy

### Standard Exclusions

| Exclusion | Reason | Duration |
|-----------|--------|----------|
| Recent purchasers | Already converted | 7-30 days |
| Customer service contacts | Negative experience | Until resolved |
| Unsubscribers | Opted out | Permanent |
| Employees | Internal | Permanent |
| Competitors | Waste | Permanent |

### Audience Suppression Waterfall

```
High Intent → Exclude from Mid Intent
Mid Intent → Exclude from Low Intent
Converters → Exclude from all acquisition
```

---

## Testing Plan

### A/B Tests

| Test | Variable | Hypothesis | Duration |
|------|----------|------------|----------|
| Window length | 7d vs 14d | Shorter = higher intent | 2 weeks |
| Frequency cap | 3/day vs 5/day | Higher = more conv | 2 weeks |
| Offer timing | Day 3 vs Day 7 | Later = less margin impact | 4 weeks |
| Creative format | Static vs video | Video = higher engagement | 2 weeks |

### Test Calendar

| Week | Test Focus |
|------|------------|
| 1-2 | Audience window testing |
| 3-4 | Frequency optimization |
| 5-6 | Creative format testing |
| 7-8 | Offer timing testing |

---

## Measurement

### Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Retargeting ROAS | {X}:1 | Revenue / retargeting spend |
| View-through conv | {#} | Platform + attribution tool |
| Incremental lift | {%} | Holdout test |
| Frequency to conv | {#} | Avg exposures before purchase |
| Cross-device conv | {%} | Cross-device tracking |

### Attribution Considerations

| Challenge | Approach |
|-----------|----------|
| View-through credit | 1-day VTC window |
| Cross-device | Deterministic matching |
| Platform overlap | Deduplicate in attribution tool |
| Incrementality | Periodic holdout tests |

### Incrementality Testing

| Test Type | Setup | Cadence |
|-----------|-------|---------|
| Holdout test | 10% unexposed | Quarterly |
| Geo test | Matched markets | Annually |
| Platform lift study | Meta/Google studies | By campaign |

---

## Privacy & Compliance

### Consent Management

| Requirement | Implementation |
|-------------|----------------|
| Cookie consent | {CMP platform} |
| Opt-out mechanism | AdChoices icon |
| Data retention | Per platform policies |

### Platform Compliance

- [ ] Meta: Custom Audience terms accepted
- [ ] Google: Customer match policies
- [ ] LinkedIn: Matched Audiences agreement
- [ ] TikTok: Custom Audience terms

### First-Party Data Strategy

| Data Source | Collection Method | Usage |
|-------------|-------------------|-------|
| Website behavior | First-party cookies | Retargeting |
| CRM data | Hashed upload | Customer match |
| Email engagement | ESP integration | Suppression |

---

## Implementation Checklist

### Setup

- [ ] Pixel/tags installed and verified
- [ ] Audiences created in all platforms
- [ ] Product catalog connected (DPA)
- [ ] Exclusion lists implemented
- [ ] Frequency caps configured
- [ ] Burn pixels active
- [ ] Creative assets uploaded
- [ ] UTM parameters configured

### Launch

- [ ] QA all audiences
- [ ] Verify exclusions working
- [ ] Test creative rendering
- [ ] Check tracking fires
- [ ] Set up reporting

### Ongoing

- [ ] Weekly performance review
- [ ] Monthly audience refresh
- [ ] Quarterly strategy review
- [ ] Annual incrementality test

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | {DATE} | {Name} | Initial strategy |

---

*Template version: 1.0 | MMK Framework*
