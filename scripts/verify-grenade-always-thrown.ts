import * as THREE from 'three';
import { ALL_LEVELS } from '../src/level/LevelData';
import { WEAPON_MAP } from '../src/weapon/WeaponData';
import { MonsterController } from '../src/monster/MonsterController';
import { WeaponController } from '../src/player/WeaponController';
import { GrenadeSystem } from '../src/weapon/GrenadeSystem';
import { GridPathfinding } from '../src/pathfinding/GridPathfinding';
import { AudioManager } from '../src/core/AudioManager';

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

// Mock DOM & Web Audio
function createMockProxy(): any {
  const p: any = new Proxy(() => p, {
    get: (target: any, prop: string | symbol) => {
      if (prop === 'classList') {
        const classes = new Set(['hidden']);
        return {
          add: (c: string) => classes.add(c),
          remove: (c: string) => classes.delete(c),
          contains: (c: string) => classes.has(c),
          toggle: (c: string, force?: boolean) => {
            const shouldAdd = force !== undefined ? force : !classes.has(c);
            if (shouldAdd) classes.add(c); else classes.delete(c);
          },
        };
      }
      if (prop === 'style') return {};
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
    createGain = () => ({
      connect: () => {},
      gain: {
        value: 1,
        setValueAtTime: () => {},
        linearRampToValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
        setTargetAtTime: () => {},
        cancelScheduledValues: () => {},
      },
    });
    createOscillator = () => ({
      connect: () => {},
      start: () => {},
      stop: () => {},
      frequency: {
        setValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
        linearRampToValueAtTime: () => {},
      },
    });
    createBiquadFilter = () => ({
      connect: () => {},
      frequency: {
        setValueAtTime: () => {},
        exponentialRampToValueAtTime: () => {},
        linearRampToValueAtTime: () => {},
      },
      Q: { setValueAtTime: () => {} },
      gain: { value: 0, setValueAtTime: () => {} },
    });
    createBuffer = () => ({ getChannelData: () => new Float32Array(100), duration: 2.58 });
    decodeAudioData = async () => ({ duration: 2.58 });
    resume = async () => {};
  },
  addEventListener: () => {},
  removeEventListener: () => {},
};

(globalThis as any).document = {
  getElementById: () => createMockProxy(),
  querySelector: () => createMockProxy(),
  querySelectorAll: () => [],
  createElement: () => createMockProxy(),
  createElementNS: () => createMockProxy(),
  body: createMockProxy(),
  addEventListener: () => {},
  removeEventListener: () => {},
};

async function runTests() {
  console.log('--- STARTING VERIFICATION: GRENADE ALWAYS THROWN & EXPLODES ---');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 100);
  camera.position.set(10, 1.65, 10);
  camera.lookAt(10, 1.65, 20); // Looking along +Z

  const grenadeSys = GrenadeSystem.getInstance();
  grenadeSys.reset(scene);

  // 1. Instant & Multi-Throw Test
  console.log('\n[1] Testing consecutive grenade throws without blockage...');
  assert(!grenadeSys.isGrenadeInFlight(), 'Initially no grenade is in flight');

  let explodedCount = 0;
  const onExplode = (impactPos: THREE.Vector3) => {
    explodedCount++;
  };

  // First throw
  const thrown1 = grenadeSys.throwGrenade(scene, camera, onExplode);
  assert(thrown1 === true, 'First grenade was thrown successfully');
  assert(grenadeSys.isGrenadeInFlight(), 'GrenadeSystem reports grenade in flight');

  // Second throw immediately (rapid press)
  const thrown2 = grenadeSys.throwGrenade(scene, camera, onExplode);
  assert(thrown2 === true, 'Second grenade was thrown immediately without being blocked');

  // Third throw
  const thrown3 = grenadeSys.throwGrenade(scene, camera, onExplode);
  assert(thrown3 === true, 'Third grenade was thrown immediately without being blocked');

  // 2. WeaponController Viewmodel FPS Throw & Draw Animation
  console.log('\n[2] Testing WeaponController FPS throw thrust & viewmodel draw...');
  const wpController = new WeaponController();
  wpController.setWeapon('grenade');

  let releaseTriggered = false;
  wpController.swing(() => {
    releaseTriggered = true;
  });

  // Step 1: Forward thrust phase (at progress ~0.36)
  wpController.update(0.20, false, false, 0); // 0.20 / 0.55 = 0.36 progress (release moment)
  assert(releaseTriggered === true, 'Grenade launch callback is triggered at forward thrust extension');
  assert((wpController as any).weaponMesh.position.z < -0.70, 'Grenade thrusts forward into screen center towards crosshair before release');

  // Step 2: Post-release flight phase (progress 0.50)
  wpController.update(0.08, false, false, 0);
  assert((wpController as any).weaponMesh.visible === false, 'Grenade is hidden during flight after being released');

  // Step 3: Draw next grenade from below screen (progress 0.80)
  wpController.update(0.16, false, false, 0); // 0.44 / 0.55 = 0.80 progress
  assert((wpController as any).weaponMesh.visible === true, 'New grenade appears in hand from below screen');
  assert((wpController as any).weaponMesh.position.y < (wpController as any).defaultPos.y, 'New grenade is rising up into view');

  // Step 4: Complete swing
  wpController.update(0.20, false, false, 0); // completes swing
  assert((wpController as any).isSwinging === false, 'Swing completed');
  assert((wpController as any).weaponMesh.visible === true, 'Grenade viewmodel is settled in hand in idle stance');

  // Rapid reset & swing again
  wpController.reset();
  assert((wpController as any).weaponMesh.visible === true, 'reset() keeps grenade visible in hand');
  const swungAgain = wpController.swing(() => {});
  assert(swungAgain === true, 'Player can immediately initiate another throw after reset');

  // 3. Trajectory, Floor Collision & Explosion
  console.log('\n[3] Testing grenade trajectory and guaranteed explosion...');
  const wallBox = new THREE.Mesh(new THREE.BoxGeometry(10, 5, 1), new THREE.MeshBasicMaterial());
  wallBox.position.set(10, 2.5, 25); // Wall 15m in front of camera
  scene.add(wallBox);

  // Update grenade physics
  let dt = 0.05;
  for (let t = 0; t < 2.0; t += dt) {
    grenadeSys.update(dt, scene, [wallBox], [], 0);
  }

  assert(explodedCount === 3, `All 3 thrown grenades detonated (explodedCount: ${explodedCount})`);
  assert(!grenadeSys.isGrenadeInFlight(), 'All grenades finished flight and exploded');

  // 4. Explosion on Monster & Knockback
  console.log('\n[4] Testing grenade impact on monster with knockback...');
  const monster = new MonsterController('pocong');
  const lvl1 = ALL_LEVELS[0];
  const pathfinding = new GridPathfinding(lvl1.grid, lvl1.cellSize || 3.8);
  monster.setLevel(lvl1, pathfinding, { x: 10, y: 0, z: 12, rotationY: 0 });

  const monsterInitPos = monster.position.clone();
  const blastPos = new THREE.Vector3(10, 0, 10); // blast at z = 10, monster at z = 12

  let screamTriggered = false;
  const audio = AudioManager.getInstance();
  audio.playMonsterScream = () => { screamTriggered = true; };

  monster.triggerWeaponHit(WEAPON_MAP['grenade'], blastPos, 2.2);
  assert(screamTriggered, 'Monster immediately screamed upon grenade blast impact');
  assert(monster.state === 'HIT_REACTION', 'Monster in HIT_REACTION state');

  monster.update(0.65, 0.65, blastPos);
  const knockDist = monster.position.distanceTo(monsterInitPos);
  assert(knockDist >= 1.8 && knockDist <= 2.4, `Monster was knocked back by ~2.2m (actual: ${knockDist.toFixed(2)}m)`);
  assert(monster.position.z > monsterInitPos.z, 'Monster was pushed away from blast in +Z direction');

  console.log(`\n========================================`);
  console.log(`VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
