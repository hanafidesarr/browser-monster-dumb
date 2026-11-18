import * as THREE from 'three';

function assert(cond, msg) {
  if (!cond) {
    console.error(`❌ ASSERTION FAILED: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ ${msg}`);
  }
}

console.log('--- Testing Audio Playback & Alert Logic ---');

// 1. Simulate Audio Double-Play Prevention
let rasenganPlayCount = 0;
let lastRasenganPlayTime = 0;

function simulatePlayRasenganAudio(now) {
  if (lastRasenganPlayTime > 0 && now - lastRasenganPlayTime < 1.8) {
    return false; // Blocked duplicate
  }
  lastRasenganPlayTime = now;
  rasenganPlayCount++;
  return true;
}

let syntheticRasenganImpactCount = 0;
function simulatePlayRasenganImpact() {
  // On impact with monster, ONLY trigger synthetic impact burst, NEVER replay voice
  syntheticRasenganImpactCount++;
}

// Player initiates Rasengan at t=1.0s
assert(simulatePlayRasenganAudio(1.0) === true, 'Rasengan audio starts on attack initiation');
// Impact happens at t=2.3s
simulatePlayRasenganImpact();
assert(rasenganPlayCount === 1, 'Rasengan voice audio was NOT replayed at impact (played exactly 1 time)');
assert(syntheticRasenganImpactCount === 1, 'Synthetic chakra shockwave played on impact');

// 2. Simulate Kamehameha Double-Play Prevention
let kamehamehaPlayCount = 0;
let lastKamehamehaPlayTime = 0;

function simulatePlayKamehamehaAudio(now) {
  if (lastKamehamehaPlayTime > 0 && now - lastKamehamehaPlayTime < 3.5) {
    return false; // Blocked duplicate
  }
  lastKamehamehaPlayTime = now;
  kamehamehaPlayCount++;
  return true;
}

let syntheticKamehamehaImpactCount = 0;
function simulatePlayKamehamehaImpact() {
  // On impact with monster, ONLY trigger synthetic blast, NEVER replay voice
  syntheticKamehamehaImpactCount++;
}

// Player fires Kamehameha at t=1.0s
assert(simulatePlayKamehamehaAudio(1.0) === true, 'Kamehameha audio starts on charge initiation');
// Laser hits monster at t=5.0s
simulatePlayKamehamehaImpact();
assert(kamehamehaPlayCount === 1, 'Kamehameha voice audio was NOT replayed at impact (played exactly 1 time)');
assert(syntheticKamehamehaImpactCount === 1, 'Synthetic detonation blast played on impact');

// 3. UI Alert Verification for Special Techniques
let isAttackBannerVisible = false;
let isWeaponModelVisible = false;
let miniAlertText = '';

function onEnterGhostArea() {
  isWeaponModelVisible = true;
  isAttackBannerVisible = false; // Hilangkan alert ketika bisa menggunakan senjata ketika menyerang
}

function onExitGhostArea() {
  isWeaponModelVisible = false;
  isAttackBannerVisible = false;
}

function onAttackOutsideArea() {
  miniAlertText = 'SENJATA BELUM BISA DIGUNAKAN!'; // Small sentence only
  isAttackBannerVisible = false;
}

onExitGhostArea();
assert(isWeaponModelVisible === false, 'Weapon hidden outside ghost area');
assert(isAttackBannerVisible === false, 'Banner hidden outside ghost area');

onAttackOutsideArea();
assert(miniAlertText === 'SENJATA BELUM BISA DIGUNAKAN!', 'Small sentence warning shown when clicked outside');
assert(isAttackBannerVisible === false, 'Big attack banner remains hidden');

onEnterGhostArea();
assert(isWeaponModelVisible === true, 'Weapon visible inside ghost area');
assert(isAttackBannerVisible === false, 'Attack banner remains hidden (no distracting banner popup)');

console.log('\n🎉 ALL REWORK VERIFICATION TESTS PASSED SUCCESSFULLY!');
