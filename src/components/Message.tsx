import { type MatrixEvent } from "matrix-js-sdk";
import { renderInline } from "../matrix/markdown";

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
      <div style={{
        ...styles.bubble,
        background: isMe ? "var(--accent)" : "var(--bg-2)",
        color: isMe ? "#000" : "var(--text-0)",
      }}>
        {!isMe && <div style={styles.sender}>{sender.replace(/^@/, "").split(":")[0]}</div>}
        <div style={styles.body}>{bodyNode}</div>
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
};
