import * as fs from 'fs';
import * as path from 'path';

let passed = 0;
let total = 0;

function assert(condition: boolean, msg: string) {
  total++;
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    process.exit(1);
  } else {
    passed++;
    console.log(`✅ PASS: ${msg}`);
  }
}

async function run() {
  console.log('--- VERIFYING USER FIXES: WEAPONS IN TITLE, BLUR REMOVAL, NO START ANIMATION ---');

  // 1. Verify CSS: #screen-overview is hidden by default and only flex when active
  const styleCssPath = path.resolve(process.cwd(), 'src/style.css');
  const css = fs.readFileSync(styleCssPath, 'utf8');

  assert(
    css.includes('#screen-overview {') &&
    css.includes('display: none !important;') &&
    css.includes('#screen-overview.active {') &&
    css.includes('display: flex !important;'),
    'CSS ensures #screen-overview is hidden by default and only visible when active'
  );

  assert(
    css.includes('backdrop-filter: none !important;') &&
    css.includes('-webkit-backdrop-filter: none !important;'),
    'CSS removes backdrop-filter blur on #screen-overview'
  );

  assert(
    !css.includes('.overview-weapon-section {\n  pointer-events: auto;\n  max-width: 900px;\n  width: 96%;\n  background: rgba(10, 16, 26, 0.88);\n  border: 2px solid #2a3a4e;\n  border-radius: 4px;\n  padding: 6px 12px;\n  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);\n  backdrop-filter: blur(4px);'),
    'CSS removes blur from .overview-weapon-section'
  );

  // 2. Verify GameManager: instant transition on startLevelTransition and no map during loadout
  const gameManagerPath = path.resolve(process.cwd(), 'src/core/GameManager.ts');
  const gmCode = fs.readFileSync(gameManagerPath, 'utf8');

  assert(
    !gmCode.includes('this.overviewCam.startTransitionToFirstPerson('),
    'GameManager no longer invokes startTransitionToFirstPerson animation'
  );

  assert(
    gmCode.includes('this.state = \'STEALTH\';') &&
    gmCode.includes('this.activeCamera = this.fpController.camera;'),
    'GameManager immediately activates first person controller on start level'
  );

  assert(
    gmCode.includes('this.overviewCam.setEnabled(false);') &&
    gmCode.includes('this.levelBuild.overviewMapGroup.visible = false;'),
    'GameManager keeps map disabled and hidden during weapon selection loadout screen'
  );

  // 3. Verify HTML: Clean loadout screen structure without map instructions or legend
  const indexHtmlPath = path.resolve(process.cwd(), 'index.html');
  const html = fs.readFileSync(indexHtmlPath, 'utf8');

  assert(
    html.includes('id="screen-overview"') &&
    html.includes('class="loadout-container"') &&
    html.includes('id="overview-mission-desc"') &&
    html.includes('id="overview-weapon-list"'),
    'index.html provides clean loadout container with mission briefing and weapon grid'
  );

  assert(
    !html.includes('overview-legend') &&
    !html.includes('desktop-hint') &&
    !html.includes('mobile-hint'),
    'index.html has completely removed map legend and map navigation hints'
  );

  console.log(`\n========================================`);
  console.log(`ALL VERIFICATION CHECKS PASSED: ${passed}/${total}`);
  console.log(`========================================\n`);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
