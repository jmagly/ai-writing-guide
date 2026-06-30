---
enforcement: high
---

# Host Documentation Independence

**Enforcement Level**: HIGH
**Scope**: All per-host system documentation (system-spec, canned processes, host-specific runbooks)
**Issue**: #491

## Principle

Each host's documentation must be self-contained. An operator reading a single host's system spec must be able to understand that host completely without opening any other host's documentation. This prevents cascade failures where one missing doc renders multiple hosts undocumented.

## Mandatory Rules

1. **Self-contained specs**: A system-spec document must include all information needed to understand, maintain, and recover the host. It must not use phrases like "same as {other_host}" or "see {other_host}'s config" as the sole documentation of a configuration detail.

2. **Cross-references are supplementary only**: References to other hosts or fleet-wide docs are permitted for context (e.g., "this host is part of the {cluster_name} cluster — see fleet topology for the full picture") but the host's own role, configuration, and recovery procedures must be fully described locally.

3. **Shared configurations get local copies**: If multiple hosts share a configuration pattern (e.g., identical firewall rules), each host's doc must include the full rule set. Use a shared template to generate them, but the output must be complete per host.

4. **Canned processes specify host scope**: Every canned process must declare which host(s) it applies to. A process that says "run on the server" without specifying which server is incomplete.

5. **Recovery independence**: A host's recovery procedure must be executable with only that host's documentation and the fleet's base tooling. If recovery requires information from another host's doc, that information must be duplicated locally.

## Validation

When creating or updating host documentation, verify:

- [ ] No dangling references to other host docs for essential information
- [ ] All IP addresses, mount points, and service names are explicit (not "same as above")
- [ ] Recovery procedure is self-contained
- [ ] An operator unfamiliar with the fleet could act on this doc alone

## Rationale

During incidents, operators need fast access to accurate host information. Cross-referencing between documents under pressure leads to errors, delays, and missed steps. The marginal cost of duplication is far less than the cost of a misread cross-reference at 3 AM.
