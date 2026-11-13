import * as THREE from 'three';

export type EnvironmentId =
  | 'haunted_banana_garden'
  | 'abandoned_school'
  | 'the_labyrinth'
  | 'the_hospital'
  | 'the_sewer'
  | 'the_factory'
  | 'the_hotel'
  | 'the_subway'
  | 'research_facility'
  | 'the_nightmare';

export interface WorldRamp {
  fromFloor: number;
  toFloor: number;
  startWorld: { x: number; y: number; z: number };
  endWorld: { x: number; y: number; z: number };
  width: number;
  length: number;
  box: THREE.Box3;
  dirX: number;
  dirZ: number;
  normX: number;
  normZ: number;
}

export interface StairwellOpening {
  floor: number;
  box: THREE.Box3;
  minGx: number;
  maxGx: number;
  minGz: number;
  maxGz: number;
}

export interface WorldBridge {
  id: string;
  floor: number;
  type: 'stable' | 'unstable' | 'broken';
  startWorld: { x: number; y: number; z: number };
  endWorld: { x: number; y: number; z: number };
  height: number;
  width: number;
  length: number;
  box: THREE.Box3;
  gapBox?: THREE.Box3;
}

export interface CylinderCollider {
  x: number;
  z: number;
  radius: number;
  height?: number;
  minY?: number;
  maxY?: number;
  label?: string;
}

export interface BoxCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY?: number;
  maxY?: number;
  label?: string;
}

export interface FallZoneConfig {
  box: THREE.Box3;
  fatal: boolean; // fatal = game over, non-fatal = recoverable fall onto lower floor
  description?: string;
}

/**
 * LevelCollisionConfig
 * Every level independently defines its own collision and environment configuration.
 * Prevents cross-level collision contamination and enforces strict isolation.
 */
export interface LevelCollisionConfig {
  levelId: number;
  environmentId: EnvironmentId;
  multiFloor: boolean;
  floorCount: number;
  floorHeight: number;
  perimeterMargin: number;

  // Collision models
  useGridWalls: boolean;          // FALSE for Level 1 (open plantation); TRUE for indoor/maze levels 2-10
  wallGrid?: number[][];          // Grid array defining solid 3.8m wall cubes (levels 2 to 10)

  // Obstacle arrays
  cylinderColliders: CylinderCollider[]; // Banana trees (Level 1) or themed furniture props (Levels 2-10)
  boxColliders: BoxCollider[];           // Railings, partition barriers, custom obstacles

  // Multi-floor navigation
  hasStairs: boolean;
  ramps: WorldRamp[];                    // Stairs and ramps connecting floors
  bridges: WorldBridge[];                // Wooden bridges (stable, unstable, broken)
  stairOpenings: StairwellOpening[];     // Cutouts on upper floors
  fallZones: FallZoneConfig[];           // Gaps and pitfall hazards
}
