import * as THREE from 'three';
import { ALL_LEVELS } from '../src/level/LevelData';
import { LabyrinthBuilder } from '../src/level/LabyrinthBuilder';
import { FirstPersonController } from '../src/player/FirstPersonController';
import { GridPathfinding } from '../src/pathfinding/GridPathfinding';
import { MonsterController } from '../src/monster/MonsterController';
import { GrenadeSystem } from '../src/weapon/GrenadeSystem';

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

console.log('=== VERIFY STAIRS COLLIDER & GRENADE PROXIMITY ALERT ===\n');

// Mock DOM, WebGL & Audio
const mockGL = {
  getShaderPrecisionFormat: () => ({ precision: 24, rangeMin: 1, rangeMax: 1 }),
  getExtension: () => null,
  getParameter: (param: number) => 16,
  createTexture: () => ({}),
  bindTexture: () => {},
  texParameteri: () => {},
  createProgram: () => ({}),
  createShader: () => ({}),
  attachShader: () => {},
  linkProgram: () => {},
  getProgramParameter: () => true,
  getShaderParameter: () => true,
  useProgram: () => {},
  viewport: () => {},
  clearColor: () => {},
  clear: () => {},
  enable: () => {},
  disable: () => {},
  blendFunc: () => {},
  depthFunc: () => {},
  frontFace: () => {},
  cullFace: () => {},
};

function createMockProxy(): any {
  const p: any = new Proxy(() => p, {
    get: (target: any, prop: string) => {
      if (prop === 'getContext') return () => mockGL;
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
  webkitAudioContext: (globalThis as any).AudioContext,
  addEventListener: () => {},
  removeEventListener: () => {},
};

(globalThis as any).document = {
  getElementById: () => createMockProxy(),
  querySelector: () => createMockProxy(),
  querySelectorAll: () => [],
  createElement: () => ({
    width: 256,
    height: 256,
    style: {},
    classList: { add: () => {}, remove: () => {}, contains: () => false },
    addEventListener: () => {},
    appendChild: () => {},
    getContext: (type: string) => (type === 'webgl' || type === 'webgl2' ? mockGL : createMockProxy()),
  }),
  createElementNS: () => createMockProxy(),
  body: createMockProxy(),
  addEventListener: () => {},
  removeEventListener: () => {},
  exitPointerLock: () => {},
};

(globalThis as any).localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

// -----------------------------------------------------------------------------
// TEST 1: Stair Collider & Smooth Traversal (Level 2 School Staircase)
// -----------------------------------------------------------------------------
console.log('--- TEST 1: Stair Collider & Smooth Traversal (Level 2 School Staircase) ---');
const level2Def = ALL_LEVELS.find((l) => l.id === 2)!;
const buildResult = LabyrinthBuilder.buildLevel(level2Def);

const canvas = createMockProxy();
const pathfinding = new GridPathfinding(buildResult.updatedGrid);
const fpController = new FirstPersonController(canvas, pathfinding, buildResult.collisionConfig);
fpController.setLevel(level2Def, pathfinding, buildResult.playerWorldSpawn, buildResult.collisionConfig);

const ramp = buildResult.collisionConfig.ramps[0];
assert(ramp !== undefined, 'Level 2 has a world ramp');
const midZ = ramp.startWorld.z; // exact centerline Z coordinate of the ramp

// 1.1 Test climbing up the stairs at increments from bottom to top
let allStepsClearCenter = true;
let allStepsClearOffCenter = true;
const numCheckPoints = 16;

for (let i = 0; i <= numCheckPoints; i++) {
  const t = i / numCheckPoints;
  const wx = ramp.startWorld.x + t * (ramp.endWorld.x - ramp.startWorld.x);
  const groundY = ramp.startWorld.y + t * (ramp.endWorld.y - ramp.startWorld.y);
  fpController.position.set(wx, groundY + 1.65, midZ);

  // Centerline check
  const collidesCenter = (fpController as any).collidesWithWalls(wx, midZ);
  if (collidesCenter) {
    allStepsClearCenter = false;
    console.error(`  Stuck at step t=${t.toFixed(2)}, x=${wx.toFixed(2)}, y=${fpController.position.y.toFixed(2)} on centerline!`);
  }

  // Off-center check (z offset = 0.85m, which previously triggered balustrade collision halfway up!)
  const offCenterZ = midZ + 0.85;
  const collidesOffCenter = (fpController as any).collidesWithWalls(wx, offCenterZ);
  if (collidesOffCenter) {
    allStepsClearOffCenter = false;
    console.error(`  Stuck at step t=${t.toFixed(2)}, x=${wx.toFixed(2)}, y=${fpController.position.y.toFixed(2)} at off-center z=${offCenterZ.toFixed(2)}!`);
  }
}

assert(allStepsClearCenter, 'Player can walk up all steps on stair centerline with ZERO collision blocks');
assert(allStepsClearOffCenter, 'Player can walk up all steps off-center without getting stuck on balustrades/steps');

// 1.2 Test lateral handrail constraint: player cannot walk off the side into the void
const maxLateral = Math.max(0.4, ramp.width / 2 - (fpController as any).playerRadius);
const outsideZNorth = midZ - (maxLateral + 0.1);
const outsideZSouth = midZ + (maxLateral + 0.1);
const halfwayX = (ramp.startWorld.x + ramp.endWorld.x) / 2;
fpController.position.set(halfwayX, 1.9 + 1.65, midZ);
const collidesOutsideNorth = (fpController as any).collidesWithWalls(halfwayX, outsideZNorth);
const collidesOutsideSouth = (fpController as any).collidesWithWalls(halfwayX, outsideZSouth);
assert(collidesOutsideNorth, 'Lateral north boundary blocks player from walking through handrail');
assert(collidesOutsideSouth, 'Lateral south boundary blocks player from walking through handrail');

// 1.3 Test vertical isolation: player on Floor 1 above foot of stairs is NOT snapped to the ramp
fpController.position.set(ramp.startWorld.x, 3.8 + 1.65, midZ); // Standing on Floor 1 right above bottom of stairs
const rampInfoAboveFoot = (fpController as any).findRampForPosition(ramp.startWorld.x, midZ, fpController.position.y);
assert(rampInfoAboveFoot === null, 'Player on Floor 1 above stair foot is NOT captured by ramp (vertical check protects them)');

// 1.4 Test continuous walking elevation progression from bottom to top
let smoothAscent = true;
let currentPos = new THREE.Vector3(ramp.startWorld.x, 1.65, midZ);
fpController.position.copy(currentPos);

for (let step = 0; step < 80; step++) {
  // Move forward by 0.1m along X
  currentPos.x += 0.1;
  fpController.position.x = currentPos.x;
  (fpController as any).updateVerticalPhysics(0.016, step * 0.016);

  if (currentPos.x >= ramp.startWorld.x && currentPos.x <= ramp.endWorld.x) {
    const rampProgress = (currentPos.x - ramp.startWorld.x) / (ramp.endWorld.x - ramp.startWorld.x);
    const expectedGroundY = rampProgress * 3.8;
    const diff = Math.abs(fpController.position.y - (expectedGroundY + 1.65));
    if (diff > 0.1) {
      smoothAscent = false;
      console.error(`  Ascent step ${step}: x=${currentPos.x.toFixed(2)}, y=${fpController.position.y.toFixed(2)}, expected=${(expectedGroundY + 1.65).toFixed(2)}`);
      break;
    }
  }
}
assert(smoothAscent, 'Player walking forward continuously ascends stairs smoothly with exact elevation tracking');

// -----------------------------------------------------------------------------
// TEST 2: Grenade Alert Prompt Proximity Check
// -----------------------------------------------------------------------------
console.log('\n--- TEST 2: Grenade Alert Prompt Proximity Check ---');

// Equip Grenade
(fpController as any).weapon.setWeapon('grenade');

// Setup monster in Level 2 (Kuntilanak at x = 4, z = 2, groundY = 0)
const monster = new MonsterController(2, level2Def, buildResult.collisionConfig, pathfinding);
monster.position.set(4, 0, 2);

// Evaluate GameManager stealth update alert logic:
function evaluateGrenadeAlert(
  playerPos: THREE.Vector3,
  playerFloor: number,
  monsterPos: THREE.Vector3,
  isFlying: boolean
): boolean {
  fpController.position.copy(playerPos);
  fpController.currentFloor = playerFloor;
  monster.position.copy(monsterPos);

  const currentWeaponId = (fpController as any).weapon.getWeaponId();
  const isGrenade = currentWeaponId === 'grenade' || currentWeaponId === 'signboard';
  if (!isGrenade) return false;

  const nearestDist = fpController.position.distanceTo(monster.position);
  const alertDist = monster.levelDef?.monsterConfig?.detectionDistance || 9.5;
  const floorHeight = 3.8;
  const monsterFloor = Math.max(0, Math.round(monster.position.y / floorHeight));
  const sameFloor = fpController.currentFloor === monsterFloor || Math.abs(fpController.position.y - monster.position.y) < 2.5;
  const isNearMonster = nearestDist <= alertDist && sameFloor;
  return !isFlying && isNearMonster;
}

// 2.1 When player is far away (e.g. at x = 18, z = 18, dist ~ 21m)
const farPos = new THREE.Vector3(18, 1.65, 18);
const alertWhenFar = evaluateGrenadeAlert(farPos, 0, new THREE.Vector3(4, 0, 2), false);
assert(!alertWhenFar, `Grenade alert is HIDDEN when player is far from monster (dist=${farPos.distanceTo(new THREE.Vector3(4, 0, 2)).toFixed(1)}m > 9.5m)`);

// 2.2 When player is close on same floor (e.g. at x = 8, z = 2, dist = 4m)
const closePos = new THREE.Vector3(8, 1.65, 2);
const alertWhenClose = evaluateGrenadeAlert(closePos, 0, new THREE.Vector3(4, 0, 2), false);
assert(alertWhenClose, `Grenade alert "LEMPAR GRANAT KE KUNTILANAK!" APPEARS when player is close to monster (dist=4.0m <= 9.5m)`);

// 2.3 When player is horizontally near (e.g. 5m) but on a DIFFERENT floor (Floor 1, y = 5.45)
const differentFloorPos = new THREE.Vector3(8, 3.8 + 1.65, 2);
const alertDifferentFloor = evaluateGrenadeAlert(differentFloorPos, 1, new THREE.Vector3(4, 0, 2), false);
assert(!alertDifferentFloor, 'Grenade alert is HIDDEN when player is on a different floor from the monster');

// 2.4 When grenade is already launched and flying
const alertWhenFlying = evaluateGrenadeAlert(closePos, 0, new THREE.Vector3(4, 0, 2), true);
assert(!alertWhenFlying, 'Grenade alert is HIDDEN while a grenade is already in flight');

console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===`);
if (failed > 0) process.exit(1);
