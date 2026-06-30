import { useTypingIndicator } from "../matrix/typing";
import type { MatrixClient, Room } from "matrix-js-sdk";

interface Props {
  client: MatrixClient;
  room: Room | null;
}

export default function TypingIndicator({ client, room }: Props) {
  const typingUsers = useTypingIndicator(client, room);

  if (typingUsers.length === 0) {
    return null;
  }

  const typingText = typingUsers.length === 1
    ? "typing..."
    : `${typingUsers.length} people typing...`;

  return (
    <div style={styles.container}>
      <div style={styles.dots}>
        <span style={styles.dot} />
        <span style={{ ...styles.dot, animationDelay: "0.2s" }} />
        <span style={{ ...styles.dot, animationDelay: "0.4s" }} />
      </div>
      <span style={styles.text}>{typingText}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 16px",
    fontSize: 13,
    color: "var(--text-2)",
  },
  dots: {
    display: "flex",
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "var(--text-2)",
    animation: "bounce 1.4s infinite",
  },
  text: {
    fontStyle: "italic",
  },
};
