import { type Agent } from "../matrix/agents";
import { type Room } from "matrix-js-sdk";
import { type VerifyStatus } from "../matrix/verify";

interface Props {
  agents: Agent[];
  rooms: Map<string, Room>;
  myUserId: string;
  selectedAgent: Agent | null;
  selectedRoom: Room | null;
  onSelect: (a: Agent) => void;
  onSelectRoom: (r: Room) => void;
  findDmRoom: (userId: string) => Room | null;
  onSignOut: () => void;
  open: boolean;
  onReloadAgents: () => void;
  agentsLoading: boolean;
  agentError: string | null;
  onNewGroup: () => void;
  groupRooms: Room[];
  verifyStatus: VerifyStatus;
  onShowVerification: () => void;
  unreadCounts: Record<string, number>;
}

export default function Sidebar({
  agents, rooms, myUserId, selectedAgent, selectedRoom, onSelect, onSelectRoom, findDmRoom, onSignOut, open,
  onReloadAgents, agentsLoading, agentError, onNewGroup, groupRooms, verifyStatus, onShowVerification, unreadCounts,
}: Props) {
  return (
    <aside style={{ ...styles.aside, transform: open ? "translateX(0)" : "translateX(-100%)" }}>
      <div style={styles.header}>
        <div style={styles.brand}>
          <span className="mono" style={{ color: "var(--accent)" }}>◆</span> Talaria
        </div>
        <div className="dim mono" style={styles.userId} title={myUserId}>
          {myUserId.replace(/^@/, "").split(":")[0]}
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionLabel}>Agents</div>
        <ul style={styles.list}>
          {agents.map((a) => {
            const room = findDmRoom(a.userId);
            const isSelected = selectedAgent?.userId === a.userId && !selectedRoom;
            const last = room?.getLastLiveEvent();
            const preview = last?.getContent()?.body as string | undefined;
            const unreadCount = room ? (unreadCounts[room.roomId] || 0) : 0;
            return (
              <li
                key={a.userId}
                onClick={() => onSelect(a)}
                style={{
                  ...styles.row,
                  background: isSelected ? "var(--bg-3)" : "transparent",
                }}
              >
                <Avatar name={a.displayName} />
                <div style={styles.rowMain}>
                  <div style={styles.rowTop}>
                    <span style={styles.rowName}>{a.displayName}</span>
                    <span style={styles.dot} className="online" title="online" />
                  </div>
                  <div style={styles.rowSub}>
                    {preview
                      ? <span className="dim">{truncate(preview, 40)}</span>
                      : <span className="dim" style={{ fontStyle: "italic" }}>{room ? "no messages yet" : "no DM yet"}</span>
                    }
                  </div>
                </div>
                {unreadCount > 0 && (
                  <div style={styles.unreadBadge}>{unreadCount}</div>
                )}
              </li>
            );
          })}
        </ul>

        <div style={{ ...styles.sectionLabel, marginTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>Groups</span>
          <button
            onClick={onNewGroup}
            style={styles.newGroupBtn}
            title="Create new group"
          >
            +
          </button>
        </div>
        {groupRooms.length === 0 ? (
          <div className="dim" style={styles.emptyGroups}>
            No groups yet
          </div>
        ) : (
          <ul style={styles.list}>
            {groupRooms.map((r) => {
              const name = r.name || "Unnamed Group";
              const isSelected = selectedRoom?.roomId === r.roomId;
              const last = r.getLastLiveEvent();
              const preview = last?.getContent()?.body as string | undefined;
              const memberCount = r.getJoinedMemberCount();
              return (
                <li
                  key={r.roomId}
                  onClick={() => onSelectRoom(r)}
                  style={{
                    ...styles.row,
                    background: isSelected ? "var(--bg-3)" : "transparent",
                  }}
                >
                  <div style={styles.groupAvatar}>#</div>
                  <div style={styles.rowMain}>
                    <div style={styles.rowTop}>
                      <span style={styles.rowName}>{name}</span>
                    </div>
                    <div style={styles.rowSub}>
                      {preview
                        ? <span className="dim">{truncate(preview, 40)}</span>
                        : <span className="dim" style={{ fontStyle: "italic" }}>{memberCount} members</span>
                      }
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div style={styles.footer}>
        <div style={styles.footerLeft}>
          <div className="dim mono" style={{ fontSize: 11 }}>
            {rooms.size} rooms · {agents.length} agents
          </div>
          {agentError && (
            <div className="dim mono" style={{ fontSize: 10, color: "var(--danger)", marginTop: 2 }}>
              Agent load failed
            </div>
          )}
        </div>
        <div style={styles.footerRight}>
          <button
            onClick={onShowVerification}
            style={{
              fontSize: 11,
              padding: "4px 8px",
              color: verifyStatus === "verified" ? "var(--success, #4caf50)" :
                     verifyStatus === "unverified" ? "var(--warning, #ff9800)" : "var(--text-2)",
            }}
            title={`Verification: ${verifyStatus}`}
          >
            {verifyStatus === "verified" ? "✓" : verifyStatus === "unverified" ? "!" : "?"}
          </button>
          <button
            onClick={onReloadAgents}
            disabled={agentsLoading}
            style={{ fontSize: 11, padding: "4px 8px" }}
            title="Reload agent list"
          >
            {agentsLoading ? "…" : "↻"}
          </button>
          <button onClick={onSignOut} style={{ fontSize: 11, padding: "4px 8px" }}>
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}

function Avatar({ name }: { name: string }) {
  const ch = name.charAt(0).toUpperCase();
  return <div style={styles.avatar}>{ch}</div>;
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}

const styles: Record<string, React.CSSProperties> = {
  aside: {
    width: 280,
    flexShrink: 0,
    background: "var(--bg-1)",
    borderRight: "1px solid var(--border)",
    display: "flex",
    flexDirection: "column",
    height: "100%",
    transition: "transform 0.2s ease",
  },
  header: {
    padding: "16px 16px 12px",
    borderBottom: "1px solid var(--border)",
  },
  brand: {
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: "-0.02em",
  },
  userId: {
    fontSize: 11,
    marginTop: 2,
  },
  section: {
    flex: 1,
    overflowY: "auto",
    padding: "8px 0",
  },
  sectionLabel: {
    padding: "8px 16px 4px",
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "var(--text-2)",
  },
  list: {
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  row: {
    display: "flex",
    gap: 10,
    padding: "10px 16px",
    cursor: "pointer",
    alignItems: "center",
    transition: "background 0.1s",
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
  },
  rowTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  rowName: {
    fontWeight: 600,
    fontSize: 14,
  },
  rowSub: {
    fontSize: 12,
    marginTop: 2,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "var(--online)",
    flexShrink: 0,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "var(--bg-3)",
    color: "var(--text-0)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 16,
    flexShrink: 0,
  },
  footer: {
    borderTop: "1px solid var(--border)",
    padding: "10px 16px",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  footerLeft: {
    flex: 1,
    minWidth: 0,
  },
  footerRight: {
    display: "flex",
    gap: 6,
    flexShrink: 0,
  },
  newGroup_btn: {
    background: "transparent",
    border: "1px solid var(--border)",
    color: "var(--text-1)",
    fontSize: 14,
    fontWeight: 600,
    width: 20,
    height: 20,
    borderRadius: 4,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 0,
  },
  emptyGroups: {
    padding: "8px 16px",
    fontSize: 12,
    fontStyle: "italic",
  },
  groupAvatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "var(--accent)",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 18,
    flexShrink: 0,
  },
  unreadBadge: {
    background: "var(--accent)",
    color: "white",
    fontSize: 11,
    fontWeight: 600,
    padding: "2px 6px",
    borderRadius: 10,
    minWidth: 18,
    textAlign: "center",
    flexShrink: 0,
  },
};
