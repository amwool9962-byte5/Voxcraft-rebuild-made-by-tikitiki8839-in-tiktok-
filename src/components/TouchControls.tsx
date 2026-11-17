import { useRef, useState } from 'react';
import { ArrowUp, ArrowDown, Pickaxe, Box, Feather } from 'lucide-react';

interface TouchControlsProps {
  flyMode: boolean;
  canFly: boolean;
  onMove: (x: number, y: number) => void;
  onLook: (dx: number, dy: number) => void;
  onJump: (down: boolean) => void;
  onDescend: (down: boolean) => void;
  onMine: () => void;
  onPlace: () => void;
  onToggleFly: () => void;
}

export function TouchControls({
  flyMode,
  canFly,
  onMove,
  onLook,
  onJump,
  onDescend,
  onMine,
  onPlace,
  onToggleFly,
}: TouchControlsProps) {
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const padRef = useRef<HTMLDivElement>(null);
  const movePointerId = useRef<number | null>(null);
  const lookPointerId = useRef<number | null>(null);
  const lookPos = useRef({ x: 0, y: 0 });

  const updateStick = (clientX: number, clientY: number) => {
    const el = padRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width / 2 - 14;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    setKnob({ x: dx, y: dy });
    onMove(dx / maxR, -dy / maxR);
  };

  return (
    <>
      {/* Right-half invisible look surface */}
      <div
        className="fixed inset-y-0 right-0 z-10 w-1/2 touch-none"
        onPointerDown={(e) => {
          lookPointerId.current = e.pointerId;
          lookPos.current = { x: e.clientX, y: e.clientY };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (lookPointerId.current !== e.pointerId) return;
          const dx = e.clientX - lookPos.current.x;
          const dy = e.clientY - lookPos.current.y;
          lookPos.current = { x: e.clientX, y: e.clientY };
          onLook(dx, dy);
        }}
        onPointerUp={(e) => {
          if (lookPointerId.current === e.pointerId) lookPointerId.current = null;
        }}
        onPointerCancel={() => {
          lookPointerId.current = null;
        }}
      />

      {/* Virtual thumbstick */}
      <div
        ref={padRef}
        onPointerDown={(e) => {
          movePointerId.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          updateStick(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (movePointerId.current === e.pointerId) updateStick(e.clientX, e.clientY);
        }}
        onPointerUp={(e) => {
          if (movePointerId.current === e.pointerId) {
            movePointerId.current = null;
            setKnob({ x: 0, y: 0 });
            onMove(0, 0);
          }
        }}
        onPointerCancel={() => {
          movePointerId.current = null;
          setKnob({ x: 0, y: 0 });
          onMove(0, 0);
        }}
        className="fixed bottom-24 left-4 z-20 flex h-28 w-28 items-center justify-center rounded-full border-2 border-slate-600/70 bg-slate-950/60 touch-none"
      >
        <div
          className="h-11 w-11 rounded-full border border-cyan-300 bg-cyan-400/30 shadow-lg"
          style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
        />
      </div>

      {/* Action buttons */}
      <div className="fixed bottom-24 right-4 z-20 flex flex-col items-end gap-2 touch-none">
        <div className="flex gap-2">
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onMine();
            }}
            className="flex h-13 w-13 items-center justify-center rounded-2xl border border-amber-400/60 bg-slate-950/80 text-amber-300 active:scale-95"
            aria-label="Mine or Attack"
          >
            <Pickaxe className="h-6 w-6" />
          </button>
          <button
            type="button"
            onPointerDown={(e) => {
              e.stopPropagation();
              onPlace();
            }}
            className="flex h-13 w-13 items-center justify-center rounded-2xl border border-cyan-400/60 bg-slate-950/80 text-cyan-300 active:scale-95"
            aria-label="Place or Hatch or Sweep"
          >
            <Box className="h-6 w-6" />
          </button>
        </div>

        <div className="flex gap-2">
          {canFly && (
            <button
              type="button"
              onClick={onToggleFly}
              className={`flex h-11 w-11 items-center justify-center rounded-xl border ${
                flyMode
                  ? 'border-cyan-400 bg-cyan-500/30 text-cyan-200'
                  : 'border-slate-700 bg-slate-950/80 text-slate-300'
              }`}
              aria-label="Toggle Flight"
            >
              <Feather className="h-5 w-5" />
            </button>
          )}
          {flyMode && (
            <button
              type="button"
              onPointerDown={() => onDescend(true)}
              onPointerUp={() => onDescend(false)}
              onPointerCancel={() => onDescend(false)}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/80 text-slate-200 active:scale-95"
              aria-label="Descend"
            >
              <ArrowDown className="h-5 w-5" />
            </button>
          )}
          <button
            type="button"
            onPointerDown={() => onJump(true)}
            onPointerUp={() => onJump(false)}
            onPointerCancel={() => onJump(false)}
            className="flex h-11 w-16 items-center justify-center rounded-xl border border-emerald-400/60 bg-slate-950/80 text-emerald-300 active:scale-95"
            aria-label="Jump or Ascend"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
        </div>
      </div>
    </>
  );
}
