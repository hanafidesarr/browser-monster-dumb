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
  public isAwake: boolean = false;

  public position: THREE.Vector3 = new THREE.Vector3();
  public rotationY: number = 0; // facing direction

  private levelDef: LevelDefinition | null = null;
  private pathfinding: GridPathfinding | null = null;
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
    spawn: { x: number; y: number; z: number; rotationY: number }
  ): void {
    this.levelDef = level;
    this.pathfinding = pathfinding;

    this.position.set(spawn.x, 0, spawn.z);
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

  // Check if monster can be attacked (near monster proximity for UI prompt)
  public canBeAttackedFromBehind(playerPos: THREE.Vector3): boolean {
    if (this.state !== 'SITTING_IDLE' || this.isAwake) return false;
    const horizontalDist = Math.hypot(this.position.x - playerPos.x, this.position.z - playerPos.z);
    return horizontalDist <= 5.0;
  }

  // Check if player's swing hits ANY part of the monster's body
  // The monster ONLY wakes up and chases when struck by the bat!
  public isHitByPlayerSwing(camera: THREE.Camera, playerPos: THREE.Vector3, playerForward: THREE.Vector3): boolean {
    if (this.state !== 'SITTING_IDLE' || this.isAwake) return false;

    // Melee striking range check (within 5.0 meters)
    const horizontalDist = Math.hypot(this.position.x - playerPos.x, this.position.z - playerPos.z);
    if (horizontalDist > 5.0) {
      return false;
    }

    // 1. Precise raycast from crosshair against all monster meshes (head, body, shroud, face)
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    raycaster.far = 5.0;
    const hits = raycaster.intersectObjects(this.group.children, true);
    if (hits.length > 0) {
      return true;
    }

    // 2. Proximity strike (within 5.0m and looking generally towards monster)
    const dirToMonster = new THREE.Vector3(
      this.position.x - playerPos.x,
      0,
      this.position.z - playerPos.z
    ).normalize();

    // Generous striking arc facing Pocong
    if (playerForward.dot(dirToMonster) > -0.25) {
      return true;
    }

    return false;
  }

  // Called when player lands successful bat hit
  public triggerBatHit(): void {
    if (this.state !== 'SITTING_IDLE' || this.isAwake) return;

    this.isAwake = true;
    this.state = 'HIT_REACTION';
    this.stateTime = 0;
    this.animProgress = 0;
    this.detectionPercent = 0;

    AudioManager.getInstance().playBatImpact();
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

  // 1. SITTING_IDLE: Monster is sleeping motionless on the floor.
  // It will ONLY wake up and chase if struck by the player.
  // The player will never be attacked before striking!
  private updateSittingIdle(dt: number, totalTime: number, playerPos: THREE.Vector3): void {
    this.model.applySittingPosture(totalTime);
    this.detectionPercent = 0;
    this.detectionTimer = 0;
    this.position.y = 0;
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
    const hitDuration = 0.18;
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

    // Vertical parabolic jump height (up to 0.95m high in air!)
    if (isAirborne) {
      const airP = cycle / 0.70;
      this.position.y = Math.sin(airP * Math.PI) * 0.95;
    } else {
      this.position.y = 0;
    }

    // Animate the pocong body (forward pitch in air, squash on landing)
    this.model.applyHopAnimation(cycle, isAirborne);

    // Check catch distance (grace period: 0.8s after chase begins so player can turn and sprint)
    const catchDist = Math.max(1.5, cfg.catchDistance);
    if (this.stateTime > 0.8 && horizontalDist <= catchDist) {
      this.state = 'CATCH_PLAYER';
      this.position.y = 0.15;
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
        : 0.1;
      const moveStep = cfg.chaseSpeed * speedMultiplier * dt;
      this.position.x += normX * moveStep;
      this.position.z += normZ * moveStep;
    }
  }
}
