# .NET VSTest research pointers

Review `research/tool-recommendations.json` for this profile and `research/principles.json` for REF-2478–2481
corpus-relative pointers. Configure optional corpus roots in `spec.research.paths`; no operator home path is required.
Recommendations never install or execute anything.

Requires restored project and VSTest-compatible adapters; MTP needs a separately qualified profile. Multi-target reports
must use distinct paths.

All files here are examples for a reviewed normalization plan. Preserve existing project configuration; choose a new
destination under `.aiwg/testing/conformance/examples/dotnet-vstest/` before considering an explicit integration edit.
