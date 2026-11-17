import type { BiomeConfig, BiomeId } from '../types';
import { fbm2d } from './noise';

export const BIOMES: Record<BiomeId, BiomeConfig> = {
  verdant_basin: {
    id: 'verdant_basin',
    name: 'Verdant Basin',
    tagline: 'Lush oak valleys & shallow copper veins',
    mechanicLabel: '1.0x Gravity · Balanced',
    accentColor: '#34d399',
    skyTop: '#1e6091',
    skyHorizon: '#98d8e8',
    fogColor: '#9ad5e6',
    fogDensity: 0.0085,
    gravityScale: 1,
    speedScale: 1,
    jumpScale: 1,
    frictionScale: 1,
    ambientTint: '#86efac',
  },
  aether_spires: {
    id: 'aether_spires',
    name: 'Aether Spires',
    tagline: 'Floating sky islands & resonant cyan crystals',
    mechanicLabel: '0.52x Low Gravity · Updrafts',
    accentColor: '#38bdf8',
    skyTop: '#0f2557',
    skyHorizon: '#67e8f9',
    fogColor: '#7dd3fc',
    fogDensity: 0.0072,
    gravityScale: 0.52,
    speedScale: 1.08,
    jumpScale: 1.25,
    frictionScale: 0.95,
    ambientTint: '#38bdf8',
  },
  basalt_caldera: {
    id: 'basalt_caldera',
    name: 'Basalt Caldera',
    tagline: 'Obsidian ridges & thermal magma fissures',
    mechanicLabel: '1.24x Thermal Surge · Magma Heat',
    accentColor: '#fb923c',
    skyTop: '#2b1014',
    skyHorizon: '#b4533c',
    fogColor: '#7c2d12',
    fogDensity: 0.0105,
    gravityScale: 1.05,
    speedScale: 1.24,
    jumpScale: 1.05,
    frictionScale: 1,
    ambientTint: '#fb923c',
  },
  frostbound_tundra: {
    id: 'frostbound_tundra',
    name: 'Frostbound Tundra',
    tagline: 'Glacial ice shelves & crystalline drifts',
    mechanicLabel: 'Glacial Momentum · Ice Skating',
    accentColor: '#93c5fd',
    skyTop: '#1e3a5f',
    skyHorizon: '#dbeafe',
    fogColor: '#cbd5e1',
    fogDensity: 0.009,
    gravityScale: 1,
    speedScale: 1.12,
    jumpScale: 1,
    frictionScale: 0.25,
    ambientTint: '#bfdbfe',
  },
  mycelium_abyss: {
    id: 'mycelium_abyss',
    name: 'Mycelium Abyss',
    tagline: 'Bioluminescent spore groves & bounce caps',
    mechanicLabel: 'Spore Bounce · High Leap',
    accentColor: '#c084fc',
    skyTop: '#1b113a',
    skyHorizon: '#7e5bef',
    fogColor: '#4c1d95',
    fogDensity: 0.01,
    gravityScale: 0.85,
    speedScale: 1.05,
    jumpScale: 1.28,
    frictionScale: 0.92,
    ambientTint: '#c084fc',
  },
};

export const BIOME_LIST: BiomeConfig[] = Object.values(BIOMES);

export function getBiomeAt(x: number, z: number, seed: number): BiomeId {
  const dist = Math.hypot(x, z);
  if (seed === 777) {
    if (dist < 145) return 'basalt_caldera';
  } else if (seed === 888) {
    if (dist < 180) return 'aether_spires';
  } else if (seed === 666) {
    if (dist < 140) return 'aether_spires';
  } else if (dist < 22) {
    return 'verdant_basin';
  }

  const temp = fbm2d(x * 0.009 + 17.3, z * 0.009 - 9.1, seed + 101, 3);
  const moisture = fbm2d(x * 0.009 - 41.7, z * 0.009 + 23.4, seed + 307, 3);
  const altitude = fbm2d(x * 0.011 + 88.2, z * 0.011 + 12.9, seed + 613, 3);

  if (altitude > 0.26) return 'aether_spires';
  if (altitude < -0.25) return 'mycelium_abyss';
  if (temp > 0.22 && moisture < 0.08) return 'basalt_caldera';
  if (temp < -0.18) return 'frostbound_tundra';
  return 'verdant_basin';
}
