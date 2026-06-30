import type { MatrixClient, MatrixEvent, Room } from "matrix-js-sdk";
import { MsgType, RelationType } from "matrix-js-sdk";

/**
 * Edit a sent message.
 * Uses m.replace relation to update the message content.
 */
export async function editMessage(
  client: MatrixClient,
  roomId: string,
  originalEvent: MatrixEvent,
  newBody: string
): Promise<void> {
  const eventId = originalEvent.getId();
  if (!eventId) throw new Error("Cannot edit event without ID");

  // Send m.room.message with m.relates_to indicating it's a replacement
  await client.sendMessage(roomId, {
    msgtype: MsgType.Text,
    body: newBody,
    "m.new_content": {
      msgtype: MsgType.Text,
      body: newBody,
    },
    "m.relates_to": {
      rel_type: RelationType.Replace,
      event_id: eventId,
    },
  });
}

/**
 * Delete (redact) a sent message.
 * Sends a redaction event for the original message.
 */
export async function deleteMessage(
  client: MatrixClient,
  roomId: string,
  eventId: string
): Promise<void> {
  await client.redactEvent(roomId, eventId);
}

/**
 * Check if the current user can edit/delete an event.
 * Users can only edit/delete their own messages.
 */
export function canEditOrDelete(event: MatrixEvent, userId: string): boolean {
  return event.getSender() === userId && event.getType() === "m.room.message";
}

/**
 * Get the latest edited version of a message.
 * Returns the original event if no edits, or the latest replacement.
 */
export function getLatestEdit(event: MatrixEvent, room: Room): MatrixEvent {
  const eventId = event.getId();
  if (!eventId) return event;

  // Look through timeline for m.replace relations
  const timeline = room.getLiveTimeline();
  const events = timeline.getEvents();

  let latestEdit = event;
  let latestTs = event.getTs();

  for (const ev of events) {
    if (ev.getType() !== "m.room.message") continue;

    const content = ev.getContent();
    const relatesTo = content["m.relates_to"];

    if (relatesTo?.rel_type === "m.replace" && relatesTo.event_id === eventId) {
      if (ev.getTs() > latestTs) {
        latestEdit = ev;
        latestTs = ev.getTs();
      }
    }
  }

  return latestEdit;
}

/**
 * Check if a message has been edited.
 */
export function isEdited(event: MatrixEvent, room: Room): boolean {
  const latest = getLatestEdit(event, room);
  return latest !== event;
}
