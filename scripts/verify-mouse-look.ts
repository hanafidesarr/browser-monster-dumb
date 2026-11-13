import * as THREE from 'three';
import { InputManager } from '../src/core/InputManager';
import { FirstPersonController } from '../src/player/FirstPersonController';
import { SettingsManager } from '../src/core/SettingsManager';

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

console.log('=== MONSTER DUMB — MOUSE LOOK & POINTER LOCK AUDIT ===\n');

// 1. Setup DOM / Window mocks for Node SSR environment
const eventListeners: Record<string, Function[]> = {};
const windowListeners: Record<string, Function[]> = {};

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
  classList: { add: () => {}, remove: () => {}, contains: () => false },
  src: '',
  onload: () => {},
});

const storageMap = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => storageMap.get(key) || null,
  setItem: (key: string, val: string) => storageMap.set(key, val),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
};

(globalThis as any).document = {
  pointerLockElement: null,
  createElement: (_tag: string) => createMockElement(),
  createElementNS: (_ns: string, _tag: string) => createMockElement(),
  addEventListener: (event: string, handler: Function) => {
    if (!eventListeners[event]) eventListeners[event] = [];
    eventListeners[event].push(handler);
  },
  removeEventListener: (event: string, handler: Function) => {
    if (!eventListeners[event]) return;
    eventListeners[event] = eventListeners[event].filter((h) => h !== handler);
  },
  getElementById: (id: string) => createMockElement(),
};

(globalThis as any).window = {
  innerWidth: 1920,
  innerHeight: 1080,
  addEventListener: (event: string, handler: Function) => {
    if (!windowListeners[event]) windowListeners[event] = [];
    windowListeners[event].push(handler);
  },
  removeEventListener: (event: string, handler: Function) => {
    if (!windowListeners[event]) return;
    windowListeners[event] = windowListeners[event].filter((h) => h !== handler);
  },
  matchMedia: (query: string) => ({
    matches: query.includes('pointer: fine') || query.includes('hover: hover'),
  }),
};

// 2. Initialize InputManager
console.log('--- Test 1: InputManager Initialization & Pointer Lock State ---');
const inputMgr = InputManager.getInstance();
inputMgr.setEnabled(true);
inputMgr.setOverviewMode(false);

assert(!inputMgr.isPointerLocked, 'Initially pointer lock is false');

// 3. Pointer Lock Change Event Handling
console.log('\n--- Test 2: Cross-Browser Pointer Lock Change Events ---');
const triggerDocEvent = (name: string) => {
  const handlers = eventListeners[name] || [];
  handlers.forEach((h) => h(new Event(name)));
};

const triggerWinEvent = (name: string, ev: any) => {
  const handlers = windowListeners[name] || [];
  handlers.forEach((h) => h(ev));
};

// Mock canvas with requestPointerLock
let lockRequested = false;
const mockCanvas: any = {
  requestPointerLock: () => {
    lockRequested = true;
    (globalThis as any).document.pointerLockElement = mockCanvas;
    return Promise.resolve();
  },
};

inputMgr.requestPointerLock(mockCanvas);
assert(lockRequested, 'requestPointerLock successfully invoked on canvas');

triggerDocEvent('pointerlockchange');
assert(inputMgr.isPointerLocked, 'isPointerLocked is true after pointerlockchange');

// 4. Mouse movement under Pointer Lock
console.log('\n--- Test 3: Camera Look via Mouse Under Pointer Lock ---');
triggerWinEvent('mousemove', { movementX: 100, movementY: -50 });
let deltas = inputMgr.consumeLookDelta();
const sens = SettingsManager.getInstance().settings.mouseSensitivity * 0.0006;
const expectedDx = 100 * sens;
const expectedDy = -50 * sens;

assert(Math.abs(deltas.dx - expectedDx) < 0.001, `dx matches expected movement under pointer lock (${deltas.dx.toFixed(4)})`);
assert(Math.abs(deltas.dy - expectedDy) < 0.001, `dy matches expected movement under pointer lock (${deltas.dy.toFixed(4)})`);

// Verify deltas were cleared upon consume
const secondDeltas = inputMgr.consumeLookDelta();
assert(secondDeltas.dx === 0 && secondDeltas.dy === 0, 'consumeLookDelta resets deltas to zero for subsequent frames');

// 5. Fallback Mouse Drag Look when Pointer Lock is Denied / Released
console.log('\n--- Test 4: Drag-To-Look Fallback (Zero Deadlock on Browser Gesture Block) ---');
(globalThis as any).document.pointerLockElement = null;
triggerDocEvent('pointerlockchange');
assert(!inputMgr.isPointerLocked, 'isPointerLocked correctly reflects unlocked state');

// Mouse move without buttons held -> should not rotate
triggerWinEvent('mousemove', { movementX: 80, movementY: 40 });
const unlockedDeltasNoClick = inputMgr.consumeLookDelta();
assert(unlockedDeltasNoClick.dx === 0 && unlockedDeltasNoClick.dy === 0, 'No mouse look drift while cursor freely navigates UI without button press');

// Mouse move with left button down (mousedown) -> fallback look active!
triggerWinEvent('mousedown', { button: 0 });
triggerWinEvent('mousemove', { movementX: 120, movementY: -60 });
const fallbackDeltas = inputMgr.consumeLookDelta();
const expectedFallbackDx = 120 * sens;
const expectedFallbackDy = -60 * sens;
assert(Math.abs(fallbackDeltas.dx - expectedFallbackDx) < 0.001, `Fallback drag look dx functions correctly (${fallbackDeltas.dx.toFixed(4)})`);
assert(Math.abs(fallbackDeltas.dy - expectedFallbackDy) < 0.001, `Fallback drag look dy functions correctly (${fallbackDeltas.dy.toFixed(4)})`);

// Release mouse button
triggerWinEvent('mouseup', { button: 0 });
triggerWinEvent('mousemove', { movementX: 50, movementY: 20 });
const afterReleaseDeltas = inputMgr.consumeLookDelta();
assert(afterReleaseDeltas.dx === 0 && afterReleaseDeltas.dy === 0, 'Fallback look stops once mouse button is released');

// 6. FirstPersonController Integration
console.log('\n--- Test 5: FirstPersonController Yaw & Pitch Rotation ---');
const camera = new THREE.PerspectiveCamera(75, 16 / 9, 0.1, 100);
const scene = new THREE.Scene();
const fp = new FirstPersonController(camera, scene);
fp.setEnabled(true);

const initialYaw = fp.getYaw();
const initialPitch = fp.getPitch();

// Simulate mouse look turn
(globalThis as any).document.pointerLockElement = mockCanvas;
triggerDocEvent('pointerlockchange');
triggerWinEvent('mousemove', { movementX: 200, movementY: 100 });

// Update FP controller
fp.update(0.016, 0.016);

const newYaw = fp.getYaw();
const newPitch = fp.getPitch();

assert(newYaw !== initialYaw, `Yaw rotated smoothly (from ${initialYaw.toFixed(3)} to ${newYaw.toFixed(3)})`);
assert(newPitch !== initialPitch, `Pitch rotated smoothly (from ${initialPitch.toFixed(3)} to ${newPitch.toFixed(3)})`);

// 7. Verify Overview Mode Suppression
console.log('\n--- Test 6: Overview Mode Safety (No Mouse Look in Overview/Menus) ---');
inputMgr.setOverviewMode(true);
triggerWinEvent('mousemove', { movementX: 300, movementY: 200 });
const overviewDeltas = inputMgr.consumeLookDelta();
assert(overviewDeltas.dx === 0 && overviewDeltas.dy === 0, 'Mouse look strictly suppressed during Overview transition / menus');
inputMgr.setOverviewMode(false);

console.log(`\n======================================================`);
console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
console.log(`======================================================\n`);

if (failed > 0) {
  process.exit(1);
}
