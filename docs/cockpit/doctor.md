# Cockpit Connection Doctor

`aiwg cockpit doctor` is the non-destructive topology check for Cockpit and
its Agentic Sandbox executor. It verifies the installed package, Bridge
runtime metadata and authenticated health, real executor deep health, runtime
tiers, application listeners, user-service persistence, and the declared
operator transport.

```bash
aiwg cockpit doctor
aiwg cockpit doctor --format json
aiwg cockpit doctor --format markdown
aiwg cockpit doctor --topology ssh-local \
  --cockpit-host cockpit.internal \
  --executor-host sandbox.internal \
  --forward-endpoint http://127.0.0.1:18140
```

For `ssh-local` and `ssh-reverse`, declare the executor host explicitly. The
doctor treats an omitted or mismatched executor host as blocked; it does not
guess a forwarding plan. `--executor-version <version>` adds an exact executor
identity check.

## Report contract

JSON output uses the stable schema `aiwg.cockpit-doctor/v1`. Rows have a stable
ID, `pass`, `warn`, or `blocked` status, a machine-readable code, sanitized
evidence, and the smallest safe recovery action for every non-pass result.
Distinct blocked codes include:

- `mock_executor`
- `bridge_unreachable` and `executor_unreachable`
- `bridge_unauthenticated` and `executor_unauthenticated`
- `wrong_host`
- `public_bind`
- `version_skew`

The report never includes Bridge bearer values, bootstrap nonces, executor
tokens, or credential file contents. Runtime paths are represented by semantic
labels, and package location is classified as a managed package or source
workspace rather than emitted verbatim.

Host, Docker, and VM rows are independent. A healthy host does not imply a
healthy Docker daemon, and the VM row cannot pass without `/dev/kvm`.

## Listener and persistence posture

The doctor inspects TCP listeners on 8120–8122 and 8140. Any wildcard/public
bind blocks the report; loopback listeners pass. It also checks the Cockpit and
executor user units plus linger support. Missing user-systemd support is a
warning because interactive same-host operation can still work, but the report
does not claim restart persistence.

Use Markdown output as value-free evidence in an operations issue. Review the
recovery action on the failed row and change only the named service or setting.
