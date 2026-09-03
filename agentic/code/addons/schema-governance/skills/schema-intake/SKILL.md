---
namespace: aiwg
name: schema-intake
description: Detect whether a new or changed data element needs a governed schema and create a plain-language schema brief. Use for records, configuration, events, APIs, files, messages, persistence, or structured user input.
version: 1.0.0
platforms: [all]
triggers: [define data shape, add a data element, create a config format, store a record, emit an event, structured data]
---

# Schema Intake

1. Identify producers, consumers, storage and transport boundaries.
2. Collect two valid examples, invalid/edge examples, ownership, sensitivity,
   retention, and expected evolution.
3. A schema is required by default when data is persisted, exchanged, configured,
   queued, emitted, imported/exported, or authored as structured content.
4. An opt-out is valid only for ephemeral internal values with no durable or
   cross-component contract; record owner, rationale, boundary, and review date.
5. Create `.aiwg/architecture/schema-briefs/<logical-name>.md` from the addon
   template, then route required contracts to `schema-author`.
