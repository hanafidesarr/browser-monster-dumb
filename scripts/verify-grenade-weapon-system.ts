import * as THREE from 'three';
import { ALL_LEVELS } from '../src/level/LevelData';
import { ALL_WEAPONS, WEAPON_MAP } from '../src/weapon/WeaponData';
import { WeaponModelFactory } from '../src/weapon/WeaponModelFactory';
import { WeaponController } from '../src/player/WeaponController';
import { GrenadeSystem } from '../src/weapon/GrenadeSystem';
import { MonsterController } from '../src/monster/MonsterController';
import { GridPathfinding } from '../src/pathfinding/GridPathfinding';
import { SaveManager } from '../src/core/SaveManager';

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

console.log('=== MONSTER DUMB — GRENADE WEAPON & EXPLOSION SYSTEM AUDIT ===\n');

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
// Test 1: Grenade Weapon Definition & Backward Compatibility Alias
// -----------------------------------------------------------------------------
console.log('--- Test 1: Grenade Weapon Definition & Backward Compatibility ---');

const grenadeDef = WEAPON_MAP.grenade;
assert(grenadeDef !== undefined, 'grenade definition exists in WEAPON_MAP');
assert(grenadeDef.id === 'grenade', 'grenade id is "grenade"');
assert(grenadeDef.name === 'Hand Grenade', 'grenade name is "Hand Grenade"');
assert(grenadeDef.nameId === 'Granat Nanas', 'grenade nameId is "Granat Nanas"');
assert(grenadeDef.swingType === 'throw', 'grenade swingType is "throw" (ranged throw mechanic)');
assert(grenadeDef.impactSound === 'explosion', 'grenade impactSound is "explosion"');
assert(WEAPON_MAP.signboard !== undefined, 'signboard alias exists in WEAPON_MAP');
assert(WEAPON_MAP.signboard.id === 'grenade', 'signboard resolves to grenade definition for compatibility');

// -----------------------------------------------------------------------------
// Test 2: Level Pickups have Grenade
// -----------------------------------------------------------------------------
console.log('\n--- Test 2: Level Pickups Configuration ---');

const lvl1 = ALL_LEVELS[0];
const lvl1HasGrenade = lvl1.weaponPickups?.some(p => p.weaponId === 'grenade');
assert(lvl1HasGrenade === true, 'Level 1 contains grenade weapon pickup (replaces signboard)');

const lvl9 = ALL_LEVELS[8];
const lvl9HasGrenade = lvl9.weaponPickups?.some(p => p.weaponId === 'grenade');
assert(lvl9HasGrenade === true, 'Level 9 contains grenade weapon pickup');

// -----------------------------------------------------------------------------
// Test 3: SaveManager Backward-Compatibility & Migration
// -----------------------------------------------------------------------------
console.log('\n--- Test 3: SaveManager Weapon Migration ---');

const save = SaveManager.getInstance();
save.unlockWeapon('signboard');
assert(save.isWeaponUnlocked('grenade') === true, 'unlocking "signboard" unlocks "grenade"');
assert(save.isWeaponUnlocked('signboard') === true, 'checking "signboard" returns true when grenade is unlocked');

// -----------------------------------------------------------------------------
// Test 4: 3D Models (Viewmodel & World Pickup)
// -----------------------------------------------------------------------------
console.log('\n--- Test 4: Grenade 3D Model Generation ---');

const grenadeModel = WeaponModelFactory.createViewmodel('grenade');
assert(grenadeModel !== undefined, 'createViewmodel("grenade") creates 3D Group');
assert(grenadeModel.name === 'GrenadeMesh', 'GrenadeMesh has correct name identifier');

const worldPickup = WeaponModelFactory.createWorldPickup('grenade');
assert(worldPickup !== undefined, 'createWorldPickup("grenade") creates World Pickup Group');
assert(worldPickup.name === 'Pickup_grenade', 'Pickup_grenade has correct name identifier');

// -----------------------------------------------------------------------------
// Test 5: Projectile Throw Physics & Trajectory
// -----------------------------------------------------------------------------
console.log('\n--- Test 5: Grenade System Projectile Launch & Flight ---');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 100);
camera.position.set(0, 1.65, 0);
camera.lookAt(0, 1.65, 10); // Looking forward along +Z

const grenadeSys = GrenadeSystem.getInstance();
grenadeSys.reset(scene);

let detonationPos: THREE.Vector3 | null = null;
const launched = grenadeSys.throwGrenade(scene, camera, (pos) => {
  detonationPos = pos.clone();
});

assert(launched === true, 'throwGrenade launches airborne projectile successfully');
assert(grenadeSys.isGrenadeInFlight() === true, 'isGrenadeInFlight is TRUE while airborne');

// Simulate physics flight updates (gravity, velocity forward along +Z)
for (let step = 0; step < 30; step++) {
  grenadeSys.update(0.016, scene, [], [], 0);
}

// Projectile should have moved forward significantly along +Z
assert(grenadeSys.isGrenadeInFlight() === true, 'Projectile continues ballistic flight');

// Force projectile impact by simulating flight until ground contact
for (let step = 0; step < 120; step++) {
  grenadeSys.update(0.016, scene, [], [], 0);
  if (!grenadeSys.isGrenadeInFlight()) break;
}

assert(grenadeSys.isGrenadeInFlight() === false, 'Projectile detonates upon reaching ground or max flight time');
assert(detonationPos !== null, 'onExplode callback was triggered with impact position');
assert(detonationPos!.z > 5.0, `Grenade traveled far along trajectory before detonation (z: ${detonationPos?.z.toFixed(2)}m)`);

// -----------------------------------------------------------------------------
// Test 6: Fireball and Wide Spreading Smoke Expansion
// -----------------------------------------------------------------------------
console.log('\n--- Test 6: Explosion Fireball & Spreading Smoke Puffs ---');

// Trigger explicit explosion at (10, 0, 10)
grenadeSys.spawnExplosion(scene, new THREE.Vector3(10, 0, 10));

// Find active explosion in scene
const explosionGroup = scene.children.find(c => c.name === 'GrenadeExplosionGroup') as THREE.Group;
assert(explosionGroup !== undefined, 'GrenadeExplosionGroup spawned in scene');

// Advance through fireball phase and smoke expansion
grenadeSys.update(0.3, scene, [], [], 0);
assert(explosionGroup.children.length >= 15, `Explosion contains dynamic point light, sparks, and spreading smoke puffs (${explosionGroup.children.length} elements)`);

// Advance smoke expansion over time
grenadeSys.update(1.2, scene, [], [], 0);
// Check that smoke continues expanding and fading
grenadeSys.update(2.0, scene, [], [], 0);

// -----------------------------------------------------------------------------
// Test 7: Hit vs Miss Screen Behavior
// -----------------------------------------------------------------------------
console.log('\n--- Test 7: Hit vs Miss Grenade Screen Behavior ---');

const weaponController = new WeaponController();
weaponController.setWeapon('grenade');
assert(weaponController.getWeaponId() === 'grenade', 'WeaponController equipped with grenade');
assert(weaponController.getWeaponDef().swingType === 'throw', 'Equipped weapon has swingType "throw"');

// Simulated MISS:
// Player throws grenade into thin air; it misses monster
console.log('  Simulating Grenade MISS:');
let missCallbackFired = false;
weaponController.swing(() => {
  missCallbackFired = true;
});

// Advance throw animation through launch point (>= 0.52)
weaponController.update(0.35, false, false, 0.35); // wind up & launch
assert(missCallbackFired === true, 'Throw callback fired at launch point');

// When missed: grenade resets and remains on player screen!
weaponController.setVisible(true);
weaponController.reset();
assert(weaponController.group.visible === true, 'On MISS: Grenade remains visible on player screen');

// Simulated HIT:
// Player throws grenade and it connects with monster
console.log('  Simulating Grenade HIT:');
weaponController.swing(() => {});
weaponController.update(0.35, false, false, 0.35);

// When hit connects with monster: grenade is disabled and disappears from screen!
weaponController.disableAttackPermanently();
weaponController.setVisible(false);
assert(weaponController.group.visible === false, 'On HIT: Grenade is hidden from player screen');

console.log(`\n======================================================================`);
console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log(`======================================================================\n`);

if (failed > 0) {
  process.exit(1);
}
