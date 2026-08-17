import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('site notification is a post-attestation callback, not a tag-push race', async () => {
  const workflow = await readFile('.gitea/workflows/notify-site.yml', 'utf8');
  assert.doesNotMatch(workflow, /push:\s*\n\s*tags:/);
  assert.match(workflow, /AIWG_VERIFY_TAG_REF=.*verify-signed-tag\.sh/);
  assert.match(workflow, /git show .*setup\.aiwg\.yaml.*> \/tmp\/setup\.aiwg\.yaml/);
  assert.match(workflow, /git cat-file -e .*agentic\.yaml/);
  assert.match(workflow, /no authoritative agentic\.yaml/);
  assert.match(workflow, /SETUP_SHA256=\$\(sha256sum \/tmp\/setup\.aiwg\.yaml/);
  assert.match(workflow, /aiwg\.site-publication\/v1/);
  assert.match(workflow, /aiwg\.resource-manifest\/v1/);
  assert.match(workflow, /aiwg\.resource-manifest\/v2/);
  assert.match(workflow, /application\/vnd\.aiwg\.artifact-attestation\.v1\+json/);
  assert.match(workflow, /setup\.aiwg\.yaml\.aiwg-attestation\.json/);
  assert.match(workflow, /agentic\.yaml\.aiwg-attestation\.json/);
  assert.match(workflow, /channel_sequence/);
  assert.match(workflow, /channel_expires_at/);
  assert.match(workflow, /httpMetadataIsNonAuthoritative: true/);
  assert.match(workflow, /attestation-aware aiwg\.io deploy dispatched/);
});

test('private web release handoff follows mirrored evidence and carries signed-source descriptors', async () => {
  const workflow = await readFile('.gitea/workflows/upload-release-sigs.yml', 'utf8');
  const mirror = workflow.indexOf('- name: Verify release assets land on Gitea release');
  const dispatch = workflow.indexOf('- name: Dispatch private web release pipeline');
  assert.ok(mirror >= 0 && dispatch > mirror, 'web publication must follow release evidence mirroring');
  assert.match(workflow, /aiwg\.web-release-handoff\/v1/);
  assert.match(workflow, /AIWG_VERIFY_TAG_REF=.*verify-signed-tag\.sh/);
  assert.match(workflow, /git cat-file -e .*agentic\.yaml/);
  assert.match(workflow, /Web attestation emission is stopped; mirrored release evidence was not deleted/);
  assert.match(workflow, /requireMonotonicSequence: true/);
  assert.match(workflow, /requireExpiry: true/);
  assert.match(workflow, /after: "signed-release-and-attestations-published"/);
  assert.match(workflow, /httpMetadataIsNonAuthoritative: true/);
});
