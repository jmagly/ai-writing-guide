# Java JUnit/Maven research pointers

Review `research/tool-recommendations.json` for this profile and `research/principles.json` for REF-2478–2481
corpus-relative pointers. Configure optional corpus roots in `spec.research.paths`; no operator home path is required.
Recommendations never install or execute anything.

TODO: select each module Surefire/Failsafe report or canonical aggregator. XML stdout is not assumed; inspect
engines/POM and report paths.

All files here are examples for a reviewed normalization plan. Preserve existing project configuration; choose a new
destination under `.aiwg/testing/conformance/examples/java-junit/` before considering an explicit integration edit.
