import * as THREE from 'three';
import type { AtlasTileName, BlockDef } from '../types';

export const BlockId = {
  AIR: 0,
  GRASS: 1,
  DIRT: 2,
  STONE: 3,
  BASALT: 4,
  SNOW: 5,
  ICE: 6,
  SAND: 7,
  OBSIDIAN: 8,
  MAGMA: 9,
  AETHER_CRYSTAL: 10,
  MYCELIUM: 11,
  GLOW_SPORE: 12,
  WOOD: 13,
  LEAVES: 14,
  COPPER_ORE: 15,
  AETHER_ORE: 16,
  WATER: 17,
  BOUNCE_CAP: 18,
  GLASS: 19,
  GLOW_MUSHROOM_STEM: 20,
  PORTAL_FRAME: 21,
  PORTAL_RIFT: 22,
  CASTLE_BRICK: 23,
  GOLD_BLOCK: 24,
  LANTERN: 25,
  CRIMSON_BANNER: 26,
  PLANK: 27,
  CLOUD_BLOCK: 28,
  SKY_MARBLE: 29,
  RAINBOW_GLASS: 30,
  WIND_BEACON: 31,
  STEEL_PLATE: 32,
  CIRCUIT_CORE: 33,
  HAZARD_STRIPE: 34,
  CYBER_CORE: 35,
  TNT: 36,
  MANGO_BLOCK: 37,
  TROPICAL_WOOD: 38,
  MANGO_LEAVES: 39,
  MANGO_PLANKS: 40,
  COBBLESTONE: 41,
  RED_BRICK: 42,
  BOOKSHELF: 43,
  CRATE: 44,
  DIAMOND_BLOCK: 45,
  EMERALD_BLOCK: 46,
  RUBY_BLOCK: 47,
  AMETHYST_BLOCK: 48,
  JACK_O_LANTERN: 49,
  REDSTONE_LAMP: 50,
  HONEYCOMB: 51,
  SLIME_BLOCK: 52,
  MOSSY_STONE: 53,
  CORAL_TERRACOTTA: 54,
  NEON_PANEL: 55,
  MELON_BLOCK: 56,
  BAMBOO_BLOCK: 57,
} as const;

export const BLOCK_LIST: BlockDef[] = [
  {
    id: BlockId.AIR,
    name: 'Air',
    category: 'terrain',
    solid: false,
    transparent: true,
    hardness: 0,
    roughness: 1,
    metalness: 0,
    colorTop: '#000000',
    colorSide: '#000000',
    colorBottom: '#000000',
    patternTop: 'dirt',
    patternSide: 'dirt',
    patternBottom: 'dirt',
  },
  {
    id: BlockId.GRASS,
    name: 'Verdant Turf',
    category: 'terrain',
    solid: true,
    transparent: false,
    hardness: 0.45,
    roughness: 0.88,
    metalness: 0.02,
    colorTop: '#4ade80',
    colorSide: '#78553a',
    colorBottom: '#6b4c35',
    patternTop: 'grass_top',
    patternSide: 'grass_side',
    patternBottom: 'dirt',
  },
  {
    id: BlockId.DIRT,
    name: 'Loam Soil',
    category: 'terrain',
    solid: true,
    transparent: false,
    hardness: 0.4,
    roughness: 0.94,
    metalness: 0,
    colorTop: '#78553a',
    colorSide: '#6b4c35',
    colorBottom: '#5c402c',
    patternTop: 'dirt',
    patternSide: 'dirt',
    patternBottom: 'dirt',
  },
  {
    id: BlockId.STONE,
    name: 'Strata Stone',
    category: 'terrain',
    solid: true,
    transparent: false,
    hardness: 0.9,
    roughness: 0.84,
    metalness: 0.05,
    colorTop: '#94a3b8',
    colorSide: '#7e8c9f',
    colorBottom: '#64748b',
    patternTop: 'stone',
    patternSide: 'stone',
    patternBottom: 'stone',
  },
  {
    id: BlockId.BASALT,
    name: 'Volcanic Basalt',
    category: 'terrain',
    solid: true,
    transparent: false,
    hardness: 1.1,
    roughness: 0.78,
    metalness: 0.12,
    colorTop: '#334155',
    colorSide: '#1e293b',
    colorBottom: '#0f172a',
    patternTop: 'basalt',
    patternSide: 'basalt',
    patternBottom: 'basalt',
  },
  {
    id: BlockId.SNOW,
    name: 'Frost Drift',
    category: 'terrain',
    solid: true,
    transparent: false,
    hardness: 0.3,
    roughness: 0.7,
    metalness: 0.05,
    colorTop: '#f8fafc',
    colorSide: '#e2e8f0',
    colorBottom: '#cbd5e1',
    patternTop: 'snow',
    patternSide: 'snow',
    patternBottom: 'snow',
  },
  {
    id: BlockId.ICE,
    name: 'Glacial Ice',
    category: 'mineral',
    solid: true,
    transparent: true,
    hardness: 0.5,
    roughness: 0.12,
    metalness: 0.1,
    slippery: true,
    colorTop: '#7dd3fc',
    colorSide: '#60a5fa',
    colorBottom: '#3b82f6',
    patternTop: 'ice',
    patternSide: 'ice',
    patternBottom: 'ice',
  },
  {
    id: BlockId.SAND,
    name: 'Silt Sand',
    category: 'terrain',
    solid: true,
    transparent: false,
    hardness: 0.35,
    roughness: 0.92,
    metalness: 0.02,
    colorTop: '#fcd34d',
    colorSide: '#f59e0b',
    colorBottom: '#d97706',
    patternTop: 'sand',
    patternSide: 'sand',
    patternBottom: 'sand',
  },
  {
    id: BlockId.OBSIDIAN,
    name: 'Obsidian Glass',
    category: 'mineral',
    solid: true,
    transparent: false,
    hardness: 1.6,
    roughness: 0.25,
    metalness: 0.45,
    colorTop: '#312e81',
    colorSide: '#1e1b4b',
    colorBottom: '#0f0d2e',
    patternTop: 'obsidian',
    patternSide: 'obsidian',
    patternBottom: 'obsidian',
  },
  {
    id: BlockId.MAGMA,
    name: 'Thermal Magma',
    category: 'mineral',
    solid: true,
    transparent: false,
    hardness: 1,
    roughness: 0.5,
    metalness: 0.1,
    emissive: '#f97316',
    emissiveIntensity: 0.9,
    hazardDamage: 12,
    colorTop: '#fb923c',
    colorSide: '#ea580c',
    colorBottom: '#9a3412',
    patternTop: 'magma',
    patternSide: 'magma',
    patternBottom: 'magma',
  },
  {
    id: BlockId.AETHER_CRYSTAL,
    name: 'Aether Crystal',
    category: 'mineral',
    solid: true,
    transparent: false,
    hardness: 0.7,
    roughness: 0.15,
    metalness: 0.55,
    emissive: '#22d3ee',
    emissiveIntensity: 0.85,
    updraft: true,
    colorTop: '#67e8f9',
    colorSide: '#06b6d4',
    colorBottom: '#0891b2',
    patternTop: 'crystal',
    patternSide: 'crystal',
    patternBottom: 'crystal',
  },
  {
    id: BlockId.MYCELIUM,
    name: 'Mycelial Turf',
    category: 'terrain',
    solid: true,
    transparent: false,
    hardness: 0.45,
    roughness: 0.85,
    metalness: 0.05,
    colorTop: '#a855f7',
    colorSide: '#581c87',
    colorBottom: '#4c1d95',
    patternTop: 'mycelium',
    patternSide: 'dirt',
    patternBottom: 'dirt',
  },
  {
    id: BlockId.GLOW_SPORE,
    name: 'Biolume Spore',
    category: 'flora',
    solid: true,
    transparent: false,
    hardness: 0.35,
    roughness: 0.4,
    metalness: 0.1,
    emissive: '#d946ef',
    emissiveIntensity: 0.8,
    colorTop: '#f0abfc',
    colorSide: '#c026d3',
    colorBottom: '#86198f',
    patternTop: 'spore',
    patternSide: 'spore',
    patternBottom: 'spore',
  },
  {
    id: BlockId.WOOD,
    name: 'Timber Log',
    category: 'flora',
    solid: true,
    transparent: false,
    hardness: 0.65,
    roughness: 0.88,
    metalness: 0,
    colorTop: '#d6a87c',
    colorSide: '#7c4a2d',
    colorBottom: '#d6a87c',
    patternTop: 'wood_top',
    patternSide: 'wood_side',
    patternBottom: 'wood_top',
  },
  {
    id: BlockId.LEAVES,
    name: 'Canopy Leaves',
    category: 'flora',
    solid: true,
    transparent: false,
    hardness: 0.25,
    roughness: 0.9,
    metalness: 0,
    colorTop: '#22c55e',
    colorSide: '#16a34a',
    colorBottom: '#15803d',
    patternTop: 'leaves',
    patternSide: 'leaves',
    patternBottom: 'leaves',
  },
  {
    id: BlockId.COPPER_ORE,
    name: 'Copper Seam',
    category: 'mineral',
    solid: true,
    transparent: false,
    hardness: 1.05,
    roughness: 0.55,
    metalness: 0.6,
    colorTop: '#d97757',
    colorSide: '#c26d4f',
    colorBottom: '#9a543d',
    patternTop: 'ore',
    patternSide: 'ore',
    patternBottom: 'ore',
  },
  {
    id: BlockId.AETHER_ORE,
    name: 'Aether Vein',
    category: 'mineral',
    solid: true,
    transparent: false,
    hardness: 1.25,
    roughness: 0.35,
    metalness: 0.65,
    emissive: '#38bdf8',
    emissiveIntensity: 0.55,
    colorTop: '#38bdf8',
    colorSide: '#0284c7',
    colorBottom: '#0369a1',
    patternTop: 'ore',
    patternSide: 'ore',
    patternBottom: 'ore',
  },
  {
    id: BlockId.WATER,
    name: 'Spring Water',
    category: 'terrain',
    solid: false,
    transparent: true,
    liquid: true,
    hardness: 99,
    roughness: 0.12,
    metalness: 0.1,
    colorTop: '#38bdf8',
    colorSide: '#0284c7',
    colorBottom: '#0369a1',
    patternTop: 'water',
    patternSide: 'water',
    patternBottom: 'water',
  },
  {
    id: BlockId.BOUNCE_CAP,
    name: 'Spore Bounce Cap',
    category: 'tech',
    solid: true,
    transparent: false,
    hardness: 0.4,
    roughness: 0.5,
    metalness: 0.05,
    bounciness: 1.75,
    emissive: '#a855f7',
    emissiveIntensity: 0.4,
    colorTop: '#e879f9',
    colorSide: '#9333ea',
    colorBottom: '#6b21a8',
    patternTop: 'bounce',
    patternSide: 'bounce',
    patternBottom: 'spore',
  },
  {
    id: BlockId.GLASS,
    name: 'Clear Silica',
    category: 'tech',
    solid: true,
    transparent: true,
    hardness: 0.35,
    roughness: 0.08,
    metalness: 0.15,
    colorTop: '#e0f2fe',
    colorSide: '#bae6fd',
    colorBottom: '#bae6fd',
    patternTop: 'glass',
    patternSide: 'glass',
    patternBottom: 'glass',
  },
  {
    id: BlockId.GLOW_MUSHROOM_STEM,
    name: 'Mycelial Stalk',
    category: 'flora',
    solid: true,
    transparent: false,
    hardness: 0.5,
    roughness: 0.85,
    metalness: 0,
    colorTop: '#f3e8ff',
    colorSide: '#e9d5ff',
    colorBottom: '#d8b4fe',
    patternTop: 'wood_top',
    patternSide: 'snow',
    patternBottom: 'wood_top',
  },
  {
    id: BlockId.PORTAL_FRAME,
    name: 'Rift Frame',
    category: 'tech',
    solid: true,
    transparent: false,
    hardness: 1.4,
    roughness: 0.25,
    metalness: 0.65,
    emissive: '#38bdf8',
    emissiveIntensity: 0.5,
    colorTop: '#312e81',
    colorSide: '#1e1b4b',
    colorBottom: '#0f172a',
    patternTop: 'portal_frame',
    patternSide: 'portal_frame',
    patternBottom: 'portal_frame',
  },
  {
    id: BlockId.PORTAL_RIFT,
    name: 'Biome Portal',
    category: 'tech',
    solid: false,
    transparent: true,
    hardness: 0.3,
    roughness: 0.1,
    metalness: 0.2,
    emissive: '#c084fc',
    emissiveIntensity: 1,
    colorTop: '#e879f9',
    colorSide: '#a855f7',
    colorBottom: '#7e22ce',
    patternTop: 'portal_rift',
    patternSide: 'portal_rift',
    patternBottom: 'portal_rift',
  },
  {
    id: BlockId.CASTLE_BRICK,
    name: 'Citadel Brick',
    category: 'terrain',
    solid: true,
    transparent: false,
    hardness: 1.25,
    roughness: 0.78,
    metalness: 0.08,
    colorTop: '#94a3b8',
    colorSide: '#64748b',
    colorBottom: '#475569',
    patternTop: 'stone_brick',
    patternSide: 'stone_brick',
    patternBottom: 'stone_brick',
  },
  {
    id: BlockId.GOLD_BLOCK,
    name: 'Royal Gold',
    category: 'mineral',
    solid: true,
    transparent: false,
    hardness: 1.15,
    roughness: 0.22,
    metalness: 0.85,
    colorTop: '#fde047',
    colorSide: '#eab308',
    colorBottom: '#ca8a04',
    patternTop: 'gold',
    patternSide: 'gold',
    patternBottom: 'gold',
  },
  {
    id: BlockId.LANTERN,
    name: 'Keep Lantern',
    category: 'tech',
    solid: true,
    transparent: false,
    hardness: 0.4,
    roughness: 0.25,
    metalness: 0.35,
    emissive: '#fbbf24',
    emissiveIntensity: 1,
    colorTop: '#fef08a',
    colorSide: '#f59e0b',
    colorBottom: '#b45309',
    patternTop: 'lantern',
    patternSide: 'lantern',
    patternBottom: 'lantern',
  },
  {
    id: BlockId.CRIMSON_BANNER,
    name: 'Royal Crimson',
    category: 'terrain',
    solid: true,
    transparent: false,
    hardness: 0.45,
    roughness: 0.88,
    metalness: 0.04,
    colorTop: '#ef4444',
    colorSide: '#dc2626',
    colorBottom: '#991b1b',
    patternTop: 'banner',
    patternSide: 'banner',
    patternBottom: 'banner',
  },
  {
    id: BlockId.PLANK,
    name: 'Oak Planks',
    category: 'flora',
    solid: true,
    transparent: false,
    hardness: 0.55,
    roughness: 0.85,
    metalness: 0,
    colorTop: '#d69e66',
    colorSide: '#b87d4b',
    colorBottom: '#966137',
    patternTop: 'planks',
    patternSide: 'planks',
    patternBottom: 'planks',
  },
  {
    id: BlockId.CLOUD_BLOCK,
    name: 'Nimbus Cloud',
    category: 'terrain',
    solid: true,
    transparent: false,
    hardness: 0.25,
    roughness: 0.92,
    metalness: 0,
    bounciness: 1.45,
    emissive: '#e0f2fe',
    emissiveIntensity: 0.14,
    colorTop: '#ffffff',
    colorSide: '#e0f2fe',
    colorBottom: '#bae6fd',
    patternTop: 'cloud',
    patternSide: 'cloud',
    patternBottom: 'cloud',
  },
  {
    id: BlockId.SKY_MARBLE,
    name: 'Sky Marble',
    category: 'terrain',
    solid: true,
    transparent: false,
    hardness: 1,
    roughness: 0.32,
    metalness: 0.16,
    colorTop: '#f8fafc',
    colorSide: '#e2e8f0',
    colorBottom: '#cbd5e1',
    patternTop: 'sky_marble',
    patternSide: 'sky_marble',
    patternBottom: 'sky_marble',
  },
  {
    id: BlockId.RAINBOW_GLASS,
    name: 'Sky Prism Glass',
    category: 'tech',
    solid: true,
    transparent: true,
    hardness: 0.35,
    roughness: 0.08,
    metalness: 0.22,
    emissive: '#38bdf8',
    emissiveIntensity: 0.22,
    colorTop: '#a5f3fc',
    colorSide: '#67e8f9',
    colorBottom: '#7dd3fc',
    patternTop: 'sky_glass',
    patternSide: 'sky_glass',
    patternBottom: 'sky_glass',
  },
  {
    id: BlockId.WIND_BEACON,
    name: 'Wind Updraft',
    category: 'tech',
    solid: true,
    transparent: false,
    hardness: 0.65,
    roughness: 0.2,
    metalness: 0.45,
    updraft: true,
    emissive: '#2dd4bf',
    emissiveIntensity: 0.9,
    colorTop: '#5eead4',
    colorSide: '#14b8a6',
    colorBottom: '#0f766e',
    patternTop: 'wind_beacon',
    patternSide: 'wind_beacon',
    patternBottom: 'wind_beacon',
  },
  {
    id: BlockId.STEEL_PLATE,
    name: 'Mecha Titanium',
    category: 'tech',
    solid: true,
    transparent: false,
    hardness: 1.25,
    roughness: 0.28,
    metalness: 0.78,
    colorTop: '#94a3b8',
    colorSide: '#64748b',
    colorBottom: '#475569',
    patternTop: 'steel_plate',
    patternSide: 'steel_plate',
    patternBottom: 'steel_plate',
  },
  {
    id: BlockId.CIRCUIT_CORE,
    name: 'Cyber Circuit',
    category: 'tech',
    solid: true,
    transparent: false,
    hardness: 1,
    roughness: 0.22,
    metalness: 0.65,
    emissive: '#06b6d4',
    emissiveIntensity: 0.75,
    colorTop: '#22d3ee',
    colorSide: '#0e7490',
    colorBottom: '#164e63',
    patternTop: 'circuit',
    patternSide: 'circuit',
    patternBottom: 'circuit',
  },
  {
    id: BlockId.HAZARD_STRIPE,
    name: 'Hazard Alloy',
    category: 'tech',
    solid: true,
    transparent: false,
    hardness: 1.15,
    roughness: 0.42,
    metalness: 0.45,
    colorTop: '#facc15',
    colorSide: '#eab308',
    colorBottom: '#ca8a04',
    patternTop: 'hazard',
    patternSide: 'hazard',
    patternBottom: 'hazard',
  },
  {
    id: BlockId.CYBER_CORE,
    name: 'Plasma Reactor',
    category: 'tech',
    solid: true,
    transparent: false,
    hardness: 1.2,
    roughness: 0.16,
    metalness: 0.5,
    updraft: true,
    emissive: '#f43f5e',
    emissiveIntensity: 1,
    colorTop: '#fb7185',
    colorSide: '#e11d48',
    colorBottom: '#9f1239',
    patternTop: 'cyber_core',
    patternSide: 'cyber_core',
    patternBottom: 'cyber_core',
  },
  {
    id: BlockId.TNT,
    name: 'TNT Explosive',
    category: 'tech',
    solid: true,
    transparent: false,
    hardness: 0.35,
    roughness: 0.65,
    metalness: 0.08,
    emissive: '#ef4444',
    emissiveIntensity: 0.18,
    colorTop: '#f8fafc',
    colorSide: '#dc2626',
    colorBottom: '#991b1b',
    patternTop: 'tnt_top',
    patternSide: 'tnt_side',
    patternBottom: 'tnt_top',
  },
  {
    id: BlockId.MANGO_BLOCK,
    name: 'Mango Fruit',
    category: 'flora',
    solid: true,
    transparent: false,
    hardness: 0.35,
    roughness: 0.45,
    metalness: 0.04,
    emissive: '#f59e0b',
    emissiveIntensity: 0.18,
    colorTop: '#f43f5e',
    colorSide: '#fb923c',
    colorBottom: '#facc15',
    patternTop: 'mango',
    patternSide: 'mango',
    patternBottom: 'mango',
  },
  {
    id: BlockId.TROPICAL_WOOD,
    name: 'Mango Wood',
    category: 'flora',
    solid: true,
    transparent: false,
    hardness: 0.65,
    roughness: 0.85,
    metalness: 0.02,
    colorTop: '#d97706',
    colorSide: '#a16207',
    colorBottom: '#78350f',
    patternTop: 'wood_top',
    patternSide: 'tropical_wood',
    patternBottom: 'wood_top',
  },
  {
    id: BlockId.MANGO_LEAVES,
    name: 'Mango Leaves',
    category: 'flora',
    solid: true,
    transparent: false,
    hardness: 0.25,
    roughness: 0.88,
    metalness: 0,
    colorTop: '#4ade80',
    colorSide: '#16a34a',
    colorBottom: '#15803d',
    patternTop: 'leaves',
    patternSide: 'leaves',
    patternBottom: 'leaves',
  },
  {
    id: BlockId.MANGO_PLANKS,
    name: 'Mango Planks',
    category: 'flora',
    solid: true,
    transparent: false,
    hardness: 0.5,
    roughness: 0.82,
    metalness: 0,
    colorTop: '#fbbf24',
    colorSide: '#d97706',
    colorBottom: '#b45309',
    patternTop: 'planks',
    patternSide: 'planks',
    patternBottom: 'planks',
  },
  {
    id: BlockId.COBBLESTONE,
    name: 'Cobblestone',
    category: 'terrain',
    solid: true,
    transparent: false,
    hardness: 1.0,
    roughness: 0.88,
    metalness: 0.04,
    colorTop: '#94a3b8',
    colorSide: '#64748b',
    colorBottom: '#475569',
    patternTop: 'cobble',
    patternSide: 'cobble',
    patternBottom: 'cobble',
  },
  {
    id: BlockId.RED_BRICK,
    name: 'Terracotta Brick',
    category: 'terrain',
    solid: true,
    transparent: false,
    hardness: 1.05,
    roughness: 0.84,
    metalness: 0.04,
    colorTop: '#e06d53',
    colorSide: '#c2410c',
    colorBottom: '#9a3412',
    patternTop: 'brick',
    patternSide: 'brick',
    patternBottom: 'brick',
  },
  {
    id: BlockId.BOOKSHELF,
    name: 'Bookshelf',
    category: 'flora',
    solid: true,
    transparent: false,
    hardness: 0.6,
    roughness: 0.82,
    metalness: 0.02,
    colorTop: '#d69e66',
    colorSide: '#b87d4b',
    colorBottom: '#966137',
    patternTop: 'planks',
    patternSide: 'bookshelf',
    patternBottom: 'planks',
  },
  {
    id: BlockId.CRATE,
    name: 'Supply Crate',
    category: 'flora',
    solid: true,
    transparent: false,
    hardness: 0.55,
    roughness: 0.8,
    metalness: 0.08,
    colorTop: '#e7b878',
    colorSide: '#c78c49',
    colorBottom: '#9a652e',
    patternTop: 'crate',
    patternSide: 'crate',
    patternBottom: 'crate',
  },
  {
    id: BlockId.DIAMOND_BLOCK,
    name: 'Diamond Block',
    category: 'mineral',
    solid: true,
    transparent: false,
    hardness: 1.35,
    roughness: 0.14,
    metalness: 0.72,
    emissive: '#38bdf8',
    emissiveIntensity: 0.45,
    colorTop: '#67e8f9',
    colorSide: '#06b6d4',
    colorBottom: '#0284c7',
    patternTop: 'gem_block',
    patternSide: 'gem_block',
    patternBottom: 'gem_block',
  },
  {
    id: BlockId.EMERALD_BLOCK,
    name: 'Emerald Block',
    category: 'mineral',
    solid: true,
    transparent: false,
    hardness: 1.3,
    roughness: 0.16,
    metalness: 0.68,
    emissive: '#10b981',
    emissiveIntensity: 0.4,
    colorTop: '#6ee7b7',
    colorSide: '#10b981',
    colorBottom: '#047857',
    patternTop: 'gem_block',
    patternSide: 'gem_block',
    patternBottom: 'gem_block',
  },
  {
    id: BlockId.RUBY_BLOCK,
    name: 'Ruby Block',
    category: 'mineral',
    solid: true,
    transparent: false,
    hardness: 1.3,
    roughness: 0.16,
    metalness: 0.68,
    emissive: '#f43f5e',
    emissiveIntensity: 0.42,
    colorTop: '#fda4af',
    colorSide: '#f43f5e',
    colorBottom: '#be123c',
    patternTop: 'gem_block',
    patternSide: 'gem_block',
    patternBottom: 'gem_block',
  },
  {
    id: BlockId.AMETHYST_BLOCK,
    name: 'Amethyst Block',
    category: 'mineral',
    solid: true,
    transparent: false,
    hardness: 1.15,
    roughness: 0.18,
    metalness: 0.52,
    emissive: '#a855f7',
    emissiveIntensity: 0.65,
    colorTop: '#d8b4fe',
    colorSide: '#a855f7',
    colorBottom: '#7e22ce',
    patternTop: 'crystal',
    patternSide: 'crystal',
    patternBottom: 'crystal',
  },
  {
    id: BlockId.JACK_O_LANTERN,
    name: 'Jack o\'Lantern',
    category: 'flora',
    solid: true,
    transparent: false,
    hardness: 0.45,
    roughness: 0.55,
    metalness: 0.05,
    emissive: '#fbbf24',
    emissiveIntensity: 0.95,
    colorTop: '#ea580c',
    colorSide: '#f97316',
    colorBottom: '#c2410c',
    patternTop: 'wood_top',
    patternSide: 'jack_o_lantern',
    patternBottom: 'terracotta',
  },
  {
    id: BlockId.REDSTONE_LAMP,
    name: 'Glowstone Lamp',
    category: 'tech',
    solid: true,
    transparent: false,
    hardness: 0.45,
    roughness: 0.25,
    metalness: 0.2,
    emissive: '#fde047',
    emissiveIntensity: 1.0,
    colorTop: '#fef08a',
    colorSide: '#facc15',
    colorBottom: '#ca8a04',
    patternTop: 'redstone_lamp',
    patternSide: 'redstone_lamp',
    patternBottom: 'redstone_lamp',
  },
  {
    id: BlockId.HONEYCOMB,
    name: 'Nectar Honeycomb',
    category: 'flora',
    solid: true,
    transparent: false,
    hardness: 0.35,
    roughness: 0.38,
    metalness: 0.08,
    emissive: '#f59e0b',
    emissiveIntensity: 0.2,
    colorTop: '#fde047',
    colorSide: '#f59e0b',
    colorBottom: '#d97706',
    patternTop: 'honeycomb',
    patternSide: 'honeycomb',
    patternBottom: 'honeycomb',
  },
  {
    id: BlockId.SLIME_BLOCK,
    name: 'Spring Slime',
    category: 'flora',
    solid: true,
    transparent: true,
    hardness: 0.22,
    roughness: 0.14,
    metalness: 0.05,
    bounciness: 1.9,
    emissive: '#4ade80',
    emissiveIntensity: 0.32,
    colorTop: '#86efac',
    colorSide: '#22c55e',
    colorBottom: '#16a34a',
    patternTop: 'slime',
    patternSide: 'slime',
    patternBottom: 'slime',
  },
  {
    id: BlockId.MOSSY_STONE,
    name: 'Mossy Ruins',
    category: 'terrain',
    solid: true,
    transparent: false,
    hardness: 0.95,
    roughness: 0.86,
    metalness: 0.04,
    colorTop: '#86efac',
    colorSide: '#64748b',
    colorBottom: '#475569',
    patternTop: 'moss_stone',
    patternSide: 'moss_stone',
    patternBottom: 'cobble',
  },
  {
    id: BlockId.CORAL_TERRACOTTA,
    name: 'Coral Tile',
    category: 'terrain',
    solid: true,
    transparent: false,
    hardness: 0.85,
    roughness: 0.68,
    metalness: 0.05,
    colorTop: '#fda4af',
    colorSide: '#fb7185',
    colorBottom: '#e11d48',
    patternTop: 'terracotta',
    patternSide: 'terracotta',
    patternBottom: 'terracotta',
  },
  {
    id: BlockId.NEON_PANEL,
    name: 'Neon Sign Tile',
    category: 'tech',
    solid: true,
    transparent: false,
    hardness: 0.65,
    roughness: 0.18,
    metalness: 0.35,
    emissive: '#f472b6',
    emissiveIntensity: 0.95,
    colorTop: '#f472b6',
    colorSide: '#ec4899',
    colorBottom: '#be185d',
    patternTop: 'neon_panel',
    patternSide: 'neon_panel',
    patternBottom: 'neon_panel',
  },
  {
    id: BlockId.MELON_BLOCK,
    name: 'Tropical Melon',
    category: 'flora',
    solid: true,
    transparent: false,
    hardness: 0.38,
    roughness: 0.62,
    metalness: 0.02,
    colorTop: '#4ade80',
    colorSide: '#22c55e',
    colorBottom: '#15803d',
    patternTop: 'melon',
    patternSide: 'melon',
    patternBottom: 'melon',
  },
  {
    id: BlockId.BAMBOO_BLOCK,
    name: 'Bamboo Bundle',
    category: 'flora',
    solid: true,
    transparent: false,
    hardness: 0.42,
    roughness: 0.65,
    metalness: 0.02,
    colorTop: '#bef264',
    colorSide: '#84cc16',
    colorBottom: '#65a30d',
    patternTop: 'wood_top',
    patternSide: 'bamboo',
    patternBottom: 'wood_top',
  },
];

const BLOCK_MAP = new Map<number, BlockDef>();
for (const b of BLOCK_LIST) BLOCK_MAP.set(b.id, b);

export const DEFAULT_HOTBAR: number[] = [
  101,
  103,
  105,
  BlockId.GRASS,
  BlockId.MANGO_PLANKS,
  BlockId.TNT,
  BlockId.MANGO_BLOCK,
  BlockId.AETHER_CRYSTAL,
  BlockId.PORTAL_FRAME,
];

export function getBlock(id: number): BlockDef {
  return BLOCK_MAP.get(id) ?? BLOCK_LIST[0];
}

export function getAllBlocks(): BlockDef[] {
  return Array.from(BLOCK_MAP.values()).filter((b) => b.id !== BlockId.AIR);
}

const TILE_INDEX: Record<AtlasTileName, number> = {
  grass_top: 0,
  grass_side: 1,
  dirt: 2,
  stone: 3,
  basalt: 4,
  snow: 5,
  ice: 6,
  sand: 7,
  obsidian: 8,
  magma: 9,
  crystal: 10,
  mycelium: 11,
  spore: 12,
  wood_side: 13,
  wood_top: 14,
  leaves: 15,
  ore: 16,
  water: 17,
  bounce: 18,
  glass: 19,
  portal_frame: 20,
  portal_rift: 21,
  stone_brick: 22,
  gold: 23,
  lantern: 24,
  banner: 25,
  planks: 26,
  cloud: 27,
  sky_marble: 28,
  sky_glass: 29,
  wind_beacon: 30,
  steel_plate: 31,
  circuit: 32,
  hazard: 33,
  cyber_core: 34,
  tnt_side: 35,
  tnt_top: 36,
  mango: 37,
  tropical_wood: 38,
  cobble: 39,
  brick: 40,
  bookshelf: 41,
  crate: 42,
  gem_block: 43,
  jack_o_lantern: 44,
  redstone_lamp: 45,
  honeycomb: 46,
  slime: 47,
  moss_stone: 48,
  terracotta: 49,
  neon_panel: 50,
  melon: 51,
  bamboo: 52,
};

function drawAtlasTile(
  albedoCtx: CanvasRenderingContext2D,
  emissiveCtx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  tile: AtlasTileName
): void {
  const put = (x: number, y: number, shade: number, alpha = 1, glow = 0) => {
    const v = Math.max(0, Math.min(255, Math.round(shade * 255)));
    albedoCtx.fillStyle = `rgba(${v},${v},${v},${alpha})`;
    albedoCtx.fillRect(ox + x, oy + y, 1, 1);
    if (glow > 0) {
      const g = Math.max(0, Math.min(255, Math.round(glow * 255)));
      emissiveCtx.fillStyle = `rgb(${g},${g},${g})`;
      emissiveCtx.fillRect(ox + x, oy + y, 1, 1);
    }
  };

  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const n = ((x * 73856093) ^ (y * 19349663) ^ (TILE_INDEX[tile] * 83492791)) >>> 0;
      const r = (n % 100) / 100;

      switch (tile) {
        case 'grass_top':
          put(x, y, r > 0.72 ? 1 : r > 0.35 ? 0.9 : 0.8);
          break;
        case 'grass_side':
          if (y < 4 || (y === 4 && (x + (n % 3)) % 2 === 0)) {
            put(x, y, r > 0.5 ? 0.95 : 0.85);
          } else {
            put(x, y, 0.65 + r * 0.2);
          }
          break;
        case 'dirt': {
          const v = r > 0.86 ? 0.72 : r < 0.14 ? 0.96 : 0.84 + r * 0.1;
          put(x, y, v);
          break;
        }
        case 'stone': {
          const v = y % 5 === 0 && (x + y) % 7 < 4 ? 0.74 : 0.86 + r * 0.12;
          put(x, y, v);
          break;
        }
        case 'basalt': {
          const v = (x + Math.floor(y / 2)) % 6 === 0 ? 0.72 : 0.85 + r * 0.14;
          put(x, y, v);
          break;
        }
        case 'snow':
          put(x, y, 0.92 + r * 0.08);
          break;
        case 'ice': {
          const streak = (x + y) % 9 === 0 || (x + y) % 9 === 1;
          put(x, y, streak ? 1 : 0.82 + r * 0.08, 0.78);
          break;
        }
        case 'sand': {
          const wave = Math.sin((x + y * 0.5) * 0.7) * 0.05;
          put(x, y, 0.88 + wave + r * 0.08);
          break;
        }
        case 'obsidian': {
          const glint = (x * 2 + y) % 7 === 0;
          put(x, y, glint ? 1 : 0.78 + r * 0.12);
          break;
        }
        case 'magma': {
          const vein = Math.sin(x * 0.7) + Math.cos(y * 0.65) > 0.75;
          put(x, y, vein ? 1 : 0.45 + r * 0.15, 1, vein ? 0.95 : 0.1);
          break;
        }
        case 'crystal': {
          const border = x === 0 || y === 0 || x === 15 || y === 15;
          const shard = Math.abs(x - y) < 3 || (x + y > 13 && x + y < 17);
          put(x, y, border ? 1 : shard ? 0.96 : 0.78 + r * 0.1, 1, shard ? 0.85 : 0.35);
          break;
        }
        case 'mycelium': {
          const dot = r > 0.83;
          put(x, y, dot ? 1 : 0.8 + r * 0.12, 1, dot ? 0.35 : 0);
          break;
        }
        case 'spore': {
          const spot =
            (x - 4) ** 2 + (y - 5) ** 2 < 5 || (x - 11) ** 2 + (y - 11) ** 2 < 6;
          put(x, y, spot ? 1 : 0.74 + r * 0.12, 1, spot ? 0.95 : 0.25);
          break;
        }
        case 'wood_side': {
          const bark = x % 4 === 0 ? 0.72 : 0.86 + r * 0.1;
          put(x, y, bark);
          break;
        }
        case 'wood_top': {
          const dx = x - 7.5;
          const dy = y - 7.5;
          const ring = Math.floor(Math.sqrt(dx * dx + dy * dy)) % 2 === 0;
          put(x, y, ring ? 0.94 : 0.78);
          break;
        }
        case 'leaves':
          put(x, y, r < 0.16 ? 0.68 : 0.88 + r * 0.12);
          break;
        case 'ore': {
          const nugget =
            (x >= 3 && x <= 5 && y >= 4 && y <= 6) ||
            (x >= 10 && x <= 12 && y >= 9 && y <= 12) ||
            (x >= 5 && x <= 7 && y >= 10 && y <= 11);
          put(x, y, nugget ? 1 : 0.52 + r * 0.12, 1, nugget ? 0.45 : 0);
          break;
        }
        case 'water': {
          const ripple = Math.sin(x * 0.6 + y * 0.4) > 0.3;
          put(x, y, ripple ? 0.96 : 0.82, 0.72);
          break;
        }
        case 'bounce': {
          const border = x === 0 || y === 0 || x === 15 || y === 15;
          const ring =
            x >= 4 && x <= 11 && y >= 4 && y <= 11 && !(x >= 6 && x <= 9 && y >= 6 && y <= 9);
          put(x, y, border ? 0.72 : ring ? 1 : 0.86, 1, ring ? 0.6 : 0.15);
          break;
        }
        case 'glass': {
          const border = x === 0 || y === 0 || x === 15 || y === 15;
          const glare = (x + y === 5 || x + y === 6) && x > 1 && y > 1;
          put(x, y, border || glare ? 1 : 0.85, border || glare ? 0.78 : 0.24);
          break;
        }
        case 'portal_frame': {
          const border = x === 0 || y === 0 || x === 15 || y === 15;
          const rune = (x === 3 || x === 12 || y === 3 || y === 12) && (x + y) % 3 !== 0;
          const core = x >= 6 && x <= 9 && y >= 6 && y <= 9;
          put(
            x,
            y,
            border ? 0.55 : rune || core ? 1 : 0.72,
            1,
            rune ? 0.75 : core ? 0.95 : 0.08
          );
          break;
        }
        case 'portal_rift': {
          const dx = x - 7.5;
          const dy = y - 7.5;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const swirl = Math.sin(dist * 1.15 + Math.atan2(dy, dx) * 2) > 0;
          put(x, y, swirl ? 1 : 0.78, swirl ? 0.86 : 0.62, swirl ? 1 : 0.65);
          break;
        }
        case 'stone_brick': {
          const mortar =
            y === 0 ||
            y === 8 ||
            (y < 8 && (x === 0 || x === 8)) ||
            (y >= 8 && (x === 4 || x === 12));
          put(x, y, mortar ? 0.62 : 0.86 + r * 0.12);
          break;
        }
        case 'gold': {
          const border = x === 0 || y === 0 || x === 15 || y === 15;
          const shine =
            x + y === 6 ||
            x + y === 7 ||
            (x >= 5 && x <= 10 && y >= 5 && y <= 10 && (x === 5 || y === 5));
          put(x, y, border ? 0.78 : shine ? 1 : 0.88 + r * 0.08, 1, shine ? 0.15 : 0);
          break;
        }
        case 'lantern': {
          const frame =
            x <= 1 || x >= 14 || y <= 1 || y >= 14 || (x === 7 && (y < 3 || y > 12));
          const flame = x >= 4 && x <= 11 && y >= 4 && y <= 11;
          put(x, y, frame ? 0.35 : flame ? 1 : 0.88, 1, frame ? 0 : flame ? 1 : 0.6);
          break;
        }
        case 'banner': {
          const trim = x === 1 || x === 14 || y === 1 || y === 14;
          const weave = (x + y) % 3 === 0 ? 0.92 : 0.82;
          put(x, y, trim ? 1 : weave + r * 0.06);
          break;
        }
        case 'planks': {
          const seam = y % 4 === 0 || (Math.floor(y / 4) % 2 === 0 ? x === 7 : x === 14);
          put(x, y, seam ? 0.62 : 0.88 + r * 0.1);
          break;
        }
        case 'cloud': {
          const puff = Math.sin(x * 0.45) * Math.cos(y * 0.45) > 0.1;
          put(x, y, puff ? 1 : 0.9 + r * 0.08, 1, puff ? 0.12 : 0.04);
          break;
        }
        case 'sky_marble': {
          const border = x === 0 || y === 0 || x === 15 || y === 15;
          const vein = (x + y * 2) % 13 === 0;
          put(x, y, border ? 0.78 : vein ? 0.72 : 0.94 + r * 0.06);
          break;
        }
        case 'sky_glass': {
          const border = x === 0 || y === 0 || x === 15 || y === 15;
          const glint = (x + y === 4 || x + y === 10) && x > 1 && y > 1;
          put(x, y, border || glint ? 1 : 0.86, border || glint ? 0.82 : 0.28, glint ? 0.45 : 0.1);
          break;
        }
        case 'wind_beacon': {
          const border = x === 0 || y === 0 || x === 15 || y === 15;
          const vents = (y === 4 || y === 8 || y === 12) && x >= 3 && x <= 12;
          const core = x >= 6 && x <= 9 && y >= 5 && y <= 10;
          put(x, y, border ? 0.65 : core || vents ? 1 : 0.76, 1, core ? 1 : vents ? 0.75 : 0.2);
          break;
        }
        case 'steel_plate': {
          const seam = x === 0 || y === 0 || x === 15 || y === 15 || x === 8 || y === 8;
          const rivet = (x === 2 || x === 13) && (y === 2 || y === 13);
          put(x, y, seam ? 0.62 : rivet ? 1 : 0.86 + r * 0.08);
          break;
        }
        case 'circuit': {
          const border = x === 0 || y === 0 || x === 15 || y === 15;
          const trace = x === 4 || y === 11 || (x === y && x >= 4 && x <= 11);
          const node =
            (x === 4 && y === 4) || (x === 11 && y === 11) || (x === 11 && y === 4);
          put(
            x,
            y,
            border ? 0.35 : node ? 1 : trace ? 0.92 : 0.25 + r * 0.06,
            1,
            node ? 1 : trace ? 0.75 : 0.05
          );
          break;
        }
        case 'hazard': {
          const stripe = (x + y) % 8 < 4;
          const border = x === 0 || y === 0 || x === 15 || y === 15;
          put(x, y, border ? 0.22 : stripe ? 0.98 : 0.18);
          break;
        }
        case 'cyber_core': {
          const border = x <= 1 || y <= 1 || x >= 14 || y >= 14;
          const core = x >= 5 && x <= 10 && y >= 5 && y <= 10;
          const ring =
            (x === 3 || x === 12 || y === 3 || y === 12) &&
            x >= 3 &&
            x <= 12 &&
            y >= 3 &&
            y <= 12;
          put(x, y, border ? 0.35 : core ? 1 : ring ? 0.88 : 0.52, 1, core ? 1 : ring ? 0.65 : 0.15);
          break;
        }
        case 'tnt_side': {
          // Classic red & white center TNT label band (vertex color multiplies by red/white)
          const band = y >= 5 && y <= 10;
          const t1 = y >= 6 && y <= 9 && (y === 6 ? x >= 2 && x <= 4 : x === 3);
          const n = y >= 6 && y <= 9 && (x === 6 || x === 9 || (x === 7 && y === 7) || (x === 8 && y === 8));
          const t2 = y >= 6 && y <= 9 && (y === 6 ? x >= 11 && x <= 13 : x === 12);
          const glyph = t1 || n || t2;
          if (band) {
            put(x, y, glyph ? 0.14 : 1.0, 1, glyph ? 0 : 0.08);
          } else {
            const plank = x % 4 === 0 ? 0.68 : 0.88 + r * 0.1;
            put(x, y, plank);
          }
          break;
        }
        case 'tnt_top': {
          const border = x <= 1 || y <= 1 || x >= 14 || y >= 14;
          const cap = x >= 6 && x <= 9 && y >= 6 && y <= 9;
          const spark = (x === 7 || x === 8) && (y === 7 || y === 8);
          put(x, y, border ? 0.55 : cap ? 0.28 : 0.92, 1, spark ? 0.95 : 0);
          break;
        }
        case 'mango': {
          const glow = (x - 5) ** 2 + (y - 5) ** 2 < 7;
          const blush = y < 6 ? 0.98 : 0.88;
          put(x, y, glow ? 1 : blush - r * 0.08, 1, glow ? 0.25 : 0.08);
          break;
        }
        case 'tropical_wood': {
          const stripe = y % 5 === 0 ? 0.72 : x % 4 === 0 ? 0.82 : 0.9 + r * 0.08;
          put(x, y, stripe);
          break;
        }
        case 'cobble': {
          const crack = (x * 3 + y * 5) % 9 === 0 || (x + y * 2) % 7 === 0;
          put(x, y, crack ? 0.56 : 0.84 + r * 0.15);
          break;
        }
        case 'brick': {
          const row = Math.floor(y / 4);
          const mortar = y % 4 === 0 || (row % 2 === 0 ? x % 8 === 0 : (x + 4) % 8 === 0);
          put(x, y, mortar ? 0.62 : 0.88 + r * 0.12);
          break;
        }
        case 'bookshelf': {
          const shelf = y <= 1 || y === 7 || y === 8 || y >= 14 || x === 0 || x === 15;
          if (shelf) {
            put(x, y, 0.72 + r * 0.08);
          } else {
            const bookSplit = x % 3 === 0;
            const spine = ((x + y * 3) % 5) * 0.08;
            put(x, y, bookSplit ? 0.42 : 0.86 + spine);
          }
          break;
        }
        case 'crate': {
          const border = x <= 1 || y <= 1 || x >= 14 || y >= 14;
          const diag = Math.abs(x - y) <= 1 || Math.abs(x + y - 15) <= 1;
          put(x, y, border ? 0.68 : diag ? 0.76 : 0.92 + r * 0.06);
          break;
        }
        case 'gem_block': {
          const border = x === 0 || y === 0 || x === 15 || y === 15;
          const glint = (x + y === 5 || x + y === 6 || (x >= 4 && x <= 11 && y === 4));
          put(x, y, border ? 0.7 : glint ? 1 : 0.88 + r * 0.08, 1, glint ? 0.7 : 0.22);
          break;
        }
        case 'jack_o_lantern': {
          const eyeL = x >= 3 && x <= 5 && y >= 4 && y <= 6;
          const eyeR = x >= 10 && x <= 12 && y >= 4 && y <= 6;
          const mouth = y >= 10 && y <= 12 && x >= 3 && x <= 12 && !(y === 10 && (x === 6 || x === 9));
          const carved = eyeL || eyeR || mouth;
          const rib = x % 4 === 0;
          put(x, y, carved ? 1 : rib ? 0.72 : 0.9, 1, carved ? 1 : 0.15);
          break;
        }
        case 'redstone_lamp': {
          const frame = x === 0 || y === 0 || x === 15 || y === 15 || (x === 8 && y === 8);
          const lattice = x === 4 || x === 11 || y === 4 || y === 11;
          put(x, y, frame ? 0.5 : lattice ? 0.85 : 1, 1, frame ? 0.2 : 0.95);
          break;
        }
        case 'honeycomb': {
          const hex = (x + Math.floor(y / 2)) % 5 === 0 || y % 4 === 0;
          put(x, y, hex ? 0.76 : 0.96 + r * 0.04, 1, hex ? 0.05 : 0.28);
          break;
        }
        case 'slime': {
          const core = x >= 3 && x <= 12 && y >= 3 && y <= 12;
          put(x, y, core ? 0.95 : 0.8, core ? 0.84 : 0.64, core ? 0.45 : 0.15);
          break;
        }
        case 'moss_stone': {
          const moss = r > 0.62 || y < 3;
          put(x, y, moss ? 0.96 : 0.7 + r * 0.14);
          break;
        }
        case 'terracotta': {
          const ring = x === 0 || y === 0 || x === 15 || y === 15 || (x >= 5 && x <= 10 && y >= 5 && y <= 10);
          put(x, y, ring ? 0.84 : 0.95 + r * 0.05);
          break;
        }
        case 'neon_panel': {
          const border = x <= 1 || y <= 1 || x >= 14 || y >= 14;
          const glowRing = x === 3 || y === 3 || x === 12 || y === 12;
          put(x, y, border ? 0.35 : glowRing ? 1 : 0.68, 1, glowRing ? 1 : 0.45);
          break;
        }
        case 'melon': {
          const stripe = x % 4 === 0 || x % 4 === 1;
          put(x, y, stripe ? 0.74 : 0.96 + r * 0.04);
          break;
        }
        case 'bamboo': {
          const node = y === 4 || y === 12;
          const stalk = x % 5 === 0;
          put(x, y, node ? 0.7 : stalk ? 0.78 : 0.95 + r * 0.05);
          break;
        }
      }
    }
  }
}

export function createAtlas(maxAnisotropy: number): {
  albedoMap: THREE.CanvasTexture;
  emissiveMap: THREE.CanvasTexture;
  dispose: () => void;
} {
  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = 128;
  albedoCanvas.height = 128;
  const albedoCtx = albedoCanvas.getContext('2d')!;
  albedoCtx.clearRect(0, 0, 128, 128);

  const emissiveCanvas = document.createElement('canvas');
  emissiveCanvas.width = 128;
  emissiveCanvas.height = 128;
  const emissiveCtx = emissiveCanvas.getContext('2d')!;
  emissiveCtx.fillStyle = '#000000';
  emissiveCtx.fillRect(0, 0, 128, 128);

  (Object.keys(TILE_INDEX) as AtlasTileName[]).forEach((name) => {
    const idx = TILE_INDEX[name];
    const col = idx % 8;
    const row = Math.floor(idx / 8);
    drawAtlasTile(albedoCtx, emissiveCtx, col * 16, row * 16, name);
  });

  const albedoMap = new THREE.CanvasTexture(albedoCanvas);
  albedoMap.colorSpace = THREE.SRGBColorSpace;
  albedoMap.magFilter = THREE.NearestFilter;
  albedoMap.minFilter = THREE.NearestMipmapLinearFilter;
  albedoMap.anisotropy = Math.min(8, maxAnisotropy);
  albedoMap.needsUpdate = true;

  const emissiveMap = new THREE.CanvasTexture(emissiveCanvas);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;
  emissiveMap.magFilter = THREE.NearestFilter;
  emissiveMap.minFilter = THREE.NearestFilter;
  emissiveMap.needsUpdate = true;

  return {
    albedoMap,
    emissiveMap,
    dispose: () => {
      albedoMap.dispose();
      emissiveMap.dispose();
    },
  };
}

export function getTileUVs(tile: AtlasTileName): [number, number, number, number] {
  const idx = TILE_INDEX[tile] ?? 0;
  const col = idx % 8;
  const row = Math.floor(idx / 8);
  const pad = 0.002;
  const step = 1 / 8;
  const u0 = col * step + pad;
  const u1 = (col + 1) * step - pad;
  const v1 = 1 - row * step - pad;
  const v0 = 1 - (row + 1) * step + pad;
  return [u0, v0, u1, v1];
}

const iconCache = new Map<string, string>();

export function renderBlockIcon(block: BlockDef): string {
  const key = `${block.id}_${block.colorTop}_${block.colorSide}_${block.patternTop}`;
  const cached = iconCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 36;
  canvas.height = 36;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 36, 36);

  ctx.fillStyle = block.colorTop;
  ctx.beginPath();
  ctx.moveTo(18, 4);
  ctx.lineTo(31, 11);
  ctx.lineTo(18, 18);
  ctx.lineTo(5, 11);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = block.colorSide;
  ctx.beginPath();
  ctx.moveTo(5, 11);
  ctx.lineTo(18, 18);
  ctx.lineTo(18, 32);
  ctx.lineTo(5, 25);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fill();

  ctx.fillStyle = block.colorSide;
  ctx.beginPath();
  ctx.moveTo(31, 11);
  ctx.lineTo(18, 18);
  ctx.lineTo(18, 32);
  ctx.lineTo(31, 25);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.34)';
  ctx.fill();

  if (block.id === BlockId.TNT) {
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(6, 15, 24, 9);
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('TNT', 18, 22);
  }

  if (block.emissive) {
    ctx.strokeStyle = block.emissive;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(18, 4);
    ctx.lineTo(31, 11);
    ctx.lineTo(31, 25);
    ctx.lineTo(18, 32);
    ctx.lineTo(5, 25);
    ctx.lineTo(5, 11);
    ctx.closePath();
    ctx.stroke();
  }

  const url = canvas.toDataURL();
  iconCache.set(key, url);
  return url;
}
