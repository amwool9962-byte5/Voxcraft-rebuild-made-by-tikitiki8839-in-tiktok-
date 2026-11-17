import {
  Play,
  Palette,
  Save,
  LogOut,
  Feather,
  Gamepad2,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Sun,
} from 'lucide-react';
import type { WorldRules } from '../types';

interface PauseModalProps {
  mode: 'solo' | 'multiplayer';
  worldRules: WorldRules;
  worldName: string;
  seed: number;
  timeOfDay: number;
  renderDistance: number;
  flyMode: boolean;
  touchEnabled: boolean;
  muted: boolean;
  isFullscreen: boolean;
  hardcoreSpectating: boolean;
  onResume: () => void;
  onOpenSkinEditor: () => void;
  onSaveOffline: () => void;
  onChangeTimeOfDay: (time: number) => void;
  onChangeRenderDistance: (rd: number) => void;
  onToggleFly: () => void;
  onToggleTouch: () => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onExitToTitle: () => void;
}

export function PauseModal({
  mode,
  worldRules,
  worldName,
  seed,
  timeOfDay,
  renderDistance,
  flyMode,
  touchEnabled,
  muted,
  isFullscreen,
  hardcoreSpectating,
  onResume,
  onOpenSkinEditor,
  onSaveOffline,
  onChangeTimeOfDay,
  onChangeRenderDistance,
  onToggleFly,
  onToggleTouch,
  onToggleMute,
  onToggleFullscreen,
  onExitToTitle,
}: PauseModalProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/85 p-3 sm:p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h2
              className="text-lg font-extrabold tracking-wide text-white"
              style={{ fontFamily: "'Cinzel', Georgia, serif" }}
            >
              EXPEDITION PAUSED
            </h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {worldName} · Seed <span className="font-mono text-slate-200">{seed}</span> ·{' '}
              <span className="uppercase font-bold text-amber-300">{worldRules}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onResume}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-400 px-3.5 py-2 text-xs font-extrabold text-slate-950 hover:bg-amber-300 cursor-pointer"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            Resume
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-300">
              <span className="flex items-center gap-1.5">
                <Sun className="h-3.5 w-3.5 text-amber-300" />
                Solar Cycle
              </span>
              <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                {Math.round(timeOfDay * 24)}:00
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={0.99}
              step={0.01}
              value={timeOfDay}
              onChange={(e) => onChangeTimeOfDay(Number(e.target.value))}
              className="w-full accent-amber-400 cursor-pointer"
            />
          </div>

          <div>
            <div className="mb-1.5 text-xs font-semibold text-slate-300">Chunk View Radius</div>
            <div className="grid grid-cols-3 gap-2">
              {[2, 3, 4].map((rd) => (
                <button
                  key={rd}
                  type="button"
                  onClick={() => onChangeRenderDistance(rd)}
                  className={`rounded-lg border py-1.5 text-xs font-bold transition cursor-pointer ${
                    renderDistance === rd
                      ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                      : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-600'
                  }`}
                >
                  {rd} Chunks
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(worldRules === 'creative' || hardcoreSpectating) && (
              <button
                type="button"
                onClick={onToggleFly}
                className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold cursor-pointer ${
                  flyMode
                    ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                    : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-600'
                }`}
              >
                <Feather className="h-3.5 w-3.5" />
                Flight: {flyMode ? 'ON' : 'OFF'}
              </button>
            )}

            <button
              type="button"
              onClick={onToggleTouch}
              className={`flex items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-bold cursor-pointer ${
                touchEnabled
                  ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                  : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-600'
              }`}
            >
              <Gamepad2 className="h-3.5 w-3.5" />
              Touch UI: {touchEnabled ? 'ON' : 'OFF'}
            </button>

            <button
              type="button"
              onClick={onToggleMute}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 py-2 text-xs font-bold text-slate-300 hover:border-slate-600 cursor-pointer"
            >
              {muted ? <VolumeX className="h-3.5 w-3.5 text-rose-400" /> : <Volume2 className="h-3.5 w-3.5 text-emerald-400" />}
              Audio: {muted ? 'MUTED' : 'ON'}
            </button>

            <button
              type="button"
              onClick={onToggleFullscreen}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950 py-2 text-xs font-bold text-slate-300 hover:border-slate-600 cursor-pointer"
            >
              {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2 border-t border-slate-800 pt-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={onOpenSkinEditor}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-cyan-400/50 bg-cyan-500/15 py-2.5 text-xs font-bold text-cyan-200 hover:bg-cyan-500/25 cursor-pointer"
            >
              <Palette className="h-4 w-4" />
              Skin Studio
            </button>

            {mode === 'solo' && (
              <button
                type="button"
                onClick={onSaveOffline}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-400/50 bg-emerald-500/15 py-2.5 text-xs font-bold text-emerald-200 hover:bg-emerald-500/25 cursor-pointer"
              >
                <Save className="h-4 w-4" />
                Save World Offline
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onExitToTitle}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-500/40 bg-rose-500/15 py-2.5 text-xs font-extrabold text-rose-200 hover:bg-rose-500/25 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            Save & Exit to Title
          </button>
        </div>
      </div>
    </div>
  );
}
