import * as THREE from 'three';
import type { PlayerSkin, SkinPattern } from '../types';

const CUSTOM_SKINS_KEY = 'voxcraft_custom_skins_v1';
const ACTIVE_SKIN_KEY = 'voxcraft_active_skin_v1';

export function defaultFacePixels(
  skinTone: string,
  eyeColor: string,
  hairColor: string,
  mouthColor = '#7c2d12'
): string[] {
  const s = skinTone;
  const h = hairColor;
  const e = eyeColor;
  const w = '#f8fafc';
  const m = mouthColor;
  return [
    h, h, h, h, h, h, h, h,
    h, h, h, h, h, h, h, h,
    h, s, s, s, s, s, s, h,
    s, w, e, s, s, e, w, s,
    s, s, s, s, s, s, s, s,
    s, s, m, m, m, m, s, s,
    s, s, s, s, s, s, s, s,
    s, s, s, s, s, s, s, s,
  ];
}

export const PRESET_SKINS: PlayerSkin[] = [
  {
    id: 'preset_aether_knight',
    name: 'Aether Knight',
    skinTone: '#f1c27d',
    headColor: '#334155',
    torsoColor: '#1e293b',
    accentColor: '#38bdf8',
    limbColor: '#0f172a',
    visorColor: '#67e8f9',
    capeColor: '#0284c7',
    hasVisor: true,
    hasCape: true,
    hasCrown: false,
    pattern: 'knight',
    facePixels: defaultFacePixels('#f1c27d', '#0284c7', '#334155'),
  },
  {
    id: 'preset_crimson_slayer',
    name: 'Crimson Slayer',
    skinTone: '#e0ac69',
    headColor: '#450a0a',
    torsoColor: '#7f1d1d',
    accentColor: '#fb923c',
    limbColor: '#1c1917',
    visorColor: '#fbbf24',
    capeColor: '#991b1b',
    hasVisor: true,
    hasCape: true,
    hasCrown: false,
    pattern: 'knight',
    facePixels: defaultFacePixels('#e0ac69', '#dc2626', '#1c1917'),
  },
  {
    id: 'preset_royal_sovereign',
    name: 'Royal Sovereign',
    skinTone: '#f5cfa0',
    headColor: '#4c1d95',
    torsoColor: '#5b21b6',
    accentColor: '#facc15',
    limbColor: '#312e81',
    visorColor: '#fde047',
    capeColor: '#b91c1c',
    hasVisor: false,
    hasCape: true,
    hasCrown: true,
    pattern: 'royal',
    facePixels: defaultFacePixels('#f5cfa0', '#4f46e5', '#78350f'),
  },
  {
    id: 'preset_emerald_ranger',
    name: 'Emerald Ranger',
    skinTone: '#d2996c',
    headColor: '#065f46',
    torsoColor: '#047857',
    accentColor: '#34d399',
    limbColor: '#451a03',
    visorColor: '#6ee7b7',
    capeColor: '#064e3b',
    hasVisor: false,
    hasCape: true,
    hasCrown: false,
    pattern: 'striped',
    facePixels: defaultFacePixels('#d2996c', '#059669', '#14532d'),
  },
  {
    id: 'preset_cyber_miner',
    name: 'Cyber Miner',
    skinTone: '#e2e8f0',
    headColor: '#0f172a',
    torsoColor: '#1e1b4b',
    accentColor: '#a78bfa',
    limbColor: '#1e293b',
    visorColor: '#22d3ee',
    capeColor: '#4f46e5',
    hasVisor: true,
    hasCape: false,
    hasCrown: false,
    pattern: 'cyber',
    facePixels: defaultFacePixels('#cbd5e1', '#06b6d4', '#0f172a', '#334155'),
  },
];

export const SKIN_PATTERNS: { id: SkinPattern; label: string }[] = [
  { id: 'knight', label: 'Knight Plate' },
  { id: 'royal', label: 'Royal Tunic' },
  { id: 'cyber', label: 'Cyber Core' },
  { id: 'striped', label: 'Striped' },
  { id: 'classic', label: 'Classic' },
];

export const BRUSH_SWATCHES: string[] = [
  '#f8fafc', '#cbd5e1', '#64748b', '#1e293b', '#0f172a',
  '#f5cfa0', '#f1c27d', '#e0ac69', '#c68642', '#8d5524',
  '#38bdf8', '#0284c7', '#34d399', '#059669', '#facc15',
  '#fb923c', '#ef4444', '#b91c1c', '#a78bfa', '#6d28d9',
];

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function validHex(val: unknown, fallback: string): string {
  return typeof val === 'string' && HEX_RE.test(val) ? val : fallback;
}

export function normalizeSkin(input: unknown, fallbackAccent = '#38bdf8'): PlayerSkin {
  const base = PRESET_SKINS[0];
  if (!input || typeof input !== 'object') {
    return {
      ...base,
      accentColor: validHex(fallbackAccent, base.accentColor),
      facePixels: [...base.facePixels],
    };
  }
  const obj = input as Partial<PlayerSkin>;
  const skinTone = validHex(obj.skinTone, base.skinTone);
  const headColor = validHex(obj.headColor, base.headColor);
  const accentColor = validHex(obj.accentColor, validHex(fallbackAccent, base.accentColor));
  const pattern: SkinPattern =
    obj.pattern === 'classic' ||
    obj.pattern === 'striped' ||
    obj.pattern === 'knight' ||
    obj.pattern === 'cyber' ||
    obj.pattern === 'royal'
      ? obj.pattern
      : 'knight';
  const defaultFace = defaultFacePixels(skinTone, accentColor, headColor);
  const facePixels =
    Array.isArray(obj.facePixels) && obj.facePixels.length === 64
      ? obj.facePixels.map((px, i) => validHex(px, defaultFace[i]))
      : defaultFace;

  return {
    id: typeof obj.id === 'string' && obj.id ? obj.id.slice(0, 40) : `custom_${Date.now()}`,
    name: typeof obj.name === 'string' && obj.name.trim() ? obj.name.trim().slice(0, 24) : 'Custom Explorer',
    skinTone,
    headColor,
    torsoColor: validHex(obj.torsoColor, base.torsoColor),
    accentColor,
    limbColor: validHex(obj.limbColor, base.limbColor),
    visorColor: validHex(obj.visorColor, base.visorColor),
    capeColor: validHex(obj.capeColor, base.capeColor),
    hasVisor: typeof obj.hasVisor === 'boolean' ? obj.hasVisor : true,
    hasCape: typeof obj.hasCape === 'boolean' ? obj.hasCape : false,
    hasCrown: typeof obj.hasCrown === 'boolean' ? obj.hasCrown : false,
    pattern,
    facePixels,
  };
}

export function skinSignature(skin?: PlayerSkin): string {
  if (!skin) return 'default';
  return [
    skin.skinTone,
    skin.headColor,
    skin.torsoColor,
    skin.accentColor,
    skin.limbColor,
    skin.visorColor,
    skin.capeColor,
    skin.hasVisor ? 1 : 0,
    skin.hasCape ? 1 : 0,
    skin.hasCrown ? 1 : 0,
    skin.pattern,
    skin.facePixels.join(''),
  ].join('|');
}

export function loadSavedSkins(): PlayerSkin[] {
  try {
    const raw = localStorage.getItem(CUSTOM_SKINS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map((s) => normalizeSkin(s)) : [];
  } catch {
    return [];
  }
}

export function saveCustomSkin(skin: PlayerSkin): PlayerSkin[] {
  const norm = normalizeSkin(skin);
  const next = [norm, ...loadSavedSkins().filter((s) => s.id !== norm.id)].slice(0, 12);
  try {
    localStorage.setItem(CUSTOM_SKINS_KEY, JSON.stringify(next));
  } catch {
    // ignore storage quota errors
  }
  return next;
}

export function deleteCustomSkin(id: string): PlayerSkin[] {
  const next = loadSavedSkins().filter((s) => s.id !== id);
  try {
    localStorage.setItem(CUSTOM_SKINS_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

export function loadActiveSkin(): PlayerSkin {
  try {
    const raw = localStorage.getItem(ACTIVE_SKIN_KEY);
    if (raw) return normalizeSkin(JSON.parse(raw));
  } catch {
    // ignore
  }
  return { ...PRESET_SKINS[0], facePixels: [...PRESET_SKINS[0].facePixels] };
}

export function saveActiveSkin(skin: PlayerSkin): void {
  try {
    localStorage.setItem(ACTIVE_SKIN_KEY, JSON.stringify(normalizeSkin(skin)));
  } catch {
    // ignore
  }
}

function createFaceTexture(skin: PlayerSkin): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 8;
  canvas.height = 8;
  const ctx = canvas.getContext('2d')!;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      ctx.fillStyle = skin.facePixels[y * 8 + x] || skin.skinTone;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function createTorsoTexture(skin: PlayerSkin): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = skin.torsoColor;
  ctx.fillRect(0, 0, 16, 16);

  if (skin.pattern === 'striped') {
    ctx.fillStyle = skin.accentColor;
    ctx.fillRect(0, 4, 16, 2);
    ctx.fillRect(0, 10, 16, 2);
  } else if (skin.pattern === 'knight') {
    ctx.fillStyle = skin.accentColor;
    ctx.fillRect(2, 2, 12, 2);
    ctx.fillRect(7, 4, 2, 7);
    ctx.fillRect(0, 12, 16, 2);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(6, 12, 4, 2);
  } else if (skin.pattern === 'cyber') {
    ctx.fillStyle = skin.visorColor;
    ctx.fillRect(3, 3, 2, 10);
    ctx.fillRect(11, 3, 2, 10);
    ctx.fillRect(5, 6, 6, 2);
    ctx.fillStyle = skin.accentColor;
    ctx.fillRect(6, 11, 4, 2);
  } else if (skin.pattern === 'royal') {
    ctx.fillStyle = '#facc15';
    ctx.fillRect(6, 0, 4, 16);
    ctx.fillStyle = skin.accentColor;
    ctx.fillRect(0, 12, 16, 2);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(7, 5, 2, 2);
  } else {
    ctx.fillStyle = skin.accentColor;
    ctx.fillRect(5, 0, 6, 2);
    ctx.fillRect(0, 12, 16, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export interface CharacterRig {
  root: THREE.Group;
  head: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  heldMesh: THREE.Mesh;
  capeMesh: THREE.Mesh | null;
  setVoiceState?: (micActive: boolean, speaking: boolean) => void;
  dispose: () => void;
}

export function buildCharacterRig(
  skin: PlayerSkin,
  opts?: { name?: string; showNameplate?: boolean; showHeldBlock?: boolean }
): CharacterRig {
  const norm = normalizeSkin(skin);
  const root = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  const texs: THREE.Texture[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T) => {
    geos.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T) => {
    mats.push(m);
    return m;
  };
  const trackTex = <T extends THREE.Texture>(t: T) => {
    texs.push(t);
    return t;
  };

  const faceTex = trackTex(createFaceTexture(norm));
  const torsoMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: trackTex(createTorsoTexture(norm)),
      roughness: 0.68,
      metalness: norm.pattern === 'knight' || norm.pattern === 'cyber' ? 0.32 : 0.1,
    })
  );
  const limbMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(norm.limbColor),
      roughness: 0.78,
      metalness: 0.12,
    })
  );
  const accentMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(norm.accentColor),
      roughness: 0.34,
      metalness: 0.55,
    })
  );
  const skinMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(norm.skinTone),
      roughness: 0.85,
      metalness: 0.02,
    })
  );
  const headMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(norm.headColor),
      roughness: 0.62,
      metalness: 0.18,
    })
  );
  const faceMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: faceTex,
      roughness: 0.78,
      metalness: 0.04,
    })
  );
  const visorMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(norm.visorColor),
      emissive: new THREE.Color(norm.visorColor),
      emissiveIntensity: 0.8,
      roughness: 0.14,
      metalness: 0.6,
    })
  );
  const capeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(norm.capeColor),
      roughness: 0.88,
      metalness: 0.04,
    })
  );
  const crownMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xb45309,
      emissiveIntensity: 0.25,
      roughness: 0.22,
      metalness: 0.88,
    })
  );

  const legGeo = trackGeo(new THREE.BoxGeometry(0.22, 0.7, 0.22));
  legGeo.translate(0, -0.35, 0);
  const bootGeo = trackGeo(new THREE.BoxGeometry(0.235, 0.18, 0.24));
  bootGeo.translate(0, -0.61, 0);

  const leftLeg = new THREE.Mesh(legGeo, limbMat);
  leftLeg.position.set(-0.14, 0.7, 0);
  leftLeg.castShadow = true;
  leftLeg.add(new THREE.Mesh(bootGeo, accentMat));
  root.add(leftLeg);

  const rightLeg = new THREE.Mesh(legGeo, limbMat);
  rightLeg.position.set(0.14, 0.7, 0);
  rightLeg.castShadow = true;
  rightLeg.add(new THREE.Mesh(bootGeo, accentMat));
  root.add(rightLeg);

  const torso = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.52, 0.65, 0.28)), torsoMat);
  torso.position.set(0, 1.025, 0);
  torso.castShadow = true;
  root.add(torso);

  const belt = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.54, 0.09, 0.3)), accentMat);
  belt.position.set(0, 0.76, 0);
  root.add(belt);

  let capeMesh: THREE.Mesh | null = null;
  if (norm.hasCape) {
    const capeGeo = trackGeo(new THREE.BoxGeometry(0.46, 0.76, 0.05));
    capeGeo.translate(0, -0.36, 0);
    capeMesh = new THREE.Mesh(capeGeo, capeMat);
    capeMesh.position.set(0, 1.32, 0.16);
    capeMesh.rotation.x = 0.14;
    capeMesh.castShadow = true;
    root.add(capeMesh);
  } else {
    const pack = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.36, 0.42, 0.14)), accentMat);
    pack.position.set(0, 1.05, 0.2);
    pack.castShadow = true;
    root.add(pack);
  }

  const headMaterials = [headMat, headMat, headMat, skinMat, headMat, faceMat];
  const head = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.42, 0.42, 0.42)), headMaterials);
  head.position.set(0, 1.56, 0);
  head.castShadow = true;
  root.add(head);

  if (norm.hasVisor) {
    const visor = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.36, 0.11, 0.05)), visorMat);
    visor.position.set(0, 0.03, -0.2);
    head.add(visor);
  }

  if (norm.hasCrown) {
    const band = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.45, 0.08, 0.45)), crownMat);
    band.position.set(0, 0.24, 0);
    head.add(band);
    const pointGeo = trackGeo(new THREE.BoxGeometry(0.08, 0.1, 0.08));
    for (const [cx, cz] of [[-0.16, -0.16], [0.16, -0.16], [0, -0.17], [-0.16, 0.16], [0.16, 0.16]]) {
      const prong = new THREE.Mesh(pointGeo, crownMat);
      prong.position.set(cx, 0.32, cz);
      head.add(prong);
    }
  }

  const armGeo = trackGeo(new THREE.BoxGeometry(0.18, 0.48, 0.18));
  armGeo.translate(0, -0.2, 0);
  const handGeo = trackGeo(new THREE.BoxGeometry(0.17, 0.15, 0.17));
  handGeo.translate(0, -0.5, 0);
  const pauldronGeo = trackGeo(new THREE.BoxGeometry(0.22, 0.12, 0.22));
  pauldronGeo.translate(0, -0.02, 0);

  const leftArm = new THREE.Mesh(armGeo, limbMat);
  leftArm.position.set(-0.36, 1.32, 0);
  leftArm.castShadow = true;
  leftArm.add(new THREE.Mesh(handGeo, skinMat));
  leftArm.add(new THREE.Mesh(pauldronGeo, accentMat));
  root.add(leftArm);

  const rightArm = new THREE.Mesh(armGeo, limbMat);
  rightArm.position.set(0.36, 1.32, 0);
  rightArm.castShadow = true;
  rightArm.add(new THREE.Mesh(handGeo, skinMat));
  rightArm.add(new THREE.Mesh(pauldronGeo, accentMat));
  root.add(rightArm);

  const heldMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.7 }));
  const heldMesh = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.22, 0.22, 0.22)), heldMat);
  heldMesh.position.set(0, -0.54, -0.12);
  heldMesh.visible = opts?.showHeldBlock !== false;
  rightArm.add(heldMesh);

  let setVoiceState: ((micActive: boolean, speaking: boolean) => void) | undefined;
  if (opts?.showNameplate && opts.name) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const labelTex = trackTex(new THREE.CanvasTexture(canvas));
    labelTex.colorSpace = THREE.SRGBColorSpace;
    const playerName = opts.name.slice(0, 14);
    let lastMic = false;
    let lastSpeaking = false;

    const redrawLabel = (micActive: boolean, speaking: boolean) => {
      ctx.clearRect(0, 0, 256, 64);
      ctx.fillStyle = speaking ? 'rgba(6, 78, 59, 0.92)' : 'rgba(15, 23, 42, 0.84)';
      ctx.beginPath();
      ctx.roundRect(12, 12, 232, 40, 12);
      ctx.fill();
      ctx.strokeStyle = speaking ? '#34d399' : micActive ? '#38bdf8' : norm.accentColor;
      ctx.lineWidth = speaking ? 3.5 : 2;
      ctx.stroke();

      if (micActive) {
        ctx.fillStyle = speaking ? '#34d399' : '#38bdf8';
        ctx.beginPath();
        ctx.arc(32, 32, speaking ? 7 : 5, 0, Math.PI * 2);
        ctx.fill();
        if (speaking) {
          ctx.strokeStyle = '#a7f3d0';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(32, 32, 10, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(playerName, micActive ? 138 : 128, 33);
      labelTex.needsUpdate = true;
    };

    redrawLabel(false, false);

    setVoiceState = (micActive: boolean, speaking: boolean) => {
      if (micActive === lastMic && speaking === lastSpeaking) return;
      lastMic = micActive;
      lastSpeaking = speaking;
      redrawLabel(micActive, speaking);
    };

    const sprite = new THREE.Sprite(
      trackMat(new THREE.SpriteMaterial({ map: labelTex, transparent: true, depthWrite: false }))
    );
    sprite.position.set(0, norm.hasCrown ? 2.22 : 2.08, 0);
    sprite.scale.set(1.65, 0.41, 1);
    root.add(sprite);
  }

  return {
    root,
    head,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    heldMesh,
    capeMesh,
    setVoiceState,
    dispose: () => {
      for (const g of geos) g.dispose();
      for (const m of mats) m.dispose();
      for (const t of texs) t.dispose();
    },
  };
}

export function createRemotePlayerMesh(
  name: string,
  color: string,
  skin?: PlayerSkin
): CharacterRig {
  return buildCharacterRig(normalizeSkin(skin, color), {
    name,
    showNameplate: true,
    showHeldBlock: true,
  });
}
