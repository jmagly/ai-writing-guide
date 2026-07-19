# Permission and role normalization

AIWG configuration version 1 supports a provider-neutral `authorization`
block. It is a normalization layer, not a replacement for AWS IAM, Microsoft
Entra ID/Azure RBAC, or OpenBao policy engines. The normalized model records
intent once and keeps explicit provider mappings where native identifiers,
conditions, and constraints must survive.

## Design rules

- Every decision defaults to deny. Unknown subjects, roles, permissions,
  resources, and actions fail closed.
- Permissions contain actions and resource types. Roles collect permissions;
  assignments connect typed subjects (`user`, `group`, `service`, or
  `workload`) to roles at explicit resource scopes.
- A role boundary is an intersection. It can narrow a role but cannot grant a
  permission.
- An explicit deny wins over every allow.
- Stable logical resource IDs belong in project configuration. Secret values,
  concrete OpenBao paths, role IDs, and SecretIDs do not. `locator_env` names
  the environment variable through which deployment supplies a locator.
- Provider mappings preserve stable IDs, principals, scopes, resources,
  actions, and conditions. The exporter reports loss instead of claiming a
  perfect translation.

This follows the separation of users, roles, permissions, and role activation
in the [NIST RBAC model](https://csrc.nist.gov/projects/role-based-access-control).
AWS guidance motivates least privilege, explicit deny, and permission-boundary
intersection ([IAM policies](https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies.html),
[evaluation logic](https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html)).
Microsoft's definitions and assignments motivate stable role definitions,
typed principals, and scoped assignments
([Entra custom roles](https://learn.microsoft.com/en-us/entra/identity/role-based-access-control/custom-overview),
[Azure role assignments](https://learn.microsoft.com/en-us/azure/role-based-access-control/role-assignments)).
OpenBao mappings require bounded tokens and SecretIDs and a locator supplied at
runtime ([policies](https://openbao.org/docs/2.5.x/concepts/policies/),
[AppRole](https://openbao.org/api-docs/auth/approle/)).

## Steward migration

Use Steward before and after upgrades:

```sh
aiwg steward permissions audit
aiwg steward permissions migrate --dry-run
aiwg steward permissions migrate --apply
aiwg steward permissions audit
```

Audit detects missing or invalid normalized models, `repos[].allowed`,
`repo_maintainer.tiers`, and both historical repo-access manifest locations.
Migration deterministically converts declared workspace grants, delivery mode,
tracker-cycle comments, and commit-signing enforcement. It never infers an
undeclared repository action. Existing normalized configuration is returned
unchanged, making repeated runs idempotent.

Apply creates a timestamped `.aiwg/backups/aiwg.config.permissions-*.bak`, then
uses the config writer's same-directory atomic rename. To recover, inspect the
backup and replace `.aiwg/aiwg.config`; then rerun audit. Conflicting or unknown
references remain errors and authorization stays fail-closed.

Legacy standalone YAML manifests are reported rather than silently deleted.
Normalize their grants into the project config, verify the audit, and remove the
obsolete file in a separately reviewed change.

## Commit signer

The `delivery.commit-signer` role is deliberately discrete. Its boundary and
assignment name only `secret:commit-signing-key`; the release signing resource
is absent. `ci/vault-commit-signer.hcl` injects the actual OpenBao ACL locator
from `COMMIT_SIGNING_KEY_VAULT_PATH` only during provisioning.

Provision with a one-use, 24-hour SecretID and short-lived tokens:

```sh
node ci/provision-vault-approle.mjs \
  --role aiwg-commit-signer \
  --policy-file ci/vault-commit-signer.hcl \
  --secret-id-ttl 24h \
  --secret-id-num-uses 1 \
  --apply
```

The handoff file is mode `0600`; its values must never be logged. A signing
workflow authenticates, reads only the commit key into a temporary
`GNUPGHOME`, verifies the expected commit fingerprint, signs and verifies the
commit, revokes the token, and removes the temporary keyring. Release tags use
their separate release role and key.
