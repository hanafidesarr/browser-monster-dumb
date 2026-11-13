import * as THREE from 'three';
import { ALL_LEVELS } from '../src/level/LevelData';
import { MonsterController } from '../src/monster/MonsterController';
import { AudioManager } from '../src/core/AudioManager';
import { GridPathfinding } from '../src/pathfinding/GridPathfinding';

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

console.log('=== MONSTER DUMB — KUNTILANAK CONTINUOUS CHASE AUDIO AUDIT ===\n');

// Mock Web Audio Context with Source & Gain tracking
let activeSourceCount = 0;
let lastLoopSetting = false;
let lastGainValue = 0;

class MockGainNode {
  public gain = {
    value: 1,
    setValueAtTime: (val: number, _t: number) => {
      this.gain.value = val;
      lastGainValue = val;
    },
    linearRampToValueAtTime: (val: number, _t: number) => {
      this.gain.value = val;
      lastGainValue = val;
    },
    setTargetAtTime: (val: number, _t: number, _c: number) => {
      this.gain.value = val;
      lastGainValue = val;
    },
    cancelScheduledValues: (_t: number) => {},
  };
  public connect(_node: any) {}
  public disconnect() {}
}

class MockSourceNode {
  public loop = false;
  public loopStart = 0;
  public loopEnd = 0;
  public buffer: any = null;
  public onended: (() => void) | null = null;

  public connect(_node: any) {}
  public disconnect() {}
  public start(_time?: number) {
    activeSourceCount++;
    lastLoopSetting = this.loop;
  }
  public stop(_time?: number) {
    if (activeSourceCount > 0) activeSourceCount--;
    if (this.onended) this.onended();
  }
}

const mockAudioCtx: any = {
  currentTime: 10.0,
  sampleRate: 44100,
  state: 'running',
  destination: {},
  createBufferSource: () => new MockSourceNode(),
  createGain: () => new MockGainNode(),
  createBuffer: () => ({ getChannelData: () => new Float32Array(100), duration: 2.58 }),
  decodeAudioData: async (_buf: any) => ({ duration: 2.58, sampleRate: 44100, numberOfChannels: 2 }),
  resume: async () => {},
};

(globalThis as any).window = {
  innerWidth: 1920,
  innerHeight: 1080,
  AudioContext: class {
    constructor() { return mockAudioCtx; }
  },
  addEventListener: () => {},
  removeEventListener: () => {},
};

(globalThis as any).document = {
  createElement: () => ({
    style: {},
    classList: { add: () => {}, remove: () => {}, contains: () => false },
    addEventListener: () => {},
    appendChild: () => {},
  }),
  createElementNS: (_ns: string, _tag: string) => ({
    style: {},
    classList: { add: () => {}, remove: () => {}, contains: () => false },
    addEventListener: () => {},
    appendChild: () => {},
  }),
  getElementById: () => null,
  querySelector: () => null,
};

// -----------------------------------------------------------------------------
// Test 1: AudioManager Kuntilanak Continuous Chase Audio Interface
// -----------------------------------------------------------------------------
console.log('--- Test 1: AudioManager Kunti Chase Audio Methods ---');

const audio = AudioManager.getInstance();
(audio as any).ctx = mockAudioCtx;
(audio as any).sfxGain = new MockGainNode();
(audio as any).kuntiAudioBuffer = { duration: 2.58, sampleRate: 44100 };

assert(typeof audio.startKuntiChaseAudio === 'function', 'startKuntiChaseAudio method exists');
assert(typeof audio.updateKuntiChaseAudio === 'function', 'updateKuntiChaseAudio method exists');
assert(typeof audio.stopKuntiChaseAudio === 'function', 'stopKuntiChaseAudio method exists');
assert(typeof audio.calcKuntiChaseVolume === 'function', 'calcKuntiChaseVolume method exists');

// -----------------------------------------------------------------------------
// Test 2: Distance Attenuation & Continuous Audibility Floor
// -----------------------------------------------------------------------------
console.log('\n--- Test 2: Distance Attenuation & Continuous Audibility ---');

const volClose = audio.calcKuntiChaseVolume(1.0);
const volMid = audio.calcKuntiChaseVolume(12.0);
const volFar = audio.calcKuntiChaseVolume(30.0);
const volVeryFar = audio.calcKuntiChaseVolume(50.0);

assert(volClose >= 0.90, `Close distance (1m) produces high volume: ${volClose.toFixed(3)} >= 0.90`);
assert(volMid < volClose, `Mid distance (12m) is attenuated: ${volMid.toFixed(3)} < ${volClose.toFixed(3)}`);
assert(volFar < volMid, `Far distance (30m) is lower: ${volFar.toFixed(3)} < ${volMid.toFixed(3)}`);
assert(volVeryFar >= 0.10, `Very far distance (50m) maintains audible presence floor: ${volVeryFar.toFixed(3)} >= 0.10`);
assert(volVeryFar <= 0.15, `Very far distance does not exceed subtle background presence: ${volVeryFar.toFixed(3)} <= 0.15`);

// -----------------------------------------------------------------------------
// Test 3: Looping Buffer Execution
// -----------------------------------------------------------------------------
console.log('\n--- Test 3: Looping Buffer Execution ---');

audio.stopKuntiChaseAudio();
activeSourceCount = 0;
lastLoopSetting = false;

audio.startKuntiChaseAudio(8.0);
assert(activeSourceCount === 1, 'Audio source node started on chase audio start');
assert(lastLoopSetting === true, 'Audio source has loop set to true (continuous playback)');
assert((audio as any).isKuntiChaseActive === true, 'isKuntiChaseActive flag is true');

audio.updateKuntiChaseAudio(2.0);
assert(lastGainValue > volMid, `Dynamic update adjusts gain higher when closer (actual: ${lastGainValue.toFixed(3)})`);

audio.stopKuntiChaseAudio();
assert((audio as any).isKuntiChaseActive === false, 'isKuntiChaseActive set to false on stop');

// -----------------------------------------------------------------------------
// Test 4: MonsterController Level 2 Kuntilanak Chase Audio Trigger
// -----------------------------------------------------------------------------
console.log('\n--- Test 4: MonsterController Kuntilanak Chase Audio Trigger ---');

const dummyNavGrid = Array.from({ length: 21 }, () => Array(21).fill(0));
const pathfinder = new GridPathfinding(dummyNavGrid, 3.8);

const kuntiMonster = new MonsterController('kunti');
kuntiMonster.setLevel(ALL_LEVELS[1], pathfinder, { x: 5, y: 0, z: 5, rotationY: 0 });

// Verify initial state
assert(kuntiMonster.monsterType === 'kunti', 'kuntiMonster initialized as "kunti"');

// Awaken and transition to CHASE
kuntiMonster.wakeUpAndChase();
assert(kuntiMonster.state === 'STAND_UP', 'Transitions to STAND_UP first');

// Advance past standUp duration
kuntiMonster.update(0.55, 1.0, new THREE.Vector3(15, 1.65, 15));
assert(kuntiMonster.state === 'CHASE', 'Transitions to CHASE state');
assert((audio as any).isKuntiChaseActive === true, 'Kuntilanak chase automatically triggered startKuntiChaseAudio');

// Advance chase frames with distance tracking
kuntiMonster.update(0.1, 1.1, new THREE.Vector3(8, 1.65, 8));
assert((audio as any).isKuntiChaseActive === true, 'Chase audio remains active during chase frames');

// Advance past catch grace period to player catch
kuntiMonster.update(2.0, 3.5, new THREE.Vector3(5.2, 1.65, 5.2));
assert(kuntiMonster.state === 'CATCH_PLAYER', 'Catches player when within catch distance after grace period');
assert((audio as any).isKuntiChaseActive === false, 'Chase audio stopped when catch jumpscare occurs');

// -----------------------------------------------------------------------------
// Test 5: Isolation: Level 1 Pocong Chase Audio Does NOT Trigger Kunti Loop
// -----------------------------------------------------------------------------
console.log('\n--- Test 5: Isolation: Pocong Does Not Trigger Kunti Chase Loop ---');

audio.stopKuntiChaseAudio();
const pocongMonster = new MonsterController('pocong');
pocongMonster.setLevel(ALL_LEVELS[0], pathfinder, { x: 5, y: 0, z: 5, rotationY: 0 });

pocongMonster.wakeUpAndChase();
pocongMonster.update(0.55, 1.0, new THREE.Vector3(15, 1.65, 15));
assert(pocongMonster.state === 'CHASE', 'Pocong transitions to CHASE');
assert((audio as any).isKuntiChaseActive === false, 'Pocong chase does NOT activate Kunti chase loop audio');

console.log('\n======================================================');
console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
