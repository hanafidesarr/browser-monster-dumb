import * as THREE from 'three';
import { ALL_LEVELS, LevelDefinition } from '../src/level/LevelData';
import { MonsterController } from '../src/monster/MonsterController';
import { MonsterModel } from '../src/monster/MonsterModel';
import { AudioManager } from '../src/core/AudioManager';
import { GridPathfinding } from '../src/pathfinding/GridPathfinding';
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

console.log('=== MONSTER DUMB — LEVEL 2 KUNTILANAK MERANGKAK AUDIT ===\n');

// Mock DOM / Canvas / AudioContext for SSR test environment
const dummyCtx: any = new Proxy({
  canvas: { width: 64, height: 64 },
  fillStyle: '#000',
  createLinearGradient: () => ({ addColorStop: () => {} }),
  createRadialGradient: () => ({ addColorStop: () => {} }),
  getImageData: () => ({ data: new Uint8ClampedArray(64 * 64 * 4) }),
}, {
  get(target, prop) {
    if (prop in target) return (target as any)[prop];
    return () => {};
  }
});

const createMockElement = () => ({
  width: 64,
  height: 64,
  getContext: () => dummyCtx,
  style: {},
  addEventListener: () => {},
  removeEventListener: () => {},
  appendChild: () => {},
  setAttribute: () => {},
  classList: { add: () => {}, remove: () => {}, contains: () => false },
  src: '',
  onload: () => {},
});

(globalThis as any).document = {
  createElement: (_tag: string) => createMockElement(),
  createElementNS: (_ns: string, _tag: string) => createMockElement(),
  getElementById: (_id: string) => createMockElement(),
  querySelector: (_sel: string) => createMockElement(),
};

(globalThis as any).window = {
  innerWidth: 1920,
  innerHeight: 1080,
  AudioContext: class {
    currentTime = 0;
    sampleRate = 44100;
    state = 'running';
    destination = {};
    createGain() { return { gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: () => {} }; }
    createBuffer(c: number, l: number, r: number) { return { getChannelData: () => new Float32Array(l) }; }
    createBufferSource() { return { buffer: null, connect: () => {}, start: () => {}, stop: () => {} }; }
    createBiquadFilter() { return { type: '', frequency: { setValueAtTime: () => {} }, Q: { setValueAtTime: () => {} }, connect: () => {} }; }
    createOscillator() { return { type: '', frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: () => {}, start: () => {}, stop: () => {} }; }
    resume() { return Promise.resolve(); }
    decodeAudioData() { return Promise.resolve({}); }
  },
};

(globalThis as any).localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
};

// 1. Level 2 Definition Check
console.log('--- Test 1: Level 2 Definition & Monster Archetype ---');
const level2 = ALL_LEVELS.find((l) => l.id === 2)!;
assert(!!level2, 'Level 2 definition found');
assert(level2.monsterType === 'kunti', 'Level 2 monsterType is explicitly "kunti"');
assert(level2.theme === 'school', 'Level 2 theme is school');

// 2. Kunti Model Structure & Crawling Posture
console.log('\n--- Test 2: MonsterModel "kunti" Archetype Structure ---');
const kuntiModel = new MonsterModel('kunti');
assert(kuntiModel.monsterType === 'kunti', 'Model monsterType is "kunti"');
assert(kuntiModel.group.name === 'KuntiRoot', 'Model group name is "KuntiRoot"');
assert(kuntiModel.innerGroup.name === 'KuntiBody', 'Model innerGroup name is "KuntiBody"');

const placeholder = kuntiModel.innerGroup.getObjectByName('KuntiPlaceholder');
assert(!!placeholder, 'Procedural crawler placeholder created for Kuntilanak (zero missing frames)');

// Compute placeholder bounds
const box = new THREE.Box3().setFromObject(placeholder!);
const size = new THREE.Vector3();
box.getSize(size);
assert(box.max.y <= 0.85, `Crawler placeholder maximum height is low (${box.max.y.toFixed(2)}m <= 0.85m)`);
assert(size.z >= 0.5, `Crawler placeholder extends horizontally along Z (${size.z.toFixed(2)}m)`);

// 3. Resting Posture & Animation States
console.log('\n--- Test 3: Kuntilanak Animation Postures & Zero Upright Drift ---');
kuntiModel.applySittingPosture(1.0);
assert(kuntiModel.innerGroup.position.y <= 0.1, 'Sitting posture stays grounded and low');

kuntiModel.applyHitReaction(0.5, 'surprise');
assert(kuntiModel.innerGroup.position.y <= 0.2, 'Hit reaction flinches low on the ground');

kuntiModel.applyCrawl(0.016, 5.16);
assert(kuntiModel.innerGroup.position.y === 0, 'Crawl posture innerGroup position Y is exactly 0 (stays on floor)');

// 4. MonsterController Chase & Crawling Logic (Zero Parabolic Jump)
console.log('\n--- Test 4: MonsterController Level 2 Crawl Chase Navigation ---');
const mc = new MonsterController('kunti');
assert(mc.monsterType === 'kunti', 'MonsterController initialized with "kunti"');

const pf = new GridPathfinding(level2.grid, level2.gridWidth, level2.gridHeight, level2.cellSize);
mc.setLevel(level2, pf, { x: 0, y: 0, z: 0, rotationY: 0 });
assert(mc.monsterType === 'kunti', 'setLevel preserves "kunti" monsterType');

// Wake up monster to CHASE
mc.wakeUpAndChase();
mc.update(0.55, 0.55, new THREE.Vector3(5, 0, 5)); // Finish STAND_UP (duration 0.50s) -> enter CHASE
assert(mc.state === 'CHASE', 'MonsterController successfully transitioned to CHASE state');

// Simulate 20 chase frames (dt = 0.05s)
let maxAirborneY = 0;
for (let i = 0; i < 20; i++) {
  mc.update(0.05, 0.3 + (i + 1) * 0.05, new THREE.Vector3(10, 0, 10));
  if (mc.position.y > maxAirborneY) {
    maxAirborneY = mc.position.y;
  }
}

assert(maxAirborneY === 0, `Kuntilanak chase remains strictly grounded on floor: max Y = ${maxAirborneY}m (Pocong hops to 0.95m)`);

// 5. Audio Routing for Kuntilanak
console.log('\n--- Test 5: Audio Routing & Assets ---');
const audio = AudioManager.getInstance();
assert(typeof (audio as any).loadKuntiAudio === 'function', 'AudioManager.loadKuntiAudio exists');
assert(typeof (audio as any).playKuntiSound === 'function', 'AudioManager.playKuntiSound exists');
assert(typeof (audio as any).playKuntiCrawl === 'function', 'AudioManager.playKuntiCrawl exists');

// Verify scream routing
let screamPlayed = false;
const origPlayKunti = (audio as any).playKuntiSound;
(audio as any).playKuntiSound = () => { screamPlayed = true; };
audio.playMonsterScream('kunti');
assert(screamPlayed, 'playMonsterScream("kunti") routes directly to playKuntiSound');
(audio as any).playKuntiSound = origPlayKunti;

// 6. Regression Testing: Level 1 and Levels 3-10 MUST retain Pocong
console.log('\n--- Test 6: Regression Safety: Levels 1 and 3-10 Retain Pocong ---');
const level1 = ALL_LEVELS.find((l) => l.id === 1)!;
assert(!level1.monsterType || level1.monsterType === 'pocong', 'Level 1 retains "pocong" monster archetype');

const mcLevel1 = new MonsterController();
mcLevel1.setLevel(level1, pf, { x: 0, y: 0, z: 0, rotationY: 0 });
assert(mcLevel1.monsterType === 'pocong', 'Level 1 MonsterController operates as "pocong"');

// Level 1 Pocong MUST hop during chase
mcLevel1.wakeUpAndChase();
mcLevel1.update(0.55, 0.55, new THREE.Vector3(5, 0, 5));
let pocongMaxY = 0;
for (let i = 0; i < 30; i++) {
  mcLevel1.update(0.05, 0.55 + (i + 1) * 0.05, new THREE.Vector3(10, 0, 10));
  if (mcLevel1.position.y > pocongMaxY) {
    pocongMaxY = mcLevel1.position.y;
  }
}
assert(pocongMaxY > 0.5, `Level 1 Pocong hops high in the air during chase (peak Y: ${pocongMaxY.toFixed(2)}m >= 0.5m)`);

for (let id = 3; id <= 10; id++) {
  const l = ALL_LEVELS.find((lvl) => lvl.id === id)!;
  assert(!l.monsterType || l.monsterType === 'pocong', `Level ${id} retains "pocong" monster archetype`);
}

console.log(`\n======================================================`);
console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log(`======================================================\n`);

if (failed > 0) {
  process.exit(1);
}
