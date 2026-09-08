# Target testing protocol review

Protocol name/version/path: {{protocol}}
Target root and revision/source digest: {{target}}
Platform, actual runner versions and system boundary: {{platform_system}}
Reviewer and date: {{reviewer_date}}

## Scope and units

| Area | Source/test globs and exclusions | Source population | Registered population | Executed population | Scope gap |
| --- | --- | --- | --- | --- | --- |
| {{area}} | {{globs}} | {{files_and_declarations}} | {{cases_or_unknown}} | {{cases_or_unknown}} | {{gap}} |

State whether areas are ownership directories, test types or systems. Document overlap and unmatched files.
Parameterized static declarations and runtime cases have different denominators. Include manually invoked scripts and
package-local lanes when within scope.

## Runner contract

For each lane record ID, runner/version, argv, cwd, timeout/environment requirements, required/optional status, source
include/exclude, discovery command, result format/path and execution command. Explain build/import/service effects. A
missing optional discovery command leaves registration unknown. Identify reporter adapters as fixture-tested,
target-verified or unavailable.

## Policy and coverage

Record `requireDiscovery`, `requireReview`, `requireNegativeControls`, `allowSkipped` and coverage thresholds. Explain
source denominator/exclusions and where enforcement executes in CI. Do not copy a universal coverage target without
project rationale. Whole-scope `requireReview` means every in-scope test file needs complete current review evidence; a
20-case sample is insufficient. Capture negative control change-plan path, intended affected case IDs, command and
expected semantic failure.

## Research and decision

Configured existing/missing local research paths: {{paths}}
Web permission and dated official platform sources: {{sources}}
Protocol decision and unresolved prerequisites: {{decision}}
Acceptance evidence required before final conformance: {{evidence}}
