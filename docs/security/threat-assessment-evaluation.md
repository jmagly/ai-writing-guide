# Threat-assessment evaluation

The version-1 evaluation corpus is
`test/fixtures/security/threat-assessment-corpus.json`. It contains 20 labeled
inputs spanning every supported forge surface:

- issue title, body, and comment;
- pull-request title, body, and diff summary;
- review comment;
- release note;
- handoff;
- outbound maintainer comment.

The corpus includes issue #1922's negative secret-storage warning, issue
#2136's benign ML/NLP terminology across issue and outbound-comment surfaces,
quoted injection evidence, ordinary configuration/release content, and malicious
variants for credential exfiltration, instruction override, unsafe
third-party execution, floating dependencies, CI targeting, and cross-surface
prompt injection.

Run:

```bash
npm run benchmark:threat-assessment
```

## Baseline

Baseline refreshed 2026-08-21 with engine `1.0.1`:

| Profile | False-positive rate | False-negative rate | Recall | Interruption rate | Decision stability |
|---|---:|---:|---:|---:|---:|
| trusted/off | 0% | 100% | 0% | 0% | 100% |
| audit | 0% | 0% | 100% | 0% | 100% |
| balanced | 0% | 0% | 100% | 45% | 100% |
| strict | 0% | 0% | 100% | 45% | 100% |
| high-assurance | 0% | 0% | 100% | 45% | 100% |

The trusted/off false-negative rate is intentional: off performs no AIWG
blocking assessment. It remains visible to prevent an off profile from being
misrepresented as detector performance.

The corpus is a regression fixture, not a general prevalence estimate. Its
current rates prove behavior on the labeled cases only. Additions should
include realistic benign counterexamples alongside new malicious variants so
precision, recall, interruption, and decision stability remain jointly
reviewable.
