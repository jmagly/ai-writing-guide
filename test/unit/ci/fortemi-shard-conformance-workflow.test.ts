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
    expect(workflow).toContain(
      'container: node:24@sha256:050bf2bbe33c1d6754e060bec89378a79ed831f04a7bb1a53fe45e997df7b3bb',
    )
    expect(workflow).not.toContain('runs-on: matric-builder')
    expect(workflow).toContain('DOCKER_VERSION=27.5.1')
    expect(workflow).toContain(
      'DOCKER_ARCHIVE_SHA256=4f798b3ee1e0140eab5bf30b0edc4e84f4cdb53255a429dc3bbae9524845d640',
    )
    expect(workflow).toContain('https://download.docker.com/linux/static/stable/x86_64/docker-${DOCKER_VERSION}.tgz')
    expect(workflow).toContain("docker --version | grep -F 'Docker version 27.5.1,'")
    expect(workflow).not.toContain('apt-get install -y --no-install-recommends docker.io')
    expect(workflow).toContain("docker version --format 'client={{.Client.Version}} server={{.Server.Version}}'")
    expect(workflow).toContain('docker info >/dev/null')
    expect(workflow).toContain('RUSTUP_INIT_SHA256=4acc9acc76d5079515b46346a485974457b5a79893cfb01112423c89aeb5aa10')
    expect(workflow).toContain('RUSTUP_VERSION=1.29.0')
    expect(workflow).toContain('rustup/archive/${RUSTUP_VERSION}/x86_64-unknown-linux-gnu/rustup-init')
    expect(workflow).not.toContain('rustup/dist/x86_64-unknown-linux-gnu/rustup-init')
    expect(workflow).toContain('--default-toolchain 1.97.1')
    expect(workflow).toContain("rustc --version | grep -F 'rustc 1.97.1 '")
    expect(workflow).toContain("cargo --version | grep -F 'cargo 1.97.1 '")
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
