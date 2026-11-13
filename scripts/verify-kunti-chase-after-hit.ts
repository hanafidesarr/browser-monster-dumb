import * as THREE from 'three';
import { ALL_LEVELS } from '../src/level/LevelData';
import { LabyrinthBuilder } from '../src/level/LabyrinthBuilder';
import { MonsterController } from '../src/monster/MonsterController';
import { GridPathfinding } from '../src/pathfinding/GridPathfinding';
import { GameManager } from '../src/core/GameManager';
import { WEAPON_MAP } from '../src/weapon/WeaponData';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++;
    console.log(`  [PASS] ${message}`);
  } else {
    failed++;
    console.error(`  [FAIL] ${message}`);
  }
}

console.log('=== VERIFY KUNTILANAK CHASE AFTER HIT / GRENADE BLAST ===\n');

// Mock DOM, WebGL & Audio
const mockGL = {
  getShaderPrecisionFormat: () => ({ precision: 24, rangeMin: 1, rangeMax: 1 }),
  getExtension: () => null,
  getParameter: (param: any) => {
    if (param === 0x1F02 || param === 0x1F03 || param === 0x1F00 || param === 0x1F01) {
      return 'WebGL 2.0';
    }
    return 16;
  },
  createTexture: () => ({}),
  bindTexture: () => {},
  texParameteri: () => {},
  createProgram: () => ({}),
  createShader: () => ({}),
  attachShader: () => {},
  linkProgram: () => {},
  getProgramParameter: () => true,
  getShaderParameter: () => true,
  useProgram: () => {},
  viewport: () => {},
  clearColor: () => {},
  clear: () => {},
  enable: () => {},
  disable: () => {},
  blendFunc: () => {},
  depthFunc: () => {},
  frontFace: () => {},
  cullFace: () => {},
};

function createMockProxy(): any {
  const p: any = new Proxy(() => p, {
    get: (target: any, prop: string | symbol) => {
      if (prop === 'getContext') return () => mockGL;
      if (prop === 'getImageData') return () => ({ data: new Uint8ClampedArray(1024) });
      if (prop === 'value') return '50';
      if (prop === Symbol.toPrimitive) return () => 'mock';
      return createMockProxy();
    },
    apply: () => createMockProxy(),
  });
  return p;
}

(globalThis as any).window = {
  innerWidth: 1920,
  innerHeight: 1080,
  AudioContext: class {
    currentTime = 0;
    sampleRate = 44100;
    state = 'running';
    destination = {};
    createBufferSource = () => ({ connect: () => {}, start: () => {}, stop: () => {} });
    createGain = () => ({ connect: () => {}, gain: { value: 1, setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, setTargetAtTime: () => {}, cancelScheduledValues: () => {} } });
    createOscillator = () => ({ connect: () => {}, start: () => {}, stop: () => {}, frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, linearRampToValueAtTime: () => {} } });
    createBiquadFilter = () => ({
      connect: () => {},
      frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, linearRampToValueAtTime: () => {} },
      Q: { setValueAtTime: () => {} },
      gain: { value: 0, setValueAtTime: () => {}, linearRampToValueAtTime: () => {} },
    });
    createBuffer = () => ({ getChannelData: () => new Float32Array(100), duration: 2.58 });
    decodeAudioData = async () => ({ duration: 2.58 });
    resume = async () => {};
  },
  webkitAudioContext: (globalThis as any).AudioContext,
  addEventListener: () => {},
  removeEventListener: () => {},
};

(globalThis as any).document = {
  getElementById: () => createMockProxy(),
  querySelector: () => createMockProxy(),
  querySelectorAll: () => [],
  createElement: () => ({
    width: 256,
    height: 256,
    style: {},
    classList: { add: () => {}, remove: () => {}, contains: () => false },
    addEventListener: () => {},
    appendChild: () => {},
    getContext: (type: string) => (type === 'webgl' || type === 'webgl2' ? mockGL : createMockProxy()),
  }),
  createElementNS: () => createMockProxy(),
  body: createMockProxy(),
  addEventListener: () => {},
  removeEventListener: () => {},
  exitPointerLock: () => {},
};

(globalThis as any).localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

// -----------------------------------------------------------------------------
// TEST 1: Kuntilanak Detaches and Actively Chases After Weapon Strike
// -----------------------------------------------------------------------------
console.log('--- TEST 1: Kuntilanak Detaches & Chases Player After Weapon Strike ---');
const level2Def = ALL_LEVELS.find((l) => l.id === 2)!;
const buildResult = LabyrinthBuilder.buildLevel(level2Def);
const pathfinding = new GridPathfinding(buildResult.updatedGrid, level2Def.cellSize);

const kunti = new MonsterController('kunti');
kunti.setLevel(level2Def, pathfinding, buildResult.monsterWorldSpawn, buildResult.collisionConfig);

assert(kunti.isWallClinging === true, 'Kuntilanak starts clinging to the wall in SITTING_IDLE');
assert(kunti.position.y === kunti.wallClingY, `Kuntilanak is elevated at wallClingY (${kunti.wallClingY}m)`);
const wallClingX = kunti.position.x;
const wallClingZ = kunti.position.z;

// Player is waiting in the corridor at (-10, 1.65, -30)
const playerPos = new THREE.Vector3(-10, 1.65, -30);

// Strike with weapon
kunti.triggerWeaponHit(WEAPON_MAP.frying_pan);
assert(kunti.state === 'HIT_REACTION', 'Kuntilanak enters HIT_REACTION upon weapon strike');

// Advance hit reaction animation (duration 0.60s, advance 45 * 0.016 = 0.72s)
for (let i = 0; i < 45; i++) {
  kunti.update(0.016, i * 0.016, playerPos, true);
}

assert(Math.abs(kunti.position.y - (kunti as any).baseGroundY) <= 0.05, `Kuntilanak dropped to floor level (y = ${kunti.position.y.toFixed(2)}m)`);
assert(kunti.isWallClinging === false, 'Kuntilanak isWallClinging is FALSE');

// Verify that Kuntilanak stepped forward out into the room (away from the wall)
const distFromWallPoint = Math.hypot(kunti.position.x - wallClingX, kunti.position.z - wallClingZ);
assert(distFromWallPoint >= 0.45, `Kuntilanak stepped out into the open room by ${distFromWallPoint.toFixed(2)}m (clear of wall collision)`);

// Advance scream animation (duration 0.70s, advance 50 * 0.016 = 0.80s)
for (let i = 0; i < 50; i++) {
  kunti.update(0.016, 0.72 + i * 0.016, playerPos, true);
}

assert(kunti.state === 'CHASE', `Kuntilanak transitions into CHASE state (current: ${kunti.state})`);

// Now advance CHASE phase for 2.0 seconds and observe active crawling locomotion!
const chaseStartPos = kunti.position.clone();
const initialDistToPlayer = Math.hypot(kunti.position.x - playerPos.x, kunti.position.z - playerPos.z);

for (let i = 0; i < 120; i++) {
  kunti.update(0.016, 1.52 + i * 0.016, playerPos, true);
}

const finalDistToPlayer = Math.hypot(kunti.position.x - playerPos.x, kunti.position.z - playerPos.z);
const distMoved = Math.hypot(kunti.position.x - chaseStartPos.x, kunti.position.z - chaseStartPos.z);

assert(distMoved > 2.0, `Kuntilanak actively crawls forward in chase (moved ${distMoved.toFixed(2)}m)!`);
assert(finalDistToPlayer < initialDistToPlayer, `Kuntilanak successfully closes distance to player (initial: ${initialDistToPlayer.toFixed(2)}m -> final: ${finalDistToPlayer.toFixed(2)}m)!`);

// -----------------------------------------------------------------------------
// TEST 2: Kuntilanak Detaches and Chases After Grenade Explosion
// -----------------------------------------------------------------------------
console.log('\n--- TEST 2: Grenade Detonation Triggers Kuntilanak Chase ---');

const gm = Object.create(GameManager.prototype);
gm.state = 'STEALTH';
gm.isAttackSuccessful = false;
gm.currentLevelDef = level2Def;
gm.levelBuild = buildResult;
gm.pathfinding = pathfinding;
gm.fpController = {
  setMonsterObstacle: () => {},
  weapon: {
    disableAttackPermanently: () => {},
    setVisible: () => {},
    reset: () => {},
  },
};
gm.triggerScreenShake = () => {};

// New Kunti on wall
const kunti2 = new MonsterController('kunti');
kunti2.setLevel(level2Def, pathfinding, buildResult.monsterWorldSpawn, buildResult.collisionConfig);
gm.monsters = [kunti2];

// Hook up chase callback
let chaseStartedFired = false;
kunti2.onChaseStarted = () => {
  chaseStartedFired = true;
};

// Grenade explodes in the room 2.0m in front of Kuntilanak's wall position (towards open room)
const kuntiPos = kunti2.position.clone();
const grenadeImpact = new THREE.Vector3(
  kuntiPos.x + (kunti2 as any).wallLandPos.x - kuntiPos.x,
  kunti2.wallClingY - 1.2,
  kuntiPos.z + (kunti2 as any).wallLandPos.z - kuntiPos.z
);

(gm as any).handleGrenadeDetonation(grenadeImpact, WEAPON_MAP.grenade);

assert(gm.isAttackSuccessful === true, 'Grenade explosion successfully triggered hit on Kuntilanak!');
assert(kunti2.state === 'HIT_REACTION', 'Kuntilanak entered HIT_REACTION from grenade blast');

// Advance hit reaction (0.60s) and scream (0.70s) -> total 1.30s (95 * 0.016s = 1.52s)
for (let i = 0; i < 95; i++) {
  kunti2.update(0.016, i * 0.016, playerPos, true);
}

assert(kunti2.state === 'CHASE', 'Kuntilanak enters CHASE state after grenade blast!');
assert(chaseStartedFired === true, 'onChaseStarted callback was executed to trigger gameplay chase phase!');

// Advance chase 1.8 seconds (110 steps)
const preChasePos = kunti2.position.clone();
for (let i = 0; i < 110; i++) {
  kunti2.update(0.016, 1.52 + i * 0.016, playerPos, true);
}

const postChaseMoved = Math.hypot(kunti2.position.x - preChasePos.x, kunti2.position.z - preChasePos.z);
assert(postChaseMoved > 1.5, `Kuntilanak crawls aggressively toward player after grenade blast (traveled ${postChaseMoved.toFixed(2)}m)!`);

console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===`);
if (failed > 0) process.exit(1);
