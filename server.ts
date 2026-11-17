import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';

type WorldRules = 'creative' | 'survival' | 'hardcore';

interface RemotePlayerState {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  heldBlock: number;
  biome: string;
  skin?: unknown;
  micActive?: boolean;
  speaking?: boolean;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  color: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

interface RoomState {
  id: string;
  seed: number;
  worldRules: WorldRules;
  deltas: Map<string, number>;
  players: Map<string, { ws: WebSocket; player: RemotePlayerState }>;
  chatHistory: ChatMessage[];
  updatedAt: number;
}

const PORT = Number(process.env.PORT || 3000);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const startTimeMs = Date.now();

const rooms = new Map<string, RoomState>();

const FEATURED_ROOMS: Array<{ id: string; seed: number; worldRules: WorldRules }> = [
  { id: 'citadel-999', seed: 999, worldRules: 'survival' },
  { id: 'mango-555', seed: 555, worldRules: 'survival' },
  { id: 'volcano-777', seed: 777, worldRules: 'survival' },
  { id: 'skyworld-888', seed: 888, worldRules: 'survival' },
  { id: 'robotworld-666', seed: 666, worldRules: 'survival' },
  { id: 'vox-prime', seed: 40492, worldRules: 'creative' },
  { id: 'hardcore-siege', seed: 999, worldRules: 'hardcore' },
];

for (const preset of FEATURED_ROOMS) {
  rooms.set(preset.id, {
    id: preset.id,
    seed: preset.seed,
    worldRules: preset.worldRules,
    deltas: new Map(),
    players: new Map(),
    chatHistory: [],
    updatedAt: Date.now(),
  });
}

function sanitizeRoomId(raw: unknown): string {
  const s = typeof raw === 'string' ? raw.trim() : '';
  const cleaned = s.replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 28);
  return cleaned || 'citadel-999';
}

function sanitizeWorldRules(raw: unknown): WorldRules {
  if (raw === 'creative' || raw === 'survival' || raw === 'hardcore') return raw;
  return 'survival';
}

function sanitizeSeed(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 999;
  return Math.min(999999, Math.abs(Math.floor(n)));
}

function getOrCreateRoom(roomId: string, seed = 999, worldRules: WorldRules = 'survival'): RoomState {
  const existing = rooms.get(roomId);
  if (existing) return existing;
  const created: RoomState = {
    id: roomId,
    seed,
    worldRules,
    deltas: new Map(),
    players: new Map(),
    chatHistory: [],
    updatedAt: Date.now(),
  };
  rooms.set(roomId, created);
  return created;
}

function getLanIps(): string[] {
  const interfaces = os.networkInterfaces();
  const ips: string[] = [];
  for (const entries of Object.values(interfaces)) {
    if (!entries) continue;
    for (const entry of entries) {
      if (entry.family === 'IPv4' && !entry.internal) {
        ips.push(entry.address);
      }
    }
  }
  return ips;
}

function sendJson(ws: WebSocket, payload: unknown): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function broadcastToRoom(room: RoomState, payload: unknown, exceptPlayerId?: string): void {
  const raw = JSON.stringify(payload);
  for (const [pid, client] of room.players.entries()) {
    if (exceptPlayerId && pid === exceptPlayerId) continue;
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(raw);
    }
  }
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.use((_req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (_req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  app.get('/api/rooms', (_req, res) => {
    const list = Array.from(rooms.values())
      .map((room) => ({
        id: room.id,
        seed: room.seed,
        worldRules: room.worldRules,
        playerCount: room.players.size,
        modifiedCount: room.deltas.size,
        updatedAt: room.updatedAt,
      }))
      .sort((a, b) => b.playerCount - a.playerCount || b.updatedAt - a.updatedAt);
    res.json({ rooms: list });
  });

  app.post('/api/rooms', (req, res) => {
    const body = req.body as Record<string, unknown> | undefined;
    const roomId = sanitizeRoomId(body?.roomId);
    const seed = sanitizeSeed(body?.seed);
    const worldRules = sanitizeWorldRules(body?.worldRules);
    const room = getOrCreateRoom(roomId, seed, worldRules);
    res.json({
      room: {
        id: room.id,
        seed: room.seed,
        worldRules: room.worldRules,
        playerCount: room.players.size,
        modifiedCount: room.deltas.size,
        updatedAt: room.updatedAt,
      },
    });
  });

  app.get('/api/server-info', (_req, res) => {
    const lanIps = getLanIps();
    const urls = lanIps.map((ip) => `http://${ip}:${PORT}`);
    const wsUrls = lanIps.map((ip) => `ws://${ip}:${PORT}/ws`);
    let playersCount = 0;
    for (const room of rooms.values()) {
      playersCount += room.players.size;
    }
    res.json({
      serverName: 'VoxCraft LAN & Online Server',
      port: PORT,
      lanIps,
      urls,
      wsUrls,
      roomsCount: rooms.size,
      playersCount,
      uptimeSec: Math.round((Date.now() - startTimeMs) / 1000),
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    let currentRoom: RoomState | null = null;
    let currentPlayerId: string | null = null;

    ws.on('message', (raw) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(String(raw)) as Record<string, unknown>;
      } catch {
        sendJson(ws, { type: 'error', message: 'Invalid message payload' });
        return;
      }

      const type = msg.type;
      if (type === 'join') {
        if (currentRoom && currentPlayerId) {
          currentRoom.players.delete(currentPlayerId);
          broadcastToRoom(currentRoom, { type: 'player:left', playerId: currentPlayerId });
        }

        const roomId = sanitizeRoomId(msg.roomId);
        const seed = sanitizeSeed(msg.seed);
        const worldRules = sanitizeWorldRules(msg.worldRules);
        const room = getOrCreateRoom(roomId, seed, worldRules);

        const playerId =
          typeof msg.playerId === 'string' && msg.playerId.trim()
            ? msg.playerId.trim().slice(0, 32)
            : `p_${Math.random().toString(36).slice(2, 10)}`;
        const name =
          typeof msg.name === 'string' && msg.name.trim()
            ? msg.name.trim().slice(0, 20)
            : 'Explorer';
        const color =
          typeof msg.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(msg.color)
            ? msg.color
            : '#38bdf8';

        const spawnY = room.seed === 888 ? 31.2 : room.seed === 777 ? 24.2 : 25.2;
        const player: RemotePlayerState = {
          id: playerId,
          name,
          color,
          x: room.seed === 777 ? 2.5 : 0.5,
          y: spawnY,
          z: room.seed === 777 ? 12.5 : room.seed === 888 ? 10.5 : 8.5,
          yaw: 0,
          pitch: 0,
          heldBlock: 1,
          biome: room.seed === 777 ? 'basalt_caldera' : room.seed === 888 ? 'aether_spires' : 'verdant_basin',
          skin: msg.skin,
          micActive: false,
          speaking: false,
        };

        const otherPlayers = Array.from(room.players.values()).map((c) => c.player);
        room.players.set(playerId, { ws, player });
        room.updatedAt = Date.now();
        currentRoom = room;
        currentPlayerId = playerId;

        sendJson(ws, {
          type: 'init',
          roomId: room.id,
          seed: room.seed,
          worldRules: room.worldRules,
          deltas: Array.from(room.deltas.entries()),
          players: otherPlayers,
          chatHistory: room.chatHistory.slice(-40),
        });

        broadcastToRoom(room, { type: 'player:joined', player }, playerId);
        return;
      }

      if (!currentRoom || !currentPlayerId) return;
      const entry = currentRoom.players.get(currentPlayerId);
      if (!entry) return;

      if (type === 'player:move') {
        entry.player.x = Number(msg.x) || 0;
        entry.player.y = Number(msg.y) || 0;
        entry.player.z = Number(msg.z) || 0;
        entry.player.yaw = Number(msg.yaw) || 0;
        entry.player.pitch = Number(msg.pitch) || 0;
        entry.player.heldBlock = Number(msg.heldBlock) || 1;
        entry.player.biome = typeof msg.biome === 'string' ? msg.biome : entry.player.biome;
        broadcastToRoom(currentRoom, { type: 'player:moved', player: entry.player }, currentPlayerId);
      } else if (type === 'player:skin') {
        entry.player.skin = msg.skin;
        broadcastToRoom(currentRoom, { type: 'player:moved', player: entry.player }, currentPlayerId);
      } else if (type === 'block:set') {
        const x = Math.trunc(Number(msg.x));
        const y = Math.trunc(Number(msg.y));
        const z = Math.trunc(Number(msg.z));
        const blockId = Math.max(0, Math.min(255, Math.trunc(Number(msg.blockId) || 0)));
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z) || y <= 0 || y >= 64) {
          return;
        }
        const key = `${x},${y},${z}`;
        currentRoom.deltas.set(key, blockId);
        if (currentRoom.deltas.size > 50000) {
          const oldestKey = currentRoom.deltas.keys().next().value;
          if (oldestKey) currentRoom.deltas.delete(oldestKey);
        }
        currentRoom.updatedAt = Date.now();
        broadcastToRoom(
          currentRoom,
          { type: 'block:updated', x, y, z, blockId, senderId: currentPlayerId },
          currentPlayerId
        );
      } else if (type === 'chat:send') {
        const text = typeof msg.text === 'string' ? msg.text.trim().slice(0, 240) : '';
        if (!text) return;
        const message: ChatMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          senderId: currentPlayerId,
          senderName: entry.player.name,
          color: entry.player.color,
          text,
          timestamp: Date.now(),
        };
        currentRoom.chatHistory.push(message);
        if (currentRoom.chatHistory.length > 60) {
          currentRoom.chatHistory.shift();
        }
        broadcastToRoom(currentRoom, { type: 'chat:message', message });
      } else if (type === 'voice:state') {
        entry.player.micActive = Boolean(msg.micActive);
        entry.player.speaking = Boolean(msg.speaking) && entry.player.micActive;
        broadcastToRoom(
          currentRoom,
          {
            type: 'voice:state',
            playerId: currentPlayerId,
            micActive: entry.player.micActive,
            speaking: entry.player.speaking,
          },
          currentPlayerId
        );
      } else if (type === 'voice:signal') {
        const targetId = typeof msg.to === 'string' ? msg.to : '';
        const target = currentRoom.players.get(targetId);
        if (target && target.ws.readyState === WebSocket.OPEN && msg.signal) {
          sendJson(target.ws, {
            type: 'voice:signal',
            from: currentPlayerId,
            signal: msg.signal,
          });
        }
      } else if (type === 'voice:audio') {
        const pcm = typeof msg.pcm === 'string' ? msg.pcm : '';
        const sampleRate = Math.max(8000, Math.min(48000, Math.trunc(Number(msg.sampleRate) || 16000)));
        if (!pcm || pcm.length > 32768) return;
        broadcastToRoom(
          currentRoom,
          {
            type: 'voice:audio',
            from: currentPlayerId,
            pcm,
            sampleRate,
          },
          currentPlayerId
        );
      }
    });

    ws.on('close', () => {
      if (currentRoom && currentPlayerId) {
        currentRoom.players.delete(currentPlayerId);
        currentRoom.updatedAt = Date.now();
        broadcastToRoom(currentRoom, { type: 'player:left', playerId: currentPlayerId });
      }
      currentRoom = null;
      currentPlayerId = null;
    });
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`VoxCraft server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start VoxCraft server:', err);
  process.exit(1);
});
