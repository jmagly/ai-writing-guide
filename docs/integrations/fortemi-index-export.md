# Fortemi Index Export Contract

AIWG can emit a browser-consumable project index for Fortemi React integrations:

    aiwg index export --format fortemi --graph project --out aiwg-fortemi-index.json

The output schema is aiwg.fortemi.index.export.v1, documented in schemas/aiwg-fortemi-index-export.json. AIWG emits aiwg.artifact records from the selected index graph. Domain tools such as aiwg-crm may project CRM records into the same envelope using crm.contact, crm.organization, crm.event, and crm.interaction records.

## Contract

Each item includes:

- stable id values derived from source paths;
- source path, repo_relative_path, and locator;
- display title and searchable text;
- structured facets, tags, and concepts;
- dependency relationships using stable target IDs;
- provenance references back to the AIWG index source;
- privacy classification and PII flag;
- deterministic item ordering by ID.

## Privacy

The default export privacy is private. This is intended for local browser storage and should not be committed or uploaded. Use --privacy sanitized only for fixture data after removing private names, addresses, tokens, account identifiers, and operational notes. Use --privacy public only for already-public source material.

Fortemi React consumes the JSON locally; the export command does not require a hosted backend.
