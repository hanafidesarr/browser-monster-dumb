import { WeaponId } from '../weapon/WeaponData.ts';

export type MonsterType = 'pocong' | 'kunti';

export type LevelTheme =
  | 'banana_garden'
  | 'school'
  | 'labyrinth'
  | 'hospital'
  | 'cemetery'
  | 'bunker'
  | 'cavern'
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
  exitDoor: { x: number; z: number; normal: { x: number; z: number }; floor?: number };
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

// 3. LEVEL 3: THE LABYRINTH (Authentic dense multi-branch 2-floor concrete labyrinth with tricky dead-ends)
const LEVEL_3_GRID: number[][] = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1],
  [1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1],
  [1, 0, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1],
  [1, 0, 1, 0, 1, 1, 1, 0, 0, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1],
  [1, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
  [1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1],
  [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 1],
  [1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1],
  [1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1],
  [1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
  [1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

// 4. LEVEL 4: THE SACRED CEMETERY (Expansive outdoor 27x27 Indonesian cemetery & dense banyan grove)
const LEVEL_4_GRID: number[][] = Array.from({ length: 27 }, (_, z) =>
  Array.from({ length: 27 }, (_, x) => (x === 0 || x === 26 || z === 0 || z === 26 ? 1 : 0))
);

// 5. LEVEL 5: THE MILITARY BUNKER (Outdoor trench outpost & expansive underground bunker complex)
const LEVEL_5_GRID: number[][] = Array.from({ length: 27 }, (_, z) =>
  Array.from({ length: 27 }, (_, x) => {
    // Outer perimeter concrete wall
    if (x === 0 || x === 26 || z === 0 || z === 26) return 1;

    // Outdoor trench divider wall (Heavy blast entrance open at x: 12, 13, 14)
    if (z === 5 && (x < 12 || x > 14)) return 1;

    // Sektor 2: West Wing (Barak & Mess Hall, Tangga Lantai 2 di x: 4, z: 9..12)
    if (z === 9 && x >= 2 && x <= 10 && x !== 4 && x !== 8) return 1;
    if (z === 13 && x >= 3 && x <= 11 && x !== 4 && x !== 6 && x !== 10) return 1;
    if (z === 17 && x >= 2 && x <= 10 && x !== 4 && x !== 8) return 1;
    if (x === 6 && z >= 10 && z <= 12) return 1;

    // Sektor 3: East Wing (Pusat Komando & Generator, Tangga Lantai 2 di x: 22, z: 9..12)
    if (z === 9 && x >= 16 && x <= 24 && x !== 18 && x !== 22) return 1;
    if (z === 13 && x >= 15 && x <= 23 && x !== 16 && x !== 20 && x !== 22) return 1;
    if (z === 17 && x >= 16 && x <= 24 && x !== 18 && x !== 22) return 1;
    if (x === 20 && z >= 10 && z <= 12) return 1;

    // Sektor 4: South Labyrinth (Gudang Amunisi & Sel Tahanan)
    if (z === 21 && x >= 3 && x <= 10 && x !== 6) return 1;
    if (z === 21 && x >= 16 && x <= 23 && x !== 20) return 1;
    if (x === 8 && z >= 22 && z <= 24) return 1;
    if (x === 18 && z >= 22 && z <= 24) return 1;

    return 0;
  })
);

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
  // Ensure player spawn corridor is completely open and free to navigate
  g[4][3] = 0;
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
  // Clear all stairways and landings in Level 10 so player never gets trapped
  for (let x = 2; x <= 18; x++) g[6][x] = 0;
  for (let z = 8; z <= 12; z++) g[z][17] = 0;
  for (let x = 5; x <= 15; x++) g[14][x] = 0;
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
      { weaponId: 'grenade', x: 16, z: 4 },
      { weaponId: 'machine_gun', x: 4, z: 16 },
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
    description: 'Sekolah tua berdebu 2 lantai dengan tangga. Carilah Wajan Penggorengan untuk memukul Kuntilanak!',
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
      { fromFloor: 0, toFloor: 1, startCell: { x: 2, z: 12 }, endCell: { x: 2, z: 9 }, isStair: true },
    ],
    bridges: [],
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

  // LEVEL 3: THE LABYRINTH (2 FLOORS - MULTI-LEVEL CONCRETE LABYRINTH)
  {
    id: 3,
    title: 'THE LABYRINTH',
    subtitle: 'SECTOR 03 — CONCRETE UNDERGROUND (2 FLOORS)',
    description: 'Labirin beton bertingkat 2 lantai dengan tangga, banyak percabangan membingungkan, dan lorong buntu jebakan. Pintu exit tersembunyi di lantai 2!',
    difficultyRating: 3,
    theme: 'labyrinth',
    gridWidth: 21,
    gridHeight: 21,
    cellSize: 3.4,
    wallHeight: 3.8,
    grid: LEVEL_3_GRID,
    playerSpawn: { x: 1, z: 1, rotationY: Math.PI / 2 },
    monsterSpawn: { x: 11, z: 7, rotationY: 0 },
    exitDoor: { x: 7, z: 15, normal: { x: -1, z: 0 }, floor: 1, rotationY: -Math.PI / 2 },
    floorCount: 2,
    floorHeight: 3.8,
    monsterCount: 1,
    monsterType: 'pocong',
    ramps: [
      { fromFloor: 0, toFloor: 1, startCell: { x: 17, z: 12 }, endCell: { x: 17, z: 10 }, isStair: true },
    ],
    bridges: [],
    weaponPickups: [
      { weaponId: 'chair', x: 3, z: 5 },
    ],
    monsterConfig: {
      detectionFovDeg: 90,
      detectionDistance: 10.0,
      reactionDelaySeconds: 0.75,
      rearAttackAngleDeg: 190,
      attackDistance: 2.8,
      chaseSpeed: 5.22, // 87% of player sprint (6.0)
      catchDistance: 1.6,
    },
    playerConfig: { walkSpeed: 3.8, sprintSpeed: 6.0 },
  },

  // LEVEL 4: THE SACRED CEMETERY (EXPANSIVE OUTDOOR 27x27 BANYAN GRAVEYARD)
  {
    id: 4,
    title: 'THE SACRED CEMETERY',
    subtitle: 'SECTOR 04 — BANYAN GRAVEYARD (EXPANSIVE OUTDOOR)',
    description: 'Kompleks pemakaman tua yang sangat luas dinaungi pohon beringin lebat berakar gantung dan nisan berlumut. Temukan Sapu Ijuk di gubuk kuncen!',
    difficultyRating: 4,
    theme: 'cemetery',
    monsterType: 'kunti',
    gridWidth: 27,
    gridHeight: 27,
    cellSize: 4.0,
    wallHeight: 7.2,
    grid: LEVEL_4_GRID,
    playerSpawn: { x: 3, z: 3, rotationY: Math.PI / 4 },
    monsterSpawn: { x: 13, z: 13, rotationY: 0 },
    exitDoor: { x: 24, z: 24, normal: { x: 0, z: -1 }, floor: 0 },
    floorCount: 1,
    floorHeight: 0,
    monsterCount: 2,
    ramps: [],
    bridges: [],
    weaponPickups: [
      { weaponId: 'broom', x: 7, z: 13 },
    ],
    monsterConfig: {
      detectionFovDeg: 92,
      detectionDistance: 11.0,
      reactionDelaySeconds: 0.75,
      rearAttackAngleDeg: 185,
      attackDistance: 2.4,
      chaseSpeed: 5.25, // 87.5% of player sprint (6.0)
      catchDistance: 1.6,
    },
    playerConfig: { walkSpeed: 3.8, sprintSpeed: 6.0 },
  },

  // LEVEL 5: THE MILITARY BUNKER (2 FLOORS: Concrete Ground Floor & Upper Armored Steel Labyrinth)
  {
    id: 5,
    title: 'THE MILITARY BUNKER',
    subtitle: 'SECTOR 05 — REINFORCED UNDERGROUND BUNKER (2 FLOORS)',
    description: 'Kompleks bunker pertahanan militer bawah tanah 2 lantai yang sangat luas. Dinding beton di lantai 1 dan labirin pelat baja lapis baja di lantai 2. Masuki gerbang baja dari parit luar, temukan tangga darurat untuk mencapai pintu evakuasi di lantai 2!',
    difficultyRating: 5,
    theme: 'bunker',
    monsterType: 'kunti',
    gridWidth: 27,
    gridHeight: 27,
    cellSize: 4.0,
    wallHeight: 4.8,
    grid: LEVEL_5_GRID,
    playerSpawn: { x: 4, z: 3, rotationY: 0 },
    monsterSpawn: { x: 19, z: 11, rotationY: 0 },
    exitDoor: { x: 24, z: 24, normal: { x: 0, z: -1 }, floor: 1 },
    floorCount: 2,
    floorHeight: 4.8,
    monsterCount: 3,
    ramps: [
      { fromFloor: 0, toFloor: 1, startCell: { x: 4, z: 12 }, endCell: { x: 4, z: 9 }, isStair: true },
      { fromFloor: 0, toFloor: 1, startCell: { x: 22, z: 12 }, endCell: { x: 22, z: 9 }, isStair: true },
    ],
    bridges: [],
    weaponPickups: [
      { weaponId: 'spatula', x: 8, z: 3 },
    ],
    monsterConfig: {
      detectionFovDeg: 95,
      detectionDistance: 13.0,
      reactionDelaySeconds: 0.60,
      rearAttackAngleDeg: 180,
      attackDistance: 2.4,
      chaseSpeed: 5.4, // 90% of player sprint (6.0)
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
      { fromFloor: 0, toFloor: 1, startCell: { x: 2, z: 10 }, endCell: { x: 2, z: 7 }, isStair: true },
      { fromFloor: 1, toFloor: 2, startCell: { x: 18, z: 7 }, endCell: { x: 18, z: 10 }, isStair: true },
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
      { fromFloor: 0, toFloor: 1, startCell: { x: 2, z: 12 }, endCell: { x: 2, z: 9 }, isStair: true },
      { fromFloor: 1, toFloor: 2, startCell: { x: 4, z: 8 }, endCell: { x: 7, z: 8 }, isStair: true },
      { fromFloor: 2, toFloor: 3, startCell: { x: 11, z: 12 }, endCell: { x: 14, z: 12 }, isStair: true },
      { fromFloor: 3, toFloor: 4, startCell: { x: 18, z: 8 }, endCell: { x: 18, z: 11 }, isStair: true },
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
      { fromFloor: 0, toFloor: 1, startCell: { x: 14, z: 2 }, endCell: { x: 17, z: 2 }, isStair: true },
      { fromFloor: 1, toFloor: 2, startCell: { x: 5, z: 18 }, endCell: { x: 2, z: 18 }, isStair: true },
    ],
    bridges: [
      { id: 'l8_bridge_1', floor: 1, startCell: { x: 8, z: 6 }, endCell: { x: 11, z: 6 }, type: 'stable' },
      { id: 'l8_bridge_2', floor: 2, startCell: { x: 9, z: 14 }, endCell: { x: 12, z: 14 }, type: 'broken' },
    ],
    weaponPickups: [
      { weaponId: 'machine_gun', x: 18, z: 2 },
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
    playerSpawn: { x: 3, z: 2, rotationY: 0 },
    monsterSpawn: { x: 4, z: 4, rotationY: 0 },
    exitDoor: { x: 18, z: 18, normal: { x: 0, z: -1 } },
    exitLockedInitially: true,
    floorCount: 5,
    floorHeight: 3.6,
    monsterCount: 4,
    ramps: [
      { fromFloor: 0, toFloor: 1, startCell: { x: 5, z: 6 }, endCell: { x: 2, z: 6 }, isStair: true },
      { fromFloor: 1, toFloor: 2, startCell: { x: 15, z: 2 }, endCell: { x: 18, z: 2 }, isStair: true },
      { fromFloor: 2, toFloor: 3, startCell: { x: 5, z: 14 }, endCell: { x: 2, z: 14 }, isStair: true },
      { fromFloor: 3, toFloor: 4, startCell: { x: 15, z: 14 }, endCell: { x: 18, z: 14 }, isStair: true },
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
      { weaponId: 'grenade', x: 17, z: 3 },
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
