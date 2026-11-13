import { WeaponId } from '../weapon/WeaponData.ts';

export type MonsterType = 'pocong' | 'kunti';

export type LevelTheme =
  | 'banana_garden'
  | 'school'
  | 'labyrinth'
  | 'hospital'
  | 'sewer'
  | 'factory'
  | 'hotel'
  | 'subway'
  | 'research_facility'
  | 'nightmare';

export interface WeaponPickupLocation {
  weaponId: WeaponId;
  x: number; // grid coordinate X
  z: number; // grid coordinate Z
}

export interface InteractiveSwitchLocation {
  id: string;
  x: number;
  z: number;
  name: string;
}

export interface FloorRamp {
  fromFloor: number;
  toFloor: number;
  startCell: { x: number; z: number };
  endCell: { x: number; z: number };
  isStair?: boolean;
}

export interface WoodenBridge {
  id: string;
  floor: number;
  startCell: { x: number; z: number };
  endCell: { x: number; z: number };
  type: 'stable' | 'unstable' | 'broken';
}

export interface LevelDefinition {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  difficultyRating: number; // 1 to 10
  theme: LevelTheme;
  gridWidth: number;
  gridHeight: number;
  cellSize: number; // in world units (e.g. 3.8)
  wallHeight: number;
  grid: number[][]; // 1 = Wall/Boundary, 0 = Open corridor
  playerSpawn: { x: number; z: number; rotationY: number };
  monsterSpawn: { x: number; z: number; rotationY: number };
  exitDoor: { x: number; z: number; normal: { x: number; z: number } };
  weaponPickups?: WeaponPickupLocation[];
  interactiveSwitches?: InteractiveSwitchLocation[]; // Special objective for Level 9
  exitLockedInitially?: boolean; // Level 9 requires switches before exit opens
  floorCount?: number;          // Multi-floor: 1 up to 10 floors
  floorHeight?: number;         // Height separation between floors
  monsterCount?: number;        // Total monsters for this level (Part 3.6)
  monsterType?: MonsterType;    // Level monster archetype ('pocong' or 'kunti')
  ramps?: FloorRamp[];          // Stairs / Ramps connecting floors
  bridges?: WoodenBridge[];     // Wooden bridges across gaps
  monsterConfig: {
    detectionFovDeg: number;       // total FOV in degrees
    detectionDistance: number;     // max stealth sight distance
    reactionDelaySeconds: number;  // grace period before instant detection
    rearAttackAngleDeg: number;    // rear cone in degrees
    attackDistance: number;        // distance to hit
    chaseSpeed: number;            // monster chase speed
    catchDistance: number;         // distance to catch player
  };
  playerConfig: {
    walkSpeed: number;
    sprintSpeed: number;
  };
}

function create21x21Grid(builderFn: (g: number[][]) => void): number[][] {
  const g = Array.from({ length: 21 }, () => Array(21).fill(0));
  for (let z = 0; z < 21; z++) {
    for (let x = 0; x < 21; x++) {
      if (x === 0 || x === 20 || z === 0 || z === 20) {
        g[z][x] = 1;
      }
    }
  }
  builderFn(g);
  return g;
}

// 1. LEVEL 1: HAUNTED BANANA GARDEN (Open plantation, organic trees placed dynamically)
const LEVEL_1_GRID = create21x21Grid(() => {});

// 2. LEVEL 2: ABANDONED SCHOOL (Classrooms, hallways, desks, lockers)
const LEVEL_2_GRID = create21x21Grid((g) => {
  for (let x = 1; x < 20; x++) {
    if (x !== 3 && x !== 8 && x !== 13 && x !== 17) {
      g[6][x] = 1;
      g[14][x] = 1;
    }
  }
  for (let z = 1; z < 6; z++) {
    g[z][5] = 1; g[z][11] = 1; g[z][16] = 1;
  }
  for (let z = 15; z < 20; z++) {
    g[z][5] = 1; g[z][11] = 1; g[z][16] = 1;
  }
});

// 3. LEVEL 3: THE LABYRINTH (Brutalist concrete maze with intricate tight turns)
const LEVEL_3_GRID = create21x21Grid((g) => {
  for (let z = 3; z <= 17; z += 3) {
    for (let x = 2; x <= 18; x++) {
      if ((x + z) % 4 !== 0) {
        g[z][x] = 1;
      }
    }
  }
  for (let x = 1; x < 20; x++) g[10][x] = 0;
  for (let z = 1; z < 20; z++) g[z][10] = 0;
});

// 4. LEVEL 4: THE HOSPITAL (Wards, corridors, nurse station, patient beds)
const LEVEL_4_GRID = create21x21Grid((g) => {
  for (let z = 2; z <= 8; z++) {
    for (let x = 2; x <= 8; x++) {
      if (z === 5 && x !== 5) g[z][x] = 1;
      if (x === 5 && z !== 5) g[z][x] = 1;
    }
    for (let x = 12; x <= 18; x++) {
      if (z === 5 && x !== 15) g[z][x] = 1;
      if (x === 15 && z !== 5) g[z][x] = 1;
    }
  }
  for (let z = 12; z <= 18; z++) {
    for (let x = 2; x <= 8; x++) {
      if (z === 15 && x !== 5) g[z][x] = 1;
      if (x === 5 && z !== 15) g[z][x] = 1;
    }
    for (let x = 12; x <= 18; x++) {
      if (z === 15 && x !== 15) g[z][x] = 1;
      if (x === 15 && z !== 15) g[z][x] = 1;
    }
  }
});

// 5. LEVEL 5: THE SEWER (Underground water tunnels, cross bridges, drainage)
const LEVEL_5_GRID = create21x21Grid((g) => {
  for (let x = 2; x <= 18; x++) {
    if (x !== 5 && x !== 10 && x !== 15) {
      g[7][x] = 1;
      g[13][x] = 1;
    }
  }
  for (let z = 2; z <= 18; z++) {
    if (z !== 5 && z !== 10 && z !== 15) {
      g[z][7] = 1;
      g[z][13] = 1;
    }
  }
});

// 6. LEVEL 6: THE FACTORY (Machinery blocks, conveyor barriers, cargo crates)
const LEVEL_6_GRID = create21x21Grid((g) => {
  for (let z = 3; z <= 6; z++) {
    for (let x = 3; x <= 7; x++) g[z][x] = 1;
    for (let x = 13; x <= 17; x++) g[z][x] = 1;
  }
  for (let z = 14; z <= 17; z++) {
    for (let x = 3; x <= 7; x++) g[z][x] = 1;
    for (let x = 13; x <= 17; x++) g[z][x] = 1;
  }
});

// 7. LEVEL 7: THE HOTEL (Lobby, wing corridors, guest suites)
const LEVEL_7_GRID = create21x21Grid((g) => {
  for (let x = 1; x < 20; x++) {
    if (x !== 3 && x !== 10 && x !== 17) {
      g[7][x] = 1;
      g[13][x] = 1;
    }
  }
  for (let z = 1; z < 7; z++) {
    g[z][6] = 1; g[z][14] = 1;
  }
  for (let z = 14; z < 20; z++) {
    g[z][6] = 1; g[z][14] = 1;
  }
});

// 8. LEVEL 8: THE SUBWAY (Platforms, railway track trough, turnstiles)
const LEVEL_8_GRID = create21x21Grid((g) => {
  for (let x = 2; x <= 18; x++) {
    if (x !== 4 && x !== 10 && x !== 16) {
      g[8][x] = 1;
      g[12][x] = 1;
    }
  }
  for (let x = 3; x <= 17; x += 4) {
    g[4][x] = 1;
    g[16][x] = 1;
  }
});

// 9. LEVEL 9: RESEARCH FACILITY (Quarantine core, security chambers, switch rooms)
const LEVEL_9_GRID = create21x21Grid((g) => {
  for (let x = 7; x <= 13; x++) {
    if (x !== 10) { g[7][x] = 1; g[13][x] = 1; }
  }
  for (let z = 7; z <= 13; z++) {
    if (z !== 10) { g[z][7] = 1; g[z][13] = 1; }
  }
  for (let x = 2; x <= 6; x++) { if (x !== 4) { g[4][x] = 1; g[16][x] = 1; } }
  for (let x = 14; x <= 18; x++) { if (x !== 16) { g[4][x] = 1; g[16][x] = 1; } }
});

// 10. LEVEL 10: THE NIGHTMARE (Climax surreal abyss maze)
const LEVEL_10_GRID = create21x21Grid((g) => {
  for (let z = 2; z <= 18; z += 4) {
    for (let x = 2; x <= 18; x += 2) {
      if ((x + z) % 3 !== 0) g[z][x] = 1;
    }
  }
  for (let z = 1; z < 20; z++) {
    if (z % 2 === 0) g[z][10] = 0;
  }
  for (let x = 1; x < 20; x++) {
    if (x % 2 === 0) g[10][x] = 0;
  }
  for (let z = 1; z <= 3; z++) {
    for (let x = 1; x <= 3; x++) g[z][x] = 0;
    for (let x = 17; x <= 19; x++) g[z][x] = 0;
  }
  for (let z = 9; z <= 11; z++) {
    for (let x = 9; x <= 11; x++) g[z][x] = 0;
  }
  for (let z = 17; z <= 19; z++) {
    for (let x = 17; x <= 19; x++) g[z][x] = 0;
  }
});

// 10 Distinct Levels with Unique Visual Identity & Progressive Challenge
export const ALL_LEVELS: LevelDefinition[] = [
  // LEVEL 1: HAUNTED BANANA GARDEN
  {
    id: 1,
    title: 'KEBUN PISANG ANGKER',
    subtitle: 'HAUNTED BANANA GARDEN — SECTOR 01',
    description: 'Hutan pohon pisang sangat luas. Temukan Pocong, pukul tubuhnya dengan senjata komedi, lalu lari menuju gerbang keluar!',
    difficultyRating: 1,
    theme: 'banana_garden',
    gridWidth: 21,
    gridHeight: 21,
    cellSize: 3.8,
    wallHeight: 7.2,
    grid: LEVEL_1_GRID,
    playerSpawn: { x: 3, z: 3, rotationY: 0 },
    monsterSpawn: { x: 6, z: 6, rotationY: 0 },
    exitDoor: { x: 18, z: 18, normal: { x: 0, z: -1 } },
    floorCount: 1,
    floorHeight: 0,
    monsterCount: 1,
    weaponPickups: [
      { weaponId: 'signboard', x: 16, z: 4 },
      { weaponId: 'slipper', x: 4, z: 16 },
    ],
    monsterConfig: {
      detectionFovDeg: 90,
      detectionDistance: 9.0,
      reactionDelaySeconds: 0.85,
      rearAttackAngleDeg: 200,
      attackDistance: 2.4,
      chaseSpeed: 5.10, // 85% of player sprint (6.0)
      catchDistance: 1.6,
    },
    playerConfig: {
      walkSpeed: 3.8,
      sprintSpeed: 6.0,
    },
  },

  // LEVEL 2: ABANDONED SCHOOL (2 FLOORS)
  {
    id: 2,
    title: 'THE ABANDONED SCHOOL',
    subtitle: 'SECTOR 02 — DESERTED HALLWAYS (2 FLOORS)',
    description: 'Sekolah tua berdebu 2 lantai dengan tangga dan jembatan mezanin. Carilah Wajan Penggorengan untuk memukul Kuntilanak!',
    difficultyRating: 2,
    theme: 'school',
    monsterType: 'kunti',
    gridWidth: 21,
    gridHeight: 21,
    cellSize: 3.8,
    wallHeight: 4.8,
    grid: LEVEL_2_GRID,
    playerSpawn: { x: 3, z: 3, rotationY: 0 },
    monsterSpawn: { x: 4, z: 2, rotationY: 0 },
    exitDoor: { x: 18, z: 18, normal: { x: 0, z: -1 } },
    floorCount: 2,
    floorHeight: 3.8,
    monsterCount: 1,
    ramps: [
      { fromFloor: 0, toFloor: 1, startCell: { x: 7, z: 9 }, endCell: { x: 9, z: 9 }, isStair: true },
    ],
    bridges: [
      { id: 'l2_bridge', floor: 1, startCell: { x: 12, z: 9 }, endCell: { x: 15, z: 9 }, type: 'stable' },
    ],
    weaponPickups: [
      { weaponId: 'frying_pan', x: 17, z: 3 },
    ],
    monsterConfig: {
      detectionFovDeg: 90,
      detectionDistance: 9.5,
      reactionDelaySeconds: 0.80,
      rearAttackAngleDeg: 195,
      attackDistance: 2.4,
      chaseSpeed: 5.16, // 86% of player sprint (6.0)
      catchDistance: 1.6,
    },
    playerConfig: { walkSpeed: 3.8, sprintSpeed: 6.0 },
  },

  // LEVEL 3: THE LABYRINTH (2 FLOORS)
  {
    id: 3,
    title: 'THE LABYRINTH',
    subtitle: 'SECTOR 03 — CONCRETE UNDERGROUND (2 FLOORS)',
    description: 'Labirin beton 2 tingkat dengan jembatan kayu goyang (Unstable Bridge). Ada Kursi Kayu tergeletak di lorong!',
    difficultyRating: 3,
    theme: 'labyrinth',
    gridWidth: 21,
    gridHeight: 21,
    cellSize: 3.8,
    wallHeight: 5.0,
    grid: LEVEL_3_GRID,
    playerSpawn: { x: 2, z: 2, rotationY: 0 },
    monsterSpawn: { x: 6, z: 2, rotationY: 0 },
    exitDoor: { x: 18, z: 18, normal: { x: 0, z: -1 } },
    floorCount: 2,
    floorHeight: 3.8,
    monsterCount: 1,
    ramps: [
      { fromFloor: 0, toFloor: 1, startCell: { x: 9, z: 10 }, endCell: { x: 11, z: 10 }, isStair: true },
    ],
    bridges: [
      { id: 'l3_bridge', floor: 1, startCell: { x: 13, z: 10 }, endCell: { x: 16, z: 10 }, type: 'unstable' },
    ],
    weaponPickups: [
      { weaponId: 'chair', x: 4, z: 16 },
    ],
    monsterConfig: {
      detectionFovDeg: 90,
      detectionDistance: 10.0,
      reactionDelaySeconds: 0.75,
      rearAttackAngleDeg: 190,
      attackDistance: 2.4,
      chaseSpeed: 5.22, // 87% of player sprint (6.0)
      catchDistance: 1.6,
    },
    playerConfig: { walkSpeed: 3.8, sprintSpeed: 6.0 },
  },

  // LEVEL 4: THE HOSPITAL (3 FLOORS)
  {
    id: 4,
    title: 'THE HOSPITAL',
    subtitle: 'SECTOR 04 — STERILE CORRIDORS (3 FLOORS)',
    description: 'Bangsal rumah sakit 3 lantai dengan ranjang berkarat dan jembatan goyang. Temukan Sapu Ijuk legendaris di ruang cleaning!',
    difficultyRating: 4,
    theme: 'hospital',
    gridWidth: 21,
    gridHeight: 21,
    cellSize: 3.8,
    wallHeight: 4.8,
    grid: LEVEL_4_GRID,
    playerSpawn: { x: 3, z: 3, rotationY: 0 },
    monsterSpawn: { x: 4, z: 4, rotationY: 0 },
    exitDoor: { x: 18, z: 18, normal: { x: 0, z: -1 } },
    floorCount: 3,
    floorHeight: 3.8,
    monsterCount: 2,
    ramps: [
      { fromFloor: 0, toFloor: 1, startCell: { x: 10, z: 7 }, endCell: { x: 10, z: 9 }, isStair: true },
      { fromFloor: 1, toFloor: 2, startCell: { x: 10, z: 11 }, endCell: { x: 10, z: 13 }, isStair: true },
    ],
    bridges: [
      { id: 'l4_bridge', floor: 1, startCell: { x: 6, z: 10 }, endCell: { x: 9, z: 10 }, type: 'unstable' },
    ],
    weaponPickups: [
      { weaponId: 'broom', x: 16, z: 3 },
    ],
    monsterConfig: {
      detectionFovDeg: 92,
      detectionDistance: 10.5,
      reactionDelaySeconds: 0.70,
      rearAttackAngleDeg: 185,
      attackDistance: 2.4,
      chaseSpeed: 5.28, // 88% of player sprint (6.0)
      catchDistance: 1.6,
    },
    playerConfig: { walkSpeed: 3.8, sprintSpeed: 6.0 },
  },

  // LEVEL 5: THE SEWER (2 FLOORS)
  {
    id: 5,
    title: 'THE SEWER',
    subtitle: 'SECTOR 05 — DRAINAGE DEPOT (2 FLOORS)',
    description: 'Saluran pembuangan 2 tingkat dengan jembatan kayu retak patah (Broken Bridge)! Hati-hati jangan jatuh ke jurang limbah!',
    difficultyRating: 5,
    theme: 'sewer',
    gridWidth: 21,
    gridHeight: 21,
    cellSize: 3.8,
    wallHeight: 4.8,
    grid: LEVEL_5_GRID,
    playerSpawn: { x: 3, z: 3, rotationY: 0 },
    monsterSpawn: { x: 4, z: 4, rotationY: 0 },
    exitDoor: { x: 18, z: 18, normal: { x: 0, z: -1 } },
    floorCount: 2,
    floorHeight: 3.8,
    monsterCount: 2,
    ramps: [
      { fromFloor: 0, toFloor: 1, startCell: { x: 8, z: 10 }, endCell: { x: 10, z: 10 }, isStair: true },
    ],
    bridges: [
      { id: 'l5_bridge_1', floor: 1, startCell: { x: 9, z: 5 }, endCell: { x: 12, z: 5 }, type: 'unstable' },
      { id: 'l5_bridge_2', floor: 1, startCell: { x: 9, z: 15 }, endCell: { x: 12, z: 15 }, type: 'broken' },
    ],
    weaponPickups: [
      { weaponId: 'spatula', x: 3, z: 17 },
    ],
    monsterConfig: {
      detectionFovDeg: 92,
      detectionDistance: 11.0,
      reactionDelaySeconds: 0.65,
      rearAttackAngleDeg: 180,
      attackDistance: 2.4,
      chaseSpeed: 5.34, // 89% of player sprint (6.0)
      catchDistance: 1.6,
    },
    playerConfig: { walkSpeed: 3.8, sprintSpeed: 6.0 },
  },

  // LEVEL 6: THE FACTORY (3 FLOORS)
  {
    id: 6,
    title: 'THE FACTORY',
    subtitle: 'SECTOR 06 — INDUSTRIAL ENGINE (3 FLOORS)',
    description: 'Pabrik industri 3 tingkat dengan catwalk jembatan kayu kokoh. Palu Mainan berdecit menunggu di atas meja kerja!',
    difficultyRating: 6,
    theme: 'factory',
    gridWidth: 21,
    gridHeight: 21,
    cellSize: 3.8,
    wallHeight: 5.2,
    grid: LEVEL_6_GRID,
    playerSpawn: { x: 2, z: 2, rotationY: 0 },
    monsterSpawn: { x: 4, z: 2, rotationY: 0 },
    exitDoor: { x: 18, z: 18, normal: { x: 0, z: -1 } },
    floorCount: 3,
    floorHeight: 3.8,
    monsterCount: 3,
    ramps: [
      { fromFloor: 0, toFloor: 1, startCell: { x: 8, z: 8 }, endCell: { x: 10, z: 8 }, isStair: true },
      { fromFloor: 1, toFloor: 2, startCell: { x: 10, z: 12 }, endCell: { x: 10, z: 14 }, isStair: true },
    ],
    bridges: [
      { id: 'l6_bridge', floor: 1, startCell: { x: 9, z: 13 }, endCell: { x: 9, z: 16 }, type: 'stable' },
    ],
    weaponPickups: [
      { weaponId: 'toy_hammer', x: 18, z: 2 },
    ],
    monsterConfig: {
      detectionFovDeg: 94,
      detectionDistance: 11.5,
      reactionDelaySeconds: 0.60,
      rearAttackAngleDeg: 175,
      attackDistance: 2.4,
      chaseSpeed: 5.46, // 91% of player sprint (6.0)
      catchDistance: 1.6,
    },
    playerConfig: { walkSpeed: 3.8, sprintSpeed: 6.0 },
  },

  // LEVEL 7: THE HOTEL (5 FLOORS)
  {
    id: 7,
    title: 'THE HOTEL',
    subtitle: 'SECTOR 07 — VINTAGE LOBBY (5 FLOORS)',
    description: 'Hotel vintage megah 5 tingkat dengan tangga melingkar, jembatan goyang, dan lantai runtuh. Ambil Kipas Angin untuk memukul Pocong!',
    difficultyRating: 7,
    theme: 'hotel',
    gridWidth: 21,
    gridHeight: 21,
    cellSize: 3.8,
    wallHeight: 4.8,
    grid: LEVEL_7_GRID,
    playerSpawn: { x: 3, z: 3, rotationY: 0 },
    monsterSpawn: { x: 4, z: 2, rotationY: 0 },
    exitDoor: { x: 18, z: 18, normal: { x: 0, z: -1 } },
    floorCount: 5,
    floorHeight: 3.4,
    monsterCount: 3,
    ramps: [
      { fromFloor: 0, toFloor: 1, startCell: { x: 7, z: 8 }, endCell: { x: 9, z: 8 }, isStair: true },
      { fromFloor: 1, toFloor: 2, startCell: { x: 11, z: 8 }, endCell: { x: 13, z: 8 }, isStair: true },
      { fromFloor: 2, toFloor: 3, startCell: { x: 10, z: 11 }, endCell: { x: 10, z: 13 }, isStair: true },
      { fromFloor: 3, toFloor: 4, startCell: { x: 8, z: 12 }, endCell: { x: 10, z: 12 }, isStair: true },
    ],
    bridges: [
      { id: 'l7_bridge_1', floor: 2, startCell: { x: 7, z: 5 }, endCell: { x: 10, z: 5 }, type: 'unstable' },
      { id: 'l7_bridge_2', floor: 3, startCell: { x: 10, z: 15 }, endCell: { x: 13, z: 15 }, type: 'broken' },
    ],
    weaponPickups: [
      { weaponId: 'electric_fan', x: 3, z: 17 },
    ],
    monsterConfig: {
      detectionFovDeg: 94,
      detectionDistance: 12.0,
      reactionDelaySeconds: 0.55,
      rearAttackAngleDeg: 170,
      attackDistance: 2.4,
      chaseSpeed: 5.52, // 92% of player sprint (6.0)
      catchDistance: 1.6,
    },
    playerConfig: { walkSpeed: 3.8, sprintSpeed: 6.0 },
  },

  // LEVEL 8: THE SUBWAY (3 FLOORS)
  {
    id: 8,
    title: 'THE SUBWAY',
    subtitle: 'SECTOR 08 — UNDERGROUND RAILS (3 FLOORS)',
    description: 'Stasiun metro 3 lantai bawah tanah dengan tangga rel, jembatan kayu melintasi ceruk rel, dan bahaya jatuh!',
    difficultyRating: 8,
    theme: 'subway',
    gridWidth: 21,
    gridHeight: 21,
    cellSize: 3.8,
    wallHeight: 5.0,
    grid: LEVEL_8_GRID,
    playerSpawn: { x: 2, z: 2, rotationY: 0 },
    monsterSpawn: { x: 4, z: 4, rotationY: 0 },
    exitDoor: { x: 18, z: 18, normal: { x: 0, z: -1 } },
    floorCount: 3,
    floorHeight: 3.8,
    monsterCount: 3,
    ramps: [
      { fromFloor: 0, toFloor: 1, startCell: { x: 6, z: 10 }, endCell: { x: 8, z: 10 }, isStair: true },
      { fromFloor: 1, toFloor: 2, startCell: { x: 12, z: 10 }, endCell: { x: 14, z: 10 }, isStair: true },
    ],
    bridges: [
      { id: 'l8_bridge_1', floor: 1, startCell: { x: 8, z: 6 }, endCell: { x: 11, z: 6 }, type: 'stable' },
      { id: 'l8_bridge_2', floor: 2, startCell: { x: 9, z: 14 }, endCell: { x: 12, z: 14 }, type: 'broken' },
    ],
    weaponPickups: [
      { weaponId: 'slipper', x: 18, z: 2 },
    ],
    monsterConfig: {
      detectionFovDeg: 96,
      detectionDistance: 12.5,
      reactionDelaySeconds: 0.50,
      rearAttackAngleDeg: 165,
      attackDistance: 2.4,
      chaseSpeed: 5.58, // 93% of player sprint (6.0)
      catchDistance: 1.6,
    },
    playerConfig: { walkSpeed: 3.8, sprintSpeed: 6.0 },
  },

  // LEVEL 9: RESEARCH FACILITY (5 FLOORS)
  {
    id: 9,
    title: 'RESEARCH FACILITY',
    subtitle: 'SECTOR 09 — QUARANTINE CORE (5 FLOORS)',
    description: 'Laboratorium sci-fi 5 lantai! Pintu keluar TERKUNCI! Aktifkan 2 terminal saklar di platform atas dan bawah sebelum melarikan diri!',
    difficultyRating: 9,
    theme: 'research_facility',
    gridWidth: 21,
    gridHeight: 21,
    cellSize: 3.8,
    wallHeight: 4.8,
    grid: LEVEL_9_GRID,
    playerSpawn: { x: 3, z: 3, rotationY: 0 },
    monsterSpawn: { x: 4, z: 4, rotationY: 0 },
    exitDoor: { x: 18, z: 18, normal: { x: 0, z: -1 } },
    exitLockedInitially: true,
    floorCount: 5,
    floorHeight: 3.6,
    monsterCount: 4,
    ramps: [
      { fromFloor: 0, toFloor: 1, startCell: { x: 8, z: 10 }, endCell: { x: 10, z: 10 }, isStair: true },
      { fromFloor: 1, toFloor: 2, startCell: { x: 10, z: 11 }, endCell: { x: 10, z: 13 }, isStair: true },
      { fromFloor: 2, toFloor: 3, startCell: { x: 10, z: 7 }, endCell: { x: 10, z: 9 }, isStair: true },
      { fromFloor: 3, toFloor: 4, startCell: { x: 11, z: 10 }, endCell: { x: 13, z: 10 }, isStair: true },
    ],
    bridges: [
      { id: 'l9_bridge_1', floor: 2, startCell: { x: 10, z: 4 }, endCell: { x: 10, z: 7 }, type: 'stable' },
      { id: 'l9_bridge_2', floor: 3, startCell: { x: 10, z: 13 }, endCell: { x: 10, z: 16 }, type: 'broken' },
    ],
    interactiveSwitches: [
      { id: 'switch_alpha', x: 3, z: 17, name: 'TERMINAL ALPHA' },
      { id: 'switch_beta', x: 17, z: 17, name: 'TERMINAL BETA' },
    ],
    weaponPickups: [
      { weaponId: 'signboard', x: 17, z: 3 },
    ],
    monsterConfig: {
      detectionFovDeg: 96,
      detectionDistance: 13.0,
      reactionDelaySeconds: 0.45,
      rearAttackAngleDeg: 160,
      attackDistance: 2.4,
      chaseSpeed: 5.64, // 94% of player sprint (6.0)
      catchDistance: 1.6,
    },
    playerConfig: { walkSpeed: 3.8, sprintSpeed: 6.0 },
  },

  // LEVEL 10: THE NIGHTMARE (10 FLOORS / TIERS INTO THE ABYSS)
  {
    id: 10,
    title: 'THE NIGHTMARE',
    subtitle: 'SECTOR 10 — 10 TIERS ABYSS RUN',
    description: 'Tantangan puncak 10 lantai melintasi jurang kehampaan! Pocong mengejar dengan 95% sprint maksimal. Navigasi jembatan dan jangan sampai jatuh ke jurang kegelapan!',
    difficultyRating: 10,
    theme: 'nightmare',
    gridWidth: 21,
    gridHeight: 21,
    cellSize: 3.8,
    wallHeight: 6.0,
    grid: LEVEL_10_GRID,
    playerSpawn: { x: 2, z: 2, rotationY: 0 },
    monsterSpawn: { x: 4, z: 4, rotationY: 0 },
    exitDoor: { x: 18, z: 18, normal: { x: 0, z: -1 } },
    floorCount: 10,
    floorHeight: 3.2,
    monsterCount: 4,
    ramps: [
      { fromFloor: 0, toFloor: 1, startCell: { x: 3, z: 6 }, endCell: { x: 5, z: 6 }, isStair: true },
      { fromFloor: 1, toFloor: 2, startCell: { x: 6, z: 6 }, endCell: { x: 8, z: 6 }, isStair: true },
      { fromFloor: 2, toFloor: 3, startCell: { x: 9, z: 6 }, endCell: { x: 11, z: 6 }, isStair: true },
      { fromFloor: 3, toFloor: 4, startCell: { x: 12, z: 6 }, endCell: { x: 14, z: 6 }, isStair: true },
      { fromFloor: 4, toFloor: 5, startCell: { x: 15, z: 6 }, endCell: { x: 17, z: 6 }, isStair: true },
      { fromFloor: 5, toFloor: 6, startCell: { x: 17, z: 9 }, endCell: { x: 17, z: 11 }, isStair: true },
      { fromFloor: 6, toFloor: 7, startCell: { x: 14, z: 14 }, endCell: { x: 12, z: 14 }, isStair: true },
      { fromFloor: 7, toFloor: 8, startCell: { x: 11, z: 14 }, endCell: { x: 9, z: 14 }, isStair: true },
      { fromFloor: 8, toFloor: 9, startCell: { x: 8, z: 14 }, endCell: { x: 6, z: 14 }, isStair: true },
    ],
    bridges: [
      { id: 'l10_bridge_1', floor: 3, startCell: { x: 6, z: 10 }, endCell: { x: 9, z: 10 }, type: 'stable' },
      { id: 'l10_bridge_2', floor: 6, startCell: { x: 11, z: 10 }, endCell: { x: 14, z: 10 }, type: 'unstable' },
      { id: 'l10_bridge_3', floor: 9, startCell: { x: 9, z: 17 }, endCell: { x: 12, z: 17 }, type: 'broken' },
    ],
    weaponPickups: [
      { weaponId: 'frying_pan', x: 18, z: 2 },
    ],
    monsterConfig: {
      detectionFovDeg: 98,
      detectionDistance: 13.5,
      reactionDelaySeconds: 0.40,
      rearAttackAngleDeg: 150,
      attackDistance: 2.4,
      chaseSpeed: 5.70, // 95% of player sprint (6.0)
      catchDistance: 1.6,
    },
    playerConfig: { walkSpeed: 3.8, sprintSpeed: 6.0 },
  },
];
