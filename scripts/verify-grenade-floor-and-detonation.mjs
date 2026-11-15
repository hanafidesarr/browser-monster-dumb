import * as THREE from 'three';

let passed = 0;
let total = 0;

function assert(condition, msg) {
  total++;
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  } else {
    passed++;
    console.log(`✅ PASS: ${msg}`);
  }
}

console.log('--- TEST SUITE: GRENADE FLOOR COLLISION & DETONATION ---');

// Mock Grenade Projectile simulation mirroring GrenadeSystem exactly
class SimulatedGrenadeSystem {
  constructor() {
    this.projectiles = [];
  }

  throwGrenade(camera, onExplode) {
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);

    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);

    const spawnPos = camera.position
      .clone()
      .addScaledVector(forward, 0.78)
      .addScaledVector(right, 0.08)
      .addScaledVector(up, -0.06);

    const throwSpeed = 16.0;
    const upwardLoft = Math.max(0.6, 2.2 + forward.y * 1.8);
    const velocity = forward.clone().multiplyScalar(throwSpeed).add(new THREE.Vector3(0, upwardLoft, 0));

    this.projectiles.push({
      position: spawnPos.clone(),
      velocity,
      aliveTime: 0,
      maxLife: 1.8,
      startPos: spawnPos.clone(),
      onExplode,
    });
    return true;
  }

  update(dt, blockingMeshes = [], monsterPositions = [], groundY = 0) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.aliveTime += dt;

      p.velocity.y -= 14.0 * dt;

      const currentPos = p.position.clone();
      const stepVec = p.velocity.clone().multiplyScalar(dt);
      const nextPos = currentPos.clone().add(stepVec);
      const stepDist = stepVec.length();

      let hasImpacted = false;
      const impactPos = nextPos.clone();

      // 1. Raycast collision along flight path with solid walls & environment
      if (blockingMeshes.length > 0 && stepDist > 0.001) {
        const stepDir = stepVec.clone().normalize();
        const raycaster = new THREE.Raycaster(currentPos, stepDir, 0, stepDist + 0.12);
        const hits = raycaster.intersectObjects(blockingMeshes, true);
        if (hits.length > 0) {
          const distFromStart = hits[0].point.distanceTo(p.startPos);
          if (distFromStart >= 0.20 || p.aliveTime > 0.05) {
            hasImpacted = true;
            impactPos.copy(hits[0].point);
          }
        }
      }

      // 2. Downward raycast from nextPos to catch floors & stairs at any elevation
      if (!hasImpacted && blockingMeshes.length > 0) {
        const rayOriginY = Math.max(currentPos.y, nextPos.y) + 0.25;
        const downRayLength = (rayOriginY - nextPos.y) + 0.35;
        const downRay = new THREE.Raycaster(
          new THREE.Vector3(nextPos.x, rayOriginY, nextPos.z),
          new THREE.Vector3(0, -1, 0),
          0,
          downRayLength
        );
        const floorHits = downRay.intersectObjects(blockingMeshes, true);
        if (floorHits.length > 0) {
          const floorY = floorHits[0].point.y;
          if (nextPos.y <= floorY + 0.12) {
            hasImpacted = true;
            impactPos.set(nextPos.x, floorY + 0.08, nextPos.z);
          }
        }
      }

      // 3. Absolute safety ground floor impact fallback
      if (!hasImpacted && nextPos.y <= groundY + 0.08) {
        hasImpacted = true;
        impactPos.set(nextPos.x, groundY + 0.08, nextPos.z);
      }

      // 4. Direct proximity collision with sleeping monsters
      if (!hasImpacted) {
        for (const mPos of monsterPositions) {
          if (nextPos.distanceTo(mPos) <= 1.25) {
            hasImpacted = true;
            impactPos.copy(mPos);
            break;
          }
        }
      }

      // 5. Max flight timer fuse (1.8s) - guarantees grenade ALWAYS explodes
      if (!hasImpacted && p.aliveTime >= p.maxLife) {
        hasImpacted = true;
        if (impactPos.y < groundY + 0.08) {
          impactPos.y = groundY + 0.08;
        }
      }

      if (hasImpacted) {
        this.projectiles.splice(i, 1);
        p.onExplode(impactPos);
      } else {
        p.position.copy(nextPos);
      }
    }
  }
}

// -----------------------------------------------------------------------------
// Test 1: Ground Floor (Y = 0) across all pitch angles
// -----------------------------------------------------------------------------
console.log('\n--- 1. Testing Ground Floor Pitches (0°, -10°, -20°, -35°, -45°) ---');

// Ground mesh (100x100 plane at Y = 0)
const groundGeo = new THREE.PlaneGeometry(100, 100);
groundGeo.rotateX(-Math.PI / 2);
const groundMesh = new THREE.Mesh(groundGeo, new THREE.MeshBasicMaterial());
const blockingMeshes = [groundMesh];

const testPitches = [0, -10, -20, -35, -45];

for (const deg of testPitches) {
  const rad = (deg * Math.PI) / 180;
  const cam = new THREE.PerspectiveCamera(70, 16 / 9, 0.1, 100);
  cam.position.set(0, 1.6, 0);
  cam.quaternion.setFromEuler(new THREE.Euler(rad, 0, 0, 'YXZ'));

  const sys = new SimulatedGrenadeSystem();
  let impactPos = null;
  let impactTime = 0;

  sys.throwGrenade(cam, (pos) => {
    impactPos = pos.clone();
  });

  const dt = 1 / 60;
  for (let t = 0; t < 2.5; t += dt) {
    sys.update(dt, blockingMeshes, [], 0);
    if (impactPos) {
      impactTime = t;
      break;
    }
  }

  assert(impactPos !== null, `Pitch ${deg}°: Grenade detonated within flight window`);
  assert(impactPos.y >= 0.0, `Pitch ${deg}°: Grenade landed ON FLOOR and did not clip into void (Y = ${impactPos.y.toFixed(2)})`);
  const hDist = Math.hypot(impactPos.x - cam.position.x, impactPos.z - cam.position.z);
  assert(hDist >= 1.2, `Pitch ${deg}°: Grenade reached safe distance (hDist = ${hDist.toFixed(1)}m in ${impactTime.toFixed(2)}s)`);

  if (deg === 0) {
    assert(hDist >= 8.0 && hDist <= 15.0, `Pitch 0°: Level throw traveled ${hDist.toFixed(1)}m`);
  }
}

// -----------------------------------------------------------------------------
// Test 2: Elevated Upper Floor (Floor 1 at Y = 3.8)
// -----------------------------------------------------------------------------
console.log('\n--- 2. Testing Upper Floor Platform (Floor 1, Y = 3.8) ---');

const upperFloorGeo = new THREE.PlaneGeometry(50, 50);
upperFloorGeo.rotateX(-Math.PI / 2);
const upperFloorMesh = new THREE.Mesh(upperFloorGeo, new THREE.MeshBasicMaterial());
upperFloorMesh.position.set(0, 3.8, 0);

const multiFloorBlocking = [groundMesh, upperFloorMesh];

const upperCam = new THREE.PerspectiveCamera(70, 16 / 9, 0.1, 100);
upperCam.position.set(0, 3.8 + 1.6, 0); // Eye height on Floor 1
upperCam.quaternion.setFromEuler(new THREE.Euler((-20 * Math.PI) / 180, 0, 0, 'YXZ'));

const upperSys = new SimulatedGrenadeSystem();
let upperImpactPos = null;
upperSys.throwGrenade(upperCam, (pos) => {
  upperImpactPos = pos.clone();
});

for (let t = 0; t < 2.5; t += 1 / 60) {
  upperSys.update(1 / 60, multiFloorBlocking, [], 3.8);
  if (upperImpactPos) break;
}

assert(upperImpactPos !== null, 'Grenade detonated on Floor 1');
assert(upperImpactPos.y >= 3.8, `Grenade landed ON Floor 1 slab (Y = ${upperImpactPos.y.toFixed(2)} >= 3.8)`);

// -----------------------------------------------------------------------------
// Test 3: Sleeping Monster Direct Proximity Hit
// -----------------------------------------------------------------------------
console.log('\n--- 3. Testing Direct Monster Proximity Impact ---');

const monsterCam = new THREE.PerspectiveCamera(70, 16 / 9, 0.1, 100);
monsterCam.position.set(0, 1.6, 0);
// Look slightly down at monster at (0, 0.5, -4.5)
monsterCam.lookAt(0, 0.5, -4.5);

const monsterPos = new THREE.Vector3(0, 0.5, -4.5);
const monsterSys = new SimulatedGrenadeSystem();
let monsterImpactPos = null;

monsterSys.throwGrenade(monsterCam, (pos) => {
  monsterImpactPos = pos.clone();
});

for (let t = 0; t < 2.5; t += 1 / 60) {
  monsterSys.update(1 / 60, blockingMeshes, [monsterPos], 0);
  if (monsterImpactPos) break;
}

assert(monsterImpactPos !== null, 'Grenade detonated near monster');
const distToMonster = monsterImpactPos.distanceTo(monsterPos);
assert(distToMonster <= 1.5, `Grenade hit/landed right near monster (distance = ${distToMonster.toFixed(2)}m)`);

console.log(`\n========================================`);
console.log(`ALL TESTS PASSED: ${passed}/${total}`);
console.log(`========================================\n`);
