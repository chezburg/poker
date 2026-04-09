export default function ActionLog({ lobby }) {
  const log = lobby.actionLog || [];

  function fmtTime(ts) {
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  function actionColor(action) {
    if (action === "starting chips") return "var(--blue)";
    if (action.includes("gave")) return "var(--green)";
    if (action === "cash-out") return "var(--red)";
    if (action === "raise") return "var(--gold)";
    if (action === "won pot" || action === "split pot") return "var(--green)";
    if (action === "fold") return "var(--text3)";
    if (action === "all-in call") return "var(--red)";
    return "var(--text2)";
  }

  if (log.length === 0) {
    return (
      <div className="page-center" style={{ justifyContent: "flex-start", paddingTop: 60 }}>
        <div style={{ color: "var(--text3)", fontSize: 14 }}>No actions yet</div>
      </div>
    );
  }

  return (
    <div className="page" style={{ paddingBottom: 24 }}>
      <div className="card" style={{ padding: "4px 16px" }}>
        {log.map((entry) => (
          <div key={entry.id} className="log-item">
            <div style={{ minWidth: 44, color: "var(--text3)", fontSize: 12, paddingTop: 1, flexShrink: 0 }}>
              R{entry.round}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <span style={{ fontWeight: 600, color: "var(--text)" }}>{entry.playerName}</span>
              {" "}
              <span style={{ color: actionColor(entry.action) }}>{entry.action}</span>
              {entry.amount != null && (
                <span style={{ color: "var(--gold)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                  {" "}{entry.amount.toLocaleString()}
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: "var(--text3)", flexShrink: 0, paddingTop: 2 }}>
              {fmtTime(entry.ts)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
