import { readFileSync } from 'fs';
import { resolve } from 'path';

console.log('================================================================');
console.log('MONSTER DUMB — PART 3.7 VERIFICATION SUITE');
console.log('SINGLE MONSTER ALERT & ANDROID ATTACK BUTTON POSITION');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${testName}`);
  } else {
    console.error(`  [FAIL] ${testName}`);
    if (detail) console.error(`         Reason: ${detail}`);
  }
}

// 1. Audit CSS file
console.log('--- TEST GROUP 1: CSS & Positioning Audit ---');
const styleCss = readFileSync(resolve(process.cwd(), 'src/style.css'), 'utf-8');

// A. Red contextual alert permanently disabled
assert(
  styleCss.includes('#contextual-attack-wrapper {\n  display: none !important;\n  pointer-events: none !important;\n}'),
  'Contextual red attack alert is permanently disabled with display: none !important'
);

// B. Base button positions shifted upward and leftward
assert(
  styleCss.includes('bottom: max(calc(env(safe-area-inset-bottom, 16px) + 14px), 32px);') &&
  styleCss.includes('right: max(calc(env(safe-area-inset-right, 16px) + 14px), 34px);'),
  'Base .touch-attack-btn & .touch-sprint-btn shifted upward and leftward (bottom: 32px, right: 34px)'
);

// C. Mobile landscape query adjustments
assert(
  styleCss.includes('right: max(calc(env(safe-area-inset-right) + 14px), 30px);') &&
  styleCss.includes('bottom: max(calc(env(safe-area-inset-bottom) + 16px), 26px);'),
  'Mobile landscape / portrait media queries adjust button to bottom: 26px, right: 30px'
);

// D. Black background alert banner preserved
assert(
  styleCss.includes('background: rgba(14, 17, 23, 0.94);') &&
  styleCss.includes('.attack-prompt-banner'),
  'Attack prompt banner maintains dark/black background rgba(14, 17, 23, 0.94)'
);

// 2. Audit UIManager.ts
console.log('\n--- TEST GROUP 2: UIManager Alert Consolidation ---');
const uiManagerCode = readFileSync(resolve(process.cwd(), 'src/ui/UIManager.ts'), 'utf-8');

assert(
  uiManagerCode.includes('this.desktopAttackPrompt.classList.remove(\'hidden\');') &&
  uiManagerCode.includes('this.desktopAttackPrompt.classList.add(\'hidden\');'),
  'UIManager toggles desktopAttackPrompt (black background banner)'
);

assert(
  uiManagerCode.includes('this.contextualAttackWrapper.classList.add(\'hidden\');') &&
  !uiManagerCode.includes('this.contextualAttackWrapper.classList.remove(\'hidden\');'),
  'UIManager never shows contextualAttackWrapper (keeps it permanently hidden)'
);

assert(
  uiManagerCode.includes('this.btnMobileAttack.classList.add(\'can-strike\');'),
  'UIManager activates can-strike pulsing highlight on mobile button when in attack range'
);

// 3. Audit GameManager.ts multi-monster handling
console.log('\n--- TEST GROUP 3: GameManager Multi-Monster Alert Behavior ---');
const gameManagerCode = readFileSync(resolve(process.cwd(), 'src/core/GameManager.ts'), 'utf-8');

assert(
  gameManagerCode.includes('let nearestAttackableMonster: MonsterController | null = null;'),
  'GameManager tracks nearestAttackableMonster among all active monsters'
);

assert(
  gameManagerCode.includes('UIManager.getInstance().setAttackPromptVisible(canAttackAny);'),
  'GameManager emits a single unified boolean for setAttackPromptVisible'
);

assert(
  gameManagerCode.includes('this.fpController.setMonsterObstacle(nearestAttackableMonster.position);'),
  'GameManager prioritizes setting obstacle collision to the attackable monster'
);

// 4. Audit InputManager.ts
console.log('\n--- TEST GROUP 4: InputManager Attack Handling ---');
const inputManagerCode = readFileSync(resolve(process.cwd(), 'src/core/InputManager.ts'), 'utf-8');

assert(
  inputManagerCode.includes('bindAttackElement(mobileAttackBtn);'),
  'Mobile attack button is bound to touch/pointerdown'
);

assert(
  inputManagerCode.includes('bindAttackElement(desktopAttackPrompt);'),
  'Desktop/mobile prompt banner is clickable directly to trigger attack'
);

console.log('\n================================================================');
console.log(`PART 3.7 CODE & BEHAVIOR AUDIT: ${passedTests} / ${totalTests} PASSED`);
console.log('================================================================\n');

if (passedTests === totalTests) {
  console.log('🎉 ALL PART 3.7 REQUIREMENTS VERIFIED PERFECTLY!');
  process.exit(0);
} else {
  console.error('❌ SOME TESTS FAILED!');
  process.exit(1);
}
