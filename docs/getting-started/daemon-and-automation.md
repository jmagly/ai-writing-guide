# Daemon and Automation

> **First time using AIWG?** Begin with [Install, Connect, and Verify](https://docs.aiwg.io/pages/getting-started--install-connect-verify.html). This guide assumes AIWG is already installed, `all` is deployed for your provider, and `aiwg-regenerate` has connected the agent to this project.

You want AIWG working in the background — running scheduled tasks, watching for events, sending you a message when something happens. Not just responding when you ask, but acting on its own with defined boundaries.

This is the daemon mode.

---

## What the daemon does

The daemon is a persistent process that:

- **Watches your codebase** — runs checks when files change (security scan on save, tests on edit)
- **Runs on a schedule** — nightly audit, weekly dependency check, daily doc sync
- **Sends notifications** — posts to Telegram, webhooks, or a web dashboard when things happen
- **Accepts tasks remotely** — submit a task from your phone via Telegram, get results back
- **Runs autonomously (optional)** — proposes and executes small maintenance tasks with defined safety constraints

---

## Quickest start — background task runner

Initialize from the default profile:

```bash
aiwg daemon-init
```

This creates `.aiwg/daemon.yaml` from the `manager` profile. Open and edit it to match your setup.

Start the daemon:

```bash
aiwg daemon start
```

Open the web dashboard:

```
http://localhost:7474
```

That's the control panel. You can submit tasks, watch running loops, and see history.

---

## Connecting a Telegram bot

Most people find the Telegram integration the most practical — get a notification on your phone when a task completes, submit a task without opening your laptop.

**1. Create a Telegram bot** at [@BotFather](https://t.me/BotFather). Takes two minutes. Copy the token.

**2. Get your chat ID** — message your bot, then run:

```bash
curl "https://api.telegram.org/bot<TOKEN>/getUpdates"
```

The `chat.id` is in the response.

**3. Add to your daemon config:**

```yaml
# .aiwg/daemon.yaml
messaging:
  telegram:
    token: "${TELEGRAM_BOT_TOKEN}"
    rooms:
      - chat_id: 123456789
        label: personal
        is_default: true
```

**4. Set the environment variable and restart:**

```bash
export TELEGRAM_BOT_TOKEN=your-token-here
aiwg daemon start
```

**5. Send commands from Telegram:**

```
/status
/ralph-status
/health
/ask what is the current test coverage?
```

---

## Behaviors — event-driven automation

Behaviors are scripts that fire automatically when system events occur. They live in `agentic/code/behaviors/` and deploy to your AI platform alongside agents and commands.

**Built-in behaviors:**

| Behavior | When it runs | What it does |
|---|---|---|
| `security-sentinel` | On file save (`.ts`, `.js`), on deploy, every 30 min | Scans for security issues, reports findings |
| `test-watcher` | On file save in `test/`, on schedule | Runs affected tests, posts results |
| `build-monitor` | After build completes, on schedule | Tracks build health over time |
| `quality-gate-watcher` | On commit, on PR open | Enforces quality criteria before merge |
| `artifact-sync` | On `.aiwg/` file change | Keeps artifact index in sync |

Deploy and activate:

```bash
aiwg use sdlc --provider openclaw   # OpenClaw (native behavior support)
```

Or run them manually to test:

```bash
bash agentic/code/behaviors/security-sentinel/scripts/main.sh
```

**Create your own behavior:**

```bash
aiwg add-behavior my-check --hooks on_file_write --description "Check what I care about"
```

Edit the generated `BEHAVIOR.md` and `scripts/main.sh` with your logic.

---

## Scheduled tasks

Add scheduled jobs to `.aiwg/daemon.yaml`:

```yaml
schedule:
  - name: nightly-audit
    cron: "0 2 * * *"        # 2am every night
    action: security-audit
    description: Nightly security check

  - name: weekly-deps
    cron: "0 9 * * MON"      # Monday morning
    action: doc-sync
    description: Sync documentation

  - name: test-coverage
    cron: "0 */4 * * *"      # Every 4 hours
    action: test-sync
    description: Check test coverage drift
```

Available built-in actions: `doctor`, `validate-metadata`, `doc-sync`, `test-sync`, `cleanup-audit`, `security-audit`

For custom actions, add a `prompt` field:

```yaml
- name: my-custom-check
  cron: "0 8 * * *"
  prompt: "Review the last 24 hours of git commits and summarize what changed"
```

---

## Autonomous mode (advanced)

Autonomous mode lets the daemon propose and execute small maintenance tasks on its own — without you asking. It's off by default and constrained by a strict allowlist.

Enable it in `.aiwg/daemon.yaml`:

```yaml
daemon:
  autonomous:
    enabled: true
    thinking_interval_minutes: 60
    max_daily_tasks: 5
    budget_cap_usd: 2.00
    require_approval: true                    # Set false to run without asking
    allowed_actions:
      - doc-sync
      - cleanup-audit
      - test-sync
    blocked_actions:
      - deploy
      - release
      - git-push
```

With `require_approval: true`, the daemon will message you via Telegram before executing anything, and wait for your `/approve` or `/reject`.

With `require_approval: false`, it acts within the `allowed_actions` list automatically. The budget cap and daily limit prevent runaway spending.

---

## Docker (isolated environment)

Run the daemon in a container so it doesn't share your shell environment:

```bash
aiwg daemon start --docker
```

Your project directory mounts at `/workspace` inside the container. The web UI is still accessible at `localhost:7474`. Provider credentials pass in via environment variables or a mounted `.env` file.

---

## Checking what's running

```bash
aiwg mc status          # All active tasks
aiwg mc watch           # Live stream of activity
aiwg ralph-status       # Current agent loop status
```

Or open the web dashboard at `localhost:7474` for a visual view.

---

## Stopping the daemon

```bash
aiwg daemon stop
```

All running loops complete their current iteration before the process exits.
