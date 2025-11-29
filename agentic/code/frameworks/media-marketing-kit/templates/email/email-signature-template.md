# Email Signature Standard

**Card ID**: `EML-{PROJECT}-{NNNN}`
**Version**: 1.0
**Status**: Draft | Approved | Deployed
**Effective Date**: {DATE}
**Owner**: {OWNER_NAME}

---

## Overview

This document defines the standard email signature format for {Organization Name} to ensure brand consistency across all professional communications.

---

## Signature Formats

### Standard Signature

```html
<table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, sans-serif; font-size: 14px; color: #333333;">
  <tr>
    <td style="padding-right: 15px; border-right: 2px solid {BRAND_COLOR};">
      <img src="{HEADSHOT_URL}" alt="{Full Name}" width="80" height="80" style="border-radius: 50%;">
    </td>
    <td style="padding-left: 15px;">
      <p style="margin: 0 0 5px 0; font-weight: bold; font-size: 16px; color: #333333;">
        {Full Name}
      </p>
      <p style="margin: 0 0 5px 0; color: #666666; font-size: 14px;">
        {Job Title}
      </p>
      <p style="margin: 0 0 5px 0; font-weight: bold; color: {BRAND_COLOR}; font-size: 14px;">
        {Company Name}
      </p>
      <p style="margin: 0 0 10px 0; font-size: 13px; color: #666666;">
        <a href="mailto:{email}" style="color: {BRAND_COLOR}; text-decoration: none;">{email}</a>
        &nbsp;|&nbsp;
        <a href="tel:{phone}" style="color: #666666; text-decoration: none;">{phone}</a>
      </p>
      <p style="margin: 0;">
        <a href="{LINKEDIN_URL}" style="text-decoration: none;">
          <img src="{LINKEDIN_ICON}" alt="LinkedIn" width="20" height="20" style="margin-right: 5px;">
        </a>
        <a href="{TWITTER_URL}" style="text-decoration: none;">
          <img src="{TWITTER_ICON}" alt="Twitter" width="20" height="20" style="margin-right: 5px;">
        </a>
        <a href="{WEBSITE_URL}" style="text-decoration: none;">
          <img src="{WEBSITE_ICON}" alt="Website" width="20" height="20;">
        </a>
      </p>
    </td>
  </tr>
</table>
```

### Minimal Signature

```html
<table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, sans-serif; font-size: 14px; color: #333333;">
  <tr>
    <td>
      <p style="margin: 0 0 3px 0; font-weight: bold;">{Full Name}</p>
      <p style="margin: 0 0 3px 0; color: #666666;">{Job Title} | {Company Name}</p>
      <p style="margin: 0; font-size: 13px;">
        <a href="tel:{phone}" style="color: #666666; text-decoration: none;">{phone}</a>
        &nbsp;|&nbsp;
        <a href="{website}" style="color: {BRAND_COLOR}; text-decoration: none;">{website}</a>
      </p>
    </td>
  </tr>
</table>
```

### Mobile Reply Signature

```
{Full Name}
{Job Title} | {Company Name}
{phone}
```

---

## Required Elements

### All Signatures Must Include

| Element | Required | Format |
|---------|----------|--------|
| Full name | Yes | First Last |
| Job title | Yes | Official title |
| Company name | Yes | {Company Name} |
| Email | Optional | firstname.lastname@company.com |
| Phone | Recommended | +1 (XXX) XXX-XXXX |

### Optional Elements

| Element | When to Use |
|---------|-------------|
| Headshot | Standard signature only |
| Social icons | External-facing roles |
| Pronouns | Employee preference |
| Credentials | Relevant certifications |
| Campaign banner | Active promotions |

---

## Brand Elements

### Colors

| Element | Color | Hex |
|---------|-------|-----|
| Company name | Brand primary | {#HEX} |
| Links | Brand primary | {#HEX} |
| Text | Dark gray | #333333 |
| Secondary text | Medium gray | #666666 |
| Divider | Brand primary | {#HEX} |

### Typography

| Element | Style |
|---------|-------|
| Font family | Arial, sans-serif |
| Name | Bold, 16px |
| Title | Regular, 14px |
| Company | Bold, 14px |
| Contact info | Regular, 13px |

### Images

| Asset | Specifications |
|-------|----------------|
| Headshot | 80x80px, circular crop |
| Company logo | Max 150px wide |
| Social icons | 20x20px each |
| Campaign banner | 400x100px max |

---

## Social Icons

### Approved Icons

| Platform | Icon URL | Alt Text |
|----------|----------|----------|
| LinkedIn | {URL} | LinkedIn |
| Twitter/X | {URL} | Twitter |
| Facebook | {URL} | Facebook |
| Instagram | {URL} | Instagram |
| YouTube | {URL} | YouTube |
| Website | {URL} | Website |

### Icon Guidelines

- Use brand-colored or monochrome icons
- Maximum 5 social icons
- Include only active, relevant profiles
- Order: LinkedIn, Twitter, Facebook, Instagram, YouTube

---

## Headshot Requirements

### Photo Standards

| Requirement | Specification |
|-------------|---------------|
| Format | JPG or PNG |
| Dimensions | 200x200px minimum |
| Display size | 80x80px |
| Background | Solid color or professional setting |
| Lighting | Professional, even lighting |
| Attire | Business appropriate |
| Expression | Professional, approachable |

### Photo Don'ts

- Selfies or casual photos
- Group photos or cropped images
- Logos or graphics instead of photos
- Outdated photos (>3 years old)
- Heavy filters or effects

---

## Campaign Banners

### Banner Specifications

| Attribute | Specification |
|-----------|---------------|
| Dimensions | 400x100px |
| Format | PNG or GIF |
| File size | < 50KB |
| Link | Required, tracked URL |
| Alt text | Required, descriptive |

### Usage Guidelines

- Approved campaigns only
- Maximum 1 banner per signature
- Remove within 7 days of campaign end
- Track link clicks via UTM parameters

### Current Campaign

| Campaign | Banner | Start | End |
|----------|--------|-------|-----|
| {Campaign name} | {URL} | {Date} | {Date} |

---

## Disclaimer Text

### Standard Disclaimer

```
This email and any attachments are confidential and intended solely for the
addressee. If you are not the intended recipient, please notify the sender
immediately and delete this message. {Company Name} accepts no liability for
any loss or damage caused by viruses or unauthorized modification of this email.
```

### Legal Disclaimer (If Required)

```
{Company Name} | {Full Legal Name}
{Registered Address}
Company Registration No: {Number}
```

### When to Include

| Scenario | Disclaimer Required |
|----------|---------------------|
| External emails | Yes |
| Internal emails | No |
| Legal correspondence | Yes (extended) |
| Marketing emails | N/A (use email template) |

---

## Role-Specific Variations

### Executive Signature

Additional elements allowed:
- Assistant contact information
- Calendar scheduling link
- Personal LinkedIn URL

### Sales Signature

Additional elements allowed:
- Meeting scheduler link
- Current promotion banner
- Direct booking calendar

### Support Signature

Additional elements allowed:
- Support ticket link
- Knowledge base link
- Chat availability

---

## Implementation Guide

### Email Client Setup

**Outlook**:
1. File → Options → Mail → Signatures
2. New → Paste HTML
3. Set as default for new/reply emails

**Gmail**:
1. Settings → See all settings → Signature
2. Create new → Paste formatted text
3. Set signature defaults

**Apple Mail**:
1. Preferences → Signatures
2. Create new signature
3. Paste formatted content

### Testing Checklist

- [ ] Renders correctly in Outlook
- [ ] Renders correctly in Gmail
- [ ] Renders correctly on mobile
- [ ] Links work correctly
- [ ] Images load properly
- [ ] Social icons visible and linked
- [ ] No broken formatting in replies

---

## Compliance

### Required for All Signatures

- [ ] Company name spelled correctly
- [ ] No unauthorized logos
- [ ] No personal promotional content
- [ ] No animated GIFs (except approved banners)
- [ ] No inspirational quotes
- [ ] Professional headshot (if used)

### Prohibited Content

- Personal businesses or side projects
- Political statements or affiliations
- Religious content
- Unauthorized certifications
- Animated elements (unless approved)
- Marketing claims without approval

---

## Update Process

### When to Update

| Change | Action Required |
|--------|-----------------|
| Name change | New signature required |
| Title change | Update within 7 days |
| Phone change | Update immediately |
| Headshot update | Recommended annually |
| Campaign change | Follow banner schedule |

### Request Process

1. Submit update request to {department/system}
2. Provide required information
3. IT/Marketing provides updated signature
4. Install in all email clients

---

## Resources

### Downloads

| Resource | Location |
|----------|----------|
| Signature generator | {URL} |
| Icon pack | {URL} |
| Brand guidelines | {URL} |
| Headshot submission | {URL} |

### Support

| Issue | Contact |
|-------|---------|
| Technical setup | IT Help Desk |
| Brand questions | Marketing |
| Headshot scheduling | HR |

---

## Approval

| Role | Name | Signature | Date |
|------|------|-----------|------|
| Brand Manager | | | |
| Legal | | | |
| IT | | | |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | {DATE} | Initial standard |

---

*Template version: 1.0 | MMK Framework*
