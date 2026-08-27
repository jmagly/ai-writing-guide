import assert from 'node:assert/strict'
import test from 'node:test'
import yaml from 'js-yaml'

test('parses representative evaluation YAML without changing scalar types', () => {
  const fixture = `
model: local/test
dimensions:
  - tool-use
  - instruction-following
thresholds:
  pass: 0.85
enabled: true
notes: "literal: value"
`
  assert.deepEqual(yaml.load(fixture), {
    model: 'local/test',
    dimensions: ['tool-use', 'instruction-following'],
    thresholds: { pass: 0.85 },
    enabled: true,
    notes: 'literal: value'
  })
})

test('safe loader rejects executable JavaScript tags', () => {
  assert.throws(() => yaml.load('value: !!js/function >\n  function () { return 1 }'))
})
