import { useState } from "react";

export default function PlayerView({ lobby, me, emit, code, showToast }) {
  const [raiseAmt, setRaiseAmt] = useState("");
  const [transferAmt, setTransferAmt] = useState("");
  const [transferTarget, setTransferTarget] = useState(null);
  const [showRaiseInput, setShowRaiseInput] = useState(false);
  const [showCashOut, setShowCashOut] = useState(false);

  const currentBlinds = lobby.currentBlinds || { smallBlind: lobby.settings.smallBlind, bigBlind: lobby.settings.bigBlind };
  const pot = lobby.pot;

  function doAction(event, data = {}) {
    emit(event, { code, playerId: me.id, ...data });
  }

  function handleRaise() {
    const amt = parseInt(raiseAmt);
    if (!amt || amt <= 0) return showToast("Enter a valid amount", "error");
    if (amt > me.chips) return showToast("Not enough chips", "error");
    doAction("action:raise", { amount: amt });
    setRaiseAmt("");
    setShowRaiseInput(false);
  }

  function handleTransfer() {
    const amt = parseInt(transferAmt);
    if (!amt || amt <= 0) return showToast("Enter a valid amount", "error");
    if (amt > me.chips) return showToast("Not enough chips", "error");
    if (!transferTarget) return showToast("Select a player", "error");

    emit("action:transfer_chips", { code, fromPlayerId: me.id, toPlayerId: transferTarget.id, amount: amt });
    setTransferAmt("");
    setTransferTarget(null);
    showToast(`Gave ${amt.toLocaleString()} chips to ${transferTarget.name}`);
  }

  const maxContribution = Math.max(0, ...Object.values(lobby.contributions || {}));
  const myContribution = lobby.contributions?.[me.id] || 0;
  const amountToCall = maxContribution - myContribution;

  function handleCheckOrCall() {
    if (amountToCall > 0) {
      const actual = Math.min(amountToCall, me.chips);
      doAction("action:call", { amount: actual });
      showToast(actual < amountToCall ? "All In!" : `Called ${actual.toLocaleString()}`);
    } else {
      doAction("action:check");
      showToast("Check");
    }
  }

  function handleCashOut() {
    doAction("action:cashout");
    setShowCashOut(false);
    showToast(`Cashed out ${me.chips.toLocaleString()} chips`);
  }

  const blinds = lobby.blinds;
  const isDealer = blinds?.dealer?.id === me.id;
  const isSB = blinds?.smallBlind?.id === me.id;
  const isBB = blinds?.bigBlind?.id === me.id;

  const isMyTurn = lobby.currentTurn === me.id;
  const currentPlayer = lobby.players.find(p => p.id === lobby.currentTurn);

  return (
    <div className="page" style={{ paddingBottom: 24 }}>
      {/* Turn indicator */}
      {lobby.phase === "waiting" ? (
        <div className="card" style={{ textAlign: "center", padding: "12px", background: "var(--bg2)", borderColor: "var(--border)" }}>
          <div className="small">Waiting for game to start…</div>
        </div>
      ) : (
        <div className="card" style={{ 
          background: isMyTurn ? "var(--blue-bg)" : "var(--bg2)", 
          borderColor: isMyTurn ? "var(--blue)" : "var(--border)",
          textAlign: "center",
          padding: "12px"
        }}>
          {isMyTurn ? (
            <div style={{ color: "var(--blue)", fontWeight: 700 }}>★ Your Turn</div>
          ) : (
            <div className="small">Waiting for <strong>{currentPlayer?.name || "someone"}</strong>…</div>
          )}
        </div>
      )}

      {/* Blind badges */}
      {lobby.settings.blindsMode && blinds && (isDealer || isSB || isBB) && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {isDealer && <span className="badge badge-dealer">Dealer</span>}
          {isSB && <span className="badge badge-sb">Small Blind · {currentBlinds.smallBlind}</span>}
          {isBB && <span className="badge" style={{ background: "var(--purple)", color: "#fff", opacity: 0.9 }}>Big Blind · {currentBlinds.bigBlind}</span>}
        </div>
      )}

      {/* Chip count */}
      <div className="card" style={{ textAlign: "center", padding: "24px 16px" }}>
        <div className="chip-label">Your chips</div>
        <div className="chip-count big" style={{ marginTop: 4 }}>{me.chips.toLocaleString()}</div>
        <div style={{ marginTop: 8, display: "flex", gap: 16, justifyContent: "center" }}>
          <span className="small">Starting chips: <strong style={{ color: "var(--text)" }}>{lobby.settings.startingChips.toLocaleString()}</strong></span>
        </div>
      </div>

      {/* Give Chips (Replaces Buy In) */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 600 }}>Give Chips</div>
          <button
            className="btn-green btn-sm"
            onClick={() => { setTransferTarget(transferTarget ? null : "select"); setShowRaiseInput(false); }}
          >
            Send chips…
          </button>
        </div>
        
        {transferTarget && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {lobby.players.filter(p => p.id !== me.id).map(p => (
                <button 
                  key={p.id}
                  className={`btn-sm ${transferTarget?.id === p.id ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setTransferTarget(p)}
                >
                  {p.name}
                </button>
              ))}
            </div>
            
            {transferTarget !== "select" && (
              <>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type="number"
                    placeholder={`Amount to give ${transferTarget.name}`}
                    value={transferAmt}
                    onChange={(e) => setTransferAmt(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleTransfer()}
                    style={{ flex: 1 }}
                    autoFocus
                  />
                  <button className="btn-green btn-sm" onClick={handleTransfer}>Give</button>
                </div>
                <div style={{ padding: "8px 4px" }}>
                <input
                  type="range"
                  min="1"
                  max={me.chips}
                  step="5"
                  value={transferAmt || 0}
                  onChange={(e) => setTransferAmt(e.target.value)}
                  style={{ width: "100%", accentColor: "var(--green)" }}
                />

                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text3)", marginTop: 4 }}>
                    <span>1</span>
                    <span>{me.chips.toLocaleString()}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Raise */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10, opacity: (!isMyTurn || lobby.phase === "waiting") ? 0.6 : 1 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 600 }}>Raise</div>
            {lobby.settings.raiseMustExceedBigBlind && (
              <div className="small">Min raise: {currentBlinds.bigBlind.toLocaleString()}</div>
            )}
          </div>
          <button
            className="btn-gold btn-sm"
            onClick={() => { setShowRaiseInput(!showRaiseInput); setTransferTarget(null); }}
            disabled={!isMyTurn || lobby.phase === "waiting"}
          >
            Enter amount
          </button>
        </div>
        {showRaiseInput && isMyTurn && (
          <>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="number"
                placeholder={lobby.settings.raiseMustExceedBigBlind ? `min ${currentBlinds.bigBlind}` : "Amount"}
                value={raiseAmt}
                onChange={(e) => setRaiseAmt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleRaise()}
                style={{ flex: 1 }}
                autoFocus
                min={lobby.settings.raiseMustExceedBigBlind ? currentBlinds.bigBlind : 1}
                max={me.chips}
              />
              <button className="btn-gold btn-sm" onClick={handleRaise}>Raise</button>
            </div>
            <div style={{ padding: "8px 4px" }}>
              <input
                type="range"
                min={lobby.settings.raiseMustExceedBigBlind ? currentBlinds.bigBlind : 1}
                max={me.chips}
                step="5"
                value={raiseAmt || (lobby.settings.raiseMustExceedBigBlind ? currentBlinds.bigBlind : 1)}
                onChange={(e) => setRaiseAmt(e.target.value)}
                style={{ width: "100%", accentColor: "var(--gold)" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text3)", marginTop: 4 }}>
                <span>Min</span>
                <span>Max ({me.chips.toLocaleString()})</span>
              </div>
            </div>
          </>
        )}
        {showRaiseInput && isMyTurn && me.chips > 0 && (
          <button
            className="btn-sm"
            style={{ background: "var(--red-bg)", color: "var(--red)", border: "1px solid #ef444433" }}
            onClick={() => {
              doAction("action:raise", { amount: me.chips });
              setShowRaiseInput(false);
              setRaiseAmt("");
            }}
          >
            All In · {me.chips.toLocaleString()}
          </button>
        )}
      </div>

      {/* Check / Fold / Claim */}
      <div className="btn-row">
        <button 
          className={amountToCall > 0 ? "btn-primary" : "btn-secondary"} 
          onClick={handleCheckOrCall}
          disabled={!isMyTurn || lobby.phase === "waiting"}
        >
          {amountToCall > 0 ? (
            amountToCall >= me.chips ? `All In · ${me.chips.toLocaleString()}` : `Call · ${amountToCall.toLocaleString()}`
          ) : "Check"}
        </button>
        <button
          className="btn-secondary"
          style={{ color: "var(--text3)" }}
          onClick={() => { doAction("action:fold"); showToast("Fold"); }}
          disabled={!isMyTurn || lobby.phase === "waiting"}
        >
          Fold
        </button>
        {pot > 0 && (
          <button
            className="btn-gold"
            onClick={() => { doAction("action:win_pot"); showToast("Claimed pot!"); }}
          >
            Claim Pot
          </button>
        )}
      </div>

      {/* Cash Out */}
      <div style={{ marginTop: 8 }}>
        {!showCashOut ? (
          <button
            className="btn-ghost"
            style={{ width: "100%", color: "var(--text3)", fontSize: 13 }}
            onClick={() => setShowCashOut(true)}
          >
            Cash out…
          </button>
        ) : (
          <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div>
              <div style={{ fontWeight: 600 }}>Cash out {me.chips.toLocaleString()} chips?</div>
              <div className="small">This will set your chip count to 0</div>
            </div>
            <div className="btn-row">
              <button className="btn-secondary btn-sm" onClick={() => setShowCashOut(false)}>Cancel</button>
              <button className="btn-red btn-sm" onClick={handleCashOut}>Cash Out</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
