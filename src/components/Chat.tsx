import { useEffect, useRef, useState } from "react";
import { RoomEvent, MsgType, type MatrixClient, type Room, type MatrixEvent } from "matrix-js-sdk";
import { type Agent } from "../matrix/agents";
import Message from "./Message";
import Compose from "./Compose";
import TypingIndicator from "./TypingIndicator";
import { usePresence } from "../matrix/presence";

interface Props {
  client: MatrixClient;
  myUserId: string;
  agent: Agent | null;
  room: Room | null;
  onBack: () => void;
}

export default function Chat({ client, myUserId, agent, room, onBack }: Props) {
  const [events, setEvents] = useState<MatrixEvent[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const presence = usePresence(client, room);

  // Refresh timeline when room changes.
  useEffect(() => {
    if (!room) {
      setEvents([]);
      return;
    }
    const refresh = () => {
      const tl = room.getLiveTimeline();
      const evs = tl.getEvents().filter((e) => e.getType() === "m.room.message");
      setEvents(evs);
    };
    refresh();
    const handler = () => refresh();
    client.on(RoomEvent.Timeline as any, handler as any);
    client.on(RoomEvent.LocalEchoUpdated as any, handler as any);
    return () => {
      client.off(RoomEvent.Timeline as any, handler as any);
      client.off(RoomEvent.LocalEchoUpdated as any, handler as any);
    };
  }, [client, room]);

  // Auto-scroll on new events.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  async function send(body: string) {
    if (!room) {
      if (!agent) return; // Should not happen
      // No DM yet — create one and send.
      const r = await client.createRoom({
        invite: [agent.userId],
        is_direct: true,
        preset: "trusted_private_chat" as any,
      });
      await client.sendMessage(r.room_id, {
        msgtype: MsgType.Text,
        body,
      });
    } else {
      await client.sendMessage(room.roomId, {
        msgtype: MsgType.Text,
        body,
      });
    }
  }

  async function sendAudio(blob: Blob) {
    if (!room) {
      if (!agent) return;
      const r = await client.createRoom({
        invite: [agent.userId],
        is_direct: true,
        preset: "trusted_private_chat" as any,
      });
      await uploadAndSendAudio(r.room_id, blob);
    } else {
      await uploadAndSendAudio(room.roomId, blob);
    }
  }

  async function sendFile(file: File) {
    const targetRoomId = room?.roomId;
    let roomId = targetRoomId;

    if (!roomId) {
      if (!agent) return;
      const r = await client.createRoom({
        invite: [agent.userId],
        is_direct: true,
        preset: "trusted_private_chat" as any,
      });
      roomId = r.room_id;
    }

    // Upload the file
    const response = await client.uploadContent(file, {
      name: file.name,
      type: file.type,
    });
    const content = response as any;

    // Determine message type based on file type
    const isImage = file.type.startsWith("image/");
    const msgtype = isImage ? "m.image" : "m.file";

    await client.sendMessage(roomId, {
      msgtype: msgtype as any,
      body: file.name,
      filename: file.name,
      url: content.content_uri,
      info: {
        mimetype: file.type,
        size: file.size,
      },
    });
  }

  async function uploadAndSendAudio(roomId: string, blob: Blob) {
    const file = new File([blob], "voice-message.webm", { type: "audio/webm" });
    const response = await client.uploadContent(file, {
      name: "voice-message.webm",
      type: "audio/webm",
    });
    const content = response as any;
    await client.sendMessage(roomId, {
      msgtype: "m.audio" as any,
      body: "Voice message",
      url: content.content_uri,
      info: {
        mimetype: "audio/webm",
        size: blob.size,
      },
    });
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <button onClick={onBack} style={styles.back} className="mobile-only" aria-label="back">
          ←
        </button>
        <button onClick={onBack} style={styles.desktopBack} className="desktop-only" aria-label="back to agents">
          ← Agents
        </button>
        {agent ? (
          <>
            <div style={styles.avatar}>{agent.displayName.charAt(0).toUpperCase()}</div>
            <div style={styles.headerMain}>
              <div style={styles.headerName}>{agent.displayName}</div>
              <div className="dim" style={styles.headerSub}>
                <span style={{
                  ...styles.statusDot,
                  backgroundColor: presence[agent.userId] === "online" ? "var(--online)" : "var(--offline)"
                }} />
                {presence[agent.userId] === "online" ? "Online" : "Offline"}
              </div>
            </div>
            <div className="mono dim" style={styles.headerUserId} title={agent.userId}>
              {agent.userId.replace(/^@/, "").split(":")[0]}@{agent.userId.split(":")[1]}
            </div>
          </>
        ) : (
          <>
            <div style={styles.avatar}>#</div>
            <div style={styles.headerMain}>
              <div style={styles.headerName}>{room?.name || "Group Chat"}</div>
              <div className="dim" style={styles.headerSub}>
                {room?.getJoinedMemberCount() ?? 0} members
              </div>
            </div>
          </>
        )}
      </div>

      <div ref={scrollRef} style={styles.scroll}>
        {events.length === 0 ? (
          <div style={styles.empty}>
            <p className="dim">No messages yet.</p>
            <p className="dim" style={{ fontSize: 12 }}>
              {room
                ? "Send the first message."
                : agent
                  ? `No DM room with ${agent.displayName} yet — sending will create one.`
                  : "No room selected."}
            </p>
          </div>
        ) : (
          events.map((ev) => <Message key={ev.getId() ?? ev.getTxnId() ?? Math.random()} event={ev} myUserId={myUserId} client={client} roomId={room?.roomId ?? ""} />)
        )}
      </div>

      <TypingIndicator client={client} room={room} />

      <Compose 
        onSend={send} 
        onSendAudio={sendAudio} 
        onSendFile={sendFile} 
        disabled={!room && !agent}
        client={client}
        roomId={room?.roomId}
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    minHeight: 0,
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 16px",
    borderBottom: "1px solid var(--border)",
    background: "var(--bg-1)",
  },
  back: {
    display: "none",
    background: "transparent",
    border: "none",
    color: "var(--text-0)",
    fontSize: 20,
    padding: 0,
    width: 32,
  },
  desktopBack: {
    display: "none",
    background: "transparent",
    border: "1px solid var(--border)",
    color: "var(--text-1)",
    fontSize: 12,
    padding: "4px 10px",
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    background: "var(--bg-3)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 16,
  },
  headerMain: {
    flex: 1,
    minWidth: 0,
  },
  headerName: {
    fontWeight: 600,
    fontSize: 15,
  },
  headerSub: {
    fontSize: 12,
  },
  statusDot: {
    display: "inline-block",
    width: 8,
    height: 8,
    borderRadius: "50%",
    marginRight: 6,
  },
  headerUserId: {
    fontSize: 11,
  },
  scroll: {
    flex: 1,
    overflowY: "auto",
    padding: "16px 0",
  },
  empty: {
    textAlign: "center",
    padding: 40,
  },
};
