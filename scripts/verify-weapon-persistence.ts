import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { ALL_LEVELS, LevelDefinition } from '../src/level/LevelData.ts';
import { LabyrinthBuilder } from '../src/level/LabyrinthBuilder.ts';
import { SaveManager } from '../src/core/SaveManager.ts';
import { WEAPON_MAP, WeaponId } from '../src/weapon/WeaponData.ts';

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

  THREE.FileLoader.prototype.load = function (_url: any, _onLoad: any, _onProgress: any, _onError: any) {};
  FBXLoader.prototype.load = function (_url: string, _onLoad: any, _onProgress: any, _onError: any) {};
}

export function runWeaponPersistenceVerification() {
  console.log('================================================================');
  console.log('MONSTER DUMB — WEAPON PICKUP PERSISTENCE AUDIT & TEST SUITE');
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

  // 1. Reset storage to pristine state
  localStorage.clear();
  const save = SaveManager.getInstance();
  (save as any).data = (save as any).load();

  console.log('--- TEST 1: Pristine State ---');
  assert('Default unlocked weapon is only baseball_bat',
    save.isWeaponUnlocked('baseball_bat') &&
    !save.isWeaponUnlocked('signboard') &&
    !save.isWeaponUnlocked('slipper') &&
    !save.isWeaponUnlocked('frying_pan')
  );

  const level1 = ALL_LEVELS[0];
  const build1Initial = LabyrinthBuilder.buildLevel(level1);
  assert('Level 1 initial weapon pickups has 2 weapons (signboard & slipper)',
    build1Initial.weaponPickups.length === 2
  );
  assert('Level 1 pickups contain signboard',
    build1Initial.weaponPickups.some(p => p.weaponId === 'signboard')
  );
  assert('Level 1 pickups contain slipper',
    build1Initial.weaponPickups.some(p => p.weaponId === 'slipper')
  );

  // 2. Collect 'slipper'
  console.log('\n--- TEST 2: Collecting "slipper" ---');
  const unlockedSlipper = save.unlockWeapon('slipper');
  assert('SaveManager unlocks slipper successfully (returns true)', unlockedSlipper === true);
  assert('SaveManager confirms slipper is unlocked', save.isWeaponUnlocked('slipper'));

  // 3. Re-enter Level 1 (Retry / Reload)
  console.log('\n--- TEST 3: Re-entering Level 1 (Retry / Game Over) ---');
  const build1AfterSlipper = LabyrinthBuilder.buildLevel(level1);
  assert('Level 1 now only spawns 1 pickup (signboard)',
    build1AfterSlipper.weaponPickups.length === 1 &&
    build1AfterSlipper.weaponPickups[0].weaponId === 'signboard'
  );
  assert('Slipper pickup is NOT spawned in Level 1 rootGroup',
    !build1AfterSlipper.weaponPickups.some(p => p.weaponId === 'slipper')
  );

  // 4. Visit Level 8 (which also contains 'slipper' by definition)
  console.log('\n--- TEST 4: Visiting Level 8 (Multiple Locations with same weaponId) ---');
  const level8 = ALL_LEVELS[7]; // Level 8 Subway contains 'slipper' at (18, 2)
  const build8 = LabyrinthBuilder.buildLevel(level8);
  assert('Level 8 defines slipper in level definition',
    level8.weaponPickups?.some(p => p.weaponId === 'slipper') === true
  );
  assert('Level 8 world pickup for slipper is HIDDEN because slipper is globally unlocked',
    build8.weaponPickups.length === 0
  );

  // 5. Collect 'signboard'
  console.log('\n--- TEST 5: Collecting "signboard" ---');
  const unlockedSignboard = save.unlockWeapon('signboard');
  assert('SaveManager unlocks signboard successfully', unlockedSignboard === true);
  assert('Duplicate unlock returns false (no duplicate toast/sound)',
    save.unlockWeapon('signboard') === false
  );

  // 6. Re-enter Level 1 (both weapons collected)
  console.log('\n--- TEST 6: Re-entering Level 1 (All weapons collected) ---');
  const build1AllCollected = LabyrinthBuilder.buildLevel(level1);
  assert('Level 1 has ZERO weapon pickups spawned (all collected)',
    build1AllCollected.weaponPickups.length === 0
  );

  // 7. Visit Level 9 (which also defines 'signboard')
  console.log('\n--- TEST 7: Visiting Level 9 (Contains signboard) ---');
  const level9 = ALL_LEVELS[8];
  const build9 = LabyrinthBuilder.buildLevel(level9);
  assert('Level 9 defines signboard in level definition',
    level9.weaponPickups?.some(p => p.weaponId === 'signboard') === true
  );
  assert('Level 9 world pickup for signboard is HIDDEN because signboard is globally unlocked',
    build9.weaponPickups.length === 0
  );

  // 8. Other undiscovered weapons remain available
  console.log('\n--- TEST 8: Undiscovered weapons in other levels remain available ---');
  const level2 = ALL_LEVELS[1]; // Frying pan
  const build2 = LabyrinthBuilder.buildLevel(level2);
  assert('Level 2 frying_pan pickup IS spawned because frying_pan is not yet unlocked',
    build2.weaponPickups.length === 1 && build2.weaponPickups[0].weaponId === 'frying_pan'
  );

  const level3 = ALL_LEVELS[2]; // Chair
  const build3 = LabyrinthBuilder.buildLevel(level3);
  assert('Level 3 chair pickup IS spawned',
    build3.weaponPickups.length === 1 && build3.weaponPickups[0].weaponId === 'chair'
  );

  const level6 = ALL_LEVELS[5]; // Toy hammer
  const build6 = LabyrinthBuilder.buildLevel(level6);
  assert('Level 6 toy_hammer pickup IS spawned',
    build6.weaponPickups.length === 1 && build6.weaponPickups[0].weaponId === 'toy_hammer'
  );

  // 9. Browser Reload Persistence
  console.log('\n--- TEST 9: Browser Reload / localStorage Persistence ---');
  const rawSaved = localStorage.getItem('monster_dumb_save_v1');
  assert('Save data is properly written to localStorage', !!rawSaved);

  // Re-read from stored JSON
  const parsed = JSON.parse(rawSaved!);
  assert('Stored JSON contains unlocked slipper and signboard',
    parsed.unlockedWeapons.includes('slipper') &&
    parsed.unlockedWeapons.includes('signboard') &&
    parsed.unlockedWeapons.includes('baseball_bat')
  );

  // Re-instantiate SaveManager to simulate page reload
  (save as any).data = (save as any).load();
  assert('Reloaded SaveManager retains unlocked weapons',
    save.isWeaponUnlocked('slipper') && save.isWeaponUnlocked('signboard')
  );

  const build1AfterReload = LabyrinthBuilder.buildLevel(level1);
  assert('After reload, Level 1 weapon pickups remain 0',
    build1AfterReload.weaponPickups.length === 0
  );

  // Summary
  console.log('\n================================================================');
  console.log(`WEAPON PERSISTENCE VERIFICATION: ${passedTests} / ${totalTests} PASSED`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    console.log('🎉 ALL WEAPON PERSISTENCE REQUIREMENTS SATISFIED PERFECTLY!');
  } else {
    console.error(`⚠️ ${totalTests - passedTests} TESTS FAILED!`);
    process.exit(1);
  }
}

runWeaponPersistenceVerification();
