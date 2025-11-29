# Media Contact List & Database Template

## Metadata

- ID: PRS-008
- Owner: PR Manager (agents/pr-manager.md)
- Contributors: Content Strategist (agents/content-strategist.md), Research Analyst (agents/research-analyst.md)
- Reviewers: Executive Orchestrator (agents/executive-orchestrator.md)
- Team: `team`
- Status: `active/needs-update/archived`
- Dates: created `YYYY-MM-DD` / updated `YYYY-MM-DD` / next-review `YYYY-MM-DD`
- Related: PRS-003, PRS-002, SOC-`id`
- Links: `crm-url`, `media-database-service-url`

## Purpose

Comprehensive contact database for journalists, bloggers, podcasters, analysts, and influencers relevant to company coverage. Includes contact information, beat/coverage areas, engagement history, and relationship management best practices. Supports targeted media outreach, relationship building, and coverage tracking.

## Database Platforms

### Commercial Media Databases

**Tier 1** (Comprehensive, Expensive):

**Cision**:
- Contacts: 1M+ journalists, influencers, bloggers
- Features: Media monitoring, pitch tracking, influencer discovery
- Pricing: $7,000-$15,000/year
- Best for: Enterprise companies, agencies

**Muck Rack**:
- Contacts: 1M+ journalists with verified profiles
- Features: Relationship tracking, portfolio tracking, media alerts
- Pricing: $5,000-$12,000/year
- Best for: Mid-size to enterprise companies

**Prowly**:
- Contacts: 1M+ media contacts
- Features: Email campaigns, newsroom, media monitoring
- Pricing: $3,000-$6,000/year
- Best for: Growing companies, PR teams

**Tier 2** (Targeted, Moderate):

**JustReachOut**:
- Contacts: 500K+ journalists
- Features: Pitch templates, podcast database
- Pricing: $99-$399/month
- Best for: Startups, solopreneurs

**Anewstip**:
- Contacts: Journalist query database (HARO-style)
- Features: Media opportunities, pitch matching
- Pricing: $49-$199/month
- Best for: Budget-conscious PR teams

### DIY Database (Spreadsheet/CRM)

**When to Build Your Own**:
- Limited budget (< $3K/year for tools)
- Niche industry (commercial databases lack coverage)
- Small media list (< 100 contacts)
- Want full control and customization

**Platform Options**:
- **Airtable**: Flexible database with relationships, great for collaboration
- **Google Sheets**: Free, simple, real-time collaboration
- **HubSpot/Salesforce**: Full CRM with marketing automation
- **Notion**: Database + knowledge base combo

## Media Contact Record Structure

### Core Fields

```yaml
Contact Information:
  first_name: "Sarah"
  last_name: "Johnson"
  preferred_name: "Sarah" # If different from first name
  pronouns: "she/her" # Optional but respectful
  email: "sjohnson@techpublication.com"
  personal_email: "sarah.j.writer@gmail.com" # If known, for when they change jobs
  phone: "+1-555-123-4567" # Include country code
  mobile: "+1-555-789-0123" # If known
  twitter: "@sarahjtech"
  linkedin: "https://linkedin.com/in/sarahjohnson"

Professional Information:
  outlet: "TechPublication"
  title: "Senior Reporter"
  beat: "Enterprise Software, Cybersecurity"
  secondary_beats: "AI/ML, Cloud Infrastructure"
  outlet_type: "Trade Publication" # Options: Daily News, Trade, Blog, Podcast, YouTube, Newsletter
  tier: 1 # 1 = National/Top-tier, 2 = Industry/Regional, 3 = Niche/Local
  audience_size: "500K monthly readers" # If known
  location: "San Francisco, CA"
  timezone: "America/Los_Angeles"

Contact Preferences:
  preferred_contact_method: "Email" # Email, Twitter DM, LinkedIn, Phone
  best_time_to_contact: "9-11 AM PT, Tuesday-Thursday"
  pitch_format: "Short email with data/exclusive" # Based on successful pitches
  do_not_contact_about: "Consumer apps, mobile games" # Topics they've rejected

Relationship Status:
  relationship_level: "Warm" # Cold, Warm, Hot, Champion
  last_contact_date: "2024-11-15"
  last_contact_type: "Pitch (Product Launch)"
  last_response_date: "2024-11-16"
  last_coverage_date: "2024-10-01"
  total_pitches_sent: 8
  total_responses: 5
  total_articles_written: 3
  response_rate: "62.5%"

Notes:
  background: "Former engineer at Google, now covering enterprise tech. Very data-driven, loves exclusives."
  interests: "Zero-trust security, AI ethics, developer tools"
  recent_articles:
    - "The State of Enterprise Security 2024 (Oct 2024)"
    - "Why AI Audits Are Failing (Sept 2024)"
  pitch_successes: "Responded well to data-driven pitches with exclusive access"
  pitch_failures: "Rejected generic product launch (no differentiation)"
  personal_notes: "Marathon runner, tweets about Bay Area tech scene, attended RSA Conference"

Internal Tracking:
  assigned_to: "PR Manager"
  added_by: "Research Analyst"
  date_added: "2023-05-10"
  last_updated: "2024-11-20"
  tags: ["cybersecurity", "enterprise", "tier-1", "responsive", "data-driven"]
  status: "Active" # Active, Left Outlet, Bounced Email, Do Not Contact
```

### Custom Fields (Industry-Specific)

**For B2B Technology**:
- Technical expertise level: 1-5 (1 = business reporter, 5 = deeply technical)
- Coverage stage preference: Early-stage, Growth, Enterprise
- Formats: Long-form features, News briefs, Analysis, Reviews

**For Consumer Products**:
- Product categories covered: List
- Review style: Data-driven, Narrative, Video
- Accepts review units: Yes/No
- Disclosure preferences: FTC-compliant, Sponsored vs Editorial

**For Healthcare/Biotech**:
- Medical credentials: MD, PhD, Science journalist
- Regulatory focus: FDA, EMA, Clinical trials
- Patient advocacy: Yes/No

## Media List Segmentation

### By Tier

**Tier 1** (Top Priority):
- National/international reach
- High credibility and influence
- Examples: Wall Street Journal, New York Times, Forbes, TechCrunch (for tech), Wired
- Treatment: Personalized pitches, exclusive access, CEO interviews

**Tier 2** (Important):
- Industry trade publications
- Regional major outlets
- Examples: CRN, InformationWeek, VentureBeat, regional business journals
- Treatment: Customized pitches, product demos, exec interviews

**Tier 3** (Volume):
- Niche blogs and newsletters
- Local media
- Smaller podcasts/YouTube channels
- Treatment: Templated pitches (with personalization), press releases

### By Beat/Topic

**Primary Beats** (Core coverage areas):
- Enterprise Software
- Cybersecurity
- Artificial Intelligence
- Cloud Computing
- Developer Tools

**Cross-Functional Beats** (Occasional coverage):
- Business Strategy
- Startup Funding
- Leadership/HR
- Sustainability

**Geographic Beats**:
- San Francisco Bay Area
- New York Tech Scene
- Austin Tech Hub
- Remote/Distributed Work

### By Outlet Type

**Daily News**: Breaking news, fast turnaround
**Trade Publications**: Deep-dive analysis, industry trends
**Blogs**: Opinion, personal perspective
**Podcasts**: Long-form conversation, storytelling
**YouTube/Video**: Visual demonstrations, interviews
**Newsletters**: Curated insights, link roundups
**Analyst Firms**: Research reports, vendor comparisons (Gartner, Forrester, IDC)

### By Engagement Level

**Champions** (Frequent coverage, positive relationship):
- Have written multiple positive articles
- Respond quickly to pitches
- Occasionally reach out proactively
- Treatment: VIP access, early embargoes, background briefings

**Warm Contacts** (Responsive, occasional coverage):
- Have responded to pitches
- Covered company at least once
- Generally positive or neutral
- Treatment: Targeted pitches, interview offers

**Cold Contacts** (No prior engagement):
- On list but never responded
- Cover relevant beat but haven't written about company
- Treatment: Occasional pitches with strong news hooks

**Do Not Contact** (Explicitly declined or bounced):
- Unsubscribed from emails
- Email bounced (left outlet)
- Requested no further contact
- Treatment: Remove from pitch lists, monitor for job changes

## Data Collection & Research

### Building Your Media List

**Sources for Finding Journalists**:

1. **Publication Mastheads**: Check "About Us" or "Our Team" pages
2. **Article Bylines**: Read coverage of your industry/competitors
3. **Twitter/X**: Search for journalists covering your beat
4. **LinkedIn**: Search by title + publication + industry keywords
5. **Podcast Directories**: Apple Podcasts, Spotify (search by topic)
6. **YouTube**: Search for channels covering your industry
7. **Muck Rack/Cision**: If you have access
8. **Conference Speakers**: Industry events often feature journalists
9. **Previous Coverage**: Who wrote about competitors or similar companies?

**Research Checklist** (Before Adding Contact):
- [ ] Verify current employer (journalists move frequently)
- [ ] Check recent articles (last 3-6 months)
- [ ] Confirm beat/coverage area (read bio, article history)
- [ ] Find contact preferences (stated in bio or Twitter)
- [ ] Identify personal interests (Twitter, LinkedIn for context)
- [ ] Assess tier/reach (publication circulation, social following)

### Keeping Data Current

**Monthly Maintenance**:
- [ ] Check for bounced emails (journalists change jobs often)
- [ ] Update recent articles (add new coverage)
- [ ] Verify outlet names (mergers, rebrandings)
- [ ] Remove duplicates

**Quarterly Deep Clean**:
- [ ] Verify all email addresses (send test batch)
- [ ] Research journalists who haven't engaged (still at outlet?)
- [ ] Update tier classifications (publication reach changes)
- [ ] Add new journalists (competitors covered, new publications)
- [ ] Archive inactive contacts (left journalism, retired beat)

**Annual Audit**:
- [ ] Full database review
- [ ] Relationship scoring update
- [ ] Segmentation optimization
- [ ] CRM integration check

### Privacy & Compliance

**GDPR Compliance** (EU journalists):
- **Legitimate Interest Basis**: Media relations is generally accepted
- **Opt-Out**: Honor unsubscribe requests immediately
- **Data Minimization**: Only collect necessary fields
- **Right to Deletion**: Remove upon request

**CAN-SPAM Compliance** (US):
- **Unsubscribe Link**: Include in all mass emails
- **Accurate Headers**: From/Reply-to must be valid
- **Physical Address**: Include in email footer
- **Honor Opt-Outs**: Within 10 business days

**Best Practices**:
- Don't buy lists (poor quality, compliance risk)
- Document opt-in source ("Added from article byline on [date]")
- Provide easy unsubscribe (one-click preferred)
- Respect "Do Not Contact" (even if not legally required)

## Relationship Management

### Interaction Tracking

**Log Every Interaction**:
```yaml
Interaction Record:
  date: "2024-11-20"
  type: "Pitch" # Pitch, Response, Interview, Coverage, Event Meeting, Social Engagement
  subject: "AI Security Platform Launch"
  outcome: "Positive Response - Interview Scheduled"
  notes: "Interested in customer data, wants to speak with CISO customer"
  next_action: "Send customer intro email by Nov 22"
  next_action_date: "2024-11-22"
  assigned_to: "PR Manager"
```

**Coverage Tracking**:
```yaml
Coverage Record:
  date_published: "2024-11-28"
  outlet: "TechPublication"
  author: "Sarah Johnson"
  title: "How AI is Transforming Enterprise Security"
  url: "https://techpub.com/article-url"
  type: "Feature Article" # News Brief, Feature, Review, Interview, Podcast, Video
  word_count: 1500
  sentiment: "Positive" # Positive, Neutral, Negative, Mixed
  key_messages_included:
    - "75% false positive reduction"
    - "Customer success story (Fortune 500 financial)"
  share_of_voice: "Primary focus" # Primary, Mentioned, Competitor Comparison
  company_quotes: 2
  competitor_mentions: "None"
  reach_impressions: "500K readers" # If known
  social_shares: 342 # Twitter, LinkedIn combined
  inbound_traffic: 45 # Website visits from article (tracked via UTM)
  lead_generation: 3 # Demo requests attributed to article
```

### Engagement Scoring

**Calculate Relationship Health**:

```
Engagement Score = (Responses / Pitches) × 50
                 + (Coverage / Pitches) × 100
                 + (Proactive Reach-outs × 25)
                 - (Bounces × 50)

Examples:
- Champion: 150+ (Responds frequently, covers regularly, reaches out proactively)
- Warm: 75-149 (Occasionally responds, has covered once or twice)
- Cold: 25-74 (Rare responses, no coverage yet)
- Inactive: <25 (No engagement, consider removing)
```

**Engagement Actions by Score**:

**Champions (150+)**:
- Monthly check-ins (not pitches - relationship building)
- Exclusive embargoed access
- Background briefings (off-the-record context)
- Invite to executive roundtables or events
- Personalized holiday/birthday notes

**Warm (75-149)**:
- Quarterly touchpoints
- Targeted pitches (not every announcement)
- Interview opportunities
- Include in broader briefings

**Cold (25-74)**:
- Occasional pitches (major news only)
- Monitor for job changes or beat shifts
- Re-engagement campaign (new angle)

**Inactive (<25)**:
- Move to "dormant" list
- Remove from regular pitches
- Monitor for relevance changes

## Media List Templates

### Spreadsheet Template (Google Sheets / Excel)

**Columns**:
| First Name | Last Name | Email | Outlet | Title | Beat | Tier | Last Contact | Last Coverage | Response Rate | Notes | Tags |
|------------|-----------|-------|--------|-------|------|------|--------------|---------------|---------------|-------|------|

**Sample Row**:
| Sarah | Johnson | sjohnson@techpub.com | TechPublication | Senior Reporter | Cybersecurity, Enterprise | 1 | 2024-11-15 | 2024-10-01 | 62.5% | Loves data, prefers email, best contact Tue-Thu AM | cybersecurity, tier-1, responsive |

**Tabs**:
- **All Contacts**: Master list
- **Tier 1**: Top-priority journalists
- **By Beat**: Separate tabs for each beat (Cybersecurity, AI, etc.)
- **By Outlet Type**: News, Trade, Podcast, etc.
- **Champions**: Frequent coverage, best relationships
- **Do Not Contact**: Unsubscribed or bounced

**Formulas**:
```excel
// Response Rate
=IFERROR(Responses/Pitches*100, 0)

// Days Since Last Contact
=TODAY()-LastContactDate

// Engagement Score
=(Responses/Pitches*50) + (Coverage/Pitches*100) + (ProactiveReachouts*25)
```

### Airtable Template

**Tables**:

1. **Contacts** (Main)
   - Fields: All core fields above
   - Views: By Tier, By Beat, By Engagement Score, Needs Follow-Up

2. **Outlets**
   - Fields: Outlet Name, Type, Tier, Circulation, Website, Social Media
   - Linked to: Contacts (many-to-one)

3. **Interactions**
   - Fields: Date, Type, Outcome, Notes, Next Action
   - Linked to: Contacts (many-to-one)

4. **Coverage**
   - Fields: Date Published, Article Title, URL, Sentiment, Key Messages
   - Linked to: Contacts (many-to-one), Outlets (many-to-one)

5. **Pitches**
   - Fields: Date Sent, Subject, Angle, Outcome, Recipients
   - Linked to: Contacts (many-to-many)

**Automations**:
- When Pitch sent → Update Last Contact Date
- When Coverage added → Increment Coverage Count
- When Email bounces → Add to "Verify Contact" view
- 90 days since last contact → Flag for re-engagement

### CRM Integration (HubSpot / Salesforce)

**Contact Record**:
- Standard fields + Custom properties for journalism-specific data
- Activity timeline (emails, calls, meetings)
- Deal pipeline (Coverage → Published → Amplified)

**Lists/Segments**:
- Dynamic lists based on engagement score
- Static lists for campaign targeting
- Suppression lists (Do Not Contact)

**Workflows**:
- Auto-tag based on interaction type
- Lead scoring for journalist engagement
- Email sequences for re-engagement
- Task creation for follow-ups

**Reports/Dashboards**:
- Coverage by month
- Response rates by tier/beat
- Journalist engagement trends
- Top outlets by coverage volume

## Outreach Workflows

### Initial Contact (Cold Outreach)

**Research First** (30 minutes per journalist):
1. Read last 5-10 articles
2. Check Twitter for recent interests
3. Identify unique angle relevant to their beat
4. Note any personal interests (for rapport)

**Personalized Pitch**:
```
Subject: [Relevant to recent article] - [Your news hook]

Hi [First Name],

I saw your piece on [specific article title] in [Publication] and thought
you might be interested in [relevant news/data] that ties into [topic they
covered].

[2-3 sentences on news with specific, relevant angle]

Would this be of interest for a [article type they write]?

Happy to provide [exclusive data/interview/early access].

Best regards,
[Your Name]

P.S. [Personal note referencing their interest/recent work]
```

**Follow-Up Protocol**:
- Day 3: If no response, send brief follow-up
- Day 7: If still no response, move to "Unresponsive" segment
- 30 days: Try different angle or wait for major news

### Ongoing Relationship (Warm Contacts)

**Quarterly Check-Ins** (Not pitches):
```
Subject: Quick hello + [Industry trend]

Hi [Name],

Hope you're doing well! I've been following your coverage of [beat] and
wanted to share some interesting data we're seeing on [trend].

[2-3 sentences with data or insight - no ask, just value]

If you're ever looking for expert perspectives on [topics], I'm happy to
connect you with our [executives/customers].

Best,
[Your Name]
```

**Value-Add Touchpoints**:
- Send relevant reports (third-party, not just company research)
- Congratulate on awards or new job
- Share their articles (genuine engagement, not brown-nosing)
- Offer background briefings (no attribution, just context)

### Champion Cultivation

**Exclusive Access**:
- Early embargo (24-72 hours before tier 2/3)
- One-on-one executive time
- Customer introductions (if they're writing case study)
- Data exclusives (first access to research)

**Relationship Maintenance**:
- Quarterly coffee/lunch (virtual or in-person)
- Invite to company events (product launches, customer conferences)
- Background briefings on strategy (off-record)
- Personal notes (holidays, congratulations on achievements)

## Media List Hygiene

### Email Verification

**Automated Tools**:
- **NeverBounce**: Bulk email verification ($10 per 1,000 emails)
- **ZeroBounce**: Email validation + spam trap detection
- **Hunter.io**: Find and verify email addresses

**Manual Verification**:
- LinkedIn: Check current employer
- Twitter bio: Often lists current outlet
- Google: "[Journalist Name] [Outlet]" to verify

**Bounce Handling**:
- Hard bounce (doesn't exist): Remove or research new contact
- Soft bounce (mailbox full): Retry once, then remove
- Out-of-office: Note for later follow-up

### Job Change Tracking

**Journalists move frequently** (average tenure: 2-3 years):

**Monitoring Methods**:
- **Google Alerts**: Set for "[Journalist Name] + new job"
- **Twitter**: Many announce job changes
- **LinkedIn**: Job change notifications if connected
- **Media databases**: Muck Rack/Cision update frequently

**Action When Journalist Moves**:
1. Update contact record (new outlet, email, title)
2. Send congratulations note (relationship maintenance)
3. Assess new beat relevance (still covers your industry?)
4. Adjust tier/priority (new outlet more/less relevant?)
5. Archive old contact info (in case they return)

## Analytics & Reporting

### Key Metrics

**Database Health**:
- Total contacts: [Number]
- Active contacts (contacted in last 12 months): [Number] ([Percentage]%)
- Verified emails (last 90 days): [Percentage]%
- Average engagement score: [Score]
- Champions: [Number]
- Warm: [Number]
- Cold: [Number]

**Outreach Performance**:
- Pitches sent (monthly): [Number]
- Response rate: [Percentage]%
- Coverage generated: [Number]
- Coverage per pitch: [Ratio]

**Relationship Quality**:
- Average response time: [Hours/Days]
- Journalists reached out proactively: [Number]
- Repeat coverage: [Number] journalists, [Number] articles

**ROI**:
- Coverage value (AVE or reach): $[Amount]
- Cost per coverage: $[Amount] (PR staff + tools ÷ coverage)
- Inbound traffic from coverage: [Number] visits
- Leads from coverage: [Number]

### Monthly Report Template

```markdown
# Media Relations Report - [Month YYYY]

## Summary
- Pitches Sent: [Number]
- Responses Received: [Number] ([Percentage]% response rate)
- Coverage Secured: [Number] articles
- Tier 1 Coverage: [Number]
- Estimated Reach: [Number] impressions

## Top Coverage
1. [Article Title] - [Publication] - [Date]
   - Reach: [Number]
   - Sentiment: [Positive/Neutral/Negative]
   - Key Messages: [List]

2. [Article Title] - [Publication] - [Date]
   ...

## New Relationships
- [Journalist Name] - [Outlet] (First coverage)
- [Journalist Name] - [Outlet] (First positive response)

## Database Updates
- Contacts added: [Number]
- Contacts removed: [Number]
- Job changes tracked: [Number]
- Email verification: [Percentage]% verified

## Next Month Focus
- [Priority 1: e.g., Tier 1 outreach for product launch]
- [Priority 2: e.g., Podcast tour - 5 targeted pitches]
- [Priority 3: e.g., Re-engage 20 cold contacts]
```

## Best Practices

### Do's

**Research Before Outreach**:
- Read journalist's recent work
- Understand their beat and angle
- Personalize every pitch
- Respect their time and preferences

**Build Relationships**:
- Provide value (not just pitches)
- Be responsive and helpful
- Follow through on commitments
- Celebrate their successes

**Maintain Data**:
- Update after every interaction
- Verify contacts quarterly
- Track job changes immediately
- Document pitch outcomes

### Don'ts

**Generic Mass Emails**:
- Don't BCC 100+ journalists on one pitch
- Don't use "Dear Sir/Madam"
- Don't ignore beat relevance

**Over-Pitching**:
- Don't pitch every announcement to every journalist
- Don't follow up excessively (3 times max)
- Don't pitch unrelated stories

**Relationship Mistakes**:
- Don't ask "Did you get my email?" (insulting)
- Don't demand coverage ("We're a sponsor, you owe us")
- Don't burn bridges (today's blogger is tomorrow's WSJ reporter)
- Don't badmouth competitors or other journalists

**Data Misuse**:
- Don't add journalists without consent (ethical grey area)
- Don't share/sell your media list
- Don't ignore unsubscribe requests
- Don't use personal emails without permission

## Related Templates

- **Media Pitch**: PRS-003 (outreach email templates)
- **Press Release**: PRS-001 (announcement format)
- **Media Kit**: PRS-002 (comprehensive asset library)
- **Q&A Document**: PRS-006 (media inquiry responses)

## References

- Cision 2024 State of the Media Report
- Muck Rack State of Journalism 2024
- GDPR Compliance for Marketing (ICO guidance)
- CAN-SPAM Act Compliance Guide (FTC)
- "The New Rules of Marketing & PR" - David Meerman Scott
- Media database comparison (G2 reviews)
