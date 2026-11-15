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
globalThis.window = {
  innerWidth: 1024,
  innerHeight: 768,
} as any;

console.log('--- DIAGNOSING STAIRS, PROPS & COLLIDERS FOR ALL LEVELS ---');

for (const level of ALL_LEVELS) {
  console.log(`\n============================================================`);
  console.log(`Level ${level.id}: ${level.title}`);
  console.log(`============================================================`);

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

  const { cellSize, gridWidth, gridHeight } = level;
  const halfW = (gridWidth * cellSize) / 2;
  const halfH = (gridHeight * cellSize) / 2;
  const grid = build.navigationGrid || level.grid;

  // Check 1: Test all stairs / ramps
  if (level.ramps && level.ramps.length > 0) {
    console.log(`Stair / Ramp count: ${level.ramps.length}`);
    for (let rIdx = 0; rIdx < level.ramps.length; rIdx++) {
      const r = level.ramps[rIdx];
      const worldR = build.ramps[rIdx];
      console.log(`\nTesting Stair #${rIdx + 1}: Floor ${r.fromFloor} -> ${r.toFloor}`);
      console.log(`  Start: (${worldR.startWorld.x.toFixed(2)}, ${worldR.startWorld.y.toFixed(2)}, ${worldR.startWorld.z.toFixed(2)})`);
      console.log(`  End:   (${worldR.endWorld.x.toFixed(2)}, ${worldR.endWorld.y.toFixed(2)}, ${worldR.endWorld.z.toFixed(2)})`);

      // Test walking up the stair in increments of 0.2m, starting from 1.5m BEFORE start to 1.5m AFTER end
      const dirX = worldR.dirX;
      const dirZ = worldR.dirZ;
      const totalDist = worldR.length + 3.0;
      let blockedStepsUp: Array<{ u: number; wx: number; wy: number; wz: number }> = [];

      for (let dist = -1.5; dist <= worldR.length + 1.5; dist += 0.2) {
        const t = Math.max(0, Math.min(1, dist / worldR.length));
        const groundY = worldR.startWorld.y + t * (worldR.endWorld.y - worldR.startWorld.y);
        const wx = worldR.startWorld.x + dist * dirX;
        const wz = worldR.startWorld.z + dist * dirZ;
        const camY = groundY + fpc.playerHeight;

        fpc.position.set(wx, camY, wz);
        let blockReason = '';
        const isBlocked = (fpc as any).collidesWithWalls(wx, wz);
        if (isBlocked) {
          // Identify which step blocked
          const cylinders = (fpc as any).collisionConfig ? (fpc as any).collisionConfig.cylinderColliders : (fpc as any).treeColliders;
          for (let i = 0; i < cylinders.length; i++) {
            const t = cylinders[i];
            if (t.minY !== undefined && t.maxY !== undefined) {
              if (camY < t.minY - 0.2 || camY > t.maxY + fpc.playerHeight) continue;
            }
            const dx = wx - t.x;
            const dz = wz - t.z;
            const totalR = fpc.playerRadius + t.radius;
            if (dx * dx + dz * dz < totalR * totalR) {
              blockReason = `Cylinder / Prop: label=${t.label || 'prop'} at (${t.x.toFixed(2)}, ${t.z.toFixed(2)})`;
              break;
            }
          }
          if (!blockReason && (fpc as any).collisionConfig && (fpc as any).collisionConfig.boxColliders) {
            for (let i = 0; i < (fpc as any).collisionConfig.boxColliders.length; i++) {
              const b = (fpc as any).collisionConfig.boxColliders[i];
              if (
                wx >= b.minX - fpc.playerRadius &&
                wx <= b.maxX + fpc.playerRadius &&
                wz >= b.minZ - fpc.playerRadius &&
                wz <= b.maxZ + fpc.playerRadius
              ) {
                if (b.minY !== undefined && b.maxY !== undefined) {
                  if (camY >= b.minY + 0.3 && camY <= b.maxY + fpc.playerHeight) {
                    blockReason = `BoxCollider: label=${b.label} [X: ${b.minX.toFixed(2)}..${b.maxX.toFixed(2)}, Z: ${b.minZ.toFixed(2)}..${b.maxZ.toFixed(2)}, Y: ${b.minY.toFixed(2)}..${b.maxY.toFixed(2)}]`;
                    break;
                  }
                } else {
                  blockReason = `BoxCollider: label=${b.label}`;
                  break;
                }
              }
            }
          }
          if (!blockReason) {
            const grid = (fpc as any).collisionConfig?.wallGrid || (fpc as any).levelDef.grid;
            const gx = Math.floor((wx + halfW) / cellSize);
            const gz = Math.floor((wz + halfH) / cellSize);
            blockReason = `Grid Wall or Perimeter: cell=(${gx}, ${gz}), val=${grid[gz]?.[gx]}`;
          }
          blockedStepsUp.push({ u: dist, wx, wy: camY, wz, reason: blockReason } as any);
        }
      }

      if (blockedStepsUp.length > 0) {
        console.error(`  ❌ BLOCKED WALKING UP! Total blocked sample points: ${blockedStepsUp.length}`);
        for (const b of blockedStepsUp.slice(0, 5)) {
          console.error(`     At u=${b.u.toFixed(2)}m: pos=(${b.wx.toFixed(2)}, ${b.wy.toFixed(2)}, ${b.wz.toFixed(2)}) -> Reason: ${(b as any).reason}`);
        }
      } else {
        console.log(`  ✅ Clear walking UP!`);
      }

      // Test walking down the stair
      let blockedStepsDown: Array<{ u: number; wx: number; wy: number; wz: number }> = [];
      for (let dist = worldR.length + 1.5; dist >= -1.5; dist -= 0.2) {
        const t = Math.max(0, Math.min(1, dist / worldR.length));
        const groundY = worldR.startWorld.y + t * (worldR.endWorld.y - worldR.startWorld.y);
        const wx = worldR.startWorld.x + dist * dirX;
        const wz = worldR.startWorld.z + dist * dirZ;
        const camY = groundY + fpc.playerHeight;

        fpc.position.set(wx, camY, wz);
        const isBlocked = (fpc as any).collidesWithWalls(wx, wz);
        if (isBlocked) {
          blockedStepsDown.push({ u: dist, wx, wy: camY, wz });
        }
      }

      if (blockedStepsDown.length > 0) {
        console.error(`  ❌ BLOCKED WALKING DOWN! Total blocked sample points: ${blockedStepsDown.length}`);
        for (const b of blockedStepsDown.slice(0, 5)) {
          console.error(`     At u=${b.u.toFixed(2)}m: pos=(${b.wx.toFixed(2)}, ${b.wy.toFixed(2)}, ${b.wz.toFixed(2)})`);
        }
      } else {
        console.log(`  ✅ Clear walking DOWN!`);
      }
    }
  } else {
    console.log('No stairs on this level.');
  }

  // Check 2: Check all prop colliders against walls and corridors
  console.log(`\nChecking Props and Obstacles: count = ${build.treeColliders.length}`);

  let trappedProps = 0;
  for (const p of build.treeColliders) {
    // Check if prop is inside or too close to a wall, or leaves no room for player to pass in a 1-wide corridor
    const gx = Math.floor((p.x + halfW) / cellSize);
    const gz = Math.floor((p.z + halfH) / cellSize);

    // If cell is a wall
    if (grid[gz] && grid[gz][gx] === 1) {
      console.warn(`  ⚠️ Prop (${p.x.toFixed(2)}, ${p.z.toFixed(2)}) is inside wall cell (${gx}, ${gz})`);
      trappedProps++;
      continue;
    }

    // Check surrounding 4 neighbors. If 2 opposing neighbors are walls (e.g. narrow corridor),
    // check if remaining passage width < 2 * playerRadius (0.7m)
    const northWall = gz > 0 && grid[gz - 1][gx] === 1;
    const southWall = gz < gridHeight - 1 && grid[gz + 1][gx] === 1;
    const westWall = gx > 0 && grid[gz][gx - 1] === 1;
    const eastWall = gx < gridWidth - 1 && grid[gz][gx + 1] === 1;

    // Narrow corridor in X (North & South walls)
    if (northWall && southWall) {
      const cellCenterZ = (gz + 0.5) * cellSize - halfH;
      const corridorNorthZ = gz * cellSize - halfH;
      const corridorSouthZ = (gz + 1) * cellSize - halfH;
      const spaceNorth = (p.z - p.radius) - corridorNorthZ;
      const spaceSouth = corridorSouthZ - (p.z + p.radius);
      const maxPassage = Math.max(spaceNorth, spaceSouth);
      if (maxPassage < fpc.playerRadius * 2) {
        console.error(`  ❌ TRAP DETECTED: Prop at (${p.x.toFixed(2)}, ${p.z.toFixed(2)}, label=${(p as any).label || 'prop'}) blocks narrow E-W corridor at gz=${gz}! Max passage = ${maxPassage.toFixed(2)}m (need >= ${(fpc.playerRadius * 2).toFixed(2)}m)`);
        trappedProps++;
      }
    }

    // Narrow corridor in Z (West & East walls)
    if (westWall && eastWall) {
      const corridorWestX = gx * cellSize - halfW;
      const corridorEastX = (gx + 1) * cellSize - halfW;
      const spaceWest = (p.x - p.radius) - corridorWestX;
      const spaceEast = corridorEastX - (p.x + p.radius);
      const maxPassage = Math.max(spaceWest, spaceEast);
      if (maxPassage < fpc.playerRadius * 2) {
        console.error(`  ❌ TRAP DETECTED: Prop at (${p.x.toFixed(2)}, ${p.z.toFixed(2)}, label=${(p as any).label || 'prop'}) blocks narrow N-S corridor at gx=${gx}! Max passage = ${maxPassage.toFixed(2)}m (need >= ${(fpc.playerRadius * 2).toFixed(2)}m)`);
        trappedProps++;
      }
    }
  }

  if (trappedProps === 0) {
    console.log(`✅ All props have safe clearances and do not trap the player!`);
  } else {
    console.error(`❌ Total trapped/blocking props on Level ${level.id}: ${trappedProps}`);
  }
}
