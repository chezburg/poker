import { useState } from "react";

export default function PlayerView({ lobby, me, emit, code, showToast }) {
  const [raiseAmt, setRaiseAmt] = useState("");
  const [callAmt, setCallAmt] = useState("");
  const [transferAmt, setTransferAmt] = useState("");
  const [transferTarget, setTransferTarget] = useState(null);
  const [showCallInput, setShowCallInput] = useState(false);
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

  function handleCall() {
    const amt = parseInt(callAmt);
    if (!amt || amt <= 0) return showToast("Enter a valid amount", "error");
    const actual = Math.min(amt, me.chips);
    doAction("action:call", { amount: actual });
    setCallAmt("");
    setShowCallInput(false);
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

  return (
    <div className="page" style={{ paddingBottom: 24 }}>
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
          <span className="small">Pot: <strong style={{ color: "var(--gold)" }}>{pot.toLocaleString()}</strong></span>
        </div>
      </div>

      {/* Give Chips (Replaces Buy In) */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 600 }}>Give Chips</div>
          <button
            className="btn-green btn-sm"
            onClick={() => { setTransferTarget(transferTarget ? null : "select"); setShowRaiseInput(false); setShowCallInput(false); }}
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
              <div style={{ display: "flex", gap: 8 }}>
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
            )}
          </div>
        )}
      </div>

      {/* Call */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 600 }}>Call</div>
          <button
            className="btn-secondary btn-sm"
            onClick={() => { setShowCallInput(!showCallInput); setShowRaiseInput(false); setTransferTarget(null); }}
          >
            Enter amount
          </button>
        </div>
        {showCallInput && (
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="number"
              placeholder="Amount to call"
              value={callAmt}
              onChange={(e) => setCallAmt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCall()}
              style={{ flex: 1 }}
              autoFocus
              min={1}
              max={me.chips}
            />
            <button className="btn-secondary btn-sm" onClick={handleCall}>Call</button>
          </div>
        )}
        {showCallInput && me.chips > 0 && (
          <button
            className="btn-sm"
            style={{ background: "var(--red-bg)", color: "var(--red)", border: "1px solid var(--red)", borderColor: "#ef444433" }}
            onClick={() => {
              doAction("action:call", { amount: me.chips });
              setShowCallInput(false);
              setCallAmt("");
            }}
          >
            All In · {me.chips.toLocaleString()}
          </button>
        )}
      </div>

      {/* Raise */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 600 }}>Raise</div>
            {lobby.settings.raiseMustExceedBigBlind && (
              <div className="small">Min raise: {currentBlinds.bigBlind.toLocaleString()}</div>
            )}
          </div>
          <button
            className="btn-gold btn-sm"
            onClick={() => { setShowRaiseInput(!showRaiseInput); setShowCallInput(false); setTransferTarget(null); }}
          >
            Enter amount
          </button>
        </div>
        {showRaiseInput && (
          <div style={{ display: "flex", gap: 8 }}>
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
        )}
        {showRaiseInput && me.chips > 0 && (
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

      {/* Check / Fold */}
      <div className="btn-row">
        <button className="btn-secondary" onClick={() => { doAction("action:check"); showToast("Check"); }}>
          Check
        </button>
        <button
          className="btn-secondary"
          style={{ color: "var(--text3)" }}
          onClick={() => { doAction("action:fold"); showToast("Fold"); }}
        >
          Fold
        </button>
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
