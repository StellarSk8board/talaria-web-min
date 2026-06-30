import { useState, useEffect } from "react";
import type { MatrixClient, Room, MatrixEvent } from "matrix-js-sdk";

export interface SearchResult {
  event: MatrixEvent;
  room: Room;
  highlight: string;
}

/**
 * Search across all rooms for messages containing the query.
 */
export function searchMessages(
  client: MatrixClient,
  query: string,
  limit: number = 50
): SearchResult[] {
  if (!query.trim()) return [];

  const results: SearchResult[] = [];
  const lowerQuery = query.toLowerCase();
  const rooms = client.getRooms();

  for (const room of rooms) {
    const timeline = room.getLiveTimeline();
    const events = timeline.getEvents();

    for (const event of events) {
      if (event.getType() !== "m.room.message") continue;

      const content = event.getContent();
      const body: string = content.body ?? "";

      if (body.toLowerCase().includes(lowerQuery)) {
        // Extract a highlight snippet
        const idx = body.toLowerCase().indexOf(lowerQuery);
        const start = Math.max(0, idx - 30);
        const end = Math.min(body.length, idx + query.length + 30);
        const highlight = (start > 0 ? "..." : "") + body.slice(start, end) + (end < body.length ? "..." : "");

        results.push({ event, room, highlight });

        if (results.length >= limit) break;
      }
    }

    if (results.length >= limit) break;
  }

  return results;
}

/**
 * Hook to manage search state.
 */
export function useMessageSearch(client: MatrixClient | null) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);

  useEffect(() => {
    if (!client || !query.trim()) {
      setResults([]);
      return;
    }

    const searchResults = searchMessages(client, query);
    setResults(searchResults);
  }, [client, query]);

  return { query, setQuery, results };
}
