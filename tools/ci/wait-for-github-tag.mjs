#!/usr/bin/env node

import { spawnSync } from 'node:child_process'

function usage() {
  console.error('Usage: wait-for-github-tag.mjs --repo OWNER/REPO --tag TAG --expected-sha SHA [--attempts N] [--delay-seconds N]')
}

function parseArgs(argv) {
  const options = { attempts: 30, delaySeconds: 10 }
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index]
    const value = argv[index + 1]
    if (!value) throw new Error(`${flag ?? 'argument'} requires a value`)
    if (flag === '--repo') options.repo = value
    else if (flag === '--tag') options.tag = value
    else if (flag === '--expected-sha') options.expectedSha = value
    else if (flag === '--attempts') options.attempts = Number(value)
    else if (flag === '--delay-seconds') options.delaySeconds = Number(value)
    else throw new Error(`Unknown option: ${flag}`)
  }
  if (!options.repo || !options.tag || !options.expectedSha) throw new Error('--repo, --tag, and --expected-sha are required')
  if (!Number.isInteger(options.attempts) || options.attempts < 1) throw new Error('--attempts must be a positive integer')
  if (!Number.isFinite(options.delaySeconds) || options.delaySeconds < 0) throw new Error('--delay-seconds must be non-negative')
  return options
}

const sleep = (milliseconds) => new Promise(resolve => setTimeout(resolve, milliseconds))

async function main() {
  let options
  try {
    options = parseArgs(process.argv.slice(2))
  } catch (error) {
    usage()
    console.error(`Error: ${error.message}`)
    process.exitCode = 2
    return
  }

  const endpoint = `repos/${options.repo}/git/ref/tags/${encodeURIComponent(options.tag)}`
  for (let attempt = 1; attempt <= options.attempts; attempt += 1) {
    const result = spawnSync(process.env.GH_BIN || 'gh', ['api', endpoint], {
      encoding: 'utf8',
      env: process.env,
    })

    if (result.status === 0) {
      let response
      try {
        response = JSON.parse(result.stdout)
      } catch {
        throw new Error('GitHub returned an invalid tag-ref response')
      }
      const type = response?.object?.type
      if (type === 'tag') {
        if (response.object.sha !== options.expectedSha) {
          throw new Error(`GitHub tag ${options.tag} has object ${response.object.sha}; expected original signed tag object ${options.expectedSha}`)
        }
        console.log(`Found annotated tag ${options.tag} on ${options.repo} (object ${response.object.sha}).`)
        return
      }
      if (type === 'commit') {
        throw new Error(`GitHub tag ${options.tag} is lightweight; refusing to create a release. Push the original signed annotated tag object.`)
      }
      throw new Error(`GitHub tag ${options.tag} references unexpected object type ${type ?? '<missing>'}`)
    }

    if (attempt < options.attempts) {
      console.log(`Tag ${options.tag} is not on GitHub yet (attempt ${attempt}/${options.attempts}); waiting ${options.delaySeconds}s for the operator push.`)
      await sleep(options.delaySeconds * 1000)
    }
  }

  throw new Error(`Timed out waiting for annotated tag ${options.tag} on ${options.repo} after ${options.attempts} attempts`)
}

main().catch(error => {
  console.error(`Error: ${error.message}`)
  process.exitCode = 1
})
