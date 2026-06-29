import { useEffect, useRef, useState } from "react";
import { RoomEvent, MsgType, type MatrixClient, type Room, type MatrixEvent } from "matrix-js-sdk";
import { type Agent } from "../matrix/agents";
import Message from "./Message";
import Compose from "./Compose";

interface Props {
  client: MatrixClient;
  myUserId: string;
  agent: Agent;
  room: Room | null;
  onBack: () => void;
}

export default function Chat({ client, myUserId, agent, room, onBack }: Props) {
  const [events, setEvents] = useState<MatrixEvent[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  return (
    <div style={styles.wrap}>
      <div style={styles.header}>
        <button onClick={onBack} style={styles.back} className="mobile-only" aria-label="back">
          ←
        </button>
        <div style={styles.avatar}>{agent.displayName.charAt(0).toUpperCase()}</div>
        <div style={styles.headerMain}>
          <div style={styles.headerName}>{agent.displayName}</div>
          <div className="dim" style={styles.headerSub}>{agent.role}</div>
        </div>
        <div className="mono dim" style={styles.headerUserId} title={agent.userId}>
          {agent.userId.replace(/^@/, "").split(":")[0]}@{agent.userId.split(":")[1]}
        </div>
      </div>

      <div ref={scrollRef} style={styles.scroll}>
        {events.length === 0 ? (
          <div style={styles.empty}>
            <p className="dim">No messages yet.</p>
            <p className="dim" style={{ fontSize: 12 }}>
              {room
                ? "Send the first message."
                : `No DM room with ${agent.displayName} yet — sending will create one.`}
            </p>
          </div>
        ) : (
          events.map((ev) => <Message key={ev.getId() ?? ev.getTxnId() ?? Math.random()} event={ev} myUserId={myUserId} />)
        )}
      </div>

      <Compose onSend={send} disabled={!room && false /* allow-create flow */} />
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
