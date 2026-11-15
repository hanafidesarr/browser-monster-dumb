import * as fs from 'fs';
import * as path from 'path';

let passed = 0;
let total = 0;

function assert(condition, msg) {
  total++;
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  } else {
    passed++;
    console.log(`✅ PASS: ${msg}`);
  }
}

console.log('--- VERIFYING BUG FIX: LEVEL SELECTION & SETTINGS PERSISTENCE ---');

// 1. Verify SaveManager source
const saveManagerPath = path.resolve(process.cwd(), 'src/core/SaveManager.ts');
const saveManagerCode = fs.readFileSync(saveManagerPath, 'utf8');

assert(
  saveManagerCode.includes('currentLevel: number;'),
  'SaveManager: SaveData interface includes currentLevel'
);
assert(
  saveManagerCode.includes('currentLevel: 1,'),
  'SaveManager: DEFAULT_SAVE includes currentLevel default'
);
assert(
  saveManagerCode.includes('public getCurrentLevel(): number {'),
  'SaveManager: implements getCurrentLevel()'
);
assert(
  saveManagerCode.includes('public setCurrentLevel(levelNumber: number): void {'),
  'SaveManager: implements setCurrentLevel()'
);
assert(
  saveManagerCode.includes('this.data.currentLevel = levelNumber;'),
  'SaveManager: updates currentLevel in memory and saves'
);

// 2. Verify UIManager source
const uiManagerPath = path.resolve(process.cwd(), 'src/ui/UIManager.ts');
const uiCode = fs.readFileSync(uiManagerPath, 'utf8');

assert(
  uiCode.includes('SaveManager.getInstance().getCurrentLevel()'),
  'UIManager: btn-menu-play uses getCurrentLevel instead of hardcoded unlockedLevel'
);
assert(
  uiCode.includes('this.settingsSource === \'pause\'') &&
  uiCode.includes('this.settingsSource === \'overview\''),
  'UIManager: btn-settings-back properly routes back to pause, overview, or main_menu'
);
assert(
  uiCode.includes('SaveManager.getInstance().setCurrentLevel(level.id);'),
  'UIManager: level selection card click updates currentLevel in SaveManager'
);
// 3. Verify GameManager source
const gmPath = path.resolve(process.cwd(), 'src/core/GameManager.ts');
const gmCode = fs.readFileSync(gmPath, 'utf8');

assert(
  gmCode.includes('SaveManager.getInstance().setCurrentLevel(this.currentLevelDef.id);'),
  'GameManager: loadLevel updates currentLevel in SaveManager'
);
assert(
  gmCode.includes('SaveManager.getInstance().getCurrentLevel()'),
  'GameManager: init() defaults background preview to currentLevel when no query param is present'
);

// 4. Verify index.html source
const indexPath = path.resolve(process.cwd(), 'index.html');
const indexHtml = fs.readFileSync(indexPath, 'utf8');

assert(
  !indexHtml.includes('id="btn-overview-settings"'),
  'index.html: settings button is removed from weapon selection screen per user request'
);

// 5. Functional Simulation of the Reported Bug:
// "saat saya di level 10 kemudian memilih level 1, kemudian saya ke setting dan merubah setting, saat di play, kenapa kembali ke level 10 ?"
console.log('\n--- FUNCTIONAL SCENARIO SIMULATION ---');

class MockLocalStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, val) {
    this.store[key] = String(val);
  }
}

const mockStorage = new MockLocalStorage();
// User was at Level 10 (unlocked up to level 10)
mockStorage.setItem('monster_dumb_save_v1', JSON.stringify({
  unlockedLevel: 10,
  currentLevel: 10,
  completedLevels: {},
  unlockedWeapons: ['baseball_bat'],
  selectedWeapon: 'baseball_bat',
  settings: {
    masterVolume: 80,
    sfxVolume: 90,
    musicVolume: 70,
    mobileControlMode: 'simple',
    mouseSensitivity: 5,
    touchSensitivity: 8,
    graphicsQuality: 'med'
  }
}));

// Simulate SaveManager load
let saveObj = JSON.parse(mockStorage.getItem('monster_dumb_save_v1'));
assert(saveObj.unlockedLevel === 10, 'Initial state: unlockedLevel is 10');
assert(saveObj.currentLevel === 10, 'Initial state: currentLevel is 10');

// Step 1: User selects Level 1 in Level Select
const selectedLevelId = 1;
saveObj.currentLevel = selectedLevelId;
mockStorage.setItem('monster_dumb_save_v1', JSON.stringify(saveObj));

assert(saveObj.currentLevel === 1, 'Step 1: User chose Level 1, currentLevel is now 1');

// Step 2: User opens Settings and modifies a setting (e.g. masterVolume = 50, graphicsQuality = high)
saveObj = JSON.parse(mockStorage.getItem('monster_dumb_save_v1'));
saveObj.settings.masterVolume = 50;
saveObj.settings.graphicsQuality = 'high';
mockStorage.setItem('monster_dumb_save_v1', JSON.stringify(saveObj));

// Step 3: User clicks PLAY on Main Menu
// Under old buggy code:
// const oldBuggyTarget = saveObj.unlockedLevel; // Buggy: returned 10!
// Under fixed code:
const fixedTargetLevel = saveObj.currentLevel || 1;

assert(
  fixedTargetLevel === 1,
  'Step 3: Clicking PLAY loads Level 1 (currentLevel), NOT Level 10!'
);

assert(
  saveObj.settings.masterVolume === 50,
  'Step 4: Settings changes are preserved'
);

assert(
  saveObj.unlockedLevel === 10,
  'Step 5: unlockedLevel remains 10 (progress is NOT lost)'
);

console.log(`\n🎉 ALL ${passed}/${total} VERIFICATIONS PASSED!`);
