# Daily Health Check Report

**Date:** [YYYY-MM-DD]
**Time:** [HH:MM UTC]
**Week:** [1/2/3/4] of Hypercare
**Facilitator:** [Primary On-Call Engineer Name]

---

## Overall Status

**Health Rating:** [Select one]
- 🟢 **Healthy** - All systems operational, metrics on target, no issues
- 🟡 **Degraded** - Some metrics off target, minor issues, monitoring closely
- 🔴 **Critical** - Major issues, SLO breach, immediate action required

**Summary:** [1-2 sentence description of overall system health]

---

## Metrics Snapshot

| Metric | Current Value | Target | Status | Notes |
|--------|---------------|--------|--------|-------|
| **System Uptime** | [%] | 100% | [🟢/🟡/🔴] | [Any downtime incidents?] |
| **Error Rate** | [%] | <0.1% | [🟢/🟡/🔴] | [Error count: X of Y operations] |
| **Response Time (p50)** | [ms] | <100ms | [🟢/🟡/🔴] | [Trend: improving/stable/degrading] |
| **Response Time (p95)** | [ms] | <500ms | [🟢/🟡/🔴] | [Trend: improving/stable/degrading] |
| **Response Time (p99)** | [ms] | <1s | [🟢/🟡/🔴] | [Trend: improving/stable/degrading] |
| **Throughput** | [ops/min] | 1,000 sustained | [🟢/🟡/🔴] | [Peak: X ops/min] |
| **CPU Utilization** | [%] | <70% | [🟢/🟡/🔴] | [Average across instances] |
| **Memory Utilization** | [%] | <80% | [🟢/🟡/🔴] | [Average across instances] |
| **Active Alerts** | [count] | 0 | [🟢/🟡/🔴] | [List alert names if >0] |
| **New Issues (24h)** | [count] | <3 | [🟢/🟡/🔴] | [Breakdown: PX bugs, Y features, Z questions] |

**Dashboard Screenshots:**
- SLO/SLI Dashboard: [Link or attached screenshot]
- Performance Dashboard: [Link or attached screenshot]
- PagerDuty Status: [Link or attached screenshot]

---

## Incidents Detected (Since Last Health Check)

**[If none, write "No incidents detected" and skip this section]**

### Incident [ID]: [Brief Title]
- **Detected:** [YYYY-MM-DD HH:MM UTC]
- **Severity:** [P0/P1/P2/P3]
- **Status:** [Open/In Progress/Resolved/Closed]
- **Description:** [1-2 sentences describing the issue]
- **Impact:** [Who was affected, how many users, what functionality]
- **Assigned To:** [@engineer-name]
- **Root Cause:** [Known/Under Investigation/Unknown]
- **Resolution:** [What was done to resolve, or current status]
- **Follow-up:** [Any actions needed, or "None"]

### Incident [ID]: [Brief Title]
[Repeat for each incident]

---

## Issues Resolved (Since Last Health Check)

**[If none, write "No issues resolved" and skip this section]**

### Issue [ID]: [Brief Title]
- **Resolved:** [YYYY-MM-DD HH:MM UTC]
- **Original Severity:** [P0/P1/P2/P3]
- **Description:** [1 sentence describing the issue]
- **Resolution:** [What was done to fix]
- **Deployed:** [Version/hotfix number, e.g., "v1.0.1" or "Hotfix #3"]
- **Validation:** [How was fix validated, e.g., "Tested in staging, deployed to prod, monitoring"]

### Issue [ID]: [Brief Title]
[Repeat for each resolved issue]

---

## User Feedback Summary (Last 24 Hours)

**Total Feedback Items:** [count]

**Breakdown by Type:**
- Bugs: [count]
- Feature Requests: [count]
- Questions: [count]
- General Feedback: [count]

**Sentiment Analysis:**
- Positive: [count] ([%])
- Neutral: [count] ([%])
- Negative: [count] ([%])

**Top Issues Reported:**
1. [Issue description] - [count] reports
2. [Issue description] - [count] reports
3. [Issue description] - [count] reports

**Notable Feedback:**
- [Any particularly important or actionable feedback from users]
- [Highlight any praise or critical concerns]

**Actions Taken:**
- [Responses sent, issues logged, escalations made]

---

## Actions Taken (Since Last Health Check)

**[List all actions taken by on-call team]**

- ✅ [Action description] - Completed by [@engineer-name]
- ✅ [Action description] - Completed by [@engineer-name]
- ⏳ [Action description] - In progress by [@engineer-name], ETA: [date]
- ⏳ [Action description] - In progress by [@engineer-name], ETA: [date]

**Hotfixes Deployed:**
- [Version/hotfix number] - [Brief description] - Deployed: [YYYY-MM-DD HH:MM UTC]

**Configuration Changes:**
- [Description of any config changes made, e.g., "Increased alert threshold for CPU to reduce false positives"]

---

## Follow-up Needed

**[List actions that need to be taken in future, with owners and ETAs]**

- [ ] [Action description] - Owner: [@engineer-name] - ETA: [date]
- [ ] [Action description] - Owner: [@team-name] - ETA: [date]
- [ ] [Action description] - Owner: [@engineer-name] - ETA: [date]

**Escalations:**
- [If any issues need escalation to secondary on-call or engineering lead, list here]

**Monitoring:**
- [If any metrics/issues need close monitoring, note here with expected resolution time]

---

## Exit Criteria Progress Tracker

**[Update daily starting Week 2, Day 7]**

| Criterion | Target | Current Status | Days Streak | On Track? |
|-----------|--------|----------------|-------------|-----------|
| **Stability** | 7 consecutive days, zero P0/P1 | [X] days with zero P0/P1 | [X/7] | [Yes/No] |
| **SLO Compliance** | ≥99.9% uptime | [Current uptime %] | - | [Yes/No] |
| **User Satisfaction** | ≥90% NPS | [Current NPS score] | - | [Yes/No] |
| **Issues Resolved** | All P0/P1 closed | [X] P0 open, [Y] P1 open | - | [Yes/No] |
| **Support Readiness** | Team confident | [Readiness score /10] | - | [Yes/No] |

**Notes:**
- [Any comments on exit criteria progress, blockers, or concerns]

---

## Recommendations

**[Optional section for on-call engineer to provide recommendations to team or leadership]**

**Short-term (This Week):**
- [Recommendation, e.g., "Increase monitoring frequency for CPU metrics due to trend"]

**Medium-term (Next Release):**
- [Recommendation, e.g., "Add caching layer to improve response time"]

**Long-term (Backlog):**
- [Recommendation, e.g., "Investigate auto-scaling to handle burst traffic"]

---

## Next Health Check

**Scheduled:** [YYYY-MM-DD HH:MM UTC]
**Facilitator:** [Primary On-Call Engineer Name]

---

## Approvals

**Primary On-Call:** [@engineer-name] - [Date]
**Secondary On-Call (Review):** [@engineer-name] - [Date]
**Engineering Lead (Week 1 only):** [@engineer-name] - [Date]

---

## Distribution

**Published:**
- Slack #hypercare channel: [Link to message]
- Email to stakeholders: [Sent/Not Sent]
- Archived: `.aiwg/transition/hypercare/reports/[YYYY-MM-DD]-health-check.md`

---

**END OF DAILY HEALTH CHECK REPORT**
