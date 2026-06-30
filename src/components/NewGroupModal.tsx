import { useState } from "react";
import { type Agent } from "../matrix/agents";

interface Props {
  agents: Agent[];
  myUserId: string;
  onClose: () => void;
  onCreate: (name: string, selectedAgents: Agent[]) => void;
}

export default function NewGroupModal({ agents, onClose, onCreate }: Props) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleAgent(userId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }

  function handleCreate() {
    if (!name.trim() || selected.size < 2) return;
    const selectedAgents = agents.filter((a) => selected.has(a.userId));
    onCreate(name.trim(), selectedAgents);
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>New Group</h3>
          <button onClick={onClose} style={styles.closeBtn} aria-label="close">×</button>
        </div>

        <div style={styles.body}>
          <label style={styles.label}>
            Group Name
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Planning Session"
              style={styles.input}
              autoFocus
            />
          </label>

          <div style={styles.label}>
            Select Agents (minimum 2)
            <div style={styles.agentList}>
              {agents.map((agent) => {
                const isSelected = selected.has(agent.userId);
                return (
                  <label key={agent.userId} style={styles.agentRow}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleAgent(agent.userId)}
                      style={styles.checkbox}
                    />
                    <div style={styles.agentInfo}>
                      <div style={styles.agentName}>{agent.displayName}</div>
                      <div className="dim" style={styles.agentRole}>{agent.role}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div style={styles.footer}>
          <button onClick={onClose} style={styles.cancelBtn}>Cancel</button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || selected.size < 2}
            style={styles.createBtn}
          >
            Create Group
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    background: "var(--bg-1)",
    borderRadius: 8,
    width: "90%",
    maxWidth: 480,
    maxHeight: "80vh",
    display: "flex",
    flexDirection: "column",
    border: "1px solid var(--border)",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px",
    borderBottom: "1px solid var(--border)",
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 600,
  },
  closeBtn: {
    background: "transparent",
    border: "none",
    color: "var(--text-1)",
    fontSize: 24,
    cursor: "pointer",
    padding: 0,
    width: 24,
    height: 24,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    padding: "20px",
    overflowY: "auto",
    flex: 1,
  },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 500,
    marginBottom: 16,
    color: "var(--text-0)",
  },
  input: {
    display: "block",
    width: "100%",
    marginTop: 8,
    padding: "8px 12px",
    background: "var(--bg-0)",
    border: "1px solid var(--border)",
    borderRadius: 4,
    color: "var(--text-0)",
    fontSize: 14,
  },
  agentList: {
    marginTop: 8,
    border: "1px solid var(--border)",
    borderRadius: 4,
    maxHeight: 240,
    overflowY: "auto",
  },
  agentRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 12px",
    cursor: "pointer",
    borderBottom: "1px solid var(--border)",
  },
  checkbox: {
    width: 16,
    height: 16,
    cursor: "pointer",
  },
  agentInfo: {
    flex: 1,
  },
  agentName: {
    fontSize: 14,
    fontWeight: 500,
  },
  agentRole: {
    fontSize: 12,
    marginTop: 2,
  },
  footer: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
    padding: "16px 20px",
    borderTop: "1px solid var(--border)",
  },
  cancelBtn: {
    padding: "8px 16px",
    background: "transparent",
    border: "1px solid var(--border)",
    borderRadius: 4,
    color: "var(--text-1)",
    fontSize: 13,
    cursor: "pointer",
  },
  createBtn: {
    padding: "8px 16px",
    background: "var(--accent)",
    border: "none",
    borderRadius: 4,
    color: "white",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
};
