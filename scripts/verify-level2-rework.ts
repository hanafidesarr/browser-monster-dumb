import { ALL_LEVELS } from '../src/level/LevelData';
import { SaveManager } from '../src/core/SaveManager';
import * as THREE from 'three';

// Polyfill minimal document / canvas for Node.js execution
if (typeof globalThis.document === 'undefined') {
  const dummyGrad = { addColorStop: () => {} };
  const dummyCtx: any = {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
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
  (globalThis as any).document = {
    createElement: (tag: string) => {
      if (tag === 'canvas') return { ...dummyCanvas };
      return {};
    },
  };
}

if (typeof globalThis.localStorage === 'undefined') {
  (globalThis as any).localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };
}

import { LabyrinthBuilder } from '../src/level/LabyrinthBuilder';

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

console.log('=== MONSTER DUMB — LEVEL 2 ENVIRONMENT REWORK VERIFICATION ===\n');

// 1. Build Level 2
const level2Def = ALL_LEVELS.find((l) => l.id === 2)!;
assert(!!level2Def, 'Level 2 definition found');
assert(level2Def.theme === 'school', 'Level 2 theme is school');
assert(level2Def.floorCount === 2, 'Level 2 has 2 floors');

const buildResult = LabyrinthBuilder.buildLevel(level2Def);
assert(!!buildResult, 'LabyrinthBuilder successfully built Level 2');

const root = buildResult.rootGroup;

// 2. Floor Geometry & Upper Floor 3D Architectural Slab
console.log('\n--- Test 1: 3D Upper-Floor Architectural Slab & Materials ---');
const topMesh = root.getObjectByName('SchoolFloorTop_1') as THREE.Mesh;
const bottomMesh = root.getObjectByName('SchoolFloorBottom_1') as THREE.Mesh;
const edgeMesh = root.getObjectByName('SchoolFloorEdge_1') as THREE.Mesh;

assert(!!topMesh, 'Upper floor has top walkable surface mesh (SchoolFloorTop_1)');
assert(!!bottomMesh, 'Upper floor has bottom soffit ceiling mesh (SchoolFloorBottom_1)');
assert(!!edgeMesh, 'Upper floor has vertical 3D fascia edge mesh (SchoolFloorEdge_1)');

if (topMesh && bottomMesh && edgeMesh) {
  topMesh.geometry.computeBoundingBox();
  bottomMesh.geometry.computeBoundingBox();
  edgeMesh.geometry.computeBoundingBox();

  const topBox = topMesh.geometry.boundingBox!;
  const botBox = bottomMesh.geometry.boundingBox!;
  const edgeBox = edgeMesh.geometry.boundingBox!;

  assert(Math.abs(topBox.max.y - 3.8) < 0.01, `Top surface elevation is exactly 3.80m (actual: ${topBox.max.y.toFixed(2)})`);
  assert(Math.abs(botBox.min.y - 3.4) < 0.01, `Bottom surface elevation is exactly 3.40m (actual: ${botBox.min.y.toFixed(2)})`);
  const thickness = topBox.max.y - botBox.min.y;
  assert(Math.abs(thickness - 0.40) < 0.01, `Upper floor slab has real 0.40m structural thickness (actual: ${thickness.toFixed(2)}m)`);
  assert(Math.abs(edgeBox.min.y - 3.4) < 0.01 && Math.abs(edgeBox.max.y - 3.8) < 0.01, 'Vertical edge fascia spans exactly 3.40m to 3.80m');
}

// 3. Structural Concrete Columns / Support Pillars
console.log('\n--- Test 2: Structural Support Columns / Pillars ---');
const pillars = root.children.filter((c) => c.name === 'SchoolSupportPillar');
assert(pillars.length === 12, `12 structural concrete support pillars created in atrium/hallways (found: ${pillars.length})`);
const pillarColliders = buildResult.collisionConfig.cylinderColliders.filter((c) => c.label === 'support_pillar');
assert(pillarColliders.length === 12, `12 pillar colliders registered with height limits (found: ${pillarColliders.length})`);
assert(pillarColliders.every((c) => c.minY === 0 && Math.abs((c.maxY || 0) - 3.4) < 0.01), 'All pillar colliders properly bounded between y=0 and y=3.4m');

// 4. Stairwell Opening & Geometry
console.log('\n--- Test 3: Stairwell Opening & Staircase Alignment ---');
const stairOpenings = buildResult.collisionConfig.stairOpenings;
assert(stairOpenings.length === 1, `1 stairwell opening registered (found: ${stairOpenings.length})`);

const sOpen = stairOpenings[0];
assert(sOpen.floor === 1, 'Stair opening is on Floor 1');
assert(sOpen.minGx === 7 && sOpen.maxGx === 8, `Stair opening covers cells 7-8 along X (actual: ${sOpen.minGx}-${sOpen.maxGx})`);
assert(sOpen.minGz === 9 && sOpen.maxGz === 9, `Stair opening covers cell 9 along Z (actual: ${sOpen.minGz}-${sOpen.maxGz})`);

const openBox = sOpen.box;
assert(Math.abs(openBox.min.x - (-13.3)) < 0.01, `Opening minX matches west edge of cell 7 (-13.30m, actual: ${openBox.min.x.toFixed(2)})`);
assert(Math.abs(openBox.max.x - (-5.7)) < 0.01, `Opening maxX matches east edge of cell 8 (-5.70m, actual: ${openBox.max.x.toFixed(2)})`);

const ramps = buildResult.collisionConfig.ramps;
assert(ramps.length === 1, `1 WorldRamp registered (found: ${ramps.length})`);
const r = ramps[0];
assert(Math.abs(r.startWorld.x - (-13.3)) < 0.01, `Stair starts at west boundary x=-13.30m (actual: ${r.startWorld.x.toFixed(2)})`);
assert(Math.abs(r.startWorld.y - 0.0) < 0.01, `Stair starts at Floor 0 elevation y=0.0m (actual: ${r.startWorld.y.toFixed(2)})`);
assert(Math.abs(r.endWorld.x - (-5.7)) < 0.01, `Stair ends flush at cell 9 slab edge x=-5.70m (actual: ${r.endWorld.x.toFixed(2)})`);
assert(Math.abs(r.endWorld.y - 3.8) < 0.01, `Stair ends at Floor 1 elevation y=3.80m (actual: ${r.endWorld.y.toFixed(2)})`);
assert(Math.abs(r.length - 7.6) < 0.01, `Stair length is 7.60m matching opening length (actual: ${r.length.toFixed(2)}m)`);

const stairMesh = root.getObjectByName('SchoolStaircase');
assert(!!stairMesh, 'SchoolStaircase mesh exists in scene');

// 5. Railings
console.log('\n--- Test 4: Safety Balustrades & Railings ---');
const railings = root.children.filter((c) => c.name === 'SchoolStairwellRailing');
assert(railings.length === 3, `3 school stairwell balustrades added (North, South, Back) (found: ${railings.length})`);

const northRailing = buildResult.collisionConfig.boxColliders.find((b) => b.label === 'balustrade_north' || b.label === 'school_stair_railing_north');
const southRailing = buildResult.collisionConfig.boxColliders.find((b) => b.label === 'balustrade_south' || b.label === 'school_stair_railing_south');
const backRailing = buildResult.collisionConfig.boxColliders.find((b) => b.label === 'balustrade_back' || b.label === 'school_stair_railing_back');
assert(!!northRailing, 'North safety railing box collider registered');
assert(!!southRailing, 'South safety railing box collider registered');
assert(!!backRailing, 'Back safety railing box collider registered');

// Front of stairs (east towards cell 9) MUST be completely unblocked
const frontBlocking = buildResult.collisionConfig.boxColliders.some(
  (b) => b.minX >= -5.8 && b.maxX <= -5.6 && b.minZ <= -3.8 && b.maxZ >= -3.8
);
assert(!frontBlocking, 'Front entrance to Floor 2 is unblocked (player steps freely onto cell 9)');

// 6. Props Density & Multi-Floor Separation
console.log('\n--- Test 5: School Environment Props Density & Multi-Floor Isolation ---');
const propColliders = buildResult.collisionConfig.cylinderColliders.filter((c) => c.label !== 'support_pillar');
assert(propColliders.length >= 35, `Rich prop density: at least 35 solid obstacle props placed (found: ${propColliders.length})`);

const floor0Props = propColliders.filter((c) => c.minY === 0);
const floor1Props = propColliders.filter((c) => (c.minY || 0) >= 3.5);
assert(floor0Props.length >= 18, `Floor 0 has at least 18 obstacle props (found: ${floor0Props.length})`);
assert(floor1Props.length >= 15, `Floor 1 has at least 15 obstacle props (found: ${floor1Props.length})`);
assert(
  propColliders.every((c) => c.minY !== undefined && c.maxY !== undefined),
  '100% of solid prop colliders have explicit vertical bounds (zero cross-floor collision bleed)'
);

// Verify prop types present
const desks = root.children.filter((c) => c.name === 'SchoolDesk');
const teacherDesks = root.children.filter((c) => c.name === 'TeacherDesk');
const stackedChairs = root.children.filter((c) => c.name === 'StackedChairsObstacle');
const overturnedDesks = root.children.filter((c) => c.name === 'OverturnedDesk');
const bookshelves = root.children.filter((c) => c.name === 'SchoolBookshelf');
const fallenShelves = root.children.filter((c) => c.name === 'FallenBookshelfObstacle');
const cabinets = root.children.filter((c) => c.name === 'MetalStorageCabinet');
const crtLabs = root.children.filter((c) => c.name === 'LabCounterWithCRT');
const blackboards = root.children.filter((c) => c.name === 'Blackboard');
const noticeBoards = root.children.filter((c) => c.name === 'NoticeBoard');
const trashBins = root.children.filter((c) => c.name === 'TrashBin');
const boxStacks = root.children.filter((c) => c.name === 'CardboardBoxesStack');
const paperDebris = root.children.filter((c) => c.name === 'ScatteredPapersDebris');

assert(desks.length >= 10, `Classroom student desks present (${desks.length})`);
assert(teacherDesks.length >= 3, `Teacher lecture desks present (${teacherDesks.length})`);
assert(stackedChairs.length >= 4, `Stacked chair obstacles present (${stackedChairs.length})`);
assert(overturnedDesks.length >= 4, `Overturned desk obstacles present (${overturnedDesks.length})`);
assert(bookshelves.length >= 3, `School bookshelves present (${bookshelves.length})`);
assert(fallenShelves.length >= 2, `Fallen bookshelf obstacles present (${fallenShelves.length})`);
assert(cabinets.length >= 5, `Metal storage cabinets present (${cabinets.length})`);
assert(crtLabs.length >= 4, `Computer & science lab CRT counters present (${crtLabs.length})`);
assert(blackboards.length >= 10, `Classroom wall blackboards present (${blackboards.length})`);
assert(noticeBoards.length >= 8, `Hallway notice boards present (${noticeBoards.length})`);
assert(trashBins.length >= 4, `Trash bins present (${trashBins.length})`);
assert(boxStacks.length >= 6, `Cardboard archive box stacks present (${boxStacks.length})`);
assert(paperDebris.length >= 5, `Scattered papers debris decals present (${paperDebris.length})`);

// 7. Navigation Validity (Breadth-First Search on both floors)
console.log('\n--- Test 6: Navigation Validity (Player & Monster Paths) ---');
// Grid check: Player spawn (3, 3) must be clear
assert(level2Def.grid[3][3] === 0, 'Player spawn cell (3, 3) is open');
// Frying pan pickup (17, 3) must be clear
assert(level2Def.grid[3][17] === 0, 'Weapon pickup cell (17, 3) is open');
// Stair start cell (7, 9) must be clear
assert(level2Def.grid[9][7] === 0, 'Stair start cell (7, 9) is open');
// Exit door cell (18, 18) must be clear
assert(level2Def.grid[18][18] === 0, 'Exit door cell (18, 18) is open');

// Simple BFS on 21x21 grid to verify connectivity from player spawn (3, 3)
const visited: boolean[][] = Array.from({ length: 21 }, () => Array(21).fill(false));
const queue: Array<{ x: number; z: number }> = [{ x: 3, z: 3 }];
visited[3][3] = true;

while (queue.length > 0) {
  const cur = queue.shift()!;
  const neighbors = [
    { x: cur.x + 1, z: cur.z },
    { x: cur.x - 1, z: cur.z },
    { x: cur.x, z: cur.z + 1 },
    { x: cur.x, z: cur.z - 1 },
  ];
  for (const n of neighbors) {
    if (n.x >= 0 && n.x < 21 && n.z >= 0 && n.z < 21) {
      if (level2Def.grid[n.z][n.x] === 0 && !visited[n.z][n.x]) {
        visited[n.z][n.x] = true;
        queue.push(n);
      }
    }
  }
}

assert(visited[3][17], 'Valid navigable corridor path exists from Player Spawn (3, 3) to Frying Pan (17, 3)');
assert(visited[9][7], 'Valid navigable corridor path exists from Player Spawn (3, 3) to Stair Foot (7, 9)');
assert(visited[18][18], 'Valid navigable corridor path exists from Stair to Exit Door (18, 18)');

// 8. Multi-Floor Lighting Balance
console.log('\n--- Test 7: Multi-Floor Lighting Consistency ---');
const cageLights = root.children.filter((c) => c.name === 'HangingCageLight');
const floor0Lights = cageLights.filter((l) => l.position.y === 0);
const floor1Lights = cageLights.filter((l) => Math.abs(l.position.y - 3.8) < 0.01);
assert(floor0Lights.length === 9, `Floor 0 has 9 hanging corridor cage lights (found: ${floor0Lights.length})`);
assert(floor1Lights.length === 9, `Floor 1 has 9 hanging corridor cage lights for balanced atmosphere (found: ${floor1Lights.length})`);

// 9. Regression Check on other levels
console.log('\n--- Test 8: Regression Safety (Levels 1 & 3 Unchanged) ---');
const level1Def = ALL_LEVELS.find((l) => l.id === 1)!;
const l1Build = LabyrinthBuilder.buildLevel(level1Def);
assert(l1Build.floorCount === 1, 'Level 1 retains single-floor isolation (floorCount = 1)');
assert(l1Build.ramps.length === 0, 'Level 1 has 0 ramps (unchanged)');

const level3Def = ALL_LEVELS.find((l) => l.id === 3)!;
const l3Build = LabyrinthBuilder.buildLevel(level3Def);
assert(l3Build.floorCount === 2, 'Level 3 retains 2-floor brutalist labyrinth layout');
assert(l3Build.collisionConfig.bridges.length === 1, 'Level 3 retains wooden bridge');
assert(l3Build.collisionConfig.environmentId === 'labyrinth', 'Level 3 theme remains labyrinth');

console.log(`\n======================================================`);
console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log(`======================================================\n`);

if (failed > 0) {
  process.exit(1);
}
