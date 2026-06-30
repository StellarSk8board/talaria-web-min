import { useState, useEffect } from "react";
import { MatrixClient, Room } from "matrix-js-sdk";
import {
  updateRoomName,
  updateRoomTopic,
  inviteToRoom,
  removeFromRoom,
  getRoomMembers,
  canEditRoom,
} from "../matrix/room-settings";
import { isRoomMuted, toggleRoomMute } from "../matrix/notifications";

interface Props {
  client: MatrixClient;
  room: Room;
  userId: string;
  onClose: () => void;
}

export default function RoomSettingsModal({ client, room, userId, onClose }: Props) {
  const [name, setName] = useState(room.name || "");
  const [topic, setTopic] = useState(room.currentState.getStateEvents("m.room.topic", "")?.getContent().topic || "");
  const [members, setMembers] = useState(getRoomMembers(room));
  const [inviteUserId, setInviteUserId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(isRoomMuted(room.roomId));

  const canEdit = canEditRoom(room, userId);

  useEffect(() => {
    // Refresh members when room changes
    setMembers(getRoomMembers(room));
  }, [room]);

  const handleToggleMute = () => {
    const nowMuted = toggleRoomMute(room.roomId);
    setIsMuted(nowMuted);
  };

  const handleSaveName = async () => {
    if (!canEdit) return;
    setSaving(true);
    setError(null);
    try {
      await updateRoomName(client, room.roomId, name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update name");
    }
    setSaving(false);
  };

  const handleSaveTopic = async () => {
    if (!canEdit) return;
    setSaving(true);
    setError(null);
    try {
      await updateRoomTopic(client, room.roomId, topic);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update topic");
    }
    setSaving(false);
  };

  const handleInvite = async () => {
    if (!inviteUserId.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await inviteToRoom(client, room.roomId, inviteUserId.trim());
      setInviteUserId("");
      // Refresh members
      setMembers(getRoomMembers(room));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite user");
    }
    setSaving(false);
  };

  const handleRemove = async (targetUserId: string) => {
    if (!canEdit) return;
    if (!confirm(`Remove ${targetUserId} from this room?`)) return;
    setSaving(true);
    setError(null);
    try {
      await removeFromRoom(client, room.roomId, targetUserId);
      // Refresh members
      setMembers(getRoomMembers(room));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove user");
    }
    setSaving(false);
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>Room Settings</h2>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.content}>
          <div style={styles.section}>
            <label style={styles.label}>Room Name</label>
            <div style={styles.inputRow}>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!canEdit}
                style={styles.input}
              />
              {canEdit && (
                <button onClick={handleSaveName} disabled={saving} style={styles.saveBtn}>
                  Save
                </button>
              )}
            </div>
          </div>

          <div style={styles.section}>
            <label style={styles.label}>Topic</label>
            <div style={styles.inputRow}>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                disabled={!canEdit}
                style={styles.textarea}
                rows={3}
              />
              {canEdit && (
                <button onClick={handleSaveTopic} disabled={saving} style={styles.saveBtn}>
                  Save
                </button>
              )}
            </div>
          </div>

          <div style={styles.section}>
            <label style={styles.label}>Notification Preferences</label>
            <div style={styles.muteRow}>
              <button
                onClick={handleToggleMute}
                style={isMuted ? styles.muteBtnActive : styles.muteBtn}
              >
                {isMuted ? "🔇 Muted" : "🔔 Notifications On"}
              </button>
              <span style={styles.muteHint}>
                {isMuted ? "You won't receive notifications for this room" : "You'll receive notifications for this room"}
              </span>
            </div>
          </div>

          {canEdit && (
            <div style={styles.section}>
              <label style={styles.label}>Invite User</label>
              <div style={styles.inputRow}>
                <input
                  type="text"
                  value={inviteUserId}
                  onChange={(e) => setInviteUserId(e.target.value)}
                  placeholder="@user:example.com"
                  style={styles.input}
                />
                <button onClick={handleInvite} disabled={saving || !inviteUserId.trim()} style={styles.saveBtn}>
                  Invite
                </button>
              </div>
            </div>
          )}

          <div style={styles.section}>
            <label style={styles.label}>Members ({members.length})</label>
            <div style={styles.memberList}>
              {members.map((member) => (
                <div key={member.userId} style={styles.memberItem}>
                  <span style={styles.memberId}>{member.userId}</span>
                  <span style={styles.memberStatus}>{member.membership || "unknown"}</span>
                  {canEdit && member.userId !== userId && (
                    <button
                      onClick={() => handleRemove(member.userId)}
                      disabled={saving}
                      style={styles.removeBtn}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  modal: {
    background: "var(--bg-1)",
    borderRadius: 8,
    width: "90%",
    maxWidth: 600,
    maxHeight: "80vh",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
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
    fontSize: 20,
    cursor: "pointer",
  },
  error: {
    padding: 12,
    margin: 16,
    background: "rgba(255, 0, 0, 0.1)",
    border: "1px solid var(--danger)",
    borderRadius: 4,
    color: "var(--danger)",
    fontSize: 13,
  },
  content: {
    flex: 1,
    overflowY: "auto",
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    display: "block",
    marginBottom: 8,
    fontSize: 13,
    fontWeight: 600,
    color: "var(--text-1)",
  },
  inputRow: {
    display: "flex",
    gap: 8,
  },
  input: {
    flex: 1,
    padding: 8,
    borderRadius: 4,
    border: "1px solid var(--border)",
    background: "var(--bg-2)",
    color: "var(--text-0)",
    fontSize: 14,
  },
  textarea: {
    flex: 1,
    padding: 8,
    borderRadius: 4,
    border: "1px solid var(--border)",
    background: "var(--bg-2)",
    color: "var(--text-0)",
    fontSize: 14,
    fontFamily: "inherit",
    resize: "vertical",
  },
  saveBtn: {
    padding: "8px 16px",
    borderRadius: 4,
    border: "none",
    background: "var(--accent)",
    color: "white",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  memberList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  memberItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: 8,
    background: "var(--bg-2)",
    borderRadius: 4,
  },
  memberId: {
    flex: 1,
    fontSize: 13,
    color: "var(--text-0)",
  },
  memberStatus: {
    fontSize: 12,
    color: "var(--text-2)",
  },
  removeBtn: {
    padding: "4px 12px",
    borderRadius: 4,
    border: "1px solid var(--danger)",
    background: "transparent",
    color: "var(--danger)",
    fontSize: 12,
    cursor: "pointer",
  },
  muteRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  muteBtn: {
    padding: "8px 16px",
    borderRadius: 4,
    border: "1px solid var(--border)",
    background: "var(--bg-2)",
    color: "var(--text-0)",
    fontSize: 13,
    cursor: "pointer",
  },
  muteBtnActive: {
    padding: "8px 16px",
    borderRadius: 4,
    border: "1px solid var(--accent)",
    background: "var(--accent)",
    color: "white",
    fontSize: 13,
    cursor: "pointer",
  },
  muteHint: {
    fontSize: 12,
    color: "var(--text-2)",
  },
};
