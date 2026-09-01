# Civic Action quick start

> **First time using AIWG?** Begin with [Install, Connect, and Verify](https://docs.aiwg.io/pages/getting-started--install-connect-verify.html). This guide assumes AIWG is already installed, `all` is deployed for your provider, and `aiwg-regenerate` has connected the agent to this project.

```bash
aiwg use civic-action
```

Then ask AIWG to plan a public-records request, reconcile a public meeting,
review a public-technology procurement, index CAP/GTFS/HSDS local resources, or
prepare a cited civic newsroom workflow.

The three deterministic gates are:

```bash
aiwg civic source-gate source-registry.json
aiwg civic meeting-gate vote-ledger.json reconciliation.json
aiwg civic publish-gate publication-packet.json
```

A machine pass is evidence for review, not authorization. Named human review of
the exact artifact remains mandatory before any consequential external action.
