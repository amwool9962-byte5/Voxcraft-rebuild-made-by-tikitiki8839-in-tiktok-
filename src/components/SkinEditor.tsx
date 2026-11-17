import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Check,
  Crown,
  Eye,
  Palette,
  Pipette,
  Play,
  RotateCw,
  Save,
  Shield,
  Trash2,
  X,
} from 'lucide-react';
import type { PlayerSkin } from '../types';
import {
  BRUSH_SWATCHES,
  buildCharacterRig,
  defaultFacePixels,
  deleteCustomSkin,
  loadSavedSkins,
  PRESET_SKINS,
  saveCustomSkin,
  SKIN_PATTERNS,
  type CharacterRig,
} from '../game/skins';

interface SkinEditorProps {
  initialSkin: PlayerSkin;
  onClose: () => void;
  onApplySkin: (skin: PlayerSkin) => void;
}

const COLOR_SLOTS: {
  key: 'headColor' | 'skinTone' | 'torsoColor' | 'accentColor' | 'limbColor' | 'visorColor' | 'capeColor';
  label: string;
}[] = [
  { key: 'headColor', label: 'Helmet / Hair' },
  { key: 'skinTone', label: 'Skin Tone' },
  { key: 'torsoColor', label: 'Chest Armor' },
  { key: 'accentColor', label: 'Belt & Trim' },
  { key: 'limbColor', label: 'Sleeves & Legs' },
  { key: 'visorColor', label: 'Visor Glow' },
  { key: 'capeColor', label: 'Cape Cloth' },
];

export function SkinEditor({ initialSkin, onClose, onApplySkin }: SkinEditorProps) {
  const [draft, setDraft] = useState<PlayerSkin>(() => ({
    ...initialSkin,
    facePixels: [...initialSkin.facePixels],
  }));
  const [savedSkins, setSavedSkins] = useState<PlayerSkin[]>(() => loadSavedSkins());
  const [brushColor, setBrushColor] = useState<string>('#38bdf8');
  const [eyedropper, setEyedropper] = useState(false);
  const [isPainting, setIsPainting] = useState(false);
  const [autoSpin, setAutoSpin] = useState(true);
  const [walkPreview, setWalkPreview] = useState(true);
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rigRef = useRef<CharacterRig | null>(null);
  const yawRef = useRef(0.38);
  const pitchRef = useRef(0.18);
  const autoSpinRef = useRef(autoSpin);
  const walkRef = useRef(walkPreview);
  const dragRef = useRef({ active: false, x: 0, y: 0 });

  autoSpinRef.current = autoSpin;
  walkRef.current = walkPreview;

  useEffect(() => {
    const container = viewportRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;

    const gl = renderer.getContext();
    const dbg = gl.getExtension('WEBGL_debug_renderer_info');
    const rendererStr = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
    const isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(rendererStr);

    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isSoftwareGl ? 1 : 2));

    const w = Math.max(240, container.clientWidth);
    const h = Math.max(240, container.clientHeight);
    renderer.setSize(w, h);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;

    const camera = new THREE.PerspectiveCamera(36, w / h, 0.1, 30);
    camera.position.set(0, 1.25, 3.6);
    camera.lookAt(0, 0.98, 0);

    const hemi = new THREE.HemisphereLight(0xe0f2fe, 0x0f172a, 0.75);
    const key = new THREE.DirectionalLight(0xfff1d6, 1.55);
    key.position.set(2.5, 4.5, 3.5);
    key.castShadow = !isSoftwareGl;
    const rim = new THREE.DirectionalLight(0x38bdf8, 0.85);
    rim.position.set(-3, 2.5, -2.5);
    scene.add(hemi, key, rim);

    const pedestalGeo = new THREE.CylinderGeometry(0.85, 0.95, 0.14, 24);
    const pedestalMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.65,
      metalness: 0.25,
    });
    const pedestal = new THREE.Mesh(pedestalGeo, pedestalMat);
    pedestal.position.set(0, -0.07, 0);
    pedestal.receiveShadow = true;
    scene.add(pedestal);

    const ringGeo = new THREE.RingGeometry(0.74, 0.8, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.6,
      roughness: 0.25,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = 0.004;
    scene.add(ring);

    const ro = new ResizeObserver(() => {
      const nw = Math.max(200, container.clientWidth);
      const nh = Math.max(200, container.clientHeight);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    });
    ro.observe(container);

    let raf = 0;
    let prev = performance.now();
    let lastDraw = 0;
    let walkPhase = 0;
    const minInterval = isSoftwareGl ? 1000 / 24 : 0;

    const animate = (now: number) => {
      raf = requestAnimationFrame(animate);
      if (minInterval > 0 && now - lastDraw < minInterval) return;
      lastDraw = now;

      const dt = Math.min(0.05, (now - prev) / 1000);
      prev = now;

      if (autoSpinRef.current) {
        yawRef.current += dt * 0.65;
      }

      const rig = rigRef.current;
      if (rig) {
        rig.root.rotation.y = Math.PI + yawRef.current;
        rig.root.rotation.x = THREE.MathUtils.clamp(pitchRef.current - 0.12, -0.35, 0.35);

        if (walkRef.current) {
          walkPhase += dt * 5.5;
          const swing = Math.sin(walkPhase) * 0.52;
          rig.leftLeg.rotation.x = swing;
          rig.rightLeg.rotation.x = -swing;
          rig.leftArm.rotation.x = -swing * 0.7;
          rig.rightArm.rotation.x = swing * 0.7;
          if (rig.capeMesh) {
            rig.capeMesh.rotation.x = 0.18 + Math.abs(Math.cos(walkPhase)) * 0.14;
          }
        } else {
          rig.leftLeg.rotation.x = 0;
          rig.rightLeg.rotation.x = 0;
          rig.leftArm.rotation.x = 0;
          rig.rightArm.rotation.x = 0;
          if (rig.capeMesh) {
            rig.capeMesh.rotation.x = 0.12;
          }
        }
      }

      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      if (rigRef.current) {
        scene.remove(rigRef.current.root);
        rigRef.current.dispose();
        rigRef.current = null;
      }
      pedestalGeo.dispose();
      pedestalMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (rigRef.current) {
      scene.remove(rigRef.current.root);
      rigRef.current.dispose();
      rigRef.current = null;
    }
    const rig = buildCharacterRig(draft, {
      showNameplate: false,
      showHeldBlock: false,
    });
    scene.add(rig.root);
    rigRef.current = rig;
  }, [draft]);

  useEffect(() => {
    const onUp = () => setIsPainting(false);
    window.addEventListener('pointerup', onUp);
    return () => window.removeEventListener('pointerup', onUp);
  }, []);

  const handleFacePixel = (idx: number) => {
    if (eyedropper) {
      setBrushColor(draft.facePixels[idx] || draft.skinTone);
      setEyedropper(false);
      return;
    }
    setDraft((prev) => {
      if (prev.facePixels[idx] === brushColor) return prev;
      const next = [...prev.facePixels];
      next[idx] = brushColor;
      return { ...prev, facePixels: next };
    });
  };

  const handleSaveSlot = () => {
    const skinToSave: PlayerSkin = {
      ...draft,
      id: draft.id.startsWith('preset_') ? `custom_${Date.now()}` : draft.id,
      name: draft.name.trim() || 'My Explorer',
    };
    const nextList = saveCustomSkin(skinToSave);
    setSavedSkins(nextList);
    setDraft(skinToSave);
    setSaveNotice('Saved to Skin Library');
    window.setTimeout(() => setSaveNotice(null), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-2 sm:p-4"
      style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}
    >
      <div className="flex h-full max-h-[94dvh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-400/40 bg-slate-950">
              <Palette className="h-4 w-4 text-cyan-400" />
            </div>
            <div>
              <h2
                className="text-base sm:text-lg font-extrabold tracking-wide text-white"
                style={{ fontFamily: "'Cinzel', Georgia, serif" }}
              >
                VOXCRAFT SKIN STUDIO
              </h2>
              <p className="text-[11px] text-slate-400">
                Customize armor, cape, royal crown, and 8×8 voxel face — synced live in Multiplayer
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close Skin Studio"
            className="rounded-lg border border-slate-700 bg-slate-950 p-2 text-slate-300 hover:border-slate-500 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Main 2-column Body */}
        <div className="grid flex-1 grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left Column: 3D Live Preview */}
          <div className="lg:col-span-5 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-800 bg-slate-950/70 p-3 sm:p-4">
            <div className="mb-2.5 flex items-center gap-2">
              <input
                value={draft.name}
                onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
                maxLength={24}
                placeholder="Skin Name"
                className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-bold text-white outline-none focus:border-cyan-400"
              />
            </div>

            <div
              ref={viewportRef}
              onPointerDown={(e) => {
                setAutoSpin(false);
                dragRef.current = { active: true, x: e.clientX, y: e.clientY };
              }}
              onPointerMove={(e) => {
                if (!dragRef.current.active) return;
                const dx = e.clientX - dragRef.current.x;
                const dy = e.clientY - dragRef.current.y;
                dragRef.current.x = e.clientX;
                dragRef.current.y = e.clientY;
                yawRef.current += dx * 0.012;
                pitchRef.current = Math.max(-0.25, Math.min(0.45, pitchRef.current + dy * 0.008));
              }}
              onPointerUp={() => {
                dragRef.current.active = false;
              }}
              onPointerLeave={() => {
                dragRef.current.active = false;
              }}
              className="relative min-h-[250px] sm:min-h-[300px] flex-1 cursor-grab active:cursor-grabbing rounded-xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 touch-none overflow-hidden"
            >
              <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-slate-950/85 px-2 py-1 text-[10px] text-slate-400">
                Drag to rotate 3D preview
              </div>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setWalkPreview((v) => !v)}
                  className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold cursor-pointer ${
                    walkPreview
                      ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                      : 'border-slate-700 bg-slate-900 text-slate-300'
                  }`}
                >
                  <Play className="h-3 w-3" /> {walkPreview ? 'Walk' : 'Idle'}
                </button>
                <button
                  type="button"
                  onClick={() => setAutoSpin((v) => !v)}
                  className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold cursor-pointer ${
                    autoSpin
                      ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                      : 'border-slate-700 bg-slate-900 text-slate-300'
                  }`}
                >
                  <RotateCw className="h-3 w-3" /> {autoSpin ? 'Auto-Spin' : 'Manual'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAutoSpin(false);
                    yawRef.current = yawRef.current > 1.5 ? 0 : Math.PI;
                    pitchRef.current = 0.12;
                  }}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:border-slate-500 cursor-pointer"
                >
                  Flip Back
                </button>
              </div>

              <button
                type="button"
                onClick={handleSaveSlot}
                className="inline-flex items-center gap-1 rounded-lg border border-amber-400/60 bg-amber-500/15 px-2.5 py-1 text-[11px] font-bold text-amber-200 hover:bg-amber-500/30 cursor-pointer"
              >
                <Save className="h-3 w-3" /> Save Slot
              </button>
            </div>

            {saveNotice && (
              <div className="mt-1.5 text-center text-[11px] font-semibold text-emerald-300">
                {saveNotice}
              </div>
            )}
          </div>

          {/* Right Column: Presets, Patterns, Accessories, Colors, Face Painter */}
          <div className="lg:col-span-7 flex flex-col gap-4 p-3 sm:p-5 overflow-y-auto">
            {/* Presets & Saved */}
            <div>
              <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Starter Presets {savedSkins.length > 0 ? `& Saved (${savedSkins.length})` : ''}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_SKINS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setDraft({ ...preset, facePixels: [...preset.facePixels] })}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold transition cursor-pointer ${
                      draft.id === preset.id
                        ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                        : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-600'
                    }`}
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-sm border border-white/30"
                      style={{ backgroundColor: preset.accentColor }}
                    />
                    {preset.name}
                  </button>
                ))}

                {savedSkins.map((saved) => (
                  <div
                    key={saved.id}
                    className={`inline-flex items-center gap-1 rounded-lg border pl-2 pr-1 py-1 text-[11px] font-bold ${
                      draft.id === saved.id
                        ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                        : 'border-slate-800 bg-slate-950 text-slate-300'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setDraft({ ...saved, facePixels: [...saved.facePixels] })}
                      className="inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-sm border border-white/30"
                        style={{ backgroundColor: saved.accentColor }}
                      />
                      <span>{saved.name}</span>
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${saved.name}`}
                      onClick={() => setSavedSkins(deleteCustomSkin(saved.id))}
                      className="rounded p-0.5 text-slate-500 hover:text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Patterns & 3D Accessories */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Chest Armor Pattern
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {SKIN_PATTERNS.map((pat) => (
                    <button
                      key={pat.id}
                      type="button"
                      onClick={() => setDraft((prev) => ({ ...prev, pattern: pat.id }))}
                      className={`rounded-lg border px-2.5 py-1 text-[11px] font-bold cursor-pointer ${
                        draft.pattern === pat.id
                          ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                          : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      {pat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  3D Gear & Royal Accessories
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDraft((prev) => ({ ...prev, hasVisor: !prev.hasVisor }))}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold cursor-pointer ${
                      draft.hasVisor
                        ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    <Eye className="h-3.5 w-3.5" /> Visor
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraft((prev) => ({ ...prev, hasCape: !prev.hasCape }))}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold cursor-pointer ${
                      draft.hasCape
                        ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    <Shield className="h-3.5 w-3.5" /> Cape
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraft((prev) => ({ ...prev, hasCrown: !prev.hasCrown }))}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-bold cursor-pointer ${
                      draft.hasCrown
                        ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                        : 'border-slate-800 bg-slate-950 text-slate-400'
                    }`}
                  >
                    <Crown className="h-3.5 w-3.5" /> Crown
                  </button>
                </div>
              </div>
            </div>

            {/* Body & Armor Colors */}
            <div>
              <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Body & Armor Colors
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {COLOR_SLOTS.map((slot) => (
                  <label
                    key={slot.key}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 cursor-pointer hover:border-slate-600"
                  >
                    <span className="truncate">{slot.label}</span>
                    <input
                      type="color"
                      value={draft[slot.key]}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDraft((prev) => ({ ...prev, [slot.key]: val }));
                      }}
                      className="h-5 w-7 cursor-pointer rounded border-0 bg-transparent p-0"
                    />
                  </label>
                ))}
              </div>
            </div>

            {/* 8x8 Pixel Face Painter */}
            <div className="rounded-xl border border-slate-800 bg-slate-950 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-100">
                  <Palette className="h-3.5 w-3.5 text-cyan-400" />
                  <span>8×8 Pixel Face Painter</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setEyedropper((v) => !v)}
                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold cursor-pointer ${
                      eyedropper
                        ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                        : 'border-slate-700 bg-slate-900 text-slate-300'
                    }`}
                  >
                    <Pipette className="h-3 w-3" /> Pick
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        facePixels: defaultFacePixels(prev.skinTone, prev.accentColor, prev.headColor),
                      }))
                    }
                    className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] font-semibold text-slate-300 hover:border-slate-500 cursor-pointer"
                  >
                    Reset Face
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start gap-3">
                <div
                  className="grid grid-cols-8 gap-0.5 rounded-lg border border-slate-700 bg-slate-800 p-1 select-none touch-none shrink-0"
                  onPointerLeave={() => setIsPainting(false)}
                >
                  {draft.facePixels.map((hex, i) => (
                    <button
                      key={i}
                      type="button"
                      aria-label={`Face pixel ${i + 1}`}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        setIsPainting(true);
                        handleFacePixel(i);
                      }}
                      onPointerEnter={() => {
                        if (isPainting && !eyedropper) handleFacePixel(i);
                      }}
                      style={{ backgroundColor: hex }}
                      className="h-5 w-5 sm:h-6 sm:w-6 rounded-[2px] cursor-crosshair"
                    />
                  ))}
                </div>

                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 text-[11px] text-slate-300">
                    <span>Brush Color:</span>
                    <input
                      type="color"
                      value={brushColor}
                      onChange={(e) => {
                        setBrushColor(e.target.value);
                        setEyedropper(false);
                      }}
                      className="h-6 w-8 cursor-pointer rounded border border-slate-700 bg-transparent"
                    />
                    <span className="font-mono text-slate-400">{brushColor}</span>
                  </div>

                  <div className="grid grid-cols-10 gap-1.5">
                    {BRUSH_SWATCHES.map((swatch) => (
                      <button
                        key={swatch}
                        type="button"
                        onClick={() => {
                          setBrushColor(swatch);
                          setEyedropper(false);
                        }}
                        style={{ backgroundColor: swatch }}
                        aria-label={`Brush swatch ${swatch}`}
                        className={`h-5 w-full rounded border transition cursor-pointer ${
                          brushColor.toLowerCase() === swatch.toLowerCase()
                            ? 'border-white scale-110 ring-1 ring-cyan-400'
                            : 'border-slate-700 hover:scale-105'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-slate-800 bg-slate-950 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-xs font-bold text-slate-300 hover:text-white cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onApplySkin(draft)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-400 px-5 py-2 text-xs font-extrabold text-slate-950 shadow-lg hover:bg-cyan-300 cursor-pointer"
          >
            <Check className="h-4 w-4" /> Save & Equip Skin
          </button>
        </div>
      </div>
    </div>
  );
}
