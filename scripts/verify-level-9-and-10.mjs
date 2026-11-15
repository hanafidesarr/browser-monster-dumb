import fs from 'fs';
import path from 'path';

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    passed++;
    console.log(`  ✓ PASS: ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message}`);
  }
}

console.log('=== VERIFYING LEVEL 9 SPAWN & CLEARANCE ===');

// Check Level 9 configuration in LevelData.ts
const levelDataContent = fs.readFileSync('src/level/LevelData.ts', 'utf-8');
const spawnManagerContent = fs.readFileSync('src/level/SpawnManager.ts', 'utf-8');
const textureGenContent = fs.readFileSync('src/level/TextureGenerator.ts', 'utf-8');
const labyrinthBuilderContent = fs.readFileSync('src/level/LabyrinthBuilder.ts', 'utf-8');

// 1. Level 9 Grid check: g[4][3] === 0
assert(
  levelDataContent.includes('g[4][3] = 0;'),
  'Level 9 corridor at (3, 4) is opened (g[4][3] = 0) so player at (3,2)/(3,3) has open southward navigation'
);

// 2. Level 9 SpawnManager playerCandidates must not include (3, 17)
const level9ConfigBlock = spawnManagerContent.match(/\[9,\s*\{[\s\S]*?\}\],/);
assert(level9ConfigBlock !== null, 'Level 9 spawn config block found');

if (level9ConfigBlock) {
  const blockText = level9ConfigBlock[0];
  assert(
    !blockText.includes('{ x: 3, z: 17'),
    'Level 9 playerCandidates no longer contains (3, 17) (which coincided with Switch Terminal Alpha)'
  );
  assert(
    !blockText.includes('{ x: 17, z: 17'),
    'Level 9 playerCandidates does not contain (17, 17) (Switch Terminal Beta)'
  );
  assert(
    blockText.includes('{ x: 3, z: 2, floor: 0'),
    'Level 9 playerCandidates includes safe open Floor 0 cell (3, 2)'
  );
  assert(
    blockText.includes('{ x: 4, z: 2, floor: 0'),
    'Level 9 playerCandidates includes safe open Floor 0 cell (4, 2)'
  );
}

// 3. SpawnManager.isValidPosition must check level.interactiveSwitches and grid walls
assert(
  spawnManagerContent.includes('level.interactiveSwitches') &&
  spawnManagerContent.includes('distSq < (cellSize * 1.5) ** 2'),
  'SpawnManager.isValidPosition checks clearance from interactive switches'
);

assert(
  spawnManagerContent.includes('level.grid[cellZ][cellX] === 1'),
  'SpawnManager.isValidPosition validates that entity is not inside a grid wall'
);

// 4. LabyrinthBuilder props do not spawn near switches or player spawn
assert(
  labyrinthBuilderContent.includes('isNearSwitch') &&
  labyrinthBuilderContent.includes('!isNearSwitch(gx, gz)'),
  'LabyrinthBuilder prevents props from spawning within 2 cells of interactive switches'
);

assert(
  labyrinthBuilderContent.includes('Math.abs(gx - level.playerSpawn.x) <= 2') &&
  labyrinthBuilderContent.includes('Math.abs(gx - pCellX) <= 2'),
  'LabyrinthBuilder ensures 2-cell buffer around player spawn to prevent blocking props'
);

console.log('\n=== VERIFYING LEVEL 10 TEXTURES & LIGHTING ===');

// 5. Level 10 Wall Texture base color and luminance
assert(
  textureGenContent.includes("ctx.fillStyle = '#4e404a'"),
  'Level 10 wall texture uses medium-dark slate (#4e404a, luminance ~72) instead of pitch-black (#100609)'
);

// Check that old black colors are not present
assert(
  !textureGenContent.includes("ctx.fillStyle = '#100609'"),
  'Pitch-black wall base (#100609) has been removed'
);

assert(
  !textureGenContent.includes("ctx.fillStyle = '#0a060a'"),
  'Pitch-black floor base (#0a060a) has been removed'
);

// 6. Level 10 Floor Texture base color
assert(
  textureGenContent.includes("ctx.fillStyle = '#463a42'"),
  'Level 10 floor texture uses medium-dark obsidian stone (#463a42, luminance ~64) instead of pitch-black'
);

// 7. Level 10 2x2 spacious slab grid
assert(
  textureGenContent.includes("ctx.strokeRect(2, 2, 59, 59)") &&
  textureGenContent.includes("ctx.strokeRect(66, 66, 59, 59)"),
  'Level 10 floor texture features large 2x2 spacious slabs with distinct bevels'
);

// 8. Level 10 Lighting in LabyrinthBuilder
assert(
  labyrinthBuilderContent.includes('ambientHex = 0x54424a') &&
  labyrinthBuilderContent.includes('lightHex = 0xffdbe0') &&
  labyrinthBuilderContent.includes('lightIntensity = 2.0'),
  'Level 10 lighting has ambientHex=0x54424a, lightHex=0xffdbe0, lightIntensity=2.0 for clear visibility'
);

console.log(`\n========================================`);
console.log(`TOTAL TESTS: ${total} | PASSED: ${passed} | FAILED: ${total - passed}`);
console.log(`========================================`);

if (passed === total) {
  process.exit(0);
} else {
  process.exit(1);
}
