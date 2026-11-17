import * as THREE from 'three';
import type { CreatureMeta, CreatureSpecies, SpawnEggDef } from '../types';

export const EggId = {
  SHEEP: 201,
  FOX: 202,
  STAG: 203,
  STALKER: 204,
  SKELETON: 205,
  CREEPER: 206,
  BLAZE_IMP: 207,
  MAGMA_GOLEM: 208,
  IGNIS_LORD: 209,
  KING_BOSS: 210,
  SKY_GRIFFIN: 211,
  STORM_SENTINEL: 212,
  SKY_WARDEN: 213,
  VILLAGER: 214,
  SCOUT_BOT: 215,
  LASER_DRONE: 216,
  MECHA_TROOPER: 217,
  MEGA_TITAN: 218,
  ANDROID: 219,
  BIG_SCOUT_DROID: 220,
  MANGO_BIRD: 221,
  SUN_BIRD: 222,
  MANGO_GUARDIAN: 223,
} as const;

export const SPAWN_EGGS: SpawnEggDef[] = [
  { id: EggId.SHEEP, name: 'Woolly Ram Egg', species: 'sheep', category: 'animal', primaryColor: '#f1f5f9', spotColor: '#d97706' },
  { id: EggId.FOX, name: 'Timber Fox Egg', species: 'fox', category: 'animal', primaryColor: '#ea580c', spotColor: '#f8fafc' },
  { id: EggId.STAG, name: 'Aether Stag Egg', species: 'stag', category: 'animal', primaryColor: '#0f766e', spotColor: '#67e8f9' },
  { id: EggId.STALKER, name: 'Night Stalker Egg', species: 'stalker', category: 'monster', primaryColor: '#3f6212', spotColor: '#ef4444' },
  { id: EggId.SKELETON, name: 'Dusk Marksman Egg', species: 'skeleton', category: 'monster', primaryColor: '#cbd5e1', spotColor: '#4338ca' },
  { id: EggId.CREEPER, name: 'Rift Creeper Egg', species: 'creeper', category: 'monster', primaryColor: '#16a34a', spotColor: '#c084fc' },
  { id: EggId.BLAZE_IMP, name: 'Ember Imp Egg', species: 'blaze_imp', category: 'monster', primaryColor: '#f97316', spotColor: '#fde047' },
  { id: EggId.MAGMA_GOLEM, name: 'Pyro Golem Egg', species: 'magma_golem', category: 'monster', primaryColor: '#1e1b4b', spotColor: '#fb7185' },
  { id: EggId.IGNIS_LORD, name: 'Ignis Rex Egg', species: 'ignis_lord', category: 'boss', primaryColor: '#7f1d1d', spotColor: '#fbbf24' },
  { id: EggId.KING_BOSS, name: 'King Boss Egg', species: 'king_boss', category: 'boss', primaryColor: '#475569', spotColor: '#facc15' },
  { id: EggId.SKY_GRIFFIN, name: 'Cloud Griffin Egg', species: 'sky_griffin', category: 'animal', primaryColor: '#f8fafc', spotColor: '#fbbf24' },
  { id: EggId.STORM_SENTINEL, name: 'Storm Sentinel Egg', species: 'storm_wisp', category: 'monster', primaryColor: '#e2e8f0', spotColor: '#38bdf8' },
  { id: EggId.SKY_WARDEN, name: 'Sky Titan Egg', species: 'sky_warden', category: 'boss', primaryColor: '#06b6d4', spotColor: '#fde047' },
  { id: EggId.VILLAGER, name: 'Villager Egg', species: 'villager', category: 'animal', primaryColor: '#b45309', spotColor: '#10b981' },
  { id: EggId.SCOUT_BOT, name: 'Scout Droid Egg', species: 'scout_bot', category: 'animal', primaryColor: '#cbd5e1', spotColor: '#22d3ee' },
  { id: EggId.LASER_DRONE, name: 'Laser Drone Egg', species: 'laser_drone', category: 'monster', primaryColor: '#334155', spotColor: '#f43f5e' },
  { id: EggId.MECHA_TROOPER, name: 'Mecha Trooper Egg', species: 'mecha_trooper', category: 'monster', primaryColor: '#64748b', spotColor: '#facc15' },
  { id: EggId.MEGA_TITAN, name: 'Omega Mechatron Egg', species: 'mega_titan', category: 'boss', primaryColor: '#1e293b', spotColor: '#fb7185' },
  { id: EggId.ANDROID, name: 'Android Egg', species: 'android', category: 'animal', primaryColor: '#84cc16', spotColor: '#22d3ee' },
  { id: EggId.BIG_SCOUT_DROID, name: 'Big Scout Droid Egg', species: 'big_scout_droid', category: 'animal', primaryColor: '#e2e8f0', spotColor: '#f59e0b' },
  { id: EggId.MANGO_BIRD, name: 'Mango Bird Egg', species: 'mango_bird', category: 'animal', primaryColor: '#ef4444', spotColor: '#facc15' },
  { id: EggId.SUN_BIRD, name: 'Suncrest Bird Egg', species: 'sun_bird', category: 'animal', primaryColor: '#0ea5e9', spotColor: '#fbbf24' },
  { id: EggId.MANGO_GUARDIAN, name: 'Mango Guardian Boss Egg', species: 'mango_guardian', category: 'boss', primaryColor: '#f97316', spotColor: '#334155' },
];

const EGG_MAP = new Map<number, SpawnEggDef>(SPAWN_EGGS.map((e) => [e.id, e]));
const EGG_ICON_CACHE = new Map<number, string>();

export function isEggId(id: number): boolean {
  return EGG_MAP.has(id);
}

export function getEggDef(id: number): SpawnEggDef | undefined {
  return EGG_MAP.get(id);
}

export function getAllEggs(): SpawnEggDef[] {
  return SPAWN_EGGS;
}

export function renderEggIcon(egg: SpawnEggDef): string {
  const cached = EGG_ICON_CACHE.get(egg.id);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 48;
  canvas.height = 48;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 48, 48);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
  ctx.beginPath();
  ctx.ellipse(24, 26, 13.5, 17, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = egg.primaryColor;
  ctx.beginPath();
  ctx.ellipse(24, 26, 11.5, 15, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
  ctx.beginPath();
  ctx.ellipse(25, 29, 10, 11, 0, 0.2, Math.PI - 0.1);
  ctx.fill();

  ctx.fillStyle = egg.spotColor;
  for (const [sx, sy, sr] of [
    [19, 19, 2.8],
    [28, 17, 2.2],
    [25, 24, 3.2],
    [17, 29, 2.5],
    [29, 31, 2.9],
    [22, 35, 2.1],
  ]) {
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.beginPath();
  ctx.ellipse(19.5, 16, 2.2, 4.2, -0.45, 0, Math.PI * 2);
  ctx.fill();

  const url = canvas.toDataURL();
  EGG_ICON_CACHE.set(egg.id, url);
  return url;
}

export const CREATURE_META: Record<CreatureSpecies, CreatureMeta> = {
  sheep: {
    species: 'sheep',
    name: 'Woolly Ram',
    hostile: false,
    nocturnal: false,
    maxHealth: 30,
    speed: 1.9,
    damage: 0,
    radius: 0.45,
    height: 1.1,
  },
  fox: {
    species: 'fox',
    name: 'Timber Fox',
    hostile: false,
    nocturnal: false,
    maxHealth: 24,
    speed: 3.1,
    damage: 0,
    radius: 0.36,
    height: 0.85,
  },
  stag: {
    species: 'stag',
    name: 'Aether Stag',
    hostile: false,
    nocturnal: false,
    maxHealth: 40,
    speed: 2.5,
    damage: 0,
    radius: 0.48,
    height: 1.55,
  },
  stalker: {
    species: 'stalker',
    name: 'Night Stalker',
    hostile: true,
    nocturnal: true,
    maxHealth: 50,
    speed: 3.45,
    damage: 14,
    radius: 0.42,
    height: 1.85,
  },
  skeleton: {
    species: 'skeleton',
    name: 'Dusk Marksman',
    hostile: true,
    nocturnal: true,
    maxHealth: 42,
    speed: 3.6,
    damage: 12,
    radius: 0.38,
    height: 1.85,
  },
  creeper: {
    species: 'creeper',
    name: 'Rift Creeper',
    hostile: true,
    nocturnal: true,
    maxHealth: 45,
    speed: 4.0,
    damage: 24,
    radius: 0.42,
    height: 1.55,
  },
  blaze_imp: {
    species: 'blaze_imp',
    name: 'Ember Imp',
    hostile: true,
    nocturnal: false,
    fireImmune: true,
    maxHealth: 48,
    speed: 3.45,
    damage: 14,
    radius: 0.44,
    height: 1.75,
  },
  magma_golem: {
    species: 'magma_golem',
    name: 'Pyro Golem',
    hostile: true,
    nocturnal: false,
    fireImmune: true,
    maxHealth: 96,
    speed: 2.55,
    damage: 20,
    radius: 0.56,
    height: 2.2,
  },
  ignis_lord: {
    species: 'ignis_lord',
    name: 'Ignis Rex',
    hostile: true,
    nocturnal: false,
    fireImmune: true,
    isBoss: true,
    maxHealth: 420,
    speed: 3.3,
    damage: 25,
    radius: 1.25,
    height: 4.35,
  },
  king_boss: {
    species: 'king_boss',
    name: 'King Aethelgard',
    hostile: true,
    nocturnal: false,
    isBoss: true,
    maxHealth: 460,
    speed: 3.35,
    damage: 24,
    radius: 1.25,
    height: 4.5,
  },
  sky_griffin: {
    species: 'sky_griffin',
    name: 'Cloud Griffin',
    hostile: false,
    nocturnal: false,
    maxHealth: 36,
    speed: 2.85,
    damage: 0,
    radius: 0.46,
    height: 1.35,
  },
  storm_wisp: {
    species: 'storm_wisp',
    name: 'Storm Sentinel',
    hostile: true,
    nocturnal: false,
    maxHealth: 56,
    speed: 3.3,
    damage: 14,
    radius: 0.45,
    height: 1.85,
  },
  sky_warden: {
    species: 'sky_warden',
    name: 'Zephyrus, Sky Titan',
    hostile: true,
    nocturnal: false,
    isBoss: true,
    maxHealth: 440,
    speed: 3.45,
    damage: 24,
    radius: 1.25,
    height: 4.5,
  },
  villager: {
    species: 'villager',
    name: 'Villager',
    hostile: false,
    nocturnal: false,
    fireImmune: true,
    maxHealth: 45,
    speed: 2.25,
    damage: 0,
    radius: 0.42,
    height: 1.95,
  },
  scout_bot: {
    species: 'scout_bot',
    name: 'Scout Droid',
    hostile: false,
    nocturnal: false,
    fireImmune: true,
    maxHealth: 48,
    speed: 3.35,
    damage: 0,
    radius: 0.44,
    height: 1.38,
  },
  big_scout_droid: {
    species: 'big_scout_droid',
    name: 'Big Scout Droid',
    hostile: false,
    nocturnal: false,
    fireImmune: true,
    maxHealth: 180,
    speed: 2.9,
    damage: 0,
    radius: 0.95,
    height: 3.05,
  },
  android: {
    species: 'android',
    name: 'Cyber Android',
    hostile: false,
    nocturnal: false,
    fireImmune: true,
    maxHealth: 75,
    speed: 3.15,
    damage: 0,
    radius: 0.44,
    height: 1.98,
  },
  laser_drone: {
    species: 'laser_drone',
    name: 'Laser Drone',
    hostile: true,
    nocturnal: false,
    fireImmune: true,
    maxHealth: 58,
    speed: 3.65,
    damage: 14,
    radius: 0.48,
    height: 1.75,
  },
  mecha_trooper: {
    species: 'mecha_trooper',
    name: 'Mecha Trooper',
    hostile: true,
    nocturnal: false,
    fireImmune: true,
    maxHealth: 115,
    speed: 2.95,
    damage: 20,
    radius: 0.62,
    height: 2.4,
  },
  mega_titan: {
    species: 'mega_titan',
    name: 'OMEGA MECHATRON',
    hostile: true,
    nocturnal: false,
    fireImmune: true,
    isBoss: true,
    maxHealth: 850,
    speed: 3.45,
    damage: 28,
    radius: 1.8,
    height: 6.4,
  },
  mango_bird: {
    species: 'mango_bird',
    name: 'Mango Bird',
    hostile: false,
    friendlyAlly: true,
    nocturnal: false,
    maxHealth: 36,
    speed: 2.7,
    damage: 0,
    radius: 0.38,
    height: 0.95,
  },
  sun_bird: {
    species: 'sun_bird',
    name: 'Suncrest Bird',
    hostile: false,
    friendlyAlly: true,
    nocturnal: false,
    maxHealth: 34,
    speed: 3.0,
    damage: 0,
    radius: 0.36,
    height: 0.92,
  },
  mango_guardian: {
    species: 'mango_guardian',
    name: 'Mango Guardian',
    hostile: false,
    friendlyAlly: true,
    nocturnal: false,
    fireImmune: true,
    isBoss: true,
    maxHealth: 620,
    speed: 3.1,
    damage: 28,
    radius: 1.15,
    height: 4.1,
  },
};

export interface CreatureRig {
  root: THREE.Group;
  body: THREE.Object3D;
  head: THREE.Object3D;
  limbs: THREE.Mesh[];
  materials: THREE.MeshStandardMaterial[];
  baseColors: number[];
  dispose: () => void;
}

export function buildCreatureRig(species: CreatureSpecies): CreatureRig {
  const root = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.MeshStandardMaterial[] = [];
  const baseColors: number[] = [];
  const limbs: THREE.Mesh[] = [];

  const makeMat = (
    color: number,
    roughness: number,
    metalness = 0.05,
    emissive = 0,
    emissiveIntensity = 0
  ) => {
    const m = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
      emissive,
      emissiveIntensity,
    });
    mats.push(m);
    baseColors.push(color);
    return m;
  };

  const makeBox = (
    w: number,
    h: number,
    d: number,
    mat: THREE.MeshStandardMaterial,
    offsetY = 0
  ) => {
    const geo = new THREE.BoxGeometry(w, h, d);
    if (offsetY !== 0) geo.translate(0, offsetY, 0);
    geos.push(geo);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  let body: THREE.Object3D = root;
  let head: THREE.Object3D = root;

  if (species === 'sheep') {
    const wool = makeMat(0xf1f5f9, 0.95, 0);
    const skin = makeMat(0x334155, 0.55, 0.1);
    const horn = makeMat(0xd97706, 0.35, 0.35);

    const torso = makeBox(0.68, 0.56, 0.92, wool);
    torso.position.set(0, 0.68, 0);
    root.add(torso);
    body = torso;

    const hd = new THREE.Group();
    hd.position.set(0, 0.86, -0.52);
    const skull = makeBox(0.38, 0.36, 0.4, skin);
    const snout = makeBox(0.28, 0.22, 0.16, skin);
    snout.position.set(0, -0.06, -0.22);
    const hornL = makeBox(0.1, 0.16, 0.18, horn);
    hornL.position.set(-0.22, 0.14, 0.02);
    const hornR = makeBox(0.1, 0.16, 0.18, horn);
    hornR.position.set(0.22, 0.14, 0.02);
    hd.add(skull, snout, hornL, hornR);
    root.add(hd);
    head = hd;

    for (const [lx, lz] of [[-0.22, -0.32], [0.22, -0.32], [-0.22, 0.32], [0.22, 0.32]]) {
      const leg = makeBox(0.16, 0.44, 0.16, skin, -0.22);
      leg.position.set(lx, 0.44, lz);
      root.add(leg);
      limbs.push(leg);
    }
  } else if (species === 'fox') {
    const fur = makeMat(0xea580c, 0.88, 0.02);
    const white = makeMat(0xf8fafc, 0.9, 0);
    const dark = makeMat(0x1e293b, 0.45, 0.15);

    const torso = makeBox(0.42, 0.36, 0.78, fur);
    torso.position.set(0, 0.48, 0);
    root.add(torso);
    body = torso;

    const chest = makeBox(0.36, 0.28, 0.2, white);
    chest.position.set(0, 0.44, -0.34);
    root.add(chest);

    const tail = makeBox(0.22, 0.22, 0.48, fur);
    tail.position.set(0, 0.54, 0.56);
    tail.rotation.x = 0.25;
    const tip = makeBox(0.18, 0.18, 0.16, white);
    tip.position.set(0, 0, 0.26);
    tail.add(tip);
    root.add(tail);

    const hd = new THREE.Group();
    hd.position.set(0, 0.66, -0.44);
    const skull = makeBox(0.34, 0.3, 0.34, fur);
    const snout = makeBox(0.18, 0.14, 0.2, white);
    snout.position.set(0, -0.06, -0.22);
    const earL = makeBox(0.1, 0.16, 0.08, dark);
    earL.position.set(-0.12, 0.2, 0.04);
    const earR = makeBox(0.1, 0.16, 0.08, dark);
    earR.position.set(0.12, 0.2, 0.04);
    hd.add(skull, snout, earL, earR);
    root.add(hd);
    head = hd;

    for (const [lx, lz] of [[-0.14, -0.26], [0.14, -0.26], [-0.14, 0.26], [0.14, 0.26]]) {
      const leg = makeBox(0.12, 0.34, 0.12, dark, -0.17);
      leg.position.set(lx, 0.34, lz);
      root.add(leg);
      limbs.push(leg);
    }
  } else if (species === 'stag') {
    const coat = makeMat(0x0f766e, 0.82, 0.08);
    const glow = makeMat(0x67e8f9, 0.18, 0.4, 0x06b6d4, 0.85);
    const hoof = makeMat(0x1e293b, 0.35, 0.45);

    const torso = makeBox(0.56, 0.52, 1.05, coat);
    torso.position.set(0, 0.9, 0);
    root.add(torso);
    body = torso;

    const neck = makeBox(0.26, 0.45, 0.26, coat);
    neck.position.set(0, 1.24, -0.42);
    neck.rotation.x = 0.25;
    root.add(neck);

    const hd = new THREE.Group();
    hd.position.set(0, 1.48, -0.56);
    const skull = makeBox(0.32, 0.3, 0.44, coat);
    const antL = makeBox(0.08, 0.44, 0.24, glow);
    antL.position.set(-0.2, 0.32, 0.05);
    antL.rotation.z = 0.28;
    const antR = makeBox(0.08, 0.44, 0.24, glow);
    antR.position.set(0.2, 0.32, 0.05);
    antR.rotation.z = -0.28;
    hd.add(skull, antL, antR);
    root.add(hd);
    head = hd;

    for (const [lx, lz] of [[-0.18, -0.38], [0.18, -0.38], [-0.18, 0.38], [0.18, 0.38]]) {
      const leg = makeBox(0.14, 0.68, 0.14, hoof, -0.34);
      leg.position.set(lx, 0.68, lz);
      root.add(leg);
      limbs.push(leg);
    }
  } else if (species === 'stalker') {
    const bodyMat = makeMat(0x1e293b, 0.9, 0.05);
    const skinMat = makeMat(0x3f6212, 0.82, 0.05);
    const eyeMat = makeMat(0xf43f5e, 0.15, 0.2, 0xef4444, 1.2);

    const torso = makeBox(0.52, 0.68, 0.28, bodyMat);
    torso.position.set(0, 1.04, 0);
    root.add(torso);
    body = torso;

    const hd = new THREE.Group();
    hd.position.set(0, 1.6, 0);
    const skull = makeBox(0.42, 0.42, 0.42, skinMat);
    const eyeL = makeBox(0.1, 0.07, 0.04, eyeMat);
    eyeL.position.set(-0.1, 0.04, -0.21);
    const eyeR = makeBox(0.1, 0.07, 0.04, eyeMat);
    eyeR.position.set(0.1, 0.04, -0.21);
    hd.add(skull, eyeL, eyeR);
    root.add(hd);
    head = hd;

    const legL = makeBox(0.2, 0.7, 0.2, bodyMat, -0.35);
    legL.position.set(-0.14, 0.7, 0);
    const legR = makeBox(0.2, 0.7, 0.2, bodyMat, -0.35);
    legR.position.set(0.14, 0.7, 0);
    const armL = makeBox(0.18, 0.6, 0.18, skinMat, -0.26);
    armL.position.set(-0.36, 1.32, 0);
    armL.rotation.x = 1.25;
    const armR = makeBox(0.18, 0.6, 0.18, skinMat, -0.26);
    armR.position.set(0.36, 1.32, 0);
    armR.rotation.x = 1.25;
    root.add(legL, legR, armL, armR);
    limbs.push(legL, legR);
  } else if (species === 'skeleton') {
    const bone = makeMat(0xe2e8f0, 0.65, 0.08);
    const armor = makeMat(0x312e81, 0.42, 0.45);
    const eyeMat = makeMat(0xfacc15, 0.15, 0.2, 0xfacc15, 1.1);

    const torso = makeBox(0.42, 0.66, 0.22, bone);
    torso.position.set(0, 1.03, 0);
    const pauldrons = makeBox(0.62, 0.18, 0.3, armor);
    pauldrons.position.set(0, 1.28, 0);
    root.add(torso, pauldrons);
    body = torso;

    const hd = new THREE.Group();
    hd.position.set(0, 1.58, 0);
    const skull = makeBox(0.38, 0.38, 0.38, bone);
    const helm = makeBox(0.42, 0.16, 0.42, armor);
    helm.position.set(0, 0.15, 0);
    const eyeL = makeBox(0.08, 0.06, 0.04, eyeMat);
    eyeL.position.set(-0.09, 0.02, -0.19);
    const eyeR = makeBox(0.08, 0.06, 0.04, eyeMat);
    eyeR.position.set(0.09, 0.02, -0.19);
    hd.add(skull, helm, eyeL, eyeR);
    root.add(hd);
    head = hd;

    const legL = makeBox(0.14, 0.7, 0.14, bone, -0.35);
    legL.position.set(-0.13, 0.7, 0);
    const legR = makeBox(0.14, 0.7, 0.14, bone, -0.35);
    legR.position.set(0.13, 0.7, 0);
    const armL = makeBox(0.12, 0.56, 0.12, bone, -0.24);
    armL.position.set(-0.34, 1.28, 0);
    const armR = makeBox(0.12, 0.56, 0.12, bone, -0.24);
    armR.position.set(0.34, 1.28, 0);
    armR.rotation.x = 1.1;
    const bow = makeBox(0.08, 0.64, 0.14, armor);
    bow.position.set(0, -0.5, -0.12);
    armR.add(bow);
    root.add(legL, legR, armL, armR);
    limbs.push(legL, legR, armL, armR);
  } else if (species === 'creeper') {
    const green = makeMat(0x16a34a, 0.85, 0.08);
    const core = makeMat(0xc084fc, 0.15, 0.35, 0xa855f7, 1.15);
    const mouthMat = makeMat(0x0f172a, 0.45, 0.3);

    const torso = makeBox(0.46, 0.84, 0.36, green);
    torso.position.set(0, 0.78, 0);
    root.add(torso);
    body = torso;

    const hd = new THREE.Group();
    hd.position.set(0, 1.38, 0);
    const skull = makeBox(0.44, 0.44, 0.44, green);
    const eyeL = makeBox(0.1, 0.1, 0.04, core);
    eyeL.position.set(-0.1, 0.05, -0.22);
    const eyeR = makeBox(0.1, 0.1, 0.04, core);
    eyeR.position.set(0.1, 0.05, -0.22);
    const mouth = makeBox(0.18, 0.14, 0.04, mouthMat);
    mouth.position.set(0, -0.1, -0.22);
    hd.add(skull, eyeL, eyeR, mouth);
    root.add(hd);
    head = hd;

    for (const [lx, lz] of [[-0.16, -0.2], [0.16, -0.2], [-0.16, 0.2], [0.16, 0.2]]) {
      const leg = makeBox(0.18, 0.38, 0.18, green, -0.19);
      leg.position.set(lx, 0.38, lz);
      root.add(leg);
      limbs.push(leg);
    }
  } else if (species === 'blaze_imp') {
    const soot = makeMat(0x271212, 0.85, 0.15);
    const flame = makeMat(0xf97316, 0.18, 0.2, 0xea580c, 1.15);
    const glow = makeMat(0xfef08a, 0.1, 0.1, 0xfacc15, 1.5);

    const torso = makeBox(0.32, 0.56, 0.32, flame);
    torso.position.set(0, 0.88, 0);
    root.add(torso);
    body = torso;

    const hd = new THREE.Group();
    hd.position.set(0, 1.4, 0);
    const skull = makeBox(0.4, 0.4, 0.4, soot);
    const crest = makeBox(0.24, 0.18, 0.24, flame);
    crest.position.set(0, 0.26, 0);
    const eyeL = makeBox(0.1, 0.08, 0.05, glow);
    eyeL.position.set(-0.09, 0.04, -0.2);
    const eyeR = makeBox(0.1, 0.08, 0.05, glow);
    eyeR.position.set(0.09, 0.04, -0.2);
    hd.add(skull, crest, eyeL, eyeR);
    root.add(hd);
    head = hd;

    for (const [rx, rz] of [[-0.36, -0.24], [0.36, -0.24], [-0.36, 0.24], [0.36, 0.24]]) {
      const rod = makeBox(0.12, 0.58, 0.12, flame, -0.22);
      rod.position.set(rx, 1.05, rz);
      root.add(rod);
      limbs.push(rod);
    }
  } else if (species === 'magma_golem') {
    const obsidian = makeMat(0x1e1b4b, 0.85, 0.22);
    const magma = makeMat(0xf97316, 0.2, 0.15, 0xef4444, 1.25);
    const hot = makeMat(0xfde047, 0.1, 0.15, 0xfacc15, 1.5);

    const torso = makeBox(0.84, 0.86, 0.48, obsidian);
    torso.position.set(0, 1.22, 0);
    const core = makeBox(0.42, 0.4, 0.52, magma);
    core.position.set(0, 1.28, 0);
    const shoulders = makeBox(1.06, 0.24, 0.54, magma);
    shoulders.position.set(0, 1.56, 0);
    root.add(torso, core, shoulders);
    body = torso;

    const hd = new THREE.Group();
    hd.position.set(0, 1.88, -0.05);
    const skull = makeBox(0.46, 0.44, 0.46, obsidian);
    const hornL = makeBox(0.12, 0.24, 0.12, magma);
    hornL.position.set(-0.22, 0.24, 0);
    const hornR = makeBox(0.12, 0.24, 0.12, magma);
    hornR.position.set(0.22, 0.24, 0);
    const eyeL = makeBox(0.1, 0.08, 0.05, hot);
    eyeL.position.set(-0.1, 0.04, -0.23);
    const eyeR = makeBox(0.1, 0.08, 0.05, hot);
    eyeR.position.set(0.1, 0.04, -0.23);
    hd.add(skull, hornL, hornR, eyeL, eyeR);
    root.add(hd);
    head = hd;

    const legL = makeBox(0.28, 0.8, 0.28, obsidian, -0.4);
    legL.position.set(-0.24, 0.8, 0);
    const legR = makeBox(0.28, 0.8, 0.28, obsidian, -0.4);
    legR.position.set(0.24, 0.8, 0);
    const armL = makeBox(0.26, 0.86, 0.26, obsidian, -0.38);
    armL.position.set(-0.62, 1.52, 0);
    const fistL = makeBox(0.3, 0.28, 0.3, magma);
    fistL.position.set(0, -0.76, 0);
    armL.add(fistL);
    const armR = makeBox(0.26, 0.86, 0.26, obsidian, -0.38);
    armR.position.set(0.62, 1.52, 0);
    const fistR = makeBox(0.3, 0.28, 0.3, magma);
    fistR.position.set(0, -0.76, 0);
    armR.add(fistR);
    root.add(legL, legR, armL, armR);
    limbs.push(legL, legR, armL, armR);
  } else if (species === 'ignis_lord') {
    const scaleRoot = new THREE.Group();
    scaleRoot.scale.setScalar(1.36);
    root.add(scaleRoot);

    const armor = makeMat(0x181316, 0.45, 0.55);
    const magma = makeMat(0xf97316, 0.16, 0.35, 0xea580c, 1.25);
    const gold = makeMat(0xfbbf24, 0.2, 0.85, 0xd97706, 0.35);
    const glow = makeMat(0xfef08a, 0.1, 0.2, 0xfacc15, 1.65);

    const legL = makeBox(0.38, 1.12, 0.38, armor, -0.56);
    legL.position.set(-0.28, 1.12, 0);
    const legR = makeBox(0.38, 1.12, 0.38, armor, -0.56);
    legR.position.set(0.28, 1.12, 0);
    const torso = makeBox(1.06, 1.14, 0.6, armor);
    torso.position.set(0, 1.7, 0);
    const chestCore = makeBox(0.68, 0.64, 0.64, magma);
    chestCore.position.set(0, 1.76, 0);
    const belt = makeBox(1.1, 0.18, 0.66, gold);
    belt.position.set(0, 1.22, 0);
    scaleRoot.add(torso, chestCore, belt);
    body = torso;

    const pL = makeBox(0.46, 0.36, 0.52, magma);
    pL.position.set(-0.74, 2.22, 0);
    const pR = makeBox(0.46, 0.36, 0.52, magma);
    pR.position.set(0.74, 2.22, 0);
    scaleRoot.add(pL, pR);

    const hd = new THREE.Group();
    hd.position.set(0, 2.62, 0);
    const skull = makeBox(0.56, 0.56, 0.56, armor);
    const hornL = makeBox(0.14, 0.42, 0.14, magma);
    hornL.position.set(-0.28, 0.34, 0);
    hornL.rotation.z = 0.28;
    const hornR = makeBox(0.14, 0.42, 0.14, magma);
    hornR.position.set(0.28, 0.34, 0);
    hornR.rotation.z = -0.28;
    const crown = makeBox(0.62, 0.16, 0.62, gold);
    crown.position.set(0, 0.26, 0);
    const eyeL = makeBox(0.12, 0.08, 0.06, glow);
    eyeL.position.set(-0.14, 0.04, -0.29);
    const eyeR = makeBox(0.12, 0.08, 0.06, glow);
    eyeR.position.set(0.14, 0.04, -0.29);
    hd.add(skull, hornL, hornR, crown, eyeL, eyeR);
    scaleRoot.add(hd);
    head = hd;

    const armL = makeBox(0.32, 0.94, 0.32, armor, -0.44);
    armL.position.set(-0.74, 2.12, 0);
    const armR = makeBox(0.32, 0.94, 0.32, armor, -0.44);
    armR.position.set(0.74, 2.12, 0);
    const hilt = makeBox(0.14, 0.38, 0.14, gold);
    hilt.position.set(0, -0.82, -0.24);
    hilt.rotation.x = 1.25;
    const blade = makeBox(0.18, 1.68, 0.1, magma);
    blade.position.set(0, 1.05, 0);
    hilt.add(blade);
    armR.add(hilt);

    scaleRoot.add(legL, legR, armL, armR);
    limbs.push(legL, legR, armL, armR);
  } else if (species === 'sky_griffin') {
    const feather = makeMat(0xf8fafc, 0.85, 0.05);
    const gold = makeMat(0xfbbf24, 0.25, 0.72);
    const eyeMat = makeMat(0x38bdf8, 0.15, 0.2, 0x0ea5e9, 1);

    const torso = makeBox(0.58, 0.48, 0.95, feather);
    torso.position.set(0, 0.74, 0);
    root.add(torso);
    body = torso;

    const wingL = makeBox(0.56, 0.12, 0.62, gold);
    wingL.position.set(-0.48, 0.92, 0.04);
    wingL.rotation.z = 0.22;
    const wingR = makeBox(0.56, 0.12, 0.62, gold);
    wingR.position.set(0.48, 0.92, 0.04);
    wingR.rotation.z = -0.22;
    root.add(wingL, wingR);

    const hd = new THREE.Group();
    hd.position.set(0, 1.12, -0.48);
    const skull = makeBox(0.36, 0.34, 0.38, feather);
    const beak = makeBox(0.16, 0.14, 0.22, gold);
    beak.position.set(0, -0.04, -0.26);
    const crest = makeBox(0.14, 0.18, 0.24, gold);
    crest.position.set(0, 0.22, 0.06);
    const eyeL = makeBox(0.06, 0.06, 0.04, eyeMat);
    eyeL.position.set(-0.12, 0.04, -0.19);
    const eyeR = makeBox(0.06, 0.06, 0.04, eyeMat);
    eyeR.position.set(0.12, 0.04, -0.19);
    hd.add(skull, beak, crest, eyeL, eyeR);
    root.add(hd);
    head = hd;

    for (const [lx, lz] of [[-0.2, -0.32], [0.2, -0.32], [-0.2, 0.32], [0.2, 0.32]]) {
      const leg = makeBox(0.14, 0.5, 0.14, gold, -0.25);
      leg.position.set(lx, 0.5, lz);
      root.add(leg);
      limbs.push(leg);
    }
  } else if (species === 'storm_wisp') {
    const cloud = makeMat(0xe2e8f0, 0.32, 0.25);
    const storm = makeMat(0x38bdf8, 0.15, 0.35, 0x06b6d4, 1.2);
    const gold = makeMat(0xfbbf24, 0.2, 0.8);

    const torso = makeBox(0.42, 0.62, 0.42, storm);
    torso.position.set(0, 0.95, 0);
    root.add(torso);
    body = torso;

    const hd = new THREE.Group();
    hd.position.set(0, 1.5, 0);
    const skull = makeBox(0.42, 0.42, 0.42, cloud);
    const halo = makeBox(0.54, 0.1, 0.54, gold);
    halo.position.set(0, 0.28, 0);
    const visor = makeBox(0.32, 0.1, 0.05, storm);
    visor.position.set(0, 0.02, -0.21);
    hd.add(skull, halo, visor);
    root.add(hd);
    head = hd;

    for (const [rx, rz] of [[-0.4, -0.2], [0.4, -0.2], [-0.4, 0.2], [0.4, 0.2]]) {
      const rod = makeBox(0.12, 0.54, 0.12, cloud, -0.2);
      rod.position.set(rx, 1.1, rz);
      root.add(rod);
      limbs.push(rod);
    }
  } else if (species === 'sky_warden') {
    const scaleRoot = new THREE.Group();
    scaleRoot.scale.setScalar(1.36);
    root.add(scaleRoot);

    const marble = makeMat(0xf8fafc, 0.28, 0.22);
    const gold = makeMat(0xfbbf24, 0.18, 0.88, 0xd97706, 0.25);
    const glow = makeMat(0x22d3ee, 0.14, 0.45, 0x06b6d4, 1.25);
    const helmDark = makeMat(0x334155, 0.45, 0.4);

    const legL = makeBox(0.36, 1.15, 0.36, marble, -0.575);
    legL.position.set(-0.28, 1.15, 0);
    const legR = makeBox(0.36, 1.15, 0.36, marble, -0.575);
    legR.position.set(0.28, 1.15, 0);
    const torso = makeBox(1.04, 1.15, 0.6, marble);
    torso.position.set(0, 1.72, 0);
    const core = makeBox(0.62, 0.56, 0.64, glow);
    core.position.set(0, 1.82, 0);
    const belt = makeBox(1.1, 0.18, 0.66, gold);
    belt.position.set(0, 1.24, 0);
    const wingL = makeBox(1.15, 0.85, 0.14, glow);
    wingL.position.set(-0.92, 2.15, 0.34);
    wingL.rotation.z = 0.25;
    wingL.rotation.y = 0.2;
    const wingR = makeBox(1.15, 0.85, 0.14, glow);
    wingR.position.set(0.92, 2.15, 0.34);
    wingR.rotation.z = -0.25;
    wingR.rotation.y = -0.2;
    scaleRoot.add(torso, core, belt, wingL, wingR);
    body = torso;

    const pL = makeBox(0.46, 0.34, 0.52, gold);
    pL.position.set(-0.74, 2.24, 0);
    const pR = makeBox(0.46, 0.34, 0.52, gold);
    pR.position.set(0.74, 2.24, 0);
    scaleRoot.add(pL, pR);

    const hd = new THREE.Group();
    hd.position.set(0, 2.66, 0);
    const skull = makeBox(0.56, 0.58, 0.56, helmDark);
    const crown = makeBox(0.66, 0.2, 0.66, gold);
    crown.position.set(0, 0.32, 0);
    const visor = makeBox(0.42, 0.12, 0.08, glow);
    visor.position.set(0, 0.04, -0.29);
    hd.add(skull, crown, visor);
    scaleRoot.add(hd);
    head = hd;

    const armL = makeBox(0.32, 0.96, 0.32, marble, -0.44);
    armL.position.set(-0.74, 2.15, 0);
    const armR = makeBox(0.32, 0.96, 0.32, marble, -0.44);
    armR.position.set(0.74, 2.15, 0);
    const staff = makeBox(0.14, 1.85, 0.14, gold);
    staff.position.set(0, -0.65, -0.26);
    staff.rotation.x = 1.2;
    const orb = makeBox(0.28, 0.42, 0.28, glow);
    orb.position.set(0, 1.02, 0);
    staff.add(orb);
    armR.add(staff);

    scaleRoot.add(legL, legR, armL, armR);
    limbs.push(legL, legR, armL, armR);
  } else if (species === 'villager') {
    const tunic = makeMat(0x92400e, 0.88, 0.02);
    const apron = makeMat(0xf1f5f9, 0.86, 0);
    const skin = makeMat(0xe5b889, 0.78, 0.02);
    const eyeMat = makeMat(0x10b981, 0.25, 0.1, 0x059669, 0.35);
    const hatMat = makeMat(0xd97706, 0.82, 0.05);

    const torso = makeBox(0.54, 0.76, 0.34, tunic);
    torso.position.set(0, 1.04, 0);
    const ap = makeBox(0.46, 0.56, 0.06, apron);
    ap.position.set(0, 0.96, -0.18);
    root.add(torso, ap);
    body = torso;

    const hd = new THREE.Group();
    hd.position.set(0, 1.66, 0);
    const skull = makeBox(0.42, 0.48, 0.42, skin);
    const brow = makeBox(0.44, 0.07, 0.06, hatMat);
    brow.position.set(0, 0.12, -0.21);
    const nose = makeBox(0.12, 0.18, 0.14, skin);
    nose.position.set(0, -0.08, -0.25);
    const eyeL = makeBox(0.08, 0.07, 0.04, eyeMat);
    eyeL.position.set(-0.11, 0.03, -0.21);
    const eyeR = makeBox(0.08, 0.07, 0.04, eyeMat);
    eyeR.position.set(0.11, 0.03, -0.21);
    const brim = makeBox(0.62, 0.07, 0.62, hatMat);
    brim.position.set(0, 0.24, 0);
    const crown = makeBox(0.44, 0.16, 0.44, hatMat);
    crown.position.set(0, 0.34, 0);
    hd.add(skull, brow, nose, eyeL, eyeR, brim, crown);
    root.add(hd);
    head = hd;

    const legL = makeBox(0.22, 0.66, 0.24, tunic, -0.33);
    legL.position.set(-0.14, 0.66, 0);
    const legR = makeBox(0.22, 0.66, 0.24, tunic, -0.33);
    legR.position.set(0.14, 0.66, 0);
    const armL = makeBox(0.18, 0.56, 0.2, tunic, -0.24);
    armL.position.set(-0.36, 1.32, 0);
    const armR = makeBox(0.18, 0.56, 0.2, tunic, -0.24);
    armR.position.set(0.36, 1.32, 0);
    root.add(legL, legR, armL, armR);
    limbs.push(legL, legR, armL, armR);
  } else if (species === 'scout_bot') {
    const steel = makeMat(0xcbd5e1, 0.26, 0.78);
    const dark = makeMat(0x1e293b, 0.42, 0.55);
    const cyan = makeMat(0x22d3ee, 0.14, 0.3, 0x06b6d4, 1.3);

    const torso = makeBox(0.56, 0.56, 0.44, steel);
    torso.position.set(0, 0.68, 0);
    const core = makeBox(0.32, 0.28, 0.48, cyan);
    core.position.set(0, 0.68, 0);
    const pack = makeBox(0.4, 0.42, 0.18, dark);
    pack.position.set(0, 0.7, 0.28);
    root.add(torso, core, pack);
    body = torso;

    const hd = new THREE.Group();
    hd.position.set(0, 1.15, 0);
    const skull = makeBox(0.44, 0.34, 0.4, steel);
    const visor = makeBox(0.34, 0.12, 0.05, cyan);
    visor.position.set(0, 0.02, -0.2);
    const ant = makeBox(0.06, 0.24, 0.06, dark);
    ant.position.set(0.14, 0.28, 0);
    const bulb = makeBox(0.11, 0.11, 0.11, cyan);
    bulb.position.set(0.14, 0.42, 0);
    hd.add(skull, visor, ant, bulb);
    root.add(hd);
    head = hd;

    const legL = makeBox(0.18, 0.42, 0.26, dark, -0.21);
    legL.position.set(-0.18, 0.42, 0);
    const legR = makeBox(0.18, 0.42, 0.26, dark, -0.21);
    legR.position.set(0.18, 0.42, 0);
    const armL = makeBox(0.14, 0.42, 0.14, steel, -0.18);
    armL.position.set(-0.36, 0.86, 0);
    const armR = makeBox(0.14, 0.42, 0.14, steel, -0.18);
    armR.position.set(0.36, 0.86, 0);
    root.add(legL, legR, armL, armR);
    limbs.push(legL, legR, armL, armR);
  } else if (species === 'big_scout_droid') {
    const scaleRoot = new THREE.Group();
    scaleRoot.scale.setScalar(2.15);
    root.add(scaleRoot);

    const chassis = makeMat(0xe2e8f0, 0.24, 0.82);
    const dark = makeMat(0x1e293b, 0.42, 0.58);
    const amber = makeMat(0xfacc15, 0.35, 0.45);
    const cyan = makeMat(0x22d3ee, 0.12, 0.32, 0x06b6d4, 1.4);

    const torso = makeBox(0.6, 0.58, 0.46, chassis);
    torso.position.set(0, 0.69, 0);
    const core = makeBox(0.36, 0.3, 0.5, cyan);
    core.position.set(0, 0.7, 0);
    const belt = makeBox(0.62, 0.12, 0.48, amber);
    belt.position.set(0, 0.45, 0);
    const pack = makeBox(0.46, 0.46, 0.22, dark);
    pack.position.set(0, 0.71, 0.3);
    scaleRoot.add(torso, core, belt, pack);
    body = torso;

    const hd = new THREE.Group();
    hd.position.set(0, 1.16, 0);
    const skull = makeBox(0.46, 0.36, 0.42, chassis);
    const visor = makeBox(0.38, 0.13, 0.06, cyan);
    visor.position.set(0, 0.02, -0.21);
    const antL = makeBox(0.06, 0.28, 0.06, dark);
    antL.position.set(-0.15, 0.3, 0);
    const bulbL = makeBox(0.11, 0.11, 0.11, cyan);
    bulbL.position.set(-0.15, 0.46, 0);
    const antR = makeBox(0.06, 0.28, 0.06, dark);
    antR.position.set(0.15, 0.3, 0);
    const bulbR = makeBox(0.11, 0.11, 0.11, cyan);
    bulbR.position.set(0.15, 0.46, 0);
    hd.add(skull, visor, antL, bulbL, antR, bulbR);
    scaleRoot.add(hd);
    head = hd;

    const legL = makeBox(0.2, 0.44, 0.28, dark, -0.22);
    legL.position.set(-0.19, 0.44, 0);
    const legR = makeBox(0.2, 0.44, 0.28, dark, -0.22);
    legR.position.set(0.19, 0.44, 0);
    const armL = makeBox(0.16, 0.44, 0.16, chassis, -0.18);
    armL.position.set(-0.39, 0.88, 0);
    const clawL = makeBox(0.18, 0.12, 0.18, amber);
    clawL.position.set(0, -0.34, 0);
    armL.add(clawL);
    const armR = makeBox(0.16, 0.44, 0.16, chassis, -0.18);
    armR.position.set(0.39, 0.88, 0);
    const clawR = makeBox(0.18, 0.12, 0.18, amber);
    clawR.position.set(0, -0.34, 0);
    armR.add(clawR);
    scaleRoot.add(legL, legR, armL, armR);
    limbs.push(legL, legR, armL, armR);
  } else if (species === 'android') {
    const shell = makeMat(0x84cc16, 0.32, 0.35);
    const steel = makeMat(0xcbd5e1, 0.22, 0.8);
    const dark = makeMat(0x1e293b, 0.45, 0.55);
    const cyan = makeMat(0x22d3ee, 0.12, 0.3, 0x06b6d4, 1.35);

    const torso = makeBox(0.54, 0.72, 0.32, shell);
    torso.position.set(0, 1.06, 0);
    const core = makeBox(0.28, 0.28, 0.36, cyan);
    core.position.set(0, 1.12, 0);
    const belt = makeBox(0.56, 0.12, 0.34, steel);
    belt.position.set(0, 0.74, 0);
    const pack = makeBox(0.36, 0.42, 0.14, dark);
    pack.position.set(0, 1.1, 0.21);
    root.add(torso, core, belt, pack);
    body = torso;

    const hd = new THREE.Group();
    hd.position.set(0, 1.64, 0);
    const skull = makeBox(0.44, 0.4, 0.42, shell);
    const visor = makeBox(0.34, 0.11, 0.05, cyan);
    visor.position.set(0, 0.03, -0.21);
    const earL = makeBox(0.08, 0.2, 0.16, steel);
    earL.position.set(-0.24, 0, 0);
    const earR = makeBox(0.08, 0.2, 0.16, steel);
    earR.position.set(0.24, 0, 0);
    const antL = makeBox(0.05, 0.2, 0.05, shell);
    antL.position.set(-0.14, 0.28, 0);
    antL.rotation.z = 0.28;
    const antR = makeBox(0.05, 0.2, 0.05, shell);
    antR.position.set(0.14, 0.28, 0);
    antR.rotation.z = -0.28;
    hd.add(skull, visor, earL, earR, antL, antR);
    root.add(hd);
    head = hd;

    const legL = makeBox(0.2, 0.68, 0.22, dark, -0.34);
    legL.position.set(-0.14, 0.68, 0);
    const legR = makeBox(0.2, 0.68, 0.22, dark, -0.34);
    legR.position.set(0.14, 0.68, 0);
    const armL = makeBox(0.16, 0.6, 0.16, steel, -0.26);
    armL.position.set(-0.36, 1.34, 0);
    const armR = makeBox(0.16, 0.6, 0.16, steel, -0.26);
    armR.position.set(0.36, 1.34, 0);
    root.add(legL, legR, armL, armR);
    limbs.push(legL, legR, armL, armR);
  } else if (species === 'laser_drone') {
    const hull = makeMat(0x334155, 0.32, 0.72);
    const laser = makeMat(0xf43f5e, 0.12, 0.3, 0xe11d48, 1.4);
    const ringMat = makeMat(0x94a3b8, 0.22, 0.82);

    const torso = makeBox(0.56, 0.46, 0.56, hull);
    torso.position.set(0, 1.15, 0);
    const ring = makeBox(0.72, 0.14, 0.72, ringMat);
    ring.position.set(0, 1.15, 0);
    root.add(torso, ring);
    body = torso;

    const hd = new THREE.Group();
    hd.position.set(0, 1.48, 0);
    const skull = makeBox(0.4, 0.32, 0.42, hull);
    const eye = makeBox(0.24, 0.14, 0.06, laser);
    eye.position.set(0, 0, -0.21);
    hd.add(skull, eye);
    root.add(hd);
    head = hd;

    for (const [rx, rz] of [[-0.44, -0.28], [0.44, -0.28], [-0.44, 0.28], [0.44, 0.28]]) {
      const thruster = makeBox(0.16, 0.52, 0.16, laser, -0.2);
      thruster.position.set(rx, 1.15, rz);
      root.add(thruster);
      limbs.push(thruster);
    }
  } else if (species === 'mecha_trooper') {
    const steel = makeMat(0x475569, 0.28, 0.82);
    const trim = makeMat(0xfacc15, 0.38, 0.4);
    const visorMat = makeMat(0xf97316, 0.12, 0.25, 0xea580c, 1.4);
    const dark = makeMat(0x0f172a, 0.45, 0.6);

    const torso = makeBox(0.86, 0.92, 0.52, steel);
    torso.position.set(0, 1.38, 0);
    const chest = makeBox(0.68, 0.44, 0.56, trim);
    chest.position.set(0, 1.46, 0);
    const shoulderBar = makeBox(1.16, 0.22, 0.52, steel);
    shoulderBar.position.set(0, 1.76, 0);
    root.add(torso, chest, shoulderBar);
    body = torso;

    const hd = new THREE.Group();
    hd.position.set(0, 2.08, 0);
    const skull = makeBox(0.48, 0.44, 0.46, steel);
    const visor = makeBox(0.38, 0.12, 0.06, visorMat);
    visor.position.set(0, 0.02, -0.24);
    const crest = makeBox(0.14, 0.2, 0.36, trim);
    crest.position.set(0, 0.28, 0);
    hd.add(skull, visor, crest);
    root.add(hd);
    head = hd;

    const legL = makeBox(0.3, 0.92, 0.34, dark, -0.46);
    legL.position.set(-0.26, 0.92, 0);
    const legR = makeBox(0.3, 0.92, 0.34, dark, -0.46);
    legR.position.set(0.26, 0.92, 0);
    const armL = makeBox(0.26, 0.86, 0.26, steel, -0.38);
    armL.position.set(-0.62, 1.7, 0);
    const gunL = makeBox(0.2, 0.24, 0.54, dark);
    gunL.position.set(0, -0.74, -0.18);
    armL.add(gunL);
    const armR = makeBox(0.26, 0.86, 0.26, steel, -0.38);
    armR.position.set(0.62, 1.7, 0);
    const gunR = makeBox(0.2, 0.24, 0.54, dark);
    gunR.position.set(0, -0.74, -0.18);
    armR.add(gunR);
    root.add(legL, legR, armL, armR);
    limbs.push(legL, legR, armL, armR);
  } else if (species === 'mega_titan') {
    const scaleRoot = new THREE.Group();
    scaleRoot.scale.setScalar(1.92);
    root.add(scaleRoot);

    const chassis = makeMat(0x1e293b, 0.35, 0.78);
    const armor = makeMat(0x94a3b8, 0.2, 0.88);
    const gold = makeMat(0xfacc15, 0.35, 0.45);
    const laser = makeMat(0xf43f5e, 0.12, 0.35, 0xe11d48, 1.5);
    const cyan = makeMat(0x22d3ee, 0.12, 0.35, 0x06b6d4, 1.35);

    const legL = makeBox(0.42, 1.15, 0.48, chassis, -0.575);
    legL.position.set(-0.32, 1.15, 0);
    const bootL = makeBox(0.46, 0.26, 0.52, gold);
    bootL.position.set(0, -0.45, -0.02);
    legL.add(bootL);
    const legR = makeBox(0.42, 1.15, 0.48, chassis, -0.575);
    legR.position.set(0.32, 1.15, 0);
    const bootR = makeBox(0.46, 0.26, 0.52, gold);
    bootR.position.set(0, -0.45, -0.02);
    legR.add(bootR);

    const torso = makeBox(1.18, 1.18, 0.68, chassis);
    torso.position.set(0, 1.74, 0);
    const chestPlate = makeBox(1.02, 0.66, 0.74, armor);
    chestPlate.position.set(0, 1.88, 0);
    const reactor = makeBox(0.44, 0.44, 0.78, laser);
    reactor.position.set(0, 1.88, 0);
    const belt = makeBox(1.22, 0.2, 0.72, gold);
    belt.position.set(0, 1.24, 0);
    const jetpack = makeBox(0.92, 0.88, 0.3, chassis);
    jetpack.position.set(0, 1.82, 0.44);
    const jetL = makeBox(0.24, 0.32, 0.24, cyan);
    jetL.position.set(-0.28, 1.36, 0.5);
    const jetR = makeBox(0.24, 0.32, 0.24, cyan);
    jetR.position.set(0.28, 1.36, 0.5);
    scaleRoot.add(torso, chestPlate, reactor, belt, jetpack, jetL, jetR);
    body = torso;

    const pL = makeBox(0.56, 0.42, 0.62, gold);
    pL.position.set(-0.84, 2.26, 0);
    const podL = makeBox(0.42, 0.26, 0.46, laser);
    podL.position.set(-0.84, 2.54, 0);
    const pR = makeBox(0.56, 0.42, 0.62, gold);
    pR.position.set(0.84, 2.26, 0);
    const podR = makeBox(0.42, 0.26, 0.46, laser);
    podR.position.set(0.84, 2.54, 0);
    scaleRoot.add(pL, podL, pR, podR);

    const hd = new THREE.Group();
    hd.position.set(0, 2.66, 0);
    const skull = makeBox(0.56, 0.54, 0.56, armor);
    const visor = makeBox(0.46, 0.14, 0.08, laser);
    visor.position.set(0, 0.04, -0.29);
    const earL = makeBox(0.12, 0.38, 0.14, cyan);
    earL.position.set(-0.3, 0.32, 0);
    earL.rotation.z = 0.25;
    const earR = makeBox(0.12, 0.38, 0.14, cyan);
    earR.position.set(0.3, 0.32, 0);
    earR.rotation.z = -0.25;
    hd.add(skull, visor, earL, earR);
    scaleRoot.add(hd);
    head = hd;

    const armL = makeBox(0.36, 0.98, 0.36, chassis, -0.45);
    armL.position.set(-0.84, 2.12, 0);
    const shield = makeBox(0.18, 0.96, 0.72, armor);
    shield.position.set(-0.24, -0.58, -0.16);
    const shieldGlow = makeBox(0.2, 0.54, 0.4, cyan);
    shieldGlow.position.set(-0.25, -0.58, -0.16);
    armL.add(shield, shieldGlow);

    const armR = makeBox(0.36, 0.98, 0.36, chassis, -0.45);
    armR.position.set(0.84, 2.12, 0);
    const cannon = makeBox(0.3, 0.34, 1.15, chassis);
    cannon.position.set(0, -0.78, -0.42);
    const laserBlade = makeBox(0.14, 1.65, 0.16, laser);
    laserBlade.position.set(0, -0.82, -0.78);
    laserBlade.rotation.x = 1.25;
    armR.add(cannon, laserBlade);

    scaleRoot.add(legL, legR, armL, armR);
    limbs.push(legL, legR, armL, armR);
  } else if (species === 'mango_bird') {
    const redCoral = makeMat(0xef4444, 0.78, 0.04);
    const mangoOrange = makeMat(0xf97316, 0.78, 0.04);
    const mangoYellow = makeMat(0xfacc15, 0.8, 0.02);
    const creamBeak = makeMat(0xfef3c7, 0.45, 0.05);
    const greenLeaf = makeMat(0x22c55e, 0.72, 0.04);
    const stemBrown = makeMat(0x78350f, 0.9, 0.02);
    const eyeRing = makeMat(0xf8fafc, 0.5, 0);
    const pupil = makeMat(0x0f172a, 0.2, 0.1);
    const clawGrey = makeMat(0x94a3b8, 0.6, 0.15);

    // Plump mango-shaped gradient body
    const belly = makeBox(0.56, 0.3, 0.54, mangoYellow);
    belly.position.set(0, 0.34, 0);
    const midBody = makeBox(0.6, 0.24, 0.56, mangoOrange);
    midBody.position.set(0, 0.55, -0.02);
    const tail = makeBox(0.24, 0.14, 0.22, mangoYellow);
    tail.position.set(0, 0.26, 0.32);
    tail.rotation.x = -0.35;
    root.add(belly, midBody, tail);
    body = midBody;

    // Head with stem & mango leaf
    const hd = new THREE.Group();
    hd.position.set(0, 0.76, -0.04);
    const skull = makeBox(0.54, 0.3, 0.5, redCoral);
    const crown = makeBox(0.42, 0.1, 0.4, redCoral);
    crown.position.set(0, 0.18, 0);
    const beakTop = makeBox(0.18, 0.14, 0.18, creamBeak);
    beakTop.position.set(0, -0.01, -0.28);
    const beakTip = makeBox(0.11, 0.1, 0.12, creamBeak);
    beakTip.position.set(0, -0.09, -0.32);
    const ringL = makeBox(0.05, 0.1, 0.1, eyeRing);
    ringL.position.set(-0.26, 0.03, -0.14);
    const eyeL = makeBox(0.06, 0.06, 0.06, pupil);
    eyeL.position.set(-0.275, 0.03, -0.14);
    const ringR = makeBox(0.05, 0.1, 0.1, eyeRing);
    ringR.position.set(0.26, 0.03, -0.14);
    const eyeR = makeBox(0.06, 0.06, 0.06, pupil);
    eyeR.position.set(0.275, 0.03, -0.14);

    const stem = makeBox(0.07, 0.1, 0.07, stemBrown);
    stem.position.set(0, 0.25, 0);
    const leafBase = makeBox(0.32, 0.05, 0.22, greenLeaf);
    leafBase.position.set(0.18, 0.23, 0.06);
    leafBase.rotation.set(0.15, -0.25, -0.45);
    const leafTip = makeBox(0.24, 0.04, 0.14, greenLeaf);
    leafTip.position.set(0.36, 0.14, 0.12);
    leafTip.rotation.set(0.2, -0.3, -0.75);
    hd.add(skull, crown, beakTop, beakTip, ringL, eyeL, ringR, eyeR, stem, leafBase, leafTip);
    root.add(hd);
    head = hd;

    const legL = makeBox(0.08, 0.2, 0.14, clawGrey, -0.1);
    legL.position.set(-0.14, 0.2, -0.02);
    const legR = makeBox(0.08, 0.2, 0.14, clawGrey, -0.1);
    legR.position.set(0.14, 0.2, -0.02);
    const wingL = makeBox(0.1, 0.3, 0.34, mangoOrange, -0.1);
    wingL.position.set(-0.33, 0.58, 0.02);
    wingL.rotation.z = 0.16;
    const wingR = makeBox(0.1, 0.3, 0.34, mangoOrange, -0.1);
    wingR.position.set(0.33, 0.58, 0.02);
    wingR.rotation.z = -0.16;
    root.add(legL, legR, wingL, wingR);
    limbs.push(legL, legR, wingL, wingR);
  } else if (species === 'sun_bird') {
    const skyBlue = makeMat(0x0ea5e9, 0.72, 0.06);
    const emerald = makeMat(0x10b981, 0.74, 0.04);
    const gold = makeMat(0xfacc15, 0.65, 0.08);
    const beakMat = makeMat(0xf97316, 0.45, 0.08);
    const dark = makeMat(0x0f172a, 0.3, 0.1);
    const clawMat = makeMat(0x94a3b8, 0.6, 0.12);

    const torso = makeBox(0.46, 0.36, 0.52, skyBlue);
    torso.position.set(0, 0.42, 0);
    const belly = makeBox(0.38, 0.24, 0.36, gold);
    belly.position.set(0, 0.35, -0.1);
    const tail = makeBox(0.2, 0.08, 0.3, emerald);
    tail.position.set(0, 0.32, 0.34);
    tail.rotation.x = 0.25;
    root.add(torso, belly, tail);
    body = torso;

    const hd = new THREE.Group();
    hd.position.set(0, 0.72, -0.16);
    const skull = makeBox(0.36, 0.32, 0.36, skyBlue);
    const crest = makeBox(0.1, 0.16, 0.24, gold);
    crest.position.set(0, 0.2, 0.06);
    crest.rotation.x = -0.35;
    const beak = makeBox(0.12, 0.1, 0.18, beakMat);
    beak.position.set(0, -0.02, -0.24);
    const eyeL = makeBox(0.06, 0.07, 0.05, dark);
    eyeL.position.set(-0.17, 0.03, -0.1);
    const eyeR = makeBox(0.06, 0.07, 0.05, dark);
    eyeR.position.set(0.17, 0.03, -0.1);
    hd.add(skull, crest, beak, eyeL, eyeR);
    root.add(hd);
    head = hd;

    const legL = makeBox(0.07, 0.22, 0.12, clawMat, -0.11);
    legL.position.set(-0.12, 0.22, 0);
    const legR = makeBox(0.07, 0.22, 0.12, clawMat, -0.11);
    legR.position.set(0.12, 0.22, 0);
    const wingL = makeBox(0.08, 0.24, 0.36, emerald, -0.08);
    wingL.position.set(-0.27, 0.48, 0.04);
    const wingR = makeBox(0.08, 0.24, 0.36, emerald, -0.08);
    wingR.position.set(0.27, 0.48, 0.04);
    root.add(legL, legR, wingL, wingR);
    limbs.push(legL, legR, wingL, wingR);
  } else if (species === 'mango_guardian') {
    const scaleRoot = new THREE.Group();
    scaleRoot.scale.setScalar(1.42);
    root.add(scaleRoot);

    const yellowPlume = makeMat(0xfacc15, 0.78, 0.04);
    const orangePlume = makeMat(0xf97316, 0.72, 0.05);
    const redPlume = makeMat(0xdc2626, 0.7, 0.06);
    const leafGreen = makeMat(0x4d7c0f, 0.72, 0.06);
    const steelDark = makeMat(0x334155, 0.3, 0.82);
    const mechaTrim = makeMat(0x64748b, 0.25, 0.88);
    const plasmaGlow = makeMat(0xf97316, 0.12, 0.3, 0xfb923c, 1.45);
    const redCable = makeMat(0x991b1b, 0.5, 0.35);
    const ivoryBeak = makeMat(0xfef3c7, 0.38, 0.12);
    const birdFoot = makeMat(0x78716c, 0.65, 0.2);

    // Feathered lower/left torso + cybernetic right shoulder & carapace
    const belly = makeBox(1.18, 0.92, 1.12, yellowPlume);
    belly.position.set(0, 1.38, 0);
    const breast = makeBox(1.14, 0.56, 1.06, orangePlume);
    breast.position.set(0, 1.92, -0.04);
    const cyberShoulderR = makeBox(0.62, 0.72, 0.96, steelDark);
    cyberShoulderR.position.set(0.36, 2.02, 0.06);
    const cyberVentR = makeBox(0.14, 0.42, 0.26, plasmaGlow);
    cyberVentR.position.set(0.64, 1.92, -0.18);
    const cablePod = makeBox(0.5, 0.52, 0.82, redCable);
    cablePod.position.set(0.28, 1.64, 0.22);
    const tailPlume = makeBox(0.68, 0.28, 0.68, leafGreen);
    tailPlume.position.set(0, 1.04, 0.72);
    tailPlume.rotation.x = -0.35;
    scaleRoot.add(belly, breast, cyberShoulderR, cyberVentR, cablePod, tailPlume);
    body = breast;

    // Asymmetric Half-Feathered / Half-Cyber Head
    const hd = new THREE.Group();
    hd.position.set(0, 2.48, -0.14);
    const headLeftFeather = makeBox(0.46, 0.62, 0.72, redPlume);
    headLeftFeather.position.set(-0.2, 0, 0);
    const headRightCyber = makeBox(0.46, 0.62, 0.74, steelDark);
    headRightCyber.position.set(0.2, 0.02, 0.02);
    const crestSpikes = makeBox(0.44, 0.34, 0.56, yellowPlume);
    crestSpikes.position.set(-0.06, 0.44, 0.08);
    crestSpikes.rotation.x = -0.35;
    const crownPlate = makeBox(0.42, 0.14, 0.52, mechaTrim);
    crownPlate.position.set(0.22, 0.36, 0.06);

    const beakUpper = makeBox(0.28, 0.3, 0.36, ivoryBeak);
    beakUpper.position.set(0, -0.05, -0.46);
    const beakHook = makeBox(0.18, 0.22, 0.22, ivoryBeak);
    beakHook.position.set(0, -0.22, -0.54);

    // Friendly glowing orange left eye + bright cybernetic optical lens on right
    const eyeL = makeBox(0.12, 0.12, 0.08, plasmaGlow);
    eyeL.position.set(-0.22, 0.06, -0.36);
    const cyberSocket = makeBox(0.22, 0.22, 0.12, mechaTrim);
    cyberSocket.position.set(0.24, 0.06, -0.36);
    const eyeR = makeBox(0.14, 0.14, 0.08, plasmaGlow);
    eyeR.position.set(0.24, 0.06, -0.4);
    hd.add(
      headLeftFeather,
      headRightCyber,
      crestSpikes,
      crownPlate,
      beakUpper,
      beakHook,
      eyeL,
      cyberSocket,
      eyeR
    );
    scaleRoot.add(hd);
    head = hd;

    // Left organic bird leg & right cybernetic armored talon leg
    const legL = makeBox(0.22, 0.92, 0.26, birdFoot, -0.46);
    legL.position.set(-0.34, 0.92, 0);
    const footL = makeBox(0.38, 0.12, 0.44, birdFoot);
    footL.position.set(0, -0.86, -0.08);
    legL.add(footL);

    const legR = makeBox(0.28, 0.92, 0.3, steelDark, -0.46);
    legR.position.set(0.36, 0.92, 0);
    const kneeCore = makeBox(0.32, 0.18, 0.18, plasmaGlow);
    kneeCore.position.set(0, -0.32, -0.14);
    const talonR = makeBox(0.44, 0.14, 0.48, mechaTrim);
    talonR.position.set(0, -0.86, -0.1);
    legR.add(kneeCore, talonR);

    // Large feathered left wing & cyber-feathered right wing
    const wingL = makeBox(0.22, 0.88, 0.84, leafGreen, -0.36);
    wingL.position.set(-0.72, 2.02, 0.1);
    wingL.rotation.z = 0.2;
    const wingTipL = makeBox(0.18, 0.45, 0.65, yellowPlume);
    wingTipL.position.set(-0.04, -0.58, 0.1);
    wingL.add(wingTipL);

    const wingR = makeBox(0.24, 0.88, 0.86, steelDark, -0.36);
    wingR.position.set(0.74, 2.02, 0.1);
    wingR.rotation.z = -0.2;
    const wingBladeR = makeBox(0.18, 0.56, 0.72, leafGreen);
    wingBladeR.position.set(0.05, -0.62, 0.12);
    const wingGlowR = makeBox(0.28, 0.34, 0.16, plasmaGlow);
    wingGlowR.position.set(0.05, -0.44, -0.32);
    wingR.add(wingBladeR, wingGlowR);

    scaleRoot.add(legL, legR, wingL, wingR);
    limbs.push(legL, legR, wingL, wingR);
  } else {
    // king_boss
    const scaleRoot = new THREE.Group();
    scaleRoot.scale.setScalar(1.36);
    root.add(scaleRoot);

    const steel = makeMat(0x475569, 0.3, 0.75);
    const gold = makeMat(0xfbbf24, 0.18, 0.9, 0xb45309, 0.18);
    const crimson = makeMat(0xb91c1c, 0.86, 0.05);
    const skin = makeMat(0xe2c0a0, 0.75, 0.02);
    const eyeMat = makeMat(0xfef08a, 0.1, 0.2, 0xfacc15, 1.6);
    const aether = makeMat(0x38bdf8, 0.12, 0.75, 0x06b6d4, 0.85);

    const legL = makeBox(0.38, 1.15, 0.38, steel, -0.575);
    legL.position.set(-0.28, 1.15, 0);
    const legR = makeBox(0.38, 1.15, 0.38, steel, -0.575);
    legR.position.set(0.28, 1.15, 0);

    const torso = makeBox(1.08, 1.15, 0.62, steel);
    torso.position.set(0, 1.72, 0);
    const breast = makeBox(0.92, 0.56, 0.66, gold);
    breast.position.set(0, 1.85, 0);
    const belt = makeBox(1.12, 0.2, 0.68, gold);
    belt.position.set(0, 1.24, 0);
    const cape = makeBox(1.12, 1.55, 0.12, crimson);
    cape.position.set(0, 1.5, 0.36);
    cape.rotation.x = 0.08;
    scaleRoot.add(torso, breast, belt, cape);
    body = torso;

    const pL = makeBox(0.48, 0.34, 0.54, gold);
    pL.position.set(-0.74, 2.24, 0);
    const pR = makeBox(0.48, 0.34, 0.54, gold);
    pR.position.set(0.74, 2.24, 0);
    scaleRoot.add(pL, pR);

    const hd = new THREE.Group();
    hd.position.set(0, 2.66, 0);
    const skull = makeBox(0.58, 0.58, 0.58, skin);
    const helm = makeBox(0.62, 0.22, 0.62, steel);
    helm.position.set(0, 0.14, 0);
    const crown = makeBox(0.66, 0.2, 0.66, gold);
    crown.position.set(0, 0.34, 0);
    const gem = makeBox(0.16, 0.22, 0.12, aether);
    gem.position.set(0, 0.4, -0.32);
    const eyeL = makeBox(0.12, 0.07, 0.06, eyeMat);
    eyeL.position.set(-0.14, 0.03, -0.3);
    const eyeR = makeBox(0.12, 0.07, 0.06, eyeMat);
    eyeR.position.set(0.14, 0.03, -0.3);
    hd.add(skull, helm, crown, gem, eyeL, eyeR);
    scaleRoot.add(hd);
    head = hd;

    const armL = makeBox(0.32, 0.96, 0.32, steel, -0.44);
    armL.position.set(-0.74, 2.15, 0);
    const shield = makeBox(0.14, 0.95, 0.72, gold);
    shield.position.set(-0.22, -0.58, -0.18);
    const crest = makeBox(0.16, 0.65, 0.45, crimson);
    crest.position.set(-0.23, -0.58, -0.18);
    armL.add(shield, crest);

    const armR = makeBox(0.32, 0.96, 0.32, steel, -0.44);
    armR.position.set(0.74, 2.15, 0);
    const hilt = makeBox(0.14, 0.4, 0.14, gold);
    hilt.position.set(0, -0.82, -0.25);
    hilt.rotation.x = 1.25;
    const guard = makeBox(0.46, 0.12, 0.16, gold);
    guard.position.set(0, 0.22, 0);
    const blade = makeBox(0.16, 1.75, 0.08, aether);
    blade.position.set(0, 1.12, 0);
    hilt.add(guard, blade);
    armR.add(hilt);

    scaleRoot.add(legL, legR, armL, armR);
    limbs.push(legL, legR, armL, armR);
  }

  return {
    root,
    body,
    head,
    limbs,
    materials: mats,
    baseColors,
    dispose: () => {
      for (const g of geos) g.dispose();
      for (const m of mats) m.dispose();
    },
  };
}
