import { useState, useRef } from "react";
import { navigate } from "../App.jsx";
import { clearSession } from "../utils/session.js";

export default function SettingsPanel({ lobby, me, emit, code, showToast }) {
  const [settings, setSettings] = useState({ ...lobby.settings });
  const [dirty, setDirty] = useState(false);
  const [chipAdjPlayer, setChipAdjPlayer] = useState(null);
  const [chipAdjAmt, setChipAdjAmt] = useState("");
  const [tableOrder, setTableOrder] = useState(lobby.orderedPlayers || lobby.settings.tableOrder || []);
  const [orderDirty, setOrderDirty] = useState(false);
  const [section, setSection] = useState("game"); // game | table | players

  // Drag-to-reorder state
  const dragIdx = useRef(null);
  const dragOver = useRef(null);

  const players = lobby.players;
  const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));

  function setSetting(key, value) {
    setSettings((s) => ({ ...s, [key]: value }));
    setDirty(true);
  }

  function saveSettings() {
    emit("settings:update", { code, settings });
    if (orderDirty) {
      emit("settings:update", { code, settings: { ...settings, tableOrder } });
    }
    setDirty(false);
    setOrderDirty(false);
    showToast("Settings saved");
  }

  function handleChipAdj(playerId, amount) {
    const amt = parseInt(amount);
    if (isNaN(amt)) return showToast("Enter a valid number", "error");
    emit("settings:give_chips", { code, playerId, amount: amt });
    setChipAdjPlayer(null);
    setChipAdjAmt("");
    showToast(`Chips adjusted`);
  }

  // Drag reorder
  function onDragStart(e, idx) {
    dragIdx.current = idx;
    e.dataTransfer.effectAllowed = "move";
  }
  function onDragEnter(idx) { dragOver.current = idx; }
  function onDragEnd() {
    if (dragIdx.current === null || dragOver.current === null) return;
    const newOrder = [...tableOrder];
    const [moved] = newOrder.splice(dragIdx.current, 1);
    newOrder.splice(dragOver.current, 0, moved);
    setTableOrder(newOrder);
    setOrderDirty(true);
    dragIdx.current = null;
    dragOver.current = null;
  }

  // Touch-based reorder for mobile
  const touchStartY = useRef(null);
  const touchIdx = useRef(null);

  function onTouchStart(e, idx) {
    touchIdx.current = idx;
    touchStartY.current = e.touches[0].clientY;
  }
  function onTouchEnd(e, idx) {
    touchIdx.current = null;
    touchStartY.current = null;
  }

  function moveUp(idx) {
    if (idx === 0) return;
    const newOrder = [...tableOrder];
    [newOrder[idx - 1], newOrder[idx]] = [newOrder[idx], newOrder[idx - 1]];
    setTableOrder(newOrder);
    setOrderDirty(true);
  }
  function moveDown(idx) {
    if (idx === tableOrder.length - 1) return;
    const newOrder = [...tableOrder];
    [newOrder[idx + 1], newOrder[idx]] = [newOrder[idx], newOrder[idx + 1]];
    setTableOrder(newOrder);
    setOrderDirty(true);
  }

  function handleLeave() {
    clearSession(code);
    navigate("");
  }

  const orderedPlayerObjs = tableOrder.map((id) => playerMap[id]).filter(Boolean);
  const unordered = players.filter((p) => !tableOrder.includes(p.id));

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Sub-tabs */}
      <div style={{ display: "flex", background: "var(--bg2)", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        {[["game", "Game"], ["table", "Table Order"], ["players", "Players"]].map(([id, label]) => (
          <button
            key={id}
            className={`tab-btn ${section === id ? "active" : ""}`}
            onClick={() => setSection(id)}
            style={{ fontSize: 12, padding: "11px 4px" }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="page" style={{ paddingBottom: 100 }}>
        {/* ── Game Settings ── */}
        {section === "game" && (
          <>
            <div className="section-title">Chips</div>
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <NumberField
                label="Starting chip count"
                sublabel="New players only"
                value={settings.startingChips}
                onChange={(v) => setSetting("startingChips", v)}
                min={100} step={100}
              />
              <NumberField
                label="Buy-in amount"
                value={settings.buyInAmount}
                onChange={(v) => setSetting("buyInAmount", v)}
                min={10} step={10}
              />
            </div>

            <div className="section-title">Buy-in Doubling</div>
            <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <NumberField
                label="Rounds until buy-in doubles"
                sublabel="0 = disabled"
                value={settings.roundsUntilDoubleBuyIn}
                onChange={(v) => setSetting("roundsUntilDoubleBuyIn", v)}
                min={0} step={1}
              />
              <div className="small" style={{ color: "var(--text3)" }}>
                Current buy-in: <strong style={{ color: "var(--gold)" }}>{lobby.currentBuyInAmount?.toLocaleString()}</strong>
                {settings.roundsUntilDoubleBuyIn > 0 && (
                  <> · doubles every {settings.roundsUntilDoubleBuyIn} round{settings.roundsUntilDoubleBuyIn !== 1 ? "s" : ""}</>
                )}
              </div>
            </div>

            <div className="section-title">Rules</div>
            <div className="card" style={{ display: "flex", flexDirection: "column" }}>
              <ToggleRow
                label="Raise must exceed buy-in"
                checked={settings.raiseMustExceedBuyIn}
                onChange={(v) => setSetting("raiseMustExceedBuyIn", v)}
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

            <div className="small" style={{ textAlign: "center", color: "var(--text3)" }}>
              Lobby code: <strong style={{ color: "var(--text)", fontFamily: "monospace", letterSpacing: "0.1em" }}>{code}</strong>
              {" · "}Round {lobby.round}
            </div>
          </>
        )}

        {/* ── Table Order ── */}
        {section === "table" && (
          <>
            <div className="muted" style={{ fontSize: 13 }}>
              Set the seating order around the table. This determines blind rotation.
            </div>
            <div className="card" style={{ padding: "4px 16px" }}>
              {[...orderedPlayerObjs, ...unordered].map((p, idx) => (
                <div
                  key={p.id}
                  className="drag-row"
                  draggable
                  onDragStart={(e) => onDragStart(e, idx)}
                  onDragEnter={() => onDragEnter(idx)}
                  onDragEnd={onDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <span className="drag-icon">☰</span>
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                    {p.id === me.id && <span style={{ color: "var(--blue)", fontSize: 12, marginLeft: 6 }}>(you)</span>}
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    <button
                      className="btn-ghost btn-sm"
                      style={{ padding: "4px 10px", fontSize: 16 }}
                      onClick={() => moveUp(idx)}
                      disabled={idx === 0}
                    >↑</button>
                    <button
                      className="btn-ghost btn-sm"
                      style={{ padding: "4px 10px", fontSize: 16 }}
                      onClick={() => moveDown(idx)}
                      disabled={idx === [...orderedPlayerObjs, ...unordered].length - 1}
                    >↓</button>
                  </div>
                </div>
              ))}
            </div>
            {orderDirty && (
              <div className="small" style={{ color: "var(--gold)", textAlign: "center" }}>
                Unsaved order changes
              </div>
            )}
          </>
        )}

        {/* ── Players (chip adjustments) ── */}
        {section === "players" && (
          <>
            <div className="muted" style={{ fontSize: 13 }}>
              Manually adjust any player's chip count. Use positive values to add chips, negative to remove.
            </div>
            <div className="card" style={{ padding: "4px 16px" }}>
              {players.map((p) => (
                <div key={p.id}>
                  <div className="player-row">
                    <div className="player-avatar">{p.name[0].toUpperCase()}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{p.name}{p.id === me.id ? " (you)" : ""}</div>
                      <div className="small">Chips: <strong style={{ color: "var(--gold)" }}>{p.chips.toLocaleString()}</strong></div>
                    </div>
                    <button
                      className="btn-secondary btn-sm"
                      onClick={() => setChipAdjPlayer(chipAdjPlayer === p.id ? null : p.id)}
                    >
                      Adjust
                    </button>
                  </div>
                  {chipAdjPlayer === p.id && (
                    <div style={{ padding: "8px 0 12px", display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <input
                          type="number"
                          placeholder="e.g. 500 or -200"
                          value={chipAdjAmt}
                          onChange={(e) => setChipAdjAmt(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleChipAdj(p.id, chipAdjAmt)}
                          style={{ flex: 1 }}
                          autoFocus
                        />
                        <button className="btn-secondary btn-sm" onClick={() => handleChipAdj(p.id, chipAdjAmt)}>
                          Apply
                        </button>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {[100, 500, 1000, -100, -500].map((quick) => (
                          <button
                            key={quick}
                            className="btn-sm btn-secondary"
                            style={{
                              flex: "none",
                              color: quick < 0 ? "var(--red)" : "var(--green)",
                              fontSize: 12,
                            }}
                            onClick={() => handleChipAdj(p.id, quick)}
                          >
                            {quick > 0 ? "+" : ""}{quick}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Sticky save + leave */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0,
        padding: "10px 16px", background: "var(--bg2)",
        borderTop: "1px solid var(--border)",
        display: "flex", gap: 10,
      }}>
        {(dirty || orderDirty) && (
          <button className="btn-primary" style={{ flex: 1 }} onClick={saveSettings}>
            Save Settings
          </button>
        )}
        {!dirty && !orderDirty && (
          <button
            className="btn-secondary"
            style={{ flex: 1, color: "var(--text3)" }}
            onClick={handleLeave}
          >
            Leave Lobby
          </button>
        )}
      </div>
    </div>
  );
}

function NumberField({ label, sublabel, value, onChange, min = 0, step = 1 }) {
  return (
    <div className="field">
      <label>
        {label}
        {sublabel && <span style={{ color: "var(--text3)", marginLeft: 6 }}>({sublabel})</span>}
      </label>
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
