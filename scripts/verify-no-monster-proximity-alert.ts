import * as THREE from 'three';
import { ALL_LEVELS } from '../src/level/LevelData';
import { WEAPON_MAP } from '../src/weapon/WeaponData';
import { MonsterController } from '../src/monster/MonsterController';
import { FirstPersonController } from '../src/player/FirstPersonController';
import { LabyrinthBuilder } from '../src/level/LabyrinthBuilder';
import { GridPathfinding } from '../src/pathfinding/GridPathfinding';
import { UIManager } from '../src/ui/UIManager';

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

// Mock DOM
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
    createGain = () => ({ connect: () => {}, gain: { value: 1, setValueAtTime: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, setTargetAtTime: () => {}, cancelScheduledValues: () => {} } });
    createOscillator = () => ({ connect: () => {}, start: () => {}, stop: () => {}, frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, linearRampToValueAtTime: () => {} } });
    createBiquadFilter = () => ({ connect: () => {}, frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, linearRampToValueAtTime: () => {} }, Q: { setValueAtTime: () => {} }, gain: { value: 0, setValueAtTime: () => {} } });
    createBuffer = () => ({ getChannelData: () => new Float32Array(100), duration: 2.58 });
    decodeAudioData = async () => ({ duration: 2.58 });
    resume = async () => {};
  },
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
  createElement: () => createMockProxy(),
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

console.log('=== VERIFY NO PROXIMITY ALERT ACROSS ALL LEVELS ===\n');

const ui = UIManager.getInstance();
const desktopPrompt = (ui as any).desktopAttackPrompt;
const detectionContainer = (ui as any).detectionMeterContainer;
const contextualWrapper = (ui as any).contextualAttackWrapper;
const mobileAttackBtn = (ui as any).btnMobileAttack;

// Test all 5 levels
for (const levelDef of ALL_LEVELS.slice(0, 5)) {
  console.log(`--- Testing Level ${levelDef.id}: ${levelDef.title} (${levelDef.monsterType || (levelDef.id === 2 ? 'kunti' : 'pocong')}) ---`);

  const buildResult = LabyrinthBuilder.buildLevel(levelDef);
  const pathfinding = new GridPathfinding(buildResult.updatedGrid, levelDef.cellSize);
  const monsterType = levelDef.monsterType || (levelDef.id === 2 ? 'kunti' : 'pocong');
  const monster = new MonsterController(monsterType);
  monster.setLevel(levelDef, pathfinding, buildResult.monsterWorldSpawn, buildResult.collisionConfig);

  const fpController = new FirstPersonController();
  fpController.setLevel(levelDef, pathfinding, buildResult.playerWorldSpawn, buildResult.collisionConfig);

  // Position player close behind monster on the monster's floor
  const floorHeight = buildResult.collisionConfig?.floorHeight || 3.8;
  const monsterFloor = Math.max(0, Math.round(monster.position.y / floorHeight));
  const forward = monster.getForwardVector();
  const playerClosePos = monster.position.clone().sub(forward.clone().multiplyScalar(1.5));
  playerClosePos.y = monster.position.y + 1.65;
  fpController.position.copy(playerClosePos);
  fpController.currentFloor = monsterFloor;

  // 1. Check that monster can be attacked
  const isAttackable = monster.canBeAttackedFromBehind(fpController.position, buildResult.blockingMeshes, monsterFloor);
  assert(isAttackable === true, `Level ${levelDef.id}: Player is in valid striking position near monster`);

  // 2. Call setAttackPromptVisible with true (simulating approach)
  ui.setAttackPromptVisible(true, monsterType === 'kunti' ? 'KUNTILANAK' : 'POCONG', 'PUKUL');
  assert(desktopPrompt.classList.contains('hidden'), `Level ${levelDef.id}: desktopAttackPrompt banner is NEVER shown (contains 'hidden')`);
  assert(contextualWrapper.classList.contains('hidden'), `Level ${levelDef.id}: contextualAttackWrapper is NEVER shown (contains 'hidden')`);
  assert(mobileAttackBtn.classList.contains('can-strike'), `Level ${levelDef.id}: mobileAttackBtn restores can-strike active state as before`);

  ui.setAttackPromptVisible(false, monsterType === 'kunti' ? 'KUNTILANAK' : 'POCONG', 'PUKUL');
  assert(!mobileAttackBtn.classList.contains('can-strike'), `Level ${levelDef.id}: mobileAttackBtn returns to idle state when not in striking range`);

  // 3. Call setDetectionMeter with 1.0 (simulating detection)
  ui.setDetectionMeter(1.0);
  assert(detectionContainer.classList.contains('hidden'), `Level ${levelDef.id}: detectionMeterContainer (ALERT meter) is NEVER shown`);

  // 4. Verify player can still successfully swing weapon and hit the monster
  const cam = fpController.camera;
  cam.position.copy(fpController.position);
  cam.lookAt(monster.position);
  const isHit = monster.isHitByPlayerSwing(
    cam,
    fpController.position,
    new THREE.Vector3().subVectors(monster.position, fpController.position).normalize(),
    buildResult.blockingMeshes,
    monsterFloor
  );
  assert(isHit === true, `Level ${levelDef.id}: Player can successfully hit monster WITHOUT any alert appearing`);
}

console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===`);
if (failed > 0) process.exit(1);
