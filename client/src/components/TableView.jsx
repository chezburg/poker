import { useState } from "react";

export default function TableView({ lobby, me, emit, code, showToast }) {
  const [showWinModal, setShowWinModal] = useState(false);
  const [splitIds, setSplitIds] = useState([]);

  const orderedPlayers = getOrderedPlayers(lobby);
  const currentBlinds = lobby.currentBlinds || { smallBlind: lobby.settings.smallBlind, bigBlind: lobby.settings.bigBlind };
  const blinds = lobby.blinds;
  const pot = lobby.pot;
  const pots = lobby.pots || [];

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
      {/* Action Buttons */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        {pot > 0 && (
          <button
            className="btn-gold"
            style={{ flex: 1 }}
            onClick={() => { setShowWinModal(true); setSplitIds([]); }}
          >
            Award Pot ({pot.toLocaleString()})
          </button>
        )}
        <button className="btn-primary" onClick={handleNextRound} style={{ flex: 1 }}>
          Force Next Round →
        </button>
      </div>
      <div className="small" style={{ textAlign: "center" }}>
        Blinds: {currentBlinds.smallBlind} / {currentBlinds.bigBlind}
      </div>

      {/* Award pot modal */}
      {showWinModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowWinModal(false)}>
          <div className="modal">
            <div className="modal-handle" />
            <div className="modal-title">
              {pots.length > 1 ? `Award Pots · ${pot.toLocaleString()}` : `Award Pot · ${pot.toLocaleString()}`}
            </div>

            {pots.length > 1 && (
              <div style={{ marginBottom: 16 }}>
                <div className="section-title">Pots to be awarded</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {pots.map((p, i) => (
                    <div key={i} style={{ 
                      background: "var(--bg3)", padding: "8px 12px", borderRadius: 8, fontSize: 13,
                      display: "flex", justifyContent: "space-between", border: "1px solid var(--border)"
                    }}>
                      <span style={{ color: "var(--text3)", fontWeight: 600 }}>{i === 0 ? "Main Pot" : `Side Pot ${i}`}</span>
                      <span style={{ color: "var(--gold)", fontWeight: 800 }}>{p.amount.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div className="section-title">Winner takes eligible pots</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {orderedPlayers.map((p) => {
                  const eligiblePotAmount = pots.length > 0 
                    ? pots.filter(pot => pot.eligible.includes(p.id)).reduce((sum, pot) => sum + pot.amount, 0)
                    : pot;
                  
                  if (eligiblePotAmount === 0) return null;

                  return (
                    <button
                      key={p.id}
                      className="btn-secondary"
                      style={{ display: "flex", flexDirection: "column", padding: "12px 14px", alignItems: "flex-start" }}
                      onClick={() => handleWinPot(p.id)}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", width: "100%" }}>
                        <span style={{ fontWeight: 600 }}>{p.name}{p.id === me.id ? " (you)" : ""}</span>
                        <span style={{ color: "var(--gold)" }}>+{eligiblePotAmount.toLocaleString()}</span>
                      </div>
                      {pots.length > 1 && (
                        <div style={{ fontSize: 10, color: "var(--text3)", marginTop: 2 }}>
                          Eligible for {pots.filter(pot => pot.eligible.includes(p.id)).length} of {pots.length} pots
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <hr className="divider" />

            <div>
              <div className="section-title">Split currently visible pots</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                {orderedPlayers.map((p) => {
                  const eligibleAmount = pots.length > 0 
                    ? pots.filter(pot => pot.eligible.includes(p.id)).reduce((sum, pot) => sum + pot.amount, 0)
                    : pot;
                  
                  return (
                    <button
                      key={p.id}
                      className="btn-secondary"
                      style={{
                        display: "flex", justifyContent: "space-between", padding: "12px 14px",
                        background: splitIds.includes(p.id) ? "var(--blue-bg)" : undefined,
                        borderColor: splitIds.includes(p.id) ? "var(--blue)" : undefined,
                        opacity: eligibleAmount === 0 && !splitIds.includes(p.id) ? 0.5 : 1
                      }}
                      onClick={() => toggleSplit(p.id)}
                    >
                      <span style={{ fontWeight: 600 }}>{p.name}</span>
                      {splitIds.includes(p.id) ? (
                        <span style={{ color: "var(--gold)" }}>
                          +{(pots.length > 0 
                            ? pots.filter(pot => pot.eligible.includes(p.id)).reduce((sum, pot) => {
                                const splitParticipants = splitIds.filter(id => pot.eligible.includes(id));
                                return sum + (splitParticipants.length > 0 ? Math.floor(pot.amount / splitParticipants.length) : 0);
                              }, 0)
                            : Math.floor(pot / Math.max(1, splitIds.length))
                          ).toLocaleString()}
                        </span>
                      ) : (
                        eligibleAmount > 0 && <span style={{ fontSize: 10, color: "var(--text3)" }}>Eligible</span>
                      )}
                    </button>
                  );
                })}
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
