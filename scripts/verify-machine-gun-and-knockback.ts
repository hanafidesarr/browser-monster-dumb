import * as THREE from 'three';
import { ALL_LEVELS } from '../src/level/LevelData';
import { WEAPON_MAP, WeaponId } from '../src/weapon/WeaponData';
import { MonsterController } from '../src/monster/MonsterController';
import { WeaponModelFactory } from '../src/weapon/WeaponModelFactory';
import { WeaponController } from '../src/player/WeaponController';
import { LabyrinthBuilder } from '../src/level/LabyrinthBuilder';
import { GridPathfinding } from '../src/pathfinding/GridPathfinding';
import { SaveManager } from '../src/core/SaveManager';
import { AudioManager } from '../src/core/AudioManager';
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

const domElements: Record<string, any> = {};
function getOrCreateElement(id: string) {
  if (!domElements[id]) {
    const classes = new Set(['hidden']);
    const children: any[] = [];
    domElements[id] = {
      id,
      style: {},
      classList: {
        add: (c: string) => classes.add(c),
        remove: (c: string) => classes.delete(c),
        contains: (c: string) => classes.has(c),
        toggle: (c: string, force?: boolean) => {
          const shouldAdd = force !== undefined ? force : !classes.has(c);
          if (shouldAdd) classes.add(c); else classes.delete(c);
        },
      },
      textContent: '',
      innerHTML: '',
      addEventListener: () => {},
      removeEventListener: () => {},
      querySelector: (sel: string) => ({ textContent: '', style: {} }),
      querySelectorAll: (sel: string) => [],
      appendChild: (c: any) => children.push(c),
    };
  }
  return domElements[id];
}

const mockStorage: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (k: string) => mockStorage[k] || null,
  setItem: (k: string, v: string) => { mockStorage[k] = v; },
  removeItem: (k: string) => { delete mockStorage[k]; },
  clear: () => { for (const k in mockStorage) delete mockStorage[k]; },
};

(globalThis as any).document = {
  getElementById: (id: string) => getOrCreateElement(id),
  querySelector: (sel: string) => createMockProxy(),
  querySelectorAll: (sel: string) => [],
  createElement: (tag: string) => createMockProxy(),
  createElementNS: () => createMockProxy(),
  body: createMockProxy(),
  addEventListener: () => {},
  removeEventListener: () => {},
};

async function runTests() {
  console.log('--- STARTING VERIFICATION: MACHINE GUN, KNOCKBACK, LEVEL 1 LIGHTING & ALERTS ---');

  // =========================================================================
  // 1. Level 1 Brightness matching Level 2
  // =========================================================================
  console.log('\n[1] Verifying Level 1 Brightness Matching Level 2...');
  const lvl1 = ALL_LEVELS[0];
  const lvl2 = ALL_LEVELS[1];

  const build1 = LabyrinthBuilder.buildLevel(lvl1);
  const build2 = LabyrinthBuilder.buildLevel(lvl2);

  let dirLight1: THREE.DirectionalLight | null = null;
  let ambientLight1: THREE.AmbientLight | null = null;
  build1.rootGroup.traverse((obj) => {
    if (obj instanceof THREE.DirectionalLight && !dirLight1) dirLight1 = obj;
    if (obj instanceof THREE.AmbientLight && !ambientLight1) ambientLight1 = obj;
  });

  let dirLight2: THREE.DirectionalLight | null = null;
  let ambientLight2: THREE.AmbientLight | null = null;
  build2.rootGroup.traverse((obj) => {
    if (obj instanceof THREE.DirectionalLight && !dirLight2) dirLight2 = obj;
    if (obj instanceof THREE.AmbientLight && !ambientLight2) ambientLight2 = obj;
  });

  assert(dirLight1 !== null && (dirLight1 as any).intensity === 1.8, 'Level 1 sky directional light has intensity 1.8 matching Level 2');
  assert(ambientLight1 !== null && (ambientLight1 as any).intensity === 2.2, 'Level 1 ambient light has intensity 2.2 matching Level 2');
  assert(dirLight2 !== null && (dirLight2 as any).intensity === 1.8, 'Level 2 directional light intensity is 1.8');
  assert(ambientLight2 !== null && (ambientLight2 as any).intensity === 2.2, 'Level 2 ambient light intensity is 2.2');

  // =========================================================================
  // 2. Machine Gun Weapon System & Slipper Replacement
  // =========================================================================
  console.log('\n[2] Verifying Machine Gun Definition & 3D Viewmodel...');
  assert(WEAPON_MAP['machine_gun'] !== undefined, 'machine_gun is registered in WEAPON_MAP');
  assert(WEAPON_MAP['machine_gun'].nameId === 'Senapan Mesin', 'machine_gun nameId is Senapan Mesin');
  assert(WEAPON_MAP['machine_gun'].swingType === 'shoot', 'machine_gun swingType is "shoot"');
  assert(WEAPON_MAP['machine_gun'].impactSound === 'gunshot', 'machine_gun impactSound is "gunshot"');
  assert(WEAPON_MAP['slipper'] === WEAPON_MAP['machine_gun'], 'slipper weapon id aliases to machine_gun for full backward compatibility');

  // SaveManager migration
  mockStorage['monster_dumb_save_v1'] = JSON.stringify({
    unlockedWeapons: ['baseball_bat', 'slipper'],
    selectedWeapon: 'slipper',
  });
  // Force reload singleton with migrated save
  (SaveManager as any).instance = undefined;
  const save = SaveManager.getInstance();
  assert(save.isWeaponUnlocked('machine_gun'), 'SaveManager migrated unlocked slipper to machine_gun');
  assert(save.isWeaponUnlocked('slipper'), 'SaveManager alias check for slipper returns true for machine_gun');
  assert(save.getSelectedWeapon() === 'machine_gun', 'SaveManager selectedWeapon migrated to machine_gun');

  // LevelData Pickups
  const lvl1Pickups = lvl1.weaponPickups || [];
  const lvl8Pickups = ALL_LEVELS[7].weaponPickups || [];
  assert(lvl1Pickups.some((p) => p.weaponId === 'machine_gun'), 'Level 1 pickup is machine_gun');
  assert(lvl8Pickups.some((p) => p.weaponId === 'machine_gun'), 'Level 8 pickup is machine_gun');
  assert(!lvl1Pickups.some((p) => p.weaponId === 'slipper'), 'Level 1 no longer has slipper pickup');

  // 3D Viewmodel & MuzzleFlash
  const gunMesh = WeaponModelFactory.createViewmodel('machine_gun');
  assert(gunMesh !== null, 'createViewmodel("machine_gun") returns 3D group');
  const muzzleFlash = gunMesh.getObjectByName('MuzzleFlash');
  assert(muzzleFlash !== null, 'Machine Gun contains MuzzleFlash mesh child');
  assert(muzzleFlash?.visible === false, 'MuzzleFlash is initially hidden (visible: false)');

  // WeaponController shoot recoil animation
  const wpController = new WeaponController();
  wpController.setWeapon('machine_gun');
  assert(wpController.getWeaponId() === 'machine_gun', 'WeaponController equipped machine_gun');
  assert(wpController.getWeaponDef().swingType === 'shoot', 'WeaponController swingType is shoot');

  let shootHitCalled = false;
  wpController.swing(() => { shootHitCalled = true; });
  wpController.update(0.06, false, false, 0); // Fast threshold hit
  assert(shootHitCalled, 'Machine gun fires quickly and triggers hit callback at early threshold');

  // =========================================================================
  // 3. Monster Knockback & Immediate Scream on Grenade and Machine Gun
  // =========================================================================
  console.log('\n[3] Verifying Monster Knockback & Immediate Scream on Impact...');
  const monster = new MonsterController('pocong');
  const pathfinding = new GridPathfinding(lvl1.grid, lvl1.cellSize || 3.8);
  monster.setLevel(lvl1, pathfinding, { x: 10, y: 0, z: 10, rotationY: 0 });

  const initialMonsterPos = monster.position.clone();
  const playerPos = new THREE.Vector3(10, 0, 5); // 5 meters away in -Z direction

  let screamTriggered = false;
  const audio = AudioManager.getInstance();
  const origScream = audio.playMonsterScream.bind(audio);
  audio.playMonsterScream = (type) => {
    screamTriggered = true;
    origScream(type);
  };

  // Struck by Machine Gun Shot from playerPos
  screamTriggered = false;
  monster.triggerWeaponHit(WEAPON_MAP['machine_gun'], playerPos, 1.8);
  assert(screamTriggered, 'Monster immediately screams upon machine gun bullet impact');
  assert(monster.state === 'HIT_REACTION', 'Monster transitions to HIT_REACTION state');

  // Update hit reaction half-way (dt = 0.25)
  monster.update(0.25, 0.25, playerPos);
  const midDist = monster.position.distanceTo(initialMonsterPos);
  assert(midDist > 0.5 && midDist <= 1.8, `Monster knocked back during hit reaction (distance: ${midDist.toFixed(2)}m)`);
  assert(monster.position.z > initialMonsterPos.z, 'Monster was knocked back in +Z direction (away from playerPos)');

  // Complete hit reaction
  monster.update(0.3, 0.55, playerPos);
  const finalKnockDist = monster.position.distanceTo(initialMonsterPos);
  assert(finalKnockDist >= 1.6 && finalKnockDist <= 1.9, `Monster reached target knockback distance (~1.8m: ${finalKnockDist.toFixed(2)}m)`);

  // Struck by Grenade Blast (Test with Kuntilanak)
  const kunti = new MonsterController('kunti');
  const pathfinding2 = new GridPathfinding(lvl2.grid, lvl2.cellSize || 3.8);
  kunti.setLevel(lvl2, pathfinding2, { x: 14, y: 0, z: 14, rotationY: 0 });

  const kuntiInitPos = kunti.position.clone();
  const blastPos = new THREE.Vector3(14, 0, 16); // Grenade landed at z = 16

  screamTriggered = false;
  kunti.triggerWeaponHit(WEAPON_MAP['grenade'], blastPos, 2.2);
  assert(screamTriggered, 'Kuntilanak immediately screams upon grenade explosion impact');

  // Update kunti hit reaction to completion (HIT_REACTION_DURATION = 0.60s)
  kunti.update(0.65, 0.65, blastPos);
  const kuntiKnockDist = kunti.position.distanceTo(kuntiInitPos);
  assert(kuntiKnockDist > 1.0, `Kuntilanak knocked back by grenade blast (~2.2m displacement, dist: ${kuntiKnockDist.toFixed(2)}m)`);
  assert(kunti.isWallClinging === false, 'Kuntilanak is no longer wall-clinging after blast impact');
  assert(Math.abs(kunti.position.y - (kunti as any).baseGroundY) < 0.05, 'Kuntilanak landed on the floor after being knocked off wall');

  // =========================================================================
  // 4. Mobile & Desktop Proximity Alert Check
  // =========================================================================
  console.log('\n[4] Verifying Mobile & Desktop Proximity Alert Hiddenness & Buttons...');
  const ui = UIManager.getInstance();
  ui.showGameplayHUD('TEMBAK');

  const mobileBtn = domElements['btn-mobile-attack'];
  const desktopPrompt = domElements['desktop-attack-prompt'];
  const contextualWrapper = domElements['contextual-attack-wrapper'];
  const detectionMeter = domElements['detection-meter-container'];

  // Check initial state
  assert(desktopPrompt.classList.contains('hidden'), 'desktopAttackPrompt is permanently hidden');
  assert(contextualWrapper.classList.contains('hidden'), 'contextualAttackWrapper is permanently hidden');
  assert(detectionMeter.classList.contains('hidden'), 'detectionMeterContainer is permanently hidden');

  // Set attack prompt visible for machine gun
  ui.setAttackPromptVisible(true, 'POCONG', 'TEMBAK');
  assert(desktopPrompt.classList.contains('hidden'), 'desktopAttackPrompt remains hidden when in range');
  assert(contextualWrapper.classList.contains('hidden'), 'contextualAttackWrapper remains hidden when in range');
  assert(detectionMeter.classList.contains('hidden'), 'detectionMeterContainer remains hidden when in range');
  assert(mobileBtn.classList.contains('can-strike'), 'Mobile attack button activates can-strike state');

  // Set attack prompt idle
  ui.setAttackPromptVisible(false, 'POCONG', 'TEMBAK');
  assert(!mobileBtn.classList.contains('can-strike'), 'Mobile attack button returns to idle when out of range');

  // Switch to Chase Controls
  ui.switchToChaseControls();
  assert(mobileBtn.style.display === 'none', 'Mobile attack button hides during chase phase');

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
