import { useState, useEffect } from "react";
import Home from "./components/Home.jsx";
import JoinLobby from "./components/JoinLobby.jsx";
import CreateLobby from "./components/CreateLobby.jsx";
import Game from "./components/Game.jsx";
import { getSessionForLobby } from "./utils/session.js";

// Simple hash-based router: #/, #/join, #/join/CODE, #/game/CODE
function parseRoute(hash) {
  const h = hash.replace(/^#\/?/, "");
  if (!h || h === "/") return { page: "home" };
  if (h.startsWith("join/")) return { page: "join", code: h.split("/")[1] };
  if (h === "join") return { page: "join", code: null };
  if (h === "create") return { page: "create" };
  if (h.startsWith("game/")) return { page: "game", code: h.split("/")[1] };
  return { page: "home" };
}

export function navigate(path) {
  window.location.hash = path;
}

export default function App() {
  const [route, setRoute] = useState(parseRoute(window.location.hash));

  useEffect(() => {
    const handler = () => setRoute(parseRoute(window.location.hash));
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  if (route.page === "home") return <Home />;
  if (route.page === "create") return <CreateLobby />;
  if (route.page === "join") return <JoinLobby initialCode={route.code} />;
  if (route.page === "game") return <Game code={route.code} />;
  return <Home />;
}
