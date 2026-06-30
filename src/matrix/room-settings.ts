import { MatrixClient, Room } from "matrix-js-sdk";

/**
 * Update room name
 */
export async function updateRoomName(
  client: MatrixClient,
  roomId: string,
  name: string
): Promise<void> {
  await client.setRoomName(roomId, name);
}

/**
 * Update room topic
 */
export async function updateRoomTopic(
  client: MatrixClient,
  roomId: string,
  topic: string
): Promise<void> {
  await client.setRoomTopic(roomId, topic);
}

/**
 * Invite user to room
 */
export async function inviteToRoom(
  client: MatrixClient,
  roomId: string,
  userId: string
): Promise<void> {
  await client.invite(roomId, userId);
}

/**
 * Remove user from room (kick)
 */
export async function removeFromRoom(
  client: MatrixClient,
  roomId: string,
  userId: string,
  reason?: string
): Promise<void> {
  await client.kick(roomId, userId, reason);
}

/**
 * Get room members
 */
export function getRoomMembers(room: Room): Array<{ userId: string; membership: string | undefined }> {
  const members: Array<{ userId: string; membership: string | undefined }> = [];
  const roomMembers = room.getMembers();
  
  for (const member of roomMembers) {
    members.push({
      userId: member.userId,
      membership: member.membership,
    });
  }
  
  return members;
}

/**
 * Check if current user can edit room settings
 */
export function canEditRoom(room: Room, userId: string): boolean {
  const member = room.getMember(userId);
  if (!member) return false;
  
  // Power levels: 0 = User, 50 = Moderator, 100 = Admin
  const powerLevel = member.powerLevel;
  return powerLevel >= 50; // Moderator or Admin
}
