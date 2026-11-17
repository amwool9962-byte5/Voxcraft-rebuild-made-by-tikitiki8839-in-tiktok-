import * as THREE from 'three';
import { getBiomeAt } from './biomes';
import { BlockId, getBlock, getTileUVs } from './blocks';
import { fbm2d, hash2d, ridged2d, valueNoise3d } from './noise';

export const CHUNK_SIZE = 16;
export const CHUNK_HEIGHT = 64;

export function chunkKey(cx: number, cz: number): string {
  return `${cx},${cz}`;
}

export function voxelKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

interface HouseSpec {
  x0: number;
  z0: number;
  w: number;
  d: number;
  wallH: number;
  doorSide: 'N' | 'S' | 'E' | 'W';
  style: string;
}

const VILLAGE_HOUSES: HouseSpec[] = [
  { x0: -14, z0: -10, w: 8, d: 7, wallH: 4, doorSide: 'S', style: 'forge' },
  { x0: -25, z0: -11, w: 8, d: 8, wallH: 6, doorSide: 'S', style: 'manor' },
  { x0: -36, z0: -10, w: 7, d: 7, wallH: 4, doorSide: 'S', style: 'cottage' },
  { x0: 7, z0: -11, w: 9, d: 8, wallH: 6, doorSide: 'S', style: 'manor' },
  { x0: 19, z0: -10, w: 7, d: 7, wallH: 4, doorSide: 'S', style: 'cottage' },
  { x0: 29, z0: -10, w: 7, d: 7, wallH: 4, doorSide: 'S', style: 'cottage' },
  { x0: -15, z0: 11, w: 8, d: 7, wallH: 5, doorSide: 'E', style: 'manor' },
  { x0: -26, z0: 11, w: 8, d: 7, wallH: 4, doorSide: 'N', style: 'stone' },
  { x0: -36, z0: 11, w: 7, d: 7, wallH: 4, doorSide: 'N', style: 'cottage' },
  { x0: 18, z0: 11, w: 8, d: 7, wallH: 5, doorSide: 'N', style: 'manor' },
  { x0: 29, z0: 11, w: 7, d: 7, wallH: 4, doorSide: 'N', style: 'cottage' },
  { x0: -13, z0: 23, w: 7, d: 7, wallH: 4, doorSide: 'E', style: 'stone' },
  { x0: 7, z0: 23, w: 7, d: 7, wallH: 4, doorSide: 'W', style: 'cottage' },
  { x0: 17, z0: 23, w: 9, d: 8, wallH: 5, doorSide: 'W', style: 'manor' },
];

function isVillageZone999(wx: number, wz: number): boolean {
  return wx >= -42 && wx <= 42 && wz >= -52 && wz <= 38;
}

function isGateBattlement(wx: number, wz: number): boolean {
  return (wx + wz) % 2 === 0;
}

type LocalSetter = (lx: number, y: number, lz: number, id: number) => void;

function buildRoyalCity999(ox: number, oz: number, setLocal: LocalSetter) {
  const setWorld = (wx: number, y: number, wz: number, id: number) => {
    const lx = wx - ox;
    const lz = wz - oz;
    if (lx >= 0 && lx < 16 && lz >= 0 && lz < 16 && y >= 0 && y < 64) {
      setLocal(lx, y, lz, id);
    }
  };
  const overlaps = (x0: number, z0: number, x1: number, z1: number) =>
    x1 >= ox && x0 < ox + 16 && z1 >= oz && z0 < oz + 16;

  // Streets & plaza
  for (let lz = 0; lz < 16; lz++) {
    for (let lx = 0; lx < 16; lx++) {
      const wx = ox + lx;
      const wz = oz + lz;
      const mainRoad = wx >= -2 && wx <= 2 && wz >= -14 && wz <= 36;
      const crossRoad = wz >= 4 && wz <= 8 && wx >= -38 && wx <= 38;
      const plaza = wx >= -5 && wx <= 5 && wz >= 1 && wz <= 11;
      if (mainRoad || crossRoad || plaza) {
        const block =
          wx === 0 && wz >= -14 && wz <= 3
            ? BlockId.CRIMSON_BANNER
            : (mainRoad && (wx === -2 || wx === 2)) || (crossRoad && (wz === 4 || wz === 8))
            ? BlockId.CASTLE_BRICK
            : BlockId.STONE;
        setLocal(lx, 24, lz, block);
      }
      if ((wx === -3 || wx === 3) && wz >= -12 && wz <= 32 && Math.abs(wz) % 8 === 4 && !crossRoad) {
        setLocal(lx, 25, lz, BlockId.WOOD);
        setLocal(lx, 26, lz, BlockId.WOOD);
        setLocal(lx, 27, lz, BlockId.LANTERN);
      }
      if ((wz === 3 || wz === 9) && wx >= -34 && wx <= 34 && Math.abs(wx) % 10 === 8 && !plaza) {
        setLocal(lx, 25, lz, BlockId.WOOD);
        setLocal(lx, 26, lz, BlockId.WOOD);
        setLocal(lx, 27, lz, BlockId.LANTERN);
      }
    }
  }

  // Houses
  for (const h of VILLAGE_HOUSES) {
    const x1 = h.x0 + h.w - 1;
    const z1 = h.z0 + h.d - 1;
    if (!overlaps(h.x0 - 1, h.z0 - 1, x1 + 1, z1 + 1)) continue;
    const cx = h.x0 + Math.floor(h.w / 2);
    const cz = h.z0 + Math.floor(h.d / 2);
    const wallMat = h.style === 'stone' || h.style === 'forge' ? BlockId.CASTLE_BRICK : BlockId.PLANK;
    const roofMat =
      h.style === 'manor'
        ? BlockId.CRIMSON_BANNER
        : h.style === 'stone' || h.style === 'forge'
        ? BlockId.BASALT
        : BlockId.WOOD;

    for (let wx = h.x0; wx <= x1; wx++) {
      for (let wz = h.z0; wz <= z1; wz++) {
        if (wx < ox || wx >= ox + 16 || wz < oz || wz >= oz + 16) continue;
        const edgeX = wx === h.x0 || wx === x1;
        const edgeZ = wz === h.z0 || wz === z1;
        const corner = edgeX && edgeZ;
        const wall = edgeX || edgeZ;

        setWorld(wx, 24, wz, h.style === 'stone' || h.style === 'forge' ? BlockId.CASTLE_BRICK : BlockId.PLANK);
        for (let y = 25; y <= 24 + h.wallH + 5; y++) setWorld(wx, y, wz, BlockId.AIR);

        const isDoor =
          (h.doorSide === 'S' && wz === z1 && Math.abs(wx - cx) <= 0) ||
          (h.doorSide === 'N' && wz === h.z0 && Math.abs(wx - cx) <= 0) ||
          (h.doorSide === 'E' && wx === x1 && Math.abs(wz - cz) <= 0) ||
          (h.doorSide === 'W' && wx === h.x0 && Math.abs(wz - cz) <= 0);
        const isWin = !corner && !isDoor && ((edgeZ && Math.abs(wx - cx) === 2) || (edgeX && Math.abs(wz - cz) === 2));

        if (wall) {
          for (let dy = 1; dy <= h.wallH; dy++) {
            if (isDoor && dy <= 2) continue;
            if (isWin && (dy === 2 || (h.wallH >= 5 && dy === 4))) {
              setWorld(wx, 24 + dy, wz, BlockId.GLASS);
            } else if (corner) {
              setWorld(wx, 24 + dy, wz, h.style === 'stone' ? BlockId.CASTLE_BRICK : BlockId.WOOD);
            } else {
              setWorld(wx, 24 + dy, wz, wallMat);
            }
          }
        }

        if (wx === cx && wz === cz) setWorld(wx, 24 + h.wallH, wz, BlockId.LANTERN);
        if (h.style === 'forge' && wx === h.x0 + 1 && wz === h.z0 + 1) {
          setWorld(wx, 25, wz, BlockId.MAGMA);
          setWorld(wx, 26, wz, BlockId.OBSIDIAN);
        }

        const tiers = Math.min(3, Math.ceil(Math.min(h.w, h.d) / 2));
        for (let t = 0; t < tiers; t++) {
          if (wx >= h.x0 + t && wx <= x1 - t && wz >= h.z0 + t && wz <= z1 - t) {
            setWorld(wx, 24 + h.wallH + 1 + t, wz, t === tiers - 1 && h.style === 'manor' ? BlockId.GOLD_BLOCK : roofMat);
          }
        }
      }
    }
  }

  // Castle Crimsonkeep
  if (overlaps(-23, -49, 23, -13)) {
    for (let wx = -22; wx <= 22; wx++) {
      for (let wz = -48; wz <= -14; wz++) {
        if (wx < ox || wx >= ox + 16 || wz < oz || wz >= oz + 16) continue;
        setWorld(
          wx,
          24,
          wz,
          Math.abs(wx) <= 1 && wz >= -37 && wz <= -14 ? BlockId.CRIMSON_BANNER : BlockId.CASTLE_BRICK
        );
        for (let y = 25; y <= 50; y++) setWorld(wx, y, wz, BlockId.AIR);

        const outerWall = wx <= -21 || wx >= 21 || wz <= -47 || wz >= -15;
        const gateOpen = wz >= -15 && Math.abs(wx) <= 2;
        if (outerWall) {
          for (let dy = 1; dy <= 10; dy++) {
            if (gateOpen && dy <= 6) continue;
            setWorld(wx, 24 + dy, wz, gateOpen && dy === 7 ? BlockId.GOLD_BLOCK : BlockId.CASTLE_BRICK);
          }
          if ((wx === -22 || wx === 22 || wz === -48 || wz === -14) && !gateOpen && (wx + wz) % 2 === 0) {
            setWorld(wx, 35, wz, BlockId.CASTLE_BRICK);
          }
          if (wz === -14 && (wx === -8 || wx === 8 || wx === -13 || wx === 13)) {
            for (let dy = 4; dy <= 8; dy++) setWorld(wx, 24 + dy, wz, BlockId.CRIMSON_BANNER);
          }
        }

        const tNW = wx <= -16 && wz <= -42;
        const tNE = wx >= 16 && wz <= -42;
        const tSW = wx <= -16 && wz >= -20;
        const tSE = wx >= 16 && wz >= -20;
        if (tNW || tNE || tSW || tSE) {
          const tx0 = tNW || tSW ? -22 : 16;
          const tz0 = tNW || tNE ? -48 : -20;
          const tWall = wx === tx0 || wx === tx0 + 6 || wz === tz0 || wz === tz0 + 6;
          const tCenter = wx === tx0 + 3 && wz === tz0 + 3;
          if (tWall) {
            for (let dy = 1; dy <= 18; dy++) {
              const trim = dy === 14 || dy === 18;
              setWorld(wx, 24 + dy, wz, trim ? BlockId.GOLD_BLOCK : BlockId.CASTLE_BRICK);
            }
            if ((wx + wz) % 2 === 0) setWorld(wx, 43, wz, BlockId.CASTLE_BRICK);
          } else {
            setWorld(wx, 41, wz, BlockId.CASTLE_BRICK);
            if (tCenter) {
              setWorld(wx, 42, wz, BlockId.LANTERN);
              setWorld(wx, 43, wz, BlockId.AETHER_CRYSTAL);
            }
          }
        }

        if (Math.abs(wx) >= 3 && Math.abs(wx) <= 6 && wz >= -17 && wz <= -13) {
          if (Math.abs(wx) === 3 || Math.abs(wx) === 6 || wz === -17 || wz === -13) {
            for (let dy = 1; dy <= 14; dy++) {
              setWorld(wx, 24 + dy, wz, dy === 14 ? BlockId.GOLD_BLOCK : BlockId.CASTLE_BRICK);
            }
            if (isGateBattlement(wx, wz)) setWorld(wx, 39, wz, BlockId.CASTLE_BRICK);
          } else {
            setWorld(wx, 38, wz, BlockId.CASTLE_BRICK);
            if (Math.abs(wx) === 4 && wz === -15) setWorld(wx, 39, wz, BlockId.LANTERN);
          }
        }

        if ((Math.abs(wx) === 7 || Math.abs(wx) === 13) && (wz === -21 || wz === -26)) {
          setWorld(wx, 25, wz, BlockId.CASTLE_BRICK);
          setWorld(wx, 26, wz, BlockId.LANTERN);
        }

        if (wx >= -10 && wx <= 10 && wz >= -43 && wz <= -28) {
          const keepSide = wx === -10 || wx === 10;
          const keepWall = keepSide || wz === -43 || wz === -28;
          const keepDoor = wz === -28 && Math.abs(wx) <= 2;
          if (keepWall) {
            for (let dy = 1; dy <= 13; dy++) {
              if (keepDoor && dy <= 6) continue;
              if (keepDoor && dy === 7) setWorld(wx, 24 + dy, wz, BlockId.GOLD_BLOCK);
              else if (keepSide && Math.abs(wz + 35) % 4 === 0 && dy >= 5 && dy <= 8) {
                setWorld(wx, 24 + dy, wz, BlockId.GLASS);
              } else {
                setWorld(wx, 24 + dy, wz, dy === 13 ? BlockId.GOLD_BLOCK : BlockId.CASTLE_BRICK);
              }
            }
            if ((wx + wz) % 2 === 0 && !keepDoor) setWorld(wx, 38, wz, BlockId.CASTLE_BRICK);
          } else {
            setWorld(
              wx,
              37,
              wz,
              Math.abs(wx) <= 3 && wz >= -39 && wz <= -32 ? BlockId.CRIMSON_BANNER : BlockId.CASTLE_BRICK
            );
            if (Math.abs(wx) <= 3 && wz >= -39 && wz <= -33) {
              if (Math.abs(wx) === 3 || wz === -39 || wz === -33) {
                for (let dy = 14; dy <= 21; dy++) {
                  setWorld(wx, 24 + dy, wz, dy === 21 ? BlockId.GOLD_BLOCK : BlockId.CASTLE_BRICK);
                }
              } else if (Math.abs(wx) <= 1 && wz >= -37 && wz <= -35) {
                setWorld(wx, 45, wz, BlockId.GOLD_BLOCK);
                if (wx === 0 && wz === -36) {
                  setWorld(wx, 46, wz, BlockId.GOLD_BLOCK);
                  setWorld(wx, 47, wz, BlockId.AETHER_CRYSTAL);
                }
              }
            }
          }

          if (Math.abs(wx) <= 3 && wz >= -41 && wz <= -37) {
            setWorld(
              wx,
              25,
              wz,
              Math.abs(wx) <= 1 && wz <= -38 ? BlockId.GOLD_BLOCK : BlockId.CRIMSON_BANNER
            );
          }
          if (wx === 0 && wz === -40) {
            setWorld(wx, 26, wz, BlockId.GOLD_BLOCK);
            setWorld(wx, 27, wz, BlockId.GOLD_BLOCK);
            setWorld(wx, 28, wz, BlockId.AETHER_CRYSTAL);
          }
          if (Math.abs(wx) === 2 && wz === -39) {
            setWorld(wx, 26, wz, BlockId.LANTERN);
          }
        }
      }
    }
  }
}

const SKY_HOUSES: HouseSpec[] = [
  { x0: 8, z0: -17, w: 8, d: 7, wallH: 4, doorSide: 'S', style: 'forge' },
  { x0: -9, z0: -15, w: 6, d: 6, wallH: 4, doorSide: 'S', style: 'cottage' },
  { x0: -18, z0: 7, w: 9, d: 7, wallH: 6, doorSide: 'E', style: 'tavern' },
  { x0: -16, z0: 16, w: 7, d: 6, wallH: 4, doorSide: 'N', style: 'cottage' },
];

function isSkyCityZone888(wx: number, wz: number): boolean {
  return wx >= -54 && wx <= 56 && wz >= -62 && wz <= 52;
}

function paintSkyIslandColumn(
  wx: number,
  wz: number,
  topY: number,
  depth: number,
  topBlock: number,
  subBlock: number,
  setWorld: (wx: number, y: number, wz: number, id: number) => void
) {
  const bottomY = Math.max(4, topY - depth);
  for (let y = bottomY; y <= topY; y++) {
    let b: number = BlockId.STONE;
    if (y === topY) b = topBlock;
    else if (y === topY - 1) b = topBlock === BlockId.GRASS ? BlockId.DIRT : subBlock;
    else if (y === bottomY) b = BlockId.CLOUD_BLOCK;
    setWorld(wx, y, wz, b);
  }
}

function buildSkyWorld888(ox: number, oz: number, _seed: number, setLocal: LocalSetter) {
  const setWorld = (wx: number, y: number, wz: number, id: number) => {
    const lx = wx - ox;
    const lz = wz - oz;
    if (lx >= 0 && lx < 16 && lz >= 0 && lz < 16 && y >= 0 && y < 64) {
      setLocal(lx, y, lz, id);
    }
  };
  const overlaps = (x0: number, z0: number, x1: number, z1: number) =>
    x1 >= ox && x0 < ox + 16 && z1 >= oz && z0 < oz + 16;

  // Cloud floor + island crusts
  for (let lz = 0; lz < 16; lz++) {
    for (let lx = 0; lx < 16; lx++) {
      const wx = ox + lx;
      const wz = oz + lz;
      setLocal(lx, 8, lz, BlockId.CLOUD_BLOCK);
      if ((wx + wz) % 9 === 0 && Math.abs(wx) < 64 && Math.abs(wz) < 64) {
        setLocal(lx, 9, lz, BlockId.CLOUD_BLOCK);
      }

      const dPlaza = Math.hypot(wx, wz);
      if (dPlaza < 24.5) {
        const depth = Math.max(4, Math.round(12 - dPlaza * 0.36));
        const inFountain = dPlaza < 5.5;
        const rim = Math.abs(wx) <= 2 || Math.abs(wz) <= 2;
        const topBlock =
          dPlaza > 21.5
            ? BlockId.GOLD_BLOCK
            : inFountain
            ? BlockId.SKY_MARBLE
            : rim
            ? BlockId.SKY_MARBLE
            : (wx + wz) % 2 === 0
            ? BlockId.GRASS
            : BlockId.SKY_MARBLE;
        paintSkyIslandColumn(wx, wz, 30, depth, topBlock, BlockId.SKY_MARBLE, setWorld);
        if (dPlaza < 4.5 && dPlaza > 1.8) {
          setWorld(wx, 31, wz, dPlaza > 3.5 ? BlockId.SKY_MARBLE : BlockId.WATER);
        }
        if (Math.abs(wx) <= 1 && Math.abs(wz) <= 1) {
          setWorld(wx, 31, wz, BlockId.GOLD_BLOCK);
        }
        if (wx === 0 && wz === 0) {
          setWorld(0, 32, 0, BlockId.WIND_BEACON);
          setWorld(0, 33, 0, BlockId.AETHER_CRYSTAL);
        }
        if (dPlaza > 19.5 && dPlaza < 22 && Math.abs(wx) % 8 === 0 && Math.abs(wz) % 8 === 0) {
          setWorld(wx, 31, wz, BlockId.SKY_MARBLE);
          setWorld(wx, 32, wz, BlockId.LANTERN);
        }
      }

      const dNorth = Math.hypot(wx, wz + 47);
      if (dNorth < 13.5) {
        const depth = Math.max(4, Math.round(11 - dNorth * 0.45));
        const topBlock =
          Math.abs(wx) === 12 || Math.abs(wz + 47) === 12
            ? BlockId.GOLD_BLOCK
            : dNorth < 4.5
            ? BlockId.GOLD_BLOCK
            : BlockId.SKY_MARBLE;
        paintSkyIslandColumn(wx, wz, 34, depth, topBlock, BlockId.STONE, setWorld);
      }

      const dEast = Math.hypot((wx - 37) * 0.9, wz * 1.15);
      if (dEast < 9.5) {
        const depth = Math.max(4, Math.round(9 - dEast * 0.5));
        paintSkyIslandColumn(
          wx,
          wz,
          31,
          depth,
          dEast < 4 ? BlockId.PLANK : BlockId.GRASS,
          BlockId.DIRT,
          setWorld
        );
      }

      const dWest = Math.hypot(wx + 39, wz);
      if (dWest < 9.5) {
        const depth = Math.max(4, Math.round(9 - dWest * 0.5));
        paintSkyIslandColumn(
          wx,
          wz,
          31,
          depth,
          dWest < 3.5 ? BlockId.BOUNCE_CAP : BlockId.MYCELIUM,
          BlockId.STONE,
          setWorld
        );
      }

      const dSouth = Math.hypot(wx, wz - 38);
      if (dSouth < 8.5) {
        const depth = Math.max(4, Math.round(8 - dSouth * 0.5));
        paintSkyIslandColumn(
          wx,
          wz,
          31,
          depth,
          dSouth < 3.2 ? BlockId.RAINBOW_GLASS : BlockId.SKY_MARBLE,
          BlockId.STONE,
          setWorld
        );
      }
    }
  }

  // Sky houses
  for (const h of SKY_HOUSES) {
    const x1 = h.x0 + h.w - 1;
    const z1 = h.z0 + h.d - 1;
    if (!overlaps(h.x0 - 1, h.z0 - 1, x1 + 1, z1 + 1)) continue;
    const cx = h.x0 + Math.floor(h.w / 2);
    const cz = h.z0 + Math.floor(h.d / 2);
    const wallMat = h.style === 'forge' ? BlockId.STONE : BlockId.SKY_MARBLE;
    const roofMat =
      h.style === 'tavern'
        ? BlockId.CRIMSON_BANNER
        : h.style === 'forge'
        ? BlockId.GOLD_BLOCK
        : BlockId.CLOUD_BLOCK;

    for (let wx = h.x0; wx <= x1; wx++) {
      for (let wz = h.z0; wz <= z1; wz++) {
        if (wx < ox || wx >= ox + 16 || wz < oz || wz >= oz + 16) continue;
        const edgeX = wx === h.x0 || wx === x1;
        const edgeZ = wz === h.z0 || wz === z1;
        const corner = edgeX && edgeZ;
        const wall = edgeX || edgeZ;

        setWorld(wx, 30, wz, BlockId.PLANK);
        for (let y = 31; y <= 30 + h.wallH + 5; y++) setWorld(wx, y, wz, BlockId.AIR);

        const isDoor =
          (h.doorSide === 'S' && wz === z1 && Math.abs(wx - cx) <= 0) ||
          (h.doorSide === 'N' && wz === h.z0 && Math.abs(wx - cx) <= 0) ||
          (h.doorSide === 'E' && wx === x1 && Math.abs(wz - cz) <= 0) ||
          (h.doorSide === 'W' && wx === h.x0 && Math.abs(wz - cz) <= 0);
        const isWin = !corner && !isDoor && ((edgeZ && Math.abs(wx - cx) === 2) || (edgeX && Math.abs(wz - cz) === 2));

        if (wall) {
          for (let dy = 1; dy <= h.wallH; dy++) {
            if (isDoor && dy <= 2) continue;
            if (isWin && (dy === 2 || (h.wallH >= 5 && dy === 4))) {
              setWorld(wx, 30 + dy, wz, BlockId.RAINBOW_GLASS);
            } else if (corner) {
              setWorld(wx, 30 + dy, wz, BlockId.WOOD);
            } else {
              setWorld(wx, 30 + dy, wz, wallMat);
            }
          }
        }
        if (wx === cx && wz === cz) setWorld(wx, 30 + h.wallH, wz, BlockId.LANTERN);
        if (h.style === 'forge' && wx === h.x0 + 1 && wz === h.z0 + 1) {
          setWorld(wx, 31, wz, BlockId.MAGMA);
          setWorld(wx, 32, wz, BlockId.WIND_BEACON);
        }

        const tiers = Math.min(3, Math.ceil(Math.min(h.w, h.d) / 2));
        for (let t = 0; t < tiers; t++) {
          if (wx >= h.x0 + t && wx <= x1 - t && wz >= h.z0 + t && wz <= z1 - t) {
            setWorld(wx, 30 + h.wallH + 1 + t, wz, t === tiers - 1 ? BlockId.GOLD_BLOCK : roofMat);
          }
        }
      }
    }
  }

  // Windmill
  if (overlaps(-20, -20, -10, -10)) {
    for (let wx = -18; wx <= -13; wx++) {
      for (let wz = -18; wz <= -13; wz++) {
        const edge = wx === -18 || wx === -13 || wz === -18 || wz === -13;
        const door = wz === -13 && (wx === -16 || wx === -15);
        setWorld(wx, 30, wz, BlockId.SKY_MARBLE);
        for (let y = 31; y <= 40; y++) {
          if (edge && (!door || y > 32)) {
            setWorld(wx, y, wz, y === 40 ? BlockId.GOLD_BLOCK : y % 4 === 0 ? BlockId.WOOD : BlockId.SKY_MARBLE);
          }
        }
        if (wx >= -17 && wx <= -14 && wz >= -17 && wz <= -14) {
          setWorld(wx, 41, wz, BlockId.CRIMSON_BANNER);
        }
      }
    }
    setWorld(-15, 38, -12, BlockId.GOLD_BLOCK);
    for (let k = 1; k <= 4; k++) {
      setWorld(-15 + k, 38, -12, BlockId.WOOD);
      setWorld(-15 + k, 37, -12, BlockId.CLOUD_BLOCK);
      setWorld(-15 - k, 38, -12, BlockId.WOOD);
      setWorld(-15 - k, 39, -12, BlockId.CLOUD_BLOCK);
      setWorld(-15, 38 + k, -12, BlockId.WOOD);
      setWorld(-14, 38 + k, -12, BlockId.CLOUD_BLOCK);
      setWorld(-15, 38 - k, -12, BlockId.WOOD);
      setWorld(-16, 38 - k, -12, BlockId.CLOUD_BLOCK);
    }
  }

  // Botanical greenhouse
  if (overlaps(8, -9, 15, -4)) {
    for (let wx = 8; wx <= 15; wx++) {
      for (let wz = -9; wz <= -4; wz++) {
        const wall = wx === 8 || wx === 15 || wz === -9 || wz === -4;
        const door = wz === -4 && (wx === 11 || wx === 12);
        setWorld(wx, 30, wz, wall ? BlockId.SKY_MARBLE : wx === 12 && wz === -7 ? BlockId.WATER : BlockId.GRASS);
        for (let dy = 1; dy <= 5; dy++) {
          if (door && dy <= 2) continue;
          if (wall && dy <= 3) setWorld(wx, 30 + dy, wz, dy === 1 ? BlockId.SKY_MARBLE : BlockId.RAINBOW_GLASS);
          else if (dy === 4 && !wall) setWorld(wx, 30 + dy, wz, BlockId.RAINBOW_GLASS);
        }
      }
    }
    setWorld(10, 31, -7, BlockId.WOOD);
    setWorld(10, 32, -7, BlockId.WOOD);
    setWorld(10, 33, -7, BlockId.LEAVES);
    setWorld(13, 31, -6, BlockId.GLOW_SPORE);
  }

  // Market stalls
  const makeStall = (x0: number, z0: number) => {
    if (!overlaps(x0, z0, x0 + 4, z0 + 3)) return;
    for (let wx = x0; wx <= x0 + 4; wx++) {
      for (let wz = z0; wz <= z0 + 3; wz++) {
        if ((wx === x0 || wx === x0 + 4) && (wz === z0 || wz === z0 + 3)) {
          setWorld(wx, 31, wz, BlockId.WOOD);
          setWorld(wx, 32, wz, BlockId.WOOD);
        }
        if (wz === z0 + 1 && wx > x0 && wx < x0 + 4) setWorld(wx, 31, wz, BlockId.PLANK);
        setWorld(wx, 33, wz, (wx + wz) % 2 === 0 ? BlockId.CRIMSON_BANNER : BlockId.CLOUD_BLOCK);
      }
    }
    setWorld(x0 + 2, 32, z0 + 1, BlockId.LANTERN);
  };
  makeStall(7, 6);
  makeStall(-11, 6);

  // North bridge stairs
  if (overlaps(-3, -34, 3, -22)) {
    for (let wz = -34; wz <= -22; wz++) {
      const t = (-22 - wz) / 12;
      const y = Math.round(30 + t * 4);
      for (let wx = -2; wx <= 2; wx++) {
        const rail = Math.abs(wx) === 2;
        setWorld(wx, y, wz, rail ? BlockId.GOLD_BLOCK : BlockId.SKY_MARBLE);
        if (rail && Math.abs(wz) % 4 === 0) setWorld(wx, y + 1, wz, BlockId.LANTERN);
      }
    }
  }

  // East bridge
  if (overlaps(22, -2, 30, 2)) {
    for (let wx = 22; wx <= 30; wx++) {
      const y = wx >= 26 ? 31 : 30;
      for (let wz = -2; wz <= 2; wz++) {
        setWorld(wx, y, wz, Math.abs(wz) === 2 ? BlockId.WOOD : BlockId.PLANK);
        if (wx === 26 && wz === 0) setWorld(wx, y, wz, BlockId.WIND_BEACON);
      }
    }
  }

  // West stepping clouds
  if (overlaps(-30, -2, -22, 2)) {
    for (const cx of [-23, -26, -29]) {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          setWorld(
            cx + dx,
            30 + (cx === -29 ? 1 : 0),
            dz,
            dx === 0 && dz === 0 && cx === -26 ? BlockId.WIND_BEACON : BlockId.CLOUD_BLOCK
          );
        }
      }
    }
  }

  // South bridge
  if (overlaps(-2, 22, 2, 31)) {
    for (let wz = 22; wz <= 31; wz++) {
      const y = wz >= 27 ? 31 : 30;
      for (let wx = -2; wx <= 2; wx++) {
        setWorld(wx, y, wz, Math.abs(wx) === 2 ? BlockId.SKY_MARBLE : BlockId.RAINBOW_GLASS);
      }
    }
  }

  // North Citadel Temple
  if (overlaps(-12, -58, 12, -36)) {
    for (let wx = -10; wx <= 10; wx++) {
      for (let wz = -56; wz <= -38; wz++) {
        const edge = Math.abs(wx) === 10 || Math.abs(wz + 47) === 9;
        if (wx === 0 && wz === -47) setWorld(wx, 34, wz, BlockId.GOLD_BLOCK);
        else if (Math.abs(wx) <= 2 && Math.abs(wz + 47) <= 2) setWorld(wx, 34, wz, BlockId.AETHER_CRYSTAL);

        if ((Math.abs(wx) === 8 || Math.abs(wx) === 4) && (wz === -54 || wz === -40)) {
          for (let dy = 1; dy <= 7; dy++) {
            setWorld(wx, 34 + dy, wz, dy === 7 ? BlockId.GOLD_BLOCK : BlockId.SKY_MARBLE);
          }
          setWorld(wx, 42, wz, BlockId.LANTERN);
        }
        if (edge && Math.abs(wx) === 10 && (wz === -56 || wz === -38)) {
          setWorld(wx, 34, wz, BlockId.WIND_BEACON);
          setWorld(wx, 35, wz, BlockId.AETHER_CRYSTAL);
        }
      }
    }
    for (let wx = -6; wx <= 6; wx++) {
      for (let wz = -53; wz <= -41; wz++) {
        if (Math.abs(wx) === 6 || wz === -53 || wz === -41) {
          setWorld(wx, 43, wz, BlockId.GOLD_BLOCK);
        } else if (Math.abs(wx) <= 3 && Math.abs(wz + 47) <= 3) {
          setWorld(wx, 43, wz, BlockId.RAINBOW_GLASS);
        }
      }
    }
  }

  // East Sky Galleon
  if (overlaps(34, -6, 47, 6)) {
    for (let wx = 35; wx <= 45; wx++) {
      const halfW = wx <= 36 || wx >= 44 ? 1 : 2;
      for (let wz = -halfW; wz <= halfW; wz++) {
        setWorld(wx, 32, wz, BlockId.WOOD);
        if (Math.abs(wz) === halfW || wx === 35 || wx === 45) {
          setWorld(wx, 33, wz, BlockId.PLANK);
          if (wx === 45 && wz === 0) {
            setWorld(wx, 34, wz, BlockId.GOLD_BLOCK);
            setWorld(wx, 35, wz, BlockId.LANTERN);
          }
        } else {
          setWorld(wx, 32, wz, BlockId.PLANK);
        }
      }
    }
    setWorld(34, 33, -1, BlockId.WIND_BEACON);
    setWorld(34, 33, 1, BlockId.WIND_BEACON);
    for (let dy = 1; dy <= 6; dy++) setWorld(40, 32 + dy, 0, BlockId.WOOD);
    for (let wx = 36; wx <= 44; wx++) {
      for (let wz = -2; wz <= 2; wz++) {
        for (let y = 39; y <= 42; y++) {
          if (wx === 36 || wx === 44 || Math.abs(wz) === 2 || y === 39 || y === 42) {
            setWorld(wx, y, wz, (wx + y) % 2 === 0 ? BlockId.CRIMSON_BANNER : BlockId.CLOUD_BLOCK);
          }
        }
      }
    }
  }

  // West Bounce Mushroom Park
  if (overlaps(-46, -7, -32, 7)) {
    const makeShroom = (sx: number, sz: number, stemH: number) => {
      for (let dy = 1; dy <= stemH; dy++) setWorld(sx, 31 + dy, sz, BlockId.GLOW_MUSHROOM_STEM);
      for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
          if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
          setWorld(
            sx + dx,
            31 + stemH + 1,
            sz + dz,
            Math.abs(dx) <= 1 && Math.abs(dz) <= 1 ? BlockId.BOUNCE_CAP : BlockId.GLOW_SPORE
          );
        }
      }
    };
    makeShroom(-38, -4, 3);
    makeShroom(-43, 3, 5);
    for (let dy = 1; dy <= 7; dy++) {
      setWorld(-35, 31 + dy, 4, dy >= 5 ? BlockId.AETHER_CRYSTAL : BlockId.WIND_BEACON);
    }
  }

  // South Observatory Dome
  if (overlaps(-5, 34, 5, 44)) {
    for (let wx = -3; wx <= 3; wx++) {
      for (let wz = 36; wz <= 42; wz++) {
        const d = Math.hypot(wx, wz - 39);
        if (d <= 3.3 && d >= 2.2) {
          for (let dy = 1; dy <= 5; dy++) {
            setWorld(wx, 31 + dy, wz, dy >= 4 ? BlockId.RAINBOW_GLASS : BlockId.SKY_MARBLE);
          }
        } else if (d < 2.2) {
          setWorld(wx, 37, wz, BlockId.RAINBOW_GLASS);
        }
      }
    }
    setWorld(0, 32, 39, BlockId.GOLD_BLOCK);
    setWorld(0, 33, 39, BlockId.OBSIDIAN);
    setWorld(0, 34, 40, BlockId.OBSIDIAN);
    setWorld(0, 35, 41, BlockId.AETHER_CRYSTAL);
  }
}

function isRobotCityZone666(wx: number, wz: number): boolean {
  return wx >= -44 && wx <= 44 && wz >= -56 && wz <= 40;
}

const CYBER_BUILDINGS: HouseSpec[] = [
  { x0: -17, z0: -12, w: 9, d: 8, wallH: 6, doorSide: 'S', style: 'factory' },
  { x0: -30, z0: -12, w: 9, d: 8, wallH: 5, doorSide: 'S', style: 'lab' },
  { x0: 8, z0: -12, w: 9, d: 8, wallH: 6, doorSide: 'S', style: 'depot' },
  { x0: 21, z0: -12, w: 9, d: 8, wallH: 5, doorSide: 'S', style: 'factory' },
  { x0: -17, z0: 11, w: 8, d: 7, wallH: 5, doorSide: 'N', style: 'habitat' },
  { x0: -29, z0: 11, w: 8, d: 7, wallH: 5, doorSide: 'N', style: 'lab' },
  { x0: 21, z0: 11, w: 9, d: 7, wallH: 5, doorSide: 'N', style: 'habitat' },
  { x0: -14, z0: 22, w: 8, d: 7, wallH: 5, doorSide: 'E', style: 'depot' },
];

function buildVolcanoOutpost777(ox: number, oz: number, setLocal: LocalSetter) {
  const setWorld = (wx: number, y: number, wz: number, id: number) => {
    const lx = wx - ox;
    const lz = wz - oz;
    if (lx >= 0 && lx < 16 && lz >= 0 && lz < 16 && y >= 0 && y < 64) {
      setLocal(lx, y, lz, id);
    }
  };
  const overlaps = (x0: number, z0: number, x1: number, z1: number) =>
    x1 >= ox && x0 < ox + 16 && z1 >= oz && z0 < oz + 16;

  for (const b of [
    { x0: -11, z0: 5, w: 6, d: 6 },
    { x0: -11, z0: 13, w: 6, d: 6 },
  ]) {
    const x1 = b.x0 + b.w - 1;
    const z1 = b.z0 + b.d - 1;
    if (!overlaps(b.x0 - 1, b.z0 - 1, x1 + 1, z1 + 1)) continue;
    const cz = b.z0 + Math.floor(b.d / 2);
    for (let wx = b.x0; wx <= x1; wx++) {
      for (let wz = b.z0; wz <= z1; wz++) {
        const wall = wx === b.x0 || wx === x1 || wz === b.z0 || wz === z1;
        const door = wx === x1 && wz === cz;
        setWorld(wx, 23, wz, BlockId.CASTLE_BRICK);
        for (let y = 24; y <= 29; y++) setWorld(wx, y, wz, BlockId.AIR);
        if (wall) {
          for (let dy = 1; dy <= 4; dy++) {
            if (door && dy <= 2) continue;
            const win =
              !door &&
              dy === 2 &&
              ((wx === b.x0 && wz === cz) || ((wz === b.z0 || wz === z1) && wx === b.x0 + 2));
            setWorld(wx, 23 + dy, wz, win ? BlockId.GLASS : BlockId.OBSIDIAN);
          }
        }
        if (wx === b.x0 + 2 && wz === cz) setWorld(wx, 27, wz, BlockId.LANTERN);
        for (let t = 0; t < 2; t++) {
          if (wx >= b.x0 + t && wx <= x1 - t && wz >= b.z0 + t && wz <= z1 - t) {
            setWorld(wx, 28 + t, wz, t === 1 ? BlockId.GOLD_BLOCK : BlockId.BASALT);
          }
        }
      }
    }
  }
  for (const [lx, lz] of [
    [-4, 8],
    [-4, 16],
    [6, 16],
  ]) {
    setWorld(lx, 24, lz, BlockId.OBSIDIAN);
    setWorld(lx, 25, lz, BlockId.LANTERN);
  }
}

function buildRobotCity666(ox: number, oz: number, setLocal: LocalSetter) {
  const setWorld = (wx: number, y: number, wz: number, id: number) => {
    const lx = wx - ox;
    const lz = wz - oz;
    if (lx >= 0 && lx < 16 && lz >= 0 && lz < 16 && y >= 0 && y < 64) {
      setLocal(lx, y, lz, id);
    }
  };
  const overlaps = (x0: number, z0: number, x1: number, z1: number) =>
    x1 >= ox && x0 < ox + 16 && z1 >= oz && z0 < oz + 16;

  // Metallic Cyber Streets & Plaza
  for (let lz = 0; lz < 16; lz++) {
    for (let lx = 0; lx < 16; lx++) {
      const wx = ox + lx;
      const wz = oz + lz;
      const mainRoad = wx >= -3 && wx <= 3 && wz >= -16 && wz <= 36;
      const crossRoad = wz >= 4 && wz <= 9 && wx >= -38 && wx <= 38;
      const plaza = wx >= -6 && wx <= 6 && wz >= 0 && wz <= 11;
      if (mainRoad || crossRoad || plaza) {
        const block =
          (mainRoad && wx === 0 && wz <= 3) || (crossRoad && wz === 6 && Math.abs(wx) > 6)
            ? BlockId.CIRCUIT_CORE
            : (mainRoad && Math.abs(wx) === 3) || (crossRoad && (wz === 4 || wz === 9))
            ? BlockId.HAZARD_STRIPE
            : BlockId.STEEL_PLATE;
        setLocal(lx, 24, lz, block);
      }
      if ((wx === -4 || wx === 4) && wz >= -14 && wz <= 32 && Math.abs(wz) % 8 === 4 && !crossRoad) {
        setLocal(lx, 25, lz, BlockId.STEEL_PLATE);
        setLocal(lx, 26, lz, BlockId.CIRCUIT_CORE);
        setLocal(lx, 27, lz, BlockId.STEEL_PLATE);
        setLocal(lx, 28, lz, BlockId.LANTERN);
      }
      if ((wz === 3 || wz === 10) && wx >= -34 && wx <= 34 && Math.abs(wx) % 10 === 8 && !plaza) {
        setLocal(lx, 25, lz, BlockId.STEEL_PLATE);
        setLocal(lx, 26, lz, BlockId.CIRCUIT_CORE);
        setLocal(lx, 27, lz, BlockId.LANTERN);
      }
    }
  }

  // Plaza Core Reactor
  if (overlaps(-2, 0, 2, 4)) {
    setWorld(0, 25, 2, BlockId.HAZARD_STRIPE);
    setWorld(0, 26, 2, BlockId.CYBER_CORE);
    setWorld(0, 27, 2, BlockId.AETHER_CRYSTAL);
  }

  // Cyber Buildings
  for (const b of CYBER_BUILDINGS) {
    const x1 = b.x0 + b.w - 1;
    const z1 = b.z0 + b.d - 1;
    if (!overlaps(b.x0 - 1, b.z0 - 1, x1 + 1, z1 + 1)) continue;
    const cx = b.x0 + Math.floor(b.w / 2);
    const cz = b.z0 + Math.floor(b.d / 2);
    for (let wx = b.x0; wx <= x1; wx++) {
      for (let wz = b.z0; wz <= z1; wz++) {
        if (wx < ox || wx >= ox + 16 || wz < oz || wz >= oz + 16) continue;
        const edgeX = wx === b.x0 || wx === x1;
        const edgeZ = wz === b.z0 || wz === z1;
        const corner = edgeX && edgeZ;
        const wall = edgeX || edgeZ;

        setWorld(wx, 24, wz, b.style === 'depot' ? BlockId.CIRCUIT_CORE : BlockId.STEEL_PLATE);
        for (let y = 25; y <= 24 + b.wallH + 5; y++) setWorld(wx, y, wz, BlockId.AIR);

        const isDoor =
          (b.doorSide === 'S' && wz === z1 && Math.abs(wx - cx) <= 1) ||
          (b.doorSide === 'N' && wz === b.z0 && Math.abs(wx - cx) <= 1) ||
          (b.doorSide === 'E' && wx === x1 && Math.abs(wz - cz) <= 1) ||
          (b.doorSide === 'W' && wx === b.x0 && Math.abs(wz - cz) <= 1);
        const isWin = !corner && !isDoor && ((edgeZ && Math.abs(wx - cx) === 2) || (edgeX && Math.abs(wz - cz) === 2));

        if (wall) {
          for (let dy = 1; dy <= b.wallH; dy++) {
            if (isDoor && dy <= 3) continue;
            if (isWin && dy >= 2 && dy <= 3) {
              setWorld(wx, 24 + dy, wz, b.style === 'lab' ? BlockId.RAINBOW_GLASS : BlockId.GLASS);
            } else if (corner) {
              setWorld(
                wx,
                24 + dy,
                wz,
                dy === 1 || dy === b.wallH ? BlockId.HAZARD_STRIPE : BlockId.CIRCUIT_CORE
              );
            } else {
              setWorld(wx, 24 + dy, wz, dy === 1 ? BlockId.HAZARD_STRIPE : BlockId.STEEL_PLATE);
            }
          }
        }
        setWorld(wx, 24 + b.wallH + 1, wz, wall ? BlockId.HAZARD_STRIPE : BlockId.STEEL_PLATE);
        if (Math.abs(wx - cx) <= 1 && Math.abs(wz - cz) <= 1) {
          setWorld(
            wx,
            24 + b.wallH + 1,
            wz,
            b.style === 'factory' ? BlockId.CYBER_CORE : BlockId.CIRCUIT_CORE
          );
        }
        if (wx === cx && wz === cz) {
          setWorld(wx, 24 + b.wallH, wz, BlockId.LANTERN);
          for (let k = 2; k <= 4; k++) {
            setWorld(wx, 24 + b.wallH + k, wz, k === 4 ? BlockId.CYBER_CORE : BlockId.STEEL_PLATE);
          }
        }
      }
    }
  }

  // North Omega Mechatron Boss Arena
  if (overlaps(-25, -57, 25, -15)) {
    for (let wx = -24; wx <= 24; wx++) {
      for (let wz = -56; wz <= -16; wz++) {
        if (wx < ox || wx >= ox + 16 || wz < oz || wz >= oz + 16) continue;
        const gate = wz >= -17 && Math.abs(wx) <= 4;
        const wall = wx <= -23 || wx >= 23 || wz <= -55 || wz >= -17;
        const dCenter = Math.hypot(wx, wz + 38);
        setWorld(
          wx,
          24,
          wz,
          dCenter < 5.5
            ? BlockId.CIRCUIT_CORE
            : Math.abs(wx) <= 2 && wz >= -38
            ? BlockId.HAZARD_STRIPE
            : BlockId.STEEL_PLATE
        );
        for (let y = 25; y <= 48; y++) setWorld(wx, y, wz, BlockId.AIR);

        if (wall && !gate) {
          for (let dy = 1; dy <= 8; dy++) {
            setWorld(
              wx,
              24 + dy,
              wz,
              dy === 1 || dy === 8 ? BlockId.HAZARD_STRIPE : BlockId.STEEL_PLATE
            );
          }
          if ((wx + wz) % 4 === 0) setWorld(wx, 33, wz, BlockId.CIRCUIT_CORE);
        } else if (gate && wz === -16) {
          setWorld(wx, 32, wz, BlockId.HAZARD_STRIPE);
          setWorld(wx, 33, wz, BlockId.CYBER_CORE);
        }

        if ((wx <= -20 || wx >= 20) && (wz <= -52 || wz >= -20)) {
          const px = wx < 0 ? -22 : 22;
          const pz = wz < -36 ? -54 : -18;
          if (Math.abs(wx - px) <= 1 && Math.abs(wz - pz) <= 1) {
            for (let dy = 1; dy <= 16; dy++) {
              setWorld(wx, 24 + dy, wz, dy % 5 === 0 ? BlockId.CIRCUIT_CORE : BlockId.STEEL_PLATE);
            }
            if (wx === px && wz === pz) {
              setWorld(wx, 41, wz, BlockId.CYBER_CORE);
              setWorld(wx, 42, wz, BlockId.AETHER_CRYSTAL);
            }
          }
        }
        if (Math.abs(wx) === 12 && (wz === -28 || wz === -46)) {
          setWorld(wx, 25, wz, BlockId.CYBER_CORE);
        }
      }
    }
  }
}

function isMangoVillageZone555(wx: number, wz: number): boolean {
  return wx >= -44 && wx <= 44 && wz >= -54 && wz <= 40;
}

const MANGO_HOUSES: HouseSpec[] = [
  { x0: -16, z0: -11, w: 8, d: 7, wallH: 4, doorSide: 'S', style: 'nest' },
  { x0: -28, z0: -11, w: 8, d: 7, wallH: 4, doorSide: 'S', style: 'library' },
  { x0: 8, z0: -11, w: 8, d: 7, wallH: 4, doorSide: 'S', style: 'tnt_shop' },
  { x0: 20, z0: -11, w: 8, d: 7, wallH: 4, doorSide: 'S', style: 'nest' },
  { x0: -16, z0: 11, w: 8, d: 7, wallH: 4, doorSide: 'N', style: 'library' },
  { x0: -28, z0: 11, w: 7, d: 7, wallH: 4, doorSide: 'N', style: 'nest' },
  { x0: 19, z0: 11, w: 8, d: 7, wallH: 4, doorSide: 'N', style: 'honey' },
  { x0: -14, z0: 23, w: 8, d: 7, wallH: 4, doorSide: 'E', style: 'nest' },
];

function buildVillageMangoBirds555(ox: number, oz: number, setLocal: LocalSetter) {
  const setWorld = (wx: number, y: number, wz: number, id: number) => {
    const lx = wx - ox;
    const lz = wz - oz;
    if (lx >= 0 && lx < 16 && lz >= 0 && lz < 16 && y >= 0 && y < 64) {
      setLocal(lx, y, lz, id);
    }
  };
  const overlaps = (x0: number, z0: number, x1: number, z1: number) =>
    x1 >= ox && x0 < ox + 16 && z1 >= oz && z0 < oz + 16;

  // Village Mango Birds plaza & coral-plank roads
  for (let lz = 0; lz < 16; lz++) {
    for (let lx = 0; lx < 16; lx++) {
      const wx = ox + lx;
      const wz = oz + lz;
      const mainRoad = wx >= -2 && wx <= 2 && wz >= -22 && wz <= 36;
      const crossRoad = wz >= 4 && wz <= 8 && wx >= -38 && wx <= 38;
      const plaza = wx >= -6 && wx <= 6 && wz >= -2 && wz <= 10;
      if (mainRoad || crossRoad || plaza) {
        const block =
          plaza && Math.abs(wx) <= 2 && Math.abs(wz - 4) <= 2
            ? BlockId.HONEYCOMB
            : (mainRoad && Math.abs(wx) === 2) || (crossRoad && (wz === 4 || wz === 8))
            ? BlockId.CORAL_TERRACOTTA
            : BlockId.MANGO_PLANKS;
        setLocal(lx, 24, lz, block);
      }

      // Illuminated bamboo lanterns along paths
      if ((wx === -3 || wx === 3) && wz >= -18 && wz <= 32 && Math.abs(wz) % 8 === 4 && !crossRoad && !plaza) {
        setLocal(lx, 25, lz, BlockId.BAMBOO_BLOCK);
        setLocal(lx, 26, lz, BlockId.BAMBOO_BLOCK);
        setLocal(lx, 27, lz, BlockId.REDSTONE_LAMP);
      }
      if ((wz === 3 || wz === 9) && wx >= -34 && wx <= 34 && Math.abs(wx) % 10 === 8 && !plaza) {
        setLocal(lx, 25, lz, BlockId.TROPICAL_WOOD);
        setLocal(lx, 26, lz, BlockId.TROPICAL_WOOD);
        setLocal(lx, 27, lz, BlockId.JACK_O_LANTERN);
      }
    }
  }

  // Bird-friendly Cottages, Library & TNT Supply Workshop
  for (const h of MANGO_HOUSES) {
    const x1 = h.x0 + h.w - 1;
    const z1 = h.z0 + h.d - 1;
    if (!overlaps(h.x0 - 1, h.z0 - 1, x1 + 1, z1 + 1)) continue;
    const cx = h.x0 + Math.floor(h.w / 2);
    const cz = h.z0 + Math.floor(h.d / 2);
    const wallMat =
      h.style === 'library'
        ? BlockId.RED_BRICK
        : h.style === 'tnt_shop'
        ? BlockId.COBBLESTONE
        : BlockId.MANGO_PLANKS;
    const roofMat =
      h.style === 'tnt_shop'
        ? BlockId.RUBY_BLOCK
        : h.style === 'honey'
        ? BlockId.HONEYCOMB
        : h.style === 'library'
        ? BlockId.CORAL_TERRACOTTA
        : BlockId.MANGO_LEAVES;

    for (let wx = h.x0; wx <= x1; wx++) {
      for (let wz = h.z0; wz <= z1; wz++) {
        if (wx < ox || wx >= ox + 16 || wz < oz || wz >= oz + 16) continue;
        const edgeX = wx === h.x0 || wx === x1;
        const edgeZ = wz === h.z0 || wz === z1;
        const corner = edgeX && edgeZ;
        const wall = edgeX || edgeZ;

        setWorld(wx, 24, wz, BlockId.MANGO_PLANKS);
        for (let y = 25; y <= 24 + h.wallH + 5; y++) setWorld(wx, y, wz, BlockId.AIR);

        const isDoor =
          (h.doorSide === 'S' && wz === z1 && Math.abs(wx - cx) <= 0) ||
          (h.doorSide === 'N' && wz === h.z0 && Math.abs(wx - cx) <= 0) ||
          (h.doorSide === 'E' && wx === x1 && Math.abs(wz - cz) <= 0) ||
          (h.doorSide === 'W' && wx === h.x0 && Math.abs(wz - cz) <= 0);
        const isWin = !corner && !isDoor && ((edgeZ && Math.abs(wx - cx) === 2) || (edgeX && Math.abs(wz - cz) === 2));

        if (wall) {
          for (let dy = 1; dy <= h.wallH; dy++) {
            if (isDoor && dy <= 2) continue;
            if (isWin && dy === 2) {
              setWorld(wx, 24 + dy, wz, BlockId.GLASS);
            } else if (corner) {
              setWorld(wx, 24 + dy, wz, BlockId.TROPICAL_WOOD);
            } else if (h.style === 'library' && dy === 2 && !edgeX) {
              setWorld(wx, 24 + dy, wz, BlockId.BOOKSHELF);
            } else {
              setWorld(wx, 24 + dy, wz, wallMat);
            }
          }
        }

        // Cozy themed interior props
        if (wx === cx && wz === cz) setWorld(wx, 24 + h.wallH, wz, BlockId.REDSTONE_LAMP);
        if (h.style === 'tnt_shop' && wx === h.x0 + 2 && wz === h.z0 + 2) {
          setWorld(wx, 25, wz, BlockId.TNT);
          setWorld(wx + 1, 25, wz, BlockId.CRATE);
        }
        if (h.style === 'library' && wx === h.x0 + 1 && wz === h.z0 + 1) {
          setWorld(wx, 25, wz, BlockId.BOOKSHELF);
          setWorld(wx, 26, wz, BlockId.LANTERN);
        }
        if (h.style === 'honey' && wx === h.x0 + 2 && wz === h.z0 + 2) {
          setWorld(wx, 25, wz, BlockId.HONEYCOMB);
          setWorld(wx, 26, wz, BlockId.MANGO_BLOCK);
        }

        const tiers = Math.min(3, Math.ceil(Math.min(h.w, h.d) / 2));
        for (let t = 0; t < tiers; t++) {
          if (wx >= h.x0 + t && wx <= x1 - t && wz >= h.z0 + t && wz <= z1 - t) {
            setWorld(wx, 24 + h.wallH + 1 + t, wz, t === tiers - 1 ? BlockId.MANGO_BLOCK : roofMat);
          }
        }
      }
    }
  }

  // Giant Sacred Mango Monument Tree in Plaza West (-11..-5, -1..5)
  if (overlaps(-14, -4, -3, 7)) {
    const tx = -9;
    const tz = 3;
    for (let dy = 1; dy <= 7; dy++) {
      for (let dx = 0; dx <= 1; dx++) {
        for (let dz = 0; dz <= 1; dz++) {
          setWorld(tx + dx, 24 + dy, tz + dz, BlockId.TROPICAL_WOOD);
        }
      }
    }
    for (let dx = -3; dx <= 4; dx++) {
      for (let dz = -3; dz <= 4; dz++) {
        for (let dy = 7; dy <= 11; dy++) {
          const d = Math.hypot(dx - 0.5, dz - 0.5) + Math.max(0, dy - 9) * 0.9;
          if (d <= 3.7) {
            const isMango = (Math.abs(dx + dy + dz) % 7 === 0) && dy <= 9;
            setWorld(tx + dx, 24 + dy, tz + dz, isMango ? BlockId.MANGO_BLOCK : BlockId.MANGO_LEAVES);
          }
        }
      }
    }
    setWorld(tx, 25, tz + 2, BlockId.REDSTONE_LAMP);
    setWorld(tx + 1, 25, tz + 2, BlockId.HONEYCOMB);
  }

  // Bird Perch Watchtowers & Spring Slime Jump Pads
  const buildBirdPerch = (bx: number, bz: number) => {
    if (!overlaps(bx - 2, bz - 2, bx + 2, bz + 2)) return;
    setWorld(bx, 25, bz, BlockId.SLIME_BLOCK);
    for (const [px, pz] of [
      [bx - 2, bz - 2],
      [bx + 2, bz - 2],
      [bx - 2, bz + 2],
      [bx + 2, bz + 2],
    ]) {
      for (let dy = 1; dy <= 5; dy++) setWorld(px, 24 + dy, pz, BlockId.BAMBOO_BLOCK);
    }
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        setWorld(bx + dx, 30, bz + dz, Math.abs(dx) <= 1 && Math.abs(dz) <= 1 ? BlockId.HONEYCOMB : BlockId.MANGO_PLANKS);
      }
    }
    setWorld(bx, 31, bz, BlockId.MANGO_BLOCK);
    setWorld(bx, 32, bz, BlockId.REDSTONE_LAMP);
  };
  buildBirdPerch(-22, 0);
  buildBirdPerch(22, 0);

  // Tropical Fruit, Melon & TNT Showcase Yard (x: 10..20, z: 22..30)
  if (overlaps(10, 21, 22, 31)) {
    for (let wx = 11; wx <= 20; wx++) {
      for (let wz = 22; wz <= 29; wz++) {
        const border = wx === 11 || wx === 20 || wz === 22 || wz === 29;
        setWorld(wx, 24, wz, border ? BlockId.MOSSY_STONE : BlockId.COBBLESTONE);
      }
    }
    // Stacked TNT crates & Gems for crafting/testing blasts
    setWorld(13, 25, 24, BlockId.TNT);
    setWorld(14, 25, 24, BlockId.TNT);
    setWorld(13, 26, 24, BlockId.TNT);
    setWorld(16, 25, 24, BlockId.CRATE);
    setWorld(17, 25, 24, BlockId.NEON_PANEL);
    setWorld(18, 25, 24, BlockId.REDSTONE_LAMP);
    // Melon & Mango patch
    setWorld(13, 25, 27, BlockId.MELON_BLOCK);
    setWorld(15, 25, 27, BlockId.MELON_BLOCK);
    setWorld(17, 25, 27, BlockId.MANGO_BLOCK);
    setWorld(18, 25, 27, BlockId.JACK_O_LANTERN);
    // Gem pedestal
    setWorld(14, 25, 25, BlockId.EMERALD_BLOCK);
    setWorld(15, 25, 25, BlockId.DIAMOND_BLOCK);
    setWorld(16, 25, 25, BlockId.AMETHYST_BLOCK);
    setWorld(17, 25, 25, BlockId.RUBY_BLOCK);
  }

  // North Mango Guardian Nest Sanctuary (x: -14..14, z: -48..-24)
  if (overlaps(-15, -49, 15, -23)) {
    for (let wx = -14; wx <= 14; wx++) {
      for (let wz = -48; wz <= -24; wz++) {
        if (wx < ox || wx >= ox + 16 || wz < oz || wz >= oz + 16) continue;
        const dCenter = Math.hypot(wx, wz + 35);
        setWorld(
          wx,
          24,
          wz,
          dCenter < 4.5
            ? BlockId.GOLD_BLOCK
            : Math.abs(wx) <= 2 && wz >= -35
            ? BlockId.CORAL_TERRACOTTA
            : dCenter < 11
            ? BlockId.RED_BRICK
            : BlockId.MOSSY_STONE
        );
        for (let y = 25; y <= 46; y++) setWorld(wx, y, wz, BlockId.AIR);

        // Pillars & leafy sanctuary canopy arch
        if (Math.abs(wx) === 10 && (wz === -26 || wz === -34 || wz === -42)) {
          for (let dy = 1; dy <= 7; dy++) {
            setWorld(wx, 24 + dy, wz, dy === 7 ? BlockId.GOLD_BLOCK : BlockId.TROPICAL_WOOD);
          }
          setWorld(wx, 32, wz, BlockId.REDSTONE_LAMP);
        }
        // Guardian's giant welcoming mango-gold arch at north edge
        if (wz === -45 && Math.abs(wx) <= 7) {
          if (Math.abs(wx) === 7 || Math.abs(wx) === 6) {
            for (let dy = 1; dy <= 8; dy++) setWorld(wx, 24 + dy, wz, BlockId.TROPICAL_WOOD);
          }
          setWorld(wx, 33, wz, Math.abs(wx) % 2 === 0 ? BlockId.EMERALD_BLOCK : BlockId.MANGO_BLOCK);
        }
      }
    }
    // Gem & Mango offerings around Guardian Sanctuary
    setWorld(-4, 25, -35, BlockId.EMERALD_BLOCK);
    setWorld(-4, 26, -35, BlockId.REDSTONE_LAMP);
    setWorld(4, 25, -35, BlockId.DIAMOND_BLOCK);
    setWorld(4, 26, -35, BlockId.REDSTONE_LAMP);
    setWorld(-4, 25, -29, BlockId.MANGO_BLOCK);
    setWorld(4, 25, -29, BlockId.HONEYCOMB);
  }
}

export function generateChunkData(
  cx: number,
  cz: number,
  seed: number,
  deltas: Map<string, number>
): Uint8Array {
  const data = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * CHUNK_HEIGHT);
  const setLocal = (lx: number, y: number, lz: number, id: number) => {
    if (lx < 0 || lx >= CHUNK_SIZE || lz < 0 || lz >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT) return;
    data[(y * CHUNK_SIZE + lz) * CHUNK_SIZE + lx] = id;
  };
  const getLocal = (lx: number, y: number, lz: number) => {
    if (lx < 0 || lx >= CHUNK_SIZE || lz < 0 || lz >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT) return 0;
    return data[(y * CHUNK_SIZE + lz) * CHUNK_SIZE + lx];
  };

  const ox = cx * CHUNK_SIZE;
  const oz = cz * CHUNK_SIZE;
  const heights = new Int32Array(256);
  const biomes = new Array<ReturnType<typeof getBiomeAt>>(256);

  for (let lz = 0; lz < CHUNK_SIZE; lz++) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      const wx = ox + lx;
      const wz = oz + lz;
      const is999 = seed === 999;
      const is888 = seed === 888;
      const is666 = seed === 666;
      const is555 = seed === 555;
      const inRoyalCity = is999 && isVillageZone999(wx, wz);
      const inRobotCity = is666 && isRobotCityZone666(wx, wz);
      const inSkyCity = is888 && isSkyCityZone888(wx, wz);
      const inMangoVillage = is555 && isMangoVillageZone555(wx, wz);
      const biome =
        inRoyalCity || inMangoVillage
          ? 'verdant_basin'
          : inSkyCity || inRobotCity
          ? 'aether_spires'
          : getBiomeAt(wx, wz, seed);
      biomes[lz * CHUNK_SIZE + lx] = biome;

      const nLow = fbm2d(wx * 0.015, wz * 0.015, seed, 4) * 9;
      const nDetail = fbm2d(wx * 0.05, wz * 0.05, seed + 55, 2) * 3;
      const ridge = ridged2d(wx * 0.025, wz * 0.025, seed + 99, 3);

      let h = 22 + nLow + nDetail;
      if (biome === 'aether_spires') h = 20 + nLow * 0.7 + ridge * 10;
      else if (biome === 'basalt_caldera') h = 21 + ridge * 14 - Math.max(0, nLow * 0.4);
      else if (biome === 'frostbound_tundra') h = 23 + nLow * 0.6 + ridge * 7;
      else if (biome === 'mycelium_abyss') h = 20 + nLow * 0.65 + nDetail * 0.8;

      if (is999 || is555) {
        const limX = is555 ? 44 : 42;
        const minZ = is555 ? -54 : -52;
        const maxZ = is555 ? 40 : 38;
        const dx = Math.max(0, Math.abs(wx) - limX);
        const dz = wz < minZ ? minZ - wz : wz > maxZ ? wz - maxZ : 0;
        const dist = Math.hypot(dx, dz);
        if (dist === 0) h = 24;
        else if (dist < 14) {
          const t = dist / 14;
          const s = t * t * (3 - 2 * t);
          h = 24 * (1 - s) + h * s;
        }
      } else if (is666) {
        const dx = Math.max(0, Math.abs(wx) - 44);
        const dz = wz < -56 ? -56 - wz : wz > 40 ? wz - 40 : 0;
        const dist = Math.hypot(dx, dz);
        if (dist === 0) h = 24;
        else if (dist < 12) {
          const t = dist / 12;
          const s = t * t * (3 - 2 * t);
          h = 24 * (1 - s) + h * s;
        }
      }

      const groundY = is888 ? 30 : Math.max(6, Math.min(48, Math.round(h)));
      heights[lz * CHUNK_SIZE + lx] = groundY;

      const is777 = seed === 777;
      let volcY = groundY;
      let volcTop: number | null = null;
      let magmaFillY = 0;

      if (is777) {
        const vx = wx;
        const vz = wz + 24;
        const dVolc = Math.hypot(vx, vz);
        const stream = Math.abs(Math.sin(Math.atan2(vz, vx) * 2 + 0.35));
        if (dVolc < 34) {
          if (dVolc < 10.5) {
            if (dVolc < 4.5) {
              volcY = 39;
              volcTop = dVolc < 2.2 ? BlockId.GOLD_BLOCK : BlockId.OBSIDIAN;
            } else {
              volcY = 34;
              volcTop = BlockId.MAGMA;
            }
            magmaFillY = 34;
          } else {
            const e = (dVolc - 10.5) / 23.5;
            const slope = Math.pow(1 - e, 1.15) * 25;
            const jitter = fbm2d(wx * 0.11, wz * 0.11, seed + 88, 2) * 2.2;
            volcY = Math.max(23, Math.min(50, Math.round(23 + slope + jitter)));
            volcTop =
              stream < 0.16 && dVolc > 11 && dVolc < 32
                ? BlockId.MAGMA
                : e < 0.25
                ? BlockId.OBSIDIAN
                : BlockId.BASALT;
          }
        } else if (wx >= -12 && wx <= 14 && wz >= 4 && wz <= 20) {
          volcY = 23;
          volcTop = Math.abs(wx - 2) <= 2 && wz <= 14 ? BlockId.CASTLE_BRICK : BlockId.BASALT;
        }
        heights[lz * CHUNK_SIZE + lx] = volcY;
      }

      const skyIsoNoise = is888 && !inSkyCity ? fbm2d(wx * 0.028, wz * 0.028, seed + 512, 3) : -1;
      const hasSkyIsland = is888 && !inSkyCity && skyIsoNoise > 0.06;
      const skyTop = hasSkyIsland ? Math.min(48, Math.max(24, Math.round(28 + (skyIsoNoise - 0.06) * 42 + nDetail * 0.6))) : 0;
      const skyBot = hasSkyIsland ? Math.max(14, skyTop - Math.round(4 + (skyIsoNoise - 0.06) * 26)) : 0;
      if (is888 && hasSkyIsland) heights[lz * CHUNK_SIZE + lx] = skyTop;

      for (let y = 0; y < CHUNK_HEIGHT; y++) {
        let block: number = BlockId.AIR;
        if (is888) {
          if (!inSkyCity && hasSkyIsland && y >= skyBot && y <= skyTop) {
            if (y === skyTop) {
              block =
                biome === 'frostbound_tundra'
                  ? BlockId.SNOW
                  : biome === 'mycelium_abyss'
                  ? BlockId.MYCELIUM
                  : ridge > 0.68
                  ? BlockId.AETHER_CRYSTAL
                  : BlockId.GRASS;
            } else if (y >= skyTop - 2) {
              block = biome === 'frostbound_tundra' ? BlockId.ICE : BlockId.DIRT;
            } else if (y === skyBot) {
              block = BlockId.CLOUD_BLOCK;
            } else {
              block = BlockId.STONE;
            }
          }
          setLocal(lx, y, lz, block);
        } else {
          if (y === 0) {
            block = BlockId.OBSIDIAN;
          } else if (is777 && volcTop !== null) {
            if (y <= volcY) {
              block =
                y === volcY
                  ? volcTop
                  : y >= volcY - 2
                  ? volcTop === BlockId.MAGMA
                    ? BlockId.OBSIDIAN
                    : BlockId.BASALT
                  : y < 16
                  ? BlockId.OBSIDIAN
                  : BlockId.BASALT;
            } else if (magmaFillY > 0 && y <= magmaFillY) {
              block = BlockId.MAGMA;
            }
          } else if (y <= groundY) {
            const isCave =
              y > 3 &&
              y < groundY - 3 &&
              !inRoyalCity &&
              !inRobotCity &&
              !inMangoVillage &&
              valueNoise3d(wx * 0.075, y * 0.09, wz * 0.075, seed + 777) > 0.48;
            if (!isCave) {
              if (y === groundY) {
                if (inRoyalCity || inMangoVillage) block = BlockId.GRASS;
                else if (inRobotCity) {
                  block = (Math.abs(wx) + Math.abs(wz)) % 12 === 0 ? BlockId.CIRCUIT_CORE : BlockId.BASALT;
                } else if (groundY <= 19 && biome === 'verdant_basin') block = BlockId.SAND;
                else if (biome === 'verdant_basin') block = BlockId.GRASS;
                else if (biome === 'aether_spires') {
                  block = is666
                    ? ridge > 0.65
                      ? BlockId.CIRCUIT_CORE
                      : BlockId.STEEL_PLATE
                    : ridge > 0.62
                    ? BlockId.AETHER_CRYSTAL
                    : BlockId.STONE;
                } else if (biome === 'basalt_caldera') {
                  block =
                    y < 22 && ridge < 0.36
                      ? BlockId.MAGMA
                      : ridge > 0.68
                      ? BlockId.OBSIDIAN
                      : BlockId.BASALT;
                } else if (biome === 'frostbound_tundra') {
                  block = ridge > 0.56 || y <= 20 ? BlockId.ICE : BlockId.SNOW;
                } else if (biome === 'mycelium_abyss') {
                  block = BlockId.MYCELIUM;
                }
              } else if (y >= groundY - 3) {
                block = inRobotCity
                  ? BlockId.STEEL_PLATE
                  : biome === 'basalt_caldera'
                  ? BlockId.BASALT
                  : biome === 'frostbound_tundra'
                  ? BlockId.SNOW
                  : biome === 'aether_spires'
                  ? BlockId.STONE
                  : BlockId.DIRT;
              } else if (valueNoise3d(wx * 0.18, y * 0.18, wz * 0.18, seed + 444) > 0.56) {
                block = biome === 'aether_spires' || y < 14 ? BlockId.AETHER_ORE : BlockId.COPPER_ORE;
              } else {
                block = biome === 'basalt_caldera' ? BlockId.BASALT : BlockId.STONE;
              }
            }
          } else if (y <= 18 && biome !== 'basalt_caldera' && !inRoyalCity && !inRobotCity && !inMangoVillage) {
            block = biome === 'frostbound_tundra' && y === 18 ? BlockId.ICE : BlockId.WATER;
          }

          if (
            biome === 'aether_spires' &&
            y >= 36 &&
            y <= 50 &&
            !inRoyalCity &&
            !inRobotCity &&
            !inMangoVillage &&
            valueNoise3d(wx * 0.06, (y - 42) * 0.14, wz * 0.06, seed + 911) > 0.44
          ) {
            block = y > 44 ? (is666 ? BlockId.CIRCUIT_CORE : BlockId.AETHER_CRYSTAL) : BlockId.STONE;
          }
          setLocal(lx, y, lz, block);
        }
      }
    }
  }

  // Flora & spires
  for (let lz = 2; lz < 14; lz++) {
    for (let lx = 2; lx < 14; lx++) {
      const wx = ox + lx;
      const wz = oz + lz;
      if (
        (seed === 999 && isVillageZone999(wx, wz)) ||
        (seed === 888 && isSkyCityZone888(wx, wz)) ||
        (seed === 666 && isRobotCityZone666(wx, wz)) ||
        (seed === 555 && isMangoVillageZone555(wx, wz))
      ) {
        continue;
      }
      const gy = heights[lz * CHUNK_SIZE + lx];
      const biome = biomes[lz * CHUNK_SIZE + lx];
      const top = getLocal(lx, gy, lz);
      if (gy <= 18 || top === BlockId.AIR || top === BlockId.MAGMA) continue;
      const roll = hash2d(wx, wz, seed + 1234);

      if ((biome === 'verdant_basin' || (seed === 888 && top === BlockId.GRASS)) && roll > 0.985 && top === BlockId.GRASS) {
        const th = 4 + Math.floor(hash2d(wx + 3, wz - 2, seed) * 2);
        const trunkId = seed === 555 ? BlockId.TROPICAL_WOOD : BlockId.WOOD;
        const leafId = seed === 555 ? BlockId.MANGO_LEAVES : BlockId.LEAVES;
        for (let dy = 1; dy <= th; dy++) setLocal(lx, gy + dy, lz, trunkId);
        for (let dx = -2; dx <= 2; dx++) {
          for (let dz = -2; dz <= 2; dz++) {
            for (let dy = th - 1; dy <= th + 2; dy++) {
              if (Math.abs(dx) + Math.abs(dz) + Math.max(0, dy - th) <= 3 && getLocal(lx + dx, gy + dy, lz + dz) === BlockId.AIR) {
                const mangoFruit = seed === 555 && dy === th - 1 && (dx + dz) % 2 === 0;
                setLocal(lx + dx, gy + dy, lz + dz, mangoFruit ? BlockId.MANGO_BLOCK : leafId);
              }
            }
          }
        }
      } else if (biome === 'aether_spires' && roll > 0.988) {
        const sh = 4 + Math.floor(hash2d(wx + 7, wz, seed) * 5);
        for (let dy = 1; dy <= sh; dy++) {
          setLocal(lx, gy + dy, lz, dy >= sh - 1 ? BlockId.AETHER_CRYSTAL : BlockId.OBSIDIAN);
        }
      } else if (biome === 'mycelium_abyss' && roll > 0.986) {
        const sh = 3 + Math.floor(hash2d(wx, wz + 5, seed) * 3);
        for (let dy = 1; dy <= sh; dy++) setLocal(lx, gy + dy, lz, BlockId.GLOW_MUSHROOM_STEM);
        for (let dx = -2; dx <= 2; dx++) {
          for (let dz = -2; dz <= 2; dz++) {
            if (Math.abs(dx) === 2 && Math.abs(dz) === 2) continue;
            setLocal(
              lx + dx,
              gy + sh + 1,
              lz + dz,
              Math.abs(dx) <= 1 && Math.abs(dz) <= 1 ? BlockId.BOUNCE_CAP : BlockId.GLOW_SPORE
            );
          }
        }
      } else if (biome === 'basalt_caldera' && roll > 0.99) {
        const ph = 3 + Math.floor(hash2d(wx - 4, wz + 1, seed) * 4);
        for (let dy = 1; dy <= ph; dy++) {
          setLocal(lx, gy + dy, lz, dy === ph ? BlockId.MAGMA : BlockId.OBSIDIAN);
        }
      } else if (biome === 'frostbound_tundra' && roll > 0.988) {
        const ih = 3 + Math.floor(hash2d(wx + 1, wz + 9, seed) * 4);
        for (let dy = 1; dy <= ih; dy++) setLocal(lx, gy + dy, lz, BlockId.ICE);
      }
    }
  }

  // Curated seed structures & origin portal
  if (seed === 999) buildRoyalCity999(ox, oz, setLocal);
  if (seed === 777) buildVolcanoOutpost777(ox, oz, setLocal);
  if (seed === 888) buildSkyWorld888(ox, oz, seed, setLocal);
  if (seed === 666) buildRobotCity666(ox, oz, setLocal);
  if (seed === 555) buildVillageMangoBirds555(ox, oz, setLocal);

  if (cx === 0 && cz === 0) {
    const px = seed === 999 || seed === 777 || seed === 888 || seed === 555 ? 9 : seed === 666 ? 10 : 11;
    const pz = seed === 999 || seed === 555 ? 13 : seed === 777 ? 11 : seed === 888 ? 14 : seed === 666 ? 13 : 3;
    const py =
      seed === 999 || seed === 555
        ? 24
        : seed === 777
        ? 23
        : seed === 888
        ? 30
        : seed === 666
        ? 24
        : Math.max(19, heights[pz * CHUNK_SIZE + px]);

    for (let dx = -1; dx <= 4; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        const x = px + dx;
        const z = pz + dz;
        if (x < 0 || x >= 16 || z < 0 || z >= 16) continue;
        setLocal(x, py, z, dx === -1 || dx === 4 || Math.abs(dz) === 2 ? BlockId.STONE : BlockId.AETHER_CRYSTAL);
        for (let y = py + 1; y <= py + 7; y++) setLocal(x, y, z, BlockId.AIR);
      }
    }
    for (let dy = 1; dy <= 5; dy++) {
      for (let dx = 0; dx <= 3; dx++) {
        const frame = dy === 1 || dy === 5 || dx === 0 || dx === 3;
        setLocal(px + dx, py + dy, pz, frame ? BlockId.PORTAL_FRAME : BlockId.PORTAL_RIFT);
      }
    }
  }

  // Apply persisted block deltas
  if (deltas.size > 0) {
    if (deltas.size <= 4096) {
      for (const [key, val] of deltas.entries()) {
        const c1 = key.indexOf(',');
        const c2 = key.indexOf(',', c1 + 1);
        if (c1 <= 0 || c2 <= c1) continue;
        const wx = Number(key.slice(0, c1));
        const wy = Number(key.slice(c1 + 1, c2));
        const wz = Number(key.slice(c2 + 1));
        const lx = wx - ox;
        const lz = wz - oz;
        if (lx >= 0 && lx < CHUNK_SIZE && lz >= 0 && lz < CHUNK_SIZE && wy >= 0 && wy < CHUNK_HEIGHT) {
          setLocal(lx, wy, lz, val);
        }
      }
    } else {
      for (let y = 0; y < CHUNK_HEIGHT; y++) {
        for (let lz = 0; lz < CHUNK_SIZE; lz++) {
          for (let lx = 0; lx < CHUNK_SIZE; lx++) {
            const val = deltas.get(voxelKey(ox + lx, y, oz + lz));
            if (val !== undefined) setLocal(lx, y, lz, val);
          }
        }
      }
    }
  }

  return data;
}

const FACES = [
  {
    dir: [0, 1, 0],
    corners: [
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0],
      [0, 1, 0],
    ],
    shade: 1.0,
    faceType: 'top' as const,
  },
  {
    dir: [0, -1, 0],
    corners: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 1],
    ],
    shade: 0.58,
    faceType: 'bottom' as const,
  },
  {
    dir: [1, 0, 0],
    corners: [
      [1, 0, 1],
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
    ],
    shade: 0.86,
    faceType: 'side' as const,
  },
  {
    dir: [-1, 0, 0],
    corners: [
      [0, 0, 0],
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
    ],
    shade: 0.8,
    faceType: 'side' as const,
  },
  {
    dir: [0, 0, 1],
    corners: [
      [0, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
    ],
    shade: 0.92,
    faceType: 'side' as const,
  },
  {
    dir: [0, 0, -1],
    corners: [
      [1, 0, 0],
      [0, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
    ],
    shade: 0.75,
    faceType: 'side' as const,
  },
];

const tempColor = new THREE.Color();

export function buildChunkGeometry(
  cx: number,
  cz: number,
  getBlockAt: (wx: number, wy: number, wz: number) => number,
  data: Uint8Array
): { opaqueGeo: THREE.BufferGeometry | null; transparentGeo: THREE.BufferGeometry | null } {
  const oPos: number[] = [];
  const oNorm: number[] = [];
  const oUv: number[] = [];
  const oCol: number[] = [];
  const oIdx: number[] = [];

  const tPos: number[] = [];
  const tNorm: number[] = [];
  const tUv: number[] = [];
  const tCol: number[] = [];
  const tIdx: number[] = [];

  const ox = cx * CHUNK_SIZE;
  const oz = cz * CHUNK_SIZE;

  const isOpaqueSolid = (wx: number, wy: number, wz: number) => {
    if (wy < 0 || wy >= CHUNK_HEIGHT) return false;
    const id = getBlockAt(wx, wy, wz);
    if (id === BlockId.AIR) return false;
    const def = getBlock(id);
    return def.solid && !def.transparent;
  };

  const vertexAO = (
    wx: number,
    wy: number,
    wz: number,
    face: (typeof FACES)[number],
    corner: number[]
  ) => {
    const [nx, ny, nz] = face.dir;
    const sx = corner[0] === 1 ? 1 : -1;
    const sy = corner[1] === 1 ? 1 : -1;
    const sz = corner[2] === 1 ? 1 : -1;

    let side1 = false;
    let side2 = false;
    let diag = false;

    if (ny === 0) {
      if (nx === 0) {
        side1 = isOpaqueSolid(wx + sx, wy, wz + nz);
        side2 = isOpaqueSolid(wx, wy + sy, wz + nz);
        diag = isOpaqueSolid(wx + sx, wy + sy, wz + nz);
      } else {
        side1 = isOpaqueSolid(wx + nx, wy + sy, wz);
        side2 = isOpaqueSolid(wx + nx, wy, wz + sz);
        diag = isOpaqueSolid(wx + nx, wy + sy, wz + sz);
      }
    } else {
      side1 = isOpaqueSolid(wx + sx, wy + ny, wz);
      side2 = isOpaqueSolid(wx, wy + ny, wz + sz);
      diag = isOpaqueSolid(wx + sx, wy + ny, wz + sz);
    }

    const occ = side1 && side2 ? 3 : (side1 ? 1 : 0) + (side2 ? 1 : 0) + (diag ? 1 : 0);
    return 1 - occ * 0.14;
  };

  for (let y = 0; y < CHUNK_HEIGHT; y++) {
    for (let lz = 0; lz < CHUNK_SIZE; lz++) {
      for (let lx = 0; lx < CHUNK_SIZE; lx++) {
        const id = data[(y * CHUNK_SIZE + lz) * CHUNK_SIZE + lx];
        if (id === BlockId.AIR) continue;
        const def = getBlock(id);
        const wx = ox + lx;
        const wz = oz + lz;
        const transp = def.transparent;

        const pos = transp ? tPos : oPos;
        const norm = transp ? tNorm : oNorm;
        const uv = transp ? tUv : oUv;
        const col = transp ? tCol : oCol;
        const idx = transp ? tIdx : oIdx;

        for (let f = 0; f < 6; f++) {
          const face = FACES[f];
          const [nx, ny, nz] = face.dir;
          const nId = getBlockAt(wx + nx, y + ny, wz + nz);
          const nDef = getBlock(nId);
          if (!transp) {
            if (nDef.solid && !nDef.transparent) continue;
          } else {
            if (nId === id || (nDef.solid && !nDef.transparent)) continue;
          }

          const pat =
            face.faceType === 'top'
              ? def.patternTop
              : face.faceType === 'bottom'
              ? def.patternBottom
              : def.patternSide;
          const hex =
            face.faceType === 'top'
              ? def.colorTop
              : face.faceType === 'bottom'
              ? def.colorBottom
              : def.colorSide;
          tempColor.set(hex);

          const [u0, v0, u1, v1] = getTileUVs(pat);
          const baseVertex = pos.length / 3;
          const aos: number[] = [];

          for (let c = 0; c < 4; c++) {
            const corner = face.corners[c];
            pos.push(lx + corner[0], y + corner[1], lz + corner[2]);
            norm.push(nx, ny, nz);
            const ao = transp ? 1 : vertexAO(wx, y, wz, face, corner);
            aos.push(ao);
            const shade = face.shade * ao;
            col.push(tempColor.r * shade, tempColor.g * shade, tempColor.b * shade);
          }

          uv.push(u0, v0, u1, v0, u1, v1, u0, v1);

          if (aos[0] + aos[2] > aos[1] + aos[3]) {
            idx.push(baseVertex, baseVertex + 1, baseVertex + 2, baseVertex, baseVertex + 2, baseVertex + 3);
          } else {
            idx.push(
              baseVertex + 1,
              baseVertex + 2,
              baseVertex + 3,
              baseVertex + 1,
              baseVertex + 3,
              baseVertex
            );
          }
        }
      }
    }
  }

  const buildGeo = (
    pos: number[],
    norm: number[],
    uv: number[],
    col: number[],
    idx: number[]
  ): THREE.BufferGeometry | null => {
    if (pos.length === 0) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.computeBoundingSphere();
    return geo;
  };

  return {
    opaqueGeo: buildGeo(oPos, oNorm, oUv, oCol, oIdx),
    transparentGeo: buildGeo(tPos, tNorm, tUv, tCol, tIdx),
  };
}
