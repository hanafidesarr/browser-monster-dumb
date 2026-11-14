import * as THREE from 'three';
import { MonsterModel } from './MonsterModel.ts';
import { LevelDefinition, MonsterType } from '../level/LevelData.ts';
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
  // Post-hit grace period & melee distance constants
  public static readonly MELEE_ATTACK_DISTANCE = 2.40;  // Must be closer to monster to hit
  public static readonly HIT_REACTION_DURATION = 0.60;  // Stagger & recoil after hit
  public static readonly SCREAM_DURATION = 0.70;        // Enraged roar before chase
  public static readonly STAND_UP_DURATION = 0.50;      // Stance preparation
  public static readonly CATCH_GRACE_PERIOD = 1.80;     // Grace period in chase before player can be caught

  public id: string = 'pocong_1';
  public monsterType: MonsterType = 'pocong';
  public otherMonsters: MonsterController[] = [];
  public model: MonsterModel;
  public group: THREE.Group;
  public state: MonsterState = 'SITTING_IDLE';
  public isAwake: boolean = false;
  public isRangedTriggered: boolean = false;

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
  public isWallClinging: boolean = false;
  public wallClingY: number = 0;
  private wallAttachPos: THREE.Vector3 | null = null;
  private wallLandPos: THREE.Vector3 | null = null;
  private wallRoomDir: THREE.Vector3 = new THREE.Vector3(0, 0, 1);
  private knockbackStartPos: THREE.Vector3 | null = null;
  private knockbackTargetPos: THREE.Vector3 | null = null;

  public treeColliders: Array<{ x: number; z: number; radius: number }> = [];

  public setTreeColliders(colliders: Array<{ x: number; z: number; radius: number }>): void {
    this.treeColliders = colliders;
  }

  // Stealth detection tracking
  private detectionTimer: number = 0;
  public detectionPercent: number = 0; // 0 to 1 for HUD alert meter

  // State timers
  public stateTime: number = 0;
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

  constructor(monsterType: MonsterType = 'pocong') {
    this.monsterType = monsterType;
    this.id = `${monsterType}_1`;
    this.model = new MonsterModel(monsterType);
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

    if (level.monsterType) {
      this.monsterType = level.monsterType;
    } else if (level.id === 2) {
      this.monsterType = 'kunti';
    }

    // Recreate model if monsterType changed
    if (this.model.monsterType !== this.monsterType) {
      this.group.remove(this.model.innerGroup);
      this.model = new MonsterModel(this.monsterType);
      this.group.add(this.model.innerGroup);
    }

    if (this.monsterType === 'kunti') {
      AudioManager.getInstance().stopKuntiChaseAudio();
    }

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
    this.wallClingY = this.baseGroundY + 1.85;

    if (this.monsterType === 'kunti') {
      this.attachKuntiToWall(spawn);
    } else {
      this.isWallClinging = false;
      this.position.set(spawn.x, spawn.y || 0, spawn.z);
      this.rotationY = spawn.rotationY;
      this.group.position.copy(this.position);
      this.group.rotation.y = this.rotationY;
    }

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
    this.knockbackStartPos = null;
    this.knockbackTargetPos = null;
    this.model.applySittingPosture(0);
  }

  public getForwardVector(): THREE.Vector3 {
    return new THREE.Vector3(Math.sin(this.rotationY), 0, Math.cos(this.rotationY)).normalize();
  }

  // Cling Kuntilanak firmly onto the nearest solid wall before being hit
  private attachKuntiToWall(spawn: { x: number; y?: number; z: number; rotationY?: number }): void {
    const grid = this.effectiveGrid || (this.levelDef ? this.levelDef.grid : null);
    const cellSize = this.levelDef?.cellSize || 3.8;
    if (!grid) {
      this.position.set(spawn.x, this.wallClingY, spawn.z);
      this.rotationY = spawn.rotationY || 0;
      this.isWallClinging = true;
      this.group.position.copy(this.position);
      this.group.rotation.y = this.rotationY;
      return;
    }

    const gridW = grid[0].length;
    const gridH = grid.length;
    const halfW = (gridW * cellSize) / 2;
    const halfH = (gridH * cellSize) / 2;

    const currentCellX = Math.floor((spawn.x + halfW) / cellSize);
    const currentCellZ = Math.floor((spawn.z + halfH) / cellSize);

    interface WallCandidate {
      wallDist: number;
      x: number;
      z: number;
      rotY: number;
      roomDirX: number;
      roomDirZ: number;
    }
    const candidates: WallCandidate[] = [];

    const dirs = [
      { dir: 'EAST', dx: 1, dz: 0 },
      { dir: 'WEST', dx: -1, dz: 0 },
      { dir: 'NORTH', dx: 0, dz: -1 },
      { dir: 'SOUTH', dx: 0, dz: 1 },
    ];

    for (const d of dirs) {
      const maxSteps = Math.max(gridW, gridH);
      for (let step = 1; step <= maxSteps; step++) {
        const nx = currentCellX + d.dx * step;
        const nz = currentCellZ + d.dz * step;
        const isWall = nx < 0 || nx >= gridW || nz < 0 || nz >= gridH || grid[nz][nx] === 1;
        if (isWall) {
          if (d.dir === 'EAST') {
            const wallSurfaceX = nx * cellSize - halfW;
            candidates.push({
              wallDist: Math.abs(spawn.x - wallSurfaceX),
              x: wallSurfaceX - 0.16,
              z: spawn.z,
              rotY: -Math.PI / 2, // Facing west into the room
              roomDirX: -1,
              roomDirZ: 0,
            });
          } else if (d.dir === 'WEST') {
            const wallSurfaceX = (nx + 1) * cellSize - halfW;
            candidates.push({
              wallDist: Math.abs(spawn.x - wallSurfaceX),
              x: wallSurfaceX + 0.16,
              z: spawn.z,
              rotY: Math.PI / 2, // Facing east into the room
              roomDirX: 1,
              roomDirZ: 0,
            });
          } else if (d.dir === 'NORTH') {
            const wallSurfaceZ = (nz + 1) * cellSize - halfH;
            candidates.push({
              wallDist: Math.abs(spawn.z - wallSurfaceZ),
              x: spawn.x,
              z: wallSurfaceZ + 0.16,
              rotY: 0, // Facing south into the room
              roomDirX: 0,
              roomDirZ: 1,
            });
          } else if (d.dir === 'SOUTH') {
            const wallSurfaceZ = nz * cellSize - halfH;
            candidates.push({
              wallDist: Math.abs(spawn.z - wallSurfaceZ),
              x: spawn.x,
              z: wallSurfaceZ - 0.16,
              rotY: Math.PI, // Facing north into the room
              roomDirX: 0,
              roomDirZ: -1,
            });
          }
          break; // Stop at the first wall encountered in this direction
        }
      }
    }

    if (candidates.length > 0) {
      candidates.sort((a, b) => a.wallDist - b.wallDist);
      const chosen = candidates[0];
      this.position.set(chosen.x, this.wallClingY, chosen.z);
      this.rotationY = chosen.rotY;
      this.wallAttachPos = new THREE.Vector3(chosen.x, this.wallClingY, chosen.z);
      this.wallRoomDir.set(chosen.roomDirX, 0, chosen.roomDirZ).normalize();
      this.wallLandPos = new THREE.Vector3(
        chosen.x + chosen.roomDirX * 0.65,
        this.baseGroundY,
        chosen.z + chosen.roomDirZ * 0.65
      );
    } else {
      this.position.set(spawn.x, this.wallClingY, spawn.z);
      this.rotationY = spawn.rotationY || 0;
      this.wallAttachPos = new THREE.Vector3(spawn.x, this.wallClingY, spawn.z);
      this.wallLandPos = new THREE.Vector3(spawn.x, this.baseGroundY, spawn.z);
    }

    this.isWallClinging = true;
    this.group.position.copy(this.position);
    this.group.rotation.y = this.rotationY;
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

    // 3. True 3D & 2D Distance check (must be closer to monster to strike)
    const maxAttackDist = this.levelDef?.monsterConfig?.attackDistance || MonsterController.MELEE_ATTACK_DISTANCE;
    const monsterCenterY = this.monsterType === 'kunti' ? 0.45 : 0.9;
    const monsterCenter = new THREE.Vector3(this.position.x, this.position.y + monsterCenterY, this.position.z);
    const dist3D = playerPos.distanceTo(monsterCenter);
    const horizontalDist = Math.hypot(this.position.x - playerPos.x, this.position.z - playerPos.z);
    if (dist3D > maxAttackDist || horizontalDist > maxAttackDist) {
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

    const maxAttackDist = this.levelDef?.monsterConfig?.attackDistance || MonsterController.MELEE_ATTACK_DISTANCE;

    // 1. Precise raycast from crosshair against all monster meshes (head, body, shroud, face)
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    raycaster.far = maxAttackDist;
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
    const monsterCenterY = this.monsterType === 'kunti' ? 0.45 : 0.9;
    const monsterCenter = new THREE.Vector3(this.position.x, this.position.y + monsterCenterY, this.position.z);
    const dirToMonster = new THREE.Vector3().subVectors(monsterCenter, playerPos).normalize();

    // Striking arc facing monster
    if (playerForward.dot(dirToMonster) > 0.2) {
      return true;
    }

    return false;
  }

  // Called when player lands a hit with any weapon (melee, machine gun shot, or grenade explosion)
  public triggerWeaponHit(
    weaponDef: WeaponDefinition,
    hitOrigin?: THREE.Vector3,
    knockbackDist: number = 1.8,
    isRanged: boolean = false
  ): void {
    if (this.state !== 'SITTING_IDLE' || this.isAwake) return;

    this.isAwake = true;
    this.isRangedTriggered = isRanged || weaponDef.swingType === 'shoot' || weaponDef.swingType === 'throw';
    this.currentHitReaction = weaponDef.monsterReaction;
    this.state = 'HIT_REACTION';
    this.stateTime = 0;
    this.animProgress = 0;
    this.detectionPercent = 0;

    AudioManager.getInstance().playWeaponImpact(weaponDef.impactSound);
    // Monster shrieks immediately when struck or blasted!
    AudioManager.getInstance().playMonsterScream(this.monsterType);

    // Compute knockback impulse away from the blast or player origin
    if (knockbackDist > 0) {
      let knockDir = new THREE.Vector3();
      if (hitOrigin) {
        knockDir.subVectors(this.position, hitOrigin);
        knockDir.y = 0;
      }
      if (knockDir.lengthSq() < 0.0001) {
        knockDir = this.getForwardVector().negate();
      } else {
        knockDir.normalize();
      }

      const startPos = this.position.clone();
      this.knockbackStartPos = startPos;
      const rawTarget = startPos.clone().addScaledVector(knockDir, knockbackDist);

      // Verify and clamp against walkable grid / perimeter bounds
      if (this.pathfinding) {
        let safePos = startPos.clone();
        const steps = 10;
        for (let s = 1; s <= steps; s++) {
          const testPos = startPos.clone().addScaledVector(knockDir, (knockbackDist * s) / steps);
          const { gx, gz } = this.pathfinding.worldToGrid(testPos.x, testPos.z);
          if (this.pathfinding.isWalkable(gx, gz)) {
            safePos.copy(testPos);
          } else {
            break;
          }
        }
        this.knockbackTargetPos = safePos;
      } else {
        this.knockbackTargetPos = rawTarget;
      }

      // If Kuntilanak is wall-clinging, knock her loose from the wall out into the open room!
      if (this.monsterType === 'kunti' && this.isWallClinging && this.wallLandPos) {
        const roomDir = this.wallRoomDir.clone();
        const baseLand = this.wallLandPos.clone();
        let safeLand = baseLand.clone();
        if (this.pathfinding) {
          const steps = 10;
          for (let s = 1; s <= steps; s++) {
            const testPos = baseLand.clone().addScaledVector(roomDir, (knockbackDist * s) / steps);
            const { gx, gz } = this.pathfinding.worldToGrid(testPos.x, testPos.z);
            if (this.pathfinding.isWalkable(gx, gz)) {
              safeLand.copy(testPos);
            } else {
              break;
            }
          }
        } else {
          safeLand.addScaledVector(roomDir, knockbackDist);
        }
        this.wallLandPos.copy(safeLand);
        this.knockbackTargetPos = safeLand;
      }
    } else {
      this.knockbackStartPos = null;
      this.knockbackTargetPos = null;
    }
  }

  // Awakened by scream or alert of another monster
  public wakeUpAndChase(): void {
    if (this.state !== 'SITTING_IDLE' || this.isAwake) return;

    this.isAwake = true;
    if (this.isWallClinging) {
      this.isWallClinging = false;
      if (this.wallLandPos) {
        this.position.copy(this.wallLandPos);
      } else {
        this.position.y = this.baseGroundY;
      }
    }
    this.state = this.monsterType === 'kunti' ? 'CHASE' : 'STAND_UP';
    this.stateTime = 0;
    this.animProgress = 0;
    this.detectionPercent = 0;
    if (this.monsterType === 'kunti') {
      AudioManager.getInstance().startKuntiChaseAudio();
      if (this.onChaseStarted) {
        this.onChaseStarted();
      }
    }
  }

  // Legacy wrapper for baseball bat strike
  public triggerBatHit(): void {
    this.triggerWeaponHit(WEAPON_MAP['baseball_bat']);
  }

  public update(dt: number, totalTime: number, playerPos: THREE.Vector3, isChasePhase: boolean = false): void {
    if (!this.levelDef || !this.pathfinding) return;

    // HARD GUARD: Pocong is asleep and motionless until struck with the bat!
    if (!this.isAwake) {
      this.state = 'SITTING_IDLE';
      this.updateSittingIdle(dt, totalTime, playerPos, isChasePhase);
      this.group.position.copy(this.position);
      this.group.rotation.y = this.rotationY;
      return;
    }

    this.stateTime += dt;

    switch (this.state) {
      case 'SITTING_IDLE':
        this.updateSittingIdle(dt, totalTime, playerPos, isChasePhase);
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
  // In stealth phase (before attack), monster NEVER awakens on vision/proximity without weapon strike.
  // In chase phase (after at least one monster struck), un-struck monsters awaken if player approaches.
  private updateSittingIdle(dt: number, totalTime: number, playerPos: THREE.Vector3, isChasePhase: boolean = false): void {
    this.model.applySittingPosture(totalTime);
    if (this.monsterType === 'kunti' && this.isWallClinging) {
      this.position.y = this.wallClingY;
    } else {
      this.position.y = this.baseGroundY;
    }

    if (!this.levelDef) return;

    // RULE: Before any monster is struck with a weapon, monster stays resting and cannot awaken from proximity/vision.
    if (!isChasePhase) {
      this.detectionTimer = 0;
      this.detectionPercent = 0;
      return;
    }

    const cfg = this.levelDef.monsterConfig;

    const horizontalDist = Math.hypot(this.position.x - playerPos.x, this.position.z - playerPos.z);
    const verticalDist = Math.abs((playerPos.y - 1.65) - this.baseGroundY);

    // Frontal Detection & Proximity Awakening (strictly floor-aware)
    let isDetected = false;

    // Floor separation guard: monster cannot detect through solid floors/ceilings
    if (verticalDist <= 1.75) {
      // 1. Physical proximity: player bumps into or steps right next to sleeping monster (< 2.2m)
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
    }

    if (isDetected) {
      this.detectionTimer += dt;
      const delay = cfg.reactionDelaySeconds || 0.65;
      this.detectionPercent = Math.min(1, this.detectionTimer / delay);

      if (this.detectionTimer >= delay) {
        // Monster awakens, screams, and begins chase!
        this.isAwake = true;
        this.state = 'SCREAM';
        this.stateTime = 0;
        this.animProgress = 0;
        this.detectionPercent = 1;
        AudioManager.getInstance().playMonsterScream(this.monsterType);
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
    const hitDuration = MonsterController.HIT_REACTION_DURATION;
    this.animProgress = Math.min(1.0, this.stateTime / hitDuration);
    this.model.applyHitReaction(this.animProgress, this.currentHitReaction);

    // Apply knockback displacement with an ease-out curve for ground-standing monsters
    if (this.knockbackStartPos && this.knockbackTargetPos && (!this.isWallClinging || this.monsterType !== 'kunti')) {
      const easeOut = 1 - Math.pow(1 - this.animProgress, 2);
      this.position.x = THREE.MathUtils.lerp(this.knockbackStartPos.x, this.knockbackTargetPos.x, easeOut);
      this.position.z = THREE.MathUtils.lerp(this.knockbackStartPos.z, this.knockbackTargetPos.z, easeOut);
    }

    // If Kuntilanak was clinging to the wall, she drops and steps forward out to the open floor!
    if (this.monsterType === 'kunti' && this.isWallClinging) {
      const dropProgress = Math.pow(this.animProgress, 1.6);
      if (this.wallAttachPos && this.wallLandPos) {
        this.position.x = THREE.MathUtils.lerp(this.wallAttachPos.x, this.wallLandPos.x, dropProgress);
        this.position.y = THREE.MathUtils.lerp(this.wallAttachPos.y, this.wallLandPos.y, dropProgress);
        this.position.z = THREE.MathUtils.lerp(this.wallAttachPos.z, this.wallLandPos.z, dropProgress);
      } else {
        this.position.y = THREE.MathUtils.lerp(this.wallClingY, this.baseGroundY, dropProgress);
      }

      if (this.animProgress >= 1.0) {
        if (this.wallLandPos) {
          this.position.copy(this.wallLandPos);
        } else {
          this.position.y = this.baseGroundY;
        }
        this.isWallClinging = false;
      }
    }

    if (this.stateTime >= hitDuration) {
      this.isWallClinging = false;
      if (this.wallLandPos) {
        this.position.copy(this.wallLandPos);
      } else if (this.knockbackTargetPos) {
        this.position.x = this.knockbackTargetPos.x;
        this.position.z = this.knockbackTargetPos.z;
        this.position.y = this.baseGroundY;
      } else {
        this.position.y = this.baseGroundY;
      }
      this.state = 'SCREAM';
      this.stateTime = 0;
      this.animProgress = 0;
      AudioManager.getInstance().playMonsterScream(this.monsterType);
    }
  }

  // 4. SCREAM (Unhinged jaw, shriek)
  private updateScream(dt: number, totalTime: number): void {
    const screamDuration = MonsterController.SCREAM_DURATION;
    this.animProgress = Math.min(1.0, this.stateTime / screamDuration);
    this.model.applyScream(this.animProgress, totalTime);

    if (this.stateTime >= screamDuration) {
      if (this.monsterType === 'kunti') {
        // Kuntilanak: drops straight into fast crawl chase immediately after scream!
        this.state = 'CHASE';
        this.stateTime = 0;
        this.hopTimer = 0;
        this.pathRecalcTimer = 0.35;
        AudioManager.getInstance().startKuntiChaseAudio();
        if (this.onChaseStarted) {
          this.onChaseStarted();
        }
      } else {
        this.state = 'STAND_UP';
        this.stateTime = 0;
        this.animProgress = 0;
      }
    }
  }

  // 5. STAND_UP (Rises to towering height)
  private updateStandUp(dt: number): void {
    const standDuration = MonsterController.STAND_UP_DURATION;
    this.animProgress = Math.min(1.0, this.stateTime / standDuration);
    this.model.applyStandUp(this.animProgress);

    if (this.stateTime >= standDuration) {
      this.state = 'CHASE';
      this.stateTime = 0;
      this.hopTimer = 0;
      this.pathRecalcTimer = 0.35;
      if (this.monsterType === 'kunti') {
        AudioManager.getInstance().startKuntiChaseAudio();
      }
      if (this.onChaseStarted) {
        this.onChaseStarted();
      }
    }
  }

  // 6. CHASE (Pocong Hopping / Kuntilanak Merangkak Navigation)
  private updateChase(dt: number, totalTime: number, playerPos: THREE.Vector3): void {
    const cfg = this.levelDef!.monsterConfig;

    // Use 2D horizontal distance on the floor
    const horizontalDist = Math.hypot(this.position.x - playerPos.x, this.position.z - playerPos.z);

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

    let isAirborne = false;
    let cycle = 0;

    // Sprint boost for ranged attacks (grenade or machine gun):
    // Monster sprints significantly faster (1.55x) for the first 5.0 seconds to close the distance gap!
    const sprintBoost = (this.isRangedTriggered && this.stateTime < 5.0)
      ? THREE.MathUtils.lerp(1.55, 1.0, this.stateTime / 5.0)
      : 1.0;

    if (this.monsterType === 'kunti') {
      // Kuntilanak: mengejar dengan cara merangkak (crawls flush along the floor/stairs)
      this.position.y = this.baseGroundY;
      this.model.applyCrawl(dt, cfg.chaseSpeed * sprintBoost);
      AudioManager.getInstance().playKuntiCrawl(horizontalDist);
      AudioManager.getInstance().updateKuntiChaseAudio(horizontalDist);
    } else {
      // Pocong: Hopping Rhythm Cycle (parabolic airborne leaping)
      const hopDuration = 0.52 / Math.min(1.35, sprintBoost); // each jump cycle takes ~0.52s, quickened during sprint
      this.hopTimer += dt;
      cycle = (this.hopTimer % hopDuration) / hopDuration; // 0.0 to 1.0
      isAirborne = cycle < 0.70;

      // Heavy landing impact thud on ground contact
      if (this.wasAirborne && !isAirborne) {
        AudioManager.getInstance().playPocongHop(horizontalDist);
      }
      this.wasAirborne = isAirborne;

      // Vertical parabolic jump height (up to 0.95m high in air!)
      if (isAirborne) {
        const airP = cycle / 0.70;
        this.position.y = this.baseGroundY + Math.sin(airP * Math.PI) * 0.95;
      } else {
        this.position.y = this.baseGroundY;
      }

      // Animate the pocong body (forward pitch in air, squash on landing)
      this.model.applyHopAnimation(cycle, isAirborne);
    }

    // Check catch distance (grace period: CATCH_GRACE_PERIOD seconds after chase begins so player can turn and sprint)
    const catchDist = Math.max(1.5, cfg.catchDistance);
    if (this.stateTime > MonsterController.CATCH_GRACE_PERIOD && horizontalDist <= catchDist) {
      this.state = 'CATCH_PLAYER';
      this.position.y = this.baseGroundY + (this.monsterType === 'kunti' ? 0.05 : 0.15);
      if (this.monsterType === 'kunti') {
        AudioManager.getInstance().stopKuntiChaseAudio();
        AudioManager.getInstance().playKuntiSound(true);
      } else {
        AudioManager.getInstance().playCaughtStinger();
      }
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

      // Movement speed: continuous smooth crawl for Kunti, hopping bursts for Pocong
      // Smooth initial acceleration over first 1.2s for melee; instant explosive pursuit for ranged attacks!
      const accel = this.isRangedTriggered
        ? 1.0
        : Math.min(1.0, 0.45 + (this.stateTime / 1.2) * 0.55);
      const baseSpeedMultiplier = (this.monsterType === 'kunti'
        ? 1.0
        : (isAirborne ? Math.sin((cycle / 0.70) * Math.PI) * 1.85 : 0.15));
      const speedMultiplier = baseSpeedMultiplier * accel * sprintBoost;
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
        if (!this.testGridWallCollision(nextX, this.position.z, grid, cellSize, halfW, halfH, this.position.x, this.position.z)) {
          this.position.x = nextX;
        }
        if (!this.testGridWallCollision(this.position.x, nextZ, grid, cellSize, halfW, halfH, this.position.x, this.position.z)) {
          this.position.z = nextZ;
        }

        // Automatic wall push-out resolution so monster NEVER gets pinned or stuck inside boundary margin
        const curCenterGx = Math.floor((this.position.x + halfW) / cellSize);
        const curCenterGz = Math.floor((this.position.z + halfH) / cellSize);
        const safeMargin = 0.40;
        for (let gz = curCenterGz - 1; gz <= curCenterGz + 1; gz++) {
          for (let gx = curCenterGx - 1; gx <= curCenterGx + 1; gx++) {
            if (gx >= 0 && gx < grid[0].length && gz >= 0 && gz < grid.length && grid[gz][gx] === 1) {
              const minX = gx * cellSize - halfW;
              const maxX = (gx + 1) * cellSize - halfW;
              const minZ = gz * cellSize - halfH;
              const maxZ = (gz + 1) * cellSize - halfH;
              const closestX = Math.max(minX, Math.min(this.position.x, maxX));
              const closestZ = Math.max(minZ, Math.min(this.position.z, maxZ));
              const pushDx = this.position.x - closestX;
              const pushDz = this.position.z - closestZ;
              const pushDist = Math.hypot(pushDx, pushDz);
              if (pushDist < safeMargin && pushDist > 0.0001) {
                this.position.x = closestX + (pushDx / pushDist) * safeMargin;
                this.position.z = closestZ + (pushDz / pushDist) * safeMargin;
              }
            }
          }
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
        if (c.minY !== undefined && c.maxY !== undefined) {
          if (this.position.y < c.minY - 0.5 || this.position.y > c.maxY + 1.5) {
            continue;
          }
        }
        const cdx = this.position.x - c.x;
        const cdz = this.position.z - c.z;
        const cdist = Math.hypot(cdx, cdz);
        const minDist = c.radius + 0.35;
        if (cdist < minDist && cdist > 0.001) {
          this.position.x = c.x + (cdx / cdist) * minDist;
          this.position.z = c.z + (cdz / cdist) * minDist;
        }
      }

      // 4. Multi-Monster Mutual Separation / Local Avoidance
      if (this.otherMonsters && this.otherMonsters.length > 1) {
        const separationRadius = 1.35;
        for (let i = 0; i < this.otherMonsters.length; i++) {
          const other = this.otherMonsters[i];
          if (other === this) continue;
          if (Math.abs(this.position.y - other.position.y) < 1.8) {
            const mdx = this.position.x - other.position.x;
            const mdz = this.position.z - other.position.z;
            const mdist = Math.hypot(mdx, mdz);
            if (mdist < separationRadius && mdist > 0.001) {
              const push = ((separationRadius - mdist) / separationRadius) * 2.2 * dt;
              this.position.x += (mdx / mdist) * push;
              this.position.z += (mdz / mdist) * push;
            }
          }
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
    halfH: number,
    curX?: number,
    curZ?: number
  ): boolean {
    const monsterRadius = 0.40;
    const centerGx = Math.floor((wx + halfW) / cellSize);
    const centerGz = Math.floor((wz + halfH) / cellSize);
    const gridW = grid[0].length;
    const gridH = grid.length;

    let minDistanceSq = Infinity;
    let minCurDistanceSq = Infinity;

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
          const distSq = (wx - closestX) ** 2 + (wz - closestZ) ** 2;
          if (distSq < minDistanceSq) {
            minDistanceSq = distSq;
          }

          if (curX !== undefined && curZ !== undefined) {
            const curClosestX = Math.max(minX, Math.min(curX, maxX));
            const curClosestZ = Math.max(minZ, Math.min(curZ, maxZ));
            const curDistSq = (curX - curClosestX) ** 2 + (curZ - curClosestZ) ** 2;
            if (curDistSq < minCurDistanceSq) {
              minCurDistanceSq = curDistSq;
            }
          }
        }
      }
    }

    if (minDistanceSq < monsterRadius * monsterRadius) {
      // Anti-pin rule: If moving from (curX, curZ) to (wx, wz) increases distance from the wall (moving away), allow it!
      if (curX !== undefined && curZ !== undefined && minDistanceSq > minCurDistanceSq) {
        return false;
      }
      return true;
    }
    return false;
  }
}
