# CLI cold-start performance gate

The CLI startup gate measures application overhead separately from the Node.js
process startup cost. Each command sample is bracketed by two baseline
invocations of `node -e ''`; the average of those adjacent baselines is
subtracted from that command sample. The gate evaluates the median paired
overhead across seven samples.

This pairing tracks short-lived contention on shared runners better than
measuring every command first and every baseline afterward. Median evaluation
allows isolated scheduler spikes while retaining a hard failure when at least
half the samples exceed the performance objective.

## Budgets

The enforced defaults are:

| Command | Local overhead budget |
| --- | ---: |
| `aiwg --version` | 150 ms |
| `aiwg help` | 750 ms |

An isolated `npm run test:perf` run should keep `aiwg help` below the 500 ms
engineering target. The enforced 750 ms ceiling accounts for parallel-suite
and container contention while still failing sustained regressions. Gitea CI,
plugin validation, and both publication workflows declare one shared-runner
policy explicitly: 300 ms for `--version`, 750 ms for `help`, and seven paired
samples.

The following environment variables are supported:

- `AIWG_PERF_BUDGET_VERSION_MS`: positive integer overhead budget.
- `AIWG_PERF_BUDGET_HELP_MS`: positive integer overhead budget.
- `AIWG_PERF_SAMPLE_COUNT`: odd integer of at least 3; defaults to 7.

Invalid overrides fall back to their documented defaults. CI logs report the
command median, paired baseline median, overhead median, range, sample count,
and budget so variance remains observable. Any sustained regression whose
median overhead meets or exceeds the configured budget fails the gate.
