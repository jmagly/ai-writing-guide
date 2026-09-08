# Testing platform adapter qualification

Platform, runner version, adapter format/version and target system: {{identity}}
Status: {{researched_recipe_fixture_tested_parser_or_target_verified_integration}}
Original reporter artifacts and schema references: {{raw_sources}}

| Case | Raw input and command | Expected normalized result | Actual artifact | Outcome |
| --- | --- | --- | --- | --- |
| Passing cases | {{fixture}} | Correct file/case IDs and pass count | {{result}} | {{outcome}} |
| Failed case/setup suite | {{fixture}} | Failure preserved; no false pass | {{result}} | {{outcome}} |
| Skipped cases | {{fixture}} | Explicit skipped state/reason | {{result}} | {{outcome}} |
| Empty/malformed/truncated | {{fixture}} | Incomplete/error; never conformant | {{result}} | {{outcome}} |
| Discovery only | {{fixture}} | Registration only; no execution proof | {{result}} | {{outcome}} |
| Duplicate/parameterized | {{fixture}} | Stable unique expanded identities or explicit ambiguity | {{result}} | {{outcome}} |
| Missing source path | {{fixture}} | Unknown path; no invented mapping | {{result}} | {{outcome}} |
| Stale/outside-root path | {{fixture}} | Rejected or unresolved as applicable | {{result}} | {{outcome}} |

Source→registered→executed reconciliation proof: {{independent_target_run}}
Coverage denominator and unavailable metrics: {{coverage}}
Negative control with intended failure and restoration: {{control}}
Generated custom template/protocol and deployment receipt: {{deployment}}
Known unsupported reporter variants/versions: {{gaps}}

A schema's accepted format name or a documentation link is not proof that a parser or live integration exists.
Qualification requires the corresponding execution evidence. Preserve original reports and identify adapter assumptions;
never fabricate file names from suite or package labels.
