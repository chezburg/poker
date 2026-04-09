import { useState } from "react";

export default function TableView({ lobby, me, emit, code, showToast }) {
  const [showWinModal, setShowWinModal] = useState(false);
  const [splitIds, setSplitIds] = useState([]);

  const orderedPlayers = getOrderedPlayers(lobby);
  const blinds = lobby.blinds;
  const pot = lobby.pot;

  function handleNextRound() {
    emit("action:next_round", { code });
    showToast("Next round started");
  }

  function handleWinPot(playerId) {
    emit("action:win_pot", { code, playerId });
    setShowWinModal(false);
    showToast("Pot awarded!");
  }

  function handleSplitPot() {
    if (splitIds.length < 2) return showToast("Select at least 2 players", "error");
    emit("action:split_pot", { code, playerIds: splitIds });
    setShowWinModal(false);
    setSplitIds([]);
    showToast("Pot split!");
  }

  function toggleSplit(id) {
    setSplitIds((ids) => ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]);
  }

  return (
    <div className="page" style={{ paddingBottom: 24 }}>
      {/* Pot */}
      <div className="pot-box">
        <div className="chip-label">Pot</div>
        <div className="chip-count big">{pot.toLocaleString()}</div>
        {pot > 0 && (
          <button
            className="btn-sm btn-gold"
            style={{ marginTop: 8 }}
            onClick={() => { setShowWinModal(true); setSplitIds([]); }}
          >
            Award Pot
          </button>
        )}
      </div>

      {/* Blinds info */}
      {lobby.settings.blindsMode && blinds && (
        <div className="card" style={{ display: "flex", gap: 12, justifyContent: "space-around" }}>
          <BlindInfo label="Dealer" name={blinds.dealer?.name} color="var(--gold)" />
          <BlindInfo label={`SB · ${lobby.settings.smallBlind}`} name={blinds.smallBlind?.name} color="var(--blue)" />
          <BlindInfo label={`BB · ${lobby.settings.bigBlind}`} name={blinds.bigBlind?.name} color="var(--purple)" />
        </div>
      )}

      {/* Players */}
      <div className="card" style={{ padding: "4px 16px" }}>
        <div className="section-title" style={{ padding: "12px 0 4px" }}>Players</div>
        {orderedPlayers.map((p, i) => {
          const isDealer = blinds?.dealer?.id === p.id;
          const isSB = blinds?.smallBlind?.id === p.id;
          const isBB = blinds?.bigBlind?.id === p.id;
          const isMe = p.id === me.id;

          return (
            <div key={p.id} className={`player-row ${p.connected ? "" : "player-offline"}`}>
              <div className="player-avatar">{p.name[0].toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span className={`player-name ${isMe ? "you" : ""}`}>
                    {p.name}{isMe ? " (you)" : ""}
                  </span>
                  {lobby.settings.blindsMode && isDealer && <span className="badge badge-dealer">D</span>}
                  {lobby.settings.blindsMode && isSB && <span className="badge badge-sb">SB</span>}
                  {lobby.settings.blindsMode && isBB && <span className="badge" style={{ background: "var(--purple)", color: "#fff", fontSize: 10, padding: "2px 6px", borderRadius: 99 }}>BB</span>}
                  {!p.connected && <span className="badge badge-offline">away</span>}
                </div>
                <div className="small">Bought in: {p.totalBoughtIn.toLocaleString()}</div>
              </div>
              <div className="player-chips">{p.chips.toLocaleString()}</div>
            </div>
          );
        })}
      </div>

      {/* Next round */}
      <button className="btn-primary" onClick={handleNextRound} style={{ marginTop: 4 }}>
        Next Round →
      </button>
      <div className="small" style={{ textAlign: "center" }}>
        Buy-in this round: {lobby.currentBuyInAmount.toLocaleString()} chips
      </div>

      {/* Award pot modal */}
      {showWinModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowWinModal(false)}>
          <div className="modal">
            <div className="modal-handle" />
            <div className="modal-title">Award pot · {pot.toLocaleString()}</div>

            <div>
              <div className="section-title">Winner takes all</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {orderedPlayers.map((p) => (
                  <button
                    key={p.id}
                    className="btn-secondary"
                    style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px" }}
                    onClick={() => handleWinPot(p.id)}
                  >
                    <span style={{ fontWeight: 600 }}>{p.name}{p.id === me.id ? " (you)" : ""}</span>
                    <span style={{ color: "var(--gold)" }}>+{pot.toLocaleString()}</span>
                  </button>
                ))}
              </div>
            </div>

            <hr className="divider" />

            <div>
              <div className="section-title">Split pot</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                {orderedPlayers.map((p) => (
                  <button
                    key={p.id}
                    className="btn-secondary"
                    style={{
                      display: "flex", justifyContent: "space-between", padding: "12px 14px",
                      background: splitIds.includes(p.id) ? "var(--blue-bg)" : undefined,
                      borderColor: splitIds.includes(p.id) ? "var(--blue)" : undefined,
                    }}
                    onClick={() => toggleSplit(p.id)}
                  >
                    <span style={{ fontWeight: 600 }}>{p.name}</span>
                    {splitIds.includes(p.id) && (
                      <span style={{ color: "var(--gold)" }}>
                        +{Math.floor(pot / splitIds.length).toLocaleString()}
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {splitIds.length >= 2 && (
                <button className="btn-gold" style={{ width: "100%" }} onClick={handleSplitPot}>
                  Split between {splitIds.length} players
                </button>
              )}
            </div>

            <button className="btn-ghost" style={{ width: "100%" }} onClick={() => setShowWinModal(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function BlindInfo({ label, name, color }) {
  return (
    <div style={{ textAlign: "center", flex: 1 }}>
      <div style={{ fontSize: 11, color: "var(--text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 700, color: color || "var(--text)" }}>{name || "—"}</div>
    </div>
  );
}

function getOrderedPlayers(lobby) {
  const order = lobby.orderedPlayers || lobby.settings?.tableOrder || [];
  if (!order.length) return lobby.players;
  const map = Object.fromEntries(lobby.players.map((p) => [p.id, p]));
  const ordered = order.map((id) => map[id]).filter(Boolean);
  const extra = lobby.players.filter((p) => !order.includes(p.id));
  return [...ordered, ...extra];
}
