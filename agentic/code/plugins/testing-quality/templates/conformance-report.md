# Testing conformance report

Target/protocol/revision, report date and evidence run IDs: {{identity}}
Decision: {{conformant_nonconformant_or_incomplete_using_assessment_state}}
Declared scope and material limitations: {{scope}}

## Test population and runner reconciliation

| Area/lane | Files | Static declarations | Registered cases | Executed passed/failed/skipped | Missing/overlapping/unknown |
| --- | ---: | ---: | ---: | --- | --- |
| {{area_lane}} | {{files}} | {{declarations}} | {{registered}} | {{outcomes}} | {{gaps}} |

Explain different units, lane overlap, unsupported syntax, file-only harnesses, parameter expansion and manual script
boundaries. Do not add overlapping lanes as unique tests.

## Test types and systems

| Observed test type | Actual SUT boundary | Real resources/doubles | Evidence | Limit |
| --- | --- | --- | --- | --- |
| {{type}} | {{system}} | {{boundary}} | {{source_and_receipt}} | {{not_proven}} |

## Coverage

| Metric | Covered/total or reported value | Source scope/version | Threshold enforcement evidence | Limitation |
| --- | --- | --- | --- | --- |
| {{metric}} | {{value_or_unavailable}} | {{denominator}} | {{negative_gate_control}} | {{limit}} |

## Review, findings and normalization

Seed, sampling unit, area populations, quota/census, reviewed scope and unreviewed remainder: {{sample}}

| Finding ID/priority | Source-bound evidence | Validity/quality/normalization issue | Repair | Verification status |
| --- | --- | --- | --- | --- |
| {{finding}} | {{case_and_hash}} | {{confirmed_issue}} | {{plan_receipt}} | {{rerun_result}} |

Separate screening candidates from reviewed defects. Explain why controls failed, and distinguish semantic failure from
startup error. Preserve original failures and post-repair comparisons. List partial transaction or rollback conflicts
explicitly.

## Research and next work

Local paths, official URLs, dates, version applicability and transfer limitations: {{sources}}
Recommended tools and qualification status: {{recommendations}}
Remaining required evidence, owner and next executable step: {{remaining_work}}
