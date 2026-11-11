export interface LevelDefinition {
  id: number;
  title: string;
  subtitle: string;
  description: string;
  gridWidth: number;
  gridHeight: number;
  cellSize: number; // in world units (e.g. 2.5)
  wallHeight: number;
  grid: number[][]; // 1 = Wall, 0 = Open corridor
  playerSpawn: { x: number; z: number; rotationY: number };
  monsterSpawn: { x: number; z: number; rotationY: number };
  exitDoor: { x: number; z: number; normal: { x: number; z: number } };
  monsterConfig: {
    detectionFovDeg: number;       // total FOV (90 degrees total = 45 deg each side)
    detectionDistance: number;     // max stealth sight distance
    reactionDelaySeconds: number;  // grace period before instant caught
    rearAttackAngleDeg: number;    // rear cone (e.g. 100 degrees)
    attackDistance: number;        // distance to hit head (e.g. 2.0)
    chaseSpeed: number;            // monster run speed
    catchDistance: number;         // distance to catch player
  };
  playerConfig: {
    walkSpeed: number;
    sprintSpeed: number;
  };
}

// 1 = Wall, 0 = Floor corridor
// 15 x 15 Labyrinth Layout for Level 1
// Clean, carefully tested layout with multiple corridors, loops, intersections, dead ends
const LEVEL_1_GRID: number[][] = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1], // (1,1): Player Spawn, facing +X (East)
  [1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1],
  [1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1],
  [1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1], // Monster at (7, 7), facing North (0, -1) so approach from South (7, 9) is behind it!
  [1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1],
  [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1], // Path approaching monster from behind: (7, 9) -> (7, 7)
  [1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1], // Exit at (13, 13)
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

export const ALL_LEVELS: LevelDefinition[] = [
  {
    id: 1,
    title: 'KEBUN PISANG ANGKER',
    subtitle: 'HUTAN POHON PISANG — ALAM GAIB',
    description: 'Hutan pohon pisang lebat yang dihuni sesosok Pocong mistis. Dekati dalam kesunyian dan pukul dia!',
    gridWidth: 15,
    gridHeight: 15,
    cellSize: 2.8,
    wallHeight: 3.2,
    grid: LEVEL_1_GRID,
    playerSpawn: {
      x: 1,
      z: 1,
      rotationY: 0, // facing forward
    },
    monsterSpawn: {
      x: 7,
      z: 7,
      rotationY: Math.PI / 2, // Facing East (+X into wall alcove), back completely turned to corridor (6, 7)
    },
    exitDoor: {
      x: 13,
      z: 13,
      normal: { x: 0, z: -1 },
    },
    monsterConfig: {
      detectionFovDeg: 90,       // 90 total (45 each side)
      detectionDistance: 9.0,    // realistic corridor stealth sight distance
      reactionDelaySeconds: 0.85,// fair warning window with alert meter before detection
      rearAttackAngleDeg: 200,   // generous rear/side stealth attack arc
      attackDistance: 4.5,       // comfortable bat striking range (full corridor tile reach)
      chaseSpeed: 4.8,           // monster run speed (faster than player walk, slightly slower than sprint)
      catchDistance: 1.6,        // game over distance
    },
    playerConfig: {
      walkSpeed: 3.6,
      sprintSpeed: 5.6,
    },
  },
  // Scalable placeholders for Levels 2 to 10 as specified in prompt:
  {
    id: 2,
    title: 'THE DRAINAGE PIPES',
    subtitle: 'SECTOR 02 — WATER TREATMENT',
    description: 'Flooded service tunnels with echoing footsteps.',
    gridWidth: 15,
    gridHeight: 15,
    cellSize: 2.8,
    wallHeight: 3.2,
    grid: LEVEL_1_GRID,
    playerSpawn: { x: 1, z: 1, rotationY: 0 },
    monsterSpawn: { x: 7, z: 7, rotationY: 0 },
    exitDoor: { x: 13, z: 13, normal: { x: 0, z: -1 } },
    monsterConfig: {
      detectionFovDeg: 90,
      detectionDistance: 14.5,
      reactionDelaySeconds: 0.3,
      rearAttackAngleDeg: 105,
      attackDistance: 2.2,
      chaseSpeed: 4.9,
      catchDistance: 1.4,
    },
    playerConfig: { walkSpeed: 3.6, sprintSpeed: 5.6 },
  },
  {
    id: 3,
    title: 'THE BOILER VAULT',
    subtitle: 'SECTOR 03 — FURNACE CELLS',
    description: 'Scorched steam chambers and labyrinthine piping.',
    gridWidth: 15,
    gridHeight: 15,
    cellSize: 2.8,
    wallHeight: 3.2,
    grid: LEVEL_1_GRID,
    playerSpawn: { x: 1, z: 1, rotationY: 0 },
    monsterSpawn: { x: 7, z: 7, rotationY: 0 },
    exitDoor: { x: 13, z: 13, normal: { x: 0, z: -1 } },
    monsterConfig: {
      detectionFovDeg: 90,
      detectionDistance: 15.0,
      reactionDelaySeconds: 0.3,
      rearAttackAngleDeg: 105,
      attackDistance: 2.2,
      chaseSpeed: 5.0,
      catchDistance: 1.4,
    },
    playerConfig: { walkSpeed: 3.6, sprintSpeed: 5.6 },
  },
  {
    id: 4,
    title: 'THE ASYLUM CORRIDORS',
    subtitle: 'SECTOR 04 — WARD B',
    description: 'Padded cells and decaying metal barricades.',
    gridWidth: 15,
    gridHeight: 15,
    cellSize: 2.8,
    wallHeight: 3.2,
    grid: LEVEL_1_GRID,
    playerSpawn: { x: 1, z: 1, rotationY: 0 },
    monsterSpawn: { x: 7, z: 7, rotationY: 0 },
    exitDoor: { x: 13, z: 13, normal: { x: 0, z: -1 } },
    monsterConfig: {
      detectionFovDeg: 90,
      detectionDistance: 15.5,
      reactionDelaySeconds: 0.28,
      rearAttackAngleDeg: 100,
      attackDistance: 2.2,
      chaseSpeed: 5.1,
      catchDistance: 1.4,
    },
    playerConfig: { walkSpeed: 3.6, sprintSpeed: 5.6 },
  },
  {
    id: 5,
    title: 'THE AUTOPSY CHAMBER',
    subtitle: 'SECTOR 05 — RESEARCH WING',
    description: 'Surgical corridors smelling of formalin and rot.',
    gridWidth: 15,
    gridHeight: 15,
    cellSize: 2.8,
    wallHeight: 3.2,
    grid: LEVEL_1_GRID,
    playerSpawn: { x: 1, z: 1, rotationY: 0 },
    monsterSpawn: { x: 7, z: 7, rotationY: 0 },
    exitDoor: { x: 13, z: 13, normal: { x: 0, z: -1 } },
    monsterConfig: {
      detectionFovDeg: 90,
      detectionDistance: 16.0,
      reactionDelaySeconds: 0.25,
      rearAttackAngleDeg: 100,
      attackDistance: 2.2,
      chaseSpeed: 5.2,
      catchDistance: 1.4,
    },
    playerConfig: { walkSpeed: 3.6, sprintSpeed: 5.6 },
  },
  {
    id: 6,
    title: 'THE GENERATOR CATAPULT',
    subtitle: 'SECTOR 06 — POWER CORE',
    description: 'Sparks and grinding dynamos mask all human sound.',
    gridWidth: 15,
    gridHeight: 15,
    cellSize: 2.8,
    wallHeight: 3.2,
    grid: LEVEL_1_GRID,
    playerSpawn: { x: 1, z: 1, rotationY: 0 },
    monsterSpawn: { x: 7, z: 7, rotationY: 0 },
    exitDoor: { x: 13, z: 13, normal: { x: 0, z: -1 } },
    monsterConfig: {
      detectionFovDeg: 90,
      detectionDistance: 16.0,
      reactionDelaySeconds: 0.25,
      rearAttackAngleDeg: 95,
      attackDistance: 2.2,
      chaseSpeed: 5.2,
      catchDistance: 1.4,
    },
    playerConfig: { walkSpeed: 3.6, sprintSpeed: 5.6 },
  },
  {
    id: 7,
    title: 'THE COLD STORAGE',
    subtitle: 'SECTOR 07 — CRYOGENICS',
    description: 'Freezing vapor obscures your peripheral sight.',
    gridWidth: 15,
    gridHeight: 15,
    cellSize: 2.8,
    wallHeight: 3.2,
    grid: LEVEL_1_GRID,
    playerSpawn: { x: 1, z: 1, rotationY: 0 },
    monsterSpawn: { x: 7, z: 7, rotationY: 0 },
    exitDoor: { x: 13, z: 13, normal: { x: 0, z: -1 } },
    monsterConfig: {
      detectionFovDeg: 90,
      detectionDistance: 16.5,
      reactionDelaySeconds: 0.25,
      rearAttackAngleDeg: 95,
      attackDistance: 2.2,
      chaseSpeed: 5.3,
      catchDistance: 1.4,
    },
    playerConfig: { walkSpeed: 3.6, sprintSpeed: 5.6 },
  },
  {
    id: 8,
    title: 'THE COLLAPSED ARCHIVE',
    subtitle: 'SECTOR 08 — RECORDS DEPOT',
    description: 'Piles of dusty folders and toppled steel cabinets.',
    gridWidth: 15,
    gridHeight: 15,
    cellSize: 2.8,
    wallHeight: 3.2,
    grid: LEVEL_1_GRID,
    playerSpawn: { x: 1, z: 1, rotationY: 0 },
    monsterSpawn: { x: 7, z: 7, rotationY: 0 },
    exitDoor: { x: 13, z: 13, normal: { x: 0, z: -1 } },
    monsterConfig: {
      detectionFovDeg: 90,
      detectionDistance: 17.0,
      reactionDelaySeconds: 0.22,
      rearAttackAngleDeg: 90,
      attackDistance: 2.2,
      chaseSpeed: 5.3,
      catchDistance: 1.4,
    },
    playerConfig: { walkSpeed: 3.6, sprintSpeed: 5.6 },
  },
  {
    id: 9,
    title: 'THE RED SANCTUM',
    subtitle: 'SECTOR 09 — QUARANTINE CORE',
    description: 'Bio-luminescent blood veins spreading over cold concrete.',
    gridWidth: 15,
    gridHeight: 15,
    cellSize: 2.8,
    wallHeight: 3.2,
    grid: LEVEL_1_GRID,
    playerSpawn: { x: 1, z: 1, rotationY: 0 },
    monsterSpawn: { x: 7, z: 7, rotationY: 0 },
    exitDoor: { x: 13, z: 13, normal: { x: 0, z: -1 } },
    monsterConfig: {
      detectionFovDeg: 90,
      detectionDistance: 17.5,
      reactionDelaySeconds: 0.2,
      rearAttackAngleDeg: 90,
      attackDistance: 2.2,
      chaseSpeed: 5.4,
      catchDistance: 1.4,
    },
    playerConfig: { walkSpeed: 3.6, sprintSpeed: 5.6 },
  },
  {
    id: 10,
    title: 'THE FINAL DEPARTURE',
    subtitle: 'SECTOR 10 — SURFACE HATCH',
    description: 'The final barrier before daylight. The specimen is hyper-aware.',
    gridWidth: 15,
    gridHeight: 15,
    cellSize: 2.8,
    wallHeight: 3.2,
    grid: LEVEL_1_GRID,
    playerSpawn: { x: 1, z: 1, rotationY: 0 },
    monsterSpawn: { x: 7, z: 7, rotationY: 0 },
    exitDoor: { x: 13, z: 13, normal: { x: 0, z: -1 } },
    monsterConfig: {
      detectionFovDeg: 90,
      detectionDistance: 18.0,
      reactionDelaySeconds: 0.2,
      rearAttackAngleDeg: 85,
      attackDistance: 2.2,
      chaseSpeed: 5.45,
      catchDistance: 1.4,
    },
    playerConfig: { walkSpeed: 3.6, sprintSpeed: 5.6 },
  },
];
