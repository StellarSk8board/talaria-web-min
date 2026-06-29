import { type Agent } from "../matrix/agents";
import { type Room } from "matrix-js-sdk";

interface Props {
  agents: Agent[];
  rooms: Map<string, Room>;
  myUserId: string;
  selectedAgent: Agent | null;
  onSelect: (a: Agent) => void;
  findDmRoom: (userId: string) => Room | null;
  onSignOut: () => void;
  open: boolean;
}

export default function Sidebar({
  agents, rooms, myUserId, selectedAgent, onSelect, findDmRoom, onSignOut, open,
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
            const isSelected = selectedAgent?.userId === a.userId;
            const last = room?.getLastLiveEvent();
            const preview = last?.getContent()?.body as string | undefined;
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
              </li>
            );
          })}
        </ul>
      </div>

      <div style={styles.footer}>
        <div className="dim mono" style={{ fontSize: 11 }}>
          {rooms.size} rooms · {agents.length} agents
        </div>
        <button onClick={onSignOut} style={{ fontSize: 11, padding: "4px 8px" }}>
          Sign out
        </button>
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
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
};
