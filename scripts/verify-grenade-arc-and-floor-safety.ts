import * as THREE from 'three';

// Mock Web API for Node SSR environment
(globalThis as any).window = {
  innerWidth: 1920,
  innerHeight: 1080,
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
    get: (target: any, prop: string | symbol) => {
      if (prop === 'getContext') {
        const dummyCtx: any = new Proxy(() => {}, {
          get: (target: any, method: string | symbol) => {
            if (method === 'createRadialGradient' || method === 'createLinearGradient') {
              return () => ({ addColorStop: () => {} });
            }
            if (method === 'getImageData') {
              return () => ({ data: new Uint8ClampedArray(256 * 256 * 4) });
            }
            if (method === 'measureText') {
              return () => ({ width: 80 });
            }
            return () => {};
          },
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

(globalThis as any).document = {
  getElementById: () => null,
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: () => createMockProxy(),
  body: {},
  addEventListener: () => {},
  removeEventListener: () => {},
};

import { ALL_LEVELS } from '../src/level/LevelData';
import { LabyrinthBuilder } from '../src/level/LabyrinthBuilder';
import { GrenadeSystem } from '../src/weapon/GrenadeSystem';

let passed = 0;
let total = 0;

function assert(condition: boolean, msg: string) {
  total++;
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  } else {
    passed++;
    console.log(`✅ PASS: ${msg}`);
  }
}

async function run() {
  console.log('--- TEST SUITE: GRENADE BALLISTIC LOFT & FLOOR SAFETY CLEARANCE ---');

  const lvl1 = ALL_LEVELS[0];
  const build1 = LabyrinthBuilder.buildLevel(lvl1);
  const cam = new THREE.PerspectiveCamera(70, 16 / 9, 0.1, 100);

  // Test across multiple pitch angles when player looks toward the ground / sleeping Pocong
  const testAngles = [0, -5, -10, -15, -20, -30, -45];

  for (const deg of testAngles) {
    const rad = (deg * Math.PI) / 180;
    cam.position.set(build1.playerWorldSpawn.x, 1.6, build1.playerWorldSpawn.z);
    cam.quaternion.setFromEuler(new THREE.Euler(rad, 0, 0, 'YXZ'));

    const grenadeSys = new GrenadeSystem();
    const scene = new THREE.Scene();
    build1.blockingMeshes.forEach((m) => scene.add(m));

    let impactPos: THREE.Vector3 | null = null;
    let impactTime = 0;

    grenadeSys.throwGrenade(scene, cam, (pos) => {
      impactPos = pos.clone();
    });

    const dt = 1 / 60;
    for (let t = 0; t < 2.5; t += dt) {
      grenadeSys.update(
        dt,
        scene,
        build1.blockingMeshes,
        [new THREE.Vector3(build1.monsterWorldSpawn.x, 0, build1.monsterWorldSpawn.z)],
        0
      );
      if (impactPos) {
        impactTime = t;
        break;
      }
    }

    assert(!!impactPos, `Grenade detonates within flight time at pitch ${deg}°`);
    const hDist = Math.hypot(impactPos!.x - cam.position.x, impactPos!.z - cam.position.z);
    assert(
      hDist >= 18.0,
      `Pitch ${deg}°: Grenade travels at least 18m towards target before landing on floor (got ${hDist.toFixed(1)}m in ${impactTime.toFixed(2)}s)`
    );
    assert(
      hDist > 10.0,
      `Pitch ${deg}°: Grenade NEVER explodes near player (distance = ${hDist.toFixed(1)}m)`
    );
  }

  console.log(`\n========================================`);
  console.log(`ALL GRENADE TESTS PASSED: ${passed}/${total}`);
  console.log(`========================================\n`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
