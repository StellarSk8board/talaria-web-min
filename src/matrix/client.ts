/**
 * Matrix client wrapper — singleton accessor.
 *
 * W7-1: createClient, loginWithPassword, startClient, access-token
 * persistence in localStorage.  W7-2 adds presence + room/timeline.
 *
 * The browser talks directly to the homeserver. In dev, point the
 * homeserver URL at a Synapse on the LAN (Tailscale or eyops).
 * For production we'd add a Vite proxy or nginx in front.
 */

import { createClient, type MatrixClient, ClientEvent, SyncState } from "matrix-js-sdk";

const TOKEN_KEY = "talaria.web.accessToken";
const USER_ID_KEY = "talaria.web.userId";
const DEVICE_ID_KEY = "talaria.web.deviceId";
const HOMESERVER_KEY = "talaria.web.homeserver";

export interface LoginResult {
  client: MatrixClient;
  userId: string;
  deviceId: string;
  accessToken: string;
  homeserver: string;
}

export function getStoredHomeserver(): string | null {
  return localStorage.getItem(HOMESERVER_KEY);
}

export function getStoredUserId(): string | null {
  return localStorage.getItem(USER_ID_KEY);
}

export function clearStoredSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_ID_KEY);
  localStorage.removeItem(DEVICE_ID_KEY);
  // Keep HOMESERVER — Blair's homeserver doesn't change between sessions.
}

/**
 * Log in with username + password against the given homeserver.
 * On success, persists the access token and returns a started client.
 */
export async function login(args: {
  homeserver: string;
  username: string;
  password: string;
}): Promise<LoginResult> {
  // Strip scheme if present — createClient wants just the origin.
  const hs = args.homeserver.replace(/\/+$/, "");

  // Phase 1: create an unauthenticated client, log in, get a token.
  // We use the lower-level login API so we can control storage.
  const tmp = createClient({ baseUrl: hs });
  const resp = await tmp.loginWithPassword(args.username, args.password);

  const accessToken = resp.access_token;
  const userId = resp.user_id;
  const deviceId = resp.device_id;

  // Phase 2: rebuild the client with the token, start the sync loop.
  const client = createClient({
    baseUrl: hs,
    accessToken,
    userId,
    deviceId,
  });

  await client.startClient({ initialSyncLimit: 10 });

  // Wait for first sync (PREPARED = usable, SYNCING = ongoing).
  await new Promise<void>((resolve, reject) => {
    const onState = (state: SyncState) => {
      if (state === SyncState.Prepared || state === SyncState.Syncing) {
        client.off(ClientEvent.Sync as any, onState as any);
        resolve();
      } else if (state === SyncState.Error) {
        client.off(ClientEvent.Sync as any, onState as any);
        reject(new Error("initial sync failed"));
      }
    };
    client.on(ClientEvent.Sync as any, onState as any);
  });

  // Persist for next reload.
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(USER_ID_KEY, userId);
  localStorage.setItem(DEVICE_ID_KEY, deviceId);
  localStorage.setItem(HOMESERVER_KEY, hs);

  return { client, userId, deviceId, accessToken, homeserver: hs };
}

/**
 * Restore a session from localStorage. Returns null if no session.
 * Caller should redirect to /login if null.
 */
export function restoreSession(): { client: MatrixClient; userId: string; homeserver: string } | null {
  const accessToken = localStorage.getItem(TOKEN_KEY);
  const userId = localStorage.getItem(USER_ID_KEY);
  const deviceId = localStorage.getItem(DEVICE_ID_KEY);
  const homeserver = localStorage.getItem(HOMESERVER_KEY);
  if (!accessToken || !userId || !deviceId || !homeserver) return null;

  const client = createClient({ baseUrl: homeserver, accessToken, userId, deviceId });
  // Note: startClient is async; the App page should call client.startClient()
  // and await it. We don't await here so restoreSession stays sync.
  return { client, userId, homeserver };
}

export function startClient(client: MatrixClient): Promise<void> {
  return new Promise((resolve, reject) => {
    client.startClient({ initialSyncLimit: 10 }).catch(reject);
    const onState = (state: SyncState) => {
      if (state === SyncState.Prepared || state === SyncState.Syncing) {
        client.off(ClientEvent.Sync as any, onState as any);
        resolve();
      } else if (state === SyncState.Error) {
        client.off(ClientEvent.Sync as any, onState as any);
        reject(new Error("sync failed"));
      }
    };
    client.on(ClientEvent.Sync as any, onState as any);
  });
}
