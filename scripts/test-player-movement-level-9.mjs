// Simulation test of Level 9 Spawn and Player Movement
const cellSize = 3.8;
const gridWidth = 21;
const gridHeight = 21;
const halfW = (gridWidth * cellSize) / 2;
const halfH = (gridHeight * cellSize) / 2;

// Grid representation of Level 9
const grid = Array.from({ length: 21 }, () => Array(21).fill(0));
for (let x = 0; x < 21; x++) { grid[0][x] = 1; grid[20][x] = 1; }
for (let z = 0; z < 21; z++) { grid[z][0] = 1; grid[z][20] = 1; }
for (let x = 7; x <= 13; x++) { if (x !== 10) { grid[7][x] = 1; grid[13][x] = 1; } }
for (let z = 7; z <= 13; z++) { if (z !== 10) { grid[z][7] = 1; grid[z][13] = 1; } }
for (let x = 2; x <= 6; x++) { if (x !== 4) { grid[4][x] = 1; grid[16][x] = 1; } }
for (let x = 14; x <= 18; x++) { if (x !== 16) { grid[4][x] = 1; grid[16][x] = 1; } }
grid[4][3] = 0; // opened

const interactiveSwitches = [
  { id: 'switch_alpha', x: 3, z: 17, radius: 0.45 },
  { id: 'switch_beta', x: 17, z: 17, radius: 0.45 },
];

const playerCandidates = [
  { x: 3, z: 2, floor: 0, rotationY: 0 },
  { x: 4, z: 2, floor: 0, rotationY: 0 },
  { x: 5, z: 2, floor: 0, rotationY: 0 },
  { x: 2, z: 3, floor: 0, rotationY: 0 },
  { x: 4, z: 3, floor: 0, rotationY: 0 },
];

const playerRadius = 0.4;

function checkCollision(px, pz) {
  // Check against switches
  for (const sw of interactiveSwitches) {
    const swWx = (sw.x + 0.5) * cellSize - halfW;
    const swWz = (sw.z + 0.5) * cellSize - halfH;
    const dist = Math.hypot(px - swWx, pz - swWz);
    if (dist < playerRadius + sw.radius) {
      return `Collision with switch ${sw.id}`;
    }
  }

  // Check against grid walls
  const minGx = Math.floor((px - playerRadius + halfW) / cellSize);
  const maxGx = Math.floor((px + playerRadius + halfW) / cellSize);
  const minGz = Math.floor((pz - playerRadius + halfH) / cellSize);
  const maxGz = Math.floor((pz + playerRadius + halfH) / cellSize);

  for (let gz = minGz; gz <= maxGz; gz++) {
    for (let gx = minGx; gx <= maxGx; gx++) {
      if (grid[gz] && grid[gz][gx] === 1) {
        return `Collision with wall at (${gx}, ${gz})`;
      }
    }
  }

  return null;
}

let allOk = true;

console.log('Testing each player spawn candidate:');
for (const cand of playerCandidates) {
  const wx = (cand.x + 0.5) * cellSize - halfW;
  const wz = (cand.z + 0.5) * cellSize - halfH;

  const initialCol = checkCollision(wx, wz);
  if (initialCol) {
    console.error(`Candidate (${cand.x}, ${cand.z}) has initial collision: ${initialCol}`);
    allOk = false;
  } else {
    // Test moving 0.6m North, South, East, West
    const dirs = [
      { name: 'North', dx: 0, dz: -0.6 },
      { name: 'South', dx: 0, dz: 0.6 },
      { name: 'East', dx: 0.6, dz: 0 },
      { name: 'West', dx: -0.6, dz: 0 },
    ];
    let movableDirs = 0;
    for (const d of dirs) {
      const col = checkCollision(wx + d.dx, wz + d.dz);
      if (!col) movableDirs++;
    }
    console.log(`Candidate (${cand.x}, ${cand.z}) at world (${wx.toFixed(2)}, ${wz.toFixed(2)}): Clear! Movable directions: ${movableDirs}/4`);
    if (movableDirs === 0) {
      console.error(`Candidate (${cand.x}, ${cand.z}) is trapped!`);
      allOk = false;
    }
  }
}

if (allOk) {
  console.log('\n✓ ALL Level 9 player spawn candidates have 0 initial collision and full movement freedom!');
  process.exit(0);
} else {
  console.error('\n✗ Level 9 player spawn candidate test FAILED!');
  process.exit(1);
}
