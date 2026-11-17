import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Check,
  Compass,
  Copy,
  Cpu,
  Crown,
  Download,
  Egg,
  Feather,
  Flame,
  Gamepad2,
  Globe,
  Heart,
  Maximize2,
  Minimize2,
  Palette,
  Play,
  RefreshCw,
  Server,
  Share2,
  Shield,
  Shuffle,
  Skull,
  Sparkles,
  Sword,
  Trash2,
  Users,
  Wifi,
  Wind,
} from 'lucide-react';
import type {
  PlayerSkin,
  RoomSummary,
  SavedServer,
  SavedWorld,
  ServerInfo,
  SessionConfig,
  WorldRules,
} from '../types';
import { BIOME_LIST } from '../game/biomes';
import { probeServer, resolveServerEndpoints } from '../game/net';
import { getAllTools, renderToolIcon } from '../game/tools';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(standalone);

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(ua));

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return { isInstallable: Boolean(deferredPrompt), isInstalled, isIOS, install };
}

function InstallPwaButton() {
  const { isInstallable, isInstalled, isIOS, install } = usePwaInstall();
  const [showIosGuide, setShowIosGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/40 bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/30 transition cursor-pointer"
      >
        <Download className="w-3.5 h-3.5" />
        Install Offline App
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIosGuide(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 bg-slate-900/90 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-800 transition cursor-pointer"
        >
          <Share2 className="w-3.5 h-3.5" />
          Install on iOS
        </button>

        {showIosGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4">
            <div className="w-full max-w-sm rounded-xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
              <h3 className="text-base font-bold text-white">Install VoxCraft on iOS</h3>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                1. Tap the <strong>Share</strong> button in Safari&apos;s toolbar.
                <br />
                2. Scroll down and tap <strong>Add to Home Screen</strong> to play offline anytime.
              </p>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="mt-4 w-full rounded-lg bg-emerald-500 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 transition cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}

const SAVED_SERVERS_KEY = 'voxcraft_saved_servers_v1';

const SEED_PRESETS = [
  { seed: 555, label: 'Seed 555 · Village Mango Birds', worldName: 'Village Mango Birds' },
  { seed: 999, label: 'Seed 999 · Royal Village & Castle', worldName: 'Royal Citadel 999' },
  { seed: 777, label: 'Seed 777 · Volcano & Villagers', worldName: 'Mount Ignis 777' },
  { seed: 888, label: 'Seed 888 · Sky World & Village', worldName: 'Cloudhaven 888' },
  { seed: 666, label: 'Seed 666 · Robot World & Mega Boss', worldName: 'Mecha Core 666' },
  { seed: 40492, label: 'Seed 40492 · Wild Frontier', worldName: 'Vox Frontier' },
];

function getPref(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function setPref(key: string, val: string): void {
  try {
    localStorage.setItem(key, val);
  } catch {
    // ignore
  }
}

function loadSavedServers(): SavedServer[] {
  const defaultHost: SavedServer = {
    id: 'default-host',
    name: 'VoxCraft Official / Host Server',
    address: 'same-origin',
    isDefaultHost: true,
  };
  try {
    const raw = localStorage.getItem(SAVED_SERVERS_KEY);
    if (!raw) return [defaultHost];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [defaultHost];
    return [
      defaultHost,
      ...parsed.filter(
        (s): s is SavedServer =>
          Boolean(s) &&
          typeof s.id === 'string' &&
          typeof s.name === 'string' &&
          typeof s.address === 'string' &&
          !s.isDefaultHost
      ),
    ];
  } catch {
    return [defaultHost];
  }
}

function saveServers(list: SavedServer[]): void {
  try {
    localStorage.setItem(
      SAVED_SERVERS_KEY,
      JSON.stringify(list.filter((s) => !s.isDefaultHost))
    );
  } catch {
    // ignore
  }
}

interface TitleScreenProps {
  savedWorlds: SavedWorld[];
  activeSkin: PlayerSkin;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenSkinEditor: () => void;
  onPreviewSeed: (seed: number) => void;
  onStartSession: (cfg: SessionConfig) => void;
  onDeleteWorld: (worldId: string) => void;
}

export function TitleScreen({
  savedWorlds,
  activeSkin,
  isFullscreen,
  onToggleFullscreen,
  onOpenSkinEditor,
  onPreviewSeed,
  onStartSession,
  onDeleteWorld,
}: TitleScreenProps) {
  const [tab, setTab] = useState<'solo' | 'multiplayer' | 'codex'>('solo');
  const [mpSubTab, setMpSubTab] = useState<'rooms' | 'servers'>('rooms');
  const [codexTab, setCodexTab] = useState<'realms' | 'gear' | 'biomes'>('realms');
  const [rules, setRules] = useState<WorldRules>('survival');
  const [worldName, setWorldName] = useState('Royal Citadel 999');
  const [seedInput, setSeedInput] = useState('999');
  const [roomId, setRoomId] = useState('citadel-999');
  const [playerName, setPlayerName] = useState(() => getPref('sc_name', 'Knight'));
  const [servers, setServers] = useState<SavedServer[]>(() => loadSavedServers());
  const [selectedServerId, setSelectedServerId] = useState('default-host');
  const [newServerName, setNewServerName] = useState('');
  const [newServerAddress, setNewServerAddress] = useState('');
  const [rooms, setRooms] = useState<RoomSummary[]>([]);
  const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);
  const [pingMs, setPingMs] = useState<number | null>(null);
  const [serverOk, setServerOk] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isProbing, setIsProbing] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const isHttp = typeof window !== 'undefined' && window.location.protocol.startsWith('http');
  const activeServer = servers.find((s) => s.id === selectedServerId) || servers[0];
  const tools = getAllTools();

  const refreshServer = useCallback(
    async (address: string) => {
      if (!isHttp && address === 'same-origin') {
        setServerOk(false);
        setRooms([]);
        return;
      }
      setIsProbing(true);
      setServerError(null);
      const res = await probeServer(address);
      setIsProbing(false);
      setServerOk(res.ok);
      setPingMs(res.ok ? res.pingMs : null);
      if (res.ok) {
        setRooms(res.rooms);
        if (res.serverInfo) setServerInfo(res.serverInfo);
      } else {
        setRooms([]);
        if (res.error) setServerError(res.error);
      }
    },
    [isHttp]
  );

  useEffect(() => {
    refreshServer(activeServer.address);
  }, [activeServer.address, refreshServer]);

  const selectSeedPreset = (seed: number, name?: string) => {
    setSeedInput(String(seed));
    if (name) setWorldName(name);
    if (seed === 555) setRoomId('mango-555');
    else if (seed === 999) setRoomId('citadel-999');
    else if (seed === 777) setRoomId('volcano-777');
    else if (seed === 888) setRoomId('skyworld-888');
    else if (seed === 666) setRoomId('robotworld-666');
    onPreviewSeed(seed);
  };

  const handleRandomSeed = () => {
    const s = Math.floor(1000 + Math.random() * 89999);
    setSeedInput(String(s));
    setWorldName(`Frontier ${s}`);
    onPreviewSeed(s);
  };

  const parsedSeed = (() => {
    const n = parseInt(seedInput, 10);
    return !Number.isFinite(n) || n <= 0 ? 999 : Math.min(999999, Math.abs(n));
  })();

  const is555 = parsedSeed === 555;
  const is999 = parsedSeed === 999;
  const is777 = parsedSeed === 777;
  const is888 = parsedSeed === 888;
  const is666 = parsedSeed === 666;

  const launchWorld = (
    overrideMode?: 'solo' | 'multiplayer',
    overrideSeed?: number,
    overrideName?: string,
    overrideRoom?: string,
    overrideRules?: WorldRules
  ) => {
    const cleanName = playerName.trim() || 'Explorer';
    setPref('sc_name', cleanName);
    setPref('sc_color', activeSkin.accentColor);

    const targetMode = overrideMode ?? (tab === 'multiplayer' ? 'multiplayer' : 'solo');
    const targetSeed = overrideSeed ?? parsedSeed;
    const targetRules = overrideRules ?? rules;
    const targetWorldName = overrideName ?? (worldName.trim() || `Seed ${targetSeed}`);

    if (targetMode === 'solo') {
      onStartSession({
        mode: 'solo',
        worldRules: targetRules,
        worldId: `world_${Date.now()}`,
        worldName: targetWorldName,
        seed: targetSeed,
        playerName: cleanName,
        playerColor: activeSkin.accentColor,
        skin: activeSkin,
      });
    } else {
      const targetRoom = (overrideRoom ?? roomId).trim() || 'citadel-999';
      onStartSession({
        mode: 'multiplayer',
        worldRules: targetRules,
        worldId: `mp_${targetRoom}`,
        worldName: targetRoom,
        seed: targetSeed,
        roomId: targetRoom,
        serverUrl: activeServer.address,
        playerName: cleanName,
        playerColor: activeSkin.accentColor,
        skin: activeSkin,
      });
    }
  };

  const handleAddServer = () => {
    const addr = newServerAddress.trim();
    if (!addr) return;
    const { displayAddress } = resolveServerEndpoints(addr);
    const added: SavedServer = {
      id: `srv_${Date.now()}`,
      name: newServerName.trim() || `Wi-Fi Server (${displayAddress})`,
      address: addr,
    };
    const next = [...servers, added];
    setServers(next);
    saveServers(next);
    setSelectedServerId(added.id);
    setNewServerName('');
    setNewServerAddress('');
  };

  const handleRemoveServer = (id: string) => {
    const next = servers.filter((s) => s.id !== id);
    setServers(next);
    saveServers(next);
    if (selectedServerId === id) setSelectedServerId('default-host');
  };

  const handleHostRoom = async () => {
    const code = roomId.trim() || `realm-${Math.floor(100 + Math.random() * 899)}`;
    setRoomId(code);
    const { httpBase } = resolveServerEndpoints(activeServer.address);
    try {
      await fetch(`${httpBase}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: code, seed: parsedSeed, worldRules: rules }),
      });
    } catch {
      // Fall back to WS room creation on connect
    }
    launchWorld('multiplayer', parsedSeed, code, code, rules);
  };

  const lanShareUrl =
    serverInfo?.urls && serverInfo.urls.length > 0
      ? serverInfo.urls[0]
      : typeof window !== 'undefined'
      ? window.location.origin
      : '';

  const handleCopyLanUrl = () => {
    if (!lanShareUrl) return;
    navigator.clipboard?.writeText(lanShareUrl).catch(() => {});
    setCopiedUrl(true);
    window.setTimeout(() => setCopiedUrl(false), 1800);
  };

  const launchRef = useRef(() => launchWorld());
  launchRef.current = () => launchWorld();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'BUTTON' && e.key === 'Enter') {
        e.preventDefault();
        launchRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const primaryCtaLabel = is555
    ? 'Enter Village Mango Birds (Seed 555)'
    : is999
    ? 'Enter Seed 999 Village & Castle'
    : is777
    ? 'Enter Seed 777 Volcano & Villagers'
    : is888
    ? 'Enter Seed 888 Sky World & Village'
    : is666
    ? 'Enter Seed 666 Robot World'
    : 'Create & Enter World';

  return (
    <div
      className="fixed inset-0 z-30 flex flex-col justify-between gap-3 overflow-y-auto p-3 [@media(max-height:540px)]:p-2 sm:p-5 md:p-7"
      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      {/* Top Header */}
      <header className="flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        <div className="pointer-events-auto flex items-center gap-3">
          <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl border border-amber-400/45 bg-slate-950/92 shadow-xl shrink-0">
            <Crown className="h-5 w-5 sm:h-6 sm:w-6 text-amber-400" />
          </div>
          <div className="min-w-0">
            <h1
              className="text-xl sm:text-3xl md:text-4xl font-black tracking-wider text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.85)] leading-none"
              style={{ fontFamily: "'Cinzel', Georgia, serif" }}
            >
              VOXCRAFT
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-slate-200 drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
              <span>Mango Birds, Royal, Volcano, Sky &amp; Robot Worlds</span>
              <span aria-hidden="true" className="hidden sm:inline">
                ·
              </span>
              <span className="hidden sm:inline">Wi-Fi &amp; Servers</span>
              <span aria-hidden="true" className="hidden sm:inline">
                ·
              </span>
              <span className="hidden sm:inline text-amber-300 font-semibold">
                Seeds 555, 999, 777, 888 &amp; 666
              </span>
            </div>
          </div>
        </div>

        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={onOpenSkinEditor}
            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/60 bg-slate-950/92 px-2.5 py-1.5 sm:px-3 sm:py-2 text-[11px] sm:text-xs font-bold text-cyan-200 hover:bg-cyan-500/20 transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <span
              className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-sm border border-white/40 shrink-0"
              style={{ backgroundColor: activeSkin.accentColor }}
            />
            <Palette className="w-3.5 h-3.5 text-cyan-300" />
            <span className="max-w-[110px] truncate">{activeSkin.name}</span>
          </button>

          <InstallPwaButton />

          <button
            type="button"
            onClick={onToggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950/92 px-2.5 py-1.5 sm:px-3 sm:py-2 text-[11px] sm:text-xs font-semibold text-slate-200 hover:border-amber-400/60 hover:text-amber-200 transition cursor-pointer whitespace-nowrap shrink-0"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Fullscreen</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="my-auto flex flex-col lg:flex-row items-stretch lg:items-end justify-between gap-4 sm:gap-5 shrink-0">
        {/* Main Session Card */}
        <section className="pointer-events-auto w-full max-w-xl rounded-2xl border border-slate-700/85 bg-slate-950/94 p-3.5 sm:p-5 shadow-2xl">
          {/* Primary Navigation Tabs */}
          <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-900 p-1 border border-slate-800">
            <button
              type="button"
              onClick={() => setTab('solo')}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 px-1 text-[11px] sm:text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                tab === 'solo' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Gamepad2 className="w-3.5 h-3.5 shrink-0" />
              <span>Solo Play</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('multiplayer')}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 px-1 text-[11px] sm:text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                tab === 'multiplayer'
                  ? 'bg-cyan-400 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Wifi className="w-3.5 h-3.5 shrink-0" />
              <span>Wi-Fi &amp; Servers</span>
            </button>
            <button
              type="button"
              onClick={() => setTab('codex')}
              className={`flex items-center justify-center gap-1.5 rounded-lg py-2 px-1 text-[11px] sm:text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                tab === 'codex'
                  ? 'bg-emerald-400 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span>Codex</span>
            </button>
          </div>

          {/* Curated Seed Realms & World Rules (Solo & Multiplayer tabs) */}
          {tab !== 'codex' && (
            <>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Seed 555 · Village Mango Birds */}
                <div
                  className={`sm:col-span-2 rounded-xl border p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition ${
                    is555
                      ? 'border-emerald-400 bg-emerald-500/12'
                      : 'border-emerald-500/40 bg-slate-900/95'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => selectSeedPreset(555, 'Village Mango Birds')}
                    className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer"
                  >
                    <div className="flex -space-x-2 shrink-0">
                      <img
                        src="/assets/aistudio/images-6_ac0baa34.jpeg"
                        alt="Mango Bird"
                        className="h-9 w-9 rounded-lg object-cover border border-amber-400/70 bg-slate-950"
                      />
                      <img
                        src="/assets/aistudio/file_00000000dc408211910a5a02ac8a6187_3959a3d6.png"
                        alt="Mango Guardian"
                        className="h-9 w-9 rounded-lg object-cover border border-emerald-400/70 bg-slate-950"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-300">
                        <Feather className="w-3.5 h-3.5 shrink-0 text-amber-300" />
                        <span className="truncate">Seed 555 · Village Mango Birds</span>
                      </div>
                      <p className="mt-0.5 text-[10px] text-slate-300 truncate">
                        Friendly Birds, Helpful Guardian Boss (Never Attacks!) &amp; TNT Yard
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      launchWorld(
                        tab === 'multiplayer' ? 'multiplayer' : 'solo',
                        555,
                        'Village Mango Birds',
                        'mango-555'
                      )
                    }
                    className="sm:w-auto w-full shrink-0 inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-400 to-amber-400 px-3 py-1.5 text-[11px] font-extrabold text-slate-950 hover:brightness-110 transition cursor-pointer whitespace-nowrap"
                  >
                    <Feather className="w-3 h-3" />
                    Visit Mango 555
                  </button>
                </div>

                {/* Seed 999 */}
                <div
                  className={`rounded-xl border p-2.5 flex flex-col justify-between gap-2 transition ${
                    is999
                      ? 'border-amber-400 bg-amber-500/10'
                      : 'border-amber-500/35 bg-slate-900/95'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => selectSeedPreset(999, 'Royal Citadel 999')}
                    className="min-w-0 text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-300">
                      <Sword className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Seed 999 · Royal Castle</span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-slate-300 truncate">
                      14 Houses, Villagers &amp; Giant King
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      launchWorld(
                        tab === 'multiplayer' ? 'multiplayer' : 'solo',
                        999,
                        'Royal Citadel 999',
                        'citadel-999'
                      )
                    }
                    className="w-full inline-flex items-center justify-center gap-1 rounded-lg bg-amber-400 px-2 py-1.5 text-[11px] font-extrabold text-slate-950 hover:bg-amber-300 transition cursor-pointer whitespace-nowrap"
                  >
                    <Sword className="w-3 h-3" />
                    Raid 999
                  </button>
                </div>

                {/* Seed 777 */}
                <div
                  className={`rounded-xl border p-2.5 flex flex-col justify-between gap-2 transition ${
                    is777
                      ? 'border-orange-400 bg-orange-500/10'
                      : 'border-orange-500/35 bg-slate-900/95'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => selectSeedPreset(777, 'Mount Ignis 777')}
                    className="min-w-0 text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-orange-300">
                      <Flame className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Seed 777 · Volcano</span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-slate-300 truncate">
                      Villager Outpost, Fire Mobs &amp; Ignis
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      launchWorld(
                        tab === 'multiplayer' ? 'multiplayer' : 'solo',
                        777,
                        'Mount Ignis 777',
                        'volcano-777'
                      )
                    }
                    className="w-full inline-flex items-center justify-center gap-1 rounded-lg bg-orange-500 px-2 py-1.5 text-[11px] font-extrabold text-slate-950 hover:bg-orange-400 transition cursor-pointer whitespace-nowrap"
                  >
                    <Flame className="w-3 h-3" />
                    Volcano 777
                  </button>
                </div>

                {/* Seed 888 */}
                <div
                  className={`rounded-xl border p-2.5 flex flex-col justify-between gap-2 transition ${
                    is888 ? 'border-sky-400 bg-sky-500/10' : 'border-sky-500/35 bg-slate-900/95'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => selectSeedPreset(888, 'Cloudhaven 888')}
                    className="min-w-0 text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-sky-300">
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Seed 888 · Sky World</span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-slate-300 truncate">
                      Sky Villagers, Airship &amp; Titan
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      launchWorld(
                        tab === 'multiplayer' ? 'multiplayer' : 'solo',
                        888,
                        'Cloudhaven 888',
                        'skyworld-888'
                      )
                    }
                    className="w-full inline-flex items-center justify-center gap-1 rounded-lg bg-sky-400 px-2 py-1.5 text-[11px] font-extrabold text-slate-950 hover:bg-sky-300 transition cursor-pointer whitespace-nowrap"
                  >
                    <Wind className="w-3 h-3" />
                    Sky 888
                  </button>
                </div>

                {/* Seed 666 */}
                <div
                  className={`rounded-xl border p-2.5 flex flex-col justify-between gap-2 transition ${
                    is666 ? 'border-cyan-400 bg-cyan-500/10' : 'border-cyan-500/35 bg-slate-900/95'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => selectSeedPreset(666, 'Mecha Core 666')}
                    className="min-w-0 text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-cyan-300">
                      <Cpu className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Seed 666 · Robot World</span>
                    </div>
                    <p className="mt-0.5 text-[10px] text-slate-300 truncate">
                      Cyber Bots &amp; 6.4m Super Boss
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      launchWorld(
                        tab === 'multiplayer' ? 'multiplayer' : 'solo',
                        666,
                        'Mecha Core 666',
                        'robotworld-666'
                      )
                    }
                    className="w-full inline-flex items-center justify-center gap-1 rounded-lg bg-cyan-400 px-2 py-1.5 text-[11px] font-extrabold text-slate-950 hover:bg-cyan-300 transition cursor-pointer whitespace-nowrap"
                  >
                    <Cpu className="w-3 h-3" />
                    Robot 666
                  </button>
                </div>
              </div>

              {/* World Rules Selector */}
              <div className="mt-2.5">
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    {
                      id: 'creative' as WorldRules,
                      label: 'Creative',
                      icon: Sparkles,
                      activeClass: 'border-cyan-400 bg-cyan-500/20 text-cyan-200',
                    },
                    {
                      id: 'survival' as WorldRules,
                      label: 'Survive',
                      icon: Shield,
                      activeClass: 'border-amber-400 bg-amber-500/20 text-amber-200',
                    },
                    {
                      id: 'hardcore' as WorldRules,
                      label: 'Hardcore',
                      icon: Skull,
                      activeClass: 'border-rose-500 bg-rose-500/25 text-rose-200',
                    },
                  ].map((modeOpt) => {
                    const Icon = modeOpt.icon;
                    const active = rules === modeOpt.id;
                    return (
                      <button
                        key={modeOpt.id}
                        type="button"
                        onClick={() => setRules(modeOpt.id)}
                        className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-1.5 text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                          active
                            ? modeOpt.activeClass
                            : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 shrink-0" />
                        <span>{modeOpt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* TAB: SOLO PLAY */}
          {tab === 'solo' && (
            <div className="mt-3 space-y-3">
              <p className="text-[11px] text-slate-400">
                {rules === 'creative'
                  ? 'Creative: Aether Sword/Pickaxe/Shovel, flight (F), unlimited blocks & spawn eggs, invincible.'
                  : rules === 'survival'
                  ? 'Survive: Iron starter kit + spawn eggs, night & fire monsters, forge Aether gear.'
                  : 'Hardcore: 1 Life permadeath, 1.5x enemy damage — defeat the Boss to claim victory.'}
              </p>

              {savedWorlds.length > 0 && (
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-slate-400">
                    <span>Offline Saved Worlds</span>
                    <span className="font-mono tabular-nums">{savedWorlds.length} saved</span>
                  </div>
                  <div className="max-h-32 space-y-1.5 overflow-y-auto pr-1">
                    {savedWorlds.map((w) => {
                      const wRules = w.worldRules || 'creative';
                      const wRulesLabel =
                        wRules === 'survival' ? 'Survive' : wRules === 'hardcore' ? 'Hardcore' : 'Creative';
                      return (
                        <div
                          key={w.id}
                          className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 hover:border-amber-400/50 transition"
                        >
                          <button
                            type="button"
                            onClick={() =>
                              onStartSession({
                                mode: 'solo',
                                worldRules: wRules,
                                worldId: w.id,
                                worldName: w.name,
                                seed: w.seed,
                                playerName,
                                playerColor: activeSkin.accentColor,
                                skin: activeSkin,
                              })
                            }
                            className="flex-1 text-left cursor-pointer min-w-0"
                          >
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-bold text-slate-100 truncate">{w.name}</span>
                              <span className="text-slate-400">·</span>
                              <span className="font-semibold text-amber-300">{wRulesLabel}</span>
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                              Seed {w.seed} · {w.discoveredBiomes.length}/5 Biomes · {w.modifiedCount} Edits
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteWorld(w.id)}
                            aria-label={`Delete ${w.name}`}
                            className="ml-2 rounded p-1.5 text-slate-500 hover:bg-red-500/20 hover:text-red-300 transition cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-1.5">
                {SEED_PRESETS.map((preset) => (
                  <button
                    key={preset.seed}
                    type="button"
                    onClick={() => selectSeedPreset(preset.seed, preset.worldName)}
                    className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer whitespace-nowrap ${
                      parsedSeed === preset.seed
                        ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                        : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleRandomSeed}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:border-cyan-400 hover:text-cyan-200 transition cursor-pointer whitespace-nowrap"
                >
                  <Shuffle className="w-3 h-3" /> Random
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    World Name
                  </label>
                  <input
                    value={worldName}
                    onChange={(e) => setWorldName(e.target.value)}
                    maxLength={24}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white outline-none focus:border-amber-400"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    World Seed
                  </label>
                  <input
                    value={seedInput}
                    onChange={(e) => {
                      setSeedInput(e.target.value);
                      const n = parseInt(e.target.value, 10);
                      if (Number.isFinite(n) && n > 0) {
                        onPreviewSeed(Math.min(999999, Math.abs(n)));
                      }
                    }}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-white font-mono tabular-nums outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => launchWorld('solo')}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-sm font-extrabold text-slate-950 shadow-lg hover:bg-emerald-400 transition cursor-pointer whitespace-nowrap"
              >
                <Play className="w-4 h-4 shrink-0" />
                <span className="truncate">{primaryCtaLabel}</span>
              </button>
            </div>
          )}

          {/* TAB: MULTIPLAYER & WI-FI LAN */}
          {tab === 'multiplayer' && (
            <div className="mt-3 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 bg-slate-900/90 p-1.5">
                <div className="grid grid-cols-2 gap-1 flex-1 min-w-[200px]">
                  <button
                    type="button"
                    onClick={() => setMpSubTab('rooms')}
                    className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-2 text-[11px] font-bold transition cursor-pointer whitespace-nowrap ${
                      mpSubTab === 'rooms'
                        ? 'bg-slate-800 text-cyan-200 border border-cyan-400/50'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 shrink-0" />
                    <span>Rooms ({rooms.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMpSubTab('servers')}
                    className={`flex items-center justify-center gap-1.5 rounded-lg py-1.5 px-2 text-[11px] font-bold transition cursor-pointer whitespace-nowrap ${
                      mpSubTab === 'servers'
                        ? 'bg-slate-800 text-cyan-200 border border-cyan-400/50'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Server className="w-3.5 h-3.5 shrink-0" />
                    <span>Wi-Fi &amp; Servers ({servers.length})</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 px-1.5 text-[10px] font-mono tabular-nums">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      serverOk ? 'bg-emerald-400' : 'bg-rose-400'
                    }`}
                  />
                  <span className="text-slate-300 truncate max-w-[130px]">
                    {activeServer.isDefaultHost ? 'Host Server' : activeServer.name}
                  </span>
                  <span className={serverOk ? 'text-emerald-300' : 'text-rose-300'}>
                    {serverOk ? `${pingMs ?? 1}ms` : 'Offline'}
                  </span>
                </div>
              </div>

              {mpSubTab === 'rooms' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Explorer Name
                      </label>
                      <input
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        maxLength={18}
                        className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white outline-none focus:border-cyan-400"
                      />
                    </div>
                    <div>
                      <span className="block text-[11px] font-semibold text-slate-400 mb-1">
                        Equipped Character Skin
                      </span>
                      <button
                        type="button"
                        onClick={onOpenSkinEditor}
                        className="flex w-full items-center justify-between gap-2 rounded-lg border border-cyan-400/50 bg-slate-900 px-3 py-1.5 text-xs font-bold text-cyan-200 hover:bg-cyan-500/15 cursor-pointer"
                      >
                        <span className="flex items-center gap-2 truncate">
                          <span
                            className="h-3 w-3 rounded-sm border border-white/40 shrink-0"
                            style={{ backgroundColor: activeSkin.accentColor }}
                          />
                          <span className="truncate">{activeSkin.name}</span>
                        </span>
                        <span className="text-[10px] text-cyan-400 shrink-0">Edit Skin</span>
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-2.5 space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-200">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-emerald-400" />
                        Live Server Rooms
                      </span>
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-[10px] text-slate-400 tabular-nums">
                          {rooms.reduce((sum, r) => sum + r.playerCount, 0)} Online
                        </span>
                        <button
                          type="button"
                          onClick={() => refreshServer(activeServer.address)}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-cyan-300 hover:text-cyan-200 cursor-pointer"
                        >
                          <RefreshCw className={`w-3 h-3 ${isProbing ? 'animate-spin' : ''}`} />
                          Refresh
                        </button>
                      </div>
                    </div>

                    {rooms.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto pr-0.5">
                        {rooms.map((rm) => (
                          <button
                            key={rm.id}
                            type="button"
                            onClick={() => {
                              setRoomId(rm.id);
                              setSeedInput(String(rm.seed));
                              setRules(rm.worldRules);
                              launchWorld('multiplayer', rm.seed, rm.id, rm.id, rm.worldRules);
                            }}
                            className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left transition cursor-pointer ${
                              roomId === rm.id
                                ? 'border-cyan-400 bg-cyan-500/15'
                                : 'border-slate-800 bg-slate-950 hover:border-cyan-400/60'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-100 truncate">{rm.id}</div>
                              <div className="text-[10px] font-mono text-slate-400">
                                Seed {rm.seed} · {rm.worldRules}
                              </div>
                            </div>
                            <span className="inline-flex items-center gap-1 rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] text-cyan-300 shrink-0 tabular-nums">
                              <Users className="w-2.5 h-2.5" /> {rm.playerCount}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 py-1">
                        {serverError || 'No rooms found yet — host one below!'}
                      </p>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-12 gap-1.5 pt-2 border-t border-slate-800">
                      <input
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                        maxLength={24}
                        placeholder="Room code"
                        className="col-span-1 sm:col-span-5 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-400"
                      />
                      <input
                        value={seedInput}
                        onChange={(e) => setSeedInput(e.target.value)}
                        placeholder="Seed"
                        className="col-span-1 sm:col-span-3 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white font-mono tabular-nums outline-none focus:border-cyan-400"
                      />
                      <button
                        type="button"
                        onClick={handleHostRoom}
                        className="col-span-2 sm:col-span-4 rounded-lg border border-emerald-400/50 bg-emerald-500/15 px-3 py-1.5 text-xs font-bold text-emerald-200 hover:bg-emerald-500/25 cursor-pointer whitespace-nowrap"
                      >
                        Host / Create Room
                      </button>
                    </div>
                  </div>
                </>
              )}

              {mpSubTab === 'servers' && (
                <>
                  <div className="rounded-xl border border-cyan-500/35 bg-slate-900/95 p-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-cyan-300">
                          <Wifi className="w-3.5 h-3.5 shrink-0" />
                          <span>Local Wi-Fi / LAN Host URL</span>
                        </div>
                        <div className="mt-0.5 truncate font-mono text-[11px] text-slate-200">
                          {lanShareUrl || 'Run live server to share Wi-Fi URL'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyLanUrl}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 hover:border-cyan-400 cursor-pointer shrink-0"
                      >
                        {copiedUrl ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> Copy URL
                          </>
                        )}
                      </button>
                    </div>

                    {serverInfo?.lanIps && serverInfo.lanIps.length > 0 && (
                      <p className="mt-1.5 text-[10px] text-slate-400">
                        Same-Wi-Fi players can open{' '}
                        <span className="font-mono text-slate-200">{serverInfo.urls[0]}</span> or add{' '}
                        <span className="font-mono text-slate-200">
                          {serverInfo.lanIps[0]}:{serverInfo.port}
                        </span>{' '}
                        below.
                      </p>
                    )}
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900 p-2.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-200">
                        <Server className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Saved Servers ({servers.length})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => refreshServer(activeServer.address)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-cyan-300 hover:text-cyan-200 cursor-pointer"
                      >
                        <RefreshCw className={`w-3 h-3 ${isProbing ? 'animate-spin' : ''}`} />
                        {isProbing ? 'Pinging...' : 'Ping & Refresh'}
                      </button>
                    </div>

                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-0.5">
                      {servers.map((srv) => {
                        const selected = srv.id === activeServer.id;
                        return (
                          <div
                            key={srv.id}
                            className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-xs ${
                              selected
                                ? 'border-cyan-400 bg-cyan-500/15 text-white'
                                : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-600'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedServerId(srv.id)}
                              className="flex flex-1 items-center justify-between gap-2 text-left cursor-pointer min-w-0"
                            >
                              <div className="min-w-0">
                                <div className="font-bold truncate">{srv.name}</div>
                                <div className="text-[10px] font-mono text-slate-400 truncate">
                                  {srv.isDefaultHost ? 'Hosted Server (Auto)' : srv.address}
                                </div>
                              </div>
                              {selected && (
                                <span
                                  className={`shrink-0 font-mono text-[10px] font-bold tabular-nums ${
                                    serverOk ? 'text-emerald-300' : 'text-rose-300'
                                  }`}
                                >
                                  {serverOk ? `${pingMs ?? 1}ms` : 'Offline'}
                                </span>
                              )}
                            </button>
                            {!srv.isDefaultHost && (
                              <button
                                type="button"
                                aria-label={`Remove ${srv.name}`}
                                onClick={() => handleRemoveServer(srv.id)}
                                className="rounded p-1 text-slate-500 hover:text-rose-400 cursor-pointer shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-1.5 pt-2 border-t border-slate-800">
                      <input
                        value={newServerName}
                        onChange={(e) => setNewServerName(e.target.value)}
                        placeholder="Label (e.g. Home Wi-Fi)"
                        maxLength={24}
                        className="sm:col-span-4 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyan-400"
                      />
                      <input
                        value={newServerAddress}
                        onChange={(e) => setNewServerAddress(e.target.value)}
                        placeholder="IP:Port or wss:// (e.g. 192.168.1.42:3000)"
                        className="sm:col-span-5 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1.5 text-xs text-white font-mono outline-none focus:border-cyan-400"
                      />
                      <button
                        type="button"
                        onClick={handleAddServer}
                        className="sm:col-span-3 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-bold text-cyan-300 hover:bg-slate-700 cursor-pointer whitespace-nowrap"
                      >
                        + Add Server
                      </button>
                    </div>

                    {serverError && (
                      <div className="rounded-lg border border-rose-500/40 bg-rose-950/30 px-2.5 py-1.5 text-[11px] text-rose-200">
                        {serverError}
                      </div>
                    )}
                  </div>
                </>
              )}

              <button
                type="button"
                onClick={() => launchWorld('multiplayer')}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-cyan-400 py-2.5 px-3 text-sm font-extrabold text-slate-950 shadow-lg hover:bg-cyan-300 transition cursor-pointer whitespace-nowrap"
              >
                <Globe className="w-4 h-4 shrink-0" />
                <span className="truncate">
                  Connect to {activeServer.isDefaultHost ? 'Server' : activeServer.name} (
                  {roomId || 'citadel-999'})
                </span>
              </button>
            </div>
          )}

          {/* TAB: CODEX */}
          {tab === 'codex' && (
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-3 gap-1 rounded-xl border border-slate-800 bg-slate-900/90 p-1">
                <button
                  type="button"
                  onClick={() => setCodexTab('realms')}
                  className={`rounded-lg py-1.5 px-2 text-[11px] font-bold transition cursor-pointer whitespace-nowrap ${
                    codexTab === 'realms'
                      ? 'bg-slate-800 text-amber-300 border border-amber-400/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Bosses &amp; Seeds
                </button>
                <button
                  type="button"
                  onClick={() => setCodexTab('gear')}
                  className={`rounded-lg py-1.5 px-2 text-[11px] font-bold transition cursor-pointer whitespace-nowrap ${
                    codexTab === 'gear'
                      ? 'bg-slate-800 text-cyan-300 border border-cyan-400/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Gear &amp; Eggs
                </button>
                <button
                  type="button"
                  onClick={() => setCodexTab('biomes')}
                  className={`rounded-lg py-1.5 px-2 text-[11px] font-bold transition cursor-pointer whitespace-nowrap ${
                    codexTab === 'biomes'
                      ? 'bg-slate-800 text-emerald-300 border border-emerald-400/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  5 Biomes
                </button>
              </div>

              {codexTab === 'realms' && (
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  <div className="rounded-xl border border-emerald-400/55 bg-slate-900 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                        <Feather className="w-4 h-4 shrink-0 text-amber-300" />
                        <span>Mango Guardian · Seed 555 Village Mango Birds</span>
                      </div>
                      <span className="font-mono text-[11px] text-emerald-300 tabular-nums shrink-0">
                        Friendly · 620 HP
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-300">
                      A peaceful sanctuary populated with Mango Birds, Suncrest Birds, and the friendly
                      Cyber-Feathered Mango Guardian Boss. It NEVER attacks you — instead it heals you,
                      gifts free TNT, Mango Fruit &amp; Emeralds, and defends the village from monsters!
                    </p>
                  </div>

                  <div className="rounded-xl border border-cyan-400/50 bg-slate-900 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                        <Cpu className="w-4 h-4 shrink-0" />
                        <span>OMEGA MECHATRON · Seed 666 Super Boss</span>
                      </div>
                      <span className="font-mono text-[11px] text-rose-300 tabular-nums shrink-0">
                        850 HP · 6.4m
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-300">
                      A colossal Robot Metropolis packed with Cyber Androids, Big Scout Droids, Scout
                      Droids, Villagers, Laser Drones, Mecha Troopers, and Cyber Reactors. Battle the
                      6.4-block Super Boss inside the North Laser Arena!
                    </p>
                  </div>

                  <div className="rounded-xl border border-amber-500/40 bg-slate-900 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                        <Crown className="w-4 h-4 shrink-0" />
                        <span>King Aethelgard · Seed 999 Boss</span>
                      </div>
                      <span className="font-mono text-[11px] text-rose-300 tabular-nums shrink-0">
                        460 HP
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-300">
                      March North down King&apos;s Avenue past bustling Villagers &amp; 14-house
                      village into Castle Crimsonkeep. Giant Boss scaling with Royal Guard summons at
                      50% HP.
                    </p>
                  </div>

                  <div className="rounded-xl border border-orange-500/45 bg-slate-900 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-orange-300">
                        <Flame className="w-4 h-4 shrink-0" />
                        <span>Ignis Rex · Seed 777 Volcano Boss</span>
                      </div>
                      <span className="font-mono text-[11px] text-orange-300 tabular-nums shrink-0">
                        420 HP
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-300">
                      Start beside the safe Volcano Villager Outpost and climb the lava-streaked caldera
                      to battle towering Ignis Rex, Ember Imps, and Pyro Golems.
                    </p>
                  </div>

                  <div className="rounded-xl border border-sky-400/45 bg-slate-900 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-sky-300">
                        <Wind className="w-4 h-4 shrink-0" />
                        <span>Zephyrus, Sky Titan · Seed 888 Sky World</span>
                      </div>
                      <span className="font-mono text-[11px] text-sky-300 tabular-nums shrink-0">
                        440 HP
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-300">
                      Explore Cloudhaven Sky Village with Villagers, Windmill, Tavern, Forge, Sky
                      Airship Galleon, Bounce Park, and Stargazer Observatory. Challenge giant Zephyrus
                      at the North Sky Citadel!
                    </p>
                  </div>
                </div>
              )}

              {codexTab === 'gear' && (
                <div className="space-y-2.5">
                  <div className="rounded-xl border border-emerald-500/40 bg-slate-900 p-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                      <Egg className="w-4 h-4 shrink-0" />
                      <span>23 Spawn Eggs &amp; 57 Blocks (incl. TNT!)</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-300">
                      Open the Palette (Grid icon) to equip Mango Bird Eggs, Suncrest Bird Eggs, Mango
                      Guardian Boss Eggs, TNT (Right-Click w/ a tool to ignite chain explosions!),
                      Mango Fruit, Honeycomb, Spring Slime, Diamond/Emerald/Ruby/Amethyst Blocks, and more!
                    </p>
                  </div>

                  <div>
                    <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-200">
                      <Sword className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Swords, Pickaxes &amp; Shovels</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {tools.map((tool) => (
                        <div
                          key={tool.id}
                          className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900 p-2"
                        >
                          <img src={renderToolIcon(tool)} alt={tool.name} className="h-6 w-6 shrink-0" />
                          <div className="min-w-0">
                            <div className="truncate text-[11px] font-bold text-slate-100">
                              {tool.name}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 tabular-nums">
                              {tool.kind === 'sword' ? `${tool.damage} DMG` : `${tool.miningSpeed}x Speed`}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {codexTab === 'biomes' && (
                <div>
                  <div className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-200">
                    <Compass className="w-3.5 h-3.5 text-emerald-400" />
                    <span>5 Physics-Driven Biomes (Warp via Portals)</span>
                  </div>
                  <div className="space-y-1.5">
                    {BIOME_LIST.map((b) => (
                      <div
                        key={b.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-[11px]"
                      >
                        <span className="font-semibold text-slate-100">{b.name}</span>
                        <span className="text-slate-400 text-right">{b.mechanicLabel}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Right Spotlight Aside */}
        <aside className="pointer-events-auto hidden lg:flex [@media(max-height:600px)]:hidden flex-col gap-2.5 w-80 rounded-2xl border border-slate-700/85 bg-slate-950/92 p-4 shadow-2xl">
          {is555 ? (
            <>
              <div className="flex items-center justify-between">
                <span
                  className="text-xs font-bold tracking-wide text-emerald-300"
                  style={{ fontFamily: "'Cinzel', Georgia, serif" }}
                >
                  Village Mango Birds
                </span>
                <span className="font-mono text-[11px] text-amber-300 tabular-nums">Seed 555</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="overflow-hidden rounded-xl border border-amber-400/50 bg-slate-900">
                  <img
                    src="/assets/aistudio/images-6_ac0baa34.jpeg"
                    alt="Mango Bird"
                    className="h-24 w-full object-cover"
                  />
                  <div className="px-2 py-1 text-[10px] font-bold text-amber-200 text-center">
                    Mango Birds
                  </div>
                </div>
                <div className="overflow-hidden rounded-xl border border-emerald-400/50 bg-slate-900">
                  <img
                    src="/assets/aistudio/file_00000000dc408211910a5a02ac8a6187_3959a3d6.png"
                    alt="Mango Guardian Boss"
                    className="h-24 w-full object-cover"
                  />
                  <div className="px-2 py-1 text-[10px] font-bold text-emerald-200 text-center">
                    Guardian Boss
                  </div>
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Friendly Boss</span>
                  <span className="inline-flex items-center gap-1 font-mono text-emerald-300">
                    <Heart className="w-3 h-3" /> Helps &amp; Gifts You
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Sanctuary Flock</span>
                  <span className="font-mono text-amber-200 tabular-nums">Mango &amp; Sun Birds</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>57 Building Blocks</span>
                  <span className="font-mono text-rose-300 tabular-nums">Working TNT + Gems</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => launchWorld('solo', 555, 'Village Mango Birds')}
                className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/60 bg-emerald-500/20 py-2 text-xs font-extrabold text-emerald-200 hover:bg-emerald-500/35 transition cursor-pointer whitespace-nowrap"
              >
                <Feather className="w-3.5 h-3.5" /> Launch Village Mango Birds
              </button>
            </>
          ) : is666 ? (
            <>
              <div className="flex items-center justify-between">
                <span
                  className="text-xs font-bold tracking-wide text-cyan-300"
                  style={{ fontFamily: "'Cinzel', Georgia, serif" }}
                >
                  Mecha Core Robot World
                </span>
                <span className="font-mono text-[11px] text-slate-400 tabular-nums">Seed 666</span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Cyber City</span>
                  <span className="font-mono text-slate-100 tabular-nums">8 Factories + Labs</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Robots &amp; Villagers</span>
                  <span className="font-mono text-cyan-200 tabular-nums">Androids &amp; Big Droids</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Super Big Boss</span>
                  <span className="font-mono text-rose-300 tabular-nums">Omega Mechatron (850 HP)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Spawn Eggs</span>
                  <span className="font-mono text-emerald-300 tabular-nums">20 Hatchable Eggs</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => launchWorld('solo', 666, 'Mecha Core 666')}
                className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-cyan-400/60 bg-cyan-500/20 py-2 text-xs font-extrabold text-cyan-200 hover:bg-cyan-500/35 transition cursor-pointer whitespace-nowrap"
              >
                <Cpu className="w-3.5 h-3.5" /> Launch Seed 666 Robot World
              </button>
            </>
          ) : is888 ? (
            <>
              <div className="flex items-center justify-between">
                <span
                  className="text-xs font-bold tracking-wide text-sky-300"
                  style={{ fontFamily: "'Cinzel', Georgia, serif" }}
                >
                  Cloudhaven Sky World
                </span>
                <span className="font-mono text-[11px] text-slate-400 tabular-nums">Seed 888</span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Sky Village</span>
                  <span className="font-mono text-slate-100 tabular-nums">Windmill + 8 Villagers</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Floating Isles</span>
                  <span className="font-mono text-sky-200 tabular-nums">Airship, Park &amp; Dome</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Sky Creatures</span>
                  <span className="font-mono text-cyan-300 tabular-nums">Griffin &amp; Storm Sentinel</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Boss Target</span>
                  <span className="font-mono text-amber-300 tabular-nums">Zephyrus (440 HP)</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => launchWorld('solo', 888, 'Cloudhaven 888')}
                className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-sky-400/60 bg-sky-500/20 py-2 text-xs font-extrabold text-sky-200 hover:bg-sky-500/35 transition cursor-pointer whitespace-nowrap"
              >
                <Wind className="w-3.5 h-3.5" /> Launch Seed 888 Sky World
              </button>
            </>
          ) : is777 ? (
            <>
              <div className="flex items-center justify-between">
                <span
                  className="text-xs font-bold tracking-wide text-orange-300"
                  style={{ fontFamily: "'Cinzel', Georgia, serif" }}
                >
                  Mount Ignis Caldera
                </span>
                <span className="font-mono text-[11px] text-slate-400 tabular-nums">Seed 777</span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Safe Outpost</span>
                  <span className="font-mono text-slate-100 tabular-nums">2 Houses + 5 Villagers</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Fire Monsters</span>
                  <span className="font-mono text-orange-300 tabular-nums">Ember Imp &amp; Pyro Golem</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Boss Target</span>
                  <span className="font-mono text-rose-300 tabular-nums">Ignis Rex (420 HP)</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Spawn Eggs</span>
                  <span className="font-mono text-emerald-300 tabular-nums">20 Hatchable Eggs</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => launchWorld('solo', 777, 'Mount Ignis 777')}
                className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-orange-400/60 bg-orange-500/20 py-2 text-xs font-extrabold text-orange-200 hover:bg-orange-500/35 transition cursor-pointer whitespace-nowrap"
              >
                <Flame className="w-3.5 h-3.5" /> Launch Seed 777 Volcano
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span
                  className="text-xs font-bold tracking-wide text-amber-300"
                  style={{ fontFamily: "'Cinzel', Georgia, serif" }}
                >
                  Royal Siege Objective
                </span>
                <span className="font-mono text-[11px] text-slate-400 tabular-nums">Seed 999</span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Grand Village</span>
                  <span className="font-mono text-slate-100 tabular-nums">14 Houses + Forge</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Castle Crimsonkeep</span>
                  <span className="font-mono text-slate-100 tabular-nums">4 Towers + Keep</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Boss Target</span>
                  <span className="font-mono text-rose-300 tabular-nums">King Aethelgard</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Online Mode</span>
                  <span className="font-mono text-cyan-300 tabular-nums">Wi-Fi LAN + Servers</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => launchWorld('solo', 999, 'Royal Citadel 999')}
                className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-400/60 bg-amber-500/20 py-2 text-xs font-extrabold text-amber-200 hover:bg-amber-500/35 transition cursor-pointer whitespace-nowrap"
              >
                <Crown className="w-3.5 h-3.5" /> Launch Seed 999 Boss Siege
              </button>
            </>
          )}
        </aside>
      </div>

      {/* Controls Footer */}
      <footer className="hidden sm:block [@media(max-height:540px)]:hidden text-center text-[11px] font-mono tracking-wide text-slate-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] shrink-0">
        WASD Move · Space Jump · LMB Mine / Attack · RMB Place / Hatch Egg · 1–9 Hotbar · P Portal · F
        Fly · Esc Pause
      </footer>
    </div>
  );
}
