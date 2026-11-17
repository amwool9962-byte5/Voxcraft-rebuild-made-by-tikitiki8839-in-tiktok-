import { useCallback, useEffect, useRef, useState } from 'react';
import type { ChatMessage, HudState, MicMode, PlayerSkin, RemotePlayer, SavedWorld, SessionConfig } from './types';
import { ChatOverlay } from './components/ChatOverlay';
import { Hud } from './components/Hud';
import { OfflineBanner } from './components/OfflineBanner';
import { PauseModal } from './components/PauseModal';
import { SkinEditor } from './components/SkinEditor';
import { TitleScreen } from './components/TitleScreen';
import { TouchControls } from './components/TouchControls';
import { soundEngine } from './game/audio';
import { BIOMES } from './game/biomes';
import { DEFAULT_HOTBAR } from './game/blocks';
import { MultiplayerClient, type NetStatus } from './game/net';
import { loadActiveSkin, saveActiveSkin } from './game/skins';
import { deleteSavedWorld, listSavedWorlds, loadSavedWorld, saveWorldOffline } from './game/storage';
import { VoiceChatManager, type VoiceSnapshot } from './game/voice';
import { VoxelEngine } from './game/VoxelEngine';

const INITIAL_VOICE: VoiceSnapshot = {
  micMode: 'off',
  pttHeld: false,
  transmitting: false,
  speaking: false,
  micLevel: 0,
  selfMonitor: false,
  masterVolume: 1,
  error: null,
  peers: [],
};

const INITIAL_HUD: HudState = {
  worldRules: 'creative',
  biome: BIOMES.verdant_basin,
  discoveredBiomes: ['verdant_basin'],
  coords: [8, 34, 8],
  health: 100,
  maxHealth: 100,
  stamina: 100,
  flyMode: false,
  isDead: false,
  timeOfDay: 0.28,
  targetBlock: null,
  targetCreature: null,
  animalCount: 0,
  hostileCount: 0,
  hotbar: [...DEFAULT_HOTBAR],
  inventory: {},
  selectedSlot: 0,
  pointerLocked: false,
  fps: 60,
  onlineCount: 1,
  toast: null,
  portalCharge: 0,
  portalDestName: null,
  kingBoss: null,
  bossDefeated: false,
};

export default function App() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<VoxelEngine | null>(null);
  const netRef = useRef<MultiplayerClient | null>(null);
  const voiceRef = useRef<VoiceChatManager | null>(null);
  const remotePlayersRef = useRef<Map<string, RemotePlayer>>(new Map());

  const [screen, setScreen] = useState<'title' | 'playing'>('title');
  const [paused, setPaused] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const chatOpenRef = useRef(false);
  chatOpenRef.current = chatOpen;
  const [unreadChat, setUnreadChat] = useState(0);
  const [hudCollapsed, setHudCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [session, setSession] = useState<SessionConfig | null>(null);
  const sessionRef = useRef<SessionConfig | null>(null);
  sessionRef.current = session;

  const [savedWorlds, setSavedWorlds] = useState<SavedWorld[]>([]);
  const [hud, setHud] = useState<HudState>(INITIAL_HUD);
  const [muted, setMuted] = useState(false);
  const [renderDistance, setRenderDistance] = useState(3);
  const [touchEnabled, setTouchEnabled] = useState(
    () => typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)
  );
  const [netStatus, setNetStatus] = useState<NetStatus>('disconnected');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [voice, setVoice] = useState<VoiceSnapshot>(INITIAL_VOICE);
  const [activeSkin, setActiveSkin] = useState<PlayerSkin>(() => loadActiveSkin());
  const [skinEditorOpen, setSkinEditorOpen] = useState(false);
  const skinRef = useRef<PlayerSkin>(activeSkin);
  skinRef.current = activeSkin;

  const toggleFullscreen = useCallback(async () => {
    const doc = document as Document & {
      webkitFullscreenElement?: Element | null;
      webkitExitFullscreen?: () => Promise<void>;
    };
    if (doc.fullscreenElement || doc.webkitFullscreenElement) {
      try {
        if (doc.exitFullscreen) await doc.exitFullscreen();
        else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
      } catch {
        // ignore
      }
      return;
    }

    const el = (rootRef.current || document.documentElement) as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void>;
    };
    try {
      if (el.requestFullscreen) await el.requestFullscreen();
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen();
    } catch {
      setHudCollapsed((v) => !v);
      engineRef.current?.showToast('Fullscreen blocked by host frame — toggled Cinema View');
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element | null };
      setIsFullscreen(Boolean(doc.fullscreenElement || doc.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, []);

  const refreshSavedWorlds = useCallback(async () => {
    const list = await listSavedWorlds();
    setSavedWorlds(list);
  }, []);

  useEffect(() => {
    refreshSavedWorlds();
  }, [refreshSavedWorlds]);

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const voiceMgr = new VoiceChatManager({
      onUpdate: (snap) => setVoice(snap),
      onSendState: (micActive, speaking) => {
        if (sessionRef.current?.mode === 'multiplayer') {
          netRef.current?.sendVoiceState(micActive, speaking);
        }
      },
      onSendSignal: (to, signal) => {
        if (sessionRef.current?.mode === 'multiplayer') {
          netRef.current?.sendVoiceSignal(to, signal);
        }
      },
      onSendAudio: (pcm, sampleRate) => {
        if (sessionRef.current?.mode === 'multiplayer') {
          netRef.current?.sendVoiceAudio(pcm, sampleRate);
        }
      },
    });
    voiceRef.current = voiceMgr;

    const handleSetMicMode = async (mode: MicMode) => {
      const ok = await voiceMgr.setMicMode(mode);
      if (ok) {
        engine.showToast(
          mode === 'off'
            ? 'Microphone muted'
            : mode === 'open'
            ? 'Open Mic active — speaking live!'
            : 'Push-to-Talk ready — Hold [V] to speak'
        );
      } else {
        const err = voiceMgr.getSnapshot().error;
        if (err) engine.showToast(err);
      }
    };

    const engine = new VoxelEngine(container, {
      onHudUpdate: (nextHud) => setHud(nextHud),
      onBlockSet: (x, y, z, blockId) => {
        if (sessionRef.current?.mode === 'multiplayer') {
          netRef.current?.sendBlockSet(x, y, z, blockId);
        }
      },
      onPlayerMove: (x, y, z, yaw, pitch, heldBlock, biome) => {
        if (sessionRef.current?.mode === 'multiplayer') {
          netRef.current?.sendMove(x, y, z, yaw, pitch, heldBlock, biome);
        }
      },
      onPauseRequest: () => {
        setPaused((prev) => {
          const next = !prev;
          engine.setPaused(next);
          return next;
        });
      },
      onChatRequest: () => {
        setUnreadChat(0);
        setChatOpen(true);
      },
      onToggleMicRequest: () => {
        const cur = voiceMgr.getSnapshot().micMode;
        void handleSetMicMode(cur === 'off' ? 'open' : 'off');
      },
      onPushToTalkChange: (held) => {
        const snap = voiceMgr.getSnapshot();
        if (held && snap.micMode === 'off') {
          void voiceMgr.setMicMode('ptt').then((ok) => {
            if (ok) voiceMgr.setPushToTalkHeld(true);
            else {
              const err = voiceMgr.getSnapshot().error;
              if (err) engine.showToast(err);
            }
          });
          return;
        }
        voiceMgr.setPushToTalkHeld(held);
      },
      onToggleHud: () => setHudCollapsed((v) => !v),
      onToggleFullscreen: () => toggleFullscreen(),
    });

    engineRef.current = engine;
    engine.setLocalSkin(skinRef.current);

    const net = new MultiplayerClient({
      onStatusChange: (status) => setNetStatus(status),
      onInit: (data) => {
        const rules = data.worldRules ?? sessionRef.current?.worldRules ?? 'creative';
        engine.resetWorld(data.seed, data.deltas, undefined, undefined, undefined, rules);
        engine.syncRemotePlayers(data.players);
        remotePlayersRef.current.clear();
        for (const p of data.players) remotePlayersRef.current.set(p.id, p);
        voiceMgr.setLocalPlayerId(net.playerId);
        voiceMgr.syncPeers(data.players);
        const snap = voiceMgr.getSnapshot();
        if (snap.micMode !== 'off') {
          net.sendVoiceState(snap.transmitting, snap.speaking);
        }
        setChatMessages(data.chatHistory);
        setUnreadChat(0);
        setSession((prev) => (prev ? { ...prev, worldRules: rules } : prev));
        engine.showToast(`Joined Room "${data.roomId}" (${rules.toUpperCase()})`);
      },
      onPlayerJoined: (player) => {
        engine.upsertRemotePlayer(player);
        remotePlayersRef.current.set(player.id, player);
        voiceMgr.syncPeers(Array.from(remotePlayersRef.current.values()));
        engine.showToast(`${player.name} joined the world`);
        setChatMessages((prev) => [
          ...prev.slice(-49),
          {
            id: `sys_join_${Date.now()}_${player.id}`,
            senderId: 'system',
            senderName: 'System',
            color: '#22d3ee',
            text: `${player.name} joined the world`,
            timestamp: Date.now(),
            isSystem: true,
          },
        ]);
      },
      onPlayerMoved: (player) => {
        engine.upsertRemotePlayer(player);
        remotePlayersRef.current.set(player.id, player);
      },
      onPlayerLeft: (id) => {
        const leaving = remotePlayersRef.current.get(id);
        engine.removeRemotePlayer(id);
        remotePlayersRef.current.delete(id);
        voiceMgr.syncPeers(Array.from(remotePlayersRef.current.values()));
        if (leaving) {
          setChatMessages((prev) => [
            ...prev.slice(-49),
            {
              id: `sys_left_${Date.now()}_${id}`,
              senderId: 'system',
              senderName: 'System',
              color: '#94a3b8',
              text: `${leaving.name} left the world`,
              timestamp: Date.now(),
              isSystem: true,
            },
          ]);
        }
      },
      onBlockUpdated: (x, y, z, blockId, senderId) => {
        if (senderId !== net.playerId) {
          engine.setBlockAt(x, y, z, blockId, true);
        }
      },
      onChatMessage: (msg) => {
        setChatMessages((prev) => [...prev.slice(-49), msg]);
        if (!chatOpenRef.current) {
          setUnreadChat((c) => Math.min(99, c + 1));
        }
      },
      onVoiceState: (playerId, micActive, speaking) => {
        engine.setRemotePlayerVoice(playerId, micActive, speaking);
        voiceMgr.updatePeerVoiceState(playerId, micActive, speaking);
      },
      onVoiceSignal: (fromId, signal) => {
        void voiceMgr.handleSignal(fromId, signal);
      },
      onVoiceAudio: (fromId, pcmBase64, sampleRate) => {
        voiceMgr.handleIncomingAudio(fromId, pcmBase64, sampleRate);
      },
      onError: (msg) => {
        engine.showToast(msg);
      },
    });
    netRef.current = net;

    return () => {
      voiceMgr.dispose();
      net.disconnect();
      engine.dispose();
      engineRef.current = null;
      netRef.current = null;
      voiceRef.current = null;
    };
  }, [toggleFullscreen]);

  const persistCurrentWorld = useCallback(
    async (notify = true) => {
      const engine = engineRef.current;
      const curSession = sessionRef.current;
      if (!engine || !curSession || curSession.mode !== 'solo') return;
      if (engine.worldRules === 'hardcore' && (engine.isDead || engine.hardcoreSpectating)) return;

      await saveWorldOffline({
        id: curSession.worldId,
        name: curSession.worldName,
        seed: engine.seed,
        worldRules: engine.worldRules,
        updatedAt: Date.now(),
        discoveredBiomes: Array.from(engine.discoveredBiomes),
        modifiedCount: engine.deltas.size,
        playerPos: [engine.playerPos.x, engine.playerPos.y, engine.playerPos.z],
        timeOfDay: engine.timeOfDay,
        deltas: Array.from(engine.deltas.entries()),
        inventory: Array.from(engine.inventory.entries()),
        health: engine.health,
      });
      await refreshSavedWorlds();
      if (notify) {
        engine.showToast('World saved offline to IndexedDB');
      }
    },
    [refreshSavedWorlds]
  );

  useEffect(() => {
    if (screen !== 'playing' || session?.mode !== 'solo') return;
    const timer = window.setInterval(() => {
      persistCurrentWorld(false);
    }, 25000);
    return () => window.clearInterval(timer);
  }, [screen, session, persistCurrentWorld]);

  const exitToTitle = async (deleteIfHardcore = false) => {
    const engine = engineRef.current;
    const curSession = sessionRef.current;
    if (
      curSession?.mode === 'solo' &&
      (deleteIfHardcore ||
        (engine && engine.worldRules === 'hardcore' && (engine.isDead || engine.hardcoreSpectating)))
    ) {
      await deleteSavedWorld(curSession.worldId);
      await refreshSavedWorlds();
    } else if (!deleteIfHardcore) {
      await persistCurrentWorld(false);
    }

    voiceRef.current?.disableMic();
    voiceRef.current?.clearAllPeers();
    remotePlayersRef.current.clear();
    netRef.current?.disconnect();
    if (engine) {
      engine.syncRemotePlayers([]);
      engine.setPaused(false);
      engine.setTitlePreviewMode(true);
    }
    setPaused(false);
    setChatOpen(false);
    setUnreadChat(0);
    setScreen('title');
  };

  return (
    <div ref={rootRef} className="fixed inset-0 h-dvh w-dvw overflow-hidden bg-slate-950">
      <div ref={canvasContainerRef} className="h-full w-full" />

      <OfflineBanner />

      {screen === 'title' && (
        <TitleScreen
          savedWorlds={savedWorlds}
          activeSkin={activeSkin}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          onOpenSkinEditor={() => setSkinEditorOpen(true)}
          onPreviewSeed={(seed) => engineRef.current?.setPreviewSeed(seed)}
          onStartSession={async (cfg) => {
            const engine = engineRef.current;
            const net = netRef.current;
            if (!engine || !net) return;

            setSession(cfg);
            sessionRef.current = cfg;
            setChatMessages([]);
            setPaused(false);
            setChatOpen(false);

            if (cfg.mode === 'solo') {
              net.disconnect();
              const existing = await loadSavedWorld(cfg.worldId);
              if (existing) {
                engine.resetWorld(
                  existing.seed,
                  existing.deltas,
                  existing.playerPos,
                  existing.discoveredBiomes,
                  existing.timeOfDay,
                  existing.worldRules || cfg.worldRules,
                  existing.inventory,
                  existing.health
                );
              } else {
                engine.resetWorld(cfg.seed, undefined, undefined, undefined, undefined, cfg.worldRules);
              }
            } else {
              engine.resetWorld(cfg.seed, undefined, undefined, undefined, undefined, cfg.worldRules);
              net.connect(
                cfg.roomId || 'citadel-999',
                cfg.seed,
                cfg.playerName,
                cfg.playerColor,
                cfg.worldRules,
                cfg.serverUrl,
                cfg.skin || skinRef.current
              );
            }

            engine.setLocalSkin(cfg.skin || skinRef.current);
            engine.setTitlePreviewMode(false);
            engine.setPaused(false);
            setScreen('playing');
          }}
          onDeleteWorld={async (worldId) => {
            await deleteSavedWorld(worldId);
            await refreshSavedWorlds();
          }}
        />
      )}

      {screen === 'playing' && session && (
        <>
          <Hud
            hud={hud}
            mode={session.mode}
            netStatus={netStatus}
            muted={muted}
            touchEnabled={touchEnabled}
            hudCollapsed={hudCollapsed}
            isFullscreen={isFullscreen}
            voice={voice}
            unreadChat={unreadChat}
            onToggleMic={() => {
              const vm = voiceRef.current;
              if (!vm) return;
              const nextMode: MicMode = vm.getSnapshot().micMode === 'off' ? 'open' : 'off';
              void vm.setMicMode(nextMode).then((ok) => {
                if (ok) {
                  engineRef.current?.showToast(
                    nextMode === 'open' ? 'Open Mic active — speaking live!' : 'Microphone muted'
                  );
                } else {
                  const err = vm.getSnapshot().error;
                  if (err) engineRef.current?.showToast(err);
                }
              });
            }}
            onToggleFullscreen={toggleFullscreen}
            onToggleHudCollapsed={() => setHudCollapsed((v) => !v)}
            onToggleMute={() => {
              const next = !muted;
              soundEngine.muted = next;
              setMuted(next);
            }}
            onToggleTouch={() => setTouchEnabled((v) => !v)}
            onOpenPause={() => {
              engineRef.current?.setPaused(true);
              setPaused(true);
            }}
            onOpenChat={() => {
              engineRef.current?.setPaused(true);
              setUnreadChat(0);
              setChatOpen(true);
            }}
            onSelectSlot={(slot) => engineRef.current?.selectHotbarSlot(slot)}
            onAssignHotbarBlock={(slot, itemId) => engineRef.current?.setHotbarBlock(slot, itemId)}
            onCraftTool={(toolId) => engineRef.current?.craftAetherTool(toolId)}
            onBuildPortal={() => engineRef.current?.buildPortalInFront()}
            onLockPointer={() => engineRef.current?.requestPointerLock()}
            onRespawn={() => engineRef.current?.respawnPlayer()}
            onSpectate={() => engineRef.current?.enterHardcoreSpectator()}
            onHardcoreDeleteExit={() => exitToTitle(true)}
          />

          {touchEnabled && !paused && !chatOpen && !hud.isDead && (
            <TouchControls
              flyMode={hud.flyMode}
              canFly={hud.worldRules === 'creative'}
              onMove={(x, y) => engineRef.current?.setTouchMove(x, y)}
              onLook={(dx, dy) => engineRef.current?.addLookDelta(dx, dy)}
              onJump={(down) => engineRef.current?.triggerTouchJump(down)}
              onDescend={(down) => engineRef.current?.setTouchDescend(down)}
              onMine={() => engineRef.current?.triggerPrimaryAction()}
              onPlace={() => engineRef.current?.triggerSecondaryAction()}
              onToggleFly={() => engineRef.current?.toggleFlyMode()}
            />
          )}

          <ChatOverlay
            mode={session.mode}
            playerName={session.playerName}
            playerColor={session.playerColor}
            messages={chatMessages}
            isOpen={chatOpen}
            voice={voice}
            onClose={() => {
              setChatOpen(false);
              engineRef.current?.setPaused(false);
            }}
            onSend={(text) => {
              const cmdReply = engineRef.current?.runChatCommand(text);
              if (cmdReply) {
                setChatMessages((prev) => [
                  ...prev.slice(-49),
                  {
                    id: `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                    senderId: 'system',
                    senderName: 'System',
                    color: '#22d3ee',
                    text: cmdReply,
                    timestamp: Date.now(),
                    isSystem: true,
                  },
                ]);
                return;
              }
              if (session.mode === 'multiplayer') {
                netRef.current?.sendChat(text);
              } else {
                setChatMessages((prev) => [
                  ...prev.slice(-49),
                  {
                    id: `solo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                    senderId: 'local',
                    senderName: session.playerName,
                    color: session.playerColor,
                    text,
                    timestamp: Date.now(),
                  },
                ]);
              }
            }}
            onSetMicMode={(mode) => {
              void voiceRef.current?.setMicMode(mode);
            }}
            onPushToTalkHold={(held) => {
              voiceRef.current?.setPushToTalkHeld(held);
            }}
            onSetSelfMonitor={(enabled) => {
              voiceRef.current?.setSelfMonitor(enabled);
            }}
            onSetMasterVolume={(vol) => {
              voiceRef.current?.setMasterVolume(vol);
            }}
            onSetPeerMuted={(peerId, isMuted) => {
              voiceRef.current?.setPeerMuted(peerId, isMuted);
            }}
            onSetPeerVolume={(peerId, vol) => {
              voiceRef.current?.setPeerVolume(peerId, vol);
            }}
          />
        </>
      )}

      {paused && screen === 'playing' && session && (
        <PauseModal
          mode={session.mode}
          worldRules={hud.worldRules}
          worldName={session.worldName}
          seed={engineRef.current?.seed ?? session.seed}
          timeOfDay={hud.timeOfDay}
          renderDistance={renderDistance}
          flyMode={hud.flyMode}
          touchEnabled={touchEnabled}
          muted={muted}
          isFullscreen={isFullscreen}
          hardcoreSpectating={Boolean(engineRef.current?.hardcoreSpectating)}
          onResume={() => {
            setPaused(false);
            engineRef.current?.setPaused(false);
            engineRef.current?.requestPointerLock();
          }}
          onOpenSkinEditor={() => setSkinEditorOpen(true)}
          onSaveOffline={() => persistCurrentWorld(true)}
          onChangeTimeOfDay={(t) => {
            if (engineRef.current) engineRef.current.timeOfDay = t;
          }}
          onChangeRenderDistance={(d) => {
            setRenderDistance(d);
            if (engineRef.current) engineRef.current.renderDistance = d;
          }}
          onToggleFly={() => engineRef.current?.toggleFlyMode()}
          onToggleTouch={() => setTouchEnabled((v) => !v)}
          onToggleMute={() => {
            const next = !muted;
            soundEngine.muted = next;
            setMuted(next);
          }}
          onToggleFullscreen={toggleFullscreen}
          onExitToTitle={() => exitToTitle(false)}
        />
      )}

      {skinEditorOpen && (
        <SkinEditor
          initialSkin={activeSkin}
          onClose={() => setSkinEditorOpen(false)}
          onApplySkin={(skin) => {
            saveActiveSkin(skin);
            setActiveSkin(skin);
            engineRef.current?.setLocalSkin(skin);
            if (sessionRef.current?.mode === 'multiplayer') {
              netRef.current?.sendSkin(skin);
              engineRef.current?.showToast(`Equipped skin "${skin.name}" (synced online)`);
            } else {
              engineRef.current?.showToast(`Equipped skin "${skin.name}"`);
            }
            setSkinEditorOpen(false);
          }}
        />
      )}
    </div>
  );
}
