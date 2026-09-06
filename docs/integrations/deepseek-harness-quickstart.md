# Connect AIWG to DeepSeek Harness

> Status: Experimental. Qualified against `dsh-v0.1.3-alpha.1` at commit
> `d347e703908d0406b7a7ef80e3a0e594d86b2215`.

Install DeepSeek Harness using its
[upstream instructions](https://github.com/deepseek-ai/deepseek-harness). Start
with [Install, Connect, and Verify](../getting-started/install-connect-verify.md)
for the general AIWG setup journey, then:

```bash
npx -y @deepseek-ai/dsh@0.1.3-alpha.1 --version
aiwg use all --provider dsh
dsh --profile headless --patch .dsh/aiwg.cordis.patch.yml "Review this workspace"
```

To run the opt-in OpenRouter conformance smoke, first load the credential into
the current process from your approved secret manager. Do not put it on the
command line or in a file:

```bash
export OPENROUTER_API_KEY="...loaded from your vault..."
AIWG_DSH_LIVE_SMOKE=1 \
  npx -y --package=@deepseek-ai/dsh@0.1.3-alpha.1 -- \
  npm run smoke:deepseek-harness:live
```

The opt-in makes a real model request and may incur provider charges. The smoke
creates and removes an isolated workspace, Harness home, and mode-0600 route
overlay; pins and records the Harness version; requires an exact marker
response; keeps stdout/stderr separate; and scans both for the injected
credential value. `--check` validates the gate without making a network call:

```bash
node tools/providers/deepseek-harness-live-smoke.mjs --check
```

Set `AIWG_DSH_BIN` to an exact-version executable when `dsh` is not already on
`PATH`. The smoke never reads the user's Harness home, settings, credentials,
or prior sessions.
