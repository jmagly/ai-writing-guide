# REF-071: W3C Subresource Integrity

## Citation

W3C Web Application Security Working Group. (2026). *Subresource Integrity*.
W3C Working Draft. <https://www.w3.org/TR/sri-2/>

W3C. (2016). *Subresource Integrity becomes a W3C Recommendation*.
<https://www.w3.org/blog/2016/06/subresource-integrity-becomes-a-w3c-recommendation/>

## Document Profile

| Attribute | Value |
| ----------- | ------- |
| Year | 2016-2026 |
| Type | Web security specification |
| Status | SRI 1 Recommendation; SRI 2 active draft |
| AIWG Relevance | High - Direct precedent for hash-verifying fetched web resources |

## Executive Summary

Subresource Integrity lets a client verify that fetched web content matches a
declared cryptographic hash before using it. It was designed for browser-loaded
scripts and styles, but the underlying rule generalizes to AIWG web resources:
remote bytes are not trusted merely because HTTPS delivered them.

AIWG's release manifest and descriptor checks apply the same fail-closed
principle to framework resources, prebuilt indices, and raw `show` bodies.

## AIWG Implementation Mapping

| SRI Concept | AIWG Resource Implication |
| ------------- | --------------------------- |
| Integrity metadata accompanies a URL | Manifest descriptors accompany every resource path |
| Hash mismatch blocks use | Digest mismatch fails the CLI command |
| CDN safety model | Release host/cache safety model |
| Cross-origin resource risk | Web-backed first-party corpus risk |

## Design Implications

- Treat digest mismatches as security failures, not cache misses.
- Keep the expected digest outside the fetched body being verified.
- Do not add an operator flag that disables signature or digest verification.

## Cross-References

- REF-068: npm lockfiles include integrity fields for package fetches.
- REF-072: TUF extends integrity checks with metadata roles, expiry, threshold
  signing, and rollback protections.
- `docs/install/web-backed-resources.md`: AIWG trust and local override policy.
