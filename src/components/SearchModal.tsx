import type { MatrixClient, Room } from "matrix-js-sdk";
import { useMessageSearch, type SearchResult } from "../matrix/search";

interface Props {
  client: MatrixClient;
  onSelectResult: (room: Room) => void;
  onClose: () => void;
}

export default function SearchModal({ client, onSelectResult, onClose }: Props) {
  const { query, setQuery, results } = useMessageSearch(client);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages..."
            style={styles.input}
            autoFocus
          />
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>

        <div style={styles.results}>
          {query && results.length === 0 && (
            <div style={styles.noResults}>No results found</div>
          )}

          {results.map((result) => (
            <SearchResultItem
              key={result.event.getId()}
              result={result}
              query={query}
              onClick={() => {
                onSelectResult(result.room);
                onClose();
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SearchResultItem({ result, query, onClick }: { result: SearchResult; query: string; onClick: () => void }) {
  const sender = result.event.getSender()?.replace(/^@/, "").split(":")[0] ?? "?";
  const roomName = result.room.name ?? "Unknown room";

  // Highlight the query in the snippet
  const highlightParts = result.highlight.split(new RegExp(`(${query})`, "gi"));

  return (
    <div style={styles.resultItem} onClick={onClick}>
      <div style={styles.resultHeader}>
        <span style={styles.roomName}>{roomName}</span>
        <span style={styles.sender}>{sender}</span>
      </div>
      <div style={styles.snippet}>
        {highlightParts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i} style={styles.highlight}>{part}</mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
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
    gap: 8,
    padding: 16,
    borderBottom: "1px solid var(--border)",
  },
  input: {
    flex: 1,
    padding: "8px 12px",
    borderRadius: 6,
    border: "1px solid var(--border)",
    background: "var(--bg-2)",
    color: "var(--text-0)",
    fontSize: 14,
  },
  closeBtn: {
    padding: "8px 12px",
    borderRadius: 6,
    border: "1px solid var(--border)",
    background: "transparent",
    color: "var(--text-1)",
    cursor: "pointer",
    fontSize: 16,
  },
  results: {
    flex: 1,
    overflowY: "auto",
    padding: 8,
  },
  noResults: {
    padding: 24,
    textAlign: "center",
    color: "var(--text-2)",
  },
  resultItem: {
    padding: 12,
    borderRadius: 6,
    cursor: "pointer",
    marginBottom: 4,
    transition: "background 0.15s",
  },
  resultHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: 4,
    fontSize: 12,
  },
  roomName: {
    fontWeight: 600,
    color: "var(--text-0)",
  },
  sender: {
    color: "var(--text-2)",
  },
  snippet: {
    fontSize: 13,
    color: "var(--text-1)",
    lineHeight: 1.4,
  },
  highlight: {
    background: "var(--accent)",
    color: "white",
    padding: "0 2px",
    borderRadius: 2,
  },
};
