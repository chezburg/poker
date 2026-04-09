import { useState, useEffect } from "react";
import { navigate } from "../App.jsx";
import { saveSession, getSessionForLobby } from "../utils/session.js";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "";

export default function JoinLobby({ initialCode }) {
  const [code, setCode] = useState(initialCode || "");
  const [step, setStep] = useState(initialCode ? "lookup" : "code"); // code | lookup | name | rejoin
  const [lobby, setLobby] = useState(null);
  const [playerName, setPlayerName] = useState("");
  const [selectedExistingId, setSelectedExistingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialCode) lookupCode(initialCode.toUpperCase());
  }, []);

  async function lookupCode(c) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${SERVER_URL}/api/lobbies/${c.toUpperCase()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lobby not found");

      setLobby(data.lobby);
      setCode(c.toUpperCase());

      // Check for existing session
      const session = getSessionForLobby(c.toUpperCase());
      if (session) {
        setStep("rejoin");
      } else {
        setStep("name");
      }
    } catch (e) {
      setError(e.message);
      setStep("code");
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinNew() {
    if (!playerName.trim()) return setError("Enter your name");
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${SERVER_URL}/api/lobbies/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to join");
      saveSession(code, data.playerId);
      navigate(`game/${code}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRejoin(existingPlayerId) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${SERVER_URL}/api/lobbies/${code}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ existingPlayerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to rejoin");
      saveSession(code, existingPlayerId);
      navigate(`game/${code}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="header-bar">
        <button className="btn-ghost" onClick={() => {
          if (step === "code") navigate("");
          else { setStep("code"); setLobby(null); setError(""); }
        }}>← Back</button>
        <span style={{ fontWeight: 700 }}>Join Lobby</span>
        <div style={{ width: 60 }} />
      </div>

      <div className="page-center" style={{ justifyContent: "flex-start", paddingTop: 40 }}>
        <div style={{ width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Step 1: Enter code */}
          {step === "code" && (
            <>
              <div className="field">
                <label>Lobby code</label>
                <input
                  placeholder="XXXXX"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  maxLength={5}
                  style={{ textAlign: "center", fontSize: 24, fontWeight: 700, letterSpacing: "0.2em" }}
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && lookupCode(code)}
                />
              </div>
              {error && <div className="error-msg">{error}</div>}
              <button className="btn-primary" onClick={() => lookupCode(code)} disabled={loading || code.length < 4}>
                {loading ? "Looking up…" : "Find Lobby"}
              </button>
            </>
          )}

          {/* Step 2a: Rejoin or new player */}
          {step === "rejoin" && lobby && (
            <>
              <div style={{ textAlign: "center" }}>
                <h2>{lobby.name}</h2>
                <p className="muted" style={{ marginTop: 4 }}>{lobby.players.length} player{lobby.players.length !== 1 ? "s" : ""}</p>
              </div>
              <div className="card">
                <div className="section-title">Returning player?</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
                  {lobby.players.map((p) => (
                    <button
                      key={p.id}
                      className="btn-secondary"
                      style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "12px 14px",
                        background: selectedExistingId === p.id ? "var(--blue-bg)" : undefined,
                        borderColor: selectedExistingId === p.id ? "var(--blue)" : undefined,
                      }}
                      onClick={() => setSelectedExistingId(p.id)}
                    >
                      <span style={{ fontWeight: 600 }}>{p.name}</span>
                      <span className="small" style={{ color: "var(--gold)" }}>{p.chips.toLocaleString()} chips</span>
                    </button>
                  ))}
                </div>
                {selectedExistingId && (
                  <button className="btn-primary" onClick={() => handleRejoin(selectedExistingId)} disabled={loading}>
                    {loading ? "Rejoining…" : "Rejoin as selected player"}
                  </button>
                )}
              </div>
              <div style={{ textAlign: "center", color: "var(--text3)", fontSize: 13 }}>— or —</div>
              <button className="btn-secondary" style={{ width: "100%", padding: "13px" }} onClick={() => setStep("name")}>
                Join as new player
              </button>
              {error && <div className="error-msg">{error}</div>}
            </>
          )}

          {/* Step 2b: New player name */}
          {step === "name" && lobby && (
            <>
              <div style={{ textAlign: "center" }}>
                <h2>{lobby.name}</h2>
                <p className="muted" style={{ marginTop: 4 }}>{lobby.players.length} player{lobby.players.length !== 1 ? "s" : ""} in lobby</p>
              </div>
              <div className="field">
                <label>Your name</label>
                <input
                  placeholder="Your name"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  maxLength={20}
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleJoinNew()}
                />
              </div>
              {error && <div className="error-msg">{error}</div>}
              <button className="btn-primary" onClick={handleJoinNew} disabled={loading}>
                {loading ? "Joining…" : "Join Game"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
