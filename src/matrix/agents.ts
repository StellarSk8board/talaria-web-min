/**
 * Talaria agent directory — auto-discovery.
 *
 * W8: agents are loaded from `/agents.json` (served by Vite dev server or
 * static host). To add a new agent, edit that file — no code change needed.
 *
 * v2: replace the fetch with a call to the runtime's `GET /admin/agents`
 * endpoint, or read from a /sync state-event the runtime publishes.
 */

export interface Agent {
  /** Matrix user_id, e.g. "@karn:talaria.my" */
  userId: string;
  /** Display name shown in the sidebar. Falls back to local-part. */
  displayName: string;
  /** Short blurb for tooltip / hover. */
  role: string;
}

export interface AgentRegistry {
  agents: Agent[];
  blairUserId: string;
  reservedSlots: number;
}

/**
 * Fetch the agent registry from the local JSON endpoint.
 * Throws on network error or malformed response.
 */
export async function fetchAgents(): Promise<AgentRegistry> {
  const res = await fetch("/agents.json");
  if (!res.ok) {
    throw new Error(`Failed to load agents: ${res.status} ${res.statusText}`);
  }
  const data = (await res.json()) as AgentRegistry;
  if (!Array.isArray(data.agents) || data.agents.length === 0) {
    throw new Error("Agent registry is empty or malformed");
  }
  // Validate each agent has required fields
  for (const a of data.agents) {
    if (!a.userId || !a.displayName) {
      throw new Error(`Agent missing userId or displayName: ${JSON.stringify(a)}`);
    }
  }
  return data;
}

/** Blair's own user_id — used for sender matching, "sent vs received". */
export const BLAIR_USER_ID = "@blair:talaria.my";
