# Poker Chips

A self-hosted web app for managing poker chips during in-person games.
Everyone joins from their own phone — no physical chips needed.

## Features

- Create or join a lobby with a 5-character code
- Real-time sync across all players via WebSockets
- Track chip stacks + shared pot
- Actions: Buy In, Raise, Call, Check, Fold, Cash Out
- Award or split the pot at end of hand
- Auto-advance dealer / small blind / big blind each round
- All-in handling (chip count clamps automatically)
- Action log with round numbers and timestamps
- Configurable per lobby:
  - Starting chip count
  - Buy-in amount
  - Rounds until buy-in doubles (or disable)
  - Raise must exceed buy-in (toggle)
  - Simple rounds or Blinds mode (with SB/BB amounts)
  - Table seating order (drag to reorder)
  - Per-player chip adjustments
- Lobby persistence via Redis (survives server restarts)
- Disconnected players can rejoin and pick their existing slot
- Up to 3 concurrent lobbies (configurable)
- Lobbies auto-expire after 24 hours of inactivity (configurable)

---

## Quick Start

### Requirements
- Docker and Docker Compose installed on your Debian machine

### 1. Clone / copy the project

```bash
# Copy the poker-app directory to your server
scp -r poker-app user@your-server:~/poker-app
# Or clone from your repo
```

### 2. Configure environment

```bash
cd poker-app
cp .env.example .env
```

Edit `.env` as needed:

```env
# If using a Pangolin tunnel or reverse proxy, set your public URL here.
# Leave empty if the client and server are on the same domain/port.
VITE_SERVER_URL=

# Hours before an inactive lobby is cleaned up (default: 24)
LOBBY_TIMEOUT_HOURS=24

# Maximum concurrent lobbies (default: 3)
MAX_LOBBIES=3
```

### 3. Build and start

```bash
docker compose up -d --build
```

The app is now available on:
- **Frontend**: http://your-server-ip (port 80)
- **API / WebSocket**: http://your-server-ip:3001

### 4. Pangolin tunnel setup

If you're exposing via a Pangolin tunnel, set the public URL in `.env` before building:

```env
VITE_SERVER_URL=https://poker.yourdomain.com:3001
```

Or if your tunnel proxies both frontend and API under one domain with path routing,
configure the tunnel to forward `/api` and `/socket.io` to port 3001, and everything
else to port 80. Then leave `VITE_SERVER_URL` empty.

**Note**: `VITE_SERVER_URL` is baked into the frontend at build time. After changing it,
rebuild with `docker compose up -d --build`.

---

## Usage

### Creating a game
1. Open the app on any device
2. Tap **Create Lobby**
3. Set lobby name, your name, and configure game settings
4. Tap **Create Lobby** — you'll land in the game
5. Share your 5-letter lobby code with other players

### Joining a game
1. Tap **Join Lobby**
2. Enter the 5-letter code
3. If you've been here before: pick your existing player slot, or join as new
4. Enter your name (new player only)

### Playing
- **My Chips tab**: your chip count, buy-in, raise, call, check, fold, cash out
- **Table tab**: see all players, the pot, blinds, award/split pot, advance to next round
- **Log tab**: full action history
- **Settings tab**: change game rules, adjust seating order, manually adjust any player's chips

### Round flow
1. Players place bets using the action buttons (chips deduct from their stack, add to pot)
2. At end of hand, go to **Table** → tap **Award Pot** → select winner (or split)
3. Tap **Next Round →** to advance (dealer/blinds rotate automatically)

---

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌───────┐
│  Nginx      │     │  Node.js server  │     │ Redis │
│  (port 80)  │────▶│  Express +       │────▶│       │
│  React SPA  │     │  Socket.io       │     │ state │
│             │◀────│  (port 3001)     │◀────│       │
└─────────────┘     └──────────────────┘     └───────┘
```

- **Frontend**: React + Vite, served by Nginx
- **Backend**: Node.js + Express + Socket.io
- **Database**: Redis (append-only persistence, survives restarts)
- **Real-time**: WebSockets via Socket.io (falls back to polling)

---

## Configuration Reference

| Variable | Default | Description |
|---|---|---|
| `VITE_SERVER_URL` | `` (empty) | Public URL of the server. Empty = same origin |
| `LOBBY_TIMEOUT_HOURS` | `24` | Hours until unused lobby expires |
| `MAX_LOBBIES` | `3` | Maximum concurrent active lobbies |

---

## Updating

```bash
cd poker-app
git pull  # if using git
docker compose down
docker compose up -d --build
```

Redis data persists in the `redis-data` Docker volume across rebuilds.

## Stopping

```bash
docker compose down        # stop containers, keep data
docker compose down -v     # stop and delete all data
```
