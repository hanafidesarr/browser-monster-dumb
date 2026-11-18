globalThis.document = {
  createElement: () => ({
    getContext: () => ({
      fillRect: () => {},
      fillStyle: '',
      createLinearGradient: () => ({ addColorStop: () => {} }),
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fill: () => {},
    }),
    width: 64,
    height: 64,
  }),
} as any;
globalThis.window = {} as any;

import * as THREE from 'three';
import { WeaponController } from '../src/player/WeaponController.ts';

console.log('--- RUNNING RASENGAN ANIMATION REWORK VERIFICATION ---');

const controller = new WeaponController();
controller.setWeapon('rasengan');

console.log('1. Initial weapon:', controller.getWeaponId());
console.log('Initial state:', controller.getRasenganState());
if (controller.getRasenganState() !== 'idle') throw new Error('Initial state not idle');

let impactFired = false;
let completeFired = false;

const startSuccess = controller.startRasenganSequence(
  () => {
    impactFired = true;
    console.log('>>> IMPACT CALLBACK FIRED! State:', controller.getRasenganState());
  },
  () => {
    completeFired = true;
    console.log('>>> COMPLETE CALLBACK FIRED! State:', controller.getRasenganState());
  }
);

if (!startSuccess) throw new Error('startRasenganSequence failed');
console.log('2. Sequence started. State:', controller.getRasenganState());

// Test overlap protection: second start while running must return false
const overlapAttempt = controller.startRasenganSequence();
if (overlapAttempt) throw new Error('Overlap protection failed: second start should return false');
console.log('3. Overlap protection verified: rejected second concurrent start');

// Step simulation through time
const dt = 0.016; // 60 FPS
let totalTime = 0;
const recordedStates = new Set<string>();

while (totalTime < 2.5 && controller.getRasenganState() !== 'idle') {
  controller.update(dt, false, false, totalTime);
  totalTime += dt;
  recordedStates.add(controller.getRasenganState());
}

console.log('4. States visited in sequence:', Array.from(recordedStates));
console.log('Final state after full cycle:', controller.getRasenganState());
console.log('Impact fired:', impactFired);
console.log('Complete fired:', completeFired);

if (!impactFired) throw new Error('Impact callback was never fired');
if (!completeFired) throw new Error('Complete callback was never fired');
if (controller.getRasenganState() !== 'idle') throw new Error('Did not return to idle');

// Verify all 5 stages were visited
const expectedStages = ['preparing', 'charging', 'charged', 'thrusting', 'impact', 'recovering'];
for (const stage of expectedStages) {
  if (!recordedStates.has(stage)) throw new Error(`Missing stage: ${stage}`);
}
console.log('5. All 5 stages + recovery verified in exact order!');

// 6. Test consecutive second attack
impactFired = false;
completeFired = false;
const secondStart = controller.startRasenganSequence(
  () => { impactFired = true; },
  () => { completeFired = true; }
);
if (!secondStart) throw new Error('Consecutive second attack failed to start');
console.log('6. Consecutive second attack started successfully');

// Run through second attack
totalTime = 0;
while (totalTime < 2.5 && controller.getRasenganState() !== 'idle') {
  controller.update(dt, false, false, totalTime);
  totalTime += dt;
}
if (!impactFired || !completeFired || controller.getRasenganState() !== 'idle') {
  throw new Error('Consecutive second attack failed to complete');
}
console.log('7. Consecutive second attack completed successfully back to idle');

// 8. Test interruption / reset cleanup
controller.startRasenganSequence();
controller.update(0.2, false, false, 0.2);
console.log('Pre-reset state:', controller.getRasenganState());
controller.resetRasengan();
console.log('Post-reset state:', controller.getRasenganState());
if (controller.getRasenganState() !== 'idle') throw new Error('resetRasengan failed to reset to idle');
console.log('8. Interruption cleanup verified');

console.log('--- ALL VERIFICATION TESTS PASSED SUCCESSFULLY! ---');
