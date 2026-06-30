import { useEffect, useState } from "react";
import type { MatrixClient, Room } from "matrix-js-sdk";

export type AgentStatus = "online" | "offline" | "typing" | "thinking";

interface TypingState {
  [roomId: string]: {
    [userId: string]: {
      status: AgentStatus;
      timeout: ReturnType<typeof setTimeout>;
    };
  };
}

const typingStates: TypingState = {};

/**
 * Listen for typing events in a room.
 */
export function useTypingIndicator(client: MatrixClient, room: Room | null): AgentStatus[] {
  const [typingUsers, setTypingUsers] = useState<AgentStatus[]>([]);

  useEffect(() => {
    if (!room || !client) {
      setTypingUsers([]);
      return;
    }

    const roomId = room.roomId;

    // Initialize typing state for this room
    if (!typingStates[roomId]) {
      typingStates[roomId] = {};
    }

    const onTyping = (event: any, _member: any) => {
      const userId = event.getSender();
      if (!userId || userId === client.getUserId()) return;

      // Clear existing timeout
      if (typingStates[roomId][userId]?.timeout) {
        clearTimeout(typingStates[roomId][userId].timeout);
      }

      // Set typing status
      typingStates[roomId][userId] = {
        status: "typing",
        timeout: setTimeout(() => {
          delete typingStates[roomId][userId];
          updateTypingUsers();
        }, 3000), // Clear after 3 seconds of no typing
      };

      updateTypingUsers();
    };

    const updateTypingUsers = () => {
      const statuses: AgentStatus[] = [];
      for (const userId in typingStates[roomId]) {
        statuses.push(typingStates[roomId][userId].status);
      }
      setTypingUsers(statuses);
    };

    // Listen for typing events
    client.on("RoomMember.typing" as any, onTyping as any);

    return () => {
      client.off("RoomMember.typing" as any, onTyping as any);
      // Clean up timeouts
      if (typingStates[roomId]) {
        for (const userId in typingStates[roomId]) {
          if (typingStates[roomId][userId].timeout) {
            clearTimeout(typingStates[roomId][userId].timeout);
          }
        }
        delete typingStates[roomId];
      }
    };
  }, [client, room]);

  return typingUsers;
}

/**
 * Send typing notification.
 */
export function sendTypingNotification(client: MatrixClient, roomId: string): void {
  client.sendTyping(roomId, true, 5000);

  // Stop typing after 5 seconds
  setTimeout(() => {
    client.sendTyping(roomId, false, 0);
  }, 5000);
}
