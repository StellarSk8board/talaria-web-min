import { type MatrixEvent } from "matrix-js-sdk";

interface Props {
  event: MatrixEvent;
  myUserId: string;
}

export default function Message({ event, myUserId }: Props) {
  const sender = event.getSender() ?? "?";
  const isMe = sender === myUserId;
  const content = event.getContent();
  const body: string = content.body ?? "";
  const status = event.status ?? "sent";

  // Render based on msgtype — text is the only one we care about for W7.
  const msgtype: string = content.msgtype ?? "m.text";

  return (
    <div style={{
      ...styles.row,
      justifyContent: isMe ? "flex-end" : "flex-start",
    }}>
      <div style={{
        ...styles.bubble,
        background: isMe ? "var(--accent)" : "var(--bg-2)",
        color: isMe ? "#000" : "var(--text-0)",
      }}>
        {!isMe && <div style={styles.sender}>{sender.replace(/^@/, "").split(":")[0]}</div>}
        <div style={styles.body}>
          {msgtype === "m.text" ? body : <span className="dim mono">[{msgtype}]</span>}
        </div>
        <div style={{
          ...styles.status,
          color: isMe ? "rgba(0,0,0,0.5)" : "var(--text-2)",
        }}>
          {status === "sending" ? "sending…" : status === "queued" ? "queued" : formatTime(event.getTs())}
        </div>
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
  bubble: {
    maxWidth: "70%",
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
};
