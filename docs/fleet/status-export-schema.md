# Fleet Status Export Schema

`aiwg status --export` emits a normalized machine status payload for external cockpits such as Hermes Workspace. The export is pull-based: dashboards poll each machine over local shell or the loopback HTTP server.

## Commands

```bash
aiwg status --export json --fleet-id eride
aiwg status --export ndjson --fleet-id oci
aiwg status --serve --port 7387 --fleet-id eclipse
```

`--serve` binds to `127.0.0.1` by default. Use Tailscale, SSH forwarding, or a private reverse proxy if another host needs to poll it. The payload contains paths and status metadata only; it must not contain API keys, tokens, or secret values.

## Schema

Current schema id: `aiwg.fleet.status.v1`

Top-level fields:

| Field | Type | Description |
|-------|------|-------------|
| `schema` | string | Stable schema id. |
| `generated_at` | ISO timestamp | Time the payload was generated. |
| `machine` | object | Fleet id, hostname, platform, and architecture. |
| `aiwg` | object | AIWG version and workspace path. |
| `workspace` | object | Existing `aiwg status --json` workspace snapshot. |
| `frameworks` | array | Installed framework registry entries. |
| `provider_deployments` | array | Provider artifact counts and last refresh when known. |
| `activity_log` | object | Recent activity-log entries from the configured lookback window. |
| `active_operations` | array | Best-effort counts for Mission Control, Ralph, and daemon state directories. |
| `health` | object | Overall health and normalized health flags. |
| `security` | object | Export security posture. |

## Machine

```json
{
  "fleet_id": "eride",
  "hostname": "eride-host",
  "platform": "linux",
  "arch": "x64"
}
```

`fleet_id` comes from `--fleet-id`, then `AIWG_FLEET_ID`, then the OS hostname.

## Provider Deployments

Each deployment entry has:

```json
{
  "name": "codex",
  "path": ".codex",
  "counts": {
    "agents": 12,
    "rules": 4
  },
  "lastRefresh": null
}
```

`lastRefresh` is best-effort and is populated from provider `.aiwg-manifest.json` metadata when present.

## Activity Log

```json
{
  "source": ".aiwg/activity.log",
  "entries": [
    {
      "timestamp": "2026-05-17T12:00:00.000Z",
      "rawTimestamp": "2026-05-17 12:00",
      "operation": "deploy",
      "summary": "deployed codex provider"
    }
  ]
}
```

Use `--activity-hours <n>` to control the lookback. `0` includes all parsed entries. The export caps entries at the latest 100 records.

## HTTP Server

`aiwg status --serve` exposes:

| Path | Response |
|------|----------|
| `/` | Fleet status JSON |
| `/status` | Fleet status JSON |
| `/status.json` | Fleet status JSON |

Unknown paths return JSON `404` responses. The server uses `Cache-Control: no-store`.

## Security

The `security` block documents the intended posture:

```json
{
  "bind_default": "127.0.0.1",
  "contains_secrets": false,
  "transport": "pull"
}
```

Do not expose the server directly on a public interface. If binding outside loopback, put it behind private network controls and authentication managed by the operator.
