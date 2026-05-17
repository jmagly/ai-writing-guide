# Sandbox registry event fixtures

These fixtures cover the AIWG-side registry contract owned by
`src/serve/sandbox-registry.ts`: sandbox registration metadata and pushed event
payloads. They complement `sandbox-transport/`, which covers outbound REST calls
from the legacy daemon transport.

The event stream is not consumed by `SandboxTransport`; it is consumed by
`SandboxRegistry.handleEvent()`. Contract tests replay representative pushed
events directly into the registry so CI remains network-free.
