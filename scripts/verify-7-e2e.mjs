#!/usr/bin/env node
/**
 * W7-1 e2e smoke test.
 *
 * Logs in as one of the talaria_agent_* users, waits for first sync,
 * finds (or creates) a DM room with @blair:talaria.my, sends a message,
 * verifies it appears in the timeline.
 *
 * Same matrix-js-sdk version the web client uses, so this exercises
 * the real API surface.
 *
 * Usage:
 *   node scripts/verify-7-e2e.mjs
 *
 * Exits 0 on success, 1 on failure.
 */
import { createClient, MsgType, SyncState, ClientEvent } from "matrix-js-sdk";
import { readFileSync } from "node:fs";

const HS = "http://100.115.98.81:8008";
const AGENT_USER = "talaria_agent_karn";
const BLAIR_USER = "@blair:talaria.my";
// Password is read from TALARIA_VERIFY_PW env var, or as a CLI arg,
// or from a file at $TALARIA_VERIFY_PW_FILE. We never bake credentials
// into the repo. Examples:
//   TALARIA_VERIFY_PW='...' node scripts/verify-7-e2e.mjs
//   node scripts/verify-7-e2e.mjs --password-file /tmp/pw
//   node scripts/verify-7-e2e.mjs 'password-as-arg'
function getPassword() {
  // 1. env var
  if (process.env.TALARIA_VERIFY_PW) return process.env.TALARIA_VERIFY_PW;
  // 2. env var pointing to file
  if (process.env.TALARIA_VERIFY_PW_FILE) {
    return readFileSync(process.env.TALARIA_VERIFY_PW_FILE, "utf8").trim();
  }
  // 3. CLI flag
  const flagIdx = process.argv.indexOf("--password-file");
  if (flagIdx >= 0 && process.argv[flagIdx + 1]) {
    return readFileSync(process.argv[flagIdx + 1], "utf8").trim();
  }
  // 4. positional arg (only if it doesn't look like a flag)
  for (const a of process.argv.slice(2)) {
    if (!a.startsWith("--") && !a.startsWith("-")) return a;
  }
  return "";
}
const PASSWORD = getPassword();
const TEST_MESSAGE = `verify-7 smoke @ ${new Date().toISOString()}`;

function log(...a) { console.log("[verify-7]", ...a); }

async function main() {
  log(`homeserver: ${HS}`);
  log(`login as:    @${AGENT_USER}:talaria.my`);

  const client = createClient({ baseUrl: HS });
  const resp = await client.loginWithPassword(AGENT_USER, PASSWORD);
  log(`logged in: user_id=${resp.user_id}  device_id=${resp.device_id}`);

  // Re-create the client with the token so startClient uses it.
  const c2 = createClient({
    baseUrl: HS,
    accessToken: resp.access_token,
    userId: resp.user_id,
    deviceId: resp.device_id,
  });

  // Start sync and wait for PREPARED.
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("sync timeout after 15s")), 15000);
    c2.on(ClientEvent.Sync, (state) => {
      if (state === SyncState.Prepared) {
        clearTimeout(timeout);
        resolve();
      } else if (state === SyncState.Error) {
        clearTimeout(timeout);
        reject(new Error("sync error"));
      } else if (state === SyncState.Stopped) {
        clearTimeout(timeout);
        reject(new Error("sync stopped"));
      }
    });
    c2.startClient({ initialSyncLimit: 10 });
  });

  log("sync PREPARED");

  const me = c2.getUserId();
  const rooms = c2.getRooms();
  log(`my user_id: ${me}`);
  log(`rooms:      ${rooms.length}`);

  // Find or create a DM with Blair.
  let dm = rooms.find((r) => {
    const them = r.getMember(BLAIR_USER);
    return them?.membership === "join" && r.getJoinedMemberCount() === 2;
  });

  if (!dm) {
    log(`no DM with ${BLAIR_USER} — creating one`);
    const created = await c2.createRoom({
      invite: [BLAIR_USER],
      is_direct: true,
      preset: "trusted_private_chat",
    });
    dm = c2.getRoom(created.room_id);
    log(`created room: ${dm.roomId}`);
  } else {
    log(`found DM: ${dm.roomId}`);
  }

  // Snapshot timeline before sending.
  const before = dm.getLiveTimeline().getEvents().length;
  log(`timeline events before send: ${before}`);

  // Send the test message.
  log(`sending: "${TEST_MESSAGE}"`);
  const sendResp = await c2.sendMessage(dm.roomId, {
    msgtype: MsgType.Text,
    body: TEST_MESSAGE,
  });
  log(`sent: event_id=${sendResp.event_id}`);

  // Wait for it to show up in the timeline.
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error("timeline did not update within 5s")), 5000);
    const check = () => {
      const evs = dm.getLiveTimeline().getEvents();
      const found = evs.find((e) => e.getId() === sendResp.event_id);
      if (found) {
        clearTimeout(timeout);
        resolve();
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });

  log("event appears in local timeline ✓");

  // Verify the body round-trips correctly.
  const ev = dm.getLiveTimeline().getEvents().find((e) => e.getId() === sendResp.event_id);
  const got = ev.getContent().body;
  if (got !== TEST_MESSAGE) {
    log(`BODY MISMATCH: sent "${TEST_MESSAGE}" got "${got}"`);
    c2.stopClient();
    process.exit(1);
  }
  log(`body round-trip OK ✓`);

  // Verify last message via the room's helper.
  const last = dm.getLastLiveEvent();
  if (last?.getId() !== sendResp.event_id) {
    log(`last event mismatch: got ${last?.getId()}`);
    c2.stopClient();
    process.exit(1);
  }
  log(`getLastLiveEvent() matches ✓`);

  c2.stopClient();
  log("ALL CHECKS PASSED");
  process.exit(0);
}

main().catch((err) => {
  console.error("[verify-7] FAILED:", err.message ?? err);
  process.exit(1);
});
