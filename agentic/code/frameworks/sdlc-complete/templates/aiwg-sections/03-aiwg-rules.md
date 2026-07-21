## AIWG-Specific Rules

1. **Artifact Location**: All SDLC artifacts MUST be created in `.aiwg/` subdirectories (not project root)
2. **Template Usage**: Always use AIWG templates from `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/`
3. **Canonical Workflow Source**: Follow the selected skill and any referenced playbook; commands are provider adapters, not authoritative definitions
4. **Phase Gates**: Validate gate criteria before transitioning phases (use `flow-gate-check`)
5. **Traceability**: Maintain traceability from requirements → code → tests → deployment
6. **Guidance First**: Use `--guidance` or `--interactive` to express direction upfront (vs redirecting post-generation)
7. **Parallel Execution**: Run independent work concurrently with provider-native delegation while respecting configured parallelism caps
