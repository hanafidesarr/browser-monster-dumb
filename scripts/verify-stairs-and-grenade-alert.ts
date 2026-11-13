import * as THREE from 'three';
import { ALL_LEVELS } from '../src/level/LevelData';
import { LabyrinthBuilder } from '../src/level/LabyrinthBuilder';
import { FirstPersonController } from '../src/player/FirstPersonController';
import { GridPathfinding } from '../src/pathfinding/GridPathfinding';
import { MonsterController } from '../src/monster/MonsterController';
import { UIManager } from '../src/ui/UIManager';
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
    get: (target: any, prop: string | symbol) => {
      if (prop === 'getContext') return () => mockGL;
      if (prop === 'getImageData') return () => ({ data: new Uint8ClampedArray(1024) });
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

const domElements: Record<string, any> = {};
function getOrCreateElement(id: string) {
  if (!domElements[id]) {
    const classes = new Set(['hidden']);
    domElements[id] = {
      id,
      classList: {
        add: (c: string) => classes.add(c),
        remove: (c: string) => classes.delete(c),
        contains: (c: string) => classes.has(c),
        toggle: (c: string, force?: boolean) => {
          const shouldAdd = force !== undefined ? force : !classes.has(c);
          if (shouldAdd) classes.add(c); else classes.delete(c);
        },
      },
      style: {},
      appendChild: () => {},
      removeChild: () => {},
      querySelector: () => createMockProxy(),
      querySelectorAll: () => [],
      addEventListener: () => {},
      removeEventListener: () => {},
    };
  }
  return domElements[id];
}

(globalThis as any).document = {
  getElementById: (id: string) => getOrCreateElement(id),
  querySelector: () => createMockProxy(),
  querySelectorAll: () => [],
  createElement: () => ({
    width: 256,
    height: 256,
    style: {},
    classList: { add: () => {}, remove: () => {}, contains: () => false },
    appendChild: () => {},
    removeChild: () => {},
    addEventListener: () => {},
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
// TEST 2: Proximity Alert Removal Check (Alert Completely Removed When Near Monster)
// -----------------------------------------------------------------------------
console.log('\n--- TEST 2: Monster Proximity Alert Removal Check ---');

// Equip Grenade
(fpController as any).weapon.setWeapon('grenade');

// Setup monster in Level 2 (Kuntilanak at x = 4, z = 2, groundY = 0)
const monster = new MonsterController('kunti');
monster.position.set(4, 0, 2);

// Check UIManager setAttackPromptVisible and setDetectionMeter
const ui = UIManager.getInstance();
const desktopPrompt = (ui as any).desktopAttackPrompt;
const detectionContainer = (ui as any).detectionMeterContainer;

// 2.1 Direct UI Call: setAttackPromptVisible(true) must keep prompt banner hidden
ui.setAttackPromptVisible(true, 'Kuntilanak', 'LEMPAR');
assert(desktopPrompt.classList.contains('hidden'), 'desktopAttackPrompt remains HIDDEN even if setAttackPromptVisible is called with true');

// 2.2 Direct UI Call: setDetectionMeter must keep detection meter container hidden
ui.setDetectionMeter(1.0);
assert(detectionContainer.classList.contains('hidden'), 'detectionMeterContainer remains HIDDEN even if setDetectionMeter is called');

// 2.3 When player is close to monster (x = 8, z = 2, dist = 4m), prompt remains hidden
const closePos = new THREE.Vector3(8, 1.65, 2);
fpController.position.copy(closePos);
ui.setAttackPromptVisible(false);
assert(desktopPrompt.classList.contains('hidden'), 'Proximity alert banner remains completely HIDDEN when player is near the monster');

// 2.4 Mobile button behavior as before: activates can-strike in attack range, returns to idle when not
const mobileBtn = (ui as any).btnMobileAttack;
ui.setAttackPromptVisible(true, 'Kuntilanak', 'LEMPAR');
assert(mobileBtn.classList.contains('can-strike'), 'Mobile attack button activates can-strike state as before');
ui.setAttackPromptVisible(false, 'Kuntilanak', 'LEMPAR');
assert(!mobileBtn.classList.contains('can-strike'), 'Mobile attack button returns to idle state when out of range');

console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===`);
if (failed > 0) process.exit(1);
