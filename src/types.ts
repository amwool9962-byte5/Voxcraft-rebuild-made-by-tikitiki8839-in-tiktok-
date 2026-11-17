export type WorldRules = 'creative' | 'survival' | 'hardcore';

export type BiomeId =
  | 'verdant_basin'
  | 'aether_spires'
  | 'basalt_caldera'
  | 'frostbound_tundra'
  | 'mycelium_abyss';

export interface BiomeConfig {
  id: BiomeId;
  name: string;
  tagline: string;
  mechanicLabel: string;
  accentColor: string;
  skyTop: string;
  skyHorizon: string;
  fogColor: string;
  fogDensity: number;
  gravityScale: number;
  speedScale: number;
  jumpScale: number;
  frictionScale: number;
  ambientTint: string;
}

export type BlockCategory = 'terrain' | 'mineral' | 'flora' | 'tech';

export type AtlasTileName =
  | 'grass_top'
  | 'grass_side'
  | 'dirt'
  | 'stone'
  | 'basalt'
  | 'snow'
  | 'ice'
  | 'sand'
  | 'obsidian'
  | 'magma'
  | 'crystal'
  | 'mycelium'
  | 'spore'
  | 'wood_side'
  | 'wood_top'
  | 'leaves'
  | 'ore'
  | 'water'
  | 'bounce'
  | 'glass'
  | 'portal_frame'
  | 'portal_rift'
  | 'stone_brick'
  | 'gold'
  | 'lantern'
  | 'banner'
  | 'planks'
  | 'cloud'
  | 'sky_marble'
  | 'sky_glass'
  | 'wind_beacon'
  | 'steel_plate'
  | 'circuit'
  | 'hazard'
  | 'cyber_core'
  | 'tnt_side'
  | 'tnt_top'
  | 'mango'
  | 'tropical_wood'
  | 'cobble'
  | 'brick'
  | 'bookshelf'
  | 'crate'
  | 'gem_block'
  | 'jack_o_lantern'
  | 'redstone_lamp'
  | 'honeycomb'
  | 'slime'
  | 'moss_stone'
  | 'terracotta'
  | 'neon_panel'
  | 'melon'
  | 'bamboo';

export interface BlockDef {
  id: number;
  name: string;
  category: BlockCategory;
  solid: boolean;
  transparent: boolean;
  liquid?: boolean;
  hardness: number;
  roughness: number;
  metalness: number;
  slippery?: boolean;
  bounciness?: number;
  updraft?: boolean;
  hazardDamage?: number;
  emissive?: string;
  emissiveIntensity?: number;
  colorTop: string;
  colorSide: string;
  colorBottom: string;
  patternTop: AtlasTileName;
  patternSide: AtlasTileName;
  patternBottom: AtlasTileName;
}

export type ToolKind = 'sword' | 'pickaxe' | 'shovel';
export type ToolTier = 'iron' | 'aether';

export interface ToolDef {
  id: number;
  name: string;
  kind: ToolKind;
  tier: ToolTier;
  damage: number;
  range: number;
  miningSpeed: number;
  colorPrimary: string;
  colorAccent: string;
  craftCrystalCost: number;
}

export type CreatureSpecies =
  | 'sheep'
  | 'fox'
  | 'stag'
  | 'stalker'
  | 'skeleton'
  | 'creeper'
  | 'blaze_imp'
  | 'magma_golem'
  | 'ignis_lord'
  | 'king_boss'
  | 'sky_griffin'
  | 'storm_wisp'
  | 'sky_warden'
  | 'villager'
  | 'scout_bot'
  | 'big_scout_droid'
  | 'android'
  | 'laser_drone'
  | 'mecha_trooper'
  | 'mega_titan'
  | 'mango_bird'
  | 'sun_bird'
  | 'mango_guardian';

export interface CreatureMeta {
  species: CreatureSpecies;
  name: string;
  hostile: boolean;
  nocturnal: boolean;
  fireImmune?: boolean;
  isBoss?: boolean;
  friendlyAlly?: boolean;
  maxHealth: number;
  speed: number;
  damage: number;
  radius: number;
  height: number;
}

export interface SpawnEggDef {
  id: number;
  name: string;
  species: CreatureSpecies;
  category: 'animal' | 'monster' | 'boss';
  primaryColor: string;
  spotColor: string;
}

export type SkinPattern = 'knight' | 'royal' | 'cyber' | 'striped' | 'classic';

export interface PlayerSkin {
  id: string;
  name: string;
  skinTone: string;
  headColor: string;
  torsoColor: string;
  accentColor: string;
  limbColor: string;
  visorColor: string;
  capeColor: string;
  hasVisor: boolean;
  hasCape: boolean;
  hasCrown: boolean;
  pattern: SkinPattern;
  facePixels: string[];
}

export interface HudState {
  worldRules: WorldRules;
  biome: BiomeConfig;
  discoveredBiomes: BiomeId[];
  coords: [number, number, number];
  health: number;
  maxHealth: number;
  stamina: number;
  flyMode: boolean;
  isDead: boolean;
  timeOfDay: number;
  targetBlock: {
    x: number;
    y: number;
    z: number;
    block: BlockDef;
    progress: number;
  } | null;
  targetCreature: {
    name: string;
    hostile: boolean;
    friendlyAlly?: boolean;
    health: number;
    maxHealth: number;
  } | null;
  animalCount: number;
  hostileCount: number;
  hotbar: number[];
  inventory: Record<number, number>;
  selectedSlot: number;
  pointerLocked: boolean;
  fps: number;
  onlineCount: number;
  toast: string | null;
  portalCharge: number;
  portalDestName: string | null;
  kingBoss: {
    name: string;
    title: string;
    health: number;
    maxHealth: number;
    phase: 1 | 2;
    distance: number;
    friendlyAlly?: boolean;
  } | null;
  bossDefeated: boolean;
}

export interface SessionConfig {
  mode: 'solo' | 'multiplayer';
  worldRules: WorldRules;
  worldId: string;
  worldName: string;
  seed: number;
  roomId?: string;
  serverUrl?: string;
  playerName: string;
  playerColor: string;
  skin?: PlayerSkin;
}

export interface SavedWorld {
  id: string;
  name: string;
  seed: number;
  worldRules?: WorldRules;
  updatedAt: number;
  discoveredBiomes: BiomeId[];
  modifiedCount: number;
  playerPos: [number, number, number];
  timeOfDay: number;
  deltas: [string, number][];
  inventory?: [number, number][];
  health?: number;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  color: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export type MicMode = 'off' | 'open' | 'ptt';

export interface VoicePeerState {
  id: string;
  name: string;
  color: string;
  micActive: boolean;
  speaking: boolean;
  webrtcConnected: boolean;
  muted: boolean;
  volume: number;
}

export interface VoiceSignalPayload {
  kind: 'offer' | 'answer' | 'ice';
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

export interface RemotePlayer {
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
  skin?: PlayerSkin;
  micActive?: boolean;
  speaking?: boolean;
}

export interface RoomSummary {
  id: string;
  seed: number;
  worldRules: WorldRules;
  playerCount: number;
  modifiedCount: number;
  updatedAt: number;
}

export interface ServerInfo {
  serverName: string;
  port: number;
  lanIps: string[];
  urls: string[];
  wsUrls: string[];
  roomsCount: number;
  playersCount: number;
  uptimeSec: number;
}

export interface SavedServer {
  id: string;
  name: string;
  address: string;
  isDefaultHost?: boolean;
}
