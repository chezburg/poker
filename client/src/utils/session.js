const KEY = "poker_session";

export function saveSession(lobbyCode, playerId) {
  try {
    const sessions = getSessions();
    sessions[lobbyCode] = { playerId, savedAt: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(sessions));
  } catch {}
}

export function getSessions() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

export function getSessionForLobby(lobbyCode) {
  return getSessions()[lobbyCode] || null;
}

export function clearSession(lobbyCode) {
  try {
    const sessions = getSessions();
    delete sessions[lobbyCode];
    localStorage.setItem(KEY, JSON.stringify(sessions));
  } catch {}
}
