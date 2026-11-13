import * as THREE from 'three';
import * as fs from 'fs';
import * as path from 'path';

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
    innerWidth: 1024,
    innerHeight: 768,
    AudioContext: class {},
    webkitAudioContext: class {},
  };
}

import { ALL_LEVELS } from '../src/level/LevelData';
import { FirstPersonController } from '../src/player/FirstPersonController';
import { GridPathfinding } from '../src/pathfinding/GridPathfinding';
import { AudioManager } from '../src/core/AudioManager';
import { LabyrinthBuilder } from '../src/level/LabyrinthBuilder';

console.log('================================================================');
console.log('MONSTER DUMB — LEVEL 1 POLISH VERIFICATION SUITE');
console.log('HAUNTED BANANA GARDEN: LIGHTING, POCONG AUDIO & JUMPSCARE');
console.log('================================================================\n');

let passCount = 0;
let totalCount = 0;

function assert(condition: boolean, msg: string) {
  totalCount++;
  if (condition) {
    console.log(`  [PASS] ${msg}`);
    passCount++;
  } else {
    console.error(`  [FAIL] ${msg}`);
    process.exitCode = 1;
  }
}

// -------------------------------------------------------------
// GROUP 1: Audio Asset & Loading Verification
// -------------------------------------------------------------
console.log('--- TEST GROUP 1: Pocong Audio Asset & AudioManager Integration ---');
const originalAudioPath = '/Users/hanafidesar/Documents/MYPROJECT/GAME BROWSER/monster-dumb/pocong_scream.mp3';
const publicAudioPath = path.resolve(process.cwd(), 'public/audio/pocong_scream.mp3');
const publicRootAudioPath = path.resolve(process.cwd(), 'public/pocong_scream.mp3');

assert(fs.existsSync(originalAudioPath), 'User-supplied pocong_scream.mp3 exists at original path');
assert(fs.existsSync(publicAudioPath), 'Public audio file exists at public/audio/pocong_scream.mp3');
assert(fs.existsSync(publicRootAudioPath), 'Public audio file exists at public/pocong_scream.mp3');

const origStats = fs.statSync(originalAudioPath);
const pubStats = fs.statSync(publicAudioPath);
assert(origStats.size === pubStats.size && origStats.size > 50000, `Audio file matches original size exactly (${pubStats.size} bytes)`);

const audio = AudioManager.getInstance();
assert(typeof audio.playPocongScream === 'function', 'AudioManager.playPocongScream method is defined');
assert(typeof audio.playMonsterScream === 'function', 'AudioManager.playMonsterScream method is defined');
assert(typeof audio.loadPocongAudio === 'function', 'AudioManager.loadPocongAudio method is defined');

const mmSource = fs.readFileSync(path.resolve(process.cwd(), 'src/monster/MonsterModel.ts'), 'utf-8');
assert(!mmSource.includes('createAuraParticles'), 'Pocong model has no blue/cyan aura particles (createAuraParticles removed)');
assert(!mmSource.includes('auraParticles'), 'Pocong model has no auraParticles field');

// -------------------------------------------------------------
// GROUP 2: Level 1 Environment & Player Lighting Verification
// -------------------------------------------------------------
console.log('\n--- TEST GROUP 2: Level 1 Environment Lighting & Player-Centered Light ---');
const level1 = ALL_LEVELS.find((l) => l.id === 1)!;
assert(level1 !== undefined, 'Level 1 definition found');

const level1Build = LabyrinthBuilder.buildLevel(level1);
assert(level1Build !== null, 'Level 1 built successfully with LabyrinthBuilder');

// Find lights in Level 1 rootGroup
const lightsInLevel1 = level1Build.rootGroup.children.filter((c) => (c as any).isLight) as THREE.Light[];
const ambientLights = lightsInLevel1.filter((l) => (l as any).isAmbientLight) as THREE.AmbientLight[];
const dirLights = lightsInLevel1.filter((l) => (l as any).isDirectionalLight) as THREE.DirectionalLight[];
const hemiLights = lightsInLevel1.filter((l) => (l as any).isHemisphereLight) as THREE.HemisphereLight[];

assert(ambientLights.length >= 1, 'Level 1 has AmbientLight');
assert(ambientLights[0].intensity <= 1.0, `Level 1 AmbientLight is moody/darker (intensity ${ambientLights[0].intensity} <= 1.0)`);

assert(dirLights.length >= 1, 'Level 1 has DirectionalLight (moonlight)');
assert(dirLights[0].intensity <= 1.2, `Level 1 DirectionalLight is soft moonlight (intensity ${dirLights[0].intensity} <= 1.2)`);

assert(hemiLights.length >= 1, 'Level 1 has HemisphereLight');
assert(hemiLights[0].intensity <= 1.0, `Level 1 HemisphereLight is soft (intensity ${hemiLights[0].intensity} <= 1.0)`);

// Test FirstPersonController Player-Centered Light
const fpc = new FirstPersonController();
assert(fpc.playerLight !== undefined && fpc.playerLight.isPointLight, 'Player has attached playerLight');

// Set Level 1
const pf = new GridPathfinding(level1Build.updatedGrid || level1.grid, level1.cellSize);
fpc.setLevel(level1, pf, { x: 0, y: 1.65, z: 0, rotationY: 0 });

assert(fpc.playerLight.distance >= 25, `Level 1 player light has wide illumination range (${fpc.playerLight.distance}m >= 25m)`);
assert(fpc.playerLight.intensity >= 2.0, `Level 1 player light has clear visible intensity (${fpc.playerLight.intensity} >= 2.0)`);
assert(fpc.playerLight.decay <= 1.25, `Level 1 player light has natural falloff (decay ${fpc.playerLight.decay} <= 1.25)`);

// Test Level 2 Preservation
const level2 = ALL_LEVELS.find((l) => l.id === 2)!;
const level2Build = LabyrinthBuilder.buildLevel(level2);
const pf2 = new GridPathfinding(level2.grid, level2.cellSize);
fpc.setLevel(level2, pf2, { x: 0, y: 1.65, z: 0, rotationY: 0 });

assert(fpc.playerLight.distance === 10, 'Level 2 preserves standard player light distance (10m)');
assert(fpc.playerLight.intensity === 1.5, 'Level 2 preserves standard player light intensity (1.5)');
assert(fpc.playerLight.decay === 1.4, 'Level 2 preserves standard player light decay (1.4)');

// -------------------------------------------------------------
// GROUP 3: Capture Jumpscare Code & Logic Audit
// -------------------------------------------------------------
console.log('\n--- TEST GROUP 3: Capture Jumpscare Code & Behavior Audit ---');
const gmSource = fs.readFileSync(path.resolve(process.cwd(), 'src/core/GameManager.ts'), 'utf-8');
const uiSource = fs.readFileSync(path.resolve(process.cwd(), 'src/ui/UIManager.ts'), 'utf-8');
const htmlSource = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
const cssSource = fs.readFileSync(path.resolve(process.cwd(), 'src/style.css'), 'utf-8');

assert(gmSource.includes("'JUMPSCARE'"), "GameManager GameState includes 'JUMPSCARE'");
assert(gmSource.includes('triggerCaptureJumpscare'), 'GameManager implements triggerCaptureJumpscare');
assert(gmSource.includes('currentLevelDef.id === 1'), 'Capture Jumpscare is strictly gated to Level 1 ONLY');
assert(gmSource.includes('playPocongScream(true)'), 'Jumpscare triggers playPocongScream(true)');
assert(gmSource.includes('applyCatch'), 'Jumpscare animates Pocong model with applyCatch');
assert(gmSource.includes('setEnabled(false)'), 'Jumpscare disables normal player input');
assert(gmSource.includes('triggerGameOver(this.jumpscareReason)'), 'Game Over is triggered after jumpscare sequence completes');

assert(uiSource.includes('showJumpscareOverlay'), 'UIManager implements showJumpscareOverlay');
assert(uiSource.includes('hideJumpscareOverlay'), 'UIManager implements hideJumpscareOverlay');
assert(htmlSource.includes('id="jumpscare-overlay"'), 'HTML contains #jumpscare-overlay container');
assert(cssSource.includes('.jumpscare-overlay'), 'CSS contains styling for .jumpscare-overlay');
assert(cssSource.includes('jumpscarePulse'), 'CSS contains jumpscarePulse animation');

console.log('\n================================================================');
console.log(`LEVEL 1 POLISH VERIFICATION: ${passCount} / ${totalCount} PASSED`);
console.log('================================================================\n');

if (passCount === totalCount) {
  console.log('🎉 ALL LEVEL 1 POLISH REQUIREMENTS ARE FULLY VERIFIED!');
} else {
  console.error('❌ Some tests failed.');
  process.exit(1);
}
