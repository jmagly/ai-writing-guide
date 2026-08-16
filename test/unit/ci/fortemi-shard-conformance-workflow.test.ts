import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '../../..')
const workflow = readFileSync(
  resolve(root, '.gitea/workflows/fortemi-shard-conformance.yml'),
  'utf8',
)

describe('Fortemi shard conformance workflow', () => {
  it('uses the shared runner pool with an explicit capability preflight', () => {
    expect(workflow).toContain('workflow_dispatch:')
    expect(workflow).toContain('runs-on: ubuntu-latest')
    expect(workflow).not.toContain('runs-on: matric-builder')
    expect(workflow).toContain("apt-get install -y --no-install-recommends docker.io")
    expect(workflow).toContain("docker version --format 'client={{.Client.Version}} server={{.Server.Version}}'")
    expect(workflow).toContain('docker info >/dev/null')
  })

  it('supports both container-backed and host-backed Docker topology', () => {
    expect(workflow).toContain('docker inspect "$HOSTNAME"')
    expect(workflow).toContain('--network "$JOB_NETWORK"')
    expect(workflow).toContain('-p 127.0.0.1::5432')
    expect(workflow).toContain('DATABASE_URL=postgres://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}')
  })

  it('fetches all receipt authority commits in one shallow transaction', () => {
    expect(workflow).toMatch(
      /git fetch --quiet --no-tags --depth=1 origin \\\n\s+"\$PRODUCER_COMMIT" \\\n\s+"\$SOURCE_AUTHORITY_COMMIT" \\\n\s+"\$FULL_CONSUMER_COMMIT"/,
    )
  })

  it('uses run-scoped resources and always removes them', () => {
    expect(workflow).toContain('DB_IMAGE="aiwg-fortemi-testdb:${GITHUB_RUN_ID}"')
    expect(workflow).toContain('DB_CONTAINER="aiwg-fortemi-${GITHUB_RUN_ID}"')
    expect(workflow).toContain('if: always()')
    expect(workflow).toContain('docker rm -f "$DB_CONTAINER"')
    expect(workflow).toContain('docker image rm -f "$DB_IMAGE"')
  })
})
