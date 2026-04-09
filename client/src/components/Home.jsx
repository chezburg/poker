import { navigate } from "../App.jsx";

export default function Home() {
  return (
    <div className="page-center">
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <div className="logo">poker<span>chips</span></div>
        <p className="muted" style={{ marginTop: 6 }}>Manage chips for your in-person game</p>
      </div>

      <div style={{ width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 12 }}>
        <button className="btn-primary" style={{ padding: "16px" }} onClick={() => navigate("create")}>
          Create Lobby
        </button>
        <button className="btn-secondary" style={{ padding: "16px", width: "100%" }} onClick={() => navigate("join")}>
          Join Lobby
        </button>
      </div>

      <p className="small" style={{ marginTop: 8, textAlign: "center" }}>
        Everyone joins from their own phone
      </p>
    </div>
  );
}
