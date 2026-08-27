import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const addonRoot = resolve('agentic/code/addons/droid-bridge')
const pluginRoot = resolve('agentic/code/plugins/droid-bridge')

describe('Droid Bridge generated dependency inputs', () => {
  for (const filename of ['package.json', 'package-lock.json']) {
    it(`keeps ${filename} equivalent between addon and plugin`, async () => {
      const [addon, plugin] = await Promise.all([
        readFile(resolve(addonRoot, filename), 'utf8'),
        readFile(resolve(pluginRoot, filename), 'utf8')
      ])
      expect(JSON.parse(plugin)).toEqual(JSON.parse(addon))
    })
  }
})
