import { useEffect, useState } from "react";
import type { MatrixClient, Room } from "matrix-js-sdk";

export type PresenceStatus = "online" | "offline" | "unavailable" | "unknown";

interface PresenceState {
  [userId: string]: PresenceStatus;
}

const presenceCache: PresenceState = {};

/**
 * Hook to track presence status of room members.
 */
export function usePresence(client: MatrixClient, room: Room | null): PresenceState {
  const [presence, setPresence] = useState<PresenceState>({});

  useEffect(() => {
    if (!room || !client) {
      setPresence({});
      return;
    }

    // Initialize presence from current room members
    const initialPresence: PresenceState = {};
    const members = room.getJoinedMembers();
    for (const member of members) {
      const userId = member.userId;
      if (presenceCache[userId]) {
        initialPresence[userId] = presenceCache[userId];
      } else {
        initialPresence[userId] = "unknown";
      }
    }
    setPresence(initialPresence);

    const updatePresence = (event: any, member: any) => {
      const userId = event.getSender();
      if (!userId) return;

      const presenceEvent = member?.getPresenceEvent?.();
      let status: PresenceStatus = "unknown";

      if (presenceEvent) {
        const content = presenceEvent.getContent();
        const presence = content.presence;
        
        if (presence === "online") {
          status = "online";
        } else if (presence === "offline") {
          status = "offline";
        } else if (presence === "unavailable") {
          status = "unavailable";
        }
      }

      presenceCache[userId] = status;
      setPresence((prev) => ({ ...prev, [userId]: status }));
    };

    client.on("RoomMember.presence" as any, updatePresence as any);

    return () => {
      client.off("RoomMember.presence" as any, updatePresence as any);
    };
  }, [client, room]);

  return presence;
}

/**
 * Get the overall status for a room (for sidebar display).
 */
export function getRoomPresenceStatus(presence: PresenceState, room: Room | null): PresenceStatus {
  if (!room) return "unknown";

  const members = room.getJoinedMembers();
  let hasOnline = false;
  let hasUnknown = false;

  for (const member of members) {
    const status = presence[member.userId];
    if (status === "online") {
      hasOnline = true;
    } else if (status === "unknown") {
      hasUnknown = true;
    }
  }

  if (hasOnline) return "online";
  if (hasUnknown) return "unknown";
  return "offline";
}
