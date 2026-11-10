import * as THREE from 'three';
import { InputManager } from '../core/InputManager.ts';
import { AudioManager } from '../core/AudioManager.ts';
import { WeaponController } from './WeaponController.ts';
import { LevelDefinition } from '../level/LevelData.ts';
import { GridPathfinding } from '../pathfinding/GridPathfinding.ts';

export class FirstPersonController {
  public camera: THREE.PerspectiveCamera;
  public weapon: WeaponController;
  public position: THREE.Vector3;
  private yaw: number = 0;
  private pitch: number = 0;
  private playerRadius: number = 0.38;
  private playerHeight: number = 1.65;

  private velocity: THREE.Vector3 = new THREE.Vector3();
  private isMoving: boolean = false;
  private isSprinting: boolean = false;
  private footstepTimer: number = 0;
  private headBobTimer: number = 0;

  private levelDef: LevelDefinition | null = null;
  private pathfinding: GridPathfinding | null = null;
  private isEnabled: boolean = false;

  constructor() {
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(0, this.playerHeight, 0);

    this.position = new THREE.Vector3(0, this.playerHeight, 0);
    this.weapon = new WeaponController();
    this.camera.add(this.weapon.group);
  }

  public setLevel(level: LevelDefinition, pathfinding: GridPathfinding, spawnPos: { x: number; y: number; z: number; rotationY: number }): void {
    this.levelDef = level;
    this.pathfinding = pathfinding;

    this.position.set(spawnPos.x, this.playerHeight, spawnPos.z);
    this.yaw = spawnPos.rotationY;
    this.pitch = 0;
    this.velocity.set(0, 0, 0);
    this.updateCameraTransform();
    this.weapon.reset();
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
    this.isSprinting = moveInput.isSprinting && moveInput.forward > 0.1; // only sprint going forward

    const targetSpeed = this.isSprinting
      ? (this.levelDef?.playerConfig.sprintSpeed || 5.5)
      : (this.levelDef?.playerConfig.walkSpeed || 3.5);

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

    // 4. Head Bobbing & Footsteps
    let headBobOffset = 0;
    if (this.isMoving) {
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

    // 5. Update Camera Rig
    this.camera.position.set(
      this.position.x,
      this.position.y + headBobOffset,
      this.position.z
    );
    this.updateCameraTransform();

    // 6. Update Bat Viewmodel
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

  // Circle vs Wall AABBs Collision Test
  private collidesWithWalls(wx: number, wz: number): boolean {
    if (!this.levelDef || !this.pathfinding) return false;

    const { grid, cellSize, gridWidth, gridHeight } = this.levelDef;
    const halfW = (gridWidth * cellSize) / 2;
    const halfH = (gridHeight * cellSize) / 2;

    // Check surrounding 3x3 grid cells
    const currentGrid = this.pathfinding.worldToGrid(wx, wz);

    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const gx = currentGrid.gx + dx;
        const gz = currentGrid.gz + dz;

        if (gx < 0 || gx >= gridWidth || gz < 0 || gz >= gridHeight || grid[gz][gx] === 1) {
          // Wall cell bounds
          const wallMinX = gx * cellSize - halfW;
          const wallMaxX = (gx + 1) * cellSize - halfW;
          const wallMinZ = gz * cellSize - halfH;
          const wallMaxZ = (gz + 1) * cellSize - halfH;

          // Closest point on wall box to circle center
          const closestX = Math.max(wallMinX, Math.min(wx, wallMaxX));
          const closestZ = Math.max(wallMinZ, Math.min(wz, wallMaxZ));

          const distSq = (wx - closestX) ** 2 + (wz - closestZ) ** 2;
          if (distSq < this.playerRadius ** 2) {
            return true;
          }
        }
      }
    }

    return false;
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
