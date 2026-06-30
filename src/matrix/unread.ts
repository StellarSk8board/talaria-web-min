import { useEffect, useState } from "react";
import type { MatrixClient, Room, MatrixEvent } from "matrix-js-sdk";

interface UnreadState {
  [roomId: string]: number;
}

/**
 * Track unread message counts per room.
 */
export function useUnreadCounts(client: MatrixClient, rooms: Room[]): UnreadState {
  const [unread, setUnread] = useState<UnreadState>({});

  useEffect(() => {
    const counts: UnreadState = {};

    // Initialize counts for all rooms
    for (const room of rooms) {
      counts[room.roomId] = getUnreadCount(room, client);
    }

    setUnread(counts);

    // Listen for new events
    const onTimeline = (event: MatrixEvent, room: Room | undefined) => {
      if (!room) return;
      const sender = event.getSender();
      if (sender === client.getUserId()) return; // Ignore own messages

      setUnread((prev) => ({
        ...prev,
        [room.roomId]: (prev[room.roomId] || 0) + 1,
      }));
    };

    client.on("Room.timeline" as any, onTimeline as any);

    return () => {
      client.off("Room.timeline" as any, onTimeline as any);
    };
  }, [client, rooms]);

  return unread;
}

/**
 * Get unread count for a room.
 */
function getUnreadCount(room: Room, client: MatrixClient): number {
  const timeline = room.getLiveTimeline();
  const events = timeline.getEvents();
  const myUserId = client.getUserId();

  let count = 0;
  for (const event of events) {
    if (event.getSender() !== myUserId && event.getType() === "m.room.message") {
      count++;
    }
  }

  return count;
}

/**
 * Mark room as read (reset unread count).
 */
export function markRoomAsRead(room: Room, client: MatrixClient): void {
  const timeline = room.getLiveTimeline();
  const events = timeline.getEvents();

  if (events.length > 0) {
    const lastEvent = events[events.length - 1];
    // Send read receipt
    client.sendReadReceipt(lastEvent);
  }
}
