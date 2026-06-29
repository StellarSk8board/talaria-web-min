/**
 * Talaria agent directory.
 *
 * W7-2 ships this as a static list (W7 ships faster, no `/joined_agents`
 * discovery round-trip needed). v2: read from the runtime's
 * `GET /admin/agents` or from a /sync state-event the runtime publishes.
 */

export interface Agent {
  /** Matrix user_id, e.g. "@karn:talaria.my" */
  userId: string;
  /** Display name shown in the sidebar. Falls back to local-part. */
  displayName: string;
  /** Short blurb for tooltip / hover. */
  role: string;
}

/**
 * Blair's AI agent fleet — currently 5 wired on eyops, room for 7 more.
 * Edit this list as agents are onboarded via `talaria agents add`.
 */
export const AGENTS: Agent[] = [
  { userId: "@karn:talaria.my",   displayName: "Karn",   role: "Builder / orchestrator" },
  { userId: "@bob:talaria.my",    displayName: "Bob",    role: "Thinker / coordinator" },
  { userId: "@corso:talaria.my",  displayName: "Corso",  role: "Librarian / indexer" },
  { userId: "@ordis:talaria.my",  displayName: "Ordis",  role: "Operator / devops" },
  { userId: "@rhinox:talaria.my", displayName: "Rhinox", role: "Monitor / watchdog" },
];

/** The 7 agent slots reserved for future onboarding. */
export const AGENT_SLOTS_RESERVED = 7;

/** Blair's own user_id — used for sender matching, "sent vs received". */
export const BLAIR_USER_ID = "@blair:talaria.my";
