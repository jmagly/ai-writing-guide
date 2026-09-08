// TODO: illustrative Node fixture only; supply the actual platform runner and canonical adapter.
import { test } from 'node:test';
import assert from 'node:assert/strict';
test('illustrative boundary oracle', () => { const positive = n => n > 0; assert.equal(positive(1), true); assert.equal(positive(0), false); });
