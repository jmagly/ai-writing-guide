# Backend: `webdav` (planned)

Status: **STUB** — not yet implemented. Tracked at [#963](https://git.integrolabs.net/roctinam/aiwg/issues/963).

## Planned design

WebDAV adapter for users running Nextcloud, ownCloud, or any WebDAV server as a remote artifact mirror. Same use case as `s3` — bulk artifacts, not memory.

When implemented:
- Built on the `webdav` npm package
- Endpoint URL from `storage.config`
- Credentials from env: `AIWG_WEBDAV_USER` + `AIWG_WEBDAV_PASSWORD` for basic/digest auth, or `AIWG_WEBDAV_TOKEN` for bearer
- Reachability probe via `PROPFIND` on the configured URL

## Anticipated configuration

```jsonc
{
  "version": "1",
  "backends": {
    "media": {
      "type": "webdav",
      "url": "https://nextcloud.example.com/remote.php/dav/files/user/aiwg/",
      "authMode": "basic"  // or "digest" or "bearer"
    }
  }
}
```

Env (set per `authMode`):
- `basic` / `digest` → `AIWG_WEBDAV_USER` + `AIWG_WEBDAV_PASSWORD`
- `bearer` → `AIWG_WEBDAV_TOKEN`

## Why deferred

Same reasoning as `s3`: not appropriate for memory-shaped subsystems. Slated for phase-3 bulk-artifact work alongside `s3`.

## How to track / contribute

- Tracking issue: [#963](https://git.integrolabs.net/roctinam/aiwg/issues/963)
- Design: `.aiwg/architecture/storage-design.md` (§5.8)
