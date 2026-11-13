import * as THREE from 'three';
import { ALL_LEVELS } from '../src/level/LevelData';
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

console.log('=== MONSTER DUMB — KUNTILANAK WALL CLING & FACE JUMPSCARE AUDIT ===\n');

// Mock DOM & Audio
function createMockProxy(): any {
  const p: any = new Proxy(() => p, {
    get: (target: any, prop: string) => {
      if (prop === 'getImageData') return () => ({ data: new Uint8ClampedArray(1024) });
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
    createBiquadFilter = () => ({ connect: () => {}, frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, linearRampToValueAtTime: () => {} }, Q: { setValueAtTime: () => {} } });
    createBuffer = () => ({ getChannelData: () => new Float32Array(100), duration: 2.58 });
    decodeAudioData = async () => ({ duration: 2.58 });
    resume = async () => {};
  },
  addEventListener: () => {},
  removeEventListener: () => {},
};

(globalThis as any).localStorage = {
  store: {} as Record<string, string>,
  getItem(key: string) { return this.store[key] || null; },
  setItem(key: string, val: string) { this.store[key] = val; },
  removeItem(key: string) { delete this.store[key]; },
  clear() { this.store = {}; },
};

(globalThis as any).document = {
  createElement: () => ({
    width: 256,
    height: 256,
    style: {},
    classList: { add: () => {}, remove: () => {}, contains: () => false },
    addEventListener: () => {},
    appendChild: () => {},
    getContext: () => createMockProxy(),
  }),
  createElementNS: () => ({
    style: {},
    classList: { add: () => {}, remove: () => {}, contains: () => false },
    addEventListener: () => {},
    appendChild: () => {},
  }),
  getElementById: () => null,
  querySelector: () => null,
};

// -----------------------------------------------------------------------------
// Test 1: Kuntilanak Wall-Clinging Initialization
// -----------------------------------------------------------------------------
console.log('--- Test 1: Kuntilanak Wall-Clinging Position & Posture ---');

const lvl2 = ALL_LEVELS[1];
const dummyNavGrid = Array.from({ length: 21 }, () => Array(21).fill(0));
const pathfinder = new GridPathfinding(dummyNavGrid, 3.8);

const kunti = new MonsterController('kunti');
kunti.setLevel(lvl2, pathfinder, { x: 4 * 3.8 - (21 * 3.8) / 2, y: 0, z: 2 * 3.8 - (21 * 3.8) / 2, rotationY: 0 });

assert(kunti.monsterType === 'kunti', 'Monster is Kuntilanak');
assert(kunti.state === 'SITTING_IDLE', 'Kuntilanak starts in SITTING_IDLE');
assert(kunti.isWallClinging === true, 'Kuntilanak isWallClinging is TRUE before being struck');
assert(kunti.position.y === kunti.wallClingY, `Kuntilanak position.y (${kunti.position.y}m) is elevated on wall at wallClingY (1.85m)`);

// Update idle state: stays on the wall with cicak posture
kunti.update(0.016, 0.5, new THREE.Vector3(0, 1.65, 0), false);
assert(kunti.position.y === kunti.wallClingY, 'Kuntilanak maintains wall-clinging height while idle in stealth phase');
assert(kunti.isWallClinging === true, 'Kuntilanak remains clinging to the wall');

const innerRot = (kunti as any).model.innerGroup.rotation;
const innerPos = (kunti as any).model.innerGroup.position;
assert(Math.abs(innerRot.x - (-Math.PI / 2)) < 0.05, `Kuntilanak body is rotated vertically flat along wall (rotX: ${innerRot.x.toFixed(2)}, expected: ${(-Math.PI / 2).toFixed(2)})`);
assert(Math.abs(innerRot.z - Math.PI) < 0.1, `Kuntilanak limbs and belly face wall in cicak posture (rotZ: ${innerRot.z.toFixed(2)}, expected: ${Math.PI.toFixed(2)})`);
assert(innerPos.z <= 0, `Kuntilanak innerGroup offset (${innerPos.z.toFixed(2)}m) presses hands and feet flush to the wall`);

// -----------------------------------------------------------------------------
// Test 2: Striking Kuntilanak Detaches Her From Wall to the Floor
// -----------------------------------------------------------------------------
console.log('\n--- Test 2: Weapon Strike Detaches Kuntilanak to Floor ---');

const panWeapon = WEAPON_MAP.frying_pan;
kunti.triggerWeaponHit(panWeapon);

assert(kunti.state === 'HIT_REACTION', 'Kuntilanak enters HIT_REACTION state upon weapon strike');
assert(kunti.isAwake === true, 'Kuntilanak isAwake is TRUE');

// Advance hit reaction animation (drops to floor)
for (let t = 0; t < 45; t++) {
  kunti.update(0.016, t * 0.016, new THREE.Vector3(0, 1.65, 0), true);
}

assert(kunti.position.y <= 0.01, `Kuntilanak drops to floor level upon hit (y: ${kunti.position.y.toFixed(2)}m)`);
assert(kunti.isWallClinging === false, 'Kuntilanak isWallClinging is FALSE after hit');
assert(kunti.state === 'SCREAM' || kunti.state === 'STAND_UP' || kunti.state === 'CHASE',
  `Kuntilanak advances into scream/standup/chase (current: ${kunti.state})`);

// Advance into chase
for (let t = 0; t < 100; t++) {
  kunti.update(0.016, t * 0.016, new THREE.Vector3(0, 1.65, 0), true);
}

assert(kunti.state === 'CHASE', 'Kuntilanak chases as usual along the floor');
assert(kunti.position.y === 0, 'Kuntilanak chases at floor level (ground Y)');

// -----------------------------------------------------------------------------
// Test 3: Face-Framed Jumpscare on Capture (All Monsters / Level 1 & Level 2)
// -----------------------------------------------------------------------------
console.log('\n--- Test 3: Face-Framed Jumpscare on Capture ---');

// Simulate Player Camera at (10, 1.65, 10), facing +Z
const mockPlayerCam = new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 100);
mockPlayerCam.position.set(10, 1.65, 10);
mockPlayerCam.lookAt(10, 1.65, 20); // Forward is (0, 0, 1)

// Test Kuntilanak Capture Framing
const capturingKunti = new MonsterController('kunti');
capturingKunti.setLevel(lvl2, pathfinder, { x: 10, y: 0, z: 12, rotationY: 0 });

// Trigger jumpscare positioning directly in front of camera
const forward = new THREE.Vector3(0, 0, 1);
const camPos = mockPlayerCam.position;
capturingKunti.position.copy(camPos).addScaledVector(forward, 0.68);
capturingKunti.position.y = camPos.y - 0.55; // Kunti eye offset
capturingKunti.rotationY = Math.atan2(-forward.x, -forward.z);
capturingKunti.state = 'CATCH_PLAYER';
capturingKunti.model.applyCatch(0);

const kuntiDistToCam = Math.hypot(
  capturingKunti.position.x - camPos.x,
  capturingKunti.position.z - camPos.z
);
assert(Math.abs(kuntiDistToCam - 0.68) < 0.01, `Kuntilanak face is positioned directly in front of player (dist: ${kuntiDistToCam.toFixed(2)}m)`);
assert(Math.abs((capturingKunti.position.y + 0.55) - camPos.y) < 0.01, 'Kuntilanak face/eyes align exactly with player eye level (1.65m)');

// Test Pocong Capture Framing
const capturingPocong = new MonsterController('pocong');
capturingPocong.setLevel(ALL_LEVELS[0], pathfinder, { x: 10, y: 0, z: 12, rotationY: 0 });

capturingPocong.position.copy(camPos).addScaledVector(forward, 0.68);
capturingPocong.position.y = camPos.y - 1.62; // Pocong eye offset
capturingPocong.rotationY = Math.atan2(-forward.x, -forward.z);
capturingPocong.state = 'CATCH_PLAYER';
capturingPocong.model.applyCatch(0);

const pocongDistToCam = Math.hypot(
  capturingPocong.position.x - camPos.x,
  capturingPocong.position.z - camPos.z
);
assert(Math.abs(pocongDistToCam - 0.68) < 0.01, `Pocong face is positioned directly in front of player (dist: ${pocongDistToCam.toFixed(2)}m)`);
assert(Math.abs((capturingPocong.position.y + 1.62) - camPos.y) < 0.01, 'Pocong face/eyes align exactly with player eye level (1.65m)');

console.log(`\n======================================================================`);
console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log(`======================================================================\n`);

if (failed > 0) {
  process.exit(1);
}
