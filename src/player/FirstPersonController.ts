import * as THREE from 'three';
import { InputManager } from '../core/InputManager.ts';
import { AudioManager } from '../core/AudioManager.ts';
import { WeaponController } from './WeaponController.ts';
import { LevelDefinition } from '../level/LevelData.ts';
import { GridPathfinding } from '../pathfinding/GridPathfinding.ts';
import {
  LevelCollisionConfig,
  WorldRamp,
  WorldBridge,
  StairwellOpening,
} from '../level/LevelCollisionConfig.ts';

export class FirstPersonController {
  public camera: THREE.PerspectiveCamera;
  public weapon: WeaponController;
  public position: THREE.Vector3;
  public playerLight: THREE.PointLight;
  private yaw: number = 0;
  private pitch: number = 0;
  private playerRadius: number = 0.38;
  private playerHeight: number = 1.65;

  // Monster Obstacle Collision (Prevents ghost-walking through monster during stealth)
  private monsterObstacle: THREE.Vector3 | null = null;
  private monsterRadius: number = 0.65;

  public treeColliders: Array<{ x: number; z: number; radius: number }> = [];
  public collisionConfig: LevelCollisionConfig | null = null;

  public setTreeColliders(colliders: Array<{ x: number; z: number; radius: number }>): void {
    this.treeColliders = colliders;
  }

  public setMonsterObstacle(pos: THREE.Vector3 | null): void {
    this.monsterObstacle = pos;
  }

  private velocity: THREE.Vector3 = new THREE.Vector3();
  private isMoving: boolean = false;
  private isSprinting: boolean = false;
  private footstepTimer: number = 0;
  private headBobTimer: number = 0;

  // Multi-Floor, Stairs, Bridges & Fall System
  private ramps: WorldRamp[] = [];
  private bridges: WorldBridge[] = [];
  private stairOpenings: StairwellOpening[] = [];
  private floorCount: number = 1;
  private floorHeight: number = 3.8;
  private effectiveGrid: number[][] | null = null;
  private verticalVelocity: number = 0;
  private isGrounded: boolean = true;
  public currentFloor: number = 0;
  public onFatalFall: (() => void) | null = null;

  private levelDef: LevelDefinition | null = null;
  private pathfinding: GridPathfinding | null = null;
  private isEnabled: boolean = false;

  constructor() {
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(0, this.playerHeight, 0);

    this.position = new THREE.Vector3(0, this.playerHeight, 0);
    this.weapon = new WeaponController();
    this.camera.add(this.weapon.group);

    // Player personal light
    this.playerLight = new THREE.PointLight(0xfff5e6, 1.5, 10, 1.4);
    this.playerLight.position.set(0, -0.15, 0.1);
    this.camera.add(this.playerLight);
  }

  public setLevel(
    level: LevelDefinition,
    pathfinding: GridPathfinding,
    spawnPos: { x: number; y: number; z: number; rotationY: number },
    collisionConfigOrGrid?: LevelCollisionConfig | number[][],
    ramps: WorldRamp[] = [],
    bridges: WorldBridge[] = [],
    floorCount: number = 1,
    floorHeight: number = 3.8,
    stairOpenings: StairwellOpening[] = []
  ): void {
    this.levelDef = level;
    this.pathfinding = pathfinding;

    if (collisionConfigOrGrid && 'environmentId' in collisionConfigOrGrid) {
      this.collisionConfig = collisionConfigOrGrid as LevelCollisionConfig;
      this.ramps = this.collisionConfig.ramps;
      this.bridges = this.collisionConfig.bridges;
      this.stairOpenings = this.collisionConfig.stairOpenings;
      this.floorCount = this.collisionConfig.floorCount;
      this.floorHeight = this.collisionConfig.floorHeight;
      this.treeColliders = this.collisionConfig.cylinderColliders;
      this.effectiveGrid = this.collisionConfig.wallGrid || null;
    } else {
      this.collisionConfig = null;
      this.effectiveGrid = (collisionConfigOrGrid as number[][]) || level.grid;
      this.ramps = ramps;
      this.bridges = bridges;
      this.stairOpenings = stairOpenings;
      this.floorCount = floorCount;
      this.floorHeight = floorHeight;
    }

    this.verticalVelocity = 0;
    this.isGrounded = true;
    this.currentFloor = 0;

    this.position.set(spawnPos.x, spawnPos.y || this.playerHeight, spawnPos.z);
    this.yaw = spawnPos.rotationY;
    this.pitch = 0;
    this.velocity.set(0, 0, 0);
    this.updateCameraTransform();
    this.weapon.reset();

    // Level-specific player light configuration
    if (level.id === 1) {
      // Level 1 Haunted Banana Garden: Wide player-centered atmospheric illumination
      // Illuminates surrounding banana trees, ground, obstacles with natural falloff
      this.playerLight.color.setHex(0xfff3db);
      this.playerLight.intensity = 2.4;
      this.playerLight.distance = 28.0;
      this.playerLight.decay = 1.15;
      this.playerLight.position.set(0, 0.35, 0.15);
    } else {
      // Preserved default for Levels 2-10
      this.playerLight.color.setHex(0xfff5e6);
      this.playerLight.intensity = 1.5;
      this.playerLight.distance = 10;
      this.playerLight.decay = 1.4;
      this.playerLight.position.set(0, -0.15, 0.1);
    }
  }

  public setLookAngles(yaw: number, pitch: number): void {
    this.yaw = yaw;
    this.pitch = pitch;
    this.updateCameraTransform();
  }

  public setCollisionConfig(config: LevelCollisionConfig): void {
    this.collisionConfig = config;
    this.ramps = config.ramps;
    this.bridges = config.bridges;
    this.stairOpenings = config.stairOpenings;
    this.floorCount = config.floorCount;
    this.floorHeight = config.floorHeight;
    this.treeColliders = config.cylinderColliders;
    this.effectiveGrid = config.wallGrid || null;
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.velocity.set(0, 0, 0);
      this.isMoving = false;
    }
  }

  public update(dt: number, totalTime: number): void {
    if (!this.isEnabled) {
      this.weapon.update(dt, false, false, totalTime);
      return;
    }

    const inputMgr = InputManager.getInstance();

    // 1. Look rotation (mouse + touch)
    const { dx, dy } = inputMgr.consumeLookDelta();
    this.yaw -= dx;
    this.pitch -= dy;
    // Clamp pitch between -85 and +85 degrees
    const maxPitch = (85 * Math.PI) / 180;
    this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));

    // 2. Movement
    const moveInput = inputMgr.getMovementInput();
    const hasInput = Math.abs(moveInput.forward) > 0.05 || Math.abs(moveInput.right) > 0.05;
    this.isSprinting = moveInput.isSprinting && (moveInput.forward > 0.05 || Math.abs(moveInput.right) > 0.05);

    const targetSpeed = this.isSprinting
      ? (this.levelDef?.playerConfig.sprintSpeed || 6.0)
      : (this.levelDef?.playerConfig.walkSpeed || 3.8);

    // Compute forward & right vectors based on yaw only (stay grounded)
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    const moveDir = new THREE.Vector3()
      .addScaledVector(forward, moveInput.forward)
      .addScaledVector(right, moveInput.right);

    if (moveDir.lengthSq() > 1) {
      moveDir.normalize();
    }

    const targetVel = moveDir.multiplyScalar(targetSpeed);

    // Smooth acceleration & friction
    const accelRate = hasInput ? 18.0 : 22.0;
    this.velocity.x = THREE.MathUtils.lerp(this.velocity.x, targetVel.x, accelRate * dt);
    this.velocity.z = THREE.MathUtils.lerp(this.velocity.z, targetVel.z, accelRate * dt);

    const horizontalSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    this.isMoving = horizontalSpeed > 0.2;

    // 3. Wall Collision & Sliding Resolution
    this.resolveWallCollisions(dt);

    // 4. Elevation, Ramps, Bridges, & Fall Physics
    this.updateVerticalPhysics(dt, totalTime);

    // 5. Head Bobbing & Footsteps
    let headBobOffset = 0;
    if (this.isMoving && this.isGrounded) {
      const stepRate = this.isSprinting ? 0.32 : 0.48;
      this.footstepTimer += dt;
      if (this.footstepTimer >= stepRate) {
        this.footstepTimer = 0;
        AudioManager.getInstance().playPlayerFootstep(this.isSprinting);
      }

      this.headBobTimer += dt * (this.isSprinting ? 14 : 9);
      headBobOffset = Math.sin(this.headBobTimer) * (this.isSprinting ? 0.05 : 0.03);
    } else {
      this.headBobTimer = 0;
      this.footstepTimer = 0.2; // primed for first step
    }

    // 6. Update Camera Rig
    this.camera.position.set(
      this.position.x,
      this.position.y + headBobOffset,
      this.position.z
    );
    this.updateCameraTransform();

    // 7. Update Bat Viewmodel
    this.weapon.update(dt, this.isMoving, this.isSprinting, totalTime);
  }

  private resolveWallCollisions(dt: number): void {
    if (!this.levelDef || !this.pathfinding) {
      this.position.x += this.velocity.x * dt;
      this.position.z += this.velocity.z * dt;
      return;
    }

    const newX = this.position.x + this.velocity.x * dt;
    const newZ = this.position.z + this.velocity.z * dt;

    // Check collision on X axis first
    if (!this.collidesWithWalls(newX, this.position.z)) {
      this.position.x = newX;
    } else {
      this.velocity.x = 0; // slide along Z
    }

    // Check collision on Z axis next
    if (!this.collidesWithWalls(this.position.x, newZ)) {
      this.position.z = newZ;
    } else {
      this.velocity.z = 0; // slide along X
    }
  }

  // Continuous 2D/3D ramp elevation and bounds helper
  private findRampForPosition(
    wx: number,
    wz: number,
    wy: number
  ): { ramp: WorldRamp; t: number; groundY: number; lateralDist: number } | null {
    for (let i = 0; i < this.ramps.length; i++) {
      const ramp = this.ramps[i];
      const minY = Math.min(ramp.startWorld.y, ramp.endWorld.y) - 0.4;
      const maxY = Math.max(ramp.startWorld.y, ramp.endWorld.y) + 3.0;

      // Vertical range check (player is in the vicinity of this floor connection)
      if (wy < minY || wy > maxY) continue;

      const dx = wx - ramp.startWorld.x;
      const dz = wz - ramp.startWorld.z;

      // Projection along ramp length axis
      const u = dx * ramp.dirX + dz * ramp.dirZ;
      // Lateral distance from ramp center line
      const v = dx * ramp.normX + dz * ramp.normZ;

      const halfWidth = ramp.width / 2 + 0.3;
      if (Math.abs(v) > halfWidth) continue;

      // Longitudinal bounds with smooth approach landings at bottom and top
      if (u >= -0.8 && u <= ramp.length + 0.8) {
        const t = Math.max(0, Math.min(1, u / ramp.length));
        const groundY = ramp.startWorld.y + t * (ramp.endWorld.y - ramp.startWorld.y);
        return { ramp, t, groundY, lateralDist: Math.abs(v) };
      }
    }
    return null;
  }

  // Circle vs Wall / Tree Cylinders Collision Test
  private collidesWithWalls(wx: number, wz: number): boolean {
    if (!this.levelDef) return false;

    // 1. Monster Obstacle (Prevents player from walking through sitting Pocong)
    if (this.monsterObstacle) {
      const distSq = (wx - this.monsterObstacle.x) ** 2 + (wz - this.monsterObstacle.z) ** 2;
      const combinedRadius = this.playerRadius + this.monsterRadius;
      if (distSq < combinedRadius ** 2) {
        return true;
      }
    }

    const { cellSize, gridWidth, gridHeight } = this.levelDef;
    const halfW = (gridWidth * cellSize) / 2;
    const halfH = (gridHeight * cellSize) / 2;

    // 2. Outer Perimeter Boundary Walls (Keeps player inside level)
    const margin = this.collisionConfig ? this.collisionConfig.perimeterMargin : 1.2;
    if (
      wx < -halfW + margin ||
      wx > halfW - margin ||
      wz < -halfH + margin ||
      wz > halfH - margin
    ) {
      return true;
    }

    // 3. Cylinder Colliders (Tree trunks in Level 1, Desks/Lockers/Pipes in Levels 2-10)
    const cylinders = this.collisionConfig ? this.collisionConfig.cylinderColliders : this.treeColliders;
    for (let i = 0; i < cylinders.length; i++) {
      const t = cylinders[i];
      const dx = wx - t.x;
      const dz = wz - t.z;
      const totalR = this.playerRadius + t.radius;
      if (dx * dx + dz * dz < totalR * totalR) {
        return true;
      }
    }

    // 4. Custom Box Colliders (e.g. Safety Balustrades / Railings around upper-floor openings)
    if (this.collisionConfig && this.collisionConfig.boxColliders) {
      for (let i = 0; i < this.collisionConfig.boxColliders.length; i++) {
        const b = this.collisionConfig.boxColliders[i];
        if (
          wx >= b.minX - this.playerRadius &&
          wx <= b.maxX + this.playerRadius &&
          wz >= b.minZ - this.playerRadius &&
          wz <= b.maxZ + this.playerRadius
        ) {
          if (b.minY !== undefined && b.maxY !== undefined) {
            if (this.position.y >= b.minY - 0.2 && this.position.y <= b.maxY + this.playerHeight) {
              return true;
            }
          } else {
            return true;
          }
        }
      }
    }

    // 5. Stair / Ramp Check (ONLY when ramps exist):
    // If the test position (wx, wz) is on a ramp, the walking slope is clear of walls.
    // Constrain lateral distance to keep player on the stairs and prevent clipping into corridor walls.
    if (this.ramps.length > 0) {
      const rampInfo = this.findRampForPosition(wx, wz, this.position.y);
      if (rampInfo) {
        if (rampInfo.lateralDist > rampInfo.ramp.width / 2) {
          return true; // Lateral side boundary blocks player from falling off stair edge
        }
        return false; // Clear stair path!
      }
    }

    // 6. Grid Wall AABBs (ONLY for structured levels that declare useGridWalls = true: Levels 2 to 10!)
    // Level 1 explicitly has useGridWalls = false, so this step is skipped entirely.
    const shouldUseGrid = this.collisionConfig ? this.collisionConfig.useGridWalls : false;
    if (shouldUseGrid) {
      const grid = (this.collisionConfig && this.collisionConfig.wallGrid) || this.effectiveGrid || this.levelDef.grid;
      const centerGx = Math.floor((wx + halfW) / cellSize);
      const centerGz = Math.floor((wz + halfH) / cellSize);

      for (let gz = centerGz - 1; gz <= centerGz + 1; gz++) {
        for (let gx = centerGx - 1; gx <= centerGx + 1; gx++) {
          if (gx < 0 || gx >= gridWidth || gz < 0 || gz >= gridHeight) {
            return true;
          }
          if (grid[gz][gx] === 1) {
            const cellMinX = gx * cellSize - halfW;
            const cellMaxX = (gx + 1) * cellSize - halfW;
            const cellMinZ = gz * cellSize - halfH;
            const cellMaxZ = (gz + 1) * cellSize - halfH;

            const closestX = Math.max(cellMinX, Math.min(wx, cellMaxX));
            const closestZ = Math.max(cellMinZ, Math.min(wz, cellMaxZ));
            const distSq = (wx - closestX) ** 2 + (wz - closestZ) ** 2;
            if (distSq < this.playerRadius * this.playerRadius) {
              return true;
            }
          }
        }
      }
    }

    return false;
  }

  // Multi-Floor Vertical Physics, Stairs, Wooden Bridges, & Fall System
  private updateVerticalPhysics(dt: number, totalTime: number): void {
    if (!this.levelDef) return;

    // Single-floor isolation (Level 1): Strictly locked to ground level, no stair/fall checks
    const isMultiFloor = this.collisionConfig ? this.collisionConfig.multiFloor : this.floorCount > 1;
    if (!isMultiFloor) {
      this.position.y = this.playerHeight;
      this.verticalVelocity = 0;
      this.isGrounded = true;
      this.currentFloor = 0;
      return;
    }

    // 1. Continuous Ramp / Stair Elevation (Smooth, exact, zero lag, zero sticking)
    const rampInfo = this.findRampForPosition(this.position.x, this.position.z, this.position.y);
    if (rampInfo) {
      const targetPosY = rampInfo.groundY + this.playerHeight;
      this.position.y = targetPosY;
      this.verticalVelocity = 0;
      this.isGrounded = true;
      this.currentFloor = Math.round(rampInfo.groundY / (this.floorHeight || 3.8));
      return;
    }

    // 2. Check if player is traversing any wooden bridge
    for (let i = 0; i < this.bridges.length; i++) {
      const bridge = this.bridges[i];
      if (bridge.box.containsPoint(this.position)) {
        // Type C: Broken Bridge gap check
        if (bridge.gapBox && bridge.gapBox.containsPoint(this.position)) {
          // Stepped into hole/gap! No floor support -> player falls!
          break;
        }

        // Bridge surface walking
        const targetPosY = bridge.height + this.playerHeight;

        // Type B: Unstable Bridge creaking & micro-wobble
        if (bridge.type === 'unstable' && this.isMoving) {
          AudioManager.getInstance().playWoodCreak();
          const wobble = Math.sin(totalTime * 14) * 0.002;
          this.pitch += wobble;
        }

        if (!this.isGrounded && this.verticalVelocity < -2.0) {
          // Recoverable fall onto bridge!
          AudioManager.getInstance().playFallImpact();
        }

        this.position.y = targetPosY;
        this.verticalVelocity = 0;
        this.isGrounded = true;
        this.currentFloor = bridge.floor;
        return;
      }
    }

    // 3. Multi-Floor Platforms & Stairwell Opening Void Check
    const nominalFloor = Math.max(
      0,
      Math.min(
        this.floorCount - 1,
        Math.round((this.position.y - this.playerHeight) / (this.floorHeight || 3.8))
      )
    );

    // If player is on an upper floor, check if they are standing over a stairwell opening or bridge gap
    let effectiveFloor = nominalFloor;
    if (nominalFloor > 0) {
      const inStairOpening = this.stairOpenings.some(
        (o) => o.floor === nominalFloor && o.box.containsPoint(this.position)
      );
      if (inStairOpening) {
        // Player is over the stair opening void: floor below applies!
        effectiveFloor = nominalFloor - 1;
      }

      // Check if player stepped into a broken bridge gap or chasm
      for (let i = 0; i < this.bridges.length; i++) {
        const b = this.bridges[i];
        if (b.floor === nominalFloor && b.gapBox && b.gapBox.containsPoint(this.position)) {
          effectiveFloor = Math.max(0, b.floor - 1);
          break;
        }
      }
    }

    const nominalGroundY = effectiveFloor * (this.floorHeight || 3.8);
    const nominalTargetY = nominalGroundY + this.playerHeight;

    // Check if player is falling
    if (this.position.y > nominalTargetY + 0.05) {
      this.isGrounded = false;
      this.verticalVelocity -= 19.6 * dt; // Gravity
      this.position.y += this.verticalVelocity * dt;

      // Landing check on lower floor platform (Type B: Recoverable Fall)
      if (this.position.y <= nominalTargetY) {
        this.position.y = nominalTargetY;
        if (this.verticalVelocity < -3.0) {
          AudioManager.getInstance().playFallImpact();
          this.headBobTimer += 0.4; // visual landing impact
        }
        this.verticalVelocity = 0;
        this.isGrounded = true;
        this.currentFloor = effectiveFloor;
      }
    } else {
      this.position.y = nominalTargetY;
      this.verticalVelocity = 0;
      this.isGrounded = true;
      this.currentFloor = effectiveFloor;
    }

    // Check Fatal Fall into abyss or configured fatal fall zones (Type A: Fatal Fall)
    if (this.position.y < -2.0) {
      AudioManager.getInstance().playFatalFall();
      if (this.onFatalFall) {
        this.onFatalFall();
      }
      return;
    }

    if (this.collisionConfig && this.collisionConfig.fallZones) {
      for (const fz of this.collisionConfig.fallZones) {
        if (fz.fatal && fz.box.containsPoint(this.position)) {
          AudioManager.getInstance().playFatalFall();
          if (this.onFatalFall) {
            this.onFatalFall();
          }
          return;
        }
      }
    }
  }

  private updateCameraTransform(): void {
    // Camera uses Euler with YXZ order
    this.camera.quaternion.setFromEuler(new THREE.Euler(this.pitch, this.yaw, 0, 'YXZ'));
  }

  public getForwardVector(): THREE.Vector3 {
    return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
  }

  public getYaw(): number {
    return this.yaw;
  }

  public getPitch(): number {
    return this.pitch;
  }
}
