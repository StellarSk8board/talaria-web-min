import { useEffect, useState } from "react";
import type { MatrixClient, Room, MatrixEvent } from "matrix-js-sdk";

interface UnreadState {
  [roomId: string]: number;
}

/**
 * Track unread message counts per room.
 */
export function useUnreadCounts(client: MatrixClient | null, rooms: Room[]): UnreadState {
  const [unread, setUnread] = useState<UnreadState>({});

  useEffect(() => {
    if (!client) {
      setUnread({});
      return;
    }

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
 * Uses the SDK's built-in notification count which tracks read receipts.
 */
function getUnreadCount(room: Room, _client: MatrixClient): number {
  // matrix-js-sdk tracks unread notification count internally
  // based on read receipts. This is the correct way to get unread counts.
  return room.getUnreadNotificationCount();
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
