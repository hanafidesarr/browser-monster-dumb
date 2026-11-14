import { ALL_LEVELS } from '../src/level/LevelData';
import { ALL_WEAPONS } from '../src/weapon/WeaponData';
import { SaveManager } from '../src/core/SaveManager';
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
  location: {
    search: '',
  },
  AudioContext: class {
    currentTime = 0;
    sampleRate = 44100;
    state = 'running';
    destination = {};
    createBufferSource = () => ({ connect: () => {}, start: () => {}, stop: () => {} });
    createGain = () => ({ connect: () => {}, gain: { value: 1, setValueAtTime: () => {} } });
    createOscillator = () => ({ connect: () => {}, start: () => {}, stop: () => {}, frequency: { setValueAtTime: () => {} } });
    createBiquadFilter = () => ({ connect: () => {}, frequency: { setValueAtTime: () => {} }, Q: { setValueAtTime: () => {} }, gain: { value: 0 } });
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

(globalThis as any).document = {
  getElementById: (id: string) => getOrCreateElement(id),
  querySelector: () => createMockProxy(),
  querySelectorAll: () => [],
  createElement: () => createMockProxy(),
  createElementNS: () => createMockProxy(),
  body: createMockProxy(),
  addEventListener: () => {},
  removeEventListener: () => {},
};

(globalThis as any).localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

async function runTests() {
  console.log('--- STARTING VERIFICATION: URL PARAMETER DEV / TEST MODE ---');

  const save = SaveManager.getInstance();

  // Test 1: Normal mode (no URL params)
  (globalThis as any).window.location.search = '';
  assert(save.isDevModeEnabled() === false, 'Dev mode is disabled when window.location.search is empty');
  assert(save.isLevelUnlocked(1) === true, 'Level 1 is unlocked in normal mode');
  assert(save.isLevelUnlocked(2) === false, 'Level 2 is locked in normal mode');
  assert(save.isLevelUnlocked(10) === false, 'Level 10 is locked in normal mode');
  assert(save.isWeaponUnlocked('baseball_bat') === true, 'Baseball bat is unlocked by default in normal mode');
  assert(save.isWeaponUnlocked('machine_gun') === false, 'Machine gun is locked by default in normal mode');
  assert(save.isWeaponUnlocked('grenade') === false, 'Grenade is locked by default in normal mode');

  // Test 2: ?dev=1 parameter
  console.log('\n[2] Testing URL ?dev=1...');
  (globalThis as any).window.location.search = '?dev=1';
  assert(save.isDevModeEnabled() === true, '?dev=1 activates dev mode');

  for (const lvl of ALL_LEVELS) {
    assert(save.isLevelUnlocked(lvl.id) === true, `Level ${lvl.id} is unlocked via ?dev=1`);
  }

  for (const wp of ALL_WEAPONS) {
    assert(save.isWeaponUnlocked(wp.id) === true, `Weapon ${wp.id} is unlocked via ?dev=1`);
  }

  // Can select any weapon in dev mode
  save.setSelectedWeapon('machine_gun');
  assert(save.getSelectedWeapon() === 'machine_gun', 'Can select machine_gun in dev mode');
  save.setSelectedWeapon('grenade');
  assert(save.getSelectedWeapon() === 'grenade', 'Can select grenade in dev mode');

  // Test 3: ?test=all parameter
  console.log('\n[3] Testing URL ?test=all...');
  (globalThis as any).window.location.search = '?test=all';
  assert(save.isDevModeEnabled() === true, '?test=all activates dev mode');
  assert(save.isLevelUnlocked(5) === true, 'Level 5 is unlocked via ?test=all');
  assert(save.isWeaponUnlocked('electric_fan') === true, 'Electric fan is unlocked via ?test=all');

  // Test 4: ?unlock=all parameter
  console.log('\n[4] Testing URL ?unlock=all...');
  (globalThis as any).window.location.search = '?unlock=all';
  assert(save.isDevModeEnabled() === true, '?unlock=all activates dev mode');
  assert(save.isLevelUnlocked(10) === true, 'Level 10 is unlocked via ?unlock=all');

  // Test 5: UI Manager integration
  console.log('\n[5] Testing UIManager with dev mode active...');
  const ui = UIManager.getInstance();
  (ui as any).populateLevelsList();
  (ui as any).populateWeaponSelection();
  assert(true, 'UIManager rendered levels and weapon selection without errors in dev mode');

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
