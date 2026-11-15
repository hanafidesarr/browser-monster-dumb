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

console.log('--- VERIFYING LEVEL 3 LABYRINTH RESTORATION & CONSTRAINTS ---');

const levelDataPath = path.resolve(process.cwd(), 'src/level/LevelData.ts');
const levelDataCode = fs.readFileSync(levelDataPath, 'utf8');

const builderPath = path.resolve(process.cwd(), 'src/level/LabyrinthBuilder.ts');
const builderCode = fs.readFileSync(builderPath, 'utf8');

// 1. Grid Definition & Single-Floor Constraints
assert(
  levelDataCode.includes("id: 3") &&
  levelDataCode.includes("theme: 'labyrinth'") &&
  levelDataCode.includes("gridWidth: 15") &&
  levelDataCode.includes("gridHeight: 15"),
  'Level 3 is configured as 15x15 Labyrinth'
);

assert(
  levelDataCode.includes("floorCount: 1") &&
  levelDataCode.includes("floorHeight: 0"),
  'Level 3 is strictly 1 floor (no upper floors)'
);

// 2. No Ramps & No Bridges
assert(
  /id:\s*3[\s\S]*?ramps:\s*\[\s*\]/.test(levelDataCode),
  'Level 3 has zero ramps or stairs (ramps: [])'
);

assert(
  /id:\s*3[\s\S]*?bridges:\s*\[\s*\]/.test(levelDataCode),
  'Level 3 has zero bridges (bridges: [])'
);

// 3. Spawns Check
assert(
  /id:\s*3[\s\S]*?playerSpawn:\s*\{\s*x:\s*1,\s*z:\s*1/.test(levelDataCode),
  'Player spawns at (1, 1)'
);

assert(
  /id:\s*3[\s\S]*?monsterSpawn:\s*\{\s*x:\s*7,\s*z:\s*7/.test(levelDataCode),
  'Monster spawns at (7, 7)'
);

assert(
  /id:\s*3[\s\S]*?exitDoor:\s*\{\s*x:\s*13,\s*z:\s*13/.test(levelDataCode),
  'Exit door is placed at (13, 13)'
);

// 4. Zero Props in Level 3
assert(
  builderCode.includes("if (level.theme === 'labyrinth' || level.id === 3)") &&
  builderCode.includes("return;"),
  'LabyrinthBuilder explicitly bypasses prop spawning for theme labyrinth / level 3'
);

// 5. Grid Path Analysis: Only 1 Path ("Hanya 1 Jalan")
// Extract LEVEL_3_GRID array from code
const gridMatch = levelDataCode.match(/const LEVEL_3_GRID:\s*number\[\]\[\]\s*=\s*(\[[\s\S]*?\]);/);
assert(gridMatch !== null, 'LEVEL_3_GRID found in LevelData.ts');

const grid = eval(gridMatch[1]);
assert(grid.length === 15 && grid[0].length === 15, 'LEVEL_3_GRID is 15x15');
assert(grid[1][1] === 0, 'Player spawn (1,1) is open');
assert(grid[7][7] === 0, 'Monster spawn (7,7) is open');
assert(grid[13][13] === 0, 'Exit door (13,13) is open');

// DFS find all paths from (1,1) to (13,13)
const paths = [];
function dfs(x, z, visited, currentPath) {
  if (x === 13 && z === 13) {
    paths.push([...currentPath]);
    return;
  }
  const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
  for (const [dx, dz] of dirs) {
    const nx = x + dx;
    const nz = z + dz;
    if (nx >= 0 && nx < 15 && nz >= 0 && nz < 15 && grid[nz][nx] === 0) {
      const key = `${nx},${nz}`;
      if (!visited.has(key)) {
        visited.add(key);
        currentPath.push([nx, nz]);
        dfs(nx, nz, visited, currentPath);
        currentPath.pop();
        visited.delete(key);
      }
    }
  }
}

const vis = new Set(['1,1']);
dfs(1, 1, vis, [[1, 1]]);

assert(paths.length === 1, `Exactly 1 path exists from Start to Exit (found ${paths.length})`);

const mainPath = paths[0];
const monsterIndex = mainPath.findIndex(([x, z]) => x === 7 && z === 7);
assert(monsterIndex !== -1, 'The single path passes directly through monster at (7,7)');

// Check weapon pickup
const weaponMatch = levelDataCode.match(/id:\s*3[\s\S]*?weaponPickups:\s*\[[\s\S]*?\{\s*weaponId:\s*['"](\w+)['"],\s*x:\s*(\d+),\s*z:\s*(\d+)/);
assert(weaponMatch !== null, 'Weapon pickup configured for Level 3');
const wx = parseInt(weaponMatch[2]);
const wz = parseInt(weaponMatch[3]);
const weaponIndex = mainPath.findIndex(([x, z]) => x === wx && z === wz);
assert(weaponIndex !== -1, `Weapon at (${wx}, ${wz}) is along the main path`);
assert(weaponIndex < monsterIndex, `Weapon is encountered at step ${weaponIndex + 1}, before the monster at step ${monsterIndex + 1}`);

console.log(`\n========================================`);
console.log(`TOTAL CHECKS: ${total} | PASSED: ${passed} | FAILED: 0`);
console.log(`========================================`);
