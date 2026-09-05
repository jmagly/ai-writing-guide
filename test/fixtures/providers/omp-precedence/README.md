# Native OMP precedence fixtures

Run against the checksum-pinned standalone release and a pristine source
checkout at the conformance manifest's commit, with that checkout's Bun
workspace dependencies installed:

```bash
node tools/providers/omp-precedence-conformance.mjs \
  --binary /path/to/omp --source /path/to/oh-my-pi \
  --output /tmp/omp-precedence.json
```

The runner makes no model requests. Binary sessions inspect the initialized
system prompt through the actual extension API. The SDK fixture imports
upstream discovery, rule parsing, rule bucketing and TTSR matching directly.
It never substitutes a parser or mocks a native capability. Missing native
addons are staged temporarily from the pinned executable's extracted payload;
existing addons must match those bytes. Staged files are removed afterward.
Missing HTML tool views are built with the pinned checkout's own generator
and removed afterward. The real extension loader is exercised with a failing
extension factory to check its failure diagnostic.

Project, user, explicit-extension and bundled agent precedence is checked
against selected system prompt bodies. Foreign-user plugin discovery is
checked with an explicit temporary home argument to the native API; no HOME
variable is reassigned. The real CLI also checks explicit foreign-user
configuration opt-in and disabled-provider overrides. Explicit-extension priority
over installed packages, installed-package priority over bundled agents, and
linked-package discovery are covered using local
package manifests and a native link layout; no npm network access is needed.

Native task-agent discovery uses `<profile-config-root>/agent/agents` even
when `PI_CODING_AGENT_DIR` points elsewhere. Native prompts, skills, rules,
context and extensions use `getAgentDir()` and honor that override. AIWG's
resolver exposes these separately through `resourceDirs`.

At the same project level, native context wins over foreign `.claude` context.
Disabling native discovery makes the foreign context available. Conditional
rule tests exercise both matching and nonmatching file paths through the
actual TTSR manager; they do not imply enforcement of unregistered policies.
