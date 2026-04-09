import { useState } from "react";
import { navigate } from "../App.jsx";
import { saveSession } from "../utils/session.js";
import { safeFetch } from "../utils/api.js";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "";

export default function CreateLobby() {
  const [lobbyName, setLobbyName] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [settings, setSettings] = useState({
    startingChips: 1000,
    roundsUntilDoubleBlinds: 0,
    raiseMustExceedBigBlind: true,
    blindsMode: false,
    smallBlind: 10,
    bigBlind: 20,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function setSetting(key, value) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  async function handleCreate() {
    if (!lobbyName.trim()) return setError("Enter a lobby name");
    if (!playerName.trim()) return setError("Enter your name");
    setLoading(true);
    setError("");
    try {
      const data = await safeFetch(`${SERVER_URL}/api/lobbies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lobbyName, playerName, settings }),
      });

      const code = data.lobby.code;
      saveSession(code, data.playerId);

      // Give starting chips to creator via REST before navigating
      // Settings will be applied after socket connect
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
        <button className="btn-ghost" onClick={() => navigate("")}>← Back</button>
        <span style={{ fontWeight: 700 }}>Create Lobby</span>
        <div style={{ width: 60 }} />
      </div>

      <div className="page" style={{ paddingBottom: 100 }}>
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="field">
            <label>Lobby name</label>
            <input
              placeholder="Friday Night Poker"
              value={lobbyName}
              onChange={(e) => setLobbyName(e.target.value)}
              maxLength={32}
            />
          </div>
          <div className="field">
            <label>Your name</label>
            <input
              placeholder="Your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              maxLength={20}
            />
          </div>
        </div>

        <div className="section-title">Chip Settings</div>
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <NumberField
            label="Starting chip count"
            value={settings.startingChips}
            onChange={(v) => setSetting("startingChips", v)}
            min={100} step={100}
          />
        </div>

        <div className="section-title">Rules</div>
        <div className="card" style={{ display: "flex", flexDirection: "column" }}>
          <NumberField
            label="Rounds until blinds double"
            sublabel="Set to 0 to disable"
            value={settings.roundsUntilDoubleBlinds}
            onChange={(v) => setSetting("roundsUntilDoubleBlinds", v)}
            min={0} step={1}
          />
          <hr className="divider" style={{ margin: "12px 0" }} />
          <ToggleRow
            label="Raise must meet minimum"
            sublabel="Minimum = Big Blind (or Small Blind if simple)"
            checked={settings.raiseMustExceedBigBlind}
            onChange={(v) => setSetting("raiseMustExceedBigBlind", v)}
          />
          <hr className="divider" />
          <ToggleRow
            label="Blinds mode"
            sublabel="Small blind / big blind rotation"
            checked={settings.blindsMode}
            onChange={(v) => setSetting("blindsMode", v)}
          />
          {settings.blindsMode && (
            <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
              <NumberField
                label="Small blind"
                value={settings.smallBlind}
                onChange={(v) => setSetting("smallBlind", v)}
                min={1} step={5}
              />
              <NumberField
                label="Big blind"
                value={settings.bigBlind}
                onChange={(v) => setSetting("bigBlind", v)}
                min={1} step={5}
              />
            </div>
          )}
        </div>

        {error && <div className="error-msg">{error}</div>}
      </div>

      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        padding: "12px 16px", background: "var(--bg2)",
        borderTop: "1px solid var(--border)",
      }}>
        <button className="btn-primary" onClick={handleCreate} disabled={loading}>
          {loading ? "Creating…" : "Create Lobby"}
        </button>
      </div>
    </div>
  );
}

function NumberField({ label, sublabel, value, onChange, min = 0, step = 1 }) {
  return (
    <div className="field">
      <label>{label}{sublabel && <span style={{ color: "var(--text3)", marginLeft: 6 }}>({sublabel})</span>}</label>
      <div className="number-input-row">
        <button onClick={() => onChange(Math.max(min, value - step))}>−</button>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value) || min)}
          min={min}
        />
        <button onClick={() => onChange(value + step)}>+</button>
      </div>
    </div>
  );
}

function ToggleRow({ label, sublabel, checked, onChange }) {
  return (
    <div className="toggle-row">
      <div>
        <div className="toggle-label">{label}</div>
        {sublabel && <div className="toggle-sub">{sublabel}</div>}
      </div>
      <label className="toggle-switch">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="toggle-slider" />
      </label>
    </div>
  );
}
