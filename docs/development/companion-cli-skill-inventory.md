# Companion CLI Skill Inventory

Generated for #1379 on 2026-05-18 from `aiwg skill-lint --json` semantics. A companion CLI command is any backticked `aiwg ...` command in a skill body.

## Summary

| Metric | Value |
|--------|-------|
| Skills scanned | 440 |
| Companion-CLI skills inventoried | 115 |
| Review-needed companion-CLI skills | 0 |

## Acceptance Interpretation

- `ok` means the skill references at least one companion `aiwg ...` command and also contains surrounding workflow, review, validation, reporting, decision, or guidance language.
- `review` means wording may position the CLI command as replacing the skill workflow, or the skill lacks surrounding workflow/judgment language.
- Thin command wrappers may legitimately stay command-first, but should be explicit about that role.

## Inventory

| Status | Skill | Companion command examples | Notes |
|--------|-------|----------------------------|-------|
| ok | `agentic/code/addons/agent-loop/skills/agent-loop/SKILL.md` | `aiwg ralph` | workflow language present |
| ok | `agentic/code/addons/agent-loop/skills/cross-task-learner/SKILL.md` | `aiwg ralph-extract-patterns {loop_id}`<br>`aiwg ralph-inject-patterns {loop_id}` | workflow language present |
| ok | `agentic/code/addons/agent-loop/skills/infer-completion-criteria/SKILL.md` | `aiwg discover "infer completion"`<br>`aiwg show skill infer-completion-criteria`<br>`aiwg al --auto-criteria`<br>`aiwg discover` | workflow language present |
| ok | `agentic/code/addons/agent-loop/skills/mission-control/SKILL.md` | `aiwg mc status`<br>`aiwg mc watch`<br>`aiwg mc start`<br>`aiwg mc status --json`<br>+2 more | workflow language present |
| ok | `agentic/code/addons/aiwg-dev/skills/dev-doctor/SKILL.md` | `aiwg <command-name>` | workflow language present |
| ok | `agentic/code/addons/aiwg-dev/skills/dev-mode-init/SKILL.md` | `aiwg --use-stable`<br>`aiwg version`<br>`aiwg serve --no-open`<br>`aiwg sync`<br>+3 more | workflow language present |
| ok | `agentic/code/addons/aiwg-dev/skills/devkit-create-agent/SKILL.md` | `aiwg lint agents` | workflow language present |
| ok | `agentic/code/addons/aiwg-dev/skills/devkit-create-extension/SKILL.md` | `aiwg add-template` | workflow language present |
| ok | `agentic/code/addons/aiwg-dev/skills/devkit-validate/SKILL.md` | `aiwg validate` | workflow language present |
| ok | `agentic/code/addons/aiwg-dev/skills/validate-addon/SKILL.md` | `aiwg use all` | workflow language present |
| ok | `agentic/code/addons/aiwg-dev/skills/validate-component/SKILL.md` | `aiwg <command-name>`<br>`aiwg use <addon>`<br>`aiwg my-command` | workflow language present |
| ok | `agentic/code/addons/aiwg-evals/skills/eval-agent/SKILL.md` | `aiwg lint agents` | workflow language present |
| ok | `agentic/code/addons/aiwg-evals/skills/eval-report/SKILL.md` | `aiwg lint agents` | workflow language present |
| ok | `agentic/code/addons/aiwg-evals/skills/eval-workflow/SKILL.md` | `aiwg lint agents` | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/activity-log/SKILL.md` | `aiwg activity-log` | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/add-behavior/SKILL.md` | `aiwg doctor` | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/aiwg-doctor/SKILL.md` | `aiwg doctor`<br>`aiwg doctor --verbose`<br>`aiwg use sdlc`<br>`aiwg sync`<br>+2 more | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/aiwg-guide/SKILL.md` | `aiwg doctor`<br>`aiwg version`<br>`aiwg list`<br>`aiwg status`<br>+2 more | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/aiwg-help/SKILL.md` | `aiwg help`<br>`aiwg use <framework>`<br>`aiwg discover \"<phrase>\"`<br>`aiwg doctor`<br>+6 more | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/aiwg-init/SKILL.md` | `aiwg init`<br>`aiwg init --interactive`<br>`aiwg init --provider copilot`<br>`aiwg new .`<br>+3 more | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/aiwg-language-map/SKILL.md` | `aiwg discover "<phrase>"`<br>`aiwg show skill <name>`<br>`aiwg discover`<br>`aiwg discover "ralph loop"`<br>+15 more | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/aiwg-mcp-server/SKILL.md` | `aiwg mcp serve`<br>`aiwg mcp install claude`<br>`aiwg mcp add <ref>`<br>`aiwg mcp remove git`<br>+2 more | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/aiwg-pr/SKILL.md` | `aiwg run skill steward-prep-delivery -- "<your topic>"` | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/aiwg-refresh/SKILL.md` | `aiwg run skill aiwg-refresh -- <flags>`<br>`aiwg refresh <flags>` | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/aiwg-regenerate-claude/SKILL.md` | `aiwg hook-disable` | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/aiwg-regenerate-opencode/SKILL.md` | `aiwg hook-regenerate --provider opencode` | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/aiwg-regenerate/SKILL.md` | `aiwg regenerate "$@"`<br>`aiwg run skill aiwg-regenerate -- <flags>`<br>`aiwg regenerate <flags>` | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/aiwg-status/SKILL.md` | `aiwg discover "project status"`<br>`aiwg status`<br>`aiwg show skill project-status --first`<br>`aiwg sync --dry-run\`<br>+2 more | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/aiwg-sync/SKILL.md` | `aiwg sync`<br>`aiwg sync --dry-run`<br>`aiwg sync --provider copilot` | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/aiwg-utils-quickref/SKILL.md` | `aiwg discover`<br>`aiwg discover "<phrase>"`<br>`aiwg show <type> <name>`<br>`aiwg show`<br>+17 more | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/behavior/SKILL.md` | `aiwg behavior list`<br>`aiwg behavior info coding-strict`<br>`aiwg behavior apply coding-strict --to software-implementer`<br>`aiwg behavior remove coding-strict --from software-implementer`<br>+1 more | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/catalog/SKILL.md` | `aiwg catalog list`<br>`aiwg catalog info claude-3-5-sonnet`<br>`aiwg catalog search "tool use"`<br>`aiwg catalog search gpt`<br>+2 more | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/checkpoint/SKILL.md` | `aiwg checkpoint create --name iteration-3-complete`<br>`aiwg checkpoint create`<br>`aiwg checkpoint list`<br>`aiwg checkpoint recover`<br>+1 more | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/cleanup-audit/SKILL.md` | `aiwg cleanup-audit --fix` | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/config/SKILL.md` | `aiwg config list`<br>`aiwg config get defaultModel`<br>`aiwg config set defaultProvider copilot`<br>`aiwg config validate`<br>+5 more | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/contribute-start/SKILL.md` | `aiwg contribute-start`<br>`aiwg contribute-start --issue 42`<br>`aiwg contribute-start --description "adding voice support"` | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/cost-history/SKILL.md` | `aiwg cost-history`<br>`aiwg cost-history --last 5`<br>`aiwg cost-history --since 7d`<br>`aiwg cost-history --trend`<br>+1 more | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/cost-report/SKILL.md` | `aiwg cost-report`<br>`aiwg cost-report --session current`<br>`aiwg cost-report --session greenfield`<br>`aiwg cost-report --by-model`<br>+1 more | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/customize-contribute-back/SKILL.md` | `aiwg use all` | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/customize-rebuild/SKILL.md` | `aiwg use all` | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/customize-setup/SKILL.md` | `aiwg version`<br>`aiwg --use-dev ~/my-aiwg`<br>`aiwg use all`<br>`aiwg --use-dev`<br>+1 more | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/customize-status/SKILL.md` | `aiwg version` | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/customize-upstream-sync/SKILL.md` | `aiwg use all` | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/daemon-init/SKILL.md` | `aiwg daemon-init`<br>`aiwg daemon-init orchestrator`<br>`aiwg daemon-init --force`<br>`aiwg daemon-init worker`<br>+2 more | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/doc-consolidate/SKILL.md` | `aiwg index query` | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/execution-mode/SKILL.md` | `aiwg execution-mode standard`<br>`aiwg execution-mode seeded --seed <value>`<br>`aiwg execution-mode strict --seed <value>`<br>`aiwg execution-mode audit --seed <value>`<br>+2 more | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/feedback/SKILL.md` | `aiwg feedback --type bug`<br>`aiwg feedback --type feature`<br>`aiwg feedback --type doc`<br>`aiwg feedback`<br>+2 more | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/hook-disable/SKILL.md` | `aiwg hook-regenerate` | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/hook-enable/SKILL.md` | `aiwg use {provider}` | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/hook-regenerate/SKILL.md` | `aiwg use`<br>`aiwg discover`<br>`aiwg show`<br>`aiwg use sdlc`<br>+2 more | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/hook-status/SKILL.md` | `aiwg hook-enable` | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/index/SKILL.md` | `aiwg index ...`<br>`aiwg index build`<br>`aiwg index build --force --verbose`<br>`aiwg index query "authentication"`<br>+4 more | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/install-plugin/SKILL.md` | `aiwg install-plugin sdlc@aiwg`<br>`aiwg install-plugin voice@aiwg`<br>`aiwg install-plugin marketing@aiwg`<br>`aiwg install-plugin utils@aiwg`<br>+3 more | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/install/SKILL.md` | `aiwg install https://github.com/org/pkg`<br>`aiwg install owner/repo`<br>`aiwg install owner/repo#main` | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/list/SKILL.md` | `aiwg list`<br>`aiwg use media-marketing-kit` | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/metrics-tokens/SKILL.md` | `aiwg metrics-tokens`<br>`aiwg metrics-tokens --session current`<br>`aiwg metrics-tokens --threshold`<br>`aiwg metrics-tokens --by-step`<br>+1 more | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/migrate-hook/SKILL.md` | `aiwg use sdlc`<br>`aiwg hook-status` | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/migrate-workspace/SKILL.md` | `aiwg migrate-workspace`<br>`aiwg migrate-workspace --dry-run`<br>`aiwg migrate-workspace --yes`<br>`aiwg rollback-workspace` | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/new-project/SKILL.md` | `aiwg new my-app`<br>`aiwg new my-app --template research`<br>`aiwg new my-app --provider copilot`<br>`aiwg new .`<br>+2 more | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/ops/SKILL.md` | `aiwg ops init --workspace sysops`<br>`aiwg ops status`<br>`aiwg ops use ops-complete`<br>`aiwg ops list`<br>+3 more | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/package-all-plugins/SKILL.md` | `aiwg package-all-plugins`<br>`aiwg package-all-plugins --publish`<br>`aiwg package-all-plugins --dry-run`<br>`aiwg package-all-plugins --continue-on-error` | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/package-plugin/SKILL.md` | `aiwg package-plugin sdlc`<br>`aiwg package-plugin voice`<br>`aiwg package-plugin marketing --publish`<br>`aiwg package-plugin utils`<br>+4 more | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/packages/SKILL.md` | `aiwg install`<br>`aiwg packages list`<br>`aiwg packages info aiwg-devtools`<br>`aiwg packages remove aiwg-devtools`<br>+3 more | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/plugin-status/SKILL.md` | `aiwg plugin-status`<br>`aiwg plugin-status voice@aiwg`<br>`aiwg plugin-status --json`<br>`aiwg plugin-status --check-updates`<br>+2 more | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/prefill-cards/SKILL.md` | `aiwg prefill-cards`<br>`aiwg prefill-cards --dry-run`<br>`aiwg prefill-cards --type use-cases` | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/project-status/SKILL.md` | `aiwg validate-metadata`<br>`aiwg index build`<br>`aiwg run …` | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/remove/SKILL.md` | `aiwg remove sdlc-complete`<br>`aiwg remove ralph`<br>`aiwg remove media-marketing-kit` | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/reproducibility-validate/SKILL.md` | `aiwg reproducibility-validate onboarding-flow`<br>`aiwg reproducibility-validate <id> --runs 5`<br>`aiwg reproducibility-validate <id> --threshold 0.99`<br>`aiwg reproducibility-validate <id> --runs 3 --threshold 0.90`<br>+1 more | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/rollback-workspace/SKILL.md` | `aiwg rollback-workspace`<br>`aiwg rollback-workspace --list`<br>`aiwg rollback-workspace --from .aiwg/.backup-20260401-1423`<br>`aiwg rollback-workspace --dry-run`<br>+4 more | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/run/SKILL.md` | `aiwg run test`<br>`aiwg run`<br>`aiwg run deploy --prod`<br>`aiwg run build`<br>+2 more | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/runtime-info/SKILL.md` | `aiwg runtime-info`<br>`aiwg use sdlc --provider claude-code`<br>`aiwg list` | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/schedule/SKILL.md` | `aiwg daemon schedule`<br>`aiwg runtime-info` | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/session/SKILL.md` | `aiwg session`<br>`aiwg session --provider claude`<br>`aiwg session mcp`<br>`aiwg session --provider codex`<br>+6 more | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/skills/SKILL.md` | `aiwg skills list`<br>`aiwg skills search voice`<br>`aiwg skills info mention-wire`<br>`aiwg skills install commit-and-push`<br>+5 more | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/snapshot/SKILL.md` | `aiwg snapshot capture --name baseline-v1`<br>`aiwg snapshot capture`<br>`aiwg snapshot list`<br>`aiwg snapshot show abc123`<br>+1 more | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/soul-enable/SKILL.md` | `aiwg use claude` | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/steward-prep-delivery/SKILL.md` | `aiwg discover` | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/steward/SKILL.md` | `aiwg steward capabilities`<br>`aiwg steward capabilities --provider cursor`<br>`aiwg steward capabilities --all`<br>`aiwg steward capabilities --feature agent_teams`<br>+3 more | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/team/SKILL.md` | `aiwg mc`<br>`aiwg team run sdlc-review "<task>"`<br>`aiwg team list`<br>`aiwg team info security-review`<br>+3 more | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/uninstall-plugin/SKILL.md` | `aiwg uninstall-plugin voice@aiwg`<br>`aiwg uninstall-plugin marketing@aiwg`<br>`aiwg uninstall-plugin sdlc@aiwg`<br>`aiwg uninstall-plugin voice@aiwg --dry-run`<br>+2 more | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/update/SKILL.md` | `aiwg update`<br>`aiwg update --all`<br>`aiwg update --skip-check`<br>`aiwg update --dry-run`<br>+6 more | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/use/SKILL.md` | `aiwg use sdlc-complete`<br>`aiwg use ralph`<br>`aiwg use sdlc-complete --provider copilot`<br>`aiwg use sdlc-complete --dev`<br>+1 more | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/validate-metadata/SKILL.md` | `aiwg validate-metadata`<br>`aiwg validate-metadata <path>`<br>`aiwg validate-metadata --recursive agentic/code/frameworks/security-engineering/skills`<br>`aiwg validate-metadata --ci --format json --strict` | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/version/SKILL.md` | `aiwg version`<br>`aiwg sync --dry-run` | workflow language present |
| ok | `agentic/code/addons/aiwg-utils/skills/workspace-health/SKILL.md` | `aiwg doctor` | workflow language present |
| ok | `agentic/code/addons/nlp-prod/skills/productionize/SKILL.md` | `aiwg nlp eval <dir>`<br>`aiwg nlp estimate-cost <dir>` | workflow language present |
| ok | `agentic/code/addons/rlm/skills/rlm-batch/SKILL.md` | `aiwg config get --project parallelism.max_parallel_subagents`<br>`aiwg index`<br>`aiwg index neighbors --direction`<br>`aiwg index neighbors --graph`<br>+2 more | workflow language present |
| ok | `agentic/code/addons/rlm/skills/rlm-query/SKILL.md` | `aiwg index`<br>`aiwg index neighbors`<br>`aiwg index neighbors --graph`<br>`aiwg index stats --json`<br>+4 more | workflow language present |
| ok | `agentic/code/addons/semantic-memory/skills/memory-ingest/SKILL.md` | `aiwg memory append-log` | workflow language present |
| ok | `agentic/code/addons/semantic-memory/skills/memory-lint/SKILL.md` | `aiwg memory append-log` | workflow language present |
| ok | `agentic/code/addons/semantic-memory/skills/memory-log-append/SKILL.md` | `aiwg memory append-log` | workflow language present |
| ok | `agentic/code/addons/semantic-memory/skills/memory-query-capture/SKILL.md` | `aiwg memory append-log` | workflow language present |
| ok | `agentic/code/addons/uat-mcp/skills/uat-mode/SKILL.md` | `aiwg use uat-mcp` | workflow language present |
| ok | `agentic/code/frameworks/forensics-complete/skills/forensics-quickref/SKILL.md` | `aiwg discover`<br>`aiwg show <type> <name>`<br>`aiwg show`<br>`aiwg discover "<phrase>"` | workflow language present |
| ok | `agentic/code/frameworks/knowledge-base/skills/kb-health/SKILL.md` | `aiwg kb path` | workflow language present |
| ok | `agentic/code/frameworks/knowledge-base/skills/kb-ingest/SKILL.md` | `aiwg kb path` | workflow language present |
| ok | `agentic/code/frameworks/knowledge-base/skills/knowledge-base-quickref/SKILL.md` | `aiwg discover`<br>`aiwg show <type> <name>`<br>`aiwg show`<br>`aiwg discover "<phrase>"`<br>+3 more | workflow language present |
| ok | `agentic/code/frameworks/media-curator/skills/integrity-verification/SKILL.md` | `aiwg verify-archive --help` | workflow language present |
| ok | `agentic/code/frameworks/media-curator/skills/media-curator-quickref/SKILL.md` | `aiwg discover`<br>`aiwg show <type> <name>`<br>`aiwg show`<br>`aiwg discover "<phrase>"` | workflow language present |
| ok | `agentic/code/frameworks/media-marketing-kit/skills/marketing-quickref/SKILL.md` | `aiwg discover`<br>`aiwg show <type> <name>`<br>`aiwg show`<br>`aiwg discover "<phrase>"` | workflow language present |
| ok | `agentic/code/frameworks/ops-complete/skills/ops-quickref/SKILL.md` | `aiwg discover`<br>`aiwg show <type> <name>`<br>`aiwg show`<br>`aiwg discover "<phrase>"`<br>+4 more | workflow language present |
| ok | `agentic/code/frameworks/research-complete/skills/corpus-index-build/SKILL.md` | `aiwg index build`<br>`aiwg show skill corpus-index-build` | workflow language present |
| ok | `agentic/code/frameworks/research-complete/skills/research-lint/SKILL.md` | `aiwg lint`<br>`aiwg lint --ci --ruleset research --fail-on error` | workflow language present |
| ok | `agentic/code/frameworks/research-complete/skills/research-query/SKILL.md` | `aiwg index query` | workflow language present |
| ok | `agentic/code/frameworks/research-complete/skills/research-quickref/SKILL.md` | `aiwg discover`<br>`aiwg show <type> <name>`<br>`aiwg show`<br>`aiwg discover "<phrase>"`<br>+1 more | workflow language present |
| ok | `agentic/code/frameworks/sdlc-complete/skills/aiwg-setup-project/SKILL.md` | `aiwg -new` | workflow language present |
| ok | `agentic/code/frameworks/sdlc-complete/skills/aiwg-setup-warp/SKILL.md` | `aiwg -new` | workflow language present |
| ok | `agentic/code/frameworks/sdlc-complete/skills/aiwg-update-claude/SKILL.md` | `aiwg -deploy-agents --mode sdlc` | workflow language present |
| ok | `agentic/code/frameworks/sdlc-complete/skills/artifact-lookup/SKILL.md` | `aiwg index`<br>`aiwg index build` | workflow language present |
| ok | `agentic/code/frameworks/sdlc-complete/skills/build-artifact-index/SKILL.md` | `aiwg index query`<br>`aiwg index deps`<br>`aiwg index stats`<br>`aiwg index build` | workflow language present |
| ok | `agentic/code/frameworks/sdlc-complete/skills/doc-consolidate/SKILL.md` | `aiwg index query` | workflow language present |
| ok | `agentic/code/frameworks/sdlc-complete/skills/sdlc-quickref/SKILL.md` | `aiwg discover`<br>`aiwg show <type> <name>`<br>`aiwg show`<br>`aiwg discover "<phrase>"` | workflow language present |
| ok | `agentic/code/frameworks/sdlc-complete/skills/traceability-check/SKILL.md` | `aiwg index`<br>`aiwg index deps`<br>`aiwg index query`<br>`aiwg index stats` | workflow language present |
| ok | `agentic/code/frameworks/sdlc-complete/skills/verify-citations/SKILL.md` | `aiwg index doctor --rlm-audit` | workflow language present |
| ok | `agentic/code/frameworks/security-engineering/skills/security-engineering-quickref/SKILL.md` | `aiwg discover`<br>`aiwg show <type> <name>`<br>`aiwg show`<br>`aiwg discover "<phrase>"` | workflow language present |
