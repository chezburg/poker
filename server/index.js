const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const Redis = require("ioredis");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
const server = http.createServer(app);

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
const PORT = process.env.PORT || 3001;
const LOBBY_TIMEOUT_HOURS = parseInt(process.env.LOBBY_TIMEOUT_HOURS || "24");
const MAX_LOBBIES = parseInt(process.env.MAX_LOBBIES || "3");
const LOBBY_TTL = LOBBY_TIMEOUT_HOURS * 3600;

const redis = new Redis(REDIS_URL);

app.use(cors());
app.use(express.json());

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// ─── Redis helpers ────────────────────────────────────────────────────────────

async function getLobby(code) {
  const raw = await redis.get(`lobby:${code}`);
  return raw ? JSON.parse(raw) : null;
}

async function saveLobby(lobby) {
  await redis.set(`lobby:${lobby.code}`, JSON.stringify(lobby), "EX", LOBBY_TTL);
  await redis.expire(`lobbyindex`, LOBBY_TTL * 2);
}

async function deleteLobby(code) {
  await redis.del(`lobby:${code}`);
  await redis.srem("lobbyindex", code);
}

async function listLobbyCodes() {
  return redis.smembers("lobbyindex");
}

async function addLobbyToIndex(code) {
  await redis.sadd("lobbyindex", code);
}

async function countActiveLobbies() {
  const codes = await listLobbyCodes();
  let count = 0;
  for (const code of codes) {
    const exists = await redis.exists(`lobby:${code}`);
    if (exists) count++;
    else await redis.srem("lobbyindex", code);
  }
  return count;
}

// ─── Game logic helpers ───────────────────────────────────────────────────────

function generateCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

function createPlayer(name) {
  return {
    id: uuidv4(),
    name,
    chips: 0,
    totalBoughtIn: 0,
    connected: true,
    lastSeen: Date.now(),
  };
}

function defaultSettings() {
  return {
    startingChips: 1000,
    buyInAmount: 100,
    roundsUntilDoubleBuyIn: 0, // 0 = disabled
    raiseMustExceedBuyIn: false,
    blindsMode: false, // false = simple, true = blinds
    smallBlind: 10,
    bigBlind: 20,
    tableOrder: [], // player ids in seat order
  };
}

function createLobby(name, creatorName) {
  const code = generateCode();
  const creator = createPlayer(creatorName);
  const settings = defaultSettings();
  settings.tableOrder = [creator.id];

  return {
    code,
    name,
    createdAt: Date.now(),
    round: 1,
    phase: "waiting", // waiting | playing | ended
    players: [creator],
    pot: 0,
    currentBuyInAmount: settings.buyInAmount,
    dealerIndex: 0,
    settings,
    actionLog: [],
  };
}

function getPlayerById(lobby, playerId) {
  return lobby.players.find((p) => p.id === playerId);
}

function getOrderedPlayers(lobby) {
  const order = lobby.settings.tableOrder;
  if (!order || order.length === 0) return lobby.players;
  const ordered = [];
  for (const id of order) {
    const p = lobby.players.find((p) => p.id === id);
    if (p) ordered.push(p);
  }
  // append any players not yet in tableOrder
  for (const p of lobby.players) {
    if (!order.includes(p.id)) ordered.push(p);
  }
  return ordered;
}

function getBlinds(lobby) {
  if (!lobby.settings.blindsMode) return null;
  const ordered = getOrderedPlayers(lobby);
  if (ordered.length < 2) return null;
  const n = ordered.length;
  const dealerIdx = lobby.dealerIndex % n;
  const sbIdx = (dealerIdx + 1) % n;
  const bbIdx = (dealerIdx + 2) % n;
  return {
    dealer: ordered[dealerIdx],
    smallBlind: ordered[sbIdx],
    bigBlind: ordered[bbIdx],
  };
}

function advanceDealer(lobby) {
  const n = getOrderedPlayers(lobby).length;
  if (n > 0) lobby.dealerIndex = (lobby.dealerIndex + 1) % n;
}

function computeCurrentBuyIn(lobby) {
  const { buyInAmount, roundsUntilDoubleBuyIn } = lobby.settings;
  if (!roundsUntilDoubleBuyIn || roundsUntilDoubleBuyIn === 0) return buyInAmount;
  const doublings = Math.floor((lobby.round - 1) / roundsUntilDoubleBuyIn);
  return buyInAmount * Math.pow(2, doublings);
}

function logAction(lobby, playerName, action, amount) {
  lobby.actionLog.unshift({
    id: uuidv4(),
    ts: Date.now(),
    round: lobby.round,
    playerName,
    action,
    amount: amount || null,
  });
  if (lobby.actionLog.length > 100) lobby.actionLog = lobby.actionLog.slice(0, 100);
}

function sanitizeLobby(lobby) {
  // Return full state — clients need everything
  return {
    ...lobby,
    currentBuyInAmount: computeCurrentBuyIn(lobby),
    blinds: getBlinds(lobby),
    orderedPlayers: getOrderedPlayers(lobby).map((p) => p.id),
  };
}

// ─── REST endpoints ───────────────────────────────────────────────────────────

app.get("/api/health", (_, res) => res.json({ ok: true }));

// List lobby names (for join page preview)
app.get("/api/lobbies", async (req, res) => {
  try {
    const codes = await listLobbyCodes();
    const result = [];
    for (const code of codes) {
      const lobby = await getLobby(code);
      if (lobby) result.push({ code: lobby.code, name: lobby.name, players: lobby.players.length, phase: lobby.phase });
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Create lobby
app.post("/api/lobbies", async (req, res) => {
  try {
    const { lobbyName, playerName, settings: initSettings } = req.body;
    if (!lobbyName?.trim() || !playerName?.trim()) return res.status(400).json({ error: "Missing fields" });

    const count = await countActiveLobbies();
    if (count >= MAX_LOBBIES) return res.status(429).json({ error: `Max ${MAX_LOBBIES} lobbies active at once` });

    const lobby = createLobby(lobbyName.trim(), playerName.trim());

    // Apply any initial settings passed from the create form
    if (initSettings) {
      const s = lobby.settings;
      if (initSettings.startingChips) s.startingChips = parseInt(initSettings.startingChips) || s.startingChips;
      if (initSettings.buyInAmount) s.buyInAmount = parseInt(initSettings.buyInAmount) || s.buyInAmount;
      if (initSettings.roundsUntilDoubleBuyIn !== undefined) s.roundsUntilDoubleBuyIn = parseInt(initSettings.roundsUntilDoubleBuyIn) || 0;
      if (initSettings.raiseMustExceedBuyIn !== undefined) s.raiseMustExceedBuyIn = !!initSettings.raiseMustExceedBuyIn;
      if (initSettings.blindsMode !== undefined) s.blindsMode = !!initSettings.blindsMode;
      if (initSettings.smallBlind) s.smallBlind = parseInt(initSettings.smallBlind) || s.smallBlind;
      if (initSettings.bigBlind) s.bigBlind = parseInt(initSettings.bigBlind) || s.bigBlind;
    }

    // Give starting chips to the creator
    const creator = lobby.players[0];
    creator.chips = lobby.settings.startingChips;
    creator.totalBoughtIn = lobby.settings.startingChips;
    logAction(lobby, creator.name, "buy-in", lobby.settings.startingChips);

    lobby.currentBuyInAmount = computeCurrentBuyIn(lobby);

    await saveLobby(lobby);
    await addLobbyToIndex(lobby.code);

    res.json({ lobby: sanitizeLobby(lobby), playerId: creator.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get lobby info (for join page — shows existing players)
app.get("/api/lobbies/:code", async (req, res) => {
  try {
    const lobby = await getLobby(req.params.code.toUpperCase());
    if (!lobby) return res.status(404).json({ error: "Lobby not found" });
    res.json({ lobby: sanitizeLobby(lobby) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Join lobby (new player or rejoin)
app.post("/api/lobbies/:code/join", async (req, res) => {
  try {
    const { playerName, existingPlayerId } = req.body;
    const lobby = await getLobby(req.params.code.toUpperCase());
    if (!lobby) return res.status(404).json({ error: "Lobby not found" });

    let player;

    if (existingPlayerId) {
      player = getPlayerById(lobby, existingPlayerId);
      if (!player) return res.status(404).json({ error: "Player not found" });
      player.connected = true;
      player.lastSeen = Date.now();
    } else {
      if (!playerName?.trim()) return res.status(400).json({ error: "Missing player name" });
      player = createPlayer(playerName.trim());
      player.chips = lobby.settings.startingChips || 0;
      player.totalBoughtIn = lobby.settings.startingChips || 0;
      lobby.players.push(player);
      if (!lobby.settings.tableOrder.includes(player.id)) {
        lobby.settings.tableOrder.push(player.id);
      }
      logAction(lobby, player.name, "joined", null);
      if (player.chips > 0) logAction(lobby, player.name, "buy-in", player.chips);
    }

    await saveLobby(lobby);
    io.to(lobby.code).emit("lobby:update", sanitizeLobby(lobby));
    res.json({ lobby: sanitizeLobby(lobby), playerId: player.id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Socket.io ────────────────────────────────────────────────────────────────

io.on("connection", (socket) => {
  let currentLobbyCode = null;
  let currentPlayerId = null;

  socket.on("join:lobby", async ({ code, playerId }) => {
    const lobby = await getLobby(code?.toUpperCase());
    if (!lobby) return socket.emit("error", "Lobby not found");

    currentLobbyCode = lobby.code;
    currentPlayerId = playerId;
    socket.join(lobby.code);

    const player = getPlayerById(lobby, playerId);
    if (player) {
      player.connected = true;
      player.lastSeen = Date.now();
      await saveLobby(lobby);
      io.to(lobby.code).emit("lobby:update", sanitizeLobby(lobby));
    }

    socket.emit("lobby:state", sanitizeLobby(lobby));
  });

  // ── Actions ──────────────────────────────────────────────────────────────

  socket.on("action:buyin", async ({ code, playerId }) => {
    const lobby = await getLobby(code);
    if (!lobby) return socket.emit("error", "Lobby not found");
    const player = getPlayerById(lobby, playerId);
    if (!player) return socket.emit("error", "Player not found");

    const amount = computeCurrentBuyIn(lobby);
    player.chips += amount;
    player.totalBoughtIn += amount;
    logAction(lobby, player.name, "buy-in", amount);
    await saveLobby(lobby);
    io.to(lobby.code).emit("lobby:update", sanitizeLobby(lobby));
  });

  socket.on("action:raise", async ({ code, playerId, amount }) => {
    const lobby = await getLobby(code);
    if (!lobby) return socket.emit("error", "Lobby not found");
    const player = getPlayerById(lobby, playerId);
    if (!player) return socket.emit("error", "Player not found");

    const amt = parseInt(amount);
    if (isNaN(amt) || amt <= 0) return socket.emit("error", "Invalid amount");

    if (lobby.settings.raiseMustExceedBuyIn) {
      const buyIn = computeCurrentBuyIn(lobby);
      if (amt <= buyIn) return socket.emit("error", `Raise must exceed buy-in (${buyIn})`);
    }

    const actual = Math.min(amt, player.chips); // clamp to available (all-in)
    player.chips -= actual;
    lobby.pot += actual;
    logAction(lobby, player.name, "raise", actual);
    await saveLobby(lobby);
    io.to(lobby.code).emit("lobby:update", sanitizeLobby(lobby));
  });

  socket.on("action:call", async ({ code, playerId, amount }) => {
    const lobby = await getLobby(code);
    if (!lobby) return socket.emit("error", "Lobby not found");
    const player = getPlayerById(lobby, playerId);
    if (!player) return socket.emit("error", "Player not found");

    const amt = parseInt(amount);
    if (isNaN(amt) || amt <= 0) return socket.emit("error", "Invalid amount");

    const actual = Math.min(amt, player.chips); // all-in cap
    player.chips -= actual;
    lobby.pot += actual;

    const isAllIn = actual < amt;
    logAction(lobby, player.name, isAllIn ? "all-in call" : "call", actual);
    await saveLobby(lobby);
    io.to(lobby.code).emit("lobby:update", sanitizeLobby(lobby));
  });

  socket.on("action:fold", async ({ code, playerId }) => {
    const lobby = await getLobby(code);
    if (!lobby) return socket.emit("error", "Lobby not found");
    const player = getPlayerById(lobby, playerId);
    if (!player) return socket.emit("error", "Player not found");

    logAction(lobby, player.name, "fold", null);
    await saveLobby(lobby);
    io.to(lobby.code).emit("lobby:update", sanitizeLobby(lobby));
  });

  socket.on("action:check", async ({ code, playerId }) => {
    const lobby = await getLobby(code);
    if (!lobby) return socket.emit("error", "Lobby not found");
    const player = getPlayerById(lobby, playerId);
    if (!player) return socket.emit("error", "Player not found");

    logAction(lobby, player.name, "check", null);
    await saveLobby(lobby);
    io.to(lobby.code).emit("lobby:update", sanitizeLobby(lobby));
  });

  socket.on("action:cashout", async ({ code, playerId }) => {
    const lobby = await getLobby(code);
    if (!lobby) return socket.emit("error", "Lobby not found");
    const player = getPlayerById(lobby, playerId);
    if (!player) return socket.emit("error", "Player not found");

    const chips = player.chips;
    logAction(lobby, player.name, "cash-out", chips);
    player.chips = 0;
    await saveLobby(lobby);
    io.to(lobby.code).emit("lobby:update", sanitizeLobby(lobby));
  });

  socket.on("action:win_pot", async ({ code, playerId }) => {
    const lobby = await getLobby(code);
    if (!lobby) return socket.emit("error", "Lobby not found");
    const player = getPlayerById(lobby, playerId);
    if (!player) return socket.emit("error", "Player not found");

    const pot = lobby.pot;
    player.chips += pot;
    lobby.pot = 0;
    logAction(lobby, player.name, "won pot", pot);
    await saveLobby(lobby);
    io.to(lobby.code).emit("lobby:update", sanitizeLobby(lobby));
  });

  socket.on("action:split_pot", async ({ code, playerIds }) => {
    const lobby = await getLobby(code);
    if (!lobby) return socket.emit("error", "Lobby not found");
    if (!playerIds?.length) return socket.emit("error", "No players selected");

    const share = Math.floor(lobby.pot / playerIds.length);
    const remainder = lobby.pot - share * playerIds.length;
    const names = [];
    for (const pid of playerIds) {
      const p = getPlayerById(lobby, pid);
      if (p) { p.chips += share; names.push(p.name); }
    }
    // Give remainder to first player
    const first = getPlayerById(lobby, playerIds[0]);
    if (first) first.chips += remainder;
    lobby.pot = 0;
    logAction(lobby, names.join(" & "), "split pot", share);
    await saveLobby(lobby);
    io.to(lobby.code).emit("lobby:update", sanitizeLobby(lobby));
  });

  socket.on("action:next_round", async ({ code }) => {
    const lobby = await getLobby(code);
    if (!lobby) return socket.emit("error", "Lobby not found");

    lobby.round += 1;
    lobby.currentBuyInAmount = computeCurrentBuyIn(lobby);
    advanceDealer(lobby);
    logAction(lobby, "—", "new round", lobby.round);
    await saveLobby(lobby);
    io.to(lobby.code).emit("lobby:update", sanitizeLobby(lobby));
  });

  // ── Settings ─────────────────────────────────────────────────────────────

  socket.on("settings:update", async ({ code, settings }) => {
    const lobby = await getLobby(code);
    if (!lobby) return socket.emit("error", "Lobby not found");

    const s = lobby.settings;
    if (settings.startingChips !== undefined) s.startingChips = parseInt(settings.startingChips) || s.startingChips;
    if (settings.buyInAmount !== undefined) s.buyInAmount = parseInt(settings.buyInAmount) || s.buyInAmount;
    if (settings.roundsUntilDoubleBuyIn !== undefined) s.roundsUntilDoubleBuyIn = parseInt(settings.roundsUntilDoubleBuyIn) || 0;
    if (settings.raiseMustExceedBuyIn !== undefined) s.raiseMustExceedBuyIn = !!settings.raiseMustExceedBuyIn;
    if (settings.blindsMode !== undefined) s.blindsMode = !!settings.blindsMode;
    if (settings.smallBlind !== undefined) s.smallBlind = parseInt(settings.smallBlind) || s.smallBlind;
    if (settings.bigBlind !== undefined) s.bigBlind = parseInt(settings.bigBlind) || s.bigBlind;
    if (settings.tableOrder !== undefined && Array.isArray(settings.tableOrder)) s.tableOrder = settings.tableOrder;

    lobby.currentBuyInAmount = computeCurrentBuyIn(lobby);
    await saveLobby(lobby);
    io.to(lobby.code).emit("lobby:update", sanitizeLobby(lobby));
  });

  socket.on("settings:give_chips", async ({ code, playerId, amount }) => {
    const lobby = await getLobby(code);
    if (!lobby) return socket.emit("error", "Lobby not found");
    const player = getPlayerById(lobby, playerId);
    if (!player) return socket.emit("error", "Player not found");

    const amt = parseInt(amount);
    if (isNaN(amt)) return socket.emit("error", "Invalid amount");
    player.chips = Math.max(0, player.chips + amt);
    logAction(lobby, player.name, amt >= 0 ? "chips added" : "chips removed", Math.abs(amt));
    await saveLobby(lobby);
    io.to(lobby.code).emit("lobby:update", sanitizeLobby(lobby));
  });

  // ── Disconnect ────────────────────────────────────────────────────────────

  socket.on("disconnect", async () => {
    if (!currentLobbyCode || !currentPlayerId) return;
    const lobby = await getLobby(currentLobbyCode);
    if (!lobby) return;
    const player = getPlayerById(lobby, currentPlayerId);
    if (player) {
      player.connected = false;
      player.lastSeen = Date.now();
      await saveLobby(lobby);
      io.to(currentLobbyCode).emit("lobby:update", sanitizeLobby(lobby));
    }
  });
});

// ─── Cleanup job ──────────────────────────────────────────────────────────────
setInterval(async () => {
  const codes = await listLobbyCodes();
  for (const code of codes) {
    const exists = await redis.exists(`lobby:${code}`);
    if (!exists) await redis.srem("lobbyindex", code);
  }
}, 60 * 60 * 1000); // hourly

server.listen(PORT, () => console.log(`Server running on :${PORT}`));
