---
type: schema
name: network-analysis-contracts
description: Canonical schema index for governed packet evidence, analysis recipes, and authorization/disclosure records.
triggers:
  - "PCAP evidence schema"
  - "packet evidence contract"
---

# Network analysis contracts

The canonical, packaged JSON Schemas live at:

- `schemas/network-analysis/packet-evidence.v1.schema.json`
- `schemas/network-analysis/analysis-recipe.v1.schema.json`
- `schemas/network-analysis/governance-record.v1.schema.json`

Do not fork these schemas inside the addon. The root schema catalog owns their
identities, compatibility policy, fixtures, and publication metadata.
