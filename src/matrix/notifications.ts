import { MatrixClient } from "matrix-js-sdk";

const MUTE_STORAGE_KEY = "talaria_muted_rooms";

/**
 * Get list of muted room IDs from localStorage
 */
export function getMutedRooms(): Set<string> {
  try {
    const stored = localStorage.getItem(MUTE_STORAGE_KEY);
    if (!stored) return new Set();
    const arr = JSON.parse(stored);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

/**
 * Save muted rooms to localStorage
 */
function saveMutedRooms(muted: Set<string>): void {
  localStorage.setItem(MUTE_STORAGE_KEY, JSON.stringify(Array.from(muted)));
}

/**
 * Mute a room
 */
export function muteRoom(roomId: string): void {
  const muted = getMutedRooms();
  muted.add(roomId);
  saveMutedRooms(muted);
}

/**
 * Unmute a room
 */
export function unmuteRoom(roomId: string): void {
  const muted = getMutedRooms();
  muted.delete(roomId);
  saveMutedRooms(muted);
}

/**
 * Check if a room is muted
 */
export function isRoomMuted(roomId: string): boolean {
  return getMutedRooms().has(roomId);
}

/**
 * Toggle mute state for a room
 */
export function toggleRoomMute(roomId: string): boolean {
  const muted = getMutedRooms();
  if (muted.has(roomId)) {
    muted.delete(roomId);
    saveMutedRooms(muted);
    return false; // now unmuted
  } else {
    muted.add(roomId);
    saveMutedRooms(muted);
    return true; // now muted
  }
}

/**
 * Check if we should show a notification for this room
 */
export function shouldNotify(roomId: string): boolean {
  return !isRoomMuted(roomId);
}

/**
 * Set up notification filtering based on mute state
 */
export function setupNotificationFilter(client: MatrixClient): void {
  client.on("Room.timeline" as any, (event: any, room: any) => {
    if (!room || !room.roomId) return;
    
    // Don't notify for own messages
    if (event.getSender() === client.getUserId()) return;
    
    // Don't notify for muted rooms
    if (!shouldNotify(room.roomId)) {
      // Prevent default notification
      event._suppressNotification = true;
    }
  });
}
