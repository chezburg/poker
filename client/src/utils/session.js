const KEY = "poker_session";

export function saveSession(lobbyCode, playerId) {
  try {
    const sessions = getSessions();
    sessions[lobbyCode] = { playerId, savedAt: Date.now() };
    localStorage.setItem(KEY, JSON.stringify(sessions));
  } catch (e) {
    console.error("Failed to save session to localStorage:", e);
  }
}

export function getSessions() {
  const raw = localStorage.getItem(KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error("Failed to parse sessions from localStorage, clearing corrupted data:", e);
    localStorage.removeItem(KEY);
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
  } catch (e) {
    console.error("Failed to clear session from localStorage:", e);
  }
}
