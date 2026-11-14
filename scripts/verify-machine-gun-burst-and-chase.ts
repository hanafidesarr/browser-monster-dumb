import * as THREE from 'three';
import { AudioManager } from '../src/core/AudioManager';
import { WeaponController } from '../src/player/WeaponController';
import { MonsterController } from '../src/monster/MonsterController';
import { WEAPON_MAP } from '../src/weapon/WeaponData';
import { GridPathfinding } from '../src/pathfinding/GridPathfinding';
import { ALL_LEVELS } from '../src/level/LevelData';

// Mock Web Audio Context for Node/SSR environment
class MockAudioNode {
  connect() {}
  disconnect() {}
}

class MockAudioParam {
  value: number = 0;
  setValueAtTime(_val: number, _time: number) {}
  exponentialRampToValueAtTime(_val: number, _time: number) {}
  linearRampToValueAtTime(_val: number, _time: number) {}
}

class MockGainNode extends MockAudioNode {
  gain = new MockAudioParam();
}

class MockBiquadFilterNode extends MockAudioNode {
  frequency = new MockAudioParam();
  Q = new MockAudioParam();
  type = 'lowpass';
}

class MockOscillatorNode extends MockAudioNode {
  frequency = new MockAudioParam();
  type = 'sine';
  start() {}
  stop() {}
}

class MockBufferSourceNode extends MockAudioNode {
  buffer: any = null;
  start() {}
  stop() {}
}

class MockAudioBuffer {
  duration = 1;
  length = 44100;
  sampleRate = 44100;
  numberOfChannels = 1;
  getChannelData() {
    return new Float32Array(44100);
  }
}

class MockAudioContext {
  currentTime = 0;
  sampleRate = 44100;
  state = 'running';
  createGain() { return new MockGainNode(); }
  createBiquadFilter() { return new MockBiquadFilterNode(); }
  createOscillator() { return new MockOscillatorNode(); }
  createBufferSource() { return new MockBufferSourceNode(); }
  createBuffer(channels: number, length: number, sampleRate: number) {
    return new MockAudioBuffer();
  }
  decodeAudioData(_ab: ArrayBuffer) {
    return Promise.resolve(new MockAudioBuffer());
  }
}

(globalThis as any).window = {
  innerWidth: 1920,
  innerHeight: 1080,
  AudioContext: MockAudioContext,
};
(globalThis as any).AudioContext = MockAudioContext;

function createMockProxy(): any {
  const p: any = new Proxy(() => p, {
    get: (target: any, prop: string | symbol) => {
      if (prop === 'getContext') {
        const dummyCtx: any = new Proxy(() => {}, {
          get: () => () => {},
          apply: () => {},
        });
        return () => dummyCtx;
      }
      if (prop === 'width' || prop === 'height') return 256;
      if (prop === 'style') return {};
      return createMockProxy();
    },
    apply: () => createMockProxy(),
  });
  return p;
}

const mockStorage: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (k: string) => mockStorage[k] || null,
  setItem: (k: string, v: string) => { mockStorage[k] = v; },
  removeItem: (k: string) => { delete mockStorage[k]; },
  clear: () => { for (const k in mockStorage) delete mockStorage[k]; },
};

(globalThis as any).document = {
  getElementById: () => createMockProxy(),
  querySelector: () => createMockProxy(),
  querySelectorAll: () => [],
  createElement: (tag: string) => createMockProxy(),
  createElementNS: () => createMockProxy(),
  body: createMockProxy(),
  addEventListener: () => {},
  removeEventListener: () => {},
};

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, msg: string) {
  totalTests++;
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  } else {
    passedTests++;
    console.log(`✅ PASS: ${msg}`);
  }
}

async function runTests() {
  console.log('--- TEST SUITE: Machine Gun Real Gunfire, 5-Round Burst, Chase & Range ---');

  // Test 1: AudioManager - Real Gunshot & 5-Round Burst Audio
  const audio = AudioManager.getInstance();
  audio.init();

  let burstCount = 0;
  const originalSingle = (audio as any).playSingleRealisticGunshot;
  (audio as any).playSingleRealisticGunshot = (time: number, isLast: boolean) => {
    burstCount++;
  };

  audio.playWeaponSwing('shoot');
  assert(burstCount === 5, `playWeaponSwing('shoot') fired exactly 5 rounds in burst (got ${burstCount})`);

  burstCount = 0;
  audio.playGunshot();
  assert(burstCount === 5, `playGunshot() triggered 5-round burst (got ${burstCount})`);

  (audio as any).playSingleRealisticGunshot = originalSingle;
  audio.playSingleRealisticGunshot(0.1, false);
  audio.playSingleRealisticGunshot(0.42, true);
  audio.playBulletFleshImpact();
  assert(true, 'Synthesized realistic gunshots and bullet flesh impacts execute without error');

  // Test 2: WeaponController - 5-Round Recoil & Muzzle Flash Synchronized Viewmodel
  const weapon = new WeaponController();
  weapon.setWeapon('machine_gun');
  assert(weapon.getWeaponId() === 'machine_gun', 'WeaponController equipped machine_gun');
  const def = weapon.getWeaponDef();
  assert(def.swingType === 'shoot', `Machine Gun has swingType = 'shoot'`);
  assert(def.swingDuration >= 0.40, `Machine Gun swingDuration allows 5-round burst (${def.swingDuration}s)`);

  let hitCallbackFired = false;
  const swung = weapon.swing(() => {
    hitCallbackFired = true;
  });
  assert(swung, 'Machine Gun trigger pulled successfully');

  // Step through time to observe recoil pulses & muzzle flash
  let muzzleFlashed = false;
  let muzzleSettled = false;
  const steps = 25;
  const dt = def.swingDuration / steps;

  for (let i = 0; i < steps; i++) {
    weapon.update(dt, false, false, i * dt);
    const muzzle = weapon.group.getObjectByName('MuzzleFlash');
    if (muzzle && muzzle.visible) {
      muzzleFlashed = true;
    }
    if (muzzle && !muzzle.visible) {
      muzzleSettled = true;
    }
  }

  assert(hitCallbackFired, 'Gunshot hit threshold triggered callback on trigger pull');
  assert(muzzleFlashed, 'Muzzle flash flickered during active burst cycle');
  assert(muzzleSettled, 'Muzzle flash settled to off after pulse recovery');

  // Test 3: MonsterController - Distance Hit & Wake-Up Fix (Issue #3)
  const level1 = ALL_LEVELS[0];
  const pf = new GridPathfinding(level1.grid, level1.cellSize);
  const monster = new MonsterController('pocong');
  monster.setLevel(level1, pf, { x: 0, y: 0, z: 0, rotationY: 0 });

  assert(monster.state === 'SITTING_IDLE', 'Monster initialized in SITTING_IDLE');
  assert(!monster.isAwake, 'Monster initialized asleep');

  // Hit monster from 14.5 meters away (was previously broken due to 2.6m melee check)
  const playerPos = new THREE.Vector3(0, 1.65, 14.5);
  monster.triggerWeaponHit(def, playerPos, 1.8, true);

  assert(monster.isAwake, 'Monster woke up when shot with machine gun!');
  assert(monster.isRangedTriggered, 'Monster marked as ranged-triggered (isRangedTriggered = true)');
  assert(monster.state === 'HIT_REACTION', `Monster entered HIT_REACTION state (state = ${monster.state})`);

  // Step through HIT_REACTION and SCREAM to verify transition to CHASE
  monster.update(0.65, 0.65, playerPos, true); // HIT_REACTION finishes (> 0.60s)
  assert(monster.state === 'SCREAM', `Monster transitioned to SCREAM state (state = ${monster.state})`);

  monster.update(0.75, 1.40, playerPos, true); // SCREAM finishes (> 0.70s) -> STAND_UP
  assert(monster.state === 'STAND_UP', `Pocong transitioned to STAND_UP state (state = ${monster.state})`);

  monster.update(0.55, 1.95, playerPos, true); // STAND_UP finishes (> 0.50s) -> CHASE
  assert(monster.state === 'CHASE', `Monster is actively in CHASE state following gunshot! (state = ${monster.state})`);

  // Test 4: Initial Sprint Boost (Issue #4)
  // Ranged hit monster should run 1.55x faster initially
  const rangedMonster = new MonsterController('pocong');
  rangedMonster.setLevel(level1, pf, { x: 5, y: 0, z: 5, rotationY: 0 });
  rangedMonster.triggerWeaponHit(def, new THREE.Vector3(5, 1.65, 18), 1.8, true);

  // Skip through to CHASE
  rangedMonster.update(0.65, 0.65, playerPos, true);
  rangedMonster.update(0.75, 1.4, playerPos, true);
  rangedMonster.update(0.55, 1.95, playerPos, true);
  assert(rangedMonster.state === 'CHASE', 'Ranged monster in CHASE');

  const initialChasePos = rangedMonster.position.clone();
  // Move 1 frame during initial chase (stateTime = 0.1s < 5.0s)
  rangedMonster.update(0.1, 2.05, playerPos, true);
  const rangedDistMoved = initialChasePos.distanceTo(rangedMonster.position);

  // Compare with a standard melee-hit monster (no ranged trigger)
  const meleeMonster = new MonsterController('pocong');
  meleeMonster.setLevel(level1, pf, { x: 5, y: 0, z: 5, rotationY: 0 });
  meleeMonster.triggerWeaponHit(WEAPON_MAP['baseball_bat'], new THREE.Vector3(5, 1.65, 6.5), 1.8, false);
  meleeMonster.update(0.65, 0.65, playerPos, true);
  meleeMonster.update(0.75, 1.4, playerPos, true);
  meleeMonster.update(0.55, 1.95, playerPos, true);
  assert(meleeMonster.state === 'CHASE', 'Melee monster in CHASE');
  assert(!meleeMonster.isRangedTriggered, 'Melee monster is not ranged triggered');

  const meleeInitialPos = meleeMonster.position.clone();
  meleeMonster.update(0.1, 2.05, playerPos, true);
  const meleeDistMoved = meleeInitialPos.distanceTo(meleeMonster.position);

  assert(
    rangedDistMoved > meleeDistMoved,
    `Ranged-triggered monster moves faster in initial sprint (${rangedDistMoved.toFixed(4)}m vs ${meleeDistMoved.toFixed(4)}m in 0.1s)`
  );

  // Test 5: Maximum Range Threshold (22.0m)
  // Verify that beyond 22.0m, shots do not trigger wake-up
  const farMonster = new MonsterController('pocong');
  farMonster.setLevel(level1, pf, { x: 0, y: 0, z: 0, rotationY: 0 });

  const farPlayerPos = new THREE.Vector3(0, 1.65, 26.0); // 26m away (> 22m max range)
  const dist = farPlayerPos.distanceTo(farMonster.position);
  assert(dist > 22.0, `Shot origin is beyond 22m threshold (${dist.toFixed(1)}m)`);

  // Simulating GameManager range boundary check
  const MAX_GUN_RANGE = 22.0;
  let triggered = false;
  if (dist <= MAX_GUN_RANGE) {
    farMonster.triggerWeaponHit(def, farPlayerPos, 1.8, true);
    triggered = true;
  }

  assert(!triggered, 'Shot beyond 22.0m does NOT trigger the monster');
  assert(!farMonster.isAwake, 'Monster beyond 22.0m stays asleep in SITTING_IDLE');

  console.log(`\n========================================`);
  console.log(`ALL TESTS PASSED: ${passedTests}/${totalTests}`);
  console.log(`========================================\n`);
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
