import { useState } from "react";

export default function PlayerView({ lobby, me, emit, code, showToast }) {
  const [raiseAmt, setRaiseAmt] = useState("");
  const [callAmt, setCallAmt] = useState("");
  const [showCallInput, setShowCallInput] = useState(false);
  const [showRaiseInput, setShowRaiseInput] = useState(false);
  const [showCashOut, setShowCashOut] = useState(false);

  const buyIn = lobby.currentBuyInAmount;
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
          {isSB && <span className="badge badge-sb">Small Blind · {lobby.settings.smallBlind}</span>}
          {isBB && <span className="badge" style={{ background: "var(--purple)", color: "#fff", opacity: 0.9 }}>Big Blind · {lobby.settings.bigBlind}</span>}
        </div>
      )}

      {/* Chip count */}
      <div className="card" style={{ textAlign: "center", padding: "24px 16px" }}>
        <div className="chip-label">Your chips</div>
        <div className="chip-count big" style={{ marginTop: 4 }}>{me.chips.toLocaleString()}</div>
        <div style={{ marginTop: 8, display: "flex", gap: 16, justifyContent: "center" }}>
          <span className="small">Bought in: <strong style={{ color: "var(--text)" }}>{me.totalBoughtIn.toLocaleString()}</strong></span>
          <span className="small">Pot: <strong style={{ color: "var(--gold)" }}>{pot.toLocaleString()}</strong></span>
        </div>
      </div>

      {/* Buy In */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 600 }}>Buy In</div>
            <div className="small">{buyIn.toLocaleString()} chips</div>
          </div>
          <button
            className="btn-green btn-sm"
            onClick={() => doAction("action:buyin")}
          >
            + {buyIn.toLocaleString()}
          </button>
        </div>
      </div>

      {/* Call */}
      <div className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontWeight: 600 }}>Call</div>
          <button
            className="btn-secondary btn-sm"
            onClick={() => { setShowCallInput(!showCallInput); setShowRaiseInput(false); }}
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
            {lobby.settings.raiseMustExceedBuyIn && (
              <div className="small">Must exceed {buyIn.toLocaleString()}</div>
            )}
          </div>
          <button
            className="btn-gold btn-sm"
            onClick={() => { setShowRaiseInput(!showRaiseInput); setShowCallInput(false); }}
          >
            Enter amount
          </button>
        </div>
        {showRaiseInput && (
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="number"
              placeholder={lobby.settings.raiseMustExceedBuyIn ? `> ${buyIn}` : "Amount"}
              value={raiseAmt}
              onChange={(e) => setRaiseAmt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRaise()}
              style={{ flex: 1 }}
              autoFocus
              min={lobby.settings.raiseMustExceedBuyIn ? buyIn + 1 : 1}
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
