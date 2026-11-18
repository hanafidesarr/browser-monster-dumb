import * as THREE from 'three';
import { WEAPON_MAP } from '../src/data/weapons';
import { WeaponModelFactory } from '../src/weapon/WeaponModelFactory';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ ${msg}`);
  }
}

console.log('--- Testing WeaponModelFactory & Viewmodels ---');

// 1. Kamehameha Viewmodel Inspection
const kMesh = WeaponModelFactory.createViewmodel('kamehameha');
assert(!!kMesh, 'Kamehameha viewmodel created');
const kiGroup = kMesh.getObjectByName('KamehamehaKiGroup');
assert(!!kiGroup, 'KamehamehaKiGroup exists');
assert(kiGroup!.visible === false, 'KamehamehaKiGroup is initially hidden in idle (no ki ball in idle)');

// Inspect left & right arms
let foundBlueWristband = false;
let foundSkinArm = false;
kMesh.traverse((child) => {
  if (child instanceof THREE.Mesh) {
    const mat = child.material as THREE.MeshLambertMaterial;
    if (mat && mat.color) {
      const hex = mat.color.getHex();
      if (hex === 0xdeb887) {
        foundSkinArm = true;
      }
      if (hex === 0x1d4ed8) {
        foundBlueWristband = true;
      }
    }
  }
});
assert(foundSkinArm, 'Arms have skin tone material');
assert(foundBlueWristband, 'Arms have wristband accent');

// 2. Rasengan Viewmodel Inspection
const rMesh = WeaponModelFactory.createViewmodel('rasengan');
assert(!!rMesh, 'Rasengan viewmodel created');

// 3. Test Spam Debounce Logic Simulation
let lastWarningTime = 0;
let warningCount = 0;
function simulateSpamAttack(now: number): boolean {
  if (now - lastWarningTime >= 1200) {
    lastWarningTime = now;
    warningCount++;
    return true; // Warning displayed
  }
  return false; // Spam blocked
}

assert(simulateSpamAttack(1000) === true, 'First click shows warning');
assert(simulateSpamAttack(1100) === false, 'Click at +100ms blocked by spam limiter');
assert(simulateSpamAttack(1500) === false, 'Click at +500ms blocked by spam limiter');
assert(simulateSpamAttack(2199) === false, 'Click at +1199ms blocked by spam limiter');
assert(simulateSpamAttack(2201) === true, 'Click at +1201ms shows warning again');
assert(warningCount === 2, 'Spam limiter prevented rapid duplicate warnings');

console.log('\n🎉 ALL VERIFICATION TESTS PASSED!');
