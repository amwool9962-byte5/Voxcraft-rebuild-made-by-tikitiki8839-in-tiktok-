import { useState } from 'react';
import {
  Compass,
  Cpu,
  Crown,
  Egg,
  Eye,
  EyeOff,
  Feather,
  Flame,
  Gem,
  Grid3X3,
  Heart,
  Maximize2,
  MessageSquare,
  Mic,
  MicOff,
  Minimize2,
  Pause,
  RotateCcw,
  Skull,
  Smartphone,
  Sparkles,
  Sword,
  Trash2,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  Wind,
} from 'lucide-react';
import type { HudState } from '../types';
import { BlockId, getAllBlocks, getBlock, renderBlockIcon } from '../game/blocks';
import { getAllEggs, getEggDef, isEggId, renderEggIcon } from '../game/creatures';
import type { NetStatus } from '../game/net';
import { getAllTools, getToolDef, isToolId, renderToolIcon } from '../game/tools';
import type { VoiceSnapshot } from '../game/voice';

interface HudProps {
  hud: HudState;
  mode: 'solo' | 'multiplayer';
  netStatus: NetStatus;
  muted: boolean;
  touchEnabled: boolean;
  hudCollapsed: boolean;
  isFullscreen: boolean;
  voice: VoiceSnapshot;
  unreadChat: number;
  onToggleMic: () => void;
  onToggleFullscreen: () => void;
  onToggleHudCollapsed: () => void;
  onToggleMute: () => void;
  onToggleTouch: () => void;
  onOpenPause: () => void;
  onOpenChat: () => void;
  onSelectSlot: (slot: number) => void;
  onAssignHotbarBlock: (slot: number, itemId: number) => void;
  onCraftTool: (toolId: number) => void;
  onBuildPortal: () => void;
  onLockPointer: () => void;
  onRespawn: () => void;
  onSpectate: () => void;
  onHardcoreDeleteExit: () => void;
}

export function Hud({
  hud,
  mode,
  netStatus,
  muted,
  touchEnabled,
  hudCollapsed,
  isFullscreen,
  voice,
  unreadChat,
  onToggleMic,
  onToggleFullscreen,
  onToggleHudCollapsed,
  onToggleMute,
  onToggleTouch,
  onOpenPause,
  onOpenChat,
  onSelectSlot,
  onAssignHotbarBlock,
  onCraftTool,
  onBuildPortal,
  onLockPointer,
  onRespawn,
  onSpectate,
  onHardcoreDeleteExit,
}: HudProps) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteTab, setPaletteTab] = useState<'all' | 'blocks' | 'tools' | 'eggs'>('all');
  const [victoryDismissed, setVictoryDismissed] = useState(false);

  const blocks = getAllBlocks();
  const tools = getAllTools();
  const eggs = getAllEggs();
  const isDay = hud.timeOfDay > 0.22 && hud.timeOfDay < 0.78;
  const crystalCount = hud.inventory[BlockId.AETHER_CRYSTAL] ?? 0;

  const rulesBadge =
    hud.worldRules === 'hardcore'
      ? { label: 'HARDCORE', cls: 'border-rose-500/50 bg-rose-500/20 text-rose-200' }
      : hud.worldRules === 'survival'
      ? { label: 'SURVIVE', cls: 'border-amber-400/50 bg-amber-500/20 text-amber-200' }
      : { label: 'CREATIVE', cls: 'border-cyan-400/50 bg-cyan-500/20 text-cyan-200' };

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-2 sm:p-4">
      {/* Top Row: Telemetry, Action Buttons, Boss Health Bar & Victory Banner */}
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          {hudCollapsed ? (
            <div />
          ) : (
            <div className="rounded-xl border border-slate-700/80 bg-slate-950/88 px-3 py-2 text-xs shadow-lg">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: hud.biome.accentColor }}
                />
                <span className="font-bold text-slate-100">{hud.biome.name}</span>
                <span className={`rounded border px-1.5 py-0.2 text-[9px] font-extrabold ${rulesBadge.cls}`}>
                  {rulesBadge.label}
                </span>
                <span className="hidden sm:inline font-mono text-[10px] text-slate-400 tabular-nums">
                  {hud.discoveredBiomes.length}/5 Biomes
                </span>
              </div>
              <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-300">
                <Compass className="w-3 h-3 text-cyan-400 shrink-0" />
                <span>{hud.biome.mechanicLabel}</span>
              </div>
              <div className="mt-0.5 font-mono text-[10px] text-slate-400 tabular-nums">
                XYZ {hud.coords[0]}, {hud.coords[1]}, {hud.coords[2]} · {isDay ? 'Day' : 'Night'} ·{' '}
                {hud.animalCount} Fauna
                {(!isDay || hud.hostileCount > 0) && (
                  <span className="text-rose-300"> · {hud.hostileCount} Night Threat</span>
                )}{' '}
                · {hud.fps} FPS
              </div>
            </div>
          )}

          <div className="pointer-events-auto flex items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleMic}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                voice.transmitting && voice.speaking
                  ? 'border-emerald-300 bg-emerald-500/30 text-emerald-100 shadow-[0_0_12px_rgba(52,211,153,0.45)]'
                  : voice.transmitting
                  ? 'border-emerald-400/70 bg-emerald-500/20 text-emerald-200'
                  : voice.micMode === 'ptt'
                  ? 'border-sky-400/70 bg-sky-500/20 text-sky-200'
                  : 'border-slate-700/80 bg-slate-950/88 text-slate-300 hover:border-emerald-400 hover:text-white'
              }`}
              title="Toggle Microphone (M) or Hold (V) for Push-to-Talk"
            >
              {voice.micMode === 'off' ? (
                <MicOff className="w-3.5 h-3.5 text-slate-400" />
              ) : (
                <Mic className={`w-3.5 h-3.5 ${voice.speaking ? 'animate-pulse text-emerald-300' : ''}`} />
              )}
              <span className="hidden sm:inline text-[11px]">
                {voice.micMode === 'off'
                  ? 'Mic'
                  : voice.micMode === 'ptt'
                  ? voice.pttHeld
                    ? 'Talking'
                    : 'PTT [V]'
                  : voice.speaking
                  ? 'Speaking'
                  : 'Mic Live'}
              </span>
            </button>

            <button
              type="button"
              onClick={onOpenChat}
              className="relative inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-950/88 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:border-cyan-400 cursor-pointer"
              title="Open Chat & Voice Panel (T)"
            >
              {mode === 'multiplayer' ? (
                <>
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="tabular-nums">{hud.onlineCount}</span>
                  <span className="hidden sm:inline text-[10px] text-slate-400">
                    ({netStatus === 'connected' ? 'Live' : 'Sync'})
                  </span>
                </>
              ) : (
                <span className="hidden sm:inline text-[11px]">Chat</span>
              )}
              <MessageSquare className="w-3.5 h-3.5 text-cyan-300" />
              {unreadChat > 0 && (
                <span className="ml-0.5 rounded-full bg-cyan-400 px-1.5 text-[9px] font-black text-slate-950 tabular-nums">
                  {unreadChat > 9 ? '9+' : unreadChat}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={onToggleFullscreen}
              className={`rounded-lg border px-2 py-1.5 text-xs transition cursor-pointer ${
                isFullscreen
                  ? 'border-cyan-400/70 bg-cyan-500/20 text-cyan-200'
                  : 'border-slate-700/80 bg-slate-950/88 text-slate-300 hover:text-white'
              }`}
              title={isFullscreen ? 'Exit Fullscreen (F11)' : 'Fullscreen Mode (F11)'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={onToggleTouch}
              className={`rounded-lg border px-2 py-1.5 text-xs transition cursor-pointer ${
                touchEnabled
                  ? 'border-emerald-400/70 bg-emerald-500/20 text-emerald-200'
                  : 'border-slate-700/80 bg-slate-950/88 text-slate-300 hover:text-white'
              }`}
              title="Toggle On-Screen Touch Controls"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onToggleMute}
              className="rounded-lg border border-slate-700/80 bg-slate-950/88 px-2 py-1.5 text-slate-300 hover:text-white cursor-pointer"
              title={muted ? 'Unmute Audio' : 'Mute Audio'}
            >
              {muted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={onOpenPause}
              className="rounded-lg border border-slate-700/80 bg-slate-950/88 px-2 py-1.5 text-slate-200 hover:border-slate-500 cursor-pointer"
              title="Pause (Esc)"
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Boss Bar */}
        {!hudCollapsed && hud.kingBoss && (
          <div
            className={`mx-auto w-full max-w-md rounded-xl border bg-slate-950/92 px-3.5 py-2 shadow-xl ${
              hud.kingBoss.friendlyAlly
                ? 'border-emerald-400/70'
                : hud.kingBoss.name.includes('MECHATRON')
                ? 'border-cyan-400/70'
                : hud.kingBoss.name.includes('Zephyrus')
                ? 'border-sky-400/55'
                : hud.kingBoss.name === 'Ignis Rex'
                ? 'border-orange-500/50'
                : 'border-amber-500/45'
            }`}
          >
            <div className="flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                {hud.kingBoss.friendlyAlly ? (
                  <Feather className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : hud.kingBoss.name.includes('MECHATRON') ? (
                  <Cpu className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                ) : hud.kingBoss.name === 'Ignis Rex' ? (
                  <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                ) : hud.kingBoss.name.includes('Zephyrus') ? (
                  <Wind className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                ) : (
                  <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                )}
                <span
                  className={`font-bold tracking-wide truncate ${
                    hud.kingBoss.friendlyAlly
                      ? 'text-emerald-200'
                      : hud.kingBoss.name.includes('MECHATRON')
                      ? 'text-cyan-200'
                      : hud.kingBoss.name.includes('Zephyrus')
                      ? 'text-sky-200'
                      : 'text-amber-200'
                  }`}
                  style={{ fontFamily: "'Cinzel', Georgia, serif" }}
                >
                  {hud.kingBoss.name}
                </span>
                {hud.kingBoss.friendlyAlly ? (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-300 whitespace-nowrap">
                    <Heart className="w-2.5 h-2.5" /> Friendly Ally · Helps You
                  </span>
                ) : (
                  <>
                    {hud.kingBoss.name.includes('MECHATRON') && (
                      <span className="text-[10px] font-bold text-cyan-400 whitespace-nowrap">
                        · SUPER BOSS
                      </span>
                    )}
                    {hud.kingBoss.phase === 2 && (
                      <span className="text-[10px] font-bold text-rose-400 whitespace-nowrap">
                        · Enraged
                      </span>
                    )}
                  </>
                )}
              </div>
              <span className="font-mono text-[10px] text-slate-300 tabular-nums shrink-0">
                {hud.kingBoss.health}/{hud.kingBoss.maxHealth} HP · {hud.kingBoss.distance}m
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-900 border border-slate-800">
              <div
                className={`h-full transition-all duration-150 ${
                  hud.kingBoss.friendlyAlly
                    ? 'bg-gradient-to-r from-emerald-500 via-amber-400 to-orange-400'
                    : hud.kingBoss.phase === 2
                    ? 'bg-gradient-to-r from-rose-600 via-red-500 to-amber-400'
                    : hud.kingBoss.name.includes('MECHATRON')
                    ? 'bg-gradient-to-r from-cyan-500 via-sky-400 to-rose-400'
                    : hud.kingBoss.name.includes('Zephyrus')
                    ? 'bg-gradient-to-r from-sky-500 via-cyan-400 to-amber-200'
                    : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300'
                }`}
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(100, Math.round((hud.kingBoss.health / hud.kingBoss.maxHealth) * 100))
                  )}%`,
                }}
              />
            </div>
            {hud.kingBoss.friendlyAlly && (
              <div className="mt-1 text-center text-[10px] text-emerald-200/90">
                Protects Village Mango Birds · Right-Click for Heal &amp; Free TNT/Mango Gifts
              </div>
            )}
          </div>
        )}

        {/* Boss Victory Banner */}
        {hud.bossDefeated && !victoryDismissed && !hud.isDead && (
          <div className="pointer-events-auto mx-auto flex items-center gap-3 rounded-xl border border-amber-400/60 bg-slate-950/94 px-4 py-2 shadow-2xl">
            <Trophy className="w-4 h-4 text-amber-300 shrink-0" />
            <div className="text-xs">
              <span
                className="font-bold text-amber-200"
                style={{ fontFamily: "'Cinzel', Georgia, serif" }}
              >
                Boss Vanquished
              </span>
              <span className="ml-2 text-[11px] text-slate-300">Realm Champion Victory</span>
            </div>
            <button
              type="button"
              onClick={() => setVictoryDismissed(true)}
              className="rounded-md border border-slate-700 bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-slate-300 hover:text-white cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Center Reticle, Portal Charge, Target Readout, Pointer Lock Prompt */}
      <div className="flex flex-col items-center justify-center">
        {hud.portalCharge > 0 && (
          <div className="mb-4 flex flex-col items-center rounded-xl border border-purple-400/70 bg-slate-950/92 px-3.5 py-2 shadow-xl">
            <span className="text-[11px] font-bold tracking-wide text-purple-200">
              Warping to {hud.portalDestName ?? 'Next Biome'}...
            </span>
            <div className="mt-1.5 h-1.5 w-36 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full bg-gradient-to-r from-purple-400 to-cyan-400"
                style={{ width: `${Math.round(hud.portalCharge * 100)}%` }}
              />
            </div>
          </div>
        )}

        {hud.toast && (
          <div className="mb-6 rounded-lg border border-emerald-400/50 bg-slate-950/92 px-3.5 py-1.5 text-xs font-semibold text-emerald-200 shadow-lg">
            {hud.toast}
          </div>
        )}

        <svg viewBox="0 0 24 24" className="w-5 h-5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
          <path d="M12 4v6M12 14v6M4 12h6M14 12h6" stroke="#f8fafc" strokeWidth="1.8" strokeLinecap="round" />
        </svg>

        {hud.targetCreature && (
          <div className="mt-2 flex flex-col items-center">
            <div className="flex items-center gap-1.5 rounded bg-slate-950/88 px-2 py-0.5 text-[10px] font-bold">
              <span className={hud.targetCreature.hostile ? 'text-rose-300' : 'text-emerald-300'}>
                {hud.targetCreature.name}
              </span>
              <span className="font-mono text-[9px] text-slate-400 tabular-nums">
                {hud.targetCreature.health}/{hud.targetCreature.maxHealth}
              </span>
            </div>
            <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-slate-900 border border-slate-800">
              <div
                className={hud.targetCreature.hostile ? 'h-full bg-rose-500' : 'h-full bg-emerald-400'}
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(100, Math.round((hud.targetCreature.health / hud.targetCreature.maxHealth) * 100))
                  )}%`,
                }}
              />
            </div>
            {hud.targetCreature.friendlyAlly && (
              <span className="mt-1 rounded bg-emerald-950/90 border border-emerald-400/40 px-2 py-0.5 text-[9px] font-semibold text-emerald-200">
                Friendly Ally · RMB for Gift &amp; Heal
              </span>
            )}
          </div>
        )}

        {!hud.targetCreature && hud.targetBlock && (
          <div className="mt-2 flex flex-col items-center">
            <span className="rounded bg-slate-950/80 px-2 py-0.5 text-[10px] font-semibold text-slate-200">
              {hud.targetBlock.block.name}
            </span>
            {hud.targetBlock.block.id === BlockId.TNT && (
              <span className="mt-1 rounded bg-rose-950/90 border border-rose-400/40 px-2 py-0.5 text-[9px] font-semibold text-rose-200">
                TNT Explosive · RMB w/ Tool to Ignite
              </span>
            )}
            {hud.targetBlock.progress > 0.02 && (
              <div className="mt-1 h-1 w-16 overflow-hidden rounded-full bg-slate-900">
                <div
                  className="h-full bg-cyan-400"
                  style={{ width: `${Math.round(hud.targetBlock.progress * 100)}%` }}
                />
              </div>
            )}
          </div>
        )}

        {!hud.pointerLocked && !touchEnabled && !paletteOpen && !hudCollapsed && (
          <button
            type="button"
            onClick={onLockPointer}
            className="pointer-events-auto mt-3 hidden sm:inline-flex [@media(max-height:460px)]:hidden rounded-lg border border-slate-600/80 bg-slate-950/85 px-3 py-1 text-[11px] font-medium text-slate-200 hover:border-cyan-400 cursor-pointer"
          >
            Drag to Look · LMB Mine / Attack · RMB Place / Sweep · T Chat · V Talk · M Mic
          </button>
        )}
      </div>

      {/* Bottom Dock: Inventory Palette + HUD Collapse Toggle + Vitals & Hotbar */}
      <div className="flex flex-col items-center">
        {paletteOpen && (
          <div className="pointer-events-auto mb-2 flex w-full max-w-xl max-h-[72dvh] sm:max-h-[70dvh] flex-col overflow-hidden rounded-xl border border-slate-700 bg-slate-950/96 shadow-2xl">
            <div className="shrink-0 border-b border-slate-800 bg-slate-950 px-3 pt-2.5 pb-2 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-200">
                <div className="flex items-center gap-2">
                  <span>Palette · Slot {hud.selectedSlot + 1}</span>
                  {hud.worldRules !== 'creative' && (
                    <span className="rounded border border-sky-500/40 bg-sky-500/15 px-1.5 py-0.5 font-mono text-[10px] text-sky-300 tabular-nums">
                      {crystalCount}◆ Crystals
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onBuildPortal();
                      setPaletteOpen(false);
                    }}
                    className="inline-flex items-center gap-1 rounded-lg border border-purple-400/60 bg-purple-500/20 px-2.5 py-1 text-[11px] font-bold text-purple-200 hover:bg-purple-500/35 cursor-pointer whitespace-nowrap"
                  >
                    <Sparkles className="w-3 h-3" /> Build Portal
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaletteOpen(false)}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:border-slate-500 hover:text-white cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1 rounded-lg border border-slate-800 bg-slate-900 p-1">
                {[
                  { id: 'all' as const, label: 'All' },
                  { id: 'blocks' as const, label: `Blocks (${blocks.length})` },
                  { id: 'tools' as const, label: `Tools (${tools.length})` },
                  { id: 'eggs' as const, label: `Eggs (${eggs.length})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setPaletteTab(tab.id)}
                    className={`rounded-md py-1 px-1 text-[10px] sm:text-[11px] font-bold transition cursor-pointer whitespace-nowrap ${
                      paletteTab === tab.id
                        ? 'bg-cyan-400 text-slate-950 shadow'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
              <p className="text-[10px] text-slate-400">
                {hud.worldRules === 'creative'
                  ? 'Pick any Tool, Spawn Egg (Right-Click to hatch), or Block to equip into your active hotbar slot.'
                  : 'Survive & Hardcore: Forge Aether tools with Aether Crystals dropped by night & volcano monsters.'}
              </p>

              {(paletteTab === 'all' || paletteTab === 'tools') && (
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-cyan-300">
                    <span className="inline-flex items-center gap-1">
                      <Sword className="w-3 h-3" /> Swords, Pickaxes & Shovels
                    </span>
                    <span className="text-[9px] text-slate-400 font-normal">Click to equip or forge</span>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {tools.map((tool) => {
                      const owned = hud.worldRules === 'creative' || (hud.inventory[tool.id] ?? 0) > 0;
                      const canCraft = !owned && crystalCount >= tool.craftCrystalCost;
                      return (
                        <button
                          key={tool.id}
                          type="button"
                          onClick={() => {
                            if (owned) onAssignHotbarBlock(hud.selectedSlot, tool.id);
                            else onCraftTool(tool.id);
                            setPaletteOpen(false);
                          }}
                          className={`relative flex flex-col items-center gap-1 rounded-lg border p-1.5 cursor-pointer transition ${
                            tool.tier === 'aether'
                              ? 'border-cyan-500/40 bg-slate-900 hover:border-cyan-400'
                              : 'border-slate-700/80 bg-slate-900 hover:border-slate-500'
                          } ${!owned && !canCraft ? 'opacity-55' : ''}`}
                          title={
                            owned
                              ? `${tool.name} · DMG ${tool.damage} · Click to equip`
                              : `Forge ${tool.name} (${tool.craftCrystalCost} Aether Crystal)`
                          }
                        >
                          <img src={renderToolIcon(tool)} alt={tool.name} className="h-7 w-7" />
                          <span className="w-full truncate text-center text-[9px] font-semibold text-slate-200">
                            {tool.name}
                          </span>
                          {!owned && tool.craftCrystalCost > 0 && (
                            <span className="inline-flex items-center gap-0.5 rounded bg-cyan-500/20 px-1 py-0.2 font-mono text-[8px] font-bold text-cyan-200">
                              <Gem className="w-2.5 h-2.5" /> {tool.craftCrystalCost}◆
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {(paletteTab === 'all' || paletteTab === 'eggs') && (
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-amber-300">
                    <span className="inline-flex items-center gap-1">
                      <Egg className="w-3 h-3" /> Animal & Monster Spawn Eggs
                    </span>
                    <span className="text-[9px] text-slate-400 font-normal">Equip & RMB to hatch</span>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                    {eggs.map((egg) => {
                      const count = hud.worldRules === 'creative' ? null : hud.inventory[egg.id] ?? 0;
                      const catBorder =
                        egg.category === 'boss'
                          ? 'border-amber-500/50 hover:border-amber-400'
                          : egg.category === 'monster'
                          ? 'border-rose-500/40 hover:border-rose-400'
                          : 'border-emerald-500/40 hover:border-emerald-400';
                      return (
                        <button
                          key={egg.id}
                          type="button"
                          onClick={() => {
                            onAssignHotbarBlock(hud.selectedSlot, egg.id);
                            setPaletteOpen(false);
                          }}
                          title={`${egg.name} · Right-Click to spawn`}
                          className={`relative flex flex-col items-center gap-1 rounded-lg border bg-slate-900 p-1.5 cursor-pointer transition ${catBorder} ${
                            count === 0 ? 'opacity-50' : ''
                          }`}
                        >
                          <img src={renderEggIcon(egg)} alt={egg.name} className="h-7 w-7" />
                          <span className="w-full truncate text-center text-[9px] font-semibold text-slate-200">
                            {egg.name.replace(' Egg', '')}
                          </span>
                          {count !== null && (
                            <span className="absolute top-0.5 right-1 font-mono text-[9px] font-bold text-amber-300 tabular-nums">
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {(paletteTab === 'all' || paletteTab === 'blocks') && (
                <div>
                  <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                    <span>Blocks & Materials</span>
                    <span className="text-[9px] text-slate-400 font-normal">Click to equip</span>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                    {blocks.map((block) => {
                      const count = hud.worldRules === 'creative' ? null : hud.inventory[block.id] ?? 0;
                      return (
                        <button
                          key={block.id}
                          type="button"
                          onClick={() => {
                            onAssignHotbarBlock(hud.selectedSlot, block.id);
                            setPaletteOpen(false);
                          }}
                          className={`relative flex flex-col items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 p-1.5 hover:border-cyan-400 cursor-pointer ${
                            count === 0 ? 'opacity-50' : ''
                          }`}
                        >
                          <img src={renderBlockIcon(block)} alt={block.name} className="h-7 w-7" />
                          <span className="w-full truncate text-center text-[9px] text-slate-300">
                            {block.name}
                          </span>
                          {count !== null && (
                            <span className="absolute top-0.5 right-1 font-mono text-[9px] font-bold text-amber-300 tabular-nums">
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onToggleHudCollapsed}
          className="pointer-events-auto mb-1 inline-flex items-center gap-1 rounded-t-lg border border-b-0 border-slate-700/80 bg-slate-950/88 px-2.5 py-0.5 text-[10px] font-semibold text-slate-400 hover:text-white cursor-pointer"
          title="Toggle HUD (H)"
        >
          {hudCollapsed ? (
            <>
              <Eye className="w-3 h-3" /> Show HUD
            </>
          ) : (
            <>
              <EyeOff className="w-3 h-3" /> Hide HUD
            </>
          )}
        </button>

        {!hudCollapsed && (
          <div className="pointer-events-auto flex flex-col items-center gap-1.5 rounded-2xl border border-slate-700/80 bg-slate-950/90 px-2 py-1.5 sm:px-3 sm:py-2 shadow-2xl max-w-full">
            <div className="flex w-full items-center justify-between gap-3 px-1 text-[10px] font-mono tabular-nums">
              <div className="flex items-center gap-1.5 flex-1">
                <span className="text-rose-300 font-bold">HP</span>
                <div className="h-1.5 flex-1 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-rose-500" style={{ width: `${hud.health}%` }} />
                </div>
                <span className="text-slate-300 w-6 text-right">{hud.health}</span>
              </div>
              {hud.flyMode && (
                <span className="inline-flex items-center gap-1 rounded bg-cyan-500/20 px-1.5 py-0.5 text-[9px] font-bold text-cyan-300">
                  <Wind className="w-2.5 h-2.5" /> FLY
                </span>
              )}
              <div className="flex items-center gap-1.5 flex-1">
                <span className="text-emerald-300 font-bold">STM</span>
                <div className="h-1.5 flex-1 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-emerald-400" style={{ width: `${hud.stamina}%` }} />
                </div>
                <span className="text-slate-300 w-6 text-right">{hud.stamina}</span>
              </div>
            </div>

            <div className="flex items-center gap-0.5 sm:gap-1">
              {hud.hotbar.map((itemId, idx) => {
                const active = idx === hud.selectedSlot;
                const tool = isToolId(itemId) ? getToolDef(itemId) : undefined;
                if (tool) {
                  const available = hud.worldRules === 'creative' || (hud.inventory[itemId] ?? 0) > 0;
                  return (
                    <button
                      key={`${idx}_${itemId}`}
                      type="button"
                      onClick={() => onSelectSlot(idx)}
                      title={`${idx + 1}: ${tool.name} (DMG ${tool.damage})`}
                      className={`relative flex h-8 w-7 sm:h-11 sm:w-11 items-center justify-center rounded-lg border transition cursor-pointer ${
                        active
                          ? 'border-cyan-400 bg-cyan-500/20 scale-105'
                          : 'border-slate-800 bg-slate-900/90 hover:border-slate-600'
                      } ${available ? '' : 'opacity-50'}`}
                    >
                      <img src={renderToolIcon(tool)} alt={tool.name} className="h-5 w-5 sm:h-8 sm:w-8" />
                      <span className="absolute top-0.5 left-0.5 sm:left-1 font-mono text-[8px] sm:text-[9px] text-slate-400">
                        {idx + 1}
                      </span>
                      {tool.tier === 'aether' && (
                        <span className="absolute bottom-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-cyan-400" />
                      )}
                    </button>
                  );
                }

                if (isEggId(itemId)) {
                  const egg = getEggDef(itemId);
                  if (egg) {
                    const count = hud.worldRules === 'creative' ? null : hud.inventory[itemId] ?? 0;
                    return (
                      <button
                        key={`${idx}_${itemId}`}
                        type="button"
                        onClick={() => onSelectSlot(idx)}
                        title={`${idx + 1}: ${egg.name} (RMB to spawn)`}
                        className={`relative flex h-8 w-7 sm:h-11 sm:w-11 items-center justify-center rounded-lg border transition cursor-pointer ${
                          active
                            ? 'border-amber-400 bg-amber-500/20 scale-105'
                            : 'border-slate-800 bg-slate-900/90 hover:border-slate-600'
                        } ${count === 0 ? 'opacity-50' : ''}`}
                      >
                        <img src={renderEggIcon(egg)} alt={egg.name} className="h-5 w-5 sm:h-8 sm:w-8" />
                        <span className="absolute top-0.5 left-0.5 sm:left-1 font-mono text-[8px] sm:text-[9px] text-slate-400">
                          {idx + 1}
                        </span>
                        {count !== null && (
                          <span className="absolute bottom-0 right-0.5 font-mono text-[8px] sm:text-[9px] font-bold text-amber-300 tabular-nums">
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  }
                }

                const block = getBlock(itemId);
                const count = hud.worldRules === 'creative' ? null : hud.inventory[itemId] ?? 0;
                return (
                  <button
                    key={`${idx}_${itemId}`}
                    type="button"
                    onClick={() => onSelectSlot(idx)}
                    title={`${idx + 1}: ${block.name}${count === null ? '' : ` (${count})`}`}
                    className={`relative flex h-8 w-7 sm:h-11 sm:w-11 items-center justify-center rounded-lg border transition cursor-pointer ${
                      active
                        ? 'border-cyan-400 bg-cyan-500/20 scale-105'
                        : 'border-slate-800 bg-slate-900/90 hover:border-slate-600'
                    } ${count === 0 ? 'opacity-50' : ''}`}
                  >
                    <img src={renderBlockIcon(block)} alt={block.name} className="h-5 w-5 sm:h-8 sm:w-8" />
                    <span className="absolute top-0.5 left-0.5 sm:left-1 font-mono text-[8px] sm:text-[9px] text-slate-400">
                      {idx + 1}
                    </span>
                    {count !== null && (
                      <span className="absolute bottom-0 right-0.5 font-mono text-[8px] sm:text-[9px] font-bold text-amber-300 tabular-nums">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setPaletteOpen((v) => !v)}
                title="Open Palette (Blocks, Tools & Spawn Eggs)"
                className={`flex h-8 w-7 sm:h-11 sm:w-11 items-center justify-center rounded-lg border transition cursor-pointer ${
                  paletteOpen
                    ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
                    : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-emerald-400 hover:text-emerald-300'
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Death / Hardcore Permadeath Modal */}
      {hud.isDead && (
        <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-slate-950/88 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-rose-500/50 bg-slate-900 p-6 text-center shadow-2xl">
            <Skull className="mx-auto h-10 w-10 text-rose-400" />
            <h2 className="mt-2 text-xl font-black text-white">
              {hud.worldRules === 'hardcore' ? 'Hardcore Run Ended' : 'You Fell!'}
            </h2>
            <p className="mt-1 text-xs text-slate-300">
              {hud.worldRules === 'hardcore'
                ? 'In Hardcore mode, there are no respawns. This world is now sealed.'
                : 'Your explorer fell in Survival mode. Respawn back at the Frontier Beacon.'}
            </p>
            <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-[11px] font-mono text-slate-400">
              Biomes Discovered: {hud.discoveredBiomes.length}/5 · XYZ {hud.coords[0]}, {hud.coords[1]},{' '}
              {hud.coords[2]}
            </div>
            <div className="mt-4 flex flex-col gap-2">
              {hud.worldRules === 'hardcore' ? (
                <>
                  <button
                    type="button"
                    onClick={onHardcoreDeleteExit}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-500 py-2.5 text-xs font-extrabold text-white hover:bg-rose-400 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" /> Delete World & Return to Title
                  </button>
                  <button
                    type="button"
                    onClick={onSpectate}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-950 py-2 text-xs font-bold text-slate-300 hover:border-cyan-400 cursor-pointer"
                  >
                    Spectate World (Ghost)
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={onRespawn}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-xs font-extrabold text-slate-950 hover:bg-emerald-400 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" /> Respawn at Frontier Beacon
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
