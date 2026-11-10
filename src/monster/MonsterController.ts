import * as THREE from 'three';
import { MonsterModel } from './MonsterModel.ts';
import { LevelDefinition } from '../level/LevelData.ts';
import { GridPathfinding, Point2D } from '../pathfinding/GridPathfinding.ts';
import { AudioManager } from '../core/AudioManager.ts';

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

  public position: THREE.Vector3 = new THREE.Vector3();
  public rotationY: number = 0; // facing direction

  private levelDef: LevelDefinition | null = null;
  private pathfinding: GridPathfinding | null = null;

  // Stealth detection tracking
  private detectionTimer: number = 0;
  public detectionPercent: number = 0; // 0 to 1 for HUD alert meter

  // State timers
  private stateTime: number = 0;
  private animProgress: number = 0;

  // Pathfinding waypoints
  private currentPath: Point2D[] = [];
  private pathRecalcTimer: number = 0;
  private footstepTimer: number = 0;

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
    spawn: { x: number; y: number; z: number; rotationY: number }
  ): void {
    this.levelDef = level;
    this.pathfinding = pathfinding;

    this.position.set(spawn.x, 0, spawn.z);
    this.rotationY = spawn.rotationY;
    this.group.position.copy(this.position);
    this.group.rotation.y = this.rotationY;

    this.state = 'SITTING_IDLE';
    this.detectionTimer = 0;
    this.detectionPercent = 0;
    this.stateTime = 0;
    this.animProgress = 0;
    this.currentPath = [];
    this.model.applySittingPosture(0);
  }

  public getForwardVector(): THREE.Vector3 {
    return new THREE.Vector3(Math.sin(this.rotationY), 0, Math.cos(this.rotationY)).normalize();
  }

  // Check if player meets all Rear Contextual Attack criteria
  public canBeAttackedFromBehind(playerPos: THREE.Vector3): boolean {
    if (this.state !== 'SITTING_IDLE' || !this.levelDef || !this.pathfinding) {
      return false;
    }

    // Use 2D horizontal distance (floor distance) so player camera eye height does not reduce striking range
    const horizontalDist = Math.hypot(this.position.x - playerPos.x, this.position.z - playerPos.z);
    if (horizontalDist > this.levelDef.monsterConfig.attackDistance) {
      return false;
    }

    // Line of sight check: cannot attack through wall
    if (!this.pathfinding.hasLineOfSight(this.position.x, this.position.z, playerPos.x, playerPos.z)) {
      return false;
    }

    // Monster forward vector
    const forward = this.getForwardVector();
    // Direction from monster to player
    const dirToPlayer = new THREE.Vector3()
      .subVectors(playerPos, this.position)
      .setY(0)
      .normalize();

    // Dot product: Behind means opposite of forward
    // For 110 degree rear angle: dot < -cos(55 deg) = -0.57
    const dot = forward.dot(dirToPlayer);
    const rearThreshold = -Math.cos(((this.levelDef.monsterConfig.rearAttackAngleDeg / 2) * Math.PI) / 180);

    return dot <= rearThreshold;
  }

  // Called when player lands successful bat hit
  public triggerBatHit(): void {
    if (this.state !== 'SITTING_IDLE') return;

    this.state = 'HIT_REACTION';
    this.stateTime = 0;
    this.animProgress = 0;
    this.detectionPercent = 0;

    AudioManager.getInstance().playBatImpact();
  }

  public update(dt: number, totalTime: number, playerPos: THREE.Vector3): void {
    if (!this.levelDef || !this.pathfinding) return;

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

  // 1. SITTING_IDLE with FOV Stealth Detection
  private updateSittingIdle(dt: number, totalTime: number, playerPos: THREE.Vector3): void {
    this.model.applySittingPosture(totalTime);

    const dist = this.position.distanceTo(playerPos);
    const cfg = this.levelDef!.monsterConfig;

    let isDetectedInFov = false;

    if (dist <= cfg.detectionDistance) {
      // 90-degree total FOV check (45 deg each side)
      const forward = this.getForwardVector();
      const dirToPlayer = new THREE.Vector3()
        .subVectors(playerPos, this.position)
        .setY(0)
        .normalize();

      const dot = forward.dot(dirToPlayer);
      const halfFovRad = ((cfg.detectionFovDeg / 2) * Math.PI) / 180;
      const cosThreshold = Math.cos(halfFovRad);

      if (dot >= cosThreshold) {
        // Wall obstruction check: monster CANNOT see through walls
        if (this.pathfinding!.hasLineOfSight(this.position.x, this.position.z, playerPos.x, playerPos.z)) {
          isDetectedInFov = true;
        }
      }
    }

    if (isDetectedInFov) {
      this.detectionTimer += dt;
      this.detectionPercent = Math.min(1, this.detectionTimer / cfg.reactionDelaySeconds);

      if (this.detectionTimer >= cfg.reactionDelaySeconds) {
        // Detected! Trigger Game Over sequence
        this.state = 'DETECT_PLAYER';
        this.stateTime = 0;
        AudioManager.getInstance().playCaughtStinger();
        if (this.onPlayerDetected) {
          this.onPlayerDetected();
        }
      }
    } else {
      // Decay detection meter
      this.detectionTimer = Math.max(0, this.detectionTimer - dt * 1.5);
      this.detectionPercent = Math.min(1, this.detectionTimer / cfg.reactionDelaySeconds);
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

  // 3. HIT_REACTION (Head snaps forward from bat hit)
  private updateHitReaction(dt: number): void {
    const hitDuration = 0.35;
    this.animProgress = this.stateTime / hitDuration;
    this.model.applyHitReaction(this.animProgress);

    if (this.stateTime >= hitDuration) {
      this.state = 'SCREAM';
      this.stateTime = 0;
      this.animProgress = 0;
      AudioManager.getInstance().playMonsterScream();
    }
  }

  // 4. SCREAM (Unhinged jaw, shriek)
  private updateScream(dt: number, totalTime: number): void {
    const screamDuration = 0.95;
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
    const standDuration = 0.75;
    this.animProgress = this.stateTime / standDuration;
    this.model.applyStandUp(this.animProgress);

    if (this.stateTime >= standDuration) {
      this.state = 'CHASE';
      this.stateTime = 0;
      this.pathRecalcTimer = 0;
      if (this.onChaseStarted) {
        this.onChaseStarted();
      }
    }
  }

  // 6. CHASE (A* corridor navigation tracking player)
  private updateChase(dt: number, totalTime: number, playerPos: THREE.Vector3): void {
    const cfg = this.levelDef!.monsterConfig;
    const distToPlayer = this.position.distanceTo(playerPos);

    // Footsteps with distance attenuation
    this.footstepTimer += dt;
    if (this.footstepTimer >= 0.35) {
      this.footstepTimer = 0;
      AudioManager.getInstance().playMonsterFootstep(distToPlayer);
    }

    // Check catch distance
    if (distToPlayer <= cfg.catchDistance) {
      this.state = 'CATCH_PLAYER';
      AudioManager.getInstance().playCaughtStinger();
      if (this.onPlayerCaught) {
        this.onPlayerCaught();
      }
      return;
    }

    // Recalculate A* path every 0.35 seconds
    this.pathRecalcTimer += dt;
    if (this.pathRecalcTimer >= 0.35 || this.currentPath.length === 0) {
      this.pathRecalcTimer = 0;
      const path = this.pathfinding!.findPath(
        { x: this.position.x, z: this.position.z },
        { x: playerPos.x, z: playerPos.z }
      );
      if (path.length > 1) {
        // Drop the current tile waypoint
        this.currentPath = path.slice(1);
      } else {
        this.currentPath = path;
      }
    }

    // Navigate toward next waypoint
    if (this.currentPath.length > 0) {
      const targetWp = this.currentPath[0];
      const dirX = targetWp.x - this.position.x;
      const dirZ = targetWp.z - this.position.z;
      const wpDist = Math.hypot(dirX, dirZ);

      if (wpDist < 0.35) {
        // Waypoint reached, advance
        this.currentPath.shift();
      } else {
        // Move toward waypoint
        const normX = dirX / wpDist;
        const normZ = dirZ / wpDist;

        // Smooth rotation
        const targetAngle = Math.atan2(normX, normZ);
        this.rotationY = THREE.MathUtils.lerp(
          this.rotationY,
          targetAngle,
          Math.min(1, 14 * dt)
        );

        const moveStep = cfg.chaseSpeed * dt;
        this.position.x += normX * moveStep;
        this.position.z += normZ * moveStep;
      }
    }

    this.model.applyRun(totalTime, cfg.chaseSpeed);
  }
}
