import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { restoreSession, startClient, clearStoredSession } from "../matrix/client";
import { fetchAgents, type Agent } from "../matrix/agents";
import { getVerifyStatus, type VerifyStatus } from "../matrix/verify";
import { useUnreadCounts } from "../matrix/unread";
import { useKeyboardShortcuts } from "../matrix/shortcuts";
import { SyncRecovery } from "../matrix/sync-recovery";
import type { MatrixClient, Room } from "matrix-js-sdk";
import Sidebar from "../components/Sidebar";
import Chat from "../components/Chat";
import NewGroupModal from "../components/NewGroupModal";
import Verification from "../components/Verification";
import SearchModal from "../components/SearchModal";

export default function App() {
  const navigate = useNavigate();
  const [client, setClient] = useState<MatrixClient | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Map<string, Room>>(new Map());
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(true);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>("unknown");
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>("Connected");

  // Track unread message counts
  const unreadCounts = useUnreadCounts(client, Array.from(rooms.values()));

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onNavigateUp: () => {
      if (selectedAgent) {
        const idx = agents.findIndex(a => a.userId === selectedAgent.userId);
        if (idx > 0) setSelectedAgent(agents[idx - 1]);
      } else if (agents.length > 0) {
        setSelectedAgent(agents[agents.length - 1]);
      }
    },
    onNavigateDown: () => {
      if (selectedAgent) {
        const idx = agents.findIndex(a => a.userId === selectedAgent.userId);
        if (idx < agents.length - 1) setSelectedAgent(agents[idx + 1]);
      } else if (agents.length > 0) {
        setSelectedAgent(agents[0]);
      }
    },
    onOpenChat: () => {
      if (selectedAgent && !selectedRoom) {
        setSidebarOpen(false);
      }
    },
    onBack: () => {
      if (selectedRoom) {
        setSelectedRoom(null);
        setSidebarOpen(true);
      } else if (selectedAgent) {
        setSelectedAgent(null);
        setSidebarOpen(true);
      }
    },
    onFocusCompose: () => {
      const compose = document.querySelector('textarea[placeholder]') as HTMLTextAreaElement;
      if (compose) compose.focus();
    },
    onSearch: () => {
      setShowSearchModal(true);
    },
  });

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

        // Initialize sync recovery for connection monitoring
        new SyncRecovery(restored.client, setConnectionStatus);

        // Check verification status
        getVerifyStatus(restored.client).then(setVerifyStatus);

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

  // ---- compute group rooms (non-DM rooms with 3+ members) ----
  const groupRooms = useMemo(() => {
    const groups: Room[] = [];
    for (const r of rooms.values()) {
      const meJoined = r.getMember(userId!)?.membership === "join";
      if (!meJoined) continue;
      const memberCount = r.getJoinedMemberCount();
      if (memberCount >= 3 && !r.getDMInviter()) {
        groups.push(r);
      }
    }
    return groups.sort((a, b) => {
      const aLast = a.getLastLiveEvent()?.getTs() ?? 0;
      const bLast = b.getLastLiveEvent()?.getTs() ?? 0;
      return bLast - aLast;
    });
  }, [rooms, userId]);

  // ---- create a new group room ----
  async function createGroup(name: string, selectedAgents: Agent[]) {
    if (!client) return;
    try {
      const invite = selectedAgents.map((a) => a.userId);
      await client.createRoom({
        name,
        invite,
        preset: "private_chat" as any,
        is_direct: false,
      });
      // The room will arrive via the "Room" event listener
      setShowNewGroupModal(false);
    } catch (err) {
      console.error("Failed to create group:", err);
      alert("Failed to create group: " + (err instanceof Error ? err.message : String(err)));
    }
  }

  // ---- handle selecting a group room ----
  function handleSelectRoom(room: Room) {
    setSelectedAgent(null);
    setSelectedRoom(room);
    setSidebarOpen(false);
  }

  return (
    <div style={styles.shell}>
      {connectionStatus !== "Connected" && (
        <div style={styles.connectionBanner}>
          {connectionStatus}
        </div>
      )}
      <Sidebar
        agents={agents}
        rooms={rooms}
        myUserId={userId}
        selectedAgent={selectedAgent}
        selectedRoom={selectedRoom}
        onSelect={(a) => { setSelectedAgent(a); setSelectedRoom(null); setSidebarOpen(false); }}
        onSelectRoom={handleSelectRoom}
        findDmRoom={findDmRoom}
        onSignOut={() => { clearStoredSession(); navigate("/login", { replace: true }); }}
        open={sidebarOpen}
        onReloadAgents={loadAgents}
        agentsLoading={agentsLoading}
        agentError={agentError}
        onNewGroup={() => setShowNewGroupModal(true)}
        groupRooms={groupRooms}
        verifyStatus={verifyStatus}
        onShowVerification={() => setShowVerification(true)}
        unreadCounts={unreadCounts}
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
        ) : selectedRoom ? (
          <Chat
            client={client}
            myUserId={userId}
            agent={null}
            room={selectedRoom}
            onBack={() => { setSelectedRoom(null); setSidebarOpen(true); }}
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
                <p className="dim">Select an agent or group to start talking.</p>
                <p className="dim mono" style={{ fontSize: 11, marginTop: 8 }}>
                  {agents.length} agents · {groupRooms.length} groups
                </p>
              </>
            )}
          </div>
        )}
      </main>
      {showNewGroupModal && (
        <NewGroupModal
          agents={agents}
          myUserId={userId}
          onClose={() => setShowNewGroupModal(false)}
          onCreate={createGroup}
        />
      )}
      {showVerification && client && (
        <Verification
          client={client}
          onClose={() => setShowVerification(false)}
        />
      )}
      {showSearchModal && client && (
        <SearchModal
          client={client}
          onSelectResult={(room) => {
            setSelectedRoom(room);
            setSelectedAgent(null);
            setSidebarOpen(false);
          }}
          onClose={() => setShowSearchModal(false)}
        />
      )}
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
  connectionBanner: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    background: "var(--warning)",
    color: "var(--bg-0)",
    padding: "8px 16px",
    textAlign: "center",
    fontSize: 13,
    fontWeight: 600,
    zIndex: 1000,
  },
};
