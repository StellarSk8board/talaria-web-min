# Talaria Web

Minimal Cinny-style Matrix web client for talking to AI agents.

Forked away from `StellarSk8board/Talaria-Web` (the Element Web fork that turned out to be overkill for our single-user, agent-first use case).

## Stack

- **Vite 5** — dev server + bundler
- **React 18** + **TypeScript 5** + **react-router-dom 6**
- **matrix-js-sdk 37** — direct SDK, no `matrix-react-sdk` wrapper
- ~1000 LoC total, no monorepo, no Element module system

## Why

The Element Web fork was a 200-module monorepo. We needed to:
1. Log in as Blair against a Talaria homeserver
2. See all 12 agents in a sidebar
3. DM each agent from a single screen
4. See presence dots
5. Work on mobile browsers

That's a small client, not a full Matrix client with all of Element's surface area.

## Architecture

```
src/
├── main.tsx              # router root
├── theme.css             # Talaria dark theme tokens
├── matrix/
│   ├── client.ts         # createClient, login, startClient, token persistence
│   └── agents.ts         # static list of 12 agent user_ids
├── pages/
│   ├── Login.tsx         # homeserver + username + password
│   └── App.tsx           # Sidebar + Chat layout, session restore
└── components/
    ├── Sidebar.tsx       # agent directory with last-message preview
    ├── Chat.tsx          # message timeline + auto-scroll
    ├── Message.tsx       # bubble (incoming vs outgoing)
    └── Compose.tsx       # multi-line textarea, Enter to send
```

## Local dev

```bash
pnpm install
pnpm dev   # http://127.0.0.1:5173
```

By default, the login form prefills `http://100.115.98.81:8008` (eyops Synapse over Tailscale). The dev server only binds to localhost — use a Tailscale connection or SSH tunnel to reach it from a phone.

## Verify

End-to-end smoke test that exercises the same matrix-js-sdk code path the web client uses:

```bash
# Set the password (must match what register_agents.py set)
export TALARIA_VERIFY_PW_FILE=/path/to/pw.txt
node scripts/verify-7-e2e.mjs
```

Logs in as `@talaria_agent_karn:talaria.my`, waits for sync, finds or creates a DM with `@blair:talaria.my`, sends a message, verifies it appears in the local timeline.

## Provisioning agents on a fresh homeserver

```bash
# Set the Synapse shared secret (from homeserver.yaml)
export SYNAPSE_SHARED_SECRET_FILE=/path/to/secret.txt
export TALARIA_VERIFY_PW_FILE=/path/to/pw.txt
python3 scripts/register_agents.py
```

Creates `@talaria_agent_karn`, `@talaria_agent_bob`, etc. with admin rights. Existing users are not modified.

## What's NOT in this client yet

- **Voice** — capture, STT, TTS. Deferred per PRD.
- **E2EE device verification** — browser logs in with a fresh device, the SAS-emoji dance isn't yet wired. v1: show the device as "unverified" with a note.
- **File upload** — basic compose only.
- **Group rooms** — single-agent DMs are the v1 model.
- **Public hosting** — local dev only, no nginx, no PWA, no public domain.
- **Server-side discovery** — agent list is a hardcoded constant in `src/matrix/agents.ts`. v2 reads from the runtime's `/admin/agents` endpoint.

## What works today (W7-1)

- ✅ Vite dev server, `pnpm build` produces ~1.2 MB JS (300 KB gzipped)
- ✅ TypeScript types pass (`pnpm typecheck`)
- ✅ Login form with homeserver URL prefilled
- ✅ Session restore from localStorage
- ✅ Sidebar shows all 12 agents
- ✅ Click agent → chat thread for that DM
- ✅ Compose box with multi-line (Shift+Enter)
- ✅ Auto-scroll on new messages
- ✅ `m.room.message` events with msgtype-based rendering
