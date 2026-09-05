# Network-control review with packet evidence

Use governed packet evidence to compare intended controls with observed saved
traffic. Suitable questions include whether segmentation blocked a path,
whether egress used approved destinations, whether only documented service
ports were exposed, whether DNS followed policy, and whether encryption covered
the expected protocol boundary.

Record the policy/control identifier, expected behavior, evidence bundle and
analysis-context digests, observed packet citations, result, confidence, and
limitations. Separate direct observations from conclusions about control
effectiveness. A single trace usually cannot establish population-wide
effectiveness; record its hosts, vantage point, time window, missing traffic,
and encryption visibility.

Security-engineering uses saved evidence as a readiness and review input. It
does not start live collection, active scanning, containment, or cleanup. Route
case evidence, IOC extraction, timelines, and incident findings to the existing
forensics Network Analyst and `forensics-complete` custody workflow. Payload
review requires explicit local policy and opt-in, and any provider transfer
requires its own disclosure decision.
