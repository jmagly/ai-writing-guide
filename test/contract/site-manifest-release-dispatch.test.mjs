import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('release notification binds aiwg.io deployment to the setup manifest digest', async () => {
  const workflow = await readFile('.gitea/workflows/notify-site.yml', 'utf8');
  assert.match(workflow, /AIWG_VERIFY_TAG_REF=.*verify-signed-tag\.sh/);
  assert.match(workflow, /git show .*setup\.aiwg\.yaml.*> \/tmp\/setup\.aiwg\.yaml/);
  assert.match(workflow, /SETUP_SHA256=\$\(sha256sum \/tmp\/setup\.aiwg\.yaml/);
  assert.match(workflow, /setup_sha256/);
  assert.match(workflow, /source_tag/);
  assert.match(workflow, /aiwg\.io deploy dispatched/);
});
