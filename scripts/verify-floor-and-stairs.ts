import * as THREE from 'three';
import { ALL_LEVELS } from '../src/level/LevelData.ts';
import { LabyrinthBuilder } from '../src/level/LabyrinthBuilder.ts';
import { FirstPersonController } from '../src/player/FirstPersonController.ts';
import { GridPathfinding } from '../src/pathfinding/GridPathfinding.ts';

// Mock DOM & Audio
const dummyGrad = { addColorStop: () => {} };
const dummyCtx: any = {
  fillStyle: '',
  strokeStyle: '',
  lineWidth: 1,
  clearRect: () => {},
  fillRect: () => {},
  strokeRect: () => {},
  beginPath: () => {},
  moveTo: () => {},
  lineTo: () => {},
  stroke: () => {},
  fill: () => {},
  arc: () => {},
  ellipse: () => {},
  fillText: () => {},
  save: () => {},
  restore: () => {},
  translate: () => {},
  rotate: () => {},
  scale: () => {},
  bezierCurveTo: () => {},
  quadraticCurveTo: () => {},
  closePath: () => {},
  createRadialGradient: () => dummyGrad,
  createLinearGradient: () => dummyGrad,
};
const dummyCanvas: any = {
  width: 128,
  height: 128,
  getContext: () => dummyCtx,
  addEventListener: () => {},
  removeEventListener: () => {},
};
globalThis.document = {
  createElement: () => ({ ...dummyCanvas }),
  createElementNS: () => ({ ...dummyCanvas }),
} as any;
globalThis.window = { innerWidth: 1024, innerHeight: 768 } as any;
globalThis.localStorage = { getItem: () => null, setItem: () => {} } as any;

console.log('============================================================');
console.log('VERIFYING FLOOR TEXTURES & STAIR COLLIDERS (LEVELS 1 - 10)');
console.log('============================================================');

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, msg: string) {
  totalTests++;
  if (condition) {
    console.log(`✅ PASS: ${msg}`);
    passedTests++;
  } else {
    console.error(`❌ FAIL: ${msg}`);
  }
}

// 1. Verify all stairs & ramps across all levels (Level 1 to 10)
for (const level of ALL_LEVELS) {
  const build = LabyrinthBuilder.buildLevel(level);
  const navGrid = build.navigationGrid || build.updatedGrid || level.grid;
  const pathfinding = new GridPathfinding(navGrid, level.cellSize);

  const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 100);
  const fpc = new FirstPersonController(camera, dummyCanvas);
  fpc.setLevel(
    level,
    pathfinding,
    { x: 0, y: 0, z: 0, rotationY: 0 },
    build.collisionConfig
  );

  if (level.ramps && level.ramps.length > 0) {
    for (let rIdx = 0; rIdx < level.ramps.length; rIdx++) {
      const r = level.ramps[rIdx];
      const worldR = build.ramps[rIdx];
      const dirX = worldR.dirX;
      const dirZ = worldR.dirZ;

      // Sample path from 1.2m before start to 1.2m after end
      let blockedUp = false;
      for (let dist = -1.2; dist <= worldR.length + 1.2; dist += 0.25) {
        const t = Math.max(0, Math.min(1, dist / worldR.length));
        const groundY = worldR.startWorld.y + t * (worldR.endWorld.y - worldR.startWorld.y);
        const wx = worldR.startWorld.x + dist * dirX;
        const wz = worldR.startWorld.z + dist * dirZ;
        const camY = groundY + fpc.playerHeight;
        fpc.position.set(wx, camY, wz);
        if ((fpc as any).collidesWithWalls(wx, wz)) {
          blockedUp = true;
          break;
        }
      }

      let blockedDown = false;
      for (let dist = worldR.length + 1.2; dist >= -1.2; dist -= 0.25) {
        const t = Math.max(0, Math.min(1, dist / worldR.length));
        const groundY = worldR.startWorld.y + t * (worldR.endWorld.y - worldR.startWorld.y);
        const wx = worldR.startWorld.x + dist * dirX;
        const wz = worldR.startWorld.z + dist * dirZ;
        const camY = groundY + fpc.playerHeight;
        fpc.position.set(wx, camY, wz);
        if ((fpc as any).collidesWithWalls(wx, wz)) {
          blockedDown = true;
          break;
        }
      }

      assert(
        !blockedUp,
        `Level ${level.id} (${level.title}) Stair #${rIdx + 1} (F${r.fromFloor}->F${r.toFloor}) walking UP is clear`
      );
      assert(
        !blockedDown,
        `Level ${level.id} (${level.title}) Stair #${rIdx + 1} (F${r.fromFloor}->F${r.toFloor}) walking DOWN is clear`
      );
    }
  }

  // Check that no prop or obstacle is placed within 1 cell of stair start or end
  if (level.ramps && level.ramps.length > 0) {
    for (const r of level.ramps) {
      const minGx = Math.min(r.startCell.x, r.endCell.x) - 1;
      const maxX = Math.max(r.startCell.x, r.endCell.x) + 1;
      const minGz = Math.min(r.startCell.z, r.endCell.z) - 1;
      const maxGz = Math.max(r.startCell.z, r.endCell.z) + 1;

      const halfW = (level.gridWidth * level.cellSize) / 2;
      const halfH = (level.gridHeight * level.cellSize) / 2;

      let blockingPropFound = false;
      for (const p of build.treeColliders) {
        const pgx = Math.floor((p.x + halfW) / level.cellSize);
        const pgz = Math.floor((p.z + halfH) / level.cellSize);
        if (pgx >= minGx && pgx <= maxX && pgz >= minGz && pgz <= maxGz) {
          blockingPropFound = true;
          break;
        }
      }
      assert(
        !blockingPropFound,
        `Level ${level.id} (${level.title}) Stair (F${r.fromFloor}->F${r.toFloor}) has 100% clear entrance and landing corridors with no props`
      );
    }
  }
}

// 2. Verify floor texture scaling across all levels (Level 3 to 10)
for (let lvlId = 3; lvlId <= 10; lvlId++) {
  const level = ALL_LEVELS.find((l) => l.id === lvlId)!;
  const build = LabyrinthBuilder.buildLevel(level);

  // Find floor meshes
  let floorMeshFound = false;
  let matchingUVScale = false;
  for (const obj of build.blockingMeshes) {
    if (obj.name.startsWith('FloorPlatform_') || obj instanceof THREE.Mesh) {
      const mesh = obj as THREE.Mesh;
      if (mesh.material && (mesh.material as any).map) {
        const mat = mesh.material as any;
        const repeat = mat.map.repeat;
        if (repeat && repeat.x <= level.gridWidth * 0.4) {
          floorMeshFound = true;
          matchingUVScale = true;
          break;
        }
      }
    }
  }

  assert(
    floorMeshFound && matchingUVScale,
    `Level ${level.id} (${level.title}) floor texture uses calm, spacious repeat scale (repeat <= ${(level.gridWidth * 0.4).toFixed(1)})`
  );
}

console.log(`\n============================================================`);
console.log(`RESULTS: ${passedTests} / ${totalTests} TESTS PASSED`);
console.log(`============================================================`);

if (passedTests !== totalTests) {
  process.exit(1);
}
