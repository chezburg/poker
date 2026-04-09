import { useState, useEffect, useCallback } from "react";
import { useSocket } from "../hooks/useSocket.js";
import { getSessionForLobby, saveSession, clearSession } from "../utils/session.js";
import { safeFetch } from "../utils/api.js";
import { navigate } from "../App.jsx";
import PlayerView from "./PlayerView.jsx";
import TableView from "./TableView.jsx";
import SettingsPanel from "./SettingsPanel.jsx";
import ActionLog from "./ActionLog.jsx";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "";

export default function Game({ code }) {
  const { socket, connected, emit, on } = useSocket();
  const [lobby, setLobby] = useState(null);
  const [playerId, setPlayerId] = useState(null);
  const [tab, setTab] = useState("me");
  const [error, setError] = useState("");
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);

  // Show a temporary toast message
  const showToast = useCallback((msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

  // Init: get player id from session, fetch lobby state, then join socket room
  useEffect(() => {
    if (!code) { navigate(""); return; }
    const session = getSessionForLobby(code);
    if (!session) { navigate(`join/${code}`); return; }
    setPlayerId(session.playerId);

    async function init() {
      try {
        const data = await safeFetch(`${SERVER_URL}/api/lobbies/${code}`);
        setLobby(data.lobby);
        setLoading(false);
      } catch (e) {
        setError(e.message);
        setLoading(false);
      }
    }
    init();
  }, [code]);

  // Join socket room once connected and we have playerId
  useEffect(() => {
    if (!connected || !code || !playerId) return;
    emit("join:lobby", { code, playerId });
  }, [connected, code, playerId, emit]);

  // Listen for lobby updates
  useEffect(() => {
    const off1 = on("lobby:update", (updatedLobby) => setLobby(updatedLobby));
    const off2 = on("lobby:state", (updatedLobby) => setLobby(updatedLobby));
    const off3 = on("error", (msg) => showToast(msg, "error"));
    return () => { off1(); off2(); off3(); };
  }, [on, showToast]);

  // New players joining (not creator) get starting chips on first join via server
  // No client-side chip seeding needed

  if (loading) return <LoadingScreen />;
  if (error) return <ErrorScreen error={error} />;
  if (!lobby) return <LoadingScreen />;

  const me = lobby.players?.find((p) => p.id === playerId);
  if (!me) {
    clearSession(code);
    navigate(`join/${code}`);
    return null;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <div className="header-bar">
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>{lobby.name}</span>
          <span style={{ fontSize: 11, color: "var(--text3)", fontFamily: "monospace", letterSpacing: "0.08em" }}>
            {code}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", marginRight: 8 }}>
            <span style={{ fontSize: 10, color: "var(--text3)", textTransform: "uppercase", fontWeight: 700 }}>Pot</span>
            <span style={{ color: "var(--gold)", fontWeight: 800, fontSize: 16 }}>{lobby.pot.toLocaleString()}</span>
          </div>
          <span className="round-badge">Round {lobby.round}</span>
          <div className={connected ? "connected-dot" : "disconnected-dot"} title={connected ? "Connected" : "Reconnecting…"} />
        </div>
      </div>

      {/* Tab bar */}
      <div className="tab-bar">
        {[
          { id: "me", label: "My Chips" },
          { id: "table", label: "Table" },
          { id: "log", label: "Log" },
          { id: "settings", label: "Settings" },
        ].map((t) => (
          <button key={t.id} className={`tab-btn ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {tab === "me" && <PlayerView lobby={lobby} me={me} emit={emit} code={code} showToast={showToast} />}
        {tab === "table" && <TableView lobby={lobby} me={me} emit={emit} code={code} showToast={showToast} />}
        {tab === "log" && <ActionLog lobby={lobby} />}
        {tab === "settings" && <SettingsPanel lobby={lobby} me={me} emit={emit} code={code} showToast={showToast} />}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: toast.type === "error" ? "var(--red)" : "var(--bg3)",
          color: "#fff", padding: "10px 20px", borderRadius: 99,
          fontSize: 14, fontWeight: 600, whiteSpace: "nowrap",
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)", zIndex: 200,
          border: "1px solid var(--border)",
        }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="page-center">
      <div style={{ color: "var(--text3)", fontSize: 15 }}>Loading…</div>
    </div>
  );
}

function ErrorScreen({ error }) {
  return (
    <div className="page-center">
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ color: "var(--red)", fontSize: 15 }}>{error}</div>
        <button className="btn-secondary" onClick={() => navigate("")}>Go home</button>
      </div>
    </div>
  );
}
