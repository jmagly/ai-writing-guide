---
template: civic-publication-review
version: 1.0.0
category: civic-action
description: Human review of the exact civic publication artifact and its machine-gate evidence.
variables: [artifact_id, artifact_hash]
---

# Publication review: {{ artifact_id }}

Exact hash: `{{ artifact_hash }}`

- [ ] Source access/reuse and jurisdiction profiles current.
- [ ] Material claims have resolvable selectors and correct epistemic labels.
- [ ] Every required section meets its declared minimum count and freshness rule.
- [ ] Material links, declared structured data, and live-page checks pass.
- [ ] Quotes, speakers, motions, votes, allegations, and response are verified.
- [ ] Privacy/safety minimization and public/closed boundaries pass.
- [ ] Accessibility automated and required manual evaluation complete.
- [ ] Headline, metadata, structured data, and social copy do not overstate.
- [ ] Correction contact/version/propagation plan exists.
- [ ] Last-good copy and static/CMS sitemap, reindex, and cache handoffs pass or
      are explicitly not applicable.
- [ ] Machine blocks absent; warnings explicitly disposed.
- Reviewer/role/decision/conditions/time/expiry:
