# Transactional Email Specification

**Card ID**: `EML-{PROJECT}-{NNNN}`
**Version**: 1.0
**Status**: Draft | Development | QA | Production
**Email Type**: {TRANSACTION_TYPE}
**Owner**: {OWNER_NAME}

---

## Email Overview

### Transaction Type

- [ ] Account creation / Welcome
- [ ] Password reset
- [ ] Order confirmation
- [ ] Shipping notification
- [ ] Delivery confirmation
- [ ] Payment receipt
- [ ] Subscription confirmation
- [ ] Cancellation confirmation
- [ ] Refund notification
- [ ] Account update
- [ ] Security alert
- [ ] {Other}

### Trigger Event

| Field | Value |
|-------|-------|
| Trigger | {Event that sends this email} |
| Source system | {System that generates trigger} |
| Delay | Immediate / {X} minutes |
| Priority | Critical / High / Normal |

---

## Sending Details

| Field | Value |
|-------|-------|
| From name | {Company Name} or {Company Name} Notifications |
| From email | noreply@{domain}.com or {specific}@{domain}.com |
| Reply-to | support@{domain}.com |
| Subject | {Subject line with personalization} |
| Preheader | {Preview text} |

### Subject Line Variations

| Scenario | Subject |
|----------|---------|
| Default | {Subject} |
| {Variation} | {Subject} |

---

## Content Requirements

### Data Fields Required

| Field | Source | Required | Fallback |
|-------|--------|----------|----------|
| {{first_name}} | User profile | Yes | Customer |
| {{order_number}} | Transaction | Yes | N/A |
| {{order_date}} | Transaction | Yes | N/A |
| {{total_amount}} | Transaction | Yes | N/A |
| {{items}} | Transaction | Yes | N/A |
| {{tracking_number}} | Shipping | Conditional | N/A |

### Content Structure

```
HEADER
- Logo (linked to homepage)
- [Optional] Navigation

BODY
- Greeting: Hi {{first_name}},
- Transaction summary
- Key details / table
- Next steps / actions
- CTA button (if applicable)

FOOTER
- Support contact info
- FAQ link
- Unsubscribe (if legally required)
- Physical address
- Legal disclaimers
```

---

## Dynamic Content Blocks

### Order Items Block

```html
{{#each items}}
<tr>
  <td><img src="{{image}}" alt="{{name}}" width="80"></td>
  <td>
    <p>{{name}}</p>
    <p>Qty: {{quantity}}</p>
  </td>
  <td>{{price}}</td>
</tr>
{{/each}}
```

### Order Summary Block

```html
<table>
  <tr><td>Subtotal</td><td>{{subtotal}}</td></tr>
  <tr><td>Shipping</td><td>{{shipping}}</td></tr>
  <tr><td>Tax</td><td>{{tax}}</td></tr>
  <tr><td><strong>Total</strong></td><td><strong>{{total}}</strong></td></tr>
</table>
```

### Address Block

```html
<p>
  {{shipping_name}}<br>
  {{shipping_address1}}<br>
  {{#if shipping_address2}}{{shipping_address2}}<br>{{/if}}
  {{shipping_city}}, {{shipping_state}} {{shipping_zip}}<br>
  {{shipping_country}}
</p>
```

---

## Visual Design

### Template Layout

```
┌─────────────────────────────────┐
│ [Logo]                          │
├─────────────────────────────────┤
│                                 │
│  Transaction Title              │
│  {{key_info}}                   │
│                                 │
│  ┌───────────────────────────┐  │
│  │   Details Table/Block     │  │
│  │   - Line items            │  │
│  │   - Amounts               │  │
│  └───────────────────────────┘  │
│                                 │
│  Next Steps / Important Info    │
│                                 │
│  [CTA Button] (if applicable)   │
│                                 │
├─────────────────────────────────┤
│  Help & Support                 │
│  Contact | FAQ | Account        │
├─────────────────────────────────┤
│  Footer / Legal                 │
└─────────────────────────────────┘
```

### Styling

| Element | Specification |
|---------|---------------|
| Width | 600px max |
| Background | #FFFFFF (white) |
| Border | 1px solid #E0E0E0 |
| Padding | 20px |
| Font | Arial, sans-serif |
| Body text | 14px, #333333 |
| Headings | 18-24px, #333333 |
| Links | {#BRAND_COLOR} |

---

## CTA Requirements

### Primary CTA (If Applicable)

| Field | Value |
|-------|-------|
| Button text | {Action text} |
| URL | {Destination with tracking} |
| Style | Brand primary color |
| Size | Min 44px height |

### Secondary Actions

| Action | Text | URL |
|--------|------|-----|
| View order | View Order Details | {order_url} |
| Track shipment | Track Package | {tracking_url} |
| Contact support | Need Help? | {support_url} |

---

## Compliance Requirements

### Legal Requirements

| Requirement | Status |
|-------------|--------|
| Physical address | Required |
| Unsubscribe | Not required for transactional |
| Privacy policy link | Recommended |
| Terms link | Recommended |

### Data Privacy

- [ ] Only necessary data included
- [ ] No sensitive data in plain text
- [ ] Secure links (HTTPS)
- [ ] PCI compliant (if payment info)

### Accessibility

- [ ] Alt text on all images
- [ ] Sufficient color contrast
- [ ] Logical reading order
- [ ] Plain text version available

---

## Technical Specifications

### API Integration

```json
{
  "email_type": "{transaction_type}",
  "recipient": {
    "email": "{{email}}",
    "first_name": "{{first_name}}",
    "last_name": "{{last_name}}"
  },
  "transaction_data": {
    "order_id": "{{order_id}}",
    "order_date": "{{order_date}}",
    "items": [
      {
        "name": "{{item_name}}",
        "quantity": "{{quantity}}",
        "price": "{{price}}",
        "image": "{{image_url}}"
      }
    ],
    "totals": {
      "subtotal": "{{subtotal}}",
      "shipping": "{{shipping}}",
      "tax": "{{tax}}",
      "total": "{{total}}"
    }
  }
}
```

### ESP/Platform Configuration

| Setting | Value |
|---------|-------|
| Platform | {ESP name} |
| Template ID | {ID} |
| API endpoint | {URL} |
| Authentication | {Method} |
| Rate limit | {Emails/second} |

### Error Handling

| Error | Behavior |
|-------|----------|
| Missing required field | Log error, don't send |
| Invalid email | Queue for review |
| API timeout | Retry 3x with backoff |
| Template error | Fallback to text version |

---

## Testing Requirements

### Functional Tests

- [ ] Correct trigger event sends email
- [ ] All personalization renders
- [ ] Dynamic blocks populate correctly
- [ ] Links work and track properly
- [ ] Images load from CDN
- [ ] Plain text version generates

### Data Scenarios

| Scenario | Test Data |
|----------|-----------|
| Single item order | {Test case} |
| Multi-item order | {Test case} |
| Free shipping | {Test case} |
| International address | {Test case} |
| Maximum items | {Test case} |
| Minimum data | {Test case} |

### Email Client Testing

- [ ] Gmail (web, iOS, Android)
- [ ] Apple Mail (macOS, iOS)
- [ ] Outlook (2016, 2019, 365, web)
- [ ] Yahoo Mail
- [ ] Plain text clients

---

## Monitoring & Alerts

### Delivery Monitoring

| Metric | Alert Threshold |
|--------|-----------------|
| Send failures | > {X}% per hour |
| Bounce rate | > {X}% |
| Delivery delay | > {X} minutes |
| Complaint rate | > 0.1% |

### Performance Metrics

| Metric | Target | Alert |
|--------|--------|-------|
| Open rate | > {X}% | < {Y}% |
| Click rate | > {X}% | < {Y}% |
| Time to deliver | < {X} sec | > {Y} sec |

### Alert Recipients

| Alert Type | Recipients |
|------------|------------|
| Critical (outage) | {Team/individuals} |
| Warning | {Team/individuals} |
| Performance | {Team/individuals} |

---

## Localization

### Supported Languages

| Language | Locale | Template ID |
|----------|--------|-------------|
| English (US) | en-US | {ID} |
| English (UK) | en-GB | {ID} |
| Spanish | es | {ID} |
| French | fr | {ID} |

### Localized Elements

| Element | Localized |
|---------|-----------|
| Subject line | Yes |
| Body copy | Yes |
| Date format | Yes |
| Currency | Yes |
| Legal text | Yes |

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | {DATE} | {Name} | Initial specification |

---

## Approval

| Role | Name | Status | Date |
|------|------|--------|------|
| Product Owner | | | |
| Development | | | |
| Legal | | | |
| QA | | | |

---

## Related Documentation

| Document | Link |
|----------|------|
| API documentation | {URL} |
| Template files | {URL} |
| Brand guidelines | {URL} |
| Legal requirements | {URL} |

---

*Template version: 1.0 | MMK Framework*
