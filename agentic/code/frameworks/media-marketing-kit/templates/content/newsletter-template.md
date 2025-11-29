# Newsletter Template

---

**Metadata**:
```yaml
id: CNT-008
template_name: Newsletter Template
version: 1.0.0
category: Content
subcategory: Email Marketing
framework: Email Newsletter Structure
related_templates:
  - STR-002 (Messaging Matrix)
  - BRD-002 (Voice & Tone Guide)
  - CNT-001 (Blog Post Template)
  - EML-001 (Email Campaign Template)
primary_agents:
  - content-strategist
  - email-marketer
  - copywriter
lifecycle_phase: Creation
status: active
```

---

## Purpose

This template provides a structured approach to creating engaging email newsletters that deliver value, build audience relationships, and drive engagement. Suitable for weekly/monthly updates, content roundups, thought leadership digests, and community newsletters.

---

## Newsletter Brief

### 1. Newsletter Overview

**Newsletter Name**: `[Newsletter title/series name]`

**Edition**: `[e.g., "Weekly Digest #42" or "March 2025 Edition"]`

**Newsletter Type**:
- [ ] Content Roundup (curated articles, resources)
- [ ] Thought Leadership (original insights, commentary)
- [ ] Product Updates (feature releases, announcements)
- [ ] Community Digest (user stories, highlights)
- [ ] Event/Webinar Promotion
- [ ] Mixed Format (combination of above)
- [ ] Other: `___________`

**Cadence**:
- [ ] Daily
- [ ] Weekly (Day: `___`)
- [ ] Bi-weekly
- [ ] Monthly
- [ ] Quarterly
- [ ] Ad-hoc/Triggered

**Send Date**: `YYYY-MM-DD`
**Send Time**: `HH:MM AM/PM (Timezone: ___)` - *Best practice: Test and optimize based on audience*

**Sender**:
- From Name: `[e.g., "Jane from Company" or "Company Newsletter"]`
- From Email: `[e.g., newsletter@company.com]`
- Reply-To Email: `[e.g., jane@company.com or noreply@company.com]`

### 2. Strategic Context

**Business Objective**:
`[What is the goal? Engagement, lead nurture, brand awareness, product adoption, community building, etc.]`

**Target Audience**:
- **Segment**: `[All subscribers / Customers / Prospects / Free users / Engaged subscribers / etc.]`
- **List Size**: `XXX subscribers`
- **Persona**: `[Primary persona - see STR-005 for profile]`
- **Stage in Journey**: `[Awareness / Consideration / Decision / Retention / Advocacy]`

**Key Messages** (from STR-002 Messaging Matrix):
1. `[Primary theme or value proposition]`
2. `[Secondary message or supporting content]`
3. `[Tertiary message or call-to-action]`

**Success Metrics**:
- **Open Rate**: `XX% target` (Benchmark: 15-25% for B2B, 20-30% for B2C)
- **Click-Through Rate**: `XX% target` (Benchmark: 2-5%)
- **Conversion Rate**: `XX% target` (for primary CTA)
- **Unsubscribe Rate**: `<0.5% target`

### 3. Email Design & Format

**Template Design**:
- [ ] Plain-text (minimal formatting, personal feel)
- [ ] HTML (branded design, images, multiple sections)
- [ ] Hybrid (simple HTML with text-forward approach)

**Mobile Optimization**:
- [ ] Mobile-responsive design (60%+ of opens on mobile)
- [ ] Single-column layout
- [ ] Large, tappable CTAs (min 44x44px)

**Brand Alignment**:
- [ ] Follows brand guidelines (colors, fonts, logo)
- [ ] Consistent header/footer across all newsletters
- [ ] Aligns with voice & tone guide (see BRD-002)

### 4. Content Strategy

**Content Mix** (typical breakdown):
- [ ] Editorial/Intro (5-10%): Personal message from sender
- [ ] Featured Content (30-40%): Hero story or main content piece
- [ ] Supporting Content (30-40%): 2-4 additional articles/resources
- [ ] Call-to-Action (10-15%): Primary conversion goal
- [ ] Housekeeping/Footer (5-10%): Unsubscribe, social links, contact

**Content Sources**:
- [ ] Original content (written for newsletter)
- [ ] Blog posts (see CNT-001)
- [ ] Whitepapers/eBooks (see CNT-003/CNT-004)
- [ ] Case studies (see CNT-002)
- [ ] Videos/podcasts (see CNT-006/CNT-007)
- [ ] Curated third-party content
- [ ] User-generated content

---

## Newsletter Structure

### Subject Line & Preheader

**Subject Line** (40-50 characters recommended):

**Options** (write 5-7 variations for A/B testing):
1. `[Subject line 1]`
2. `[Subject line 2]`
3. `[Subject line 3]`
4. `[Subject line 4]`
5. `[Subject line 5]`

**Selected Subject**: `___________`

**Subject Line Guidelines**:
- Keep it short (40-50 chars for mobile visibility)
- Create curiosity or urgency (without being clickbait)
- Personalize when possible (e.g., "{{First Name}}, here's your...")
- Avoid spam trigger words (FREE, BUY NOW, CLICK HERE, !!!)
- Test emoji use (can increase opens, but use sparingly)

**Preheader Text** (90-100 characters):
```
[Preview text that appears after subject line in inbox - expand on subject, add value]

Example: "Plus: 3 new resources, upcoming webinar, and our latest case study 📚"
```

**Preheader Guidelines**:
- Complement subject line (don't repeat it)
- Tease newsletter contents
- Use to overcome spam filters (include real value, avoid spammy phrases)

---

### Header

**Logo/Branding**:
- Company logo (linked to homepage)
- Newsletter name/title

**Optional Header Elements**:
- [ ] Navigation links (Blog, Resources, About, Contact)
- [ ] Social media icons (linked to profiles)
- [ ] "View in Browser" link (for email client rendering issues)

**Header Alt Text**: `[Describe logo/header for accessibility and image-off rendering]`

---

### Intro / Editorial (50-100 words)

**Purpose**: Personal, conversational opening from sender to build relationship

**Template**:
```
Hey {{First Name}},

[Opening hook - relatable observation, timely event, or question]

[Context for this edition - why now, what's included]

[Transition to main content]

[Signature]
[Sender Name]
[Title]
```

**Draft Intro**:

`[Write 50-100 word intro following template above]`

**Guidelines**:
- Write in first person (I/we), second person (you)
- Keep it conversational and warm
- Avoid corporate jargon or formality
- Make it scannable (short paragraphs, 1-2 sentences each)

---

### Featured Content / Hero Section (150-250 words)

**Section Title**: `[Eye-catching headline for featured content]`

**Image** (optional):
- Image: `[Describe image or provide URL]`
- Alt Text: `[Descriptive alt text for accessibility]`
- Link: `[Where should image link to?]`

**Content**:

`[Write 150-250 words summarizing the featured content piece]`

**Structure**:
- **Hook**: Opening sentence that grabs attention
- **Value Prop**: What will the reader learn/gain?
- **Key Points**: 2-3 bullet points or short paragraphs
- **CTA**: Clear next step (Read More, Download, Watch, etc.)

**Call-to-Action**:
- CTA Text: `[e.g., "Read the Full Article →"]`
- CTA Link: `[URL with UTM parameters: utm_source=newsletter&utm_medium=email&utm_campaign=___]`
- Button Style: `[Primary button / Text link / Image button]`

**Example**:
```
**The Complete Guide to [Topic]**

[Hook sentence explaining why this matters now]

In this guide, you'll discover:
• [Key takeaway 1]
• [Key takeaway 2]
• [Key takeaway 3]

Whether you're [audience scenario 1] or [audience scenario 2], this guide will help you [outcome].

👉 [Read the Guide](URL)
```

---

### Supporting Content Section 1 (75-100 words)

**Section Title**: `[Headline for content piece 2]`

**Image** (optional): `[...]`

**Summary**:

`[Write 75-100 word summary]`

**CTA**: `[Link text → URL]`

---

### Supporting Content Section 2 (75-100 words)

**Section Title**: `[Headline for content piece 3]`

**Image** (optional): `[...]`

**Summary**:

`[Write 75-100 word summary]`

**CTA**: `[Link text → URL]`

---

### Supporting Content Section 3 (75-100 words) [OPTIONAL]

**Section Title**: `[Headline for content piece 4]`

**Image** (optional): `[...]`

**Summary**:

`[Write 75-100 word summary]`

**CTA**: `[Link text → URL]`

---

### Curated Links / Resource Roundup [OPTIONAL]

**Section Title**: `[e.g., "Worth Reading This Week" or "Recommended Resources"]`

**Format**: Bulleted list with brief descriptions

**Links** (3-5 recommended):
- **[Resource Title 1](URL)** - `[One-sentence description of value]`
- **[Resource Title 2](URL)** - `[One-sentence description of value]`
- **[Resource Title 3](URL)** - `[One-sentence description of value]`
- **[Resource Title 4](URL)** - `[One-sentence description of value]`
- **[Resource Title 5](URL)** - `[One-sentence description of value]`

**Guidelines**:
- Keep descriptions short (one sentence)
- Mix own content and third-party content (build trust through curation)
- Ensure links are valuable and relevant to audience

---

### Primary Call-to-Action (CTA) Section

**Purpose**: Drive main conversion goal for this newsletter

**CTA Type**:
- [ ] Download Resource (eBook, whitepaper, template)
- [ ] Register for Event (webinar, workshop, conference)
- [ ] Start Free Trial / Demo
- [ ] Read Blog Post / Watch Video
- [ ] Complete Survey / Provide Feedback
- [ ] Share on Social / Refer a Friend
- [ ] Other: `___________`

**CTA Copy**:
```
**[Compelling headline emphasizing benefit]**

[1-2 sentences explaining value and why they should act now]

👉 [CTA Button Text]
```

**Example**:
```
**Ready to 10x Your Productivity?**

Join 10,000+ professionals who've transformed their workflow with our free productivity toolkit. Includes templates, checklists, and video tutorials.

👉 Download Free Toolkit
```

**CTA Button**:
- Button Text: `[Action-oriented, benefit-focused - e.g., "Get My Free Toolkit"]`
- Button Link: `[URL with UTM tracking]`
- Button Color: `[High-contrast, on-brand color]`

---

### Social Proof / Testimonial [OPTIONAL]

**Purpose**: Build credibility and trust

**Format**: Short quote with attribution

**Quote**:
```
"[Customer or user quote highlighting key benefit]"

— [Name, Title, Company]
```

**Visual** (optional):
- [ ] Customer photo or logo
- [ ] Star rating or badge

---

### Housekeeping / Secondary Updates [OPTIONAL]

**Purpose**: Share timely updates, announcements, or reminders

**Content** (50-75 words):
```
**Quick Updates**

• [Update 1 - e.g., "Our new feature launched this week: [link]"]
• [Update 2 - e.g., "Upcoming webinar on [date]: [link]"]
• [Update 3 - e.g., "Don't forget: [reminder or deadline]"]
```

---

### Footer

**Standard Footer Elements**:

**Company Information**:
```
[Company Name]
[Address]
[Phone] | [Website]
```

**Social Media Links**:
- LinkedIn: `[URL]`
- Twitter: `[URL]`
- Facebook: `[URL]`
- Instagram: `[URL]`
- YouTube: `[URL]`

**Unsubscribe/Manage Preferences**:
```
You're receiving this email because you subscribed to [Newsletter Name].
[Manage Preferences](URL) | [Unsubscribe](URL)
```

**Legal/Compliance** (if required):
```
© 2025 [Company Name]. All rights reserved.
[Privacy Policy](URL) | [Terms of Service](URL)

[CAN-SPAM/GDPR compliance text if required]
```

**Footer Guidelines**:
- Make unsubscribe link easy to find (reduces spam complaints)
- Include physical address (CAN-SPAM requirement for commercial emails)
- Keep footer consistent across all newsletters

---

## Plain-Text Version

**Purpose**: Fallback for email clients that don't support HTML, and for accessibility

**Plain-Text Format**:
```
Subject: [Subject Line]

Hey [First Name],

[Intro paragraph]

---

FEATURED: [Featured Content Title]

[Featured content summary]

Read more: [URL]

---

ALSO IN THIS EDITION:

1. [Content 2 Title]
   [Brief description]
   [URL]

2. [Content 3 Title]
   [Brief description]
   [URL]

3. [Content 4 Title]
   [Brief description]
   [URL]

---

[CTA Section]

[CTA headline]
[CTA description]
[CTA URL]

---

[Company Name]
[Website]
[Social links]

Manage preferences: [URL]
Unsubscribe: [URL]
```

---

## Review Checklist

### Content Quality

- [ ] **Value**: Newsletter provides genuine value (not just promotional)
- [ ] **Clarity**: Clear, scannable structure (headings, bullets, short paragraphs)
- [ ] **Relevance**: Content relevant to target audience/segment
- [ ] **Voice & Tone**: Aligns with BRD-002 (conversational, authentic)
- [ ] **Accuracy**: All links, dates, and information verified
- [ ] **Grammar**: Passes grammar/spelling check

### Subject Line & Preheader

- [ ] **Subject Line**: 40-50 characters, compelling, no spam triggers
- [ ] **Preheader**: 90-100 characters, complements subject line
- [ ] **Personalization**: {{First Name}} or other merge tags working correctly
- [ ] **A/B Test**: Subject line variations prepared (if testing)

### Design & Formatting

- [ ] **Mobile-Responsive**: Tested on mobile devices (iOS, Android)
- [ ] **Images**: All images optimized (<200KB each), include alt text
- [ ] **CTAs**: Buttons/links are large, tappable, high-contrast
- [ ] **Branding**: On-brand colors, fonts, logo
- [ ] **Load Time**: Email loads quickly (total size <100KB ideal)
- [ ] **Plain-Text Version**: Plain-text version created and tested

### Links & Tracking

- [ ] **UTM Parameters**: All links tagged for tracking (utm_source, utm_medium, utm_campaign)
- [ ] **Link Testing**: All links tested and working correctly
- [ ] **Unsubscribe Link**: Easy to find, working correctly
- [ ] **Merge Tags**: All personalization merge tags tested ({{First Name}}, etc.)

### Legal & Compliance

- [ ] **CAN-SPAM Compliance** (US):
  - [ ] Accurate "From" name and email
  - [ ] Clear subject line (not deceptive)
  - [ ] Physical address included in footer
  - [ ] Unsubscribe link functional and honored within 10 days

- [ ] **GDPR Compliance** (EU):
  - [ ] Recipients have consented to receive emails
  - [ ] Privacy policy linked in footer
  - [ ] Easy opt-out/unsubscribe process

- [ ] **CASL Compliance** (Canada):
  - [ ] Express or implied consent obtained
  - [ ] Clear identification of sender
  - [ ] Unsubscribe mechanism provided

### Quality Assurance

- [ ] **Spam Score**: Checked with spam testing tool (Mail Tester, Litmus, etc.)
- [ ] **Email Client Testing**: Tested in major email clients (Gmail, Outlook, Apple Mail, etc.)
- [ ] **Rendering Test**: Checked in Litmus or Email on Acid
- [ ] **Link Check**: All links clicked and verified
- [ ] **Merge Tag Test**: Send test email to verify personalization
- [ ] **Mobile Test**: Opened on actual mobile device (not just simulator)

---

## Send Checklist

### Pre-Send (24 hours before)

**Audience & Segmentation**:
- [ ] Correct segment/list selected
- [ ] Suppression list applied (unsubscribes, bounces, complainers)
- [ ] Email frequency cap respected (don't over-email)

**Final Review**:
- [ ] Proofread by second person (fresh eyes)
- [ ] Test email sent to internal team
- [ ] Stakeholder approval received (if required)

**Send Configuration**:
- [ ] Send date and time confirmed
- [ ] From name and email correct
- [ ] Reply-to address configured
- [ ] Subject line finalized (A/B test set up if applicable)

### Send Day

**Final Checks**:
- [ ] One last proofread of subject line and preheader
- [ ] Verify send time (correct timezone)
- [ ] Confirm list size and segment

**Send**:
- [ ] Newsletter sent or scheduled
- [ ] Confirmation received from ESP (email service provider)

**Monitoring** (first 2 hours):
- [ ] Monitor deliverability (bounce rate <2%)
- [ ] Check open rate (compare to benchmark)
- [ ] Monitor unsubscribe rate (<0.5%)
- [ ] Watch for any error reports or complaints

### Post-Send (24-48 hours)

**Performance Review**:
- [ ] Open rate: `XX% (target: XX%)`
- [ ] Click-through rate: `XX% (target: XX%)`
- [ ] Conversion rate: `XX% (target: XX%)`
- [ ] Unsubscribe rate: `XX% (target: <0.5%)`
- [ ] Bounce rate: `XX% (target: <2%)`
- [ ] Spam complaints: `XX (target: <0.1%)`

**Top-Performing Content**:
- [ ] Which links got most clicks? `[Identify top 3]`
- [ ] What content resonated? `[Identify patterns]`
- [ ] Did A/B test winner emerge? `[If testing subject lines or CTAs]`

**Optimization Insights**:
- [ ] What to repeat in next edition?
- [ ] What to change or remove?
- [ ] Any subscriber feedback or replies?

---

## Distribution Guidance

### Best Practices

**Send Timing**:
- **B2B**: Tuesday-Thursday, 9-11 AM or 1-3 PM (recipient's timezone)
- **B2C**: Weekends or evenings (when people have leisure time)
- **Test and Optimize**: Every audience is different - test send times and track results

**Frequency**:
- Weekly: High engagement, requires consistent content pipeline
- Bi-weekly: Balanced frequency for most audiences
- Monthly: Less demanding, risk lower engagement
- **Golden Rule**: Consistent is better than frequent - pick a cadence you can maintain

**Subject Line Best Practices**:
- Personalize when appropriate ({{First Name}})
- Create curiosity without being clickbait
- Use numbers ("5 ways to...", "3 mistakes...")
- Ask questions ("Are you making this mistake?")
- Create urgency ("Last chance", "Ending soon") - but use sparingly

**Content Best Practices**:
- Lead with value, not promotion (80% value, 20% promotion)
- Keep paragraphs short (2-3 sentences max)
- Use visuals to break up text
- Include one clear primary CTA
- Make it easy to scan (headings, bullets, bold text)

**Engagement Tactics**:
- Ask questions or solicit feedback
- Include user-generated content or testimonials
- Create series or recurring features (builds anticipation)
- Personalize beyond {{First Name}} (based on behavior, preferences, segment)

### A/B Testing Ideas

**Subject Lines**:
- Test emoji vs. no emoji
- Test question vs. statement
- Test personalization vs. no personalization
- Test short (<30 chars) vs. medium (40-50 chars)

**Content**:
- Test image-heavy vs. text-heavy
- Test single CTA vs. multiple CTAs
- Test plain-text vs. HTML
- Test short vs. long newsletter

**Send Times**:
- Test morning vs. afternoon
- Test weekday vs. weekend
- Test different days of week

---

## Agent Notes

### For Content Strategist
- Align newsletter content with broader content calendar and campaigns
- Monitor engagement trends to refine content mix
- Segment lists for more personalized, relevant newsletters
- Test and optimize subject lines, send times, and content formats

### For Email Marketer
- Maintain list hygiene (remove inactive subscribers, honor unsubscribes)
- Monitor deliverability and sender reputation
- Set up automation for welcome series, nurture sequences
- Track key metrics and share insights with team

### For Copywriter
- Write in conversational, second-person voice ("you")
- Lead with value - what's in it for the reader?
- Use clear, benefit-focused CTAs
- Keep it scannable (headings, bullets, short paragraphs)
- Proofread ruthlessly (typos in subject line = instant delete)

---

## Approval & Version History

**Version**: 1.0.0
**Prepared By**: `[Content Author, role]`
**Date**: `YYYY-MM-DD`

**Approvals**:
- [ ] Content Author: `[Name, date]`
- [ ] Content Strategist: `[Name, date]`
- [ ] Email Marketer: `[Name, date]`
- [ ] Legal/Compliance (if required): `[Name, date]`

**Revision History**:

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | YYYY-MM-DD | `[Name]` | Initial draft |
| | | | |

---

**Related Templates**:
- STR-002: Messaging Matrix Template
- BRD-002: Voice & Tone Guide Template
- CNT-001: Blog Post Template (for newsletter content)
- EML-001: Email Campaign Template (for promotional emails)
- SOC-001: Social Media Post Template (for cross-promotion)
