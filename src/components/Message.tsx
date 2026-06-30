import { useState, useEffect } from "react";
import { type MatrixEvent, type MatrixClient } from "matrix-js-sdk";
import { renderInline } from "../matrix/markdown";
import ReactionPicker from "./ReactionPicker";
import { editMessage, deleteMessage, canEditOrDelete } from "../matrix/message-edit";

interface Props {
  event: MatrixEvent;
  myUserId: string;
  client: MatrixClient;
  roomId: string;
}

export default function Message({ event, myUserId, client, roomId }: Props) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [reactions, setReactions] = useState<Map<string, string[]>>(new Map());
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const sender = event.getSender() ?? "?";
  const isMe = sender === myUserId;
  const content = event.getContent();
  const body: string = content.body ?? "";
  const status = event.status ?? "sent";
  const eventId = event.getId();
  const canEdit = canEditOrDelete(event, myUserId);

  // Load reactions for this message
  useEffect(() => {
    if (!eventId || !roomId) return;
    
    const room = client.getRoom(roomId);
    if (!room) return;

    const timeline = room.getLiveTimeline();
    const events = timeline.getEvents();
    
    const reactionMap = new Map<string, string[]>();
    
    for (const ev of events) {
      if (ev.getType() === "m.reaction") {
        const evContent = ev.getContent();
        const relatesTo = evContent["m.relates_to"];
        if (relatesTo?.event_id === eventId && relatesTo?.rel_type === "m.annotation") {
          const key = relatesTo.key;
          const senderId = ev.getSender();
          if (key && senderId) {
            if (!reactionMap.has(key)) {
              reactionMap.set(key, []);
            }
            const senders = reactionMap.get(key)!;
            if (!senders.includes(senderId)) {
              senders.push(senderId);
            }
          }
        }
      }
    }
    
    setReactions(reactionMap);
  }, [client, roomId, eventId]);

  // Send reaction to this message
  const sendReaction = async (emoji: string) => {
    try {
      await client.sendEvent(roomId, "m.reaction" as any, {
        "m.relates_to": {
          event_id: eventId,
          key: emoji,
          rel_type: "m.annotation",
        },
      });
    } catch (err) {
      console.error("Failed to send reaction:", err);
    }
  };

  // Start editing this message
  const startEdit = () => {
    setEditText(body);
    setIsEditing(true);
  };

  // Save the edit
  const saveEdit = async () => {
    if (editText.trim() === body) {
      setIsEditing(false);
      return;
    }
    try {
      await editMessage(client, roomId, event, editText.trim());
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to edit message:", err);
    }
  };

  // Delete this message
  const handleDelete = async () => {
    if (!eventId || !confirm("Delete this message?")) return;
    try {
      await deleteMessage(client, roomId, eventId);
    } catch (err) {
      console.error("Failed to delete message:", err);
    }
  };

  // Render based on msgtype — text is the only one we care about for W7.
  const msgtype: string = content.msgtype ?? "m.text";

  // For m.text, render inline markdown. For m.image, show the image.
  // For m.audio, show a play button. For m.file, show a download link.
  // For anything else, show msgtype tag.
  let bodyNode: React.ReactNode;
  if (msgtype === "m.text") {
    bodyNode = renderInline(body);
  } else if (msgtype === "m.image") {
    const url = content.url;
    if (url) {
      bodyNode = (
        <div style={styles.imageWrap}>
          <img src={url} alt={content.body ?? "image"} style={styles.image} />
          {content.body && <span className="dim mono" style={{ fontSize: 11 }}>{content.body}</span>}
        </div>
      );
    } else {
      bodyNode = (
        <span className="dim mono" style={{ fontSize: 12 }}>
          [image: {content.filename ?? content.body ?? "?"}]
        </span>
      );
    }
  } else if (msgtype === "m.audio") {
    const url = content.url;
    if (url) {
      bodyNode = (
        <div style={styles.audioWrap}>
          <audio controls src={url} style={styles.audio} />
          <span className="dim mono" style={{ fontSize: 11 }}>Voice message</span>
        </div>
      );
    } else {
      bodyNode = (
        <span className="dim mono" style={{ fontSize: 12 }}>
          [audio: {content.body ?? "voice message"}]
        </span>
      );
    }
  } else if (msgtype === "m.file") {
    const url = content.url;
    const filename = content.filename ?? content.body ?? "file";
    if (url) {
      bodyNode = (
        <a href={url} target="_blank" rel="noopener noreferrer" style={styles.fileLink}>
          📄 {filename}
        </a>
      );
    } else {
      bodyNode = (
        <span className="dim mono" style={{ fontSize: 12 }}>
          [file: {filename}]
        </span>
      );
    }
  } else {
    bodyNode = <span className="dim mono">[{msgtype}]</span>;
  }

  return (
    <div style={{
      ...styles.row,
      justifyContent: isMe ? "flex-end" : "flex-start",
    }}>
      <div style={styles.messageContainer}>
        <div style={{
          ...styles.bubble,
          background: isMe ? "var(--accent)" : "var(--bg-2)",
          color: isMe ? "#000" : "var(--text-0)",
        }}>
          {!isMe && <div style={styles.sender}>{sender.replace(/^@/, "").split(":")[0]}</div>}
          {isEditing ? (
            <div style={styles.editContainer}>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                style={styles.editInput}
                autoFocus
              />
              <div style={styles.editActions}>
                <button onClick={() => setIsEditing(false)} style={styles.editCancel}>Cancel</button>
                <button onClick={saveEdit} style={styles.editSave}>Save</button>
              </div>
            </div>
          ) : (
            <div style={styles.body}>{bodyNode}</div>
          )}
          <div style={{
            ...styles.status,
            color: isMe ? "rgba(0,0,0,0.5)" : "var(--text-2)",
          }}>
            {status === "sending" ? "sending…" : status === "queued" ? "queued" : formatTime(event.getTs())}
            {canEdit && !isEditing && (
              <span style={styles.editActions}>
                <button onClick={startEdit} style={styles.editBtn} title="Edit">✏️</button>
                <button onClick={handleDelete} style={styles.editBtn} title="Delete">🗑️</button>
              </span>
            )}
          </div>
        </div>
        
        {/* Reaction display */}
        {Array.from(reactions.entries()).length > 0 && (
          <div style={styles.reactions}>
            {Array.from(reactions.entries()).map(([emoji, senders]) => (
              <span key={emoji} style={styles.reactionBadge}>
                {emoji} {senders.length}
              </span>
            ))}
          </div>
        )}
        
        {/* Reaction button */}
        <button
          style={styles.reactButton}
          onClick={() => setShowReactionPicker(true)}
          title="Add reaction"
        >
          +😊
        </button>
        
        {/* Reaction picker modal */}
        {showReactionPicker && (
          <ReactionPicker
            onReact={sendReaction}
            onClose={() => setShowReactionPicker(false)}
          />
        )}
      </div>
    </div>
  );
}

function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  if (sameDay) return `${hh}:${mm}`;
  return `${d.getMonth() + 1}/${d.getDate()} ${hh}:${mm}`;
}

const styles: Record<string, React.CSSProperties> = {
  row: {
    display: "flex",
    padding: "2px 16px",
  },
  messageContainer: {
    position: "relative",
    maxWidth: "70%",
  },
  bubble: {
    padding: "8px 12px",
    borderRadius: 12,
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
  },
  sender: {
    fontSize: 11,
    fontWeight: 700,
    color: "var(--accent-2)",
    marginBottom: 2,
  },
  body: {
    fontSize: 14,
    lineHeight: 1.4,
  },
  status: {
    fontSize: 10,
    marginTop: 4,
    textAlign: "right",
  },
  reactions: {
    display: "flex",
    gap: 4,
    marginTop: 4,
    flexWrap: "wrap",
  },
  reactionBadge: {
    fontSize: 12,
    padding: "2px 6px",
    borderRadius: 10,
    background: "var(--bg-3)",
    color: "var(--text-0)",
  },
  reactButton: {
    position: "absolute",
    top: 4,
    right: -32,
    fontSize: 14,
    padding: "2px 6px",
    borderRadius: 6,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    opacity: 0.3,
    transition: "opacity 0.2s",
  },
  audioWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  audio: {
    maxWidth: "100%",
    height: 32,
  },
  imageWrap: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  image: {
    maxWidth: "100%",
    maxHeight: 300,
    borderRadius: 8,
    objectFit: "contain",
  },
  fileLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    color: "var(--accent)",
    textDecoration: "none",
    padding: "4px 8px",
    background: "var(--bg-3)",
    borderRadius: 6,
    fontSize: 13,
  },
  editContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  editInput: {
    width: "100%",
    minHeight: 60,
    padding: 8,
    borderRadius: 4,
    border: "1px solid var(--border)",
    background: "var(--bg-1)",
    color: "var(--text-0)",
    fontSize: 14,
    fontFamily: "inherit",
    resize: "vertical",
  },
  editActions: {
    display: "flex",
    gap: 8,
    justifyContent: "flex-end",
  },
  editCancel: {
    padding: "4px 12px",
    borderRadius: 4,
    border: "1px solid var(--border)",
    background: "transparent",
    color: "var(--text-1)",
    cursor: "pointer",
    fontSize: 12,
  },
  editSave: {
    padding: "4px 12px",
    borderRadius: 4,
    border: "none",
    background: "var(--accent)",
    color: "white",
    cursor: "pointer",
    fontSize: 12,
  },
  editBtn: {
    marginLeft: 8,
    background: "transparent",
    border: "none",
    cursor: "pointer",
    fontSize: 12,
    opacity: 0.6,
    transition: "opacity 0.2s",
  },
};
