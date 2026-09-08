// TODO: replace this illustrative function with the real public SUT import and failure cases.
import { test } from 'node:test';
import assert from 'node:assert/strict';
const parseCount = value => { if (!/^\d+$/.test(value)) throw new TypeError('invalid count'); return Number(value); };
test('count accepts digits and rejects invalid input', () => { assert.equal(parseCount('12'), 12); assert.throws(() => parseCount('bad'), TypeError); });
