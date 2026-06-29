# Runbook — Wave 7: Talaria Web Client

**Created:** 2026-06-29 | **Status:** W7-1 verified end-to-end against eyops
**Repo:** github.com/StellarSk8board/talaria-web-min
**Audience:** Blair, future agents, anyone picking up web client work

---

## What this is

A minimal Cinny-style Matrix web client. Vite + React + TypeScript + `matrix-js-sdk` v37. ~1000 LoC. No monorepo, no Element module system.

It replaces `StellarSk8board/Talaria-Web` (an Element Web fork) for the Talaria use case. Element was overkill — we needed "log in, see my 12 agents, DM each one." That's a small client.

## Architecture

```
src/
├── main.tsx              # router root
├── theme.css             # dark theme tokens
├── matrix/
│   ├── client.ts         # createClient, login, startClient, token persistence
│   ├── agents.ts         # static list of 5 agent user_ids
│   ├── verify.ts         # E2EE device-verify status (W7-5)
│   └── markdown.tsx      # tiny inline markdown renderer
├── pages/
│   ├── Login.tsx
│   └── App.tsx
└── components/
    ├── Sidebar.tsx       # agent directory
    ├── Chat.tsx          # message timeline
    ├── Message.tsx       # bubble + markdown
    └── Compose.tsx       # multi-line textarea
```

## Local dev

```bash
cd /root/projects/talaria/talaria-web
pnpm install
pnpm dev   # http://127.0.0.1:5173
```

The login form prefills `http://100.115.98.81:8008` (eyops Synapse over Tailscale). Dev server binds to localhost only.

## Provisioning agents on a fresh homeserver

```bash
# 1) Get the shared secret from homeserver.yaml
ssh root@100.115.98.81 'grep registration_shared_secret /opt/talaria/synapse/homeserver.yaml'

# 2) Save it to a file (mode 600)
echo "<secret>" > /tmp/synapse_secret.txt && chmod 600 /tmp/synapse_secret.txt

# 3) Pick a password for the new agents
echo "talaria_verify_pw" > /tmp/talaria_pw.txt && chmod 600 /tmp/talaria_pw.txt

# 4) Run the register script
cd /root/projects/talaria/talaria-web
SYNAPSE_SHARED_SECRET="$(cat /tmp/synapse_secret.txt)" \
  python3 scripts/register_agents.py
```

Creates 5 admin users: `@talaria_agent_karn`, `@talaria_agent_bob`, `@talaria_agent_corso`, `@talaria_agent_ordis`, `@talaria_agent_rhinox`.

The user_id prefix `talaria_agent_` is required by the Talaria policy module on Synapse (see `/opt/talaria/synapse/homeserver.yaml` → `agent_user_prefix`).

## End-to-end verify

```bash
# Set the password (must match what register_agents.py set)
TALARIA_VERIFY_PW_FILE=/tmp/talaria_pw.txt \
  node scripts/verify-7-e2e.mjs
```

What it does:
1. Logs in as `@talaria_agent_karn:talaria.my`
2. Waits for first sync (PREPARED state)
3. Finds (or creates) a DM with `@blair:talaria.my`
4. Sends a test message
5. Verifies the event appears in the local timeline with body round-trip

**Expected output:** `ALL CHECKS PASSED`. Run time: ~3-5 seconds.

**Last verified:** 2026-06-29 19:46 UTC, against eyops Synapse v1.155.

## Synapse rate limit lift (eyops-specific)

The default Synapse rate limits (`rc_login.address`, etc.) are too aggressive for a single-user private server. We lifted them to effectively-unlimited values.

The lift script uses the **nested** schema Synapse 1.155 actually reads:

```yaml
rc_login:
  address:    { per_second: 1000, burst_count: 10000 }
  account:    { per_second: 1000, burst_count: 10000 }
  failed_attempts: { per_second: 1000, burst_count: 10000 }
rc_joins:
  local:      { per_second: 1000, burst_count: 10000 }
  remote:     { per_second: 1000, burst_count: 10000 }
  per_room:   { per_second: 1000, burst_count: 10000 }
rc_invites:
  per_room:   { per_second: 1000, burst_count: 10000 }
  per_user:   { per_second: 1000, burst_count: 10000 }
rc_message:   { per_second: 1000, burst_count: 10000 }
```

⚠️ The older flat `rc_login: { per_second: N, burst_count: N }` schema does NOT match. Synapse silently falls back to defaults if you write it that way. This bit us during W7-1 — the lift script initially wrote the flat schema and the rate limits didn't budge. Fix: use the nested schema above.

To re-apply after config changes:
```bash
cd /root/projects/talaria/talaria-web
SYNAPSE_SHARED_SECRET="$(cat /tmp/synapse_secret.txt)" \
  python3 scripts/lift_rate_limits.py
# Then restart Synapse (SIGHUP only reloads log config, not rate limits):
ssh root@100.115.98.81 'pkill -9 -f synapse_homeserver; bash /opt/talaria/start_synapse.sh &'
```

**Backup file:** `/opt/talaria/synapse/homeserver.yaml.bak-rate-limit-20260629-1936` (the config before the lift).

## Pitfalls

1. **Two homeserver processes racing for port 8008.** The original Synapse start was via a bash wrapper that pipes through `head -5`, so when the wrapper bash dies, the python process becomes orphaned. After multiple restarts you can end up with 2-3 homeservers running, only one of which owns the port. Always:
   ```bash
   ssh root@100.115.98.81 'pkill -9 -f synapse_homeserver; sleep 2; ss -tlnp | grep :8008'
   ```
   Then start a single fresh one.

2. **The bash substitution mangles long passwords.** When you write `PASSWORD="some-long-string"` in a script, the WSL terminal tool may substitute it for `***` if it looks like a credential. Workarounds:
   - Read passwords from files (`TALARIA_VERIFY_PW_FILE=/path/to/file`)
   - Use env vars carefully, not inline `PASSWORD="..."` in the same line as a substitution-prone command
   - The register_agents.py and reset_password.py scripts use `os.environ["SYNAPSE_SHARED_SECRET"]` — set the env var in a separate command

3. **Web client talks to eyops over Tailscale.** The dev server binds 127.0.0.1:5173. To use from a phone on the same Tailscale network, you need an SSH tunnel:
   ```bash
   ssh -L 5173:127.0.0.1:5173 user@BOB1000
   ```
   Then `http://BOB1000:5173` on the phone. (Public hosting is W8+.)

4. **E2EE device verification isn't wired in the browser yet.** v1 shows a green "verified" status optimistically; cross-signing checks are W8. Blair should verify from the Android client (which has it) and the cross-signing block propagates to the web client on next sync.

5. **Agent list is hardcoded** at `src/matrix/agents.ts`. To add a new agent:
   - Register the user (use `register_agents.py` pattern)
   - Add the user_id to `AGENTS` in `src/matrix/agents.ts`
   - Restart the dev server (HMR won't pick up the constant cleanly)

## What's NOT in this client yet (W8+)

- Voice capture/playback (STT/TTS) — module API exists in `src/talaria/voice/`, not wired in browser
- E2EE SAS emoji verification dance in the browser
- Group rooms with multiple agents
- File upload (matrix `m.image` / `m.file` content type)
- Public hosting (HTTPS, nginx, PWA manifest, push gateway integration)
- Auto-discovery of agents from the runtime's `/admin/agents` endpoint

## Commit map (W7)

| SHA | What |
|-----|------|
| `8bd573e` | W7-1: scaffold + login + agent directory + chat thread + verify-7 e2e |
| `1ffd67c` | W7-1.1: lift Synapse rate limits, mobile CSS, back buttons, lift script |
| (next)   | W7-3: markdown rendering in Message bubbles |
