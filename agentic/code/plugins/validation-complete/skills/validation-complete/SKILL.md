---
namespace: aiwg
name: validation-complete
platforms: [all]
description: Activate and run provider-normalized validation playbooks across configured AIWG providers, including single-provider and all-provider checks.
triggers:
  - validate all AIWG providers
  - run provider validation
  - normalize provider validation results
  - enable the validation framework
---

# Validation Complete

Use this driver to activate the validation framework:

```bash
aiwg use validation-complete --provider <provider>
```

Then select the canonical playbook:

- `provider-validation.yaml` validates one provider.
- `validate-all-providers.yaml` validates every configured provider and
  normalizes results through `provider-normalization.yaml`.

Report provider-specific evidence separately before presenting the normalized
aggregate. A missing or unsupported provider result must remain visible rather
than being converted into a pass.

## References

- @$AIWG_ROOT/${CLAUDE_PLUGIN_ROOT}/README.md
- @$AIWG_ROOT/${CLAUDE_PLUGIN_ROOT}/playbooks/provider-validation.yaml
- @$AIWG_ROOT/${CLAUDE_PLUGIN_ROOT}/playbooks/validate-all-providers.yaml
