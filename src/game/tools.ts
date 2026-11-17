import type { BlockCategory, ToolDef } from '../types';

export const ToolId = {
  IRON_SWORD: 101,
  AETHER_SWORD: 102,
  IRON_PICKAXE: 103,
  AETHER_PICKAXE: 104,
  IRON_SHOVEL: 105,
  AETHER_SHOVEL: 106,
} as const;

export const TOOLS: ToolDef[] = [
  {
    id: ToolId.IRON_SWORD,
    name: 'Iron Sword',
    kind: 'sword',
    tier: 'iron',
    damage: 28,
    range: 4,
    miningSpeed: 1,
    colorPrimary: '#cbd5e1',
    colorAccent: '#94a3b8',
    craftCrystalCost: 0,
  },
  {
    id: ToolId.AETHER_SWORD,
    name: 'Aether Sword',
    kind: 'sword',
    tier: 'aether',
    damage: 44,
    range: 4.5,
    miningSpeed: 1.2,
    colorPrimary: '#38bdf8',
    colorAccent: '#6ee7b7',
    craftCrystalCost: 2,
  },
  {
    id: ToolId.IRON_PICKAXE,
    name: 'Iron Pickaxe',
    kind: 'pickaxe',
    tier: 'iron',
    damage: 14,
    range: 3.4,
    miningSpeed: 2.8,
    colorPrimary: '#cbd5e1',
    colorAccent: '#64748b',
    craftCrystalCost: 0,
  },
  {
    id: ToolId.AETHER_PICKAXE,
    name: 'Aether Pickaxe',
    kind: 'pickaxe',
    tier: 'aether',
    damage: 18,
    range: 3.6,
    miningSpeed: 4.2,
    colorPrimary: '#38bdf8',
    colorAccent: '#22d3ee',
    craftCrystalCost: 2,
  },
  {
    id: ToolId.IRON_SHOVEL,
    name: 'Iron Shovel',
    kind: 'shovel',
    tier: 'iron',
    damage: 11,
    range: 3.4,
    miningSpeed: 3.4,
    colorPrimary: '#cbd5e1',
    colorAccent: '#78553a',
    craftCrystalCost: 0,
  },
  {
    id: ToolId.AETHER_SHOVEL,
    name: 'Aether Shovel',
    kind: 'shovel',
    tier: 'aether',
    damage: 15,
    range: 3.6,
    miningSpeed: 4.8,
    colorPrimary: '#38bdf8',
    colorAccent: '#a78bfa',
    craftCrystalCost: 2,
  },
];

const TOOL_MAP = new Map<number, ToolDef>(TOOLS.map((t) => [t.id, t]));
const toolIconCache = new Map<number, string>();

export function isToolId(id: number): boolean {
  return TOOL_MAP.has(id);
}

export function getToolDef(id: number): ToolDef | undefined {
  return TOOL_MAP.get(id);
}

export function getAllTools(): ToolDef[] {
  return TOOLS;
}

export function getMiningMultiplier(
  tool: ToolDef | undefined,
  category: BlockCategory,
  blockId: number
): number {
  if (!tool) return 1;
  if (tool.kind === 'pickaxe') {
    return category === 'mineral' || category === 'tech' || blockId === 3 || blockId === 4
      ? tool.miningSpeed
      : 1.25;
  }
  if (tool.kind === 'shovel') {
    return blockId === 1 || blockId === 2 || blockId === 5 || blockId === 7 || blockId === 11
      ? tool.miningSpeed
      : 1.1;
  }
  if (tool.kind === 'sword') {
    return category === 'flora' ? 1.8 : 0.95;
  }
  return 1;
}

export function renderToolIcon(tool: ToolDef): string {
  const cached = toolIconCache.get(tool.id);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 48;
  canvas.height = 48;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 48, 48);

  const isAether = tool.tier === 'aether';
  const main = isAether ? '#38bdf8' : '#e2e8f0';
  const edge = isAether ? '#6ee7b7' : '#94a3b8';
  const handle = '#8b5a3c';
  const accent = isAether ? '#a78bfa' : '#d97706';

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (tool.kind === 'sword') {
    ctx.strokeStyle = handle;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(10, 38);
    ctx.lineTo(18, 30);
    ctx.stroke();

    ctx.strokeStyle = accent;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(13, 25);
    ctx.lineTo(23, 35);
    ctx.stroke();

    ctx.strokeStyle = main;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(19, 29);
    ctx.lineTo(39, 9);
    ctx.stroke();

    ctx.strokeStyle = edge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, 28);
    ctx.lineTo(39, 9);
    ctx.stroke();
  } else if (tool.kind === 'pickaxe') {
    ctx.strokeStyle = handle;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(10, 38);
    ctx.lineTo(32, 16);
    ctx.stroke();

    ctx.strokeStyle = main;
    ctx.lineWidth = 5.5;
    ctx.beginPath();
    ctx.moveTo(16, 10);
    ctx.quadraticCurveTo(32, 12, 38, 32);
    ctx.stroke();

    ctx.strokeStyle = edge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(18, 11);
    ctx.quadraticCurveTo(31, 13, 36, 30);
    ctx.stroke();

    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(30, 18, 3.2, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.strokeStyle = handle;
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(10, 38);
    ctx.lineTo(28, 20);
    ctx.stroke();

    ctx.fillStyle = main;
    ctx.strokeStyle = edge;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(25, 17);
    ctx.lineTo(31, 11);
    ctx.lineTo(40, 8);
    ctx.lineTo(37, 17);
    ctx.lineTo(31, 23);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(27, 21, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
  const url = canvas.toDataURL();
  toolIconCache.set(tool.id, url);
  return url;
}
