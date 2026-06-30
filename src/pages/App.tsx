import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { restoreSession, startClient, clearStoredSession } from "../matrix/client";
import { fetchAgents, type Agent } from "../matrix/agents";
import type { MatrixClient, Room } from "matrix-js-sdk";
import Sidebar from "../components/Sidebar";
import Chat from "../components/Chat";

export default function App() {
  const navigate = useNavigate();
  const [client, setClient] = useState<MatrixClient | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Map<string, Room>>(new Map());
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [agentError, setAgentError] = useState<string | null>(null);

  // ---- load agents (can be called again for retry/reload) ----
  const loadAgents = useCallback(() => {
    setAgentsLoading(true);
    setAgentError(null);
    fetchAgents()
      .then((registry) => {
        setAgents(registry.agents);
        setAgentsLoading(false);
      })
      .catch((err) => {
        setAgentError(err.message);
        setAgentsLoading(false);
      });
  }, []);

  // ---- bootstrap: restore session, start client, wait for sync ----
  useEffect(() => {
    const restored = restoreSession();
    if (!restored) {
      navigate("/login", { replace: true });
      return;
    }
    setUserId(restored.userId);

    // Load agent registry
    loadAgents();

    let cancelled = false;
    startClient(restored.client)
      .then(() => {
        if (cancelled) return;
        setClient(restored.client);

        // Snapshot current rooms.
        const map = new Map<string, Room>();
        for (const r of restored.client.getRooms()) map.set(r.roomId, r);
        setRooms(map);

        // Listen for new rooms.
        const onRoom = (room: Room) => {
          setRooms((prev) => {
            const next = new Map(prev);
            next.set(room.roomId, room);
            return next;
          });
        };
        restored.client.on("Room" as any, onRoom as any);

        return () => {
          restored.client.off("Room" as any, onRoom as any);
        };
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setSyncError(msg);
        if (/token|forbidden|401|403|M_UNKNOWN_TOKEN/i.test(msg)) {
          clearStoredSession();
          navigate("/login", { replace: true });
        }
      });

    return () => { cancelled = true; };
  }, [navigate, loadAgents]);

  if (syncError) {
    return (
      <div style={styles.center}>
        <div style={styles.errorCard}>
          <h3>Sync error</h3>
          <p className="mono" style={{ fontSize: 12 }}>{syncError}</p>
          <button onClick={() => { clearStoredSession(); navigate("/login", { replace: true }); }}>
            Back to sign in
          </button>
        </div>
      </div>
    );
  }

  if (!client || !userId) {
    return (
      <div style={styles.center}>
        <p className="dim">Connecting…</p>
      </div>
    );
  }

  // ---- find the DM room for an agent ----
  function findDmRoom(agentUserId: string): Room | null {
    for (const r of rooms.values()) {
      const meJoined = r.getMember(userId!)?.membership === "join";
      const themJoined = r.getMember(agentUserId)?.membership === "join";
      const isDm = r.getDMInviter() === agentUserId || (meJoined && themJoined && r.getJoinedMemberCount() === 2);
      if (meJoined && themJoined && isDm) return r;
    }
    return null;
  }

  return (
    <div style={styles.shell}>
      <Sidebar
        agents={agents}
        rooms={rooms}
        myUserId={userId}
        selectedAgent={selectedAgent}
        onSelect={(a) => { setSelectedAgent(a); setSidebarOpen(false); }}
        findDmRoom={findDmRoom}
        onSignOut={() => { clearStoredSession(); navigate("/login", { replace: true }); }}
        open={sidebarOpen}
        onReloadAgents={loadAgents}
        agentsLoading={agentsLoading}
        agentError={agentError}
      />
      <main style={styles.main}>
        {selectedAgent ? (
          <Chat
            client={client}
            myUserId={userId}
            agent={selectedAgent}
            room={findDmRoom(selectedAgent.userId)}
            onBack={() => { setSelectedAgent(null); setSidebarOpen(true); }}
          />
        ) : (
          <div style={styles.empty}>
            {agentsLoading ? (
              <p className="dim">Loading agents…</p>
            ) : agentError ? (
              <>
                <p className="dim" style={{ color: "var(--danger)" }}>Failed to load agents</p>
                <p className="dim mono" style={{ fontSize: 11, marginTop: 8 }}>{agentError}</p>
                <button onClick={loadAgents} style={{ marginTop: 12 }}>Retry</button>
              </>
            ) : agents.length === 0 ? (
              <>
                <p className="dim">No agents configured</p>
                <p className="dim mono" style={{ fontSize: 11, marginTop: 8 }}>
                  Edit <code>public/agents.json</code> to add agents
                </p>
              </>
            ) : (
              <>
                <p className="dim">Select an agent to start talking.</p>
                <p className="dim mono" style={{ fontSize: 11, marginTop: 8 }}>
                  {agents.length} agents configured
                </p>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  shell: {
    display: "flex",
    height: "100vh",
    width: "100vw",
    overflow: "hidden",
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    background: "var(--bg-0)",
    minWidth: 0,
  },
  center: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100vh",
  },
  empty: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  errorCard: {
    maxWidth: 480,
    background: "var(--bg-1)",
    border: "1px solid var(--danger)",
    borderRadius: 8,
    padding: 20,
  },
};
