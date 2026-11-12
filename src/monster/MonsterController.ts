import * as THREE from 'three';
import { MonsterModel } from './MonsterModel.ts';
import { LevelDefinition } from '../level/LevelData.ts';
import { GridPathfinding, Point2D } from '../pathfinding/GridPathfinding.ts';
import { AudioManager } from '../core/AudioManager.ts';
import { WeaponDefinition, WEAPON_MAP, MonsterReactionType } from '../weapon/WeaponData.ts';
import { LevelCollisionConfig, WorldRamp, WorldBridge } from '../level/LevelCollisionConfig.ts';

export type MonsterState =
  | 'SITTING_IDLE'
  | 'DETECT_PLAYER'
  | 'HIT_REACTION'
  | 'SCREAM'
  | 'STAND_UP'
  | 'CHASE'
  | 'CATCH_PLAYER';

export class MonsterController {
  public model: MonsterModel;
  public group: THREE.Group;
  public state: MonsterState = 'SITTING_IDLE';
  public isAwake: boolean = false;

  public position: THREE.Vector3 = new THREE.Vector3();
  public rotationY: number = 0; // facing direction

  private levelDef: LevelDefinition | null = null;
  private pathfinding: GridPathfinding | null = null;
  private effectiveGrid: number[][] | null = null;
  public collisionConfig: LevelCollisionConfig | null = null;
  private ramps: WorldRamp[] = [];
  private bridges: WorldBridge[] = [];
  private floorHeight: number = 3.8;
  private baseGroundY: number = 0;

  public treeColliders: Array<{ x: number; z: number; radius: number }> = [];

  public setTreeColliders(colliders: Array<{ x: number; z: number; radius: number }>): void {
    this.treeColliders = colliders;
  }

  // Stealth detection tracking
  private detectionTimer: number = 0;
  public detectionPercent: number = 0; // 0 to 1 for HUD alert meter

  // State timers
  private stateTime: number = 0;
  private animProgress: number = 0;
  private currentHitReaction: MonsterReactionType = 'snap';

  // Pathfinding waypoints
  private currentPath: Point2D[] = [];
  private pathRecalcTimer: number = 0;
  private footstepTimer: number = 0;
  private hopTimer: number = 0;
  private wasAirborne: boolean = true;

  // Latch flag: once in rear striking zone, keep attack button active until player backs far away
  private isPlayerInRearStrikeZone: boolean = false;

  // Callbacks
  public onPlayerDetected: (() => void) | null = null;
  public onPlayerCaught: (() => void) | null = null;
  public onChaseStarted: (() => void) | null = null;

  constructor() {
    this.model = new MonsterModel();
    this.group = this.model.group;
  }

  public setLevel(
    level: LevelDefinition,
    pathfinding: GridPathfinding,
    spawn: { x: number; y: number; z: number; rotationY: number },
    collisionConfigOrGrid?: LevelCollisionConfig | number[][],
    ramps: WorldRamp[] = [],
    bridges: WorldBridge[] = [],
    floorHeight: number = 3.8
  ): void {
    this.levelDef = level;
    this.pathfinding = pathfinding;

    if (collisionConfigOrGrid && 'environmentId' in collisionConfigOrGrid) {
      this.collisionConfig = collisionConfigOrGrid as LevelCollisionConfig;
      this.ramps = this.collisionConfig.ramps;
      this.bridges = this.collisionConfig.bridges;
      this.floorHeight = this.collisionConfig.floorHeight;
      this.treeColliders = this.collisionConfig.cylinderColliders;
      this.effectiveGrid = this.collisionConfig.wallGrid || null;
    } else {
      this.collisionConfig = null;
      this.effectiveGrid = (collisionConfigOrGrid as number[][]) || level.grid;
      this.ramps = ramps;
      this.bridges = bridges;
      this.floorHeight = floorHeight;
    }

    this.baseGroundY = spawn.y || 0;
    this.position.set(spawn.x, spawn.y || 0, spawn.z);
    this.rotationY = spawn.rotationY;
    this.group.position.copy(this.position);
    this.group.rotation.y = this.rotationY;

    this.state = 'SITTING_IDLE';
    this.isAwake = false;
    this.detectionTimer = 0;
    this.detectionPercent = 0;
    this.stateTime = 0;
    this.animProgress = 0;
    this.currentPath = [];
    this.hopTimer = 0;
    this.wasAirborne = true;
    this.isPlayerInRearStrikeZone = false;
    this.model.applySittingPosture(0);
  }

  public getForwardVector(): THREE.Vector3 {
    return new THREE.Vector3(Math.sin(this.rotationY), 0, Math.cos(this.rotationY)).normalize();
  }

  // 3D Spatial and Line-of-Sight Interaction Validation (Stage 2: Floor Separation & Occlusion)
  public canInteractWithMonster(
    playerPos: THREE.Vector3,
    blockingObjects?: THREE.Object3D[],
    playerFloor?: number
  ): boolean {
    if (this.state !== 'SITTING_IDLE' || this.isAwake) return false;

    // 1. Vertical separation validation (Floors/Ceilings separation threshold)
    const playerFeetY = playerPos.y - 1.65;
    const monsterBaseY = this.position.y;
    const verticalDist = Math.abs(playerFeetY - monsterBaseY);
    const fh = this.floorHeight > 0 ? this.floorHeight : 3.8;

    // Reject if vertical separation exceeds half a floor height threshold (1.75m)
    if (verticalDist > 1.75) {
      return false;
    }

    // 2. Floor compatibility verification when floor identity is provided
    if (playerFloor !== undefined && this.collisionConfig && this.collisionConfig.multiFloor) {
      const monsterFloor = Math.max(0, Math.round(monsterBaseY / fh));
      if (playerFloor !== monsterFloor && verticalDist > 1.2) {
        return false;
      }
    }

    // 3. True 3D Distance check (within melee striking reach)
    const monsterCenter = new THREE.Vector3(this.position.x, this.position.y + 0.9, this.position.z);
    const dist3D = playerPos.distanceTo(monsterCenter);
    if (dist3D > 4.5) {
      return false;
    }

    // 4. Line-of-sight raycast validation against blocking walls, ceilings, and floors
    if (blockingObjects && blockingObjects.length > 0) {
      const dir = new THREE.Vector3().subVectors(monsterCenter, playerPos);
      const totalLen = dir.length();
      if (totalLen > 0.001) {
        dir.normalize();
        const raycaster = new THREE.Raycaster(playerPos, dir, 0.05, totalLen);
        const intersections = raycaster.intersectObjects(blockingObjects, true);
        if (intersections.length > 0) {
          // If any solid obstacle is closer than the monster body surface, LOS is blocked!
          const nearestHit = intersections[0];
          if (nearestHit.distance < totalLen - 0.35) {
            return false;
          }
        }
      }
    }

    return true;
  }

  // Check if monster can be attacked (near monster proximity for UI prompt)
  public canBeAttackedFromBehind(
    playerPos: THREE.Vector3,
    blockingObjects?: THREE.Object3D[],
    playerFloor?: number
  ): boolean {
    return this.canInteractWithMonster(playerPos, blockingObjects, playerFloor);
  }

  // Check if player's swing hits ANY part of the monster's body
  // The monster ONLY wakes up and chases when struck by the bat!
  public isHitByPlayerSwing(
    camera: THREE.Camera,
    playerPos: THREE.Vector3,
    playerForward: THREE.Vector3,
    blockingObjects?: THREE.Object3D[],
    playerFloor?: number
  ): boolean {
    if (!this.canInteractWithMonster(playerPos, blockingObjects, playerFloor)) {
      return false;
    }

    // 1. Precise raycast from crosshair against all monster meshes (head, body, shroud, face)
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    raycaster.far = 4.5;
    const hits = raycaster.intersectObjects(this.group.children, true);
    if (hits.length > 0) {
      // Ensure crosshair raycast is not blocked by a wall or floor in between
      if (blockingObjects && blockingObjects.length > 0) {
        const wallHits = raycaster.intersectObjects(blockingObjects, true);
        if (wallHits.length > 0 && wallHits[0].distance < hits[0].distance) {
          return false;
        }
      }
      return true;
    }

    // 2. Proximity strike (within close striking distance and facing monster)
    const monsterCenter = new THREE.Vector3(this.position.x, this.position.y + 0.9, this.position.z);
    const dirToMonster = new THREE.Vector3().subVectors(monsterCenter, playerPos).normalize();

    // Generous striking arc facing Pocong
    if (playerForward.dot(dirToMonster) > 0.2) {
      return true;
    }

    return false;
  }

  // Called when player lands a hit with any weapon
  public triggerWeaponHit(weaponDef: WeaponDefinition): void {
    if (this.state !== 'SITTING_IDLE' || this.isAwake) return;

    this.isAwake = true;
    this.currentHitReaction = weaponDef.monsterReaction;
    this.state = 'HIT_REACTION';
    this.stateTime = 0;
    this.animProgress = 0;
    this.detectionPercent = 0;

    AudioManager.getInstance().playWeaponImpact(weaponDef.impactSound);
  }

  // Legacy wrapper for baseball bat strike
  public triggerBatHit(): void {
    this.triggerWeaponHit(WEAPON_MAP['baseball_bat']);
  }

  public update(dt: number, totalTime: number, playerPos: THREE.Vector3): void {
    if (!this.levelDef || !this.pathfinding) return;

    // HARD GUARD: Pocong is asleep and motionless until struck with the bat!
    if (!this.isAwake) {
      this.state = 'SITTING_IDLE';
      this.updateSittingIdle(dt, totalTime, playerPos);
      this.group.position.copy(this.position);
      this.group.rotation.y = this.rotationY;
      return;
    }

    this.stateTime += dt;

    switch (this.state) {
      case 'SITTING_IDLE':
        this.updateSittingIdle(dt, totalTime, playerPos);
        break;

      case 'DETECT_PLAYER':
        this.updateDetectPlayer(dt, totalTime, playerPos);
        break;

      case 'HIT_REACTION':
        this.updateHitReaction(dt);
        break;

      case 'SCREAM':
        this.updateScream(dt, totalTime);
        break;

      case 'STAND_UP':
        this.updateStandUp(dt);
        break;

      case 'CHASE':
        this.updateChase(dt, totalTime, playerPos);
        break;

      case 'CATCH_PLAYER':
        this.model.applyCatch(totalTime);
        break;
    }

    // Sync group transform
    this.group.position.copy(this.position);
    this.group.rotation.y = this.rotationY;
  }

  // 1. SITTING_IDLE: Monster is sleeping on the floor.
  // Can be awakened either by being struck with a weapon OR if player steps directly in front / touches it!
  private updateSittingIdle(dt: number, totalTime: number, playerPos: THREE.Vector3): void {
    this.model.applySittingPosture(totalTime);
    this.position.y = 0;

    if (!this.levelDef) return;
    const cfg = this.levelDef.monsterConfig;

    const horizontalDist = Math.hypot(this.position.x - playerPos.x, this.position.z - playerPos.z);

    // Frontal Detection & Proximity Awakening
    let isDetected = false;

    // 1. Physical proximity: player bumps into or steps right next to sleeping Pocong (< 2.2m)
    if (horizontalDist < 2.2) {
      isDetected = true;
    }
    // 2. Frontal Vision Cone: player enters front FOV cone within sight distance
    else if (horizontalDist < (cfg.detectionDistance || 9.0)) {
      const forward = this.getForwardVector();
      const dirToPlayer = new THREE.Vector3(
        playerPos.x - this.position.x,
        0,
        playerPos.z - this.position.z
      ).normalize();

      const dot = forward.dot(dirToPlayer);
      const halfFovRad = (((cfg.detectionFovDeg || 90) / 2) * Math.PI) / 180;
      const fovThreshold = Math.cos(halfFovRad);

      if (dot >= fovThreshold) {
        if (!this.pathfinding || this.pathfinding.hasLineOfSight(this.position.x, this.position.z, playerPos.x, playerPos.z)) {
          isDetected = true;
        }
      }
    }

    if (isDetected) {
      this.detectionTimer += dt;
      const delay = cfg.reactionDelaySeconds || 0.65;
      this.detectionPercent = Math.min(1, this.detectionTimer / delay);

      if (this.detectionTimer >= delay) {
        // Pocong awakens, screams, and begins hopping chase!
        this.isAwake = true;
        this.state = 'SCREAM';
        this.stateTime = 0;
        this.animProgress = 0;
        this.detectionPercent = 1;
        AudioManager.getInstance().playMonsterScream();
        if (this.onChaseStarted) {
          this.onChaseStarted();
        }
      }
    } else {
      const delay = cfg.reactionDelaySeconds || 0.65;
      this.detectionTimer = Math.max(0, this.detectionTimer - dt * 1.5);
      this.detectionPercent = Math.min(1, this.detectionTimer / delay);
    }
  }

  // 2. DETECT_PLAYER
  private updateDetectPlayer(dt: number, totalTime: number, playerPos: THREE.Vector3): void {
    // Snap head directly at player
    const dirToPlayer = new THREE.Vector3().subVectors(playerPos, this.position).setY(0).normalize();
    const targetAngle = Math.atan2(dirToPlayer.x, dirToPlayer.z);
    this.rotationY = targetAngle;

    this.model.applyCatch(totalTime);

    if (this.stateTime > 0.6) {
      this.state = 'CATCH_PLAYER';
      if (this.onPlayerCaught) {
        this.onPlayerCaught();
      }
    }
  }

  // 3. HIT_REACTION (Head / body reacts based on selected weapon)
  private updateHitReaction(dt: number): void {
    const hitDuration = 0.22;
    this.animProgress = this.stateTime / hitDuration;
    this.model.applyHitReaction(this.animProgress, this.currentHitReaction);

    if (this.stateTime >= hitDuration) {
      this.state = 'SCREAM';
      this.stateTime = 0;
      this.animProgress = 0;
      AudioManager.getInstance().playMonsterScream();
    }
  }

  // 4. SCREAM (Unhinged jaw, shriek)
  private updateScream(dt: number, totalTime: number): void {
    const screamDuration = 0.38;
    this.animProgress = this.stateTime / screamDuration;
    this.model.applyScream(this.animProgress, totalTime);

    if (this.stateTime >= screamDuration) {
      this.state = 'STAND_UP';
      this.stateTime = 0;
      this.animProgress = 0;
    }
  }

  // 5. STAND_UP (Rises to towering height)
  private updateStandUp(dt: number): void {
    const standDuration = 0.28;
    this.animProgress = this.stateTime / standDuration;
    this.model.applyStandUp(this.animProgress);

    if (this.stateTime >= standDuration) {
      this.state = 'CHASE';
      this.stateTime = 0;
      this.hopTimer = 0;
      this.pathRecalcTimer = 0.35;
      if (this.onChaseStarted) {
        this.onChaseStarted();
      }
    }
  }

  // 6. CHASE (Pocong Hopping Navigation: leaping in terrifying vertical arcs tracking player)
  private updateChase(dt: number, totalTime: number, playerPos: THREE.Vector3): void {
    const cfg = this.levelDef!.monsterConfig;

    // Use 2D horizontal distance on the floor
    const horizontalDist = Math.hypot(this.position.x - playerPos.x, this.position.z - playerPos.z);

    // Hopping Rhythm Cycle
    const hopDuration = 0.52; // each jump cycle takes ~0.52s
    this.hopTimer += dt;
    const cycle = (this.hopTimer % hopDuration) / hopDuration; // 0.0 to 1.0
    const isAirborne = cycle < 0.70;

    // Heavy landing impact thud on ground contact
    if (this.wasAirborne && !isAirborne) {
      AudioManager.getInstance().playPocongHop(horizontalDist);
    }
    this.wasAirborne = isAirborne;

    // Update vertical elevation (Ramps, Bridges, Multi-Floor)
    let groundY = 0;
    let onRamp = false;
    for (let i = 0; i < this.ramps.length; i++) {
      const r = this.ramps[i];
      if (r.box.containsPoint(this.position)) {
        const dx = r.endWorld.x - r.startWorld.x;
        const dz = r.endWorld.z - r.startWorld.z;
        const lenSq = dx * dx + dz * dz;
        const t = lenSq > 0.001
          ? Math.max(0, Math.min(1, ((this.position.x - r.startWorld.x) * dx + (this.position.z - r.startWorld.z) * dz) / lenSq))
          : 0;
        groundY = r.startWorld.y + t * (r.endWorld.y - r.startWorld.y);
        onRamp = true;
        break;
      }
    }
    if (!onRamp) {
      for (let i = 0; i < this.bridges.length; i++) {
        const b = this.bridges[i];
        if (b.box.containsPoint(this.position)) {
          groundY = b.height;
          break;
        }
      }
      if (Math.abs(playerPos.y - this.baseGroundY) > 1.0) {
        const targetFloorY = Math.round((playerPos.y - 1.65) / this.floorHeight) * this.floorHeight;
        groundY = THREE.MathUtils.lerp(this.baseGroundY, targetFloorY, Math.min(1, 3.0 * dt));
      }
    }
    this.baseGroundY = groundY;

    // Vertical parabolic jump height (up to 0.95m high in air!)
    if (isAirborne) {
      const airP = cycle / 0.70;
      this.position.y = this.baseGroundY + Math.sin(airP * Math.PI) * 0.95;
    } else {
      this.position.y = this.baseGroundY;
    }

    // Animate the pocong body (forward pitch in air, squash on landing)
    this.model.applyHopAnimation(cycle, isAirborne);

    // Check catch distance (grace period: 0.8s after chase begins so player can turn and sprint)
    const catchDist = Math.max(1.5, cfg.catchDistance);
    if (this.stateTime > 0.8 && horizontalDist <= catchDist) {
      this.state = 'CATCH_PLAYER';
      this.position.y = this.baseGroundY + 0.15;
      AudioManager.getInstance().playCaughtStinger();
      if (this.onPlayerCaught) {
        this.onPlayerCaught();
      }
      return;
    }

    // Recalculate A* path periodically
    this.pathRecalcTimer += dt;
    if (this.pathRecalcTimer >= 0.35 || this.currentPath.length === 0) {
      this.pathRecalcTimer = 0;
      if (this.pathfinding) {
        const path = this.pathfinding.findPath(
          { x: this.position.x, z: this.position.z },
          { x: playerPos.x, z: playerPos.z }
        );
        if (path.length > 1) {
          this.currentPath = path.slice(1);
        } else {
          this.currentPath = path;
        }
      }
    }

    // Determine target position: follow waypoint or pursue player directly!
    let targetX = playerPos.x;
    let targetZ = playerPos.z;

    if (this.currentPath.length > 0) {
      const targetWp = this.currentPath[0];
      const wpDist = Math.hypot(targetWp.x - this.position.x, targetWp.z - this.position.z);
      if (wpDist < 0.4) {
        this.currentPath.shift();
      } else {
        targetX = targetWp.x;
        targetZ = targetWp.z;
      }
    }

    let dirX = targetX - this.position.x;
    let dirZ = targetZ - this.position.z;
    const targetDist = Math.hypot(dirX, dirZ);

    if (targetDist > 0.05) {
      let normX = dirX / targetDist;
      let normZ = dirZ / targetDist;

      // Soft repulsion against nearby tree trunks to glide around obstacles smoothly
      if (this.treeColliders && this.treeColliders.length > 0) {
        for (let i = 0; i < this.treeColliders.length; i++) {
          const tree = this.treeColliders[i];
          const tdx = this.position.x - tree.x;
          const tdz = this.position.z - tree.z;
          const tdist = Math.hypot(tdx, tdz);
          const avoidDist = tree.radius + 0.65;
          if (tdist < avoidDist && tdist > 0.01) {
            const push = (avoidDist - tdist) / avoidDist;
            normX += (tdx / tdist) * push * 1.5;
            normZ += (tdz / tdist) * push * 1.5;
          }
        }
        const newDist = Math.hypot(normX, normZ);
        if (newDist > 0.01) {
          normX /= newDist;
          normZ /= newDist;
        }
      }

      // Smooth rotation toward movement heading
      const targetAngle = Math.atan2(normX, normZ);
      this.rotationY = THREE.MathUtils.lerp(
        this.rotationY,
        targetAngle,
        Math.min(1, 14 * dt)
      );

      // Movement bursts forward while airborne in jump arc!
      const speedMultiplier = isAirborne
        ? Math.sin((cycle / 0.70) * Math.PI) * 1.85
        : 0.15;
      const moveStep = cfg.chaseSpeed * speedMultiplier * dt;
      let nextX = this.position.x + normX * moveStep;
      let nextZ = this.position.z + normZ * moveStep;

      // 1. Boundary Perimeter Containment (Pocong stays inside level bounds)
      const { cellSize, gridWidth, gridHeight } = this.levelDef!;
      const halfW = (gridWidth * cellSize) / 2;
      const halfH = (gridHeight * cellSize) / 2;
      const margin = this.collisionConfig ? this.collisionConfig.perimeterMargin : 1.2;

      nextX = Math.max(-halfW + margin, Math.min(halfW - margin, nextX));
      nextZ = Math.max(-halfH + margin, Math.min(halfH - margin, nextZ));

      // 1b. Bridge Gap Avoidance (Pocong cannot hop over missing plank hazards)
      if (this.bridges && this.bridges.length > 0) {
        for (let i = 0; i < this.bridges.length; i++) {
          const b = this.bridges[i];
          if (b.gapBox && b.gapBox.containsPoint(new THREE.Vector3(nextX, this.position.y, nextZ))) {
            nextX = this.position.x;
            nextZ = this.position.z;
            break;
          }
        }
      }

      // 2. Solid Grid Walls (Levels 2–10 only: sliding along classroom/corridor walls)
      const shouldUseGrid = this.collisionConfig ? this.collisionConfig.useGridWalls : false;
      if (shouldUseGrid) {
        const grid = (this.collisionConfig && this.collisionConfig.wallGrid) || this.effectiveGrid || this.levelDef!.grid;
        if (!this.testGridWallCollision(nextX, this.position.z, grid, cellSize, halfW, halfH)) {
          this.position.x = nextX;
        }
        if (!this.testGridWallCollision(this.position.x, nextZ, grid, cellSize, halfW, halfH)) {
          this.position.z = nextZ;
        }
      } else {
        // Open environments (Level 1): advance freely
        this.position.x = nextX;
        this.position.z = nextZ;
      }

      // 3. Cylinder Obstacle Sliding & Anti-Stick Resolution
      // Dynamic push-out guarantees Pocong glides around tree trunks/props and NEVER freezes in place!
      const cylinders = this.collisionConfig ? this.collisionConfig.cylinderColliders : this.treeColliders;
      for (let i = 0; i < cylinders.length; i++) {
        const c = cylinders[i];
        const cdx = this.position.x - c.x;
        const cdz = this.position.z - c.z;
        const cdist = Math.hypot(cdx, cdz);
        const minDist = c.radius + 0.35;
        if (cdist < minDist && cdist > 0.001) {
          this.position.x = c.x + (cdx / cdist) * minDist;
          this.position.z = c.z + (cdz / cdist) * minDist;
        }
      }
    }
  }

  // Grid Wall AABB test for structured indoor levels (Levels 2 to 10)
  private testGridWallCollision(
    wx: number,
    wz: number,
    grid: number[][],
    cellSize: number,
    halfW: number,
    halfH: number
  ): boolean {
    const monsterRadius = 0.45;
    const centerGx = Math.floor((wx + halfW) / cellSize);
    const centerGz = Math.floor((wz + halfH) / cellSize);
    const gridW = grid[0].length;
    const gridH = grid.length;

    for (let gz = centerGz - 1; gz <= centerGz + 1; gz++) {
      for (let gx = centerGx - 1; gx <= centerGx + 1; gx++) {
        if (gx < 0 || gx >= gridW || gz < 0 || gz >= gridH) return true;
        if (grid[gz][gx] === 1) {
          const minX = gx * cellSize - halfW;
          const maxX = (gx + 1) * cellSize - halfW;
          const minZ = gz * cellSize - halfH;
          const maxZ = (gz + 1) * cellSize - halfH;

          const closestX = Math.max(minX, Math.min(wx, maxX));
          const closestZ = Math.max(minZ, Math.min(wz, maxZ));
          if ((wx - closestX) ** 2 + (wz - closestZ) ** 2 < monsterRadius * monsterRadius) {
            return true;
          }
        }
      }
    }
    return false;
  }
}
