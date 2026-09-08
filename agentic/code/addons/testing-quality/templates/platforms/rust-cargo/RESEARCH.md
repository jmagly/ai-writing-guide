# Rust Cargo research pointers

Review `research/tool-recommendations.json` for this profile and `research/principles.json` for REF-2478–2481
corpus-relative pointers. Configure optional corpus roots in `spec.research.paths`; no operator home path is required.
Recommendations never install or execute anything.

Default deliberately fails until a stable Cargo/nextest result adapter is configured; preserve doc-test and feature
obligations.

All files here are examples for a reviewed normalization plan. Preserve existing project configuration; choose a new
destination under `.aiwg/testing/conformance/examples/rust-cargo/` before considering an explicit integration edit.
