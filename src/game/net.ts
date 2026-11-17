import type {
  ChatMessage,
  PlayerSkin,
  RemotePlayer,
  RoomSummary,
  ServerInfo,
  VoiceSignalPayload,
  WorldRules,
} from '../types';

export function resolveServerEndpoints(rawAddress?: string): {
  httpBase: string;
  wsUrl: string;
  displayAddress: string;
  isSameOrigin: boolean;
} {
  const defaultHttp =
    typeof window !== 'undefined' && window.location.protocol.startsWith('http')
      ? window.location.origin
      : 'http://localhost:3000';
  const defaultWsProto =
    typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const defaultWs =
    typeof window !== 'undefined' && window.location.protocol.startsWith('http')
      ? `${defaultWsProto}//${window.location.host}/ws`
      : 'ws://localhost:3000/ws';

  const trimmed = (rawAddress || '').trim();
  if (!trimmed || trimmed === 'same-origin') {
    return {
      httpBase: defaultHttp,
      wsUrl: defaultWs,
      displayAddress: typeof window !== 'undefined' ? window.location.host : 'localhost:3000',
      isSameOrigin: true,
    };
  }

  let normalized = trimmed.replace(/\/+$/, '');
  if (!/^(https?|wss?):\/\//i.test(normalized)) {
    const isLan =
      /^(localhost|127\.0\.0\.1|10\.|192\.168\.|172\.(1[6-9]|2\d|3[0-1])\.)/i.test(normalized) ||
      /^\d{1,3}(\.\d{1,3}){3}(:\d+)?(\/.*)?$/.test(normalized);
    const hasPort = /:\d+(\/|$)/.test(normalized);
    if (isLan && !hasPort && !normalized.includes('/')) {
      normalized = `${normalized}:3000`;
    }
    const proto = isLan
      ? 'http://'
      : typeof window !== 'undefined' && window.location.protocol === 'https:'
      ? 'https://'
      : 'http://';
    normalized = `${proto}${normalized}`;
  }

  try {
    const u = new URL(normalized);
    const isSecure = u.protocol === 'https:' || u.protocol === 'wss:';
    const httpProto = isSecure ? 'https:' : 'http:';
    const wsProto = isSecure ? 'wss:' : 'ws:';
    const pathname = u.pathname.replace(/\/ws$/i, '').replace(/\/+$/, '');
    return {
      httpBase: `${httpProto}//${u.host}${pathname}`,
      wsUrl: `${wsProto}//${u.host}${pathname}/ws`,
      displayAddress: u.host,
      isSameOrigin:
        typeof window !== 'undefined' &&
        u.host === window.location.host &&
        httpProto === window.location.protocol,
    };
  } catch {
    return {
      httpBase: defaultHttp,
      wsUrl: defaultWs,
      displayAddress: trimmed,
      isSameOrigin: true,
    };
  }
}

export async function probeServer(rawAddress?: string): Promise<{
  ok: boolean;
  pingMs: number;
  rooms: RoomSummary[];
  serverInfo: ServerInfo | null;
  error?: string;
}> {
  const { httpBase } = resolveServerEndpoints(rawAddress);
  const t0 = performance.now();
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 3500);
  try {
    const [roomsRes, infoRes] = await Promise.all([
      fetch(`${httpBase}/api/rooms`, { signal: controller.signal }),
      fetch(`${httpBase}/api/server-info`, { signal: controller.signal }).catch(() => null),
    ]);
    const pingMs = Math.max(1, Math.round(performance.now() - t0));
    if (!roomsRes.ok) {
      return {
        ok: false,
        pingMs,
        rooms: [],
        serverInfo: null,
        error: `HTTP ${roomsRes.status}`,
      };
    }
    const roomsData = (await roomsRes.json()) as { rooms?: RoomSummary[] };
    const serverInfo = infoRes && infoRes.ok ? ((await infoRes.json()) as ServerInfo) : null;
    return {
      ok: true,
      pingMs,
      rooms: Array.isArray(roomsData.rooms) ? roomsData.rooms : [],
      serverInfo,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Server unreachable';
    const mixedContent =
      typeof window !== 'undefined' &&
      window.location.protocol === 'https:' &&
      httpBase.startsWith('http://');
    return {
      ok: false,
      pingMs: 0,
      rooms: [],
      serverInfo: null,
      error: mixedContent
        ? 'Browser blocked http:// Wi-Fi server from an https:// page. Open the Wi-Fi http:// URL directly on LAN devices.'
        : message,
    };
  } finally {
    window.clearTimeout(timer);
  }
}

export type NetStatus = 'disconnected' | 'connecting' | 'connected';

export interface MultiplayerCallbacks {
  onStatusChange: (status: NetStatus) => void;
  onInit: (data: {
    roomId: string;
    seed: number;
    worldRules?: WorldRules;
    deltas: [string, number][];
    players: RemotePlayer[];
    chatHistory: ChatMessage[];
  }) => void;
  onPlayerJoined: (player: RemotePlayer) => void;
  onPlayerMoved: (player: RemotePlayer) => void;
  onPlayerLeft: (playerId: string) => void;
  onBlockUpdated: (x: number, y: number, z: number, blockId: number, senderId: string) => void;
  onChatMessage: (message: ChatMessage) => void;
  onVoiceState?: (playerId: string, micActive: boolean, speaking: boolean) => void;
  onVoiceSignal?: (fromId: string, signal: VoiceSignalPayload) => void;
  onVoiceAudio?: (fromId: string, pcmBase64: string, sampleRate: number) => void;
  onError?: (message: string) => void;
}

export class MultiplayerClient {
  private ws: WebSocket | null = null;
  private roomId = '';
  private seed = 999;
  private worldRules: WorldRules = 'survival';
  private playerName = 'Explorer';
  private playerColor = '#38bdf8';
  private serverUrl?: string;
  private playerSkin?: PlayerSkin;
  public playerId = '';
  private closedManually = false;
  private reconnectTimer: number | null = null;
  private pendingQueue: string[] = [];
  private failedAttempts = 0;
  private callbacks: MultiplayerCallbacks;

  constructor(callbacks: MultiplayerCallbacks) {
    this.callbacks = callbacks;
  }

  public connect(
    roomId: string,
    seed: number,
    playerName: string,
    playerColor: string,
    worldRules: WorldRules = 'survival',
    serverUrl?: string,
    skin?: PlayerSkin
  ): void {
    this.closedManually = false;
    this.roomId = roomId;
    this.seed = seed;
    this.worldRules = worldRules;
    this.playerName = playerName;
    this.playerColor = playerColor;
    this.serverUrl = serverUrl;
    this.playerSkin = skin;
    this.failedAttempts = 0;
    if (!this.playerId) {
      this.playerId = `p_${Math.random().toString(36).slice(2, 10)}`;
    }
    this.openSocket();
  }

  private openSocket(): void {
    if (this.closedManually) return;
    if (!window.location.protocol.startsWith('http') && !this.serverUrl) {
      this.callbacks.onStatusChange('disconnected');
      return;
    }

    this.callbacks.onStatusChange('connecting');
    const { wsUrl } = resolveServerEndpoints(this.serverUrl);
    try {
      this.ws = new WebSocket(wsUrl);
    } catch {
      this.callbacks.onError?.('WebSocket connection failed');
      this.callbacks.onStatusChange('disconnected');
      return;
    }

    this.ws.onopen = () => {
      this.failedAttempts = 0;
      this.callbacks.onStatusChange('connected');
      this.sendRaw({
        type: 'join',
        roomId: this.roomId,
        seed: this.seed,
        worldRules: this.worldRules,
        playerId: this.playerId,
        name: this.playerName,
        color: this.playerColor,
        skin: this.playerSkin,
      });
      while (this.pendingQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
        const msg = this.pendingQueue.shift();
        if (msg) this.ws.send(msg);
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(String(event.data)) as Record<string, unknown>;
        switch (data.type) {
          case 'init':
            this.callbacks.onInit(
              data as unknown as {
                roomId: string;
                seed: number;
                worldRules?: WorldRules;
                deltas: [string, number][];
                players: RemotePlayer[];
                chatHistory: ChatMessage[];
              }
            );
            break;
          case 'player:joined':
            this.callbacks.onPlayerJoined(data.player as RemotePlayer);
            break;
          case 'player:moved':
            this.callbacks.onPlayerMoved(data.player as RemotePlayer);
            break;
          case 'player:left':
            this.callbacks.onPlayerLeft(String(data.playerId));
            break;
          case 'block:updated':
            this.callbacks.onBlockUpdated(
              Number(data.x),
              Number(data.y),
              Number(data.z),
              Number(data.blockId),
              String(data.senderId)
            );
            break;
          case 'chat:message':
            this.callbacks.onChatMessage(data.message as ChatMessage);
            break;
          case 'voice:state':
            this.callbacks.onVoiceState?.(
              String(data.playerId),
              Boolean(data.micActive),
              Boolean(data.speaking)
            );
            break;
          case 'voice:signal':
            if (data.signal && typeof data.from === 'string') {
              this.callbacks.onVoiceSignal?.(data.from, data.signal as VoiceSignalPayload);
            }
            break;
          case 'voice:audio':
            if (typeof data.from === 'string' && typeof data.pcm === 'string') {
              this.callbacks.onVoiceAudio?.(
                data.from,
                data.pcm,
                Number(data.sampleRate) || 16000
              );
            }
            break;
          case 'error':
            this.callbacks.onError?.(String(data.message));
            break;
        }
      } catch {
        // Ignore malformed packets
      }
    };

    this.ws.onclose = () => {
      this.callbacks.onStatusChange('disconnected');
      if (!this.closedManually && this.failedAttempts < 4) {
        this.failedAttempts++;
        const delay = Math.min(8000, 1200 * this.failedAttempts);
        this.reconnectTimer = window.setTimeout(() => this.openSocket(), delay);
      }
    };

    this.ws.onerror = () => {
      // Handled via onclose
    };
  }

  private sendRaw(payload: unknown): void {
    const encoded = JSON.stringify(payload);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(encoded);
    } else if (this.pendingQueue.length < 40) {
      this.pendingQueue.push(encoded);
    }
  }

  public sendMove(
    x: number,
    y: number,
    z: number,
    yaw: number,
    pitch: number,
    heldBlock: number,
    biome: string
  ): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendRaw({
        type: 'player:move',
        x,
        y,
        z,
        yaw,
        pitch,
        heldBlock,
        biome,
      });
    }
  }

  public sendSkin(skin: PlayerSkin): void {
    this.playerSkin = skin;
    this.sendRaw({ type: 'player:skin', skin });
  }

  public sendBlockSet(x: number, y: number, z: number, blockId: number): void {
    this.sendRaw({ type: 'block:set', x, y, z, blockId });
  }

  public sendChat(text: string): void {
    this.sendRaw({ type: 'chat:send', text });
  }

  public sendVoiceState(micActive: boolean, speaking: boolean): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendRaw({ type: 'voice:state', micActive, speaking });
    }
  }

  public sendVoiceSignal(to: string, signal: VoiceSignalPayload): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendRaw({ type: 'voice:signal', to, signal });
    }
  }

  public sendVoiceAudio(pcm: string, sampleRate: number): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.sendRaw({ type: 'voice:audio', pcm, sampleRate });
    }
  }

  public disconnect(): void {
    this.closedManually = true;
    this.pendingQueue = [];
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.callbacks.onStatusChange('disconnected');
  }
}
