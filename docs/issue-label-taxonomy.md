# Issue Label Taxonomy

AIWG issue workflows resolve tracker labels from `.aiwg/aiwg.config`. Semantic
roles remain stable while Gitea, GitHub, and the local issue store may use
different label strings.

```json
{
  "remotes": {
    "issue_tracker": "origin"
  },
  "issues": {
    "labels": {
      "human_required": {
        "name": "hitl",
        "provider_names": {
          "github": "human-required",
          "local": "needs-human"
        },
        "category": "human-interaction",
        "description": "Work cannot continue until a human responds",
        "requires_human": true,
        "blocks_automation": true,
        "resume_when": "requested human input is recorded"
      },
      "feature": {
        "name": "feature",
        "category": "type",
        "description": "Feature work",
        "requires_human": false,
        "blocks_automation": false
      }
    }
  }
}
```

The supported categories are `type`, `area`, `priority`, `lifecycle`,
`blocked-reason`, `review-approval`, `ownership`, `automation-eligibility`,
and `human-interaction`. Keys such as `human_required` are project-owned stable
roles. Workflows filter and mutate by role, then resolve the tracker-native name.

When `blocks_automation` is true, `resume_when` is required. A workflow applying
the label must also post a concise comment saying what human action is needed
and quoting the resume condition. After that condition is satisfied, the
workflow removes the transient label or applies `transition_to`, while
preserving every unrelated label.

Before issue processing, validation reports:

- missing required semantic fields;
- duplicate tracker names;
- conflicting blocking or transition rules; and
- configured names unavailable in the selected tracker.

Validation is read-only. Missing labels are never silently created, renamed, or
deleted. Provisioning must be a separate explicit operator action.

Validate structural semantics with:

```bash
aiwg config validate --project --provider gitea
```

When a workflow has fetched the tracker label catalog, it can pass the native
names to the same diagnostic surface:

```bash
aiwg config validate --project --provider gitea \
  --available-label hitl \
  --available-label feature
```

Any configured label absent from that catalog is reported as unavailable and
the command fails without mutating the tracker.

Projects without `issues.labels` keep legacy behavior for compatibility.
Workflows must emit a fallback warning before using a conventional name such as
`question`; they must not silently invent or provision a label. Configure the
taxonomy to make search, audit, batching, selection, and workflow transitions
portable across trackers.
