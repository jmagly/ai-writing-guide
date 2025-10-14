# Card Prefill Tools

## prefill-cards.mjs

Populate card metadata (Owner, etc.) using a Team Profile mapping.

### Usage

```bash
# Dry-run: show what would change
node tools/cards/prefill-cards.mjs --target docs/sdlc/artifacts/<project> --team team-profile.yaml

# Apply changes
node tools/cards/prefill-cards.mjs --target docs/sdlc/artifacts/<project> --team team-profile.yaml --write
```

### Behavior

- Reads `roles:` from the team profile (YAML or JSON) and maps roles to names.
- Replaces the `Owner:` line in card Metadata sections with the mapped person name while preserving the role label.
  - Example: `- Owner: Test Engineer (...)` → `- Owner: Jane Doe (Test Engineer)`
- Skips files without a recognizable `## Metadata` block.

### Notes

- Prefills `Owner:`, `Contributors:`, and `Reviewers:` when roles map to names.
- Role keys supported (from YAML team-profile-template.md): `requirements_analyst`, `system_analyst`, `architecture_designer`, `api_designer`, `software_implementer`, `test_architect`, `test_engineer`, `security_architect`, `reliability_engineer`, `deployment_manager`, `configuration_manager`, `project_manager`, `product_strategist`, `vision_owner`.
- If a role is not found in the mapping, the line is left unchanged.
