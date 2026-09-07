# Voice Framework Quickstart

## Grounded writing entry point

See [author-controlled writing workflows](https://git.integrolabs.net/roctinam/aiwg/src/branch/main/agentic/code/addons/voice-framework/docs/writing-workflows.md) for copyable
`writing plan` / `writing proofread` commands, invocation/session/project
selection, MCP resources, channel and revision APIs, receipts and rollback.
The examples below illustrate prompt-guided legacy voices; they are not recorded
model runs or evidence that all provider responses are transformed. Personal
voice and channel quality remain subject to the documented qualification gates.

> **First time using AIWG?** Begin with [Install, Connect, and
Verify](../../getting-started/install-connect-verify.md). This guide assumes AIWG is connected to the target project
and your provider session can read the deployed context.

Apply a voice profile to one piece of content and review the before/after.

## Enable If Needed

```bash
aiwg use writing
```

Skip this when the complete setup path already made writing and voice tools
available in your provider session. Use `aiwg use voice-framework` only for a
targeted standalone deployment.

## Apply a Built-in Voice

The simplest usage — specify content and a profile name:

```
Write release notes for v2.3.0 in technical-authority voice
```

```
Make this documentation more friendly for beginners
```

```
Rewrite this for an executive audience
```

The voice-apply skill picks up the intent from natural language. You can name the profile explicitly ("technical-authority voice") or describe what you want ("more casual," "executive audience") and the skill maps it to the closest built-in profile.

## Choose the Right Profile

| If you're writing... | Use this profile |
|----------------------|-----------------|
| API docs, architecture docs, engineering specs | `technical-authority` |
| Tutorials, onboarding guides, how-to content | `friendly-explainer` |
| Business cases, stakeholder updates, exec summaries | `executive-brief` |
| Blog posts, social content, newsletters | `casual-conversational` |

## Transform Existing Content

Paste content directly into your prompt:

```
Transform this to match friendly-explainer voice:

The API endpoint accepts a JSON payload containing the requisite parameters
for authentication token generation. Token validity is contingent upon the
expiration interval specified in the request body.
```

Output:

```
To get an authentication token, send this endpoint a JSON request with the
info it needs. The token will stay valid as long as you specified in your
request.
```

## Create a Custom Profile

When the built-in profiles do not fit your use case:

```
Create a voice profile for our internal engineering documentation — casual but technically precise, second person, with specific examples and acknowledged tradeoffs
```

The voice-create skill generates a YAML profile and saves it to `.aiwg/voices/<name>.yaml`. You can then reference it by name:

```
Rewrite this in the internal-engineering-docs voice
```

## Blend Two Profiles

For content that needs to bridge two audiences:

```
Write the API migration guide with 70% technical-authority and 30% friendly-explainer
```

```
Blend executive-brief and technical-authority voices with a 60/40 ratio
```

The voice-blend skill creates a merged profile for the request and applies the
requested weighting as guidance.

## Analyze Existing Content

Before applying a voice, check what voice the content currently has:

```
What voice is this written in?
```

```
Analyze the tone of this documentation
```

Output includes a structured breakdown of detected tone dimensions compared to the built-in profiles, plus a recommended profile if you want to normalize it.

## Profile Locations

Store custom profiles in:

- `.aiwg/voices/` — Project-specific (checked into git, shared with team)
- `~/.config/aiwg/voices/` — User-wide (personal, across all projects)

Project profiles take precedence over user profiles, which take precedence over built-ins. To override the `technical-authority` profile for a specific project, create `.aiwg/voices/technical-authority.yaml` with your project-specific vocabulary.

## Examples in Practice

### Documentation Rewrite

**Input** (AI-sounding):
```
Leverage our robust authentication framework to seamlessly integrate 
secure token-based access into your application workflow.
```

**Request**:
```
Rewrite this in technical-authority voice
```

**Output**:
```
The authentication framework handles token generation and validation.
To integrate it: generate a token with your credentials, include it in
the Authorization header, and refresh it before the 1-hour expiration.
```

### Tone Calibration for Different Channels

```
I have a product announcement. Give me three versions:
1. technical-authority for the engineering blog
2. executive-brief for the investor update  
3. casual-conversational for the company Slack
```

The voice-apply skill drafts all three in a single response, applying the
requested profile to each.

Success means the rewritten content preserves the facts, names the profile or
guidance used, and gives you a short review note for any factual or tone risk.

## References

- `@$AIWG_ROOT/agentic/code/addons/voice-framework/docs/overview.md` — Profile schema and full skill list
- `@$AIWG_ROOT/agentic/code/addons/voice-framework/docs/output-modes.md` — Apply voices with composable invocation, session, or project policy
- `@$AIWG_ROOT/agentic/code/addons/voice-framework/docs/custom-output-modes.md` — Turn a preferred syntax into a custom output mode
- `@$AIWG_ROOT/agentic/code/addons/voice-framework/voices/templates/` — Built-in profile YAML files
