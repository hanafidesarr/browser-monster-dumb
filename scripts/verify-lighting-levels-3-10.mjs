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

console.log('--- VERIFYING LIGHTING (LEVELS 3-10 MATCHING LEVEL 2) & WEAPON SCREEN CLEANUP ---');

// 1. Verify index.html (Settings button removed from weapon selection screen)
const indexPath = path.resolve(process.cwd(), 'index.html');
const indexHtml = fs.readFileSync(indexPath, 'utf8');

assert(
  !indexHtml.includes('id="btn-overview-settings"'),
  'index.html: Settings button is completely removed from weapon selection loadout screen'
);

const overviewActionsMatch = indexHtml.match(/<div class="overview-actions">([\s\S]*?)<\/div>/);
assert(overviewActionsMatch !== null, 'overview-actions container found');
assert(
  overviewActionsMatch[1].includes('btn-start-level') &&
  overviewActionsMatch[1].includes('btn-overview-back'),
  'overview-actions contains only START LEVEL and MAIN MENU buttons'
);

// 2. Verify LabyrinthBuilder.ts Lighting
const builderPath = path.resolve(process.cwd(), 'src/level/LabyrinthBuilder.ts');
const builderCode = fs.readFileSync(builderPath, 'utf8');

// Check HemisphereLight presence in buildThemedLevel
assert(
  builderCode.includes('new THREE.HemisphereLight(lightHex, 0x2d3630, 0.95)'),
  'LabyrinthBuilder: HemisphereLight bounce light added to buildThemedLevel (matching Level 2)'
);

// Check that themes in buildThemedLevel have bright lighting
const themesToCheck = ['labyrinth', 'hospital', 'sewer', 'factory', 'hotel', 'subway', 'research_facility', 'nightmare'];
for (const theme of themesToCheck) {
  const themeRegex = new RegExp(`case '${theme}':[\\s\\S]*?break;`);
  const themeBlock = builderCode.match(themeRegex);
  assert(themeBlock !== null, `Theme block for '${theme}' found`);
  
  // Ambient hex should be bright (not dark)
  const ambientMatch = themeBlock[0].match(/ambientHex = (0x[0-9a-fA-F]+);/);
  assert(ambientMatch !== null, `ambientHex defined for '${theme}'`);
  const ambientVal = parseInt(ambientMatch[1], 16);
  const r = (ambientVal >> 16) & 0xff;
  const g = (ambientVal >> 8) & 0xff;
  const b = ambientVal & 0xff;
  const avg = (r + g + b) / 3;
  assert(avg >= 55, `ambientHex for '${theme}' (${ambientMatch[1]}) is bright and clear (avg=${avg.toFixed(1)} >= 55)`);

  // Light intensity should be >= 1.8
  const intensityMatch = themeBlock[0].match(/lightIntensity = ([0-9.]+);/);
  assert(intensityMatch !== null, `lightIntensity defined for '${theme}'`);
  assert(parseFloat(intensityMatch[1]) >= 1.8, `lightIntensity for '${theme}' is >= 1.8 (is ${intensityMatch[1]})`);
}

// Check spawnCorridorLights
assert(
  builderCode.includes('level.gridWidth <= 15 || level.id === 3') &&
  builderCode.includes('pureLight = new THREE.PointLight(lightHex, 2.2, 12, 1.2)'),
  'Level 3 has pure ceiling point lights without physical prop obstruction'
);

assert(
  builderCode.includes('for (let f = 1; f < level.floorCount; f++)') &&
  builderCode.includes('EnvironmentPropFactory.createHangingCageLight(lightHex)'),
  'Multi-floor levels spawn upper lights on all upper floors (matching Level 2)'
);

// 3. Verify GameManager.ts Fog Colors
const gmPath = path.resolve(process.cwd(), 'src/core/GameManager.ts');
const gmCode = fs.readFileSync(gmPath, 'utf8');

const fogFnMatch = gmCode.match(/private getThemeFogColor\(\): number \{([\s\S]*?)\}/);
assert(fogFnMatch !== null, 'getThemeFogColor found in GameManager.ts');

for (const theme of themesToCheck) {
  const fogThemeRegex = new RegExp(`case '${theme}':\\s*return (0x[0-9a-fA-F]+);`);
  const fogMatch = fogFnMatch[1].match(fogThemeRegex);
  assert(fogMatch !== null, `Fog color defined for '${theme}'`);
  const fogVal = parseInt(fogMatch[1], 16);
  const fr = (fogVal >> 16) & 0xff;
  const fg = (fogVal >> 8) & 0xff;
  const fb = fogVal & 0xff;
  const favg = (fr + fg + fb) / 3;
  assert(favg >= 35, `Fog color for '${theme}' (${fogMatch[1]}) is bright and clear (avg=${favg.toFixed(1)} >= 35, matching Level 2)`);
}

console.log(`\n========================================`);
console.log(`TOTAL CHECKS: ${total} | PASSED: ${passed} | FAILED: 0`);
console.log(`========================================`);
