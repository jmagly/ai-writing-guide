# Flow domain static deployment

Issue #2125 approves one static site and one future private repository. This is
a plan and bootstrap payload; it does not create the repository or change live
DNS, Cloudflare, tunnels, origins, or access policies.

The machine-readable source of truth is
[`templates/deploy/static-site/flow.aiwg.io/deployment-plan.json`](../../templates/deploy/static-site/flow.aiwg.io/deployment-plan.json).
Validate it before any handoff:

~~~bash
node tools/deploy/validate-flow-domain-static-site-plan.mjs \
  templates/deploy/static-site/flow.aiwg.io/deployment-plan.json
~~~

## Approved hostname and repository

| Role | Approved value | Status |
|---|---|---|
| Canonical site | `flow.aiwg.io` | Approved |
| Graph material | `https://flow.aiwg.io/graph/` | Approved path on the canonical site |
| Repository | `roctinam/flow.aiwg.io` | Approved, private, not created by this change |
| Repository bootstrap | Static docs with a generated landing page | Approved |
| Install/build/output | `npm ci` / `npm run build` / `dist/` | Approved |

Artifact and content distinctions belong in paths and Flow kinds. A name such
as `docs.graph.aiwg.io` has four DNS labels and is forbidden by this plan.
`graph.aiwg.io` is not approved because a second site would fragment the
initial Flow/graph surface without an operational need.

## Selected pattern: shared `serve-static`

`flow.aiwg.io` is a tenant of `roctinam/serve-static`. It does not receive a
new container or host port.

| Mapping | Exact value |
|---|---|
| Host source | `/home/roctinam/production-deploy/flow.aiwg.io` |
| Container target | `/srv/flow.aiwg.io` (read-only) |
| Caddy host | `http://flow.aiwg.io` |
| Shared origin | `http://127.0.0.1:80` |
| Caddy service | `roctinam/serve-static` container `static-server` |

The reviewed host-block and volume payloads are:

- [`Caddyfile`](../../templates/deploy/static-site/flow.aiwg.io/Caddyfile)
- [`docker-compose.override.yml`](../../templates/deploy/static-site/flow.aiwg.io/docker-compose.override.yml)

Append the host block and volume to `roctinam/serve-static`; do not replace its
existing tenants, port mappings, or access policy. Validate the complete Caddy
configuration and Compose projection before recreating the shared container.

## Repository deploy workflow

Copy
[`gitea-deploy.yml`](../../templates/deploy/static-site/flow.aiwg.io/gitea-deploy.yml)
to `.gitea/workflows/deploy.yml` in the approved private repository. It pins
the checkout action and job image, builds `dist/`, requires both the landing
page and `/graph/` output, bounds SSH, dry-runs `rsync --delete`, restricts the
remote path, verifies the deployed commit marker, and cleans up its temporary
key file.

Configuration interfaces are names only; protected values must stay in Gitea
or the approved secret broker:

| Scope | Name | Requirement |
|---|---|---|
| Protected | `DEPLOY_SSH_KEY` | Required for rsync transport |
| Variable | `DEPLOY_HOST` | Required deployment host reference |
| Variable | `DEPLOY_PORT` | Required SSH port |
| Variable | `DEPLOY_USER` | Required deployment account |
| Protected | `CF_ZONE_ID` | Optional; only when cache purge is enabled |
| Protected | `CF_CACHE_PURGE` | Optional scoped purge credential |

The optional purge targets only `flow.aiwg.io`; it is not a zone-wide purge.
No protected value belongs in the repository, plan, workflow log, command line,
or operator handoff.

## Per-site container fallback

No current site selects the per-site pattern, so the approved isolated-port
registry is empty. If a later site needs custom Caddy behavior, instantiate the
templates under
[`per-site-container`](../../templates/deploy/static-site/per-site-container/)
and update the plan first.

Every isolated site must:

1. allocate one unused port in `8700-8799` in the plan's port registry;
2. bind only `127.0.0.1:<unique-port>:80`;
3. record `<hostname> -> http://127.0.0.1:<unique-port>` in both its site entry
   and operator handoff;
4. use a private repository with its own reviewed Gitea workflow; and
5. pass the validator, which rejects duplicate ports and route mismatches.

## Final operator handoff

The following is the exact approved ingress plan. The tunnel-owned CNAME target
is selected during the controlled infrastructure change and is intentionally
not stored in this repository.

| Layer | Exact route |
|---|---|
| DNS | Proxied `CNAME flow.aiwg.io` to the approved Cloudflare tunnel CNAME target |
| Tunnel ingress | `flow.aiwg.io -> http://127.0.0.1:80` |
| Shared host port | `80`, already owned by `roctinam/serve-static:static-server` |
| Site volume | `/home/roctinam/production-deploy/flow.aiwg.io -> /srv/flow.aiwg.io:ro` |

### Cloudflare configuration to supply

You need the following account-side configuration. Replace `<TUNNEL-UUID>`
with the ID of the existing approved tunnel; do not create a second tunnel for
this site unless the shared tunnel cannot reach the origin host.

**Public hostname / tunnel route** (Zero Trust dashboard → Networks → Tunnels →
the approved tunnel → Public Hostnames):

| Field | Value |
|---|---|
| Subdomain | `flow` |
| Domain | `aiwg.io` |
| Path | empty |
| Service type | `HTTP` |
| URL | `127.0.0.1:80` |
| HTTP Host Header | `flow.aiwg.io` |

For a locally managed tunnel, the equivalent ingress fragment is:

~~~yaml
ingress:
  - hostname: flow.aiwg.io
    service: http://127.0.0.1:80
    originRequest:
      httpHostHeader: flow.aiwg.io
  - service: http_status:404
~~~

Keep the terminal `http_status:404` catch-all after every existing hostname
route. Validate a local configuration before reload with
`cloudflared tunnel ingress validate` and confirm the match with
`cloudflared tunnel ingress rule https://flow.aiwg.io/graph/`.

**DNS** (created automatically when the dashboard public hostname is saved, or
created manually in the `aiwg.io` zone):

| Field | Value |
|---|---|
| Type | `CNAME` |
| Name | `flow` |
| Target | `<TUNNEL-UUID>.cfargotunnel.com` |
| Proxy status | Proxied |
| TTL | Auto |

Do not add a separate `graph.aiwg.io` or `docs.graph.aiwg.io` record. `/graph/`
is a path on `flow.aiwg.io`.

**TLS and Access:** ensure the zone's Universal SSL certificate covers
`flow.aiwg.io`. The origin leg intentionally uses HTTP inside Cloudflare
Tunnel. For a public documentation site, do not attach a Cloudflare Access
application; if the selected tunnel has an account-wide or wildcard Access
policy, add/review the explicit public exception before cutover. No WAF bypass
or broad cache-everything rule is required.

**Optional cache purge:** create a Cloudflare API token restricted to the
`aiwg.io` zone with only `Cache Purge: Purge` permission, then store its value
as the Gitea protected secret `CF_CACHE_PURGE`; store the zone identifier as
protected secret `CF_ZONE_ID`. These are optional—the deployment succeeds
without them and skips purge. The workflow purges only the
`flow.aiwg.io` host.

The only values the operator must choose or retrieve are the existing tunnel
ID/CNAME target, whether the site is public or Access-protected, and—if purge
is desired—the scoped token and zone ID. Do not paste any of those protected
values into an issue, repository file, or workflow log.

Operational change order:

1. Create `roctinam/flow.aiwg.io` as private and copy the reviewed bootstrap.
2. Configure the named repository interfaces without exposing their values.
3. Deploy and verify `dist/index.html`, `dist/graph/index.html`, and the commit
   marker before changing ingress.
4. Review every route and access policy on the selected Cloudflare tunnel,
   then apply the exact public-hostname and DNS fields above.
5. Add the proxied DNS record and tunnel ingress route, then verify the public
   hostname and `/graph/` path.
6. Enable optional host-scoped purge only after its configuration is approved.

Rollback removes the new ingress route and DNS record first, then removes the
new Caddy host block and read-only volume. It does not delete the deployment
directory or repository until the operator separately approves data removal.
