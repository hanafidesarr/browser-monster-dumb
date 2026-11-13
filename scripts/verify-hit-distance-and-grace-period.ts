import * as THREE from 'three';
import { ALL_LEVELS } from '../src/level/LevelData';
import { MonsterController } from '../src/monster/MonsterController';
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

console.log('=== MONSTER DUMB — ATTACK DISTANCE & POST-HIT GRACE PERIOD AUDIT ===\n');

// Mock DOM & Audio
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
    createOscillator = () => ({ connect: () => {}, start: () => {}, stop: () => {}, frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} } });
    createBiquadFilter = () => ({ connect: () => {}, frequency: { setValueAtTime: () => {} }, Q: { setValueAtTime: () => {} } });
    createBuffer = () => ({ getChannelData: () => new Float32Array(100), duration: 2.58 });
    decodeAudioData = async () => ({ duration: 2.58 });
    resume = async () => {};
  },
  addEventListener: () => {},
  removeEventListener: () => {},
};

(globalThis as any).localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  clear: () => {},
};

(globalThis as any).document = {
  createElement: () => ({
    style: {},
    classList: { add: () => {}, remove: () => {}, contains: () => false },
    addEventListener: () => {},
    appendChild: () => {},
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
// Test 1: Level Definitions attackDistance Configuration
// -----------------------------------------------------------------------------
console.log('--- Test 1: Level Definitions attackDistance Configuration ---');

ALL_LEVELS.forEach(lvl => {
  assert(lvl.monsterConfig.attackDistance === 2.4,
    `Level ${lvl.id} (${lvl.title}): attackDistance is exactly 2.4m (was 5.0m)`);
});

// -----------------------------------------------------------------------------
// Test 2: Monster Melee Attack Distance Validation (Closer to Monster)
// -----------------------------------------------------------------------------
console.log('\n--- Test 2: Monster Melee Attack Distance Validation ---');

const dummyNavGrid = Array.from({ length: 21 }, () => Array(21).fill(0));
const pathfinder = new GridPathfinding(dummyNavGrid, 3.8);

const pocong = new MonsterController('pocong');
pocong.setLevel(ALL_LEVELS[0], pathfinder, { x: 5, y: 0, z: 5, rotationY: 0 });

const mockCamera = new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 100);
mockCamera.position.set(5, 1.65, 3.0); // 2.0m away along Z
mockCamera.lookAt(5, 0.9, 5.0);

const forwardVec = new THREE.Vector3(0, 0, 1); // Facing monster along +Z

// Test position 2.0m away (closer, within 2.4m limit)
const closePlayerPos = new THREE.Vector3(5, 1.65, 3.0);
assert(pocong.canBeAttackedFromBehind(closePlayerPos) === true,
  'canBeAttackedFromBehind is TRUE at 2.0m (within 2.4m closer attack range)');
assert(pocong.isHitByPlayerSwing(mockCamera, closePlayerPos, forwardVec) === true,
  'isHitByPlayerSwing is TRUE at 2.0m (strike connects successfully)');

// Test position 3.5m away (beyond 2.4m limit, previously allowed under 4.5m)
const farPlayerPos = new THREE.Vector3(5, 1.65, 1.5); // 3.5m away
assert(pocong.canBeAttackedFromBehind(farPlayerPos) === false,
  'canBeAttackedFromBehind is FALSE at 3.5m (rejects far attacks, player must get closer)');
assert(pocong.isHitByPlayerSwing(mockCamera, farPlayerPos, forwardVec) === false,
  'isHitByPlayerSwing is FALSE at 3.5m (swings into thin air, does not hit)');

// Test position 4.5m away (previously maximum threshold)
const veryFarPlayerPos = new THREE.Vector3(5, 1.65, 0.5); // 4.5m away
assert(pocong.canBeAttackedFromBehind(veryFarPlayerPos) === false,
  'canBeAttackedFromBehind is strictly FALSE at 4.5m');

// -----------------------------------------------------------------------------
// Test 3: Kuntilanak Melee Attack Distance Validation (Level 2)
// -----------------------------------------------------------------------------
console.log('\n--- Test 3: Kuntilanak Melee Attack Distance Validation ---');

const kunti = new MonsterController('kunti');
kunti.setLevel(ALL_LEVELS[1], pathfinder, { x: 8, y: 0, z: 8, rotationY: 0 });

const kuntiCam = new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 100);
kuntiCam.position.set(8, 1.65, 6.0); // 2.0m away
kuntiCam.lookAt(8, 0.45, 8.0);

const closeToKunti = new THREE.Vector3(8, 1.65, 6.0);
assert(kunti.canBeAttackedFromBehind(closeToKunti) === true,
  'canBeAttackedFromBehind is TRUE when closer to Kuntilanak (2.0m)');
assert(kunti.isHitByPlayerSwing(kuntiCam, closeToKunti, forwardVec) === true,
  'isHitByPlayerSwing is TRUE when striking Kuntilanak within 2.4m');

const farFromKunti = new THREE.Vector3(8, 1.65, 4.5); // 3.5m away
assert(kunti.canBeAttackedFromBehind(farFromKunti) === false,
  'canBeAttackedFromBehind is FALSE when too far from Kuntilanak (3.5m)');

// -----------------------------------------------------------------------------
// Test 4: Post-Hit Delay & Grace Period Progression
// -----------------------------------------------------------------------------
console.log('\n--- Test 4: Post-Hit Delay & Grace Period Progression ---');

// Hit monster with baseball bat
pocong.triggerWeaponHit(WEAPON_MAP['baseball_bat']);
assert(pocong.state === 'HIT_REACTION', 'State transitions to HIT_REACTION immediately on hit');

// 1. During HIT_REACTION (0.60s duration): Monster is stunned, player at distance 0.5m CANNOT be caught
pocong.update(0.30, 0.30, new THREE.Vector3(5, 1.65, 5.5));
assert(pocong.state === 'HIT_REACTION', 'After 0.30s: Still in HIT_REACTION stagger');
assert(pocong.state !== 'CATCH_PLAYER', 'Player at 0.5m CANNOT be caught during HIT_REACTION');

// 2. Transition to SCREAM (0.70s duration): Monster is shrieking in place
pocong.update(0.35, 0.65, new THREE.Vector3(5, 1.65, 5.5));
assert(pocong.state === 'SCREAM', 'After 0.65s: Transitions to SCREAM roar');
pocong.update(0.35, 1.00, new THREE.Vector3(5, 1.65, 5.5));
assert(pocong.state === 'SCREAM', 'After 1.00s: Still in SCREAM roar');
assert(pocong.state !== 'CATCH_PLAYER', 'Player at 0.5m CANNOT be caught during SCREAM');

// 3. Transition to STAND_UP (0.50s duration): Monster preparing stance
pocong.update(0.40, 1.40, new THREE.Vector3(5, 1.65, 5.5));
assert(pocong.state === 'STAND_UP', 'After 1.40s: Transitions to STAND_UP stance');
pocong.update(0.30, 1.70, new THREE.Vector3(5, 1.65, 5.5));
assert(pocong.state === 'STAND_UP', 'After 1.70s: Still in STAND_UP stance');
assert(pocong.state !== 'CATCH_PLAYER', 'Player at 0.5m CANNOT be caught during STAND_UP');

// 4. Transition to CHASE (Wake up animation total = 1.80s)
pocong.update(0.25, 1.95, new THREE.Vector3(5, 1.65, 5.5));
assert(pocong.state === 'CHASE', 'After 1.95s: Transitions to CHASE');

// 5. During CHASE Grace Period (CATCH_GRACE_PERIOD = 1.80s):
// Even if player is right next to monster (0.5m), monster CANNOT catch player!
pocong.update(0.50, 2.45, new THREE.Vector3(5, 1.65, 5.5));
assert(pocong.state === 'CHASE', '0.50s into CHASE: Player at 0.5m NOT caught (within grace period)');

pocong.update(0.80, 3.25, new THREE.Vector3(5, 1.65, 5.5));
assert(pocong.state === 'CHASE', '1.30s into CHASE: Player at 0.5m NOT caught (within grace period)');

pocong.update(0.40, 3.65, new THREE.Vector3(5, 1.65, 5.5));
assert(pocong.state === 'CHASE', '1.70s into CHASE: Player at 0.5m NOT caught (< 1.80s grace period)');

// Total delay before catch becomes possible = 1.80s (wake up) + 1.80s (chase grace) = 3.60 seconds!
const totalSafeWindow = MonsterController.HIT_REACTION_DURATION +
  MonsterController.SCREAM_DURATION +
  MonsterController.STAND_UP_DURATION +
  MonsterController.CATCH_GRACE_PERIOD;
assert(totalSafeWindow >= 3.5,
  `Total post-hit safe window is ${totalSafeWindow.toFixed(2)}s (>= 3.5s, ample time to turn and sprint)`);

// 6. After 1.80s of chase elapsed, player within catchDistance IS caught
const nearMonsterPos = new THREE.Vector3(pocong.position.x + 0.2, 1.65, pocong.position.z + 0.2);
pocong.update(0.25, 3.90, nearMonsterPos);
assert(pocong.state === 'CATCH_PLAYER', 'After 1.80s chase grace period elapsed, monster catches player at 0.3m');

console.log('\n======================================================');
console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
