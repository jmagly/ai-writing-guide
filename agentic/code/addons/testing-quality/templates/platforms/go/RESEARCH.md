# Go testing research pointers

Review `research/tool-recommendations.json` for this profile and `research/principles.json` for REF-2478–2481
corpus-relative pointers. Configure optional corpus roots in `spec.research.paths`; no operator home path is required.
Recommendations never install or execute anything.

List discovery omits dynamic subtests; approve package/build-tag/GOOS scope and statement coverage units.

All files here are examples for a reviewed normalization plan. Preserve existing project configuration; choose a new
destination under `.aiwg/testing/conformance/examples/go/` before considering an explicit integration edit.
