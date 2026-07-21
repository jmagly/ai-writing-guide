## Quick Start

1. **Find the right workflow**:

   ```bash
   aiwg discover "create or complete project intake"
   aiwg show skill intake-wizard
   ```

2. **Start the selected lifecycle work**:

   ```bash
   aiwg discover "SDLC concept to inception"
   aiwg show skill flow-concept-to-inception
   ```

   Follow the fetched skill with the project's `.aiwg/intake/` artifacts. If the provider exposes a slash-command adapter, it may invoke the same skill but is not the source of workflow behavior.

3. **Check project progress**:

   ```bash
   aiwg discover "project status"
   aiwg show skill project-status
   ```

4. **Progress through phases**:

   Discover and fetch the relevant gate and transition skills, then follow their declared criteria. For example, search for `SDLC Inception gate` and `SDLC transition to Elaboration` rather than assuming provider-specific command paths.
