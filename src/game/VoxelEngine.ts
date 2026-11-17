import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { BiomeId, CreatureMeta, CreatureSpecies, HudState, PlayerSkin, RemotePlayer, WorldRules } from '../types';
import { soundEngine } from './audio';
import { BIOME_LIST, BIOMES, getBiomeAt } from './biomes';
import { BlockId, createAtlas, DEFAULT_HOTBAR, getBlock } from './blocks';
import { buildCreatureRig, CREATURE_META, type CreatureRig, getEggDef, isEggId } from './creatures';
import { createRemotePlayerMesh, type CharacterRig, skinSignature } from './skins';
import { getMiningMultiplier, getToolDef, isToolId, ToolId } from './tools';
import { buildChunkGeometry, chunkKey, generateChunkData, voxelKey } from './worldGen';

export interface VoxelEngineCallbacks {
  onHudUpdate: (hud: HudState) => void;
  onBlockSet?: (x: number, y: number, z: number, blockId: number) => void;
  onPlayerMove?: (
    x: number,
    y: number,
    z: number,
    yaw: number,
    pitch: number,
    heldBlock: number,
    biome: string
  ) => void;
  onPauseRequest?: () => void;
  onChatRequest?: () => void;
  onToggleMicRequest?: () => void;
  onPushToTalkChange?: (held: boolean) => void;
  onToggleHud?: () => void;
  onToggleFullscreen?: () => void;
}

interface ChunkEntry {
  cx: number;
  cz: number;
  data: Uint8Array;
  opaqueMesh: THREE.Mesh | null;
  transparentMesh: THREE.Mesh | null;
  dirty: boolean;
}

interface Particle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  scale: number;
  color: THREE.Color;
}

interface CreatureInstance {
  id: number;
  meta: CreatureMeta;
  rig: CreatureRig;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  yaw: number;
  health: number;
  walkPhase: number;
  aiTimer: number;
  attackCooldown: number;
  hitFlash: number;
  fuseTimer: number;
  fleeTimer: number;
  onGround: boolean;
  fromEgg?: boolean;
  helpCooldown?: number;
}

interface PrimedTnt {
  mesh: THREE.Mesh;
  x: number;
  y: number;
  z: number;
  fuse: number;
}

interface ProjectileBolt {
  active: boolean;
  mesh: THREE.Mesh;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  damage: number;
  friendlyToPlayer?: boolean;
}

interface RemotePlayerEntry {
  rig: CharacterRig;
  skinSig: string;
  targetPos: THREE.Vector3;
  targetYaw: number;
  heldBlock: number;
  walkPhase: number;
}

interface HandRig {
  group: THREE.Group;
  setEquippedItem: (itemId: number) => void;
  setHandSkin: (skin: PlayerSkin) => void;
  dispose: () => void;
}

function buildHandRig(): HandRig {
  const group = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T) => {
    geos.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T) => {
    mats.push(m);
    return m;
  };

  const armMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85, metalness: 0.1 }));
  const arm = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.14, 0.14, 0.36)), armMat);
  arm.position.set(0.04, -0.14, 0.14);
  arm.rotation.set(0.15, -0.1, 0);
  group.add(arm);

  const cuffMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.28, metalness: 0.82 }));
  const cuff = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.155, 0.155, 0.05)), cuffMat);
  cuff.position.set(0.02, -0.09, -0.02);
  group.add(cuff);

  const handleMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x7c4a2d, roughness: 0.88, metalness: 0.02 }));
  const guardMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.26, metalness: 0.88 }));

  // Pickaxe group
  const pickGroup = new THREE.Group();
  const pickShaft = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.055, 0.44, 0.055)), handleMat);
  pickShaft.position.set(0, 0.08, -0.12);
  pickShaft.rotation.set(-0.22, 0, 0);
  const pickCollar = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.11, 0.08, 0.1)), guardMat);
  pickCollar.position.set(0, 0.27, -0.16);
  pickCollar.rotation.set(-0.22, 0, 0);
  const pickHeadMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.45,
      roughness: 0.18,
      metalness: 0.65,
    })
  );
  const pickHead = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.048, 0.065, 0.36)), pickHeadMat);
  pickHead.position.set(0, 0.29, -0.18);
  pickHead.rotation.set(-0.18, 0, 0);
  const pickCoreMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x6ee7b7,
      emissive: 0x34d399,
      emissiveIntensity: 0.9,
      roughness: 0.14,
      metalness: 0.25,
    })
  );
  const pickCore = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.062, 0.04, 0.04)), pickCoreMat);
  pickCore.position.set(0, 0.275, -0.16);
  pickGroup.add(pickShaft, pickCollar, pickHead, pickCore);
  group.add(pickGroup);

  // Sword group
  const swordGroup = new THREE.Group();
  const swordGrip = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.05, 0.16, 0.05)), handleMat);
  swordGrip.position.set(0, -0.02, -0.09);
  swordGrip.rotation.set(-0.28, 0, 0);
  const swordPommel = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.075, 0.05, 0.075)), guardMat);
  swordPommel.position.set(0, -0.1, -0.07);
  const swordGuard = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.24, 0.055, 0.08)), guardMat);
  swordGuard.position.set(0, 0.07, -0.12);
  swordGuard.rotation.set(-0.28, 0, 0);
  const swordBladeMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      emissive: 0x000000,
      emissiveIntensity: 0,
      roughness: 0.16,
      metalness: 0.85,
    })
  );
  const swordBlade = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.045, 0.52, 0.09)), swordBladeMat);
  swordBlade.position.set(0, 0.34, -0.2);
  swordBlade.rotation.set(-0.28, 0, 0);
  const swordCoreMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x6ee7b7,
      emissive: 0x22d3ee,
      emissiveIntensity: 0.7,
      roughness: 0.15,
      metalness: 0.35,
    })
  );
  const swordCore = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.054, 0.42, 0.028)), swordCoreMat);
  swordCore.position.set(0, 0.32, -0.19);
  swordCore.rotation.set(-0.28, 0, 0);
  swordGroup.add(swordGrip, swordPommel, swordGuard, swordBlade, swordCore);
  swordGroup.visible = false;
  group.add(swordGroup);

  // Shovel group
  const shovelGroup = new THREE.Group();
  const shovelShaft = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.05, 0.48, 0.05)), handleMat);
  shovelShaft.position.set(0, 0.1, -0.13);
  shovelShaft.rotation.set(-0.26, 0, 0);
  const shovelCollar = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.085, 0.07, 0.085)), guardMat);
  shovelCollar.position.set(0, 0.31, -0.18);
  shovelCollar.rotation.set(-0.26, 0, 0);
  const shovelHeadMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      emissive: 0x000000,
      emissiveIntensity: 0,
      roughness: 0.22,
      metalness: 0.78,
    })
  );
  const shovelSpade = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.18, 0.22, 0.04)), shovelHeadMat);
  shovelSpade.position.set(0, 0.43, -0.22);
  shovelSpade.rotation.set(-0.2, 0, 0);
  const shovelTip = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.12, 0.07, 0.036)), shovelHeadMat);
  shovelTip.position.set(0, 0.55, -0.245);
  shovelTip.rotation.set(-0.2, 0, 0);
  shovelGroup.add(shovelShaft, shovelCollar, shovelSpade, shovelTip);
  shovelGroup.visible = false;
  group.add(shovelGroup);

  // Block cube group
  const blockGroup = new THREE.Group();
  const blockMat = trackMat(new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.78, metalness: 0.06 }));
  const blockCube = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.22, 0.22, 0.22)), blockMat);
  blockCube.position.set(-0.02, 0.02, -0.14);
  blockCube.rotation.set(0.2, 0.45, 0);
  blockGroup.add(blockCube);
  blockGroup.visible = false;
  group.add(blockGroup);

  // Spawn Egg group
  const eggGroup = new THREE.Group();
  const eggShellMat = trackMat(new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.42, metalness: 0.12 }));
  const eggSpotMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xfde047,
      emissive: 0xfde047,
      emissiveIntensity: 0.25,
      roughness: 0.25,
      metalness: 0.2,
    })
  );
  const eggBody = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.16, 0.21, 0.16)), eggShellMat);
  eggBody.position.set(-0.02, 0.03, -0.14);
  eggBody.rotation.set(0.18, 0.42, 0);
  const eggCap = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.11, 0.05, 0.11)), eggShellMat);
  eggCap.position.set(0, 0.125, 0);
  const eggBand = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.172, 0.06, 0.172)), eggSpotMat);
  eggBand.position.set(0, 0.01, 0);
  const eggSpot = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.06, 0.06, 0.175)), eggSpotMat);
  eggSpot.position.set(0.03, -0.05, 0);
  eggBody.add(eggCap, eggBand, eggSpot);
  eggGroup.add(eggBody);
  eggGroup.visible = false;
  group.add(eggGroup);

  const setEquippedItem = (itemId: number) => {
    pickGroup.visible = false;
    swordGroup.visible = false;
    shovelGroup.visible = false;
    blockGroup.visible = false;
    eggGroup.visible = false;

    if (isToolId(itemId)) {
      const def = getToolDef(itemId);
      if (!def) return;
      const isAether = def.tier === 'aether';
      if (def.kind === 'sword') {
        swordGroup.visible = true;
        swordBladeMat.color.setHex(isAether ? 0x38bdf8 : 0xe2e8f0);
        swordBladeMat.emissive.setHex(isAether ? 0x0284c7 : 0x000000);
        swordBladeMat.emissiveIntensity = isAether ? 0.5 : 0;
        swordCore.visible = isAether;
      } else if (def.kind === 'pickaxe') {
        pickGroup.visible = true;
        pickHeadMat.color.setHex(isAether ? 0x38bdf8 : 0xcbd5e1);
        pickHeadMat.emissive.setHex(isAether ? 0x0284c7 : 0x000000);
        pickHeadMat.emissiveIntensity = isAether ? 0.55 : 0;
        pickCore.visible = isAether;
      } else {
        shovelGroup.visible = true;
        shovelHeadMat.color.setHex(isAether ? 0x38bdf8 : 0xe2e8f0);
        shovelHeadMat.emissive.setHex(isAether ? 0x0284c7 : 0x000000);
        shovelHeadMat.emissiveIntensity = isAether ? 0.45 : 0;
      }
    } else if (isEggId(itemId)) {
      const egg = getEggDef(itemId);
      if (egg) {
        eggGroup.visible = true;
        eggShellMat.color.set(egg.primaryColor);
        eggSpotMat.color.set(egg.spotColor);
        eggSpotMat.emissive.set(egg.spotColor);
        eggSpotMat.emissiveIntensity = egg.category === 'boss' ? 0.45 : 0.22;
      }
    } else {
      blockGroup.visible = true;
      const blk = getBlock(itemId);
      blockMat.color.set(blk.colorTop);
      blockMat.emissive.set(blk.emissive || '#000000');
      blockMat.emissiveIntensity = blk.emissiveIntensity ? blk.emissiveIntensity * 0.5 : 0;
    }
  };

  setEquippedItem(ToolId.IRON_SWORD);

  return {
    group,
    setEquippedItem,
    setHandSkin: (skin: PlayerSkin) => {
      armMat.color.set(skin.limbColor);
      cuffMat.color.set(skin.accentColor);
    },
    dispose: () => {
      for (const g of geos) g.dispose();
      for (const m of mats) m.dispose();
    },
  };
}

const rayDir = new THREE.Vector3();
const creatureRayDir = new THREE.Vector3();
const tmpVec = new THREE.Vector3();
const targetCol = new THREE.Color();
const nightCol = new THREE.Color();
const dummyObj = new THREE.Object3D();

export class VoxelEngine {
  container: HTMLElement;
  callbacks: VoxelEngineCallbacks;
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  fog: THREE.FogExp2;
  hemiLight: THREE.HemisphereLight;
  sunLight: THREE.DirectionalLight;
  sunMesh: THREE.Mesh;
  atlas: ReturnType<typeof createAtlas>;
  opaqueMat: THREE.MeshStandardMaterial;
  transparentMat: THREE.MeshStandardMaterial;
  handRig: HandRig;
  highlightBox: THREE.LineSegments;
  particleMesh: THREE.InstancedMesh;
  boltGeo: THREE.BoxGeometry;
  boltMat: THREE.MeshStandardMaterial;
  resizeObserver: ResizeObserver;
  isSoftwareGl: boolean;

  particles: Particle[] = [];
  creatures: CreatureInstance[] = [];
  bolts: ProjectileBolt[] = [];
  primedTnts: PrimedTnt[] = [];
  tntGeo: THREE.BoxGeometry;
  tntMat: THREE.MeshStandardMaterial;
  creatureSpawnTimer = 0;
  nextCreatureId = 1;
  sweepCooldown = 0;
  bossDefeated = false;
  bossGuardSummoned = false;

  seed = 999;
  deltas = new Map<string, number>();
  chunks = new Map<string, ChunkEntry>();
  renderDistance = 3;
  timeOfDay = 0.28;

  playerPos = new THREE.Vector3(8, 34, 8);
  velocity = new THREE.Vector3(0, 0, 0);
  yaw = 0;
  pitch = -0.12;
  onGround = false;
  coyoteTimer = 0;
  jumpBufferTimer = 0;
  stepTimer = 0;

  health = 100;
  maxHealth = 100;
  stamina = 100;
  flyMode = false;
  worldRules: WorldRules = 'creative';
  inventory = new Map<number, number>();
  isDead = false;
  hardcoreSpectating = false;

  hotbar: number[] = [...DEFAULT_HOTBAR];
  selectedSlot = 0;
  discoveredBiomes = new Set<BiomeId>(['verdant_basin']);
  currentBiome: BiomeId = 'verdant_basin';

  shakeIntensity = 0;
  hitstopTimer = 0;
  swingProgress = 0;
  miningTimer = 0;
  lastMineKey = '';

  heldKeys = new Set<string>();
  pointerLocked = false;
  mouseHeldLeft = false;
  dragStart: { x: number; y: number; button: number; moved: boolean } | null = null;
  touchMove = { x: 0, y: 0 };
  touchJump = false;
  touchDescend = false;

  isTitlePreview = true;
  isPaused = false;
  titleAngle = 0;

  remotePlayers = new Map<string, RemotePlayerEntry>();
  netMoveTimer = 0;
  hudTimer = 0;
  toastMsg: string | null = null;
  toastTimer = 0;
  portalCharge = 0;
  portalCooldown = 0;
  portalBiomeIdx = 1;
  portalSwirlTimer = 0;

  clock = new THREE.Clock();
  elapsed = 0;
  frameId = 0;
  disposed = false;
  fpsFrames = 0;
  fpsAccum = 0;
  currentFps = 60;

  onOrientationChange = () => {
    this.onResize();
    window.setTimeout(this.onResize, 120);
  };

  onResize = () => {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    if (w <= 0 || h <= 0) return;
    const aspect = w / h;
    this.camera.aspect = aspect;
    this.camera.fov = aspect < 0.85 ? 82 : aspect > 1.95 ? 68 : 72;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  onWindowBlur = () => {
    this.heldKeys.clear();
    this.mouseHeldLeft = false;
    this.dragStart = null;
    this.touchMove.x = 0;
    this.touchMove.y = 0;
    this.touchJump = false;
    this.touchDescend = false;
  };

  onPointerLockChange = () => {
    this.pointerLocked = document.pointerLockElement === this.renderer.domElement;
    this.emitHud();
  };

  onContextMenu = (e: MouseEvent) => {
    e.preventDefault();
  };

  onMouseDown = (e: MouseEvent) => {
    if (this.isTitlePreview || this.isPaused) return;
    if (this.pointerLocked) {
      if (e.button === 0) {
        this.mouseHeldLeft = true;
        this.triggerPrimaryAction();
        this.miningTimer = 0;
      } else if (e.button === 2) {
        this.triggerSecondaryAction();
      }
    } else {
      this.dragStart = { x: e.clientX, y: e.clientY, button: e.button, moved: false };
      this.requestPointerLock();
    }
  };

  onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
      this.mouseHeldLeft = false;
      this.miningTimer = 0;
    }
    if (!this.pointerLocked && this.dragStart && !this.isTitlePreview && !this.isPaused && !this.dragStart.moved) {
      if (this.dragStart.button === 0) this.triggerPrimaryAction();
      else if (this.dragStart.button === 2) this.triggerSecondaryAction();
    }
    this.dragStart = null;
  };

  onMouseMove = (e: MouseEvent) => {
    if (this.isTitlePreview || this.isPaused) return;
    if (this.pointerLocked) {
      this.yaw -= e.movementX * 0.0022;
      this.pitch = THREE.MathUtils.clamp(this.pitch - e.movementY * 0.0022, -1.48, 1.48);
    } else if (this.dragStart) {
      const dx = e.clientX - this.dragStart.x;
      const dy = e.clientY - this.dragStart.y;
      if (Math.hypot(dx, dy) > 4) this.dragStart.moved = true;
      if (this.dragStart.moved) {
        this.yaw -= e.movementX * 0.0032;
        this.pitch = THREE.MathUtils.clamp(this.pitch - e.movementY * 0.0032, -1.48, 1.48);
      }
    }
  };

  onWheel = (e: WheelEvent) => {
    if (this.isTitlePreview || this.isPaused) return;
    const step = e.deltaY > 0 ? 1 : -1;
    this.selectHotbarSlot((this.selectedSlot + step + this.hotbar.length) % this.hotbar.length);
  };

  onKeyDown = (e: KeyboardEvent) => {
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    if (e.code === 'F11') {
      e.preventDefault();
      this.callbacks.onToggleFullscreen?.();
      return;
    }
    if (this.isTitlePreview) return;

    if (e.code === 'Escape') {
      this.callbacks.onPauseRequest?.();
      return;
    }
    if (e.code === 'KeyT' && !e.repeat) {
      this.setPaused(true);
      this.callbacks.onChatRequest?.();
      return;
    }
    if (e.code === 'KeyM' && !e.repeat) {
      this.callbacks.onToggleMicRequest?.();
      return;
    }
    if (e.code === 'KeyV' && !e.repeat) {
      this.callbacks.onPushToTalkChange?.(true);
      return;
    }
    if (e.code === 'KeyH' && !e.repeat) {
      this.callbacks.onToggleHud?.();
      return;
    }
    if (this.isPaused) return;

    this.heldKeys.add(e.code);
    if (e.code === 'Space') this.jumpBufferTimer = 0.14;
    if (e.code === 'KeyF' && !e.repeat) this.toggleFlyMode();
    if (e.code === 'KeyQ' && !e.repeat) this.triggerPrimaryAction();
    if (e.code === 'KeyE' && !e.repeat) this.triggerSecondaryAction();
    if (e.code === 'KeyP' && !e.repeat) this.buildPortalInFront();
    if (e.code.startsWith('Digit')) {
      const slot = Number(e.code.replace('Digit', ''));
      if (slot >= 1 && slot <= 9) this.selectHotbarSlot(slot - 1);
    }
  };

  onKeyUp = (e: KeyboardEvent) => {
    this.heldKeys.delete(e.code);
    if (e.code === 'KeyV') {
      this.callbacks.onPushToTalkChange?.(false);
    }
  };

  constructor(container: HTMLElement, callbacks: VoxelEngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;

    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const rendererStr = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(rendererStr);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    this.scene.background = new THREE.Color('#98d8e8');
    this.fog = new THREE.FogExp2('#9ad5e6', 0.0085);
    this.scene.fog = this.fog;

    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    const aspect = w / Math.max(1, h);
    this.camera = new THREE.PerspectiveCamera(aspect < 0.85 ? 82 : aspect > 1.95 ? 68 : 72, aspect, 0.1, 260);
    this.scene.add(this.camera);

    this.hemiLight = new THREE.HemisphereLight(0xbbe6ff, 0x3b4d36, 0.72);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff1d6, 1.55);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.near = 2;
    this.sunLight.shadow.camera.far = 110;
    this.sunLight.shadow.camera.left = -32;
    this.sunLight.shadow.camera.right = 32;
    this.sunLight.shadow.camera.top = 32;
    this.sunLight.shadow.camera.bottom = -32;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    this.sunMesh = new THREE.Mesh(
      new THREE.BoxGeometry(8, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xfef08a, fog: false })
    );
    this.scene.add(this.sunMesh);

    this.atlas = createAtlas(this.renderer.capabilities.getMaxAnisotropy());
    this.opaqueMat = new THREE.MeshStandardMaterial({
      map: this.atlas.albedoMap,
      emissiveMap: this.atlas.emissiveMap,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.5,
      vertexColors: true,
      roughness: 0.78,
      metalness: 0.08,
    });
    this.transparentMat = new THREE.MeshStandardMaterial({
      map: this.atlas.albedoMap,
      emissiveMap: this.atlas.emissiveMap,
      emissive: new THREE.Color('#c084fc'),
      emissiveIntensity: 0.75,
      vertexColors: true,
      transparent: true,
      opacity: 0.82,
      roughness: 0.14,
      metalness: 0.1,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.handRig = buildHandRig();
    this.handRig.group.position.set(0.38, -0.34, -0.52);
    this.handRig.group.rotation.set(0.1, -0.25, 0.05);
    this.handRig.group.visible = false;
    this.camera.add(this.handRig.group);

    this.highlightBox = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(1.006, 1.006, 1.006)),
      new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.9 })
    );
    this.highlightBox.visible = false;
    this.scene.add(this.highlightBox);

    const pGeo = new THREE.BoxGeometry(0.16, 0.16, 0.16);
    const pMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75 });
    this.particleMesh = new THREE.InstancedMesh(pGeo, pMat, 120);
    this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.particleMesh.frustumCulled = false;

    for (let i = 0; i < 120; i++) {
      this.particles.push({
        active: false,
        x: 0,
        y: -999,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
        maxLife: 0.5,
        scale: 1,
        color: new THREE.Color(0xffffff),
      });
      dummyObj.position.set(0, -999, 0);
      dummyObj.scale.setScalar(0.001);
      dummyObj.updateMatrix();
      this.particleMesh.setMatrixAt(i, dummyObj.matrix);
      this.particleMesh.setColorAt(i, targetCol.setHex(0xffffff));
    }
    this.particleMesh.instanceMatrix.needsUpdate = true;
    if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;
    this.scene.add(this.particleMesh);

    this.boltGeo = new THREE.BoxGeometry(0.18, 0.18, 0.36);
    this.boltMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xd97706,
      emissiveIntensity: 1.2,
      roughness: 0.2,
      metalness: 0.3,
    });
    for (let i = 0; i < 12; i++) {
      const mesh = new THREE.Mesh(this.boltGeo, this.boltMat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.bolts.push({
        active: false,
        mesh,
        pos: new THREE.Vector3(),
        vel: new THREE.Vector3(),
        life: 0,
        damage: 10,
      });
    }

    this.tntGeo = new THREE.BoxGeometry(0.98, 0.98, 0.98);
    this.tntMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      emissive: 0xf97316,
      emissiveIntensity: 0.35,
      roughness: 0.45,
      metalness: 0.1,
    });

    this.resizeObserver = new ResizeObserver(() => this.onResize());
    this.resizeObserver.observe(container);
    this.bindEvents();
    this.resetWorld(999);
    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
    this.tick();
  }

  setPreviewSeed(seed: number) {
    if (this.isTitlePreview && this.seed !== seed) {
      this.resetWorld(seed);
    }
  }

  showToast(msg: string) {
    this.toastMsg = msg;
    this.toastTimer = 3.2;
    this.emitHud();
  }

  setTitlePreviewMode(enabled: boolean) {
    this.isTitlePreview = enabled;
    this.handRig.group.visible = !enabled;
    this.highlightBox.visible = !enabled;
    if (enabled) {
      this.camera.rotation.order = 'XYZ';
    } else {
      this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
      this.handRig.setEquippedItem(this.hotbar[this.selectedSlot] ?? ToolId.IRON_SWORD);
    }
    if (enabled && document.pointerLockElement === this.renderer.domElement) {
      try {
        document.exitPointerLock?.();
      } catch {
        // ignore
      }
    }
  }

  setPaused(paused: boolean) {
    this.isPaused = paused;
    if (paused) {
      this.heldKeys.clear();
      this.mouseHeldLeft = false;
      this.dragStart = null;
      if (document.pointerLockElement === this.renderer.domElement) {
        try {
          document.exitPointerLock?.();
        } catch {
          // ignore
        }
      }
    }
  }

  requestPointerLock() {
    if (this.isTitlePreview || this.isPaused) return;
    try {
      const promise = this.renderer.domElement.requestPointerLock?.() as unknown as Promise<void> | undefined;
      if (promise && typeof promise.catch === 'function') {
        promise.catch(() => {});
      }
    } catch {
      // ignore
    }
  }

  setTouchMove(x: number, y: number) {
    this.touchMove.x = x;
    this.touchMove.y = y;
  }

  addLookDelta(dx: number, dy: number) {
    this.yaw -= dx * 0.0045;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * 0.0045, -1.48, 1.48);
  }

  triggerTouchJump(down: boolean) {
    if (down && !this.touchJump) {
      this.jumpBufferTimer = 0.14;
    }
    this.touchJump = down;
  }

  setTouchDescend(down: boolean) {
    this.touchDescend = down;
  }

  triggerPrimaryAction() {
    if (this.isDead || this.hardcoreSpectating) return;
    const itemId = this.hotbar[this.selectedSlot] ?? BlockId.STONE;
    const tool = getToolDef(itemId);
    const range = tool ? tool.range : 3.4;
    const creatureHit = this.raycastCreature(range);
    const voxelHit = this.raycastVoxel(6.5);
    const voxelDist = voxelHit
      ? Math.hypot(
          voxelHit.x + 0.5 - this.camera.position.x,
          voxelHit.y + 0.5 - this.camera.position.y,
          voxelHit.z + 0.5 - this.camera.position.z
        )
      : 999;

    if (creatureHit && creatureHit.dist <= voxelDist + 0.4) {
      this.attackCreature(creatureHit.creature, tool ? tool.damage : 7);
    } else if (tool?.kind === 'sword') {
      if (voxelHit && voxelHit.block.id === BlockId.TNT) {
        this.igniteTntAt(voxelHit.x, voxelHit.y, voxelHit.z);
        this.swingProgress = 1;
        return;
      }
      soundEngine.playSwordSlash();
      this.swingProgress = 1;
    } else if (voxelHit) {
      this.breakBlockAt(voxelHit.x, voxelHit.y, voxelHit.z);
    } else {
      this.swingProgress = 1;
    }
  }

  triggerSecondaryAction() {
    if (this.isDead || this.hardcoreSpectating) return;
    const itemId = this.hotbar[this.selectedSlot] ?? BlockId.STONE;
    const tool = getToolDef(itemId);

    const creatureHit = this.raycastCreature(6.2);
    if (creatureHit && creatureHit.creature.meta.friendlyAlly && !isEggId(itemId)) {
      this.interactWithFriendlyAlly(creatureHit.creature);
      return;
    }

    const voxelHit = this.raycastVoxel(6.5);
    if (tool) {
      if (voxelHit && voxelHit.block.id === BlockId.TNT) {
        this.igniteTntAt(voxelHit.x, voxelHit.y, voxelHit.z);
        this.swingProgress = 1;
        return;
      }
      if (tool.kind === 'sword' && this.sweepCooldown <= 0) {
        this.performSwordSweep(tool.damage * 0.78, tool.range);
      }
      return;
    }
    if (isEggId(itemId)) {
      this.useSpawnEgg(itemId);
      return;
    }
    if (voxelHit?.prev) {
      this.placeBlockAt(voxelHit.prev.x, voxelHit.prev.y, voxelHit.prev.z);
    }
  }

  useSpawnEgg(eggId: number) {
    const egg = getEggDef(eggId);
    if (!egg) return;
    if (this.worldRules !== 'creative') {
      const count = this.inventory.get(eggId) ?? 0;
      if (count <= 0) {
        this.showToast(`Out of ${egg.name}`);
        return;
      }
      if (count - 1 <= 0) this.inventory.delete(eggId);
      else this.inventory.set(eggId, count - 1);
    }

    const hit = this.raycastVoxel(7.5);
    let sx: number;
    let sy: number;
    let sz: number;
    if (hit?.prev) {
      sx = hit.prev.x + 0.5;
      sy = hit.prev.y + 0.05;
      sz = hit.prev.z + 0.5;
    } else {
      this.camera.getWorldDirection(creatureRayDir);
      sx = this.playerPos.x + creatureRayDir.x * 3.5;
      sz = this.playerPos.z + creatureRayDir.z * 3.5;
      sy = this.findSurfaceY(Math.floor(sx), Math.floor(sz));
    }

    this.spawnCreatureDirect(egg.species, sx, sy, sz, true);
    this.swingProgress = 1;
    soundEngine.playPlace();
    this.spawnBreakParticles(Math.floor(sx), Math.floor(sy + 0.5), Math.floor(sz), egg.spotColor);
    this.showToast(`Spawned ${CREATURE_META[egg.species].name}`);
    this.emitHud();
  }

  selectHotbarSlot(index: number) {
    if (index >= 0 && index < this.hotbar.length) {
      this.selectedSlot = index;
      this.handRig.setEquippedItem(this.hotbar[index]);
      this.emitHud();
    }
  }

  setHotbarBlock(index: number, itemId: number) {
    if (index >= 0 && index < this.hotbar.length) {
      this.hotbar[index] = itemId;
      this.selectedSlot = index;
      this.handRig.setEquippedItem(itemId);
      this.emitHud();
    }
  }

  craftAetherTool(toolId: number) {
    const def = getToolDef(toolId);
    if (!def || this.isDead || this.hardcoreSpectating) return;
    if (this.worldRules === 'creative' || (this.inventory.get(def.id) ?? 0) > 0) {
      this.setHotbarBlock(this.selectedSlot, def.id);
      this.showToast(`Equipped ${def.name}`);
      return;
    }
    const crystals = this.inventory.get(BlockId.AETHER_CRYSTAL) ?? 0;
    if (crystals < def.craftCrystalCost) {
      this.showToast(`Need ${def.craftCrystalCost} Aether Crystal to forge ${def.name}`);
      return;
    }
    const left = crystals - def.craftCrystalCost;
    if (left <= 0) this.inventory.delete(BlockId.AETHER_CRYSTAL);
    else this.inventory.set(BlockId.AETHER_CRYSTAL, left);
    this.inventory.set(def.id, 1);

    const slot = def.kind === 'sword' ? 0 : def.kind === 'pickaxe' ? 1 : 2;
    this.setHotbarBlock(slot, def.id);
    soundEngine.playBiomeDiscover();
    this.showToast(`Forged ${def.name}!`);
    this.emitHud();
  }

  toggleFlyMode() {
    if (this.worldRules !== 'creative' && !this.hardcoreSpectating) {
      this.showToast('Flight is Creative mode only');
      return;
    }
    this.flyMode = !this.flyMode;
    this.velocity.y = 0;
    this.showToast(this.flyMode ? 'Flight Stabilizers Engaged' : 'Gravity Physics Active');
    this.emitHud();
  }

  respawnPlayer() {
    if (this.worldRules === 'hardcore') return;
    this.isDead = false;
    this.health = 100;
    this.stamina = 100;
    if (this.seed === 999) {
      this.playerPos.set(0.5, 25.2, 8.5);
      this.yaw = 0;
    } else if (this.seed === 555) {
      this.playerPos.set(0.5, 25.2, 10.5);
      this.yaw = 0;
    } else if (this.seed === 777) {
      this.playerPos.set(2.5, 24.2, 12.5);
      this.yaw = 0;
    } else if (this.seed === 888) {
      this.playerPos.set(0.5, 31.2, 10.5);
      this.yaw = 0;
    } else if (this.seed === 666) {
      this.playerPos.set(0.5, 25.2, 8.5);
      this.yaw = 0;
    } else {
      const sy = this.findSurfaceY(8, 8);
      this.playerPos.set(8, sy + 2, 8);
    }
    this.velocity.set(0, 0, 0);
    this.showToast(
      this.seed === 999
        ? 'Respawned at Royal Square'
        : this.seed === 555
        ? 'Respawned at Village Mango Birds'
        : this.seed === 777
        ? 'Respawned at Volcano Ridge'
        : this.seed === 888
        ? 'Respawned at Cloudhaven Plaza'
        : this.seed === 666
        ? 'Respawned at Cyber Plaza'
        : 'Respawned at Frontier Beacon'
    );
    this.emitHud();
  }

  enterHardcoreSpectator() {
    if (this.worldRules !== 'hardcore') return;
    this.isDead = false;
    this.hardcoreSpectating = true;
    this.flyMode = true;
    this.velocity.set(0, 0, 0);
    this.showToast('Ghost Spectator Mode');
    this.emitHud();
  }

  initStarterInventory() {
    this.inventory.clear();
    this.inventory.set(ToolId.IRON_SWORD, 1);
    this.inventory.set(ToolId.IRON_PICKAXE, 1);
    this.inventory.set(ToolId.IRON_SHOVEL, 1);
    this.inventory.set(BlockId.GRASS, 8);
    this.inventory.set(BlockId.DIRT, 12);
    this.inventory.set(BlockId.STONE, 16);
    this.inventory.set(BlockId.WOOD, 16);
    this.inventory.set(BlockId.MANGO_PLANKS, 16);
    this.inventory.set(BlockId.TNT, 8);
    this.inventory.set(BlockId.MANGO_BLOCK, 8);
    this.inventory.set(BlockId.CLOUD_BLOCK, 12);
    this.inventory.set(BlockId.SKY_MARBLE, 8);
    this.inventory.set(BlockId.STEEL_PLATE, 12);
    this.inventory.set(BlockId.CIRCUIT_CORE, 6);
    this.inventory.set(BlockId.AETHER_CRYSTAL, 4);
    this.inventory.set(BlockId.PORTAL_FRAME, 10);
    this.inventory.set(201, 2); // SHEEP
    this.inventory.set(202, 2); // FOX
    this.inventory.set(211, 2); // SKY_GRIFFIN
    this.inventory.set(214, 2); // VILLAGER
    this.inventory.set(215, 2); // SCOUT_BOT
    this.inventory.set(219, 2); // ANDROID
    this.inventory.set(220, 1); // BIG_SCOUT_DROID
    this.inventory.set(221, 2); // MANGO_BIRD
    this.inventory.set(222, 2); // SUN_BIRD
  }

  resetWorld(
    seed: number,
    deltas?: [string, number][],
    playerPos?: [number, number, number],
    discoveredBiomes?: BiomeId[],
    timeOfDay?: number,
    worldRules: WorldRules = 'creative',
    inventoryEntries?: [number, number][],
    health?: number
  ) {
    for (const chunk of this.chunks.values()) {
      this.disposeChunkMeshes(chunk);
    }
    this.chunks.clear();
    this.deltas.clear();
    this.clearAllCreatures();
    this.clearPrimedTnts();

    this.seed = seed;
    this.worldRules = worldRules;
    this.isDead = false;
    this.hardcoreSpectating = false;
    this.flyMode = false;
    this.bossDefeated = false;
    this.bossGuardSummoned = false;

    this.hotbar = [...DEFAULT_HOTBAR];
    if (worldRules === 'creative') {
      this.hotbar[0] = ToolId.AETHER_SWORD;
      this.hotbar[1] = ToolId.AETHER_PICKAXE;
      this.hotbar[2] = ToolId.AETHER_SHOVEL;
    }

    if (deltas) {
      for (const [k, v] of deltas) this.deltas.set(k, v);
    }

    this.inventory.clear();
    if (inventoryEntries && inventoryEntries.length > 0) {
      for (const [k, v] of inventoryEntries) {
        if (v > 0) this.inventory.set(k, v);
      }
      if (worldRules !== 'creative') {
        if (!this.inventory.has(ToolId.IRON_SWORD) && !this.inventory.has(ToolId.AETHER_SWORD)) {
          this.inventory.set(ToolId.IRON_SWORD, 1);
        }
        if (!this.inventory.has(ToolId.IRON_PICKAXE) && !this.inventory.has(ToolId.AETHER_PICKAXE)) {
          this.inventory.set(ToolId.IRON_PICKAXE, 1);
        }
        if (!this.inventory.has(ToolId.IRON_SHOVEL) && !this.inventory.has(ToolId.AETHER_SHOVEL)) {
          this.inventory.set(ToolId.IRON_SHOVEL, 1);
        }
      }
    } else if (worldRules !== 'creative') {
      this.initStarterInventory();
    }

    this.discoveredBiomes = new Set(discoveredBiomes && discoveredBiomes.length > 0 ? discoveredBiomes : ['verdant_basin']);
    this.timeOfDay = timeOfDay ?? 0.28;
    this.health = typeof health === 'number' ? Math.max(1, Math.min(100, health)) : 100;
    this.stamina = 100;
    this.portalCharge = 0;
    this.portalCooldown = 0;

    if (playerPos) {
      this.playerPos.set(playerPos[0], playerPos[1], playerPos[2]);
    } else if (seed === 999) {
      this.playerPos.set(0.5, 25.2, 8.5);
      this.yaw = 0;
      this.pitch = -0.05;
    } else if (seed === 555) {
      this.playerPos.set(0.5, 25.2, 10.5);
      this.yaw = 0;
      this.pitch = -0.04;
    } else if (seed === 777) {
      this.playerPos.set(2.5, 24.2, 12.5);
      this.yaw = 0;
      this.pitch = 0.08;
    } else if (seed === 888) {
      this.playerPos.set(0.5, 31.2, 10.5);
      this.yaw = 0;
      this.pitch = 0.05;
    } else if (seed === 666) {
      this.playerPos.set(0.5, 25.2, 8.5);
      this.yaw = 0;
      this.pitch = 0.06;
    } else {
      this.playerPos.set(8, 36, 8);
    }

    this.velocity.set(0, 0, 0);
    this.updateChunksAround(this.playerPos.x, this.playerPos.z, true);

    if (!playerPos && seed !== 999 && seed !== 555 && seed !== 777 && seed !== 888 && seed !== 666) {
      const sy = this.findSurfaceY(Math.floor(this.playerPos.x), Math.floor(this.playerPos.z));
      this.playerPos.y = sy + 1.1;
    }

    if (seed === 555) {
      this.spawnMangoBoss();
      for (const [bx, bz] of [
        [-4.5, 6.5],
        [4.5, 6.5],
        [-3.5, 1.5],
        [3.5, 1.5],
        [-7.5, 4.5],
        [7.5, -2.5],
        [-11.5, 8.5],
        [11.5, 8.5],
        [-14.5, -4.5],
        [14.5, -4.5],
        [-5.5, -26.5],
        [5.5, -26.5],
      ]) {
        this.spawnCreatureDirect('mango_bird', bx, 25.1, bz, false);
      }
      for (const [sx, sz] of [
        [-6.5, 12.5],
        [6.5, 12.5],
        [-22.5, 0.5],
        [22.5, 0.5],
        [0.5, -18.5],
      ]) {
        this.spawnCreatureDirect('sun_bird', sx, sx === -22.5 || sx === 22.5 ? 31.1 : 25.1, sz, false);
      }
      for (const [vx, vz] of [
        [-6.5, -2.5],
        [6.5, -2.5],
        [13.5, 20.5],
        [-12.5, 18.5],
        [-3.5, -31.5],
        [3.5, -31.5],
      ]) {
        this.spawnCreatureDirect('villager', vx, 25.1, vz, false);
      }
    } else if (seed === 999) {
      this.spawnKingBoss();
      for (const [vx, vz] of [
        [-5.5, 6.5],
        [5.5, 6.5],
        [-12.5, 6.5],
        [12.5, 6.5],
        [-22.5, 6.5],
        [22.5, 6.5],
        [-4.5, -4.5],
        [4.5, -4.5],
        [-4.5, 18.5],
        [4.5, 18.5],
      ]) {
        this.spawnCreatureDirect('villager', vx, 25.1, vz, false);
      }
    } else if (seed === 777) {
      this.spawnVolcanoBoss();
      for (const [vx, vz] of [
        [-4.5, 8.5],
        [-4.5, 14.5],
        [0.5, 16.5],
        [5.5, 15.5],
        [-3.5, 18.5],
      ]) {
        this.spawnCreatureDirect('villager', vx, 24.1, vz, false);
      }
      for (let i = 0; i < 4; i++) this.trySpawnCreature(true, true);
    } else if (seed === 888) {
      this.spawnSkyBoss();
      for (const [vx, vz] of [
        [-6.5, 4.5],
        [6.5, 4.5],
        [-11.5, -9.5],
        [11.5, -1.5],
        [-6.5, -9.5],
        [-7.5, 13.5],
        [6.5, 15.5],
        [0.5, 29.5],
      ]) {
        this.spawnCreatureDirect('villager', vx, 31.1, vz, false);
      }
      this.spawnCreatureDirect('sky_griffin', -8.5, 31.1, 6.5, false);
      this.spawnCreatureDirect('sky_griffin', 14.5, 31.1, -2.5, false);
      this.spawnCreatureDirect('storm_wisp', -5.5, 35.1, -43.5, false);
      this.spawnCreatureDirect('storm_wisp', 6.5, 35.1, -43.5, false);
    } else if (seed === 666) {
      this.spawnRobotBoss();
      for (const [vx, vz] of [
        [-6.5, 6.5],
        [6.5, 6.5],
        [-8.5, 14.5],
        [8.5, 2.5],
      ]) {
        this.spawnCreatureDirect('villager', vx, 25.1, vz, false);
      }
      for (const [bx, bz] of [
        [-4.5, 10.5],
        [4.5, 10.5],
        [-13.5, 4.5],
        [13.5, 4.5],
        [-14.5, -6.5],
        [14.5, -6.5],
      ]) {
        this.spawnCreatureDirect('scout_bot', bx, 25.1, bz, false);
      }
      for (const [ax, az] of [
        [-4.5, 4.5],
        [4.5, 4.5],
        [-10.5, 8.5],
        [10.5, 8.5],
        [0.5, -2.5],
      ]) {
        this.spawnCreatureDirect('android', ax, 25.1, az, false);
      }
      for (const [dx, dz] of [
        [-7.5, 11.5],
        [7.5, 11.5],
        [0.5, -10.5],
      ]) {
        this.spawnCreatureDirect('big_scout_droid', dx, 25.1, dz, false);
      }
      for (const [lx, lz] of [
        [-16.5, -14.5],
        [16.5, -14.5],
        [-12.5, -24.5],
        [12.5, -24.5],
        [0.5, -20.5],
      ]) {
        this.spawnCreatureDirect('laser_drone', lx, 26.2, lz, false);
      }
      for (const [mx, mz] of [
        [-10.5, -18.5],
        [10.5, -18.5],
        [-8.5, -30.5],
        [8.5, -30.5],
      ]) {
        this.spawnCreatureDirect('mecha_trooper', mx, 25.1, mz, false);
      }
    }

    for (let i = 0; i < 4; i++) this.trySpawnCreature(false);
    if (this.isNightTime()) {
      for (let i = 0; i < 3; i++) this.trySpawnCreature(true);
    }

    this.handRig.setEquippedItem(this.hotbar[this.selectedSlot] ?? ToolId.IRON_SWORD);
    this.emitHud();
  }

  setLocalSkin(skin: PlayerSkin) {
    this.handRig.setHandSkin(skin);
  }

  syncRemotePlayers(players: RemotePlayer[]) {
    const active = new Set(players.map((p) => p.id));
    for (const [id, entry] of this.remotePlayers.entries()) {
      if (!active.has(id)) {
        this.scene.remove(entry.rig.root);
        entry.rig.dispose();
        this.remotePlayers.delete(id);
      }
    }
    for (const p of players) this.upsertRemotePlayer(p);
  }

  upsertRemotePlayer(p: RemotePlayer) {
    const sig = skinSignature(p.skin);
    let entry = this.remotePlayers.get(p.id);
    if (entry && entry.skinSig !== sig) {
      this.scene.remove(entry.rig.root);
      entry.rig.dispose();
      this.remotePlayers.delete(p.id);
      entry = undefined;
    }
    if (!entry) {
      const rig = createRemotePlayerMesh(p.name, p.color, p.skin);
      rig.root.position.set(p.x, p.y, p.z);
      rig.setVoiceState?.(Boolean(p.micActive), Boolean(p.speaking));
      this.scene.add(rig.root);
      this.remotePlayers.set(p.id, {
        rig,
        skinSig: sig,
        targetPos: new THREE.Vector3(p.x, p.y, p.z),
        targetYaw: p.yaw,
        heldBlock: p.heldBlock,
        walkPhase: 0,
      });
    } else {
      entry.targetPos.set(p.x, p.y, p.z);
      entry.targetYaw = p.yaw;
      if (typeof p.micActive === 'boolean' || typeof p.speaking === 'boolean') {
        entry.rig.setVoiceState?.(Boolean(p.micActive), Boolean(p.speaking));
      }
      if (entry.heldBlock !== p.heldBlock) {
        entry.heldBlock = p.heldBlock;
        const tool = isToolId(p.heldBlock) ? getToolDef(p.heldBlock) : undefined;
        const egg = isEggId(p.heldBlock) ? getEggDef(p.heldBlock) : undefined;
        const col = tool ? tool.colorPrimary : egg ? egg.primaryColor : getBlock(p.heldBlock).colorTop;
        (entry.rig.heldMesh.material as THREE.MeshStandardMaterial).color.set(col);
      }
    }
  }

  setRemotePlayerVoice(id: string, micActive: boolean, speaking: boolean) {
    const entry = this.remotePlayers.get(id);
    entry?.rig.setVoiceState?.(micActive, speaking);
  }

  runChatCommand(raw: string): string | null {
    const trimmed = raw.trim();
    if (!trimmed.startsWith('/')) return null;
    const parts = trimmed.slice(1).toLowerCase().split(/\s+/);
    const cmd = parts[0];
    const arg = parts[1];

    if (cmd === 'help') {
      return 'Commands: /heal, /time day|night, /fly, /tnt, /birds, /coords';
    }
    if (cmd === 'coords') {
      return `Coords: X=${Math.floor(this.playerPos.x)} Y=${Math.floor(this.playerPos.y)} Z=${Math.floor(this.playerPos.z)} · Seed ${this.seed}`;
    }
    if (cmd === 'heal') {
      this.health = this.maxHealth;
      this.stamina = 100;
      this.emitHud();
      return 'Restored full Health & Stamina!';
    }
    if (cmd === 'time') {
      if (arg === 'night') {
        this.timeOfDay = 0.85;
        this.emitHud();
        return 'Time set to Night.';
      }
      this.timeOfDay = 0.28;
      this.emitHud();
      return 'Time set to Day.';
    }
    if (cmd === 'fly') {
      if (this.worldRules !== 'creative') {
        return 'Fly mode is only available in Creative worlds.';
      }
      this.toggleFlyMode();
      return this.flyMode ? 'Flight enabled.' : 'Flight disabled.';
    }
    if (cmd === 'tnt') {
      if (this.worldRules === 'creative') {
        return 'Creative mode already has infinite TNT in slot 6.';
      }
      this.inventory.set(BlockId.TNT, (this.inventory.get(BlockId.TNT) ?? 0) + 8);
      this.emitHud();
      return 'Added +8 TNT to your inventory!';
    }
    if (cmd === 'birds') {
      const px = this.playerPos.x;
      const pz = this.playerPos.z;
      this.spawnCreatureDirect('mango_bird', px + 2, this.playerPos.y + 0.5, pz - 2, false);
      this.spawnCreatureDirect('sun_bird', px - 2, this.playerPos.y + 0.5, pz - 2, false);
      return 'Summoned a friendly Mango Bird & Suncrest Bird nearby!';
    }
    return `Unknown command "/${cmd}". Try /help.`;
  }

  removeRemotePlayer(id: string) {
    const entry = this.remotePlayers.get(id);
    if (entry) {
      this.scene.remove(entry.rig.root);
      entry.rig.dispose();
      this.remotePlayers.delete(id);
    }
  }

  findSurfaceY(wx: number, wz: number): number {
    for (let y = 62; y >= 1; y--) {
      const id = this.getBlockAt(wx, y, wz);
      if (id === BlockId.WATER || getBlock(id).solid) return y + 1;
    }
    return 26;
  }

  getBlockAt(wx: number, wy: number, wz: number): number {
    if (wy < 0 || wy >= 64) return BlockId.AIR;
    const cx = Math.floor(wx / 16);
    const cz = Math.floor(wz / 16);
    const chunk = this.chunks.get(chunkKey(cx, cz));
    if (!chunk) return this.deltas.get(voxelKey(wx, wy, wz)) ?? BlockId.AIR;
    const lx = ((wx % 16) + 16) % 16;
    const lz = ((wz % 16) + 16) % 16;
    return chunk.data[(wy * 16 + lz) * 16 + lx];
  }

  setBlockAt(wx: number, wy: number, wz: number, id: number, silent = false) {
    if (wy <= 0 || wy >= 64) return;
    const cx = Math.floor(wx / 16);
    const cz = Math.floor(wz / 16);
    this.deltas.set(voxelKey(wx, wy, wz), id);
    const chunk = this.chunks.get(chunkKey(cx, cz));
    const lx = ((wx % 16) + 16) % 16;
    const lz = ((wz % 16) + 16) % 16;
    if (chunk) {
      chunk.data[(wy * 16 + lz) * 16 + lx] = id;
      chunk.dirty = true;
    }
    if (lx === 0) this.markDirty(cx - 1, cz);
    if (lx === 15) this.markDirty(cx + 1, cz);
    if (lz === 0) this.markDirty(cx, cz - 1);
    if (lz === 15) this.markDirty(cx, cz + 1);
    if (!silent) this.callbacks.onBlockSet?.(wx, wy, wz, id);
  }

  markDirty(cx: number, cz: number) {
    const chunk = this.chunks.get(chunkKey(cx, cz));
    if (chunk) chunk.dirty = true;
  }

  disposeChunkMeshes(chunk: ChunkEntry) {
    if (chunk.opaqueMesh) {
      this.scene.remove(chunk.opaqueMesh);
      chunk.opaqueMesh.geometry.dispose();
      chunk.opaqueMesh = null;
    }
    if (chunk.transparentMesh) {
      this.scene.remove(chunk.transparentMesh);
      chunk.transparentMesh.geometry.dispose();
      chunk.transparentMesh = null;
    }
  }

  updateChunksAround(px: number, pz: number, immediate = false) {
    const pcx = Math.floor(px / 16);
    const pcz = Math.floor(pz / 16);
    const rd = this.renderDistance;

    for (const [k, chunk] of this.chunks.entries()) {
      if (Math.abs(chunk.cx - pcx) > rd + 1 || Math.abs(chunk.cz - pcz) > rd + 1) {
        this.disposeChunkMeshes(chunk);
        this.chunks.delete(k);
      }
    }

    for (let dz = -rd; dz <= rd; dz++) {
      for (let dx = -rd; dx <= rd; dx++) {
        const cx = pcx + dx;
        const cz = pcz + dz;
        const key = chunkKey(cx, cz);
        if (!this.chunks.has(key)) {
          const data = generateChunkData(cx, cz, this.seed, this.deltas);
          this.chunks.set(key, {
            cx,
            cz,
            data,
            opaqueMesh: null,
            transparentMesh: null,
            dirty: true,
          });
        }
      }
    }

    let rebuilt = 0;
    const limit = immediate ? 999 : 3;
    for (const chunk of this.chunks.values()) {
      if (chunk.dirty) {
        this.rebuildChunkMesh(chunk);
        rebuilt++;
        if (rebuilt >= limit) break;
      }
    }
  }

  rebuildChunkMesh(chunk: ChunkEntry) {
    this.disposeChunkMeshes(chunk);
    const { opaqueGeo, transparentGeo } = buildChunkGeometry(
      chunk.cx,
      chunk.cz,
      (x, y, z) => this.getBlockAt(x, y, z),
      chunk.data
    );
    if (opaqueGeo) {
      const mesh = new THREE.Mesh(opaqueGeo, this.opaqueMat);
      mesh.position.set(chunk.cx * 16, 0, chunk.cz * 16);
      mesh.castShadow = !this.isSoftwareGl;
      mesh.receiveShadow = !this.isSoftwareGl;
      this.scene.add(mesh);
      chunk.opaqueMesh = mesh;
    }
    if (transparentGeo) {
      const mesh = new THREE.Mesh(transparentGeo, this.transparentMat);
      mesh.position.set(chunk.cx * 16, 0, chunk.cz * 16);
      mesh.renderOrder = 2;
      this.scene.add(mesh);
      chunk.transparentMesh = mesh;
    }
    chunk.dirty = false;
  }

  raycastVoxel(maxDist = 6.5) {
    const ox = this.camera.position.x;
    const oy = this.camera.position.y;
    const oz = this.camera.position.z;
    this.camera.getWorldDirection(rayDir);
    const dx = rayDir.x;
    const dy = rayDir.y;
    const dz = rayDir.z;

    let vx = Math.floor(ox);
    let vy = Math.floor(oy);
    let vz = Math.floor(oz);

    const stepX = dx >= 0 ? 1 : -1;
    const stepY = dy >= 0 ? 1 : -1;
    const stepZ = dz >= 0 ? 1 : -1;

    const tDeltaX = dx === 0 ? 1e6 : Math.abs(1 / dx);
    const tDeltaY = dy === 0 ? 1e6 : Math.abs(1 / dy);
    const tDeltaZ = dz === 0 ? 1e6 : Math.abs(1 / dz);

    let tMaxX = dx >= 0 ? (vx + 1 - ox) * tDeltaX : (ox - vx) * tDeltaX;
    let tMaxY = dy >= 0 ? (vy + 1 - oy) * tDeltaY : (oy - vy) * tDeltaY;
    let tMaxZ = dz >= 0 ? (vz + 1 - oz) * tDeltaZ : (oz - vz) * tDeltaZ;

    let prev: { x: number; y: number; z: number } | null = null;
    let dist = 0;
    while (dist < maxDist) {
      const id = this.getBlockAt(vx, vy, vz);
      const def = getBlock(id);
      if (id !== BlockId.AIR && !def.liquid) {
        return { x: vx, y: vy, z: vz, prev, block: def };
      }
      prev = { x: vx, y: vy, z: vz };
      if (tMaxX < tMaxY) {
        if (tMaxX < tMaxZ) {
          dist = tMaxX;
          tMaxX += tDeltaX;
          vx += stepX;
        } else {
          dist = tMaxZ;
          tMaxZ += tDeltaZ;
          vz += stepZ;
        }
      } else if (tMaxY < tMaxZ) {
        dist = tMaxY;
        tMaxY += tDeltaY;
        vy += stepY;
      } else {
        dist = tMaxZ;
        tMaxZ += tDeltaZ;
        vz += stepZ;
      }
    }
    return null;
  }

  spawnBreakParticles(bx: number, by: number, bz: number, hexColor: string) {
    let count = 0;
    for (let i = 0; i < this.particles.length && count < 14; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        p.x = bx + 0.25 + Math.random() * 0.5;
        p.y = by + 0.25 + Math.random() * 0.5;
        p.z = bz + 0.25 + Math.random() * 0.5;
        p.vx = (Math.random() - 0.5) * 4.5;
        p.vy = 1.8 + Math.random() * 3.8;
        p.vz = (Math.random() - 0.5) * 4.5;
        p.maxLife = 0.38 + Math.random() * 0.25;
        p.life = p.maxLife;
        p.scale = 0.7 + Math.random() * 0.6;
        p.color.set(hexColor);
        this.particleMesh.setColorAt(i, p.color);
        count++;
      }
    }
    if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;
  }

  breakBlockAt(wx: number, wy: number, wz: number) {
    if (wy <= 0 || this.isDead || this.hardcoreSpectating) return;
    const id = this.getBlockAt(wx, wy, wz);
    if (id === BlockId.AIR) return;
    const def = getBlock(id);
    this.setBlockAt(wx, wy, wz, BlockId.AIR);
    this.spawnBreakParticles(wx, wy, wz, def.colorTop);
    soundEngine.playBreak(def.hardness);
    this.swingProgress = 1;
    this.shakeIntensity = Math.max(this.shakeIntensity, 0.045);
    this.hitstopTimer = 0.032;

    if (this.worldRules !== 'creative') {
      if (id !== BlockId.PORTAL_RIFT && id !== BlockId.WATER) {
        this.inventory.set(id, (this.inventory.get(id) ?? 0) + 1);
      }
      if (
        this.worldRules === 'hardcore' &&
        (id === BlockId.AETHER_CRYSTAL || id === BlockId.GLOW_SPORE) &&
        this.health < this.maxHealth
      ) {
        this.health = Math.min(this.maxHealth, this.health + 8);
        this.showToast('+8 HP Crystal Essence');
      }
    }
    this.emitHud();
  }

  placeBlockAt(wx: number, wy: number, wz: number) {
    if (wy <= 0 || wy >= 64 || this.isDead || this.hardcoreSpectating) return;
    const itemId = this.hotbar[this.selectedSlot] ?? BlockId.STONE;
    if (isToolId(itemId)) return;
    const def = getBlock(itemId);

    if (this.worldRules !== 'creative' && (this.inventory.get(itemId) ?? 0) <= 0) {
      this.showToast(`Out of ${def.name} — mine blocks to gather`);
      return;
    }

    if (def.solid) {
      const px = this.playerPos.x;
      const py = this.playerPos.y;
      const pz = this.playerPos.z;
      const overlapX = px + 0.3 > wx && px - 0.3 < wx + 1;
      const overlapY = py + 1.72 > wy && py < wy + 1;
      const overlapZ = pz + 0.3 > wz && pz - 0.3 < wz + 1;
      if (overlapX && overlapY && overlapZ) return;
    }

    if (this.worldRules !== 'creative') {
      const left = (this.inventory.get(itemId) ?? 1) - 1;
      if (left <= 0) this.inventory.delete(itemId);
      else this.inventory.set(itemId, left);
    }

    this.setBlockAt(wx, wy, wz, itemId);
    soundEngine.playPlace(def.hardness);
    this.swingProgress = 0.75;
    if (
      itemId === BlockId.AETHER_CRYSTAL ||
      itemId === BlockId.MAGMA ||
      itemId === BlockId.PORTAL_RIFT ||
      itemId === BlockId.PORTAL_FRAME ||
      itemId === BlockId.OBSIDIAN
    ) {
      this.tryIgnitePortalAround(wx, wy, wz, itemId);
    }
    this.emitHud();
  }

  buildPortalInFront() {
    if (this.isDead || this.hardcoreSpectating) return;
    if (this.worldRules !== 'creative') {
      const frames = this.inventory.get(BlockId.PORTAL_FRAME) ?? 0;
      const crystals = this.inventory.get(BlockId.AETHER_CRYSTAL) ?? 0;
      if (frames < 10 || crystals < 1) {
        this.showToast('Need 10 Rift Frame & 1 Aether Crystal (or place manually)');
        return;
      }
      const leftF = frames - 10;
      if (leftF <= 0) this.inventory.delete(BlockId.PORTAL_FRAME);
      else this.inventory.set(BlockId.PORTAL_FRAME, leftF);
      const leftC = crystals - 1;
      if (leftC <= 0) this.inventory.delete(BlockId.AETHER_CRYSTAL);
      else this.inventory.set(BlockId.AETHER_CRYSTAL, leftC);
    }

    const dirX = -Math.sin(this.yaw);
    const dirZ = -Math.cos(this.yaw);
    const alignX = Math.abs(dirZ) >= Math.abs(dirX);
    const bx = Math.round(this.playerPos.x + dirX * 3);
    const bz = Math.round(this.playerPos.z + dirZ * 3);
    const by = Math.max(1, Math.min(57, Math.floor(this.playerPos.y)));

    if (alignX) {
      for (let dx = -2; dx <= 3; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          this.setBlockAt(bx + dx, by - 1, bz + dz, dx === -2 || dx === 3 ? BlockId.STONE : BlockId.AETHER_CRYSTAL);
          for (let y = by; y <= by + 5; y++) this.setBlockAt(bx + dx, y, bz + dz, BlockId.AIR);
        }
      }
      for (let dy = 0; dy <= 4; dy++) {
        for (let dx = -1; dx <= 2; dx++) {
          const frame = dy === 0 || dy === 4 || dx === -1 || dx === 2;
          const b = frame ? BlockId.PORTAL_FRAME : BlockId.PORTAL_RIFT;
          this.setBlockAt(bx + dx, by + dy, bz, b);
          if (!frame) this.spawnPortalParticle(bx + dx + 0.5, by + dy + 0.5, bz + 0.5, true);
        }
      }
    } else {
      for (let dz = -2; dz <= 3; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          this.setBlockAt(bx + dx, by - 1, bz + dz, dz === -2 || dz === 3 ? BlockId.STONE : BlockId.AETHER_CRYSTAL);
          for (let y = by; y <= by + 5; y++) this.setBlockAt(bx + dx, y, bz + dz, BlockId.AIR);
        }
      }
      for (let dy = 0; dy <= 4; dy++) {
        for (let dz = -1; dz <= 2; dz++) {
          const frame = dy === 0 || dy === 4 || dz === -1 || dz === 2;
          const b = frame ? BlockId.PORTAL_FRAME : BlockId.PORTAL_RIFT;
          this.setBlockAt(bx, by + dy, bz + dz, b);
          if (!frame) this.spawnPortalParticle(bx + 0.5, by + dy + 0.5, bz + dz + 0.5, true);
        }
      }
    }
    soundEngine.playPortalWarp();
    this.showToast('Biome Portal Built Ahead!');
    this.emitHud();
  }

  isPortalFrameBlock(id: number): boolean {
    return id === BlockId.OBSIDIAN || id === BlockId.PORTAL_FRAME;
  }

  tryIgnitePortalInPlane(wx: number, wy: number, wz: number, axis: 'x' | 'z'): boolean {
    const startId = this.getBlockAt(wx, wy, wz);
    if (
      startId !== BlockId.AIR &&
      startId !== BlockId.AETHER_CRYSTAL &&
      startId !== BlockId.MAGMA &&
      startId !== BlockId.PORTAL_RIFT
    ) {
      return false;
    }

    const u0 = axis === 'x' ? wx : wz;
    const getPlane = (u: number, y: number) =>
      axis === 'x' ? this.getBlockAt(u, y, wz) : this.getBlockAt(wx, y, u);
    const setPlane = (u: number, y: number, id: number) => {
      if (axis === 'x') this.setBlockAt(u, y, wz, id);
      else this.setBlockAt(wx, y, u, id);
    };
    const isInterior = (id: number) =>
      id === BlockId.AIR ||
      id === BlockId.PORTAL_RIFT ||
      id === BlockId.AETHER_CRYSTAL ||
      id === BlockId.MAGMA;

    let minU = u0;
    let foundMinU = false;
    for (let i = 1; i <= 7; i++) {
      const b = getPlane(u0 - i, wy);
      if (this.isPortalFrameBlock(b)) {
        minU = u0 - i;
        foundMinU = true;
        break;
      }
      if (!isInterior(b)) return false;
    }
    if (!foundMinU) return false;

    let maxU = u0;
    let foundMaxU = false;
    for (let i = 1; i <= 7; i++) {
      const b = getPlane(u0 + i, wy);
      if (this.isPortalFrameBlock(b)) {
        maxU = u0 + i;
        foundMaxU = true;
        break;
      }
      if (!isInterior(b)) return false;
    }
    if (!foundMaxU) return false;

    const width = maxU - minU - 1;
    if (width < 1 || width > 6) return false;

    let minY = wy;
    let foundMinY = false;
    for (let i = 1; i <= 7; i++) {
      const b = getPlane(u0, wy - i);
      if (this.isPortalFrameBlock(b)) {
        minY = wy - i;
        foundMinY = true;
        break;
      }
      if (!isInterior(b)) return false;
    }
    if (!foundMinY) return false;

    let maxY = wy;
    let foundMaxY = false;
    for (let i = 1; i <= 7; i++) {
      const b = getPlane(u0, wy + i);
      if (this.isPortalFrameBlock(b)) {
        maxY = wy + i;
        foundMaxY = true;
        break;
      }
      if (!isInterior(b)) return false;
    }
    if (!foundMaxY) return false;

    const height = maxY - minY - 1;
    if (height < 2 || height > 6) return false;

    for (let u = minU + 1; u <= maxU - 1; u++) {
      if (!this.isPortalFrameBlock(getPlane(u, minY)) || !this.isPortalFrameBlock(getPlane(u, maxY))) {
        return false;
      }
    }
    for (let y = minY + 1; y <= maxY - 1; y++) {
      if (!this.isPortalFrameBlock(getPlane(minU, y)) || !this.isPortalFrameBlock(getPlane(maxU, y))) {
        return false;
      }
    }
    for (let u = minU + 1; u <= maxU - 1; u++) {
      for (let y = minY + 1; y <= maxY - 1; y++) {
        if (!isInterior(getPlane(u, y))) return false;
      }
    }

    for (let u = minU + 1; u <= maxU - 1; u++) {
      for (let y = minY + 1; y <= maxY - 1; y++) {
        setPlane(u, y, BlockId.PORTAL_RIFT);
        if (axis === 'x') this.spawnPortalParticle(u + 0.5, y + 0.5, wz + 0.5, true);
        else this.spawnPortalParticle(wx + 0.5, y + 0.5, u + 0.5, true);
      }
    }
    soundEngine.playPortalWarp();
    this.showToast('Biome Portal Ignited!');
    return true;
  }

  tryIgnitePortalAround(wx: number, wy: number, wz: number, placedId: number) {
    if (
      placedId === BlockId.AETHER_CRYSTAL ||
      placedId === BlockId.MAGMA ||
      placedId === BlockId.PORTAL_RIFT
    ) {
      if (this.tryIgnitePortalInPlane(wx, wy, wz, 'x') || this.tryIgnitePortalInPlane(wx, wy, wz, 'z')) {
        return;
      }
    } else {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dz = -1; dz <= 1; dz++) {
            if (dx === 0 && dy === 0 && dz === 0) continue;
            const nx = wx + dx;
            const ny = wy + dy;
            const nz = wz + dz;
            if (this.getBlockAt(nx, ny, nz) === BlockId.AIR) {
              if (this.tryIgnitePortalInPlane(nx, ny, nz, 'x') || this.tryIgnitePortalInPlane(nx, ny, nz, 'z')) {
                return;
              }
            }
          }
        }
      }
    }
  }

  spawnPortalParticle(x: number, y: number, z: number, burst = false) {
    const target = burst ? 4 : 1;
    let spawned = 0;
    for (let i = 0; i < this.particles.length && spawned < target; i++) {
      const p = this.particles[i];
      if (!p.active) {
        p.active = true;
        p.x = x + (Math.random() - 0.5) * 0.7;
        p.y = y + (Math.random() - 0.5) * 0.7;
        p.z = z + (Math.random() - 0.5) * 0.7;
        p.vx = (Math.random() - 0.5) * (burst ? 3.8 : 1.1);
        p.vy = (burst ? 2.5 : 1.8) + Math.random() * 2.2;
        p.vz = (Math.random() - 0.5) * (burst ? 3.8 : 1.1);
        p.maxLife = burst ? 0.55 : 0.42;
        p.life = p.maxLife;
        p.scale = burst ? 0.95 : 0.65;
        p.color.set(Math.random() > 0.35 ? '#c084fc' : '#38bdf8');
        this.particleMesh.setColorAt(i, p.color);
        spawned++;
      }
    }
    if (spawned > 0 && this.particleMesh.instanceColor) {
      this.particleMesh.instanceColor.needsUpdate = true;
    }
  }

  getTargetPortalBiome() {
    const candidate = BIOME_LIST[this.portalBiomeIdx % BIOME_LIST.length];
    return candidate.id === this.currentBiome
      ? BIOME_LIST[(this.portalBiomeIdx + 1) % BIOME_LIST.length]
      : candidate;
  }

  updatePortalLogic(dt: number) {
    if (this.portalCooldown > 0) this.portalCooldown = Math.max(0, this.portalCooldown - dt);
    this.portalSwirlTimer += dt;
    if (this.portalSwirlTimer >= 0.16) {
      this.portalSwirlTimer = 0;
      const px = Math.floor(this.playerPos.x);
      const py = Math.floor(this.playerPos.y);
      const pz = Math.floor(this.playerPos.z);
      let count = 0;
      for (let dx = -7; dx <= 7 && count < 3; dx++) {
        for (let dz = -7; dz <= 7 && count < 3; dz++) {
          for (let dy = -2; dy <= 5 && count < 3; dy++) {
            if (this.getBlockAt(px + dx, py + dy, pz + dz) === BlockId.PORTAL_RIFT && Math.random() < 0.25) {
              this.spawnPortalParticle(px + dx + 0.5, py + dy + 0.5, pz + dz + 0.5, false);
              count++;
            }
          }
        }
      }
    }

    const px = this.playerPos.x;
    const py = this.playerPos.y;
    const pz = this.playerPos.z;
    let inRift = false;
    for (const [ox, oz] of [
      [0, 0],
      [0.24, 0],
      [-0.24, 0],
      [0, 0.24],
      [0, -0.24],
    ]) {
      const gx = Math.floor(px + ox);
      const gz = Math.floor(pz + oz);
      if (
        this.getBlockAt(gx, Math.floor(py + 0.35), gz) === BlockId.PORTAL_RIFT ||
        this.getBlockAt(gx, Math.floor(py + 1.15), gz) === BlockId.PORTAL_RIFT
      ) {
        inRift = true;
        break;
      }
    }

    if (inRift && this.portalCooldown <= 0) {
      this.portalCharge = Math.min(1, this.portalCharge + dt / 0.7);
      this.shakeIntensity = Math.max(this.shakeIntensity, 0.025 * this.portalCharge);
      this.spawnPortalParticle(px, py + 1, pz, true);
      if (this.portalCharge >= 1) this.executePortalWarp();
    } else {
      this.portalCharge = Math.max(0, this.portalCharge - dt * 2.5);
    }
  }

  executePortalWarp() {
    const dest = this.getTargetPortalBiome();
    const ox = Math.round(this.playerPos.x);
    const oz = Math.round(this.playerPos.z);
    let tx = ox + 160;
    let tz = oz + 160;
    let found = false;

    for (let r = 48; r <= 560 && !found; r += 16) {
      for (let d = -r; d <= r && !found; d += 16) {
        for (const edge of [-r, r]) {
          if (
            getBiomeAt(ox + d, oz + edge, this.seed) === dest.id &&
            getBiomeAt(ox + d + 4, oz + edge + 4, this.seed) === dest.id
          ) {
            tx = ox + d;
            tz = oz + edge;
            found = true;
            break;
          }
        }
      }
      for (let d = -r + 16; d <= r - 16 && !found; d += 16) {
        for (const edge of [-r, r]) {
          if (
            getBiomeAt(ox + edge, oz + d, this.seed) === dest.id &&
            getBiomeAt(ox + edge + 4, oz + d + 4, this.seed) === dest.id
          ) {
            tx = ox + edge;
            tz = oz + d;
            found = true;
            break;
          }
        }
      }
    }

    this.updateChunksAround(tx, tz, true);
    const sy = Math.max(19, this.findSurfaceY(tx, tz));
    for (let dx = -2; dx <= 3; dx++) {
      for (let dz = -3; dz <= 2; dz++) {
        this.setBlockAt(
          tx + dx,
          sy - 1,
          tz + dz,
          dx === -2 || dx === 3 || dz === -3 || dz === 2 ? BlockId.STONE : BlockId.AETHER_CRYSTAL
        );
        for (let y = sy; y <= sy + 6; y++) this.setBlockAt(tx + dx, y, tz + dz, BlockId.AIR);
      }
    }
    for (let dy = 0; dy <= 4; dy++) {
      for (let dx = -1; dx <= 2; dx++) {
        const frame = dy === 0 || dy === 4 || dx === -1 || dx === 2;
        this.setBlockAt(tx + dx, sy + dy, tz - 2, frame ? BlockId.PORTAL_FRAME : BlockId.PORTAL_RIFT);
      }
    }

    this.playerPos.set(tx + 0.5, sy + 0.5, tz + 0.8);
    this.velocity.set(0, 0, 0);
    this.currentBiome = dest.id;
    this.discoveredBiomes.add(dest.id);
    const idx = BIOME_LIST.findIndex((b) => b.id === dest.id);
    this.portalBiomeIdx = ((idx >= 0 ? idx : this.portalBiomeIdx) + 1) % BIOME_LIST.length;
    this.portalCharge = 0;
    this.portalCooldown = 3.2;
    this.shakeIntensity = 0.08;
    soundEngine.playPortalWarp();
    this.showToast(`Warped to ${dest.name}!`);
    for (let i = 0; i < 6; i++) {
      this.spawnPortalParticle(this.playerPos.x, this.playerPos.y + 1, this.playerPos.z, true);
    }
    this.emitHud();
  }

  bindEvents() {
    window.addEventListener('resize', this.onResize);
    window.addEventListener('orientationchange', this.onOrientationChange);
    window.visualViewport?.addEventListener('resize', this.onResize);
    window.addEventListener('blur', this.onWindowBlur);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    window.addEventListener('wheel', this.onWheel, { passive: true });
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDown);
    this.renderer.domElement.addEventListener('contextmenu', this.onContextMenu);
  }

  collidesAt(px: number, py: number, pz: number): boolean {
    const r = 0.28;
    const x0 = Math.floor(px - r);
    const x1 = Math.floor(px + r);
    const y0 = Math.floor(py + 0.02);
    const y1 = Math.floor(py + 1.72);
    const z0 = Math.floor(pz - r);
    const z1 = Math.floor(pz + r);
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        for (let z = z0; z <= z1; z++) {
          const id = this.getBlockAt(x, y, z);
          if (id !== BlockId.AIR && getBlock(id).solid) return true;
        }
      }
    }
    return false;
  }

  applyDamage(amount: number, source: string) {
    if (this.worldRules === 'creative' || this.isDead || this.hardcoreSpectating || amount <= 0) return;
    this.health = Math.max(0, this.health - amount);
    this.shakeIntensity = Math.max(this.shakeIntensity, 0.06);
    soundEngine.playPlayerHurt();
    if (this.health <= 0) {
      this.health = 0;
      this.isDead = true;
      this.mouseHeldLeft = false;
      this.heldKeys.clear();
      this.showToast(`${source} — ${this.worldRules === 'hardcore' ? 'Hardcore Run Ended' : 'You Fell!'}`);
      if (document.pointerLockElement === this.renderer.domElement) {
        try {
          document.exitPointerLock?.();
        } catch {
          // ignore
        }
      }
      this.emitHud();
    }
  }

  updatePhysics(dt: number) {
    if (this.isDead) return;

    const biomeId = getBiomeAt(this.playerPos.x, this.playerPos.z, this.seed);
    if (biomeId !== this.currentBiome) {
      this.currentBiome = biomeId;
      if (!this.discoveredBiomes.has(biomeId)) {
        this.discoveredBiomes.add(biomeId);
        soundEngine.playBiomeDiscover();
        this.showToast(`Discovered ${BIOMES[biomeId].name}!`);
      }
    }

    const biome = BIOMES[this.currentBiome];
    const feetBlockId = this.getBlockAt(
      Math.floor(this.playerPos.x),
      Math.floor(this.playerPos.y - 0.15),
      Math.floor(this.playerPos.z)
    );
    const feetBlock = getBlock(feetBlockId);
    const inWater =
      this.getBlockAt(
        Math.floor(this.playerPos.x),
        Math.floor(this.playerPos.y + 0.4),
        Math.floor(this.playerPos.z)
      ) === BlockId.WATER;

    let fwd = 0;
    let right = 0;
    if (this.heldKeys.has('KeyW') || this.heldKeys.has('ArrowUp')) fwd += 1;
    if (this.heldKeys.has('KeyS') || this.heldKeys.has('ArrowDown')) fwd -= 1;
    if (this.heldKeys.has('KeyD') || this.heldKeys.has('ArrowRight')) right += 1;
    if (this.heldKeys.has('KeyA') || this.heldKeys.has('ArrowLeft')) right -= 1;
    fwd += this.touchMove.y;
    right += this.touchMove.x;

    const mag = Math.hypot(fwd, right);
    if (mag > 1) {
      fwd /= mag;
      right /= mag;
    }

    const sprinting = (this.heldKeys.has('ShiftLeft') || this.heldKeys.has('ShiftRight')) && this.stamina > 5 && mag > 0.1;
    this.stamina =
      sprinting && !this.flyMode
        ? Math.max(0, this.stamina - dt * 22)
        : Math.min(100, this.stamina + dt * 16);

    const sin = Math.sin(this.yaw);
    const cos = Math.cos(this.yaw);
    const moveX = -sin * fwd + cos * right;
    const moveZ = -cos * fwd - sin * right;
    const speed = (this.flyMode ? 14 : sprinting ? 9.2 : 6.2) * biome.speedScale;
    const slippery = (feetBlock.slippery || biome.id === 'frostbound_tundra') && this.onGround;
    const accel = this.flyMode ? 10 : slippery ? 2.4 : this.onGround ? 14 : 5;

    this.velocity.x = THREE.MathUtils.damp(this.velocity.x, moveX * speed, accel, dt);
    this.velocity.z = THREE.MathUtils.damp(this.velocity.z, moveZ * speed, accel, dt);

    if (this.flyMode) {
      let flyY = 0;
      if (this.heldKeys.has('Space') || this.touchJump) flyY += 1;
      if (this.heldKeys.has('ShiftLeft') || this.heldKeys.has('KeyC') || this.touchDescend) flyY -= 1;
      this.velocity.y = THREE.MathUtils.damp(this.velocity.y, flyY * 10, 10, dt);
    } else {
      const grav = 23.5 * biome.gravityScale * (inWater ? 0.35 : 1);
      this.velocity.y -= grav * dt;
      if (feetBlock.updraft) {
        this.velocity.y = Math.max(this.velocity.y, feetBlockId === BlockId.WIND_BEACON ? 7.6 : 4.8);
      } else {
        const bx = Math.floor(this.playerPos.x);
        const bz = Math.floor(this.playerPos.z);
        const by = Math.floor(this.playerPos.y);
        for (let d = 1; d <= 4; d++) {
          if (this.getBlockAt(bx, by - d, bz) === BlockId.WIND_BEACON) {
            this.velocity.y = Math.max(this.velocity.y, 7.2);
            break;
          }
        }
      }
      if (inWater) {
        this.velocity.y = Math.max(this.velocity.y, -3.5);
        if (this.heldKeys.has('Space') || this.touchJump) this.velocity.y = 4.6;
      }
    }

    this.coyoteTimer = this.onGround ? 0.12 : Math.max(0, this.coyoteTimer - dt);
    this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - dt);
    if (!this.flyMode && this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      this.velocity.y = 8.9 * biome.jumpScale;
      this.onGround = false;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      soundEngine.playJump(biome.gravityScale < 0.7);
    }

    let impactVy = 0;
    const sweepAxis = (axis: 'x' | 'y' | 'z', delta: number) => {
      const steps = Math.max(1, Math.ceil(Math.abs(delta) / 0.2));
      const inc = delta / steps;
      for (let i = 0; i < steps; i++) {
        this.playerPos[axis] += inc;
        if (this.collidesAt(this.playerPos.x, this.playerPos.y, this.playerPos.z)) {
          this.playerPos[axis] -= inc;
          if (axis === 'y' && delta < 0) {
            this.onGround = true;
            const groundBlk = getBlock(
              this.getBlockAt(
                Math.floor(this.playerPos.x),
                Math.floor(this.playerPos.y - 0.15),
                Math.floor(this.playerPos.z)
              )
            );
            if (groundBlk.bounciness && groundBlk.bounciness > 1) {
              this.velocity.y = 9.2 * groundBlk.bounciness;
              this.onGround = false;
              soundEngine.playBounce();
              this.shakeIntensity = Math.max(this.shakeIntensity, 0.03);
              return;
            }
            impactVy = this.velocity.y;
          }
          this.velocity[axis] = 0;
          return;
        }
      }
    };

    this.onGround = false;
    sweepAxis('x', this.velocity.x * dt);
    sweepAxis('z', this.velocity.z * dt);
    sweepAxis('y', this.velocity.y * dt);

    if (impactVy < -13.5 && !inWater && !this.flyMode && this.worldRules !== 'creative') {
      const mult = this.worldRules === 'hardcore' ? 1.5 : 1;
      const dmg = Math.round((-impactVy - 13) * 4.5 * mult);
      this.applyDamage(dmg, 'Heavy Fall');
    }

    if (this.playerPos.y < -8) {
      if (this.worldRules !== 'creative') {
        this.applyDamage(100, 'Fell into the Void');
      } else {
        const sy = this.findSurfaceY(Math.floor(this.playerPos.x), Math.floor(this.playerPos.z));
        this.playerPos.y = sy + 2;
        this.velocity.y = 0;
      }
    }

    if (this.worldRules === 'creative') {
      this.health = this.maxHealth;
    } else if (feetBlock.hazardDamage && !this.flyMode) {
      const mult = this.worldRules === 'hardcore' ? 1.5 : 1;
      this.applyDamage(feetBlock.hazardDamage * mult * dt, 'Thermal Magma');
    } else if (this.worldRules === 'survival' && this.stamina >= 60) {
      this.health = Math.min(this.maxHealth, this.health + dt * 1.8);
    }

    const horizSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    if (this.onGround && horizSpeed > 1.2) {
      this.stepTimer -= (horizSpeed / 5.5) * dt;
      if (this.stepTimer <= 0) {
        soundEngine.playStep(!!slippery);
        this.stepTimer = 0.38;
      }
    }

    if (this.mouseHeldLeft && this.pointerLocked && !this.hardcoreSpectating) {
      const tool = getToolDef(this.hotbar[this.selectedSlot] ?? BlockId.STONE);
      if (tool?.kind === 'sword') {
        this.miningTimer = 0;
      } else {
        const hit = this.raycastVoxel(6.5);
        if (hit) {
          const key = `${hit.x},${hit.y},${hit.z}`;
          if (key !== this.lastMineKey) {
            this.lastMineKey = key;
            this.miningTimer = 0;
          }
          this.miningTimer += dt;
          const factor = this.worldRules === 'creative' ? 0.16 : 0.48;
          const mult = getMiningMultiplier(tool, hit.block.category, hit.block.id);
          const timeNeeded = Math.max(0.08, (hit.block.hardness * factor) / mult);
          if (this.miningTimer >= timeNeeded) {
            this.miningTimer = 0;
            this.breakBlockAt(hit.x, hit.y, hit.z);
          }
        } else {
          this.miningTimer = 0;
        }
      }
    }
  }

  isNightTime(): boolean {
    return this.timeOfDay < 0.22 || this.timeOfDay > 0.78;
  }

  clearAllCreatures() {
    for (const c of this.creatures) {
      this.scene.remove(c.rig.root);
      c.rig.dispose();
    }
    this.creatures = [];
    for (const b of this.bolts) {
      b.active = false;
      b.mesh.visible = false;
      b.friendlyToPlayer = false;
    }
  }

  clearPrimedTnts() {
    for (const t of this.primedTnts) {
      this.scene.remove(t.mesh);
    }
    this.primedTnts = [];
  }

  igniteTntAt(wx: number, wy: number, wz: number, shortFuse = false) {
    if (this.getBlockAt(wx, wy, wz) !== BlockId.TNT) return;
    this.setBlockAt(wx, wy, wz, BlockId.AIR);
    const mesh = new THREE.Mesh(this.tntGeo, this.tntMat);
    mesh.position.set(wx + 0.5, wy + 0.5, wz + 0.5);
    this.scene.add(mesh);
    this.primedTnts.push({
      mesh,
      x: wx,
      y: wy,
      z: wz,
      fuse: shortFuse ? 0.28 + Math.random() * 0.25 : 2.1,
    });
    soundEngine.playPlace(0.6);
    this.spawnBreakParticles(wx, wy + 1, wz, '#facc15');
    if (!shortFuse) this.showToast('TNT Ignited! Stand back!');
  }

  detonateTnt(cx: number, cy: number, cz: number) {
    soundEngine.playExplosion();
    this.shakeIntensity = Math.max(this.shakeIntensity, 0.22);
    this.spawnBreakParticles(cx, cy, cz, '#f97316');
    this.spawnBreakParticles(cx, cy + 1, cz, '#fde047');

    const radius = 3.55;
    for (let dx = -3; dx <= 3; dx++) {
      for (let dy = -3; dy <= 3; dy++) {
        for (let dz = -3; dz <= 3; dz++) {
          if (dx * dx + dy * dy + dz * dz > radius * radius) continue;
          const bx = cx + dx;
          const by = cy + dy;
          const bz = cz + dz;
          if (by <= 0 || by >= 63) continue;
          const bid = this.getBlockAt(bx, by, bz);
          if (bid === BlockId.TNT) {
            this.igniteTntAt(bx, by, bz, true);
          } else if (
            bid !== BlockId.AIR &&
            bid !== BlockId.OBSIDIAN &&
            bid !== BlockId.PORTAL_FRAME &&
            bid !== BlockId.PORTAL_RIFT
          ) {
            this.setBlockAt(bx, by, bz, BlockId.AIR);
            if (this.worldRules !== 'creative' && Math.random() < 0.35) {
              this.inventory.set(bid, (this.inventory.get(bid) ?? 0) + 1);
            }
          }
        }
      }
    }

    // Blast damage to hostile mobs (sparing friendly Mango Birds & Mango Guardian)
    for (let i = this.creatures.length - 1; i >= 0; i--) {
      const c = this.creatures[i];
      if (c.meta.friendlyAlly) continue;
      const d = Math.hypot(c.pos.x - (cx + 0.5), c.pos.y - cy, c.pos.z - (cz + 0.5));
      if (d < 5.5) {
        const dmg = Math.round((1 - d / 5.5) * 65);
        if (dmg > 0) this.attackCreature(c, dmg);
      }
    }

    const pd = Math.hypot(this.playerPos.x - (cx + 0.5), this.playerPos.y - cy, this.playerPos.z - (cz + 0.5));
    if (pd < 5.2) {
      const pushX = (this.playerPos.x - (cx + 0.5)) / Math.max(0.4, pd);
      const pushZ = (this.playerPos.z - (cz + 0.5)) / Math.max(0.4, pd);
      this.velocity.x += pushX * 10;
      this.velocity.z += pushZ * 10;
      this.velocity.y = Math.max(this.velocity.y, 6.2);
      if (pd < 4.5 && this.worldRules !== 'creative') {
        const dmg = Math.round((1 - pd / 4.5) * 26);
        this.applyDamage(dmg, 'TNT Blast');
      }
    }
    this.emitHud();
  }

  updatePrimedTnts(dt: number) {
    if (this.primedTnts.length === 0) return;
    for (let i = this.primedTnts.length - 1; i >= 0; i--) {
      const t = this.primedTnts[i];
      t.fuse -= dt;
      const pulse = 1 + Math.abs(Math.sin(t.fuse * 14)) * 0.14;
      t.mesh.scale.setScalar(pulse);
      if (Math.random() < 0.35) {
        this.spawnBreakParticles(t.x, t.y + 1, t.z, Math.sin(t.fuse * 20) > 0 ? '#fde047' : '#fb923c');
      }
      if (t.fuse <= 0) {
        this.scene.remove(t.mesh);
        this.primedTnts.splice(i, 1);
        this.detonateTnt(t.x, t.y, t.z);
      }
    }
  }

  interactWithFriendlyAlly(c: CreatureInstance) {
    this.swingProgress = 0.7;
    soundEngine.playBiomeDiscover();
    this.spawnBreakParticles(Math.floor(c.pos.x), Math.floor(c.pos.y + 0.8), Math.floor(c.pos.z), '#facc15');

    if (c.meta.species === 'mango_guardian') {
      this.health = this.maxHealth;
      this.stamina = 100;
      if ((c.helpCooldown ?? 0) <= 0) {
        c.helpCooldown = 8;
        this.inventory.set(BlockId.TNT, (this.inventory.get(BlockId.TNT) ?? 0) + 3);
        this.inventory.set(BlockId.MANGO_BLOCK, (this.inventory.get(BlockId.MANGO_BLOCK) ?? 0) + 2);
        this.inventory.set(BlockId.EMERALD_BLOCK, (this.inventory.get(BlockId.EMERALD_BLOCK) ?? 0) + 2);
        this.inventory.set(BlockId.AETHER_CRYSTAL, (this.inventory.get(BlockId.AETHER_CRYSTAL) ?? 0) + 1);
        this.inventory.set(221, (this.inventory.get(221) ?? 0) + 1);
        this.showToast('Mango Guardian helped you! Full HP +3 TNT +2 Mangos +2 Emerald +1 Egg!');
      } else {
        this.showToast('Mango Guardian healed you to Full HP & Stamina!');
      }
    } else {
      this.health = Math.min(this.maxHealth, this.health + 20);
      this.stamina = Math.min(100, this.stamina + 35);
      if ((c.helpCooldown ?? 0) <= 0) {
        c.helpCooldown = 10;
        const giftPool = [BlockId.MANGO_BLOCK, BlockId.TNT, BlockId.HONEYCOMB, BlockId.MELON_BLOCK];
        const gift = giftPool[Math.floor(Math.random() * giftPool.length)];
        this.inventory.set(gift, (this.inventory.get(gift) ?? 0) + 2);
        this.showToast(`${c.meta.name} chirped! +20 HP & +2 ${getBlock(gift).name}!`);
      } else {
        this.showToast(`${c.meta.name} healed you (+20 HP)!`);
      }
    }
    this.emitHud();
  }

  raycastCreature(maxDist: number): { creature: CreatureInstance; dist: number } | null {
    const ox = this.camera.position.x;
    const oy = this.camera.position.y;
    const oz = this.camera.position.z;
    this.camera.getWorldDirection(creatureRayDir);

    let best: CreatureInstance | null = null;
    let bestDist = maxDist;

    for (let i = 0; i < this.creatures.length; i++) {
      const c = this.creatures[i];
      if (c.health <= 0) continue;
      const r = c.meta.radius + 0.45;
      const r2 = r * r;
      let hitD = Infinity;
      const heights = c.meta.height > 3.2 ? [0.22, 0.52, 0.82] : [0.52];
      for (const f of heights) {
        tmpVec.set(c.pos.x - ox, c.pos.y + c.meta.height * f - oy, c.pos.z - oz);
        const proj = tmpVec.dot(creatureRayDir);
        if (proj >= 0.25 && proj <= bestDist && tmpVec.lengthSq() - proj * proj <= r2 && proj < hitD) {
          hitD = proj;
        }
      }
      if (hitD < bestDist) {
        best = c;
        bestDist = hitD;
      }
    }
    return best ? { creature: best, dist: bestDist } : null;
  }

  attackCreature(c: CreatureInstance, damage: number) {
    if (c.meta.species === 'mango_guardian') {
      this.interactWithFriendlyAlly(c);
      return;
    }
    soundEngine.playSwordSlash();
    soundEngine.playCreatureHit(c.meta.hostile);
    this.swingProgress = 1;
    this.shakeIntensity = Math.max(this.shakeIntensity, 0.045);
    this.hitstopTimer = 0.025;
    c.health -= damage;
    c.hitFlash = 0.18;

    const dx = c.pos.x - this.playerPos.x;
    const dz = c.pos.z - this.playerPos.z;
    const d = Math.max(0.01, Math.hypot(dx, dz));
    const kb = c.meta.species === 'mega_titan' ? 0.4 : 1;
    c.vel.x = (dx / d) * 6.8 * kb;
    c.vel.z = (dz / d) * 6.8 * kb;
    c.vel.y = 4.2 * kb;
    if (!c.meta.hostile) c.fleeTimer = 3.5;

    this.spawnBreakParticles(
      Math.floor(c.pos.x),
      Math.floor(c.pos.y + Math.min(2.2, c.meta.height * 0.5)),
      Math.floor(c.pos.z),
      c.meta.hostile ? '#ef4444' : '#f8fafc'
    );
    if (c.health <= 0) this.handleCreatureKilled(c);
    this.emitHud();
  }

  performSwordSweep(damage: number, range: number) {
    this.sweepCooldown = 0.65;
    this.swingProgress = 1;
    soundEngine.playSwordSlash();
    this.camera.getWorldDirection(creatureRayDir);
    let hits = 0;
    for (let i = this.creatures.length - 1; i >= 0; i--) {
      const c = this.creatures[i];
      if (c.meta.friendlyAlly) continue;
      tmpVec.set(c.pos.x - this.playerPos.x, 0, c.pos.z - this.playerPos.z);
      const dist = tmpVec.length();
      if (Math.max(0, dist - c.meta.radius) > range) continue;
      tmpVec.normalize();
      if (tmpVec.x * creatureRayDir.x + tmpVec.z * creatureRayDir.z > 0.22) {
        this.attackCreature(c, damage);
        hits++;
      }
    }
    if (hits > 0) this.showToast(`Sweep Strike (${hits} hit)`);
  }

  spawnKingBoss() {
    const meta = CREATURE_META.king_boss;
    const rig = buildCreatureRig('king_boss');
    rig.root.position.set(0.5, 25, -33.5);
    this.scene.add(rig.root);
    this.creatures.push({
      id: this.nextCreatureId++,
      meta,
      rig,
      pos: new THREE.Vector3(0.5, 25, -33.5),
      vel: new THREE.Vector3(0, 0, 0),
      yaw: Math.PI,
      health: meta.maxHealth,
      walkPhase: 0,
      aiTimer: 4.5,
      attackCooldown: 1.4,
      hitFlash: 0,
      fuseTimer: 0,
      fleeTimer: 0,
      onGround: true,
    });
  }

  spawnVolcanoBoss() {
    this.spawnCreatureDirect('ignis_lord', 0.5, 40, -23.5, false);
  }

  spawnSkyBoss() {
    this.spawnCreatureDirect('sky_warden', 0.5, 35, -47.5, false);
  }

  spawnRobotBoss() {
    this.spawnCreatureDirect('mega_titan', 0.5, 25, -38.5, false);
  }

  spawnMangoBoss() {
    this.spawnCreatureDirect('mango_guardian', 0.5, 25.1, -34.5, false);
  }

  spawnCreatureDirect(species: CreatureSpecies, x: number, y: number, z: number, fromEgg = false) {
    const meta = CREATURE_META[species];
    const rig = buildCreatureRig(species);
    rig.root.position.set(x, y, z);
    this.scene.add(rig.root);
    this.creatures.push({
      id: this.nextCreatureId++,
      meta,
      rig,
      pos: new THREE.Vector3(x, y, z),
      vel: new THREE.Vector3(0, 0, 0),
      yaw: meta.isBoss ? Math.PI : Math.random() * Math.PI * 2,
      health: meta.maxHealth,
      walkPhase: Math.random() * 6,
      aiTimer: meta.isBoss ? 4.5 : 1 + Math.random() * 2,
      attackCooldown: 1,
      hitFlash: 0,
      fuseTimer: 0,
      fleeTimer: 0,
      onGround: false,
      fromEgg,
    });
  }

  spawnRoyalGuardAt(x: number, z: number, species: CreatureSpecies) {
    const sy = this.findSurfaceY(Math.floor(x), Math.floor(z));
    this.spawnCreatureDirect(species, x, sy, z, false);
  }

  fireRoyalBoltFan(boss: CreatureInstance, count: number) {
    const baseYaw = Math.atan2(-(this.playerPos.x - boss.pos.x), -(this.playerPos.z - boss.pos.z));
    for (let i = 0; i < count; i++) {
      const bolt = this.bolts.find((b) => !b.active);
      if (!bolt) break;
      const yaw = baseYaw + (i - (count - 1) / 2) * 0.22;
      bolt.active = true;
      bolt.friendlyToPlayer = false;
      bolt.pos.set(boss.pos.x, boss.pos.y + boss.meta.height * 0.62, boss.pos.z);
      const dx = -Math.sin(yaw);
      const dz = -Math.cos(yaw);
      const dy =
        (this.playerPos.y + 1.1 - bolt.pos.y) /
        Math.max(4, Math.hypot(this.playerPos.x - boss.pos.x, this.playerPos.z - boss.pos.z));
      rayDir.set(dx, dy, dz).normalize();
      bolt.vel.copy(rayDir).multiplyScalar(17.5);
      bolt.life = 2.6;
      bolt.damage = this.worldRules === 'hardcore' ? 18 : 13;
      bolt.mesh.position.copy(bolt.pos);
      bolt.mesh.lookAt(bolt.pos.x + dx, bolt.pos.y + dy, bolt.pos.z + dz);
      bolt.mesh.visible = true;
    }
  }

  fireAllyBolt(guardian: CreatureInstance, target: CreatureInstance) {
    const bolt = this.bolts.find((b) => !b.active);
    if (!bolt) return;
    bolt.active = true;
    bolt.friendlyToPlayer = true;
    bolt.pos.set(guardian.pos.x, guardian.pos.y + guardian.meta.height * 0.6, guardian.pos.z);
    rayDir.set(
      target.pos.x - bolt.pos.x,
      target.pos.y + target.meta.height * 0.5 - bolt.pos.y,
      target.pos.z - bolt.pos.z
    );
    const len = Math.max(0.1, rayDir.length());
    rayDir.divideScalar(len);
    bolt.vel.copy(rayDir).multiplyScalar(21);
    bolt.life = 2.5;
    bolt.damage = 28;
    bolt.mesh.position.copy(bolt.pos);
    bolt.mesh.lookAt(target.pos.x, target.pos.y + target.meta.height * 0.5, target.pos.z);
    bolt.mesh.visible = true;
  }

  handleCreatureKilled(c: CreatureInstance) {
    const idx = this.creatures.indexOf(c);
    if (idx >= 0) this.creatures.splice(idx, 1);
    this.scene.remove(c.rig.root);
    c.rig.dispose();

    this.spawnBreakParticles(
      Math.floor(c.pos.x),
      Math.floor(c.pos.y + 0.6),
      Math.floor(c.pos.z),
      c.meta.species === 'mega_titan' ? '#22d3ee' : c.meta.fireImmune ? '#f97316' : '#fbbf24'
    );

    const eggMatch = [201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212, 213, 214, 215, 216, 217, 218, 219, 220, 221, 222, 223]
      .map((id) => getEggDef(id)!)
      .find((e) => e.species === c.meta.species);

    if (c.meta.isBoss) {
      this.bossDefeated = true;
      soundEngine.playBossVictory();
      this.shakeIntensity = Math.max(this.shakeIntensity, 0.18);
      this.health = this.maxHealth;
      this.stamina = 100;
      this.spawnBreakParticles(Math.floor(c.pos.x), Math.floor(c.pos.y + 2.4), Math.floor(c.pos.z), '#38bdf8');
      if (this.worldRules !== 'creative') {
        this.inventory.set(BlockId.AETHER_CRYSTAL, (this.inventory.get(BlockId.AETHER_CRYSTAL) ?? 0) + 10);
        this.inventory.set(BlockId.PORTAL_FRAME, (this.inventory.get(BlockId.PORTAL_FRAME) ?? 0) + 12);
        this.inventory.set(BlockId.GOLD_BLOCK, (this.inventory.get(BlockId.GOLD_BLOCK) ?? 0) + 10);
        if (c.meta.species === 'sky_warden') {
          this.inventory.set(BlockId.WIND_BEACON, (this.inventory.get(BlockId.WIND_BEACON) ?? 0) + 6);
        } else if (c.meta.species === 'mega_titan') {
          this.inventory.set(BlockId.CYBER_CORE, (this.inventory.get(BlockId.CYBER_CORE) ?? 0) + 8);
          this.inventory.set(BlockId.CIRCUIT_CORE, (this.inventory.get(BlockId.CIRCUIT_CORE) ?? 0) + 12);
          this.inventory.set(BlockId.STEEL_PLATE, (this.inventory.get(BlockId.STEEL_PLATE) ?? 0) + 16);
        }
        if (eggMatch) this.inventory.set(eggMatch.id, (this.inventory.get(eggMatch.id) ?? 0) + 1);
        if (!this.inventory.has(ToolId.AETHER_SWORD)) {
          this.inventory.set(ToolId.AETHER_SWORD, 1);
          this.setHotbarBlock(0, ToolId.AETHER_SWORD);
        }
      }
      this.showToast(
        c.meta.species === 'ignis_lord'
          ? 'IGNIS REX VANQUISHED! Volcano Caldera Conquered!'
          : c.meta.species === 'sky_warden'
          ? 'ZEPHYRUS VANQUISHED! Sky Citadel Liberated!'
          : c.meta.species === 'mega_titan'
          ? 'OMEGA MECHATRON DESTROYED! Cyber City Liberated!'
          : 'KING AETHELGARD SLAIN! Royal Castle Liberated!'
      );
    } else if (this.worldRules !== 'creative') {
      const dropEgg = !!(eggMatch && Math.random() < 0.45);
      if (dropEgg && eggMatch) this.inventory.set(eggMatch.id, (this.inventory.get(eggMatch.id) ?? 0) + 1);
      if (c.meta.hostile) {
        this.inventory.set(BlockId.AETHER_CRYSTAL, (this.inventory.get(BlockId.AETHER_CRYSTAL) ?? 0) + 1);
        if (c.meta.species === 'laser_drone' || c.meta.species === 'mecha_trooper') {
          this.inventory.set(BlockId.CIRCUIT_CORE, (this.inventory.get(BlockId.CIRCUIT_CORE) ?? 0) + 2);
          this.inventory.set(BlockId.STEEL_PLATE, (this.inventory.get(BlockId.STEEL_PLATE) ?? 0) + 2);
        } else if (c.meta.fireImmune) {
          this.inventory.set(BlockId.MAGMA, (this.inventory.get(BlockId.MAGMA) ?? 0) + 2);
        } else if (c.meta.species === 'storm_wisp') {
          this.inventory.set(BlockId.WIND_BEACON, (this.inventory.get(BlockId.WIND_BEACON) ?? 0) + 1);
        } else {
          this.inventory.set(BlockId.PORTAL_FRAME, (this.inventory.get(BlockId.PORTAL_FRAME) ?? 0) + 2);
        }
        this.health = Math.min(this.maxHealth, this.health + 6);
        this.showToast(
          dropEgg && eggMatch
            ? `Slain ${c.meta.name}! +1 ${eggMatch.name} & Loot`
            : `Slain ${c.meta.name}! +1 Aether Crystal`
        );
      } else {
        if (c.meta.species === 'big_scout_droid') {
          this.inventory.set(BlockId.STEEL_PLATE, (this.inventory.get(BlockId.STEEL_PLATE) ?? 0) + 4);
          this.inventory.set(BlockId.CIRCUIT_CORE, (this.inventory.get(BlockId.CIRCUIT_CORE) ?? 0) + 2);
        } else if (c.meta.species === 'android') {
          this.inventory.set(BlockId.CIRCUIT_CORE, (this.inventory.get(BlockId.CIRCUIT_CORE) ?? 0) + 2);
          this.inventory.set(BlockId.STEEL_PLATE, (this.inventory.get(BlockId.STEEL_PLATE) ?? 0) + 1);
        } else if (c.meta.species === 'scout_bot') {
          this.inventory.set(BlockId.STEEL_PLATE, (this.inventory.get(BlockId.STEEL_PLATE) ?? 0) + 2);
        } else if (c.meta.species === 'villager') {
          this.inventory.set(BlockId.GOLD_BLOCK, (this.inventory.get(BlockId.GOLD_BLOCK) ?? 0) + 1);
        } else {
          this.inventory.set(BlockId.GRASS, (this.inventory.get(BlockId.GRASS) ?? 0) + 2);
        }
        this.health = Math.min(this.maxHealth, this.health + 12);
        this.showToast(
          dropEgg && eggMatch
            ? `${c.meta.name}: +12 HP & ${eggMatch.name}`
            : `${c.meta.name}: +12 HP Provision`
        );
      }
    } else {
      this.showToast(`Defeated ${c.meta.name}`);
    }
  }

  trySpawnCreature(hostile: boolean, allowDayFire = false) {
    const angle = Math.random() * Math.PI * 2;
    const dist = hostile ? 13 + Math.random() * 14 : 11 + Math.random() * 16;
    const sx = Math.round(this.playerPos.x + Math.cos(angle) * dist);
    const sz = Math.round(this.playerPos.z + Math.sin(angle) * dist);
    const sy = this.findSurfaceY(sx, sz);
    const ground = this.getBlockAt(sx, sy - 1, sz);
    const biome = getBiomeAt(sx, sz, this.seed);
    const fiery = allowDayFire || this.seed === 777 || biome === 'basalt_caldera';
    const sky = this.seed === 888;
    const robo = this.seed === 666;

    if (
      ground === BlockId.WATER ||
      ground === BlockId.AIR ||
      (ground === BlockId.MAGMA && !(hostile && fiery)) ||
      (sky && sy < 16) ||
      (robo && sy < 18)
    ) {
      return;
    }

    let species: CreatureSpecies;
    if (hostile) {
      if (robo) species = Math.random() < 0.55 ? 'laser_drone' : 'mecha_trooper';
      else if (fiery) species = Math.random() < 0.56 ? 'blaze_imp' : 'magma_golem';
      else if (sky) species = Math.random() < 0.65 ? 'storm_wisp' : 'skeleton';
      else {
        const r = Math.random();
        species = r < 0.42 ? 'stalker' : r < 0.74 ? 'skeleton' : 'creeper';
      }
    } else if (robo) {
      const r = Math.random();
      species = r < 0.35 ? 'scout_bot' : r < 0.65 ? 'android' : r < 0.85 ? 'big_scout_droid' : 'villager';
    } else if (sky) {
      const r = Math.random();
      species = r < 0.38 ? 'villager' : r < 0.78 ? 'sky_griffin' : Math.random() < 0.5 ? 'stag' : 'sheep';
    } else if (this.seed === 999) {
      const r = Math.random();
      species = r < 0.45 ? 'villager' : r < 0.75 ? 'sheep' : 'fox';
    } else if (this.seed === 555) {
      const r = Math.random();
      species = r < 0.55 ? 'mango_bird' : r < 0.8 ? 'sun_bird' : 'villager';
    } else if (this.seed === 777) {
      species = Math.random() < 0.65 ? 'villager' : 'fox';
    } else if (biome === 'aether_spires' || biome === 'mycelium_abyss') {
      species = Math.random() < 0.7 ? 'stag' : 'fox';
    } else if (biome === 'frostbound_tundra') {
      species = Math.random() < 0.65 ? 'fox' : 'sheep';
    } else {
      const r = Math.random();
      species = r < 0.42 ? 'sheep' : r < 0.74 ? 'fox' : 'mango_bird';
    }

    this.spawnCreatureDirect(species, sx + 0.5, sy, sz + 0.5, false);
  }

  fireNightBolt(shooter: CreatureInstance) {
    const bolt = this.bolts.find((b) => !b.active);
    if (!bolt) return;
    bolt.active = true;
    bolt.friendlyToPlayer = false;
    bolt.pos.set(shooter.pos.x, shooter.pos.y + 1.35, shooter.pos.z);
    rayDir.set(
      this.playerPos.x - bolt.pos.x,
      this.playerPos.y + 1.15 - bolt.pos.y,
      this.playerPos.z - bolt.pos.z
    );
    const len = Math.max(0.1, rayDir.length());
    rayDir.divideScalar(len);
    bolt.vel.copy(rayDir).multiplyScalar(shooter.meta.fireImmune ? 17 : 15.5);
    bolt.life = 2.4;
    bolt.damage = this.worldRules === 'hardcore' ? 15 : 10;
    bolt.mesh.position.copy(bolt.pos);
    bolt.mesh.lookAt(this.playerPos.x, this.playerPos.y + 1.15, this.playerPos.z);
    bolt.mesh.visible = true;
  }

  updateCreatures(dt: number) {
    if (this.sweepCooldown > 0) this.sweepCooldown = Math.max(0, this.sweepCooldown - dt);
    const night = this.isNightTime();
    const fiery = this.seed === 777 || this.currentBiome === 'basalt_caldera';
    const robo = this.seed === 666;

    this.creatureSpawnTimer += dt;
    if (this.creatureSpawnTimer >= 2.2) {
      this.creatureSpawnTimer = 0;
      let passiveCount = 0;
      let hostileCount = 0;
      for (let i = 0; i < this.creatures.length; i++) {
        if (this.creatures[i].meta.hostile) hostileCount++;
        else passiveCount++;
      }
      const capPassive = robo ? 14 : this.seed === 555 ? 24 : this.seed === 777 ? 6 : 10;
      if (passiveCount < capPassive) this.trySpawnCreature(false);
      if ((night || fiery || robo) && !this.isTitlePreview && hostileCount < (robo ? 12 : 8)) {
        this.trySpawnCreature(true, (fiery || robo) && !night);
      }
    }

    const diffMult = this.worldRules === 'hardcore' ? 1.45 : 1;

    for (let i = this.creatures.length - 1; i >= 0; i--) {
      const c = this.creatures[i];
      const dx = this.playerPos.x - c.pos.x;
      const dz = this.playerPos.z - c.pos.z;
      const distSq = dx * dx + dz * dz;

      if ((!c.meta.isBoss && !c.fromEgg && distSq > 2916) || (!night && c.meta.nocturnal && !c.fromEgg)) {
        if (!c.meta.isBoss && !c.fromEgg && distSq > 2916) {
          this.scene.remove(c.rig.root);
          c.rig.dispose();
          this.creatures.splice(i, 1);
          continue;
        }
        c.health -= dt * 34;
        c.hitFlash = 0.14;
        if (Math.random() < 0.25) {
          this.spawnBreakParticles(Math.floor(c.pos.x), Math.floor(c.pos.y + 1), Math.floor(c.pos.z), '#fb923c');
        }
        if (c.health <= 0) {
          this.scene.remove(c.rig.root);
          c.rig.dispose();
          this.creatures.splice(i, 1);
          continue;
        }
      }

      if (c.attackCooldown > 0) c.attackCooldown -= dt;
      if (c.fleeTimer > 0) c.fleeTimer -= dt;
      if (c.hitFlash > 0) c.hitFlash = Math.max(0, c.hitFlash - dt);
      if ((c.helpCooldown ?? 0) > 0) c.helpCooldown = Math.max(0, (c.helpCooldown ?? 0) - dt);

      const dist = Math.sqrt(distSq);
      let moveSpeed = 0;

      if (c.meta.isBoss && c.meta.friendlyAlly) {
        // Helpful, peaceful Mango Guardian Boss: NEVER attacks player; protects & gifts!
        let nearestThreat: CreatureInstance | null = null;
        let nearestThreatDist = 36;
        for (let k = 0; k < this.creatures.length; k++) {
          const other = this.creatures[k];
          if (!other.meta.hostile || other.health <= 0) continue;
          const td = Math.hypot(other.pos.x - c.pos.x, other.pos.z - c.pos.z);
          if (td < nearestThreatDist) {
            nearestThreatDist = td;
            nearestThreat = other;
          }
        }

        if (nearestThreat) {
          c.yaw = Math.atan2(-(nearestThreat.pos.x - c.pos.x), -(nearestThreat.pos.z - c.pos.z));
          moveSpeed = nearestThreatDist > 6.5 ? c.meta.speed : 0;
          if (c.attackCooldown <= 0) {
            c.attackCooldown = 1.25;
            this.fireAllyBolt(c, nearestThreat);
            this.spawnBreakParticles(
              Math.floor(c.pos.x),
              Math.floor(c.pos.y + 2.4),
              Math.floor(c.pos.z),
              '#facc15'
            );
          }
        } else if (!this.isTitlePreview && !this.isDead && dist < 28) {
          c.yaw = Math.atan2(-dx, -dz);
          moveSpeed = dist > 6.5 && dist < 24 ? c.meta.speed * 0.65 : 0;
          if (dist < 11) {
            c.aiTimer -= dt;
            if (c.aiTimer <= 0) {
              c.aiTimer = 14;
              this.health = Math.min(this.maxHealth, this.health + 20);
              this.stamina = 100;
              this.inventory.set(BlockId.TNT, (this.inventory.get(BlockId.TNT) ?? 0) + 1);
              this.inventory.set(BlockId.MANGO_BLOCK, (this.inventory.get(BlockId.MANGO_BLOCK) ?? 0) + 1);
              this.spawnBreakParticles(
                Math.floor(this.playerPos.x),
                Math.floor(this.playerPos.y + 1),
                Math.floor(this.playerPos.z),
                '#22c55e'
              );
              this.showToast('Mango Guardian Blessing: +20 HP, +1 TNT & +1 Mango Fruit!');
            }
          }
        } else {
          moveSpeed = 0;
          c.yaw = Math.PI;
        }
      } else if (c.meta.isBoss) {
        const enraged = c.health <= c.meta.maxHealth * 0.5;
        if (enraged && !this.bossGuardSummoned && !this.isTitlePreview) {
          this.bossGuardSummoned = true;
          soundEngine.playBossRoar();
          if (c.meta.species === 'ignis_lord') {
            this.showToast('IGNIS REX ENRAGED! Ember Imps Summoned!');
            this.spawnRoyalGuardAt(c.pos.x - 4, c.pos.z + 3, 'blaze_imp');
            this.spawnRoyalGuardAt(c.pos.x + 4, c.pos.z + 3, 'blaze_imp');
          } else if (c.meta.species === 'sky_warden') {
            this.showToast('ZEPHYRUS ENRAGED! Storm Sentinels Summoned!');
            this.spawnRoyalGuardAt(c.pos.x - 4, c.pos.z + 3, 'storm_wisp');
            this.spawnRoyalGuardAt(c.pos.x + 4, c.pos.z + 3, 'storm_wisp');
          } else if (c.meta.species === 'mega_titan') {
            this.showToast('OMEGA MECHATRON OVERDRIVE! Combat Bots Deployed!');
            this.spawnRoyalGuardAt(c.pos.x - 5, c.pos.z + 4, 'mecha_trooper');
            this.spawnRoyalGuardAt(c.pos.x + 5, c.pos.z + 4, 'laser_drone');
            this.spawnRoyalGuardAt(c.pos.x, c.pos.z + 6, 'mecha_trooper');
          } else {
            this.showToast('KING AETHELGARD ENRAGED! Royal Guards Summoned!');
            this.spawnRoyalGuardAt(c.pos.x - 4, c.pos.z + 3, 'stalker');
            this.spawnRoyalGuardAt(c.pos.x + 4, c.pos.z + 3, 'skeleton');
          }
        }

        if (!this.isTitlePreview && !this.isDead && !this.hardcoreSpectating && dist < 48) {
          c.yaw = Math.atan2(-dx, -dz);
          moveSpeed = dist > c.meta.radius + 1.4 ? (enraged ? c.meta.speed * 1.2 : c.meta.speed) : 0;
          c.aiTimer -= dt;
          if (c.aiTimer <= 0 && dist < c.meta.radius + 9.5 && c.onGround) {
            c.aiTimer = enraged ? 4.2 : 6;
            c.vel.y = 6.2;
            soundEngine.playBossRoar();
            soundEngine.playExplosion();
            this.shakeIntensity = Math.max(this.shakeIntensity, 0.16);
            this.spawnBreakParticles(
              Math.floor(c.pos.x),
              Math.floor(c.pos.y + 0.5),
              Math.floor(c.pos.z),
              c.meta.species === 'mega_titan'
                ? '#22d3ee'
                : c.meta.fireImmune
                ? '#f97316'
                : c.meta.species === 'sky_warden'
                ? '#38bdf8'
                : '#fbbf24'
            );
            if (dist < c.meta.radius + 5.2 && this.playerPos.y < c.pos.y + 2.4) {
              this.applyDamage(Math.round(18 * diffMult), `${c.meta.name} Slam`);
              const d = Math.max(0.1, dist);
              this.velocity.x += (dx / d) * 9.5;
              this.velocity.z += (dz / d) * 9.5;
              this.velocity.y = 5.2;
            }
          }
          if (dist < c.meta.radius + 2.1 && Math.abs(this.playerPos.y - c.pos.y) < c.meta.height * 0.78 && c.attackCooldown <= 0) {
            c.attackCooldown = enraged ? 0.95 : 1.25;
            soundEngine.playSwordSlash();
            this.applyDamage(Math.round(c.meta.damage * diffMult), c.meta.name);
            const d = Math.max(0.1, dist);
            this.velocity.x += (dx / d) * 7.5;
            this.velocity.z += (dz / d) * 7.5;
          } else if (dist >= c.meta.radius + 3.5 && dist < 28 && c.attackCooldown <= 0) {
            c.attackCooldown = enraged ? 1.9 : 2.6;
            const count = c.meta.species === 'mega_titan' ? (enraged ? 4 : 3) : enraged ? 3 : 2;
            this.fireRoyalBoltFan(c, count);
          }
        } else {
          moveSpeed = 0;
          c.yaw = Math.PI;
        }
      } else if (c.meta.hostile && !this.isTitlePreview && !this.isDead && !this.hardcoreSpectating && dist < 32) {
        c.yaw = Math.atan2(-dx, -dz);
        if (c.meta.species === 'creeper') {
          if (dist < 2.6) {
            c.fuseTimer += dt;
            moveSpeed = 0.5;
            if (c.fuseTimer >= 0.95) {
              soundEngine.playExplosion();
              this.spawnBreakParticles(Math.floor(c.pos.x), Math.floor(c.pos.y + 0.8), Math.floor(c.pos.z), '#c084fc');
              this.shakeIntensity = Math.max(this.shakeIntensity, 0.14);
              if (dist < 4) {
                this.applyDamage(Math.round(c.meta.damage * diffMult), 'Rift Creeper Blast');
                const d = Math.max(0.1, dist);
                this.velocity.x += (dx / d) * 9;
                this.velocity.z += (dz / d) * 9;
                this.velocity.y = 5.5;
              }
              this.scene.remove(c.rig.root);
              c.rig.dispose();
              this.creatures.splice(i, 1);
              continue;
            }
          } else {
            if (dist > 4.2) c.fuseTimer = Math.max(0, c.fuseTimer - dt * 1.5);
            moveSpeed = c.meta.speed;
          }
        } else if (
          c.meta.species === 'skeleton' ||
          c.meta.species === 'blaze_imp' ||
          c.meta.species === 'storm_wisp' ||
          c.meta.species === 'laser_drone'
        ) {
          moveSpeed = dist > 12.5 ? c.meta.speed : dist < 6 ? -c.meta.speed * 0.65 : 0;
          if (dist < 18 && c.attackCooldown <= 0) {
            c.attackCooldown =
              c.meta.species === 'blaze_imp' || c.meta.species === 'storm_wisp' || c.meta.species === 'laser_drone'
                ? 2.0
                : 2.6;
            this.fireNightBolt(c);
          }
        } else {
          moveSpeed = dist > 1.4 ? c.meta.speed : 0;
          if (dist < 2.2 && Math.abs(this.playerPos.y - c.pos.y) < 2.2 && c.attackCooldown <= 0) {
            c.attackCooldown = c.meta.species === 'magma_golem' || c.meta.species === 'mecha_trooper' ? 1.3 : 1.1;
            this.applyDamage(Math.round(c.meta.damage * diffMult), c.meta.name);
          }
        }
      } else {
        c.aiTimer -= dt;
        if (c.fleeTimer > 0) {
          c.yaw = Math.atan2(dx, dz);
          moveSpeed = c.meta.speed * 1.6;
        } else {
          if (c.aiTimer <= 0) {
            c.aiTimer = 2 + Math.random() * 3.5;
            c.yaw = Math.random() < 0.35 ? c.yaw : Math.random() * Math.PI * 2;
          }
          moveSpeed = c.aiTimer > 1.2 ? c.meta.speed * 0.75 : 0;
        }
      }

      const dirX = -Math.sin(c.yaw);
      const dirZ = -Math.cos(c.yaw);
      c.vel.x = THREE.MathUtils.damp(c.vel.x, dirX * moveSpeed, 7, dt);
      c.vel.z = THREE.MathUtils.damp(c.vel.z, dirZ * moveSpeed, 7, dt);
      c.vel.y -= 22 * dt;

      const nx = c.pos.x + c.vel.x * dt;
      const nz = c.pos.z + c.vel.z * dt;
      const by = Math.floor(c.pos.y + 0.05);
      const s0 = getBlock(this.getBlockAt(Math.floor(nx), by, Math.floor(nz))).solid;
      const s1 = getBlock(this.getBlockAt(Math.floor(nx), by + 1, Math.floor(nz))).solid;
      const s2 = getBlock(this.getBlockAt(Math.floor(nx), by + 2, Math.floor(nz))).solid;

      if (!s0 && !s1) {
        c.pos.x = nx;
        c.pos.z = nz;
      } else if (s0 && !s1 && !s2 && c.onGround) {
        c.pos.x = nx;
        c.pos.z = nz;
        c.pos.y = by + 1.02;
        c.vel.y = 0;
      } else {
        c.vel.x = 0;
        c.vel.z = 0;
        if (c.meta.hostile) {
          if (c.onGround) c.vel.y = 7.4;
        } else {
          c.yaw += Math.PI * 0.65;
        }
      }

      c.pos.y += c.vel.y * dt;
      const gy = Math.floor(c.pos.y);
      if (getBlock(this.getBlockAt(Math.floor(c.pos.x), gy, Math.floor(c.pos.z))).solid && c.vel.y <= 0) {
        c.pos.y = gy + 1;
        c.vel.y = 0;
        c.onGround = true;
      } else {
        c.onGround = false;
      }

      if (c.pos.y < -4) {
        this.scene.remove(c.rig.root);
        c.rig.dispose();
        this.creatures.splice(i, 1);
        continue;
      }

      c.rig.root.position.copy(c.pos);
      c.rig.root.rotation.y = c.yaw;
      if (c.meta.species === 'creeper' && c.fuseTimer > 0) {
        const s = 1 + c.fuseTimer * 0.3;
        c.rig.root.scale.set(s, 1 + c.fuseTimer * 0.15, s);
      } else {
        c.rig.root.scale.setScalar(1);
      }

      const hSpeed = Math.hypot(c.vel.x, c.vel.z);
      if (hSpeed > 0.35) {
        c.walkPhase += dt * hSpeed * 3.2;
        const swing = Math.sin(c.walkPhase) * 0.58;
        for (let l = 0; l < c.rig.limbs.length; l++) {
          c.rig.limbs[l].rotation.x = l % 2 === 0 ? swing : -swing;
        }
      } else {
        for (let l = 0; l < c.rig.limbs.length; l++) {
          c.rig.limbs[l].rotation.x = THREE.MathUtils.damp(c.rig.limbs[l].rotation.x, 0, 8, dt);
        }
      }

      for (let m = 0; m < c.rig.materials.length; m++) {
        if (c.hitFlash > 0) c.rig.materials[m].color.setHex(0xff7777);
        else c.rig.materials[m].color.setHex(c.rig.baseColors[m]);
      }
    }

    for (let i = 0; i < this.bolts.length; i++) {
      const bolt = this.bolts[i];
      if (!bolt.active) continue;
      bolt.life -= dt;
      if (bolt.life <= 0) {
        bolt.active = false;
        bolt.mesh.visible = false;
        continue;
      }
      bolt.pos.addScaledVector(bolt.vel, dt);
      bolt.mesh.position.copy(bolt.pos);
      if (getBlock(this.getBlockAt(Math.floor(bolt.pos.x), Math.floor(bolt.pos.y), Math.floor(bolt.pos.z))).solid) {
        bolt.active = false;
        bolt.mesh.visible = false;
      } else if (bolt.friendlyToPlayer) {
        for (let k = this.creatures.length - 1; k >= 0; k--) {
          const target = this.creatures[k];
          if (!target.meta.hostile || target.health <= 0) continue;
          const r = target.meta.radius + 0.5;
          if (
            Math.abs(bolt.pos.x - target.pos.x) < r &&
            Math.abs(bolt.pos.z - target.pos.z) < r &&
            bolt.pos.y >= target.pos.y &&
            bolt.pos.y <= target.pos.y + target.meta.height + 0.3
          ) {
            bolt.active = false;
            bolt.mesh.visible = false;
            this.attackCreature(target, bolt.damage);
            break;
          }
        }
      } else if (
        !this.isDead &&
        !this.hardcoreSpectating &&
        Math.abs(bolt.pos.x - this.playerPos.x) < 0.55 &&
        Math.abs(bolt.pos.z - this.playerPos.z) < 0.55 &&
        bolt.pos.y >= this.playerPos.y &&
        bolt.pos.y <= this.playerPos.y + 1.8
      ) {
        bolt.active = false;
        bolt.mesh.visible = false;
        this.applyDamage(bolt.damage, 'Dusk Marksman Bolt');
      }
    }
  }

  updateAtmosphereAndLighting(dt: number) {
    this.timeOfDay = (this.timeOfDay + dt * 0.004) % 1;
    const angle = (this.timeOfDay - 0.25) * Math.PI * 2;
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    const dayAmount = THREE.MathUtils.clamp(sin * 1.8 + 0.35, 0, 1);

    const biome = BIOMES[this.currentBiome];
    const baseSky = this.seed === 666 ? '#1e293b' : biome.skyHorizon;
    const baseFog = this.seed === 666 ? '#0f172a' : biome.fogColor;

    targetCol.set(baseSky).lerp(nightCol.set('#090d1f'), 1 - dayAmount);
    (this.scene.background as THREE.Color).lerp(targetCol, 1 - Math.exp(-2.5 * dt));

    targetCol.set(baseFog).lerp(nightCol.set('#0b1120'), 1 - dayAmount);
    this.fog.color.lerp(targetCol, 1 - Math.exp(-2.5 * dt));
    this.fog.density = THREE.MathUtils.lerp(this.fog.density, biome.fogDensity, 1 - Math.exp(-2 * dt));

    this.sunLight.position.set(this.playerPos.x + cos * 45, Math.max(12, sin * 65), this.playerPos.z + 25);
    this.sunLight.target.position.copy(this.playerPos);
    this.sunLight.intensity = 0.25 + dayAmount * 1.45;
    this.hemiLight.intensity = 0.32 + dayAmount * 0.5;

    this.sunMesh.position.set(this.camera.position.x + cos * 160, this.camera.position.y + sin * 160, this.camera.position.z + 40);
    this.sunMesh.visible = sin > -0.15;
  }

  updateParticlesAndModels(dt: number) {
    let anyMoved = false;
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      if (!p.active) continue;
      anyMoved = true;
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        dummyObj.position.set(0, -999, 0);
        dummyObj.scale.setScalar(0.001);
        dummyObj.updateMatrix();
        this.particleMesh.setMatrixAt(i, dummyObj.matrix);
        continue;
      }
      p.vy -= 18 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      const scale = p.scale * (p.life / p.maxLife);
      dummyObj.position.set(p.x, p.y, p.z);
      dummyObj.rotation.set(p.life * 6, p.life * 4, 0);
      dummyObj.scale.setScalar(Math.max(0.01, scale));
      dummyObj.updateMatrix();
      this.particleMesh.setMatrixAt(i, dummyObj.matrix);
    }
    if (anyMoved) this.particleMesh.instanceMatrix.needsUpdate = true;

    const moveMag = Math.hypot(this.velocity.x, this.velocity.z);
    const bob = this.onGround && moveMag > 0.5 ? Math.sin(this.elapsed * 9) * 0.025 : 0;
    this.swingProgress = Math.max(0, this.swingProgress - dt * 5.2);
    const swing = Math.sin(this.swingProgress * Math.PI);
    const xScale = Math.min(1, this.camera.aspect / 1.05);
    this.handRig.group.position.set((0.38 - swing * 0.14) * xScale, -0.34 + bob - swing * 0.1, -0.52 - swing * 0.16);
    this.handRig.group.rotation.set(0.1 - swing * 0.95, -0.25 + swing * 0.35, 0.05 + swing * 0.25);

    for (const remote of this.remotePlayers.values()) {
      const stepDist = remote.rig.root.position.distanceTo(remote.targetPos);
      remote.rig.root.position.lerp(remote.targetPos, 1 - Math.exp(-12 * dt));
      remote.rig.root.rotation.y = remote.targetYaw;
      if (stepDist > 0.02) {
        remote.walkPhase += dt * 12;
        const limb = Math.sin(remote.walkPhase) * 0.65;
        remote.rig.leftLeg.rotation.x = limb;
        remote.rig.rightLeg.rotation.x = -limb;
        remote.rig.leftArm.rotation.x = -limb * 0.7;
        remote.rig.rightArm.rotation.x = limb * 0.7;
      } else {
        remote.rig.leftLeg.rotation.x = THREE.MathUtils.damp(remote.rig.leftLeg.rotation.x, 0, 10, dt);
        remote.rig.rightLeg.rotation.x = THREE.MathUtils.damp(remote.rig.rightLeg.rotation.x, 0, 10, dt);
        remote.rig.leftArm.rotation.x = THREE.MathUtils.damp(remote.rig.leftArm.rotation.x, 0, 10, dt);
        remote.rig.rightArm.rotation.x = THREE.MathUtils.damp(remote.rig.rightArm.rotation.x, 0, 10, dt);
      }
    }
  }

  emitHud() {
    const creatureHit = !this.isTitlePreview && !this.isPaused ? this.raycastCreature(5.5) : null;
    const voxelHit = !this.isTitlePreview && !this.isPaused ? this.raycastVoxel(6.5) : null;
    if (voxelHit && !creatureHit) {
      this.highlightBox.visible = true;
      this.highlightBox.position.set(voxelHit.x + 0.5, voxelHit.y + 0.5, voxelHit.z + 0.5);
    } else {
      this.highlightBox.visible = false;
    }

    const tool = getToolDef(this.hotbar[this.selectedSlot] ?? BlockId.STONE);
    const mult = voxelHit ? getMiningMultiplier(tool, voxelHit.block.category, voxelHit.block.id) : 1;
    const timeNeeded = voxelHit
      ? Math.max(0.08, (voxelHit.block.hardness * (this.worldRules === 'creative' ? 0.16 : 0.48)) / mult)
      : 1;

    const invRecord: Record<number, number> = {};
    for (const [k, v] of this.inventory.entries()) invRecord[k] = v;

    let animalCount = 0;
    let hostileCount = 0;
    let boss: CreatureInstance | null = null;
    for (let i = 0; i < this.creatures.length; i++) {
      const c = this.creatures[i];
      if (c.meta.isBoss) boss = c;
      if (c.meta.hostile) hostileCount++;
      else animalCount++;
    }

    const kingBoss = boss
      ? {
          name: boss.meta.name,
          title:
            boss.meta.species === 'mango_guardian'
              ? 'Helpful Guardian · Village Mango Birds (Seed 555)'
              : boss.meta.species === 'ignis_lord'
              ? 'Lord of the Volcano · Seed 777'
              : boss.meta.species === 'sky_warden'
              ? 'Champion of Cloudhaven · Seed 888'
              : boss.meta.species === 'mega_titan'
              ? 'Super Colossus · Seed 666'
              : 'Sovereign of Crimsonkeep · Seed 999',
          health: Math.max(0, Math.ceil(boss.health)),
          maxHealth: boss.meta.maxHealth,
          phase: (boss.health <= boss.meta.maxHealth * 0.5 ? 2 : 1) as 1 | 2,
          distance: Math.round(Math.hypot(this.playerPos.x - boss.pos.x, this.playerPos.z - boss.pos.z)),
          friendlyAlly: !!boss.meta.friendlyAlly,
        }
      : null;

    this.callbacks.onHudUpdate({
      worldRules: this.worldRules,
      biome: BIOMES[this.currentBiome],
      discoveredBiomes: Array.from(this.discoveredBiomes),
      coords: [Math.round(this.playerPos.x), Math.round(this.playerPos.y), Math.round(this.playerPos.z)],
      health: Math.round(this.health),
      maxHealth: this.maxHealth,
      stamina: Math.round(this.stamina),
      flyMode: this.flyMode,
      isDead: this.isDead,
      timeOfDay: this.timeOfDay,
      targetBlock:
        voxelHit && !creatureHit
          ? {
              x: voxelHit.x,
              y: voxelHit.y,
              z: voxelHit.z,
              block: voxelHit.block,
              progress: this.mouseHeldLeft ? Math.min(1, this.miningTimer / timeNeeded) : 0,
            }
          : null,
      targetCreature: creatureHit
        ? {
            name: creatureHit.creature.meta.name,
            hostile: creatureHit.creature.meta.hostile,
            friendlyAlly: !!creatureHit.creature.meta.friendlyAlly,
            health: Math.max(0, Math.ceil(creatureHit.creature.health)),
            maxHealth: creatureHit.creature.meta.maxHealth,
          }
        : null,
      animalCount,
      hostileCount,
      hotbar: [...this.hotbar],
      inventory: invRecord,
      selectedSlot: this.selectedSlot,
      pointerLocked: this.pointerLocked,
      fps: this.currentFps,
      onlineCount: this.remotePlayers.size + 1,
      toast: this.toastMsg,
      portalCharge: this.portalCharge,
      portalDestName: this.portalCharge > 0 ? this.getTargetPortalBiome().name : null,
      kingBoss,
      bossDefeated: this.bossDefeated,
    });
  }

  scheduleNextFrame() {
    if (this.disposed) return;
    if (this.isSoftwareGl) {
      this.afterDraw(() => this.tick());
    } else {
      this.frameId = requestAnimationFrame(() => this.tick());
    }
  }

  afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const check = () => {
      if (this.disposed) {
        if (sync) gl.deleteSync(sync);
        return;
      }
      if (sync && gl.getSyncParameter(sync, gl.SYNC_STATUS) === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(check, 5);
        return;
      }
      if (sync) gl.deleteSync(sync);
      this.frameId = window.setTimeout(cb, 80);
    };
    this.frameId = window.setTimeout(check, 5);
  }

  tick = () => {
    if (this.disposed) return;
    const rawDelta = this.clock.getDelta();
    const dt = Math.min(rawDelta, 0.05);
    this.elapsed += dt;
    this.fpsFrames++;
    this.fpsAccum += rawDelta;
    if (this.fpsAccum >= 0.5) {
      this.currentFps = Math.round(this.fpsFrames / this.fpsAccum);
      this.fpsFrames = 0;
      this.fpsAccum = 0;
    }

    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toastMsg = null;
    }

    if (this.hitstopTimer > 0) {
      this.hitstopTimer -= dt;
    } else if (this.isTitlePreview) {
      this.titleAngle += dt * 0.11;
      const is999 = this.seed === 999;
      const is777 = this.seed === 777;
      const is888 = this.seed === 888;
      const is666 = this.seed === 666;
      const is555 = this.seed === 555;
      const rad = is888 ? 42 : is666 || is555 ? 38 : is999 || is777 ? 36 : 26;
      const cx = is999 || is777 || is888 || is666 || is555 ? 0 : 8;
      const cy = is777 ? 35 : is888 ? 33 : is666 || is555 ? 27 : is999 ? 26 : 22;
      const cz = is777 ? -22 : is888 ? -8 : is666 || is555 ? -12 : is999 ? -10 : 8;
      const camX = cx + Math.cos(this.titleAngle) * rad;
      const camZ = cz + Math.sin(this.titleAngle) * rad;
      const camY = (is777 ? 50 : is888 ? 49 : is666 || is555 ? 46 : is999 ? 43 : 38) + Math.sin(this.titleAngle * 0.7) * 3;
      this.camera.position.set(camX, camY, camZ);
      this.camera.rotation.order = 'XYZ';
      this.camera.lookAt(cx, cy, cz);
      this.updateChunksAround(cx, cz, false);
      this.updateAtmosphereAndLighting(dt * 0.6);
      this.updateCreatures(dt);
    } else if (!this.isPaused) {
      this.updatePhysics(dt);
      this.updatePortalLogic(dt);
      this.updatePrimedTnts(dt);
      this.updateCreatures(dt);
      this.updateChunksAround(this.playerPos.x, this.playerPos.z, false);
      this.updateAtmosphereAndLighting(dt);
      this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 0.35);
      const jx = (Math.random() - 0.5) * this.shakeIntensity;
      const jy = (Math.random() - 0.5) * this.shakeIntensity;
      this.camera.position.set(this.playerPos.x + jx, this.playerPos.y + 1.56 + jy, this.playerPos.z);
      this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');

      this.netMoveTimer += dt;
      if (this.netMoveTimer >= 0.066) {
        this.netMoveTimer = 0;
        this.callbacks.onPlayerMove?.(
          this.playerPos.x,
          this.playerPos.y,
          this.playerPos.z,
          this.yaw,
          this.pitch,
          this.hotbar[this.selectedSlot] ?? BlockId.GRASS,
          this.currentBiome
        );
      }
    }

    this.updateParticlesAndModels(dt);
    this.hudTimer += dt;
    if (this.hudTimer >= 0.08 && !this.isTitlePreview) {
      this.hudTimer = 0;
      this.emitHud();
    }

    this.renderer.render(this.scene, this.camera);
    this.scheduleNextFrame();
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);
    this.resizeObserver.disconnect();
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('orientationchange', this.onOrientationChange);
    window.visualViewport?.removeEventListener('resize', this.onResize);
    window.removeEventListener('blur', this.onWindowBlur);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    window.removeEventListener('wheel', this.onWheel);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    this.renderer.domElement.removeEventListener('mousedown', this.onMouseDown);
    this.renderer.domElement.removeEventListener('contextmenu', this.onContextMenu);

    for (const chunk of this.chunks.values()) this.disposeChunkMeshes(chunk);
    this.chunks.clear();
    this.clearAllCreatures();
    this.clearPrimedTnts();
    for (const remote of this.remotePlayers.values()) remote.rig.dispose();
    this.remotePlayers.clear();

    this.handRig.dispose();
    this.boltGeo.dispose();
    this.boltMat.dispose();
    this.tntGeo.dispose();
    this.tntMat.dispose();
    this.atlas.dispose();
    this.opaqueMat.dispose();
    this.transparentMat.dispose();
    this.particleMesh.geometry.dispose();
    (this.particleMesh.material as THREE.Material).dispose();
    this.highlightBox.geometry.dispose();
    (this.highlightBox.material as THREE.Material).dispose();
    this.sunMesh.geometry.dispose();
    (this.sunMesh.material as THREE.Material).dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
