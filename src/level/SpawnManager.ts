import * as THREE from 'three';
import { LevelDefinition } from './LevelData.ts';
import { LevelCollisionConfig } from './LevelCollisionConfig.ts';

export interface SpawnCandidate {
  x: number;          // grid cell X
  z: number;          // grid cell Z
  floor?: number;     // accessible floor index (0 to floorCount-1)
  rotationY?: number; // facing orientation in radians
}

export interface LevelSpawnConfig {
  monsterCount: number;
  playerCandidates: SpawnCandidate[];
  monsterCandidates: SpawnCandidate[];
  exitCandidates: SpawnCandidate[];
  minPlayerMonsterDist: number;
  minPlayerExitDist: number;
  minMonsterMonsterDist: number;
  minMonsterExitDist: number;
}

export interface EntityWorldSpawn {
  x: number;
  y: number;
  z: number;
  rotationY: number;
  floor: number;
}

export interface SelectedSpawns {
  player: EntityWorldSpawn;
  monsters: EntityWorldSpawn[];
  exit: EntityWorldSpawn;
  seedUsed?: number;
}

export class SpawnManager {
  // Level-specific spawn configuration registry
  private static spawnConfigs: Map<number, LevelSpawnConfig> = new Map([
    // LEVEL 1: Haunted Banana Garden (1 Pocong, 1 floor)
    [1, {
      monsterCount: 1,
      minPlayerMonsterDist: 10.0,
      minPlayerExitDist: 14.0,
      minMonsterMonsterDist: 6.0,
      minMonsterExitDist: 26.0,
      playerCandidates: [
        { x: 3, z: 3, floor: 0, rotationY: 0 },
        { x: 3, z: 17, floor: 0, rotationY: 0 },
        { x: 17, z: 3, floor: 0, rotationY: Math.PI },
        { x: 4, z: 10, floor: 0, rotationY: Math.PI / 2 },
      ],
      monsterCandidates: [
        { x: 6, z: 6, floor: 0, rotationY: 0 },
        { x: 4, z: 12, floor: 0, rotationY: Math.PI / 4 },
        { x: 10, z: 6, floor: 0, rotationY: -Math.PI / 2 },
        { x: 6, z: 10, floor: 0, rotationY: Math.PI },
      ],
      exitCandidates: [
        { x: 18, z: 18, floor: 0, rotationY: -Math.PI / 2 },
        { x: 18, z: 14, floor: 0, rotationY: -Math.PI / 2 },
        { x: 14, z: 18, floor: 0, rotationY: 0 },
      ],
    }],

    // LEVEL 2: Abandoned School (1 Pocong, 2 floors)
    [2, {
      monsterCount: 1,
      minPlayerMonsterDist: 9.0,
      minPlayerExitDist: 12.0,
      minMonsterMonsterDist: 6.0,
      minMonsterExitDist: 26.0,
      playerCandidates: [
        { x: 3, z: 3, floor: 0, rotationY: 0 },
        { x: 3, z: 17, floor: 0, rotationY: 0 },
        { x: 15, z: 3, floor: 1, rotationY: Math.PI },
        { x: 17, z: 17, floor: 1, rotationY: Math.PI },
      ],
      monsterCandidates: [
        { x: 4, z: 2, floor: 0, rotationY: 0 },
        { x: 4, z: 12, floor: 0, rotationY: Math.PI / 2 },
        { x: 6, z: 2, floor: 1, rotationY: 0 },
        { x: 8, z: 10, floor: 1, rotationY: -Math.PI / 2 },
      ],
      exitCandidates: [
        { x: 18, z: 18, floor: 0, rotationY: 0 },
        { x: 18, z: 16, floor: 0, rotationY: -Math.PI / 2 },
        { x: 14, z: 18, floor: 0, rotationY: 0 },
      ],
    }],

    // LEVEL 3: The Labyrinth (1 Pocong, 2 floors)
    [3, {
      monsterCount: 1,
      minPlayerMonsterDist: 9.0,
      minPlayerExitDist: 12.0,
      minMonsterMonsterDist: 6.0,
      minMonsterExitDist: 26.0,
      playerCandidates: [
        { x: 2, z: 2, floor: 0, rotationY: 0 },
        { x: 2, z: 18, floor: 0, rotationY: 0 },
        { x: 6, z: 6, floor: 1, rotationY: Math.PI / 2 },
        { x: 18, z: 6, floor: 1, rotationY: Math.PI },
      ],
      monsterCandidates: [
        { x: 4, z: 2, floor: 0, rotationY: 0 },
        { x: 6, z: 14, floor: 0, rotationY: Math.PI },
        { x: 6, z: 2, floor: 1, rotationY: 0 },
        { x: 8, z: 10, floor: 1, rotationY: -Math.PI / 2 },
      ],
      exitCandidates: [
        { x: 18, z: 18, floor: 0, rotationY: 0 },
        { x: 18, z: 14, floor: 1, rotationY: -Math.PI / 2 },
      ],
    }],

    // LEVEL 4: The Hospital (2 Pocongs, 3 floors)
    [4, {
      monsterCount: 2,
      minPlayerMonsterDist: 8.0,
      minPlayerExitDist: 12.0,
      minMonsterMonsterDist: 5.5,
      minMonsterExitDist: 25.0,
      playerCandidates: [
        { x: 3, z: 3, floor: 0, rotationY: 0 },
        { x: 3, z: 17, floor: 0, rotationY: 0 },
        { x: 16, z: 4, floor: 1, rotationY: Math.PI },
        { x: 5, z: 15, floor: 2, rotationY: 0 },
      ],
      monsterCandidates: [
        { x: 4, z: 4, floor: 0, rotationY: 0 },
        { x: 6, z: 12, floor: 0, rotationY: Math.PI / 2 },
        { x: 6, z: 6, floor: 1, rotationY: 0 },
        { x: 4, z: 14, floor: 1, rotationY: -Math.PI / 2 },
        { x: 6, z: 6, floor: 2, rotationY: 0 },
        { x: 8, z: 10, floor: 2, rotationY: Math.PI },
      ],
      exitCandidates: [
        { x: 18, z: 18, floor: 0, rotationY: 0 },
        { x: 18, z: 14, floor: 1, rotationY: -Math.PI / 2 },
        { x: 18, z: 18, floor: 2, rotationY: 0 },
      ],
    }],

    // LEVEL 5: The Sewer (2 Pocongs, 2 floors)
    [5, {
      monsterCount: 2,
      minPlayerMonsterDist: 8.0,
      minPlayerExitDist: 12.0,
      minMonsterMonsterDist: 5.5,
      minMonsterExitDist: 25.0,
      playerCandidates: [
        { x: 3, z: 3, floor: 0, rotationY: 0 },
        { x: 3, z: 17, floor: 0, rotationY: 0 },
        { x: 16, z: 4, floor: 1, rotationY: Math.PI },
        { x: 16, z: 16, floor: 1, rotationY: Math.PI },
      ],
      monsterCandidates: [
        { x: 4, z: 4, floor: 0, rotationY: 0 },
        { x: 6, z: 14, floor: 0, rotationY: Math.PI / 2 },
        { x: 6, z: 6, floor: 1, rotationY: 0 },
        { x: 8, z: 10, floor: 1, rotationY: -Math.PI / 2 },
      ],
      exitCandidates: [
        { x: 18, z: 18, floor: 0, rotationY: 0 },
        { x: 18, z: 14, floor: 1, rotationY: -Math.PI / 2 },
      ],
    }],

    // LEVEL 6: The Factory (3 Pocongs, 3 floors)
    [6, {
      monsterCount: 3,
      minPlayerMonsterDist: 7.5,
      minPlayerExitDist: 11.0,
      minMonsterMonsterDist: 5.0,
      minMonsterExitDist: 25.0,
      playerCandidates: [
        { x: 2, z: 2, floor: 0, rotationY: 0 },
        { x: 2, z: 18, floor: 0, rotationY: 0 },
        { x: 10, z: 2, floor: 1, rotationY: 0 },
        { x: 10, z: 18, floor: 2, rotationY: Math.PI },
      ],
      monsterCandidates: [
        { x: 4, z: 2, floor: 0, rotationY: 0 },
        { x: 6, z: 12, floor: 0, rotationY: Math.PI / 2 },
        { x: 6, z: 2, floor: 1, rotationY: 0 },
        { x: 4, z: 12, floor: 1, rotationY: -Math.PI / 2 },
        { x: 6, z: 2, floor: 2, rotationY: 0 },
        { x: 8, z: 10, floor: 2, rotationY: Math.PI },
      ],
      exitCandidates: [
        { x: 18, z: 18, floor: 0, rotationY: 0 },
        { x: 18, z: 14, floor: 1, rotationY: -Math.PI / 2 },
        { x: 18, z: 18, floor: 2, rotationY: -Math.PI / 2 },
      ],
    }],

    // LEVEL 7: The Hotel (3 Pocongs, 5 floors)
    [7, {
      monsterCount: 3,
      minPlayerMonsterDist: 7.5,
      minPlayerExitDist: 11.0,
      minMonsterMonsterDist: 5.0,
      minMonsterExitDist: 25.0,
      playerCandidates: [
        { x: 3, z: 3, floor: 0, rotationY: 0 },
        { x: 3, z: 17, floor: 0, rotationY: 0 },
        { x: 16, z: 4, floor: 1, rotationY: Math.PI },
        { x: 5, z: 15, floor: 2, rotationY: 0 },
        { x: 15, z: 15, floor: 3, rotationY: Math.PI },
      ],
      monsterCandidates: [
        { x: 4, z: 2, floor: 0, rotationY: 0 },
        { x: 4, z: 10, floor: 0, rotationY: Math.PI / 2 },
        { x: 7, z: 2, floor: 1, rotationY: 0 },
        { x: 4, z: 4, floor: 2, rotationY: 0 },
        { x: 8, z: 10, floor: 3, rotationY: -Math.PI / 2 },
        { x: 4, z: 4, floor: 4, rotationY: Math.PI },
      ],
      exitCandidates: [
        { x: 18, z: 18, floor: 0, rotationY: 0 },
        { x: 18, z: 14, floor: 2, rotationY: -Math.PI / 2 },
        { x: 18, z: 18, floor: 4, rotationY: -Math.PI / 2 },
      ],
    }],

    // LEVEL 8: The Subway (3 Pocongs, 3 floors)
    [8, {
      monsterCount: 3,
      minPlayerMonsterDist: 7.5,
      minPlayerExitDist: 11.0,
      minMonsterMonsterDist: 5.0,
      minMonsterExitDist: 25.0,
      playerCandidates: [
        { x: 2, z: 2, floor: 0, rotationY: 0 },
        { x: 6, z: 16, floor: 1, rotationY: 0 },
        { x: 16, z: 4, floor: 1, rotationY: Math.PI },
        { x: 5, z: 5, floor: 2, rotationY: 0 },
      ],
      monsterCandidates: [
        { x: 4, z: 4, floor: 0, rotationY: 0 },
        { x: 6, z: 14, floor: 0, rotationY: Math.PI / 2 },
        { x: 6, z: 6, floor: 1, rotationY: 0 },
        { x: 8, z: 10, floor: 1, rotationY: -Math.PI / 2 },
        { x: 6, z: 6, floor: 2, rotationY: 0 },
        { x: 4, z: 14, floor: 2, rotationY: Math.PI },
      ],
      exitCandidates: [
        { x: 18, z: 18, floor: 0, rotationY: 0 },
        { x: 18, z: 14, floor: 1, rotationY: -Math.PI / 2 },
        { x: 18, z: 18, floor: 2, rotationY: -Math.PI / 2 },
      ],
    }],

    // LEVEL 9: Research Facility (4 Pocongs, 5 floors)
    [9, {
      monsterCount: 4,
      minPlayerMonsterDist: 7.0,
      minPlayerExitDist: 10.0,
      minMonsterMonsterDist: 4.5,
      minMonsterExitDist: 25.0,
      playerCandidates: [
        { x: 3, z: 3, floor: 0, rotationY: 0 },
        { x: 3, z: 17, floor: 0, rotationY: 0 },
        { x: 16, z: 4, floor: 1, rotationY: Math.PI },
        { x: 5, z: 15, floor: 2, rotationY: 0 },
        { x: 15, z: 15, floor: 3, rotationY: Math.PI },
      ],
      monsterCandidates: [
        { x: 4, z: 4, floor: 0, rotationY: 0 },
        { x: 6, z: 12, floor: 1, rotationY: 0 },
        { x: 6, z: 6, floor: 2, rotationY: -Math.PI / 2 },
        { x: 8, z: 10, floor: 3, rotationY: Math.PI / 2 },
        { x: 4, z: 4, floor: 4, rotationY: Math.PI },
      ],
      exitCandidates: [
        { x: 18, z: 18, floor: 0, rotationY: 0 },
        { x: 18, z: 18, floor: 4, rotationY: -Math.PI / 2 },
      ],
    }],

    // LEVEL 10: The Nightmare (4 Pocongs, 10 floors/tiers)
    [10, {
      monsterCount: 4,
      minPlayerMonsterDist: 7.0,
      minPlayerExitDist: 10.0,
      minMonsterMonsterDist: 4.5,
      minMonsterExitDist: 25.0,
      playerCandidates: [
        { x: 2, z: 2, floor: 0, rotationY: 0 },
        { x: 18, z: 2, floor: 1, rotationY: Math.PI / 2 },
        { x: 2, z: 18, floor: 2, rotationY: 0 },
        { x: 18, z: 18, floor: 3, rotationY: -Math.PI / 2 },
      ],
      monsterCandidates: [
        { x: 4, z: 4, floor: 0, rotationY: 0 },
        { x: 6, z: 10, floor: 2, rotationY: Math.PI / 2 },
        { x: 4, z: 2, floor: 4, rotationY: -Math.PI / 2 },
        { x: 6, z: 8, floor: 6, rotationY: 0 },
        { x: 4, z: 2, floor: 8, rotationY: Math.PI },
        { x: 4, z: 4, floor: 9, rotationY: 0 },
      ],
      exitCandidates: [
        { x: 18, z: 18, floor: 9, rotationY: 0 },
      ],
    }],
  ]);

  public static getSpawnConfig(levelId: number): LevelSpawnConfig | undefined {
    return this.spawnConfigs.get(levelId);
  }

  // Generate randomized, fully validated spawn positions for Player, Monsters, and Exit
  public static generateSpawns(
    level: LevelDefinition,
    collisionConfig?: LevelCollisionConfig,
    seed?: number
  ): SelectedSpawns {
    const config = this.spawnConfigs.get(level.id);
    const { cellSize, gridWidth, gridHeight } = level;
    const halfW = (gridWidth * cellSize) / 2;
    const halfH = (gridHeight * cellSize) / 2;
    const fh = level.floorHeight || 3.8;

    // Simple pseudo-random generator with seed support for deterministic replayability
    let rngState = seed !== undefined ? (seed % 2147483647) : Math.floor(Math.random() * 2147483647);
    const nextRandom = (): number => {
      rngState = (rngState * 16807) % 2147483647;
      return (rngState - 1) / 2147483646;
    };

    const shuffle = <T>(array: T[]): T[] => {
      const arr = [...array];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(nextRandom() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };

    // Helper: Convert grid cell + floor to world position
    const toWorld = (c: SpawnCandidate, isPlayer: boolean = false): EntityWorldSpawn => {
      const wx = (c.x + 0.5) * cellSize - halfW;
      const wz = (c.z + 0.5) * cellSize - halfH;
      const floor = c.floor || 0;
      const baseY = floor * fh;
      const y = isPlayer ? baseY + 1.5 : baseY;
      return {
        x: wx,
        y,
        z: wz,
        rotationY: c.rotationY !== undefined ? c.rotationY : 0,
        floor,
      };
    };

    // Helper: 3D distance between two entities
    const dist3D = (a: EntityWorldSpawn, b: EntityWorldSpawn): number => {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dz = a.z - b.z;
      return Math.sqrt(dx * dx + dy * dy + dz * dz);
    };

    // Helper: Check if position collides with cylinders or walls
    const isValidPosition = (pos: EntityWorldSpawn): boolean => {
      // 1. Boundary check
      const margin = collisionConfig?.perimeterMargin || 1.2;
      if (Math.abs(pos.x) > halfW - margin || Math.abs(pos.z) > halfH - margin) {
        return false;
      }

      // 2. Cylinder colliders clearance
      const cylinders = collisionConfig?.cylinderColliders || [];
      for (let i = 0; i < cylinders.length; i++) {
        const c = cylinders[i];
        const distSq = (pos.x - c.x) ** 2 + (pos.z - c.z) ** 2;
        const minClearance = c.radius + 0.65;
        if (distSq < minClearance * minClearance) {
          return false;
        }
      }

      // 3. Stairs internal volume check (don't spawn trapped inside ramp body)
      const ramps = collisionConfig?.ramps || [];
      for (let i = 0; i < ramps.length; i++) {
        const r = ramps[i];
        if (r.box.containsPoint(new THREE.Vector3(pos.x, pos.y, pos.z))) {
          // Inside ramp interior bounding box
          return false;
        }
      }

      return true;
    };

    const targetMonsterCount = config ? config.monsterCount : 1;

    // Retry loop: up to 35 attempts to find a valid non-overlapping layout
    if (config) {
      const maxAttempts = 35;
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const pCandidates = shuffle(config.playerCandidates);
        const mCandidates = shuffle(config.monsterCandidates);
        const eCandidates = shuffle(config.exitCandidates);

        // Pick player candidate
        const pCandidate = pCandidates[0];
        const playerSpawn = toWorld(pCandidate, true);
        if (!isValidPosition(playerSpawn)) continue;

        // Pick exit candidate that respects minPlayerExitDist
        let exitSpawn: EntityWorldSpawn | null = null;
        for (const ec of eCandidates) {
          const cand = toWorld(ec, false);
          if (isValidPosition(cand) && dist3D(playerSpawn, cand) >= config.minPlayerExitDist) {
            exitSpawn = cand;
            break;
          }
        }
        if (!exitSpawn) continue;

        // Pick N monster candidates
        const selectedMonsters: EntityWorldSpawn[] = [];
        for (const mc of mCandidates) {
          if (selectedMonsters.length >= targetMonsterCount) break;
          const monsterSpawn = toWorld(mc, false);
          if (!isValidPosition(monsterSpawn)) continue;

          // Check distance from player
          if (dist3D(playerSpawn, monsterSpawn) < config.minPlayerMonsterDist) continue;

          // Check distance from exit (both 3D distance and 2D horizontal separation)
          const distExit3D = dist3D(exitSpawn, monsterSpawn);
          const distExit2D = Math.hypot(exitSpawn.x - monsterSpawn.x, exitSpawn.z - monsterSpawn.z);
          if (distExit3D < config.minMonsterExitDist || distExit2D < config.minMonsterExitDist * 0.85) continue;

          // Check distance from other selected monsters
          const tooCloseToOther = selectedMonsters.some(
            other => dist3D(other, monsterSpawn) < config.minMonsterMonsterDist
          );
          if (tooCloseToOther) continue;

          selectedMonsters.push(monsterSpawn);
        }

        if (selectedMonsters.length === targetMonsterCount) {
          return {
            player: playerSpawn,
            monsters: selectedMonsters,
            exit: exitSpawn,
            seedUsed: rngState,
          };
        }
      }
    }

    // Safe predefined fallback
    const defaultPlayer: EntityWorldSpawn = {
      x: (level.playerSpawn.x + 0.5) * cellSize - halfW,
      y: 1.5,
      z: (level.playerSpawn.z + 0.5) * cellSize - halfH,
      rotationY: level.playerSpawn.rotationY,
      floor: 0,
    };

    const defaultExit: EntityWorldSpawn = {
      x: (level.exitDoor.x + 0.5) * cellSize - halfW,
      y: 0,
      z: (level.exitDoor.z + 0.5) * cellSize - halfH,
      rotationY: 0,
      floor: 0,
    };

    const defaultMonsters: EntityWorldSpawn[] = [];
    const baseMonsterX = (level.monsterSpawn.x + 0.5) * cellSize - halfW;
    const baseMonsterZ = (level.monsterSpawn.z + 0.5) * cellSize - halfH;

    for (let i = 0; i < targetMonsterCount; i++) {
      const assignedFloor = level.floorCount && level.floorCount > 1 ? i % level.floorCount : 0;
      // Offset multiple monsters towards northwest to stay far from exit
      const offsetX = -i * 2.0;
      const offsetZ = -i * 2.0;
      defaultMonsters.push({
        x: baseMonsterX + offsetX,
        y: assignedFloor * fh,
        z: baseMonsterZ + offsetZ,
        rotationY: level.monsterSpawn.rotationY,
        floor: assignedFloor,
      });
    }

    return {
      player: defaultPlayer,
      monsters: defaultMonsters,
      exit: defaultExit,
      seedUsed: rngState,
    };
  }
}
