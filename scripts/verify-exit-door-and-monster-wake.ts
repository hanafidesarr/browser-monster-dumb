import * as THREE from 'three';
import { ALL_LEVELS } from '../src/level/LevelData';
import { MonsterController } from '../src/monster/MonsterController';
import { GridPathfinding } from '../src/pathfinding/GridPathfinding';
import { LabyrinthBuilder } from '../src/level/LabyrinthBuilder';
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

console.log('=== MONSTER DUMB — EXIT DOOR VISIBILITY & AWAKEN BEHAVIOR VERIFICATION ===\n');

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
// Test 1: Exit Marker is Hidden from Map Overview Across All Levels
// -----------------------------------------------------------------------------
console.log('--- Test 1: Overview Markers & Exit Marker Visibility ---');

ALL_LEVELS.forEach(lvl => {
  const result = LabyrinthBuilder.buildLevel(lvl);

  assert(result.exitMarker !== undefined, `Level ${lvl.id} (${lvl.title}): exitMarker exists in LevelBuildResult`);
  assert(result.exitMarker.visible === false, `Level ${lvl.id} (${lvl.title}): exitMarker.visible is FALSE (removed from overview map)`);
});

// -----------------------------------------------------------------------------
// Test 2: Stealth Phase Proximity & Vision Awakening Inactivity (Must Hit First)
// -----------------------------------------------------------------------------
console.log('\n--- Test 2: Monster Sleeps in Stealth Mode (Cannot Wake Without Weapon Hit) ---');

const dummyNavGrid = Array.from({ length: 21 }, () => Array(21).fill(0));
const pathfinder = new GridPathfinding(dummyNavGrid, 3.8);

const sleepingMonster = new MonsterController('pocong');
sleepingMonster.setLevel(ALL_LEVELS[0], pathfinder, { x: 5, y: 0, z: 5, rotationY: 0 });

assert(sleepingMonster.state === 'SITTING_IDLE', 'Monster begins in SITTING_IDLE state');
assert(sleepingMonster.isAwake === false, 'Monster isAwake is FALSE initially');

// Simulate player moving directly next to monster (< 1.5m away) during STEALTH phase (isChasePhase = false)
const closePlayerPos = new THREE.Vector3(5, 1.65, 4.0);
for (let t = 0; t < 60; t++) {
  sleepingMonster.update(0.016, t * 0.016, closePlayerPos, false);
}

assert(sleepingMonster.state === 'SITTING_IDLE', 'Monster remains in SITTING_IDLE even when player is 1.0m away in stealth');
assert(sleepingMonster.isAwake === false, 'Monster isAwake is still FALSE in stealth phase');
assert(sleepingMonster.detectionPercent === 0, 'Monster detectionPercent remains 0 in stealth phase');

// -----------------------------------------------------------------------------
// Test 3: Weapon Strike Triggers Hit Reaction & Chase Awakening
// -----------------------------------------------------------------------------
console.log('\n--- Test 3: Striking Monster with Weapon Awakens It ---');

const sapuWeapon = WEAPON_MAP.broom;
sleepingMonster.triggerWeaponHit(sapuWeapon);

assert(sleepingMonster.state === 'HIT_REACTION', 'Monster transitions to HIT_REACTION when struck by weapon');
assert(sleepingMonster.isAwake === true, 'Monster isAwake is now TRUE');

// Advance through hit reaction duration
for (let t = 0; t < 60; t++) {
  sleepingMonster.update(0.016, t * 0.016, closePlayerPos, true);
}

assert(sleepingMonster.state === 'SCREAM' || sleepingMonster.state === 'STAND_UP' || sleepingMonster.state === 'CHASE',
  `Monster advances to scream/standup/chase after hit reaction (current: ${sleepingMonster.state})`);

// -----------------------------------------------------------------------------
// Test 4: Multi-Monster Awakening: Secondary Monster Wakes Only on Proximity During Chase
// -----------------------------------------------------------------------------
console.log('\n--- Test 4: Multi-Monster Chase Phase Awakening ---');

// Monster 2 starts in SITTING_IDLE at (15, 0, 15)
const secondaryMonster = new MonsterController('pocong');
secondaryMonster.setLevel(ALL_LEVELS[0], pathfinder, { x: 15, y: 0, z: 15, rotationY: 0 });

// Player is far away at (5, 0, 5) while isChasePhase = true
const farPlayerPos = new THREE.Vector3(5, 1.65, 5);
for (let t = 0; t < 60; t++) {
  secondaryMonster.update(0.016, t * 0.016, farPlayerPos, true);
}
assert(secondaryMonster.state === 'SITTING_IDLE', 'Secondary monster remains SITTING_IDLE while player is far away');
assert(secondaryMonster.isAwake === false, 'Secondary monster does not wake up across map');

// Player approaches secondary monster (< 2.0m away) during chase phase
const nearSecondaryPos = new THREE.Vector3(15, 1.65, 14);
for (let t = 0; t < 60; t++) {
  secondaryMonster.update(0.016, t * 0.016, nearSecondaryPos, true);
}
assert(secondaryMonster.isAwake === true, 'Secondary monster awakens when player approaches during chase phase');
assert(secondaryMonster.state === 'SCREAM' || secondaryMonster.state === 'STAND_UP' || secondaryMonster.state === 'CHASE',
  `Secondary monster begins chase sequence (current state: ${secondaryMonster.state})`);

// -----------------------------------------------------------------------------
// Test 5: Kuntilanak in Level 2 Behaves Similarly (Must Be Struck First)
// -----------------------------------------------------------------------------
console.log('\n--- Test 5: Level 2 Kuntilanak Stealth & Attack Behavior ---');

const kunti = new MonsterController('kunti');
kunti.setLevel(ALL_LEVELS[1], pathfinder, { x: 10, y: 0, z: 10, rotationY: 0 });

assert(kunti.monsterType === 'kunti', 'Monster is confirmed kunti');
assert(kunti.state === 'SITTING_IDLE', 'Kunti starts in SITTING_IDLE');

// Player walks right up to resting Kunti in stealth mode
const nearKuntiPos = new THREE.Vector3(10, 1.65, 9.2);
for (let t = 0; t < 60; t++) {
  kunti.update(0.016, t * 0.016, nearKuntiPos, false);
}
assert(kunti.state === 'SITTING_IDLE', 'Kunti does NOT wake up on proximity in stealth');
assert(kunti.isAwake === false, 'Kunti isAwake is FALSE in stealth');

// Player strikes Kunti with Wajan
const wajanWeapon = WEAPON_MAP.frying_pan;
kunti.triggerWeaponHit(wajanWeapon);
assert(kunti.state === 'HIT_REACTION', 'Kunti transitions to HIT_REACTION when hit by wajan');
assert(kunti.isAwake === true, 'Kunti isAwake is TRUE after hit');

console.log(`\n======================================================================`);
console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log(`======================================================================\n`);

if (failed > 0) {
  process.exit(1);
}
