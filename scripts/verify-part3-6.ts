import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { ALL_LEVELS, LevelDefinition } from '../src/level/LevelData.ts';
import { LabyrinthBuilder } from '../src/level/LabyrinthBuilder.ts';
import { SpawnManager, SelectedSpawns } from '../src/level/SpawnManager.ts';
import { MonsterController } from '../src/monster/MonsterController.ts';
import { FirstPersonController } from '../src/player/FirstPersonController.ts';
import { GridPathfinding } from '../src/pathfinding/GridPathfinding.ts';

// Mock Canvas / DOM / LocalStorage for Node runtime
if (typeof document === 'undefined') {
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
    src: '',
    onload: () => {},
  });

  (globalThis as any).document = {
    createElement: (_tag: string) => createMockElement(),
    createElementNS: (_ns: string, _tag: string) => createMockElement(),
    getElementById: () => null,
    addEventListener: () => {},
    removeEventListener: () => {},
  };

  const storageMap = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (key: string) => storageMap.get(key) || null,
    setItem: (key: string, val: string) => storageMap.set(key, val),
    removeItem: (key: string) => storageMap.delete(key),
    clear: () => storageMap.clear(),
  };

  (globalThis as any).window = {
    addEventListener: () => {},
    removeEventListener: () => {},
    innerWidth: 1280,
    innerHeight: 720,
    devicePixelRatio: 1,
    location: { search: '' },
    localStorage: (globalThis as any).localStorage,
  };

  // Stub FileLoader & FBXLoader in headless test
  THREE.FileLoader.prototype.load = function (_url: any, _onLoad: any, _onProgress: any, _onError: any) {};
  FBXLoader.prototype.load = function (_url: string, _onLoad: any, _onProgress: any, _onError: any) {};
}

export function runPart36Verification() {
  console.log('================================================================');
  console.log('MONSTER DUMB — PART 3.6 RANDOM SPAWNS & MULTI-MONSTER AI AUDIT');
  console.log('================================================================\n');

  let totalTests = 0;
  let passedTests = 0;

  function assert(desc: string, condition: boolean) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  [PASS] ${desc}`);
    } else {
      console.error(`  [FAIL] ${desc}`);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 1: Exact Monster Counts per Level Distribution
  // -------------------------------------------------------------------------
  console.log('=== TEST 1: Monster Count Distribution ===');
  const expectedCounts: Record<number, number> = {
    1: 1, 2: 1, 3: 1, 4: 2, 5: 2, 6: 3, 7: 3, 8: 3, 9: 4, 10: 4
  };

  for (const level of ALL_LEVELS) {
    const expected = expectedCounts[level.id];
    assert(
      `Level ${level.id} (${level.title}): monsterCount === ${expected} (actual: ${level.monsterCount})`,
      level.monsterCount === expected
    );
  }

  // -------------------------------------------------------------------------
  // TEST 2: Randomized Spawn Generation & Geometry Validation
  // -------------------------------------------------------------------------
  console.log('\n=== TEST 2: Randomized Spawn Generation Across All 10 Levels ===');

  for (const level of ALL_LEVELS) {
    const halfW = (level.gridWidth * level.cellSize) / 2;
    const halfH = (level.gridHeight * level.cellSize) / 2;
    const margin = level.id === 1 ? 1.2 : 1.0;

    // Run 5 generations with different seeds to prove true variability
    const spawnsA = SpawnManager.generateSpawns(level, undefined, 12345);
    const spawnsB = SpawnManager.generateSpawns(level, undefined, 67890);
    const isVariable =
      spawnsA.player.x !== spawnsB.player.x ||
      spawnsA.player.z !== spawnsB.player.z ||
      spawnsA.exit.x !== spawnsB.exit.x ||
      spawnsA.monsters[0].x !== spawnsB.monsters[0].x;

    assert(`Level ${level.id} Seed Randomization produces distinct spawn layouts`, isVariable);
    assert(`Level ${level.id} Spawn count matches level monsterCount (${spawnsA.monsters.length} === ${level.monsterCount})`,
      spawnsA.monsters.length === level.monsterCount
    );

    // Validate boundaries
    const playerInBounds =
      Math.abs(spawnsA.player.x) <= halfW - margin &&
      Math.abs(spawnsA.player.z) <= halfH - margin;
    const exitInBounds =
      Math.abs(spawnsA.exit.x) <= halfW - margin &&
      Math.abs(spawnsA.exit.z) <= halfH - margin;
    let allMonstersInBounds = true;
    for (const m of spawnsA.monsters) {
      if (Math.abs(m.x) > halfW - margin || Math.abs(m.z) > halfH - margin) {
        allMonstersInBounds = false;
        break;
      }
    }
    assert(`Level ${level.id} Player within boundary margin (margin=${margin})`, playerInBounds);
    assert(`Level ${level.id} Exit within boundary margin`, exitInBounds);
    assert(`Level ${level.id} All monsters within boundary margin`, allMonstersInBounds);

    // Validate minimum distances
    let playerMonsterDistOk = true;
    for (const m of spawnsA.monsters) {
      const d = Math.hypot(spawnsA.player.x - m.x, spawnsA.player.z - m.z);
      if (d < 5.0) { // minimum safe threshold
        playerMonsterDistOk = false;
      }
    }
    assert(`Level ${level.id} Player-Monster safe separation (>= 5.0m)`, playerMonsterDistOk);

    if (spawnsA.monsters.length > 1) {
      let monsterSeparationOk = true;
      for (let i = 0; i < spawnsA.monsters.length; i++) {
        for (let j = i + 1; j < spawnsA.monsters.length; j++) {
          const m1 = spawnsA.monsters[i];
          const m2 = spawnsA.monsters[j];
          const d = Math.hypot(m1.x - m2.x, m1.y - m2.y, m1.z - m2.z);
          if (d < 4.0) {
            monsterSeparationOk = false;
          }
        }
      }
      assert(`Level ${level.id} Monster-Monster candidate separation (3D dist >= 4.0m)`, monsterSeparationOk);
    }
  }

  // -------------------------------------------------------------------------
  // TEST 3: LabyrinthBuilder Integration & Overview Markers
  // -------------------------------------------------------------------------
  console.log('\n=== TEST 3: LabyrinthBuilder & Overview Camera Markers ===');

  for (const level of ALL_LEVELS) {
    const build = LabyrinthBuilder.buildLevel(level);

    assert(`Level ${level.id} build contains monsterMarkers array`, Array.isArray(build.monsterMarkers));
    assert(`Level ${level.id} monsterMarkers count (${build.monsterMarkers.length}) === monsterCount (${level.monsterCount})`,
      build.monsterMarkers.length === level.monsterCount
    );
    assert(`Level ${level.id} monsterWorldSpawns count (${build.monsterWorldSpawns.length}) === monsterCount (${level.monsterCount})`,
      build.monsterWorldSpawns.length === level.monsterCount
    );

    // Check marker vertical anchoring (must be above roof)
    const expectedRoof = (build.floorCount || 1) * (build.floorHeight || 3.8);
    const markerY = build.playerMarker.position.y;
    assert(`Level ${level.id} Overview markers clear roof height (${markerY.toFixed(1)} > ${expectedRoof.toFixed(1)})`,
      markerY >= expectedRoof + 2.0
    );
  }

  // -------------------------------------------------------------------------
  // TEST 4: Floor-Aware Monster Detection & Strike Rejection
  // -------------------------------------------------------------------------
  console.log('\n=== TEST 4: Floor-Aware Detection & Cross-Floor Strike Rejection ===');
  {
    const l4 = ALL_LEVELS[3]; // Level 4 Hospital (3 floors, 3.8m each)
    const build = LabyrinthBuilder.buildLevel(l4);
    const pathfinding = new GridPathfinding(build.navigationGrid, l4.cellSize);

    const monster = new MonsterController();
    monster.id = 'hospital_monster_f0';
    monster.setLevel(l4, pathfinding, { x: 0, y: 0, z: 0, rotationY: 0, floor: 0 }, build.collisionConfig);

    // Case A: Player on Floor 1 (y = 3.8 + 1.65 = 5.45) directly above monster
    const playerPosFloor1 = new THREE.Vector3(0, 5.45, 0);
    const canAttackFromAbove = monster.canBeAttackedFromBehind(playerPosFloor1, build.blockingMeshes, 1);
    assert('Cross-Floor: Player on Floor 1 CANNOT attack monster on Floor 0', !canAttackFromAbove);

    // Case B: Player on same floor (Floor 0, y = 1.65) behind monster (1.8m behind)
    const playerPosFloor0Behind = new THREE.Vector3(0, 1.65, -1.8);
    const canAttackBehind = monster.canBeAttackedFromBehind(playerPosFloor0Behind, build.blockingMeshes, 0);
    assert('Same-Floor: Player on Floor 0 behind monster CAN attack', canAttackBehind);
  }

  // -------------------------------------------------------------------------
  // TEST 5: Multi-Monster Mutual Separation / Local Avoidance
  // -------------------------------------------------------------------------
  console.log('\n=== TEST 5: Multi-Monster Mutual Separation / Local Avoidance ===');
  {
    const l6 = ALL_LEVELS[5]; // Level 6 Factory (3 monsters)
    const build = LabyrinthBuilder.buildLevel(l6);
    const pathfinding = new GridPathfinding(build.navigationGrid, l6.cellSize);

    const m1 = new MonsterController();
    m1.id = 'm1';
    m1.setLevel(l6, pathfinding, { x: 0, y: 0, z: 0, rotationY: 0 }, build.collisionConfig);

    const m2 = new MonsterController();
    m2.id = 'm2';
    // Spawn dangerously close (0.4m apart)
    m2.setLevel(l6, pathfinding, { x: 0.4, y: 0, z: 0, rotationY: 0 }, build.collisionConfig);

    m1.otherMonsters = [m1, m2];
    m2.otherMonsters = [m1, m2];

    const initialDist = m1.position.distanceTo(m2.position);

    // Awaken and put both in CHASE state pursuing player at (10, 0, 10)
    m1.isAwake = true;
    m1.state = 'CHASE';
    m2.isAwake = true;
    m2.state = 'CHASE';
    const playerPos = new THREE.Vector3(10, 1.65, 10);

    for (let step = 0; step < 10; step++) {
      m1.update(0.05, step * 0.05, playerPos);
      m2.update(0.05, step * 0.05, playerPos);
    }

    const separatedDist = m1.position.distanceTo(m2.position);
    assert(
      `Mutual Separation pushed monsters apart (initial=${initialDist.toFixed(2)}m -> separated=${separatedDist.toFixed(2)}m)`,
      separatedDist > initialDist
    );
  }

  // -------------------------------------------------------------------------
  // TEST 6: Approved Chase Speeds
  // -------------------------------------------------------------------------
  console.log('\n=== TEST 6: Approved Chase Speeds (relative to 6.0 m/s sprint) ===');
  const expectedSpeeds: Record<number, number> = {
    1: 5.10, 2: 5.16, 3: 5.22, 4: 5.28, 5: 5.34, 6: 5.46, 7: 5.52, 8: 5.58, 9: 5.64, 10: 5.70
  };

  for (const level of ALL_LEVELS) {
    const expected = expectedSpeeds[level.id];
    const actual = level.monsterConfig.chaseSpeed;
    const diff = Math.abs(actual - expected);
    assert(
      `Level ${level.id} Chase Speed === ${expected.toFixed(2)} m/s (actual: ${actual.toFixed(2)})`,
      diff < 0.01
    );
  }

  // -------------------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`PART 3.6 VERIFICATION AUDIT COMPLETE: ${passedTests} / ${totalTests} PASSED`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    console.log('🎉 ALL PART 3.6 SPECIFICATIONS AND TESTS PASSED PERFECTLY!');
  } else {
    console.error(`⚠️ ${totalTests - passedTests} TESTS FAILED!`);
    process.exit(1);
  }
}

runPart36Verification();
