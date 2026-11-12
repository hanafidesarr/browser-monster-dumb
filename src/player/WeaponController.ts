import * as THREE from 'three';
import { AudioManager } from '../core/AudioManager.ts';
import { WeaponId, WeaponDefinition, WEAPON_MAP } from '../weapon/WeaponData.ts';
import { WeaponModelFactory } from '../weapon/WeaponModelFactory.ts';

export class WeaponController {
  public group: THREE.Group;
  private currentWeaponId: WeaponId = 'baseball_bat';
  private weaponMesh: THREE.Group | null = null;

  private isSwinging: boolean = false;
  private swingProgress: number = 0;
  private onHitCallback: (() => void) | null = null;
  private hitTriggered: boolean = false;
  private isAttackDisabled: boolean = false;

  // Rest / Idle Position relative to camera
  private defaultPos = new THREE.Vector3(0.32, -0.28, -0.5);
  private defaultRot = new THREE.Euler(0.2, -0.3, 0.2);

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'WeaponViewmodelGroup';
    this.setWeapon('baseball_bat');
  }

  public setWeapon(weaponId: WeaponId): void {
    this.currentWeaponId = weaponId;
    if (this.weaponMesh) {
      this.group.remove(this.weaponMesh);
    }

    this.weaponMesh = WeaponModelFactory.createViewmodel(weaponId);

    // Minor resting offset customization for larger items like chair/billboard
    if (weaponId === 'chair') {
      this.defaultPos.set(0.35, -0.25, -0.55);
      this.defaultRot.set(0.35, -0.4, 0.25);
    } else if (weaponId === 'signboard') {
      this.defaultPos.set(0.34, -0.26, -0.52);
      this.defaultRot.set(0.25, -0.35, 0.18);
    } else if (weaponId === 'electric_fan') {
      this.defaultPos.set(0.33, -0.28, -0.5);
      this.defaultRot.set(0.2, -0.3, 0.15);
    } else {
      this.defaultPos.set(0.32, -0.28, -0.5);
      this.defaultRot.set(0.2, -0.3, 0.2);
    }

    this.weaponMesh.position.copy(this.defaultPos);
    this.weaponMesh.rotation.copy(this.defaultRot);
    this.group.add(this.weaponMesh);
  }

  public getWeaponId(): WeaponId {
    return this.currentWeaponId;
  }

  public getWeaponDef(): WeaponDefinition {
    return WEAPON_MAP[this.currentWeaponId] || WEAPON_MAP['baseball_bat'];
  }

  public swing(onHit: () => void): boolean {
    if (this.isSwinging || this.isAttackDisabled) return false;

    this.isSwinging = true;
    this.swingProgress = 0;
    this.hitTriggered = false;
    this.onHitCallback = onHit;

    const def = this.getWeaponDef();
    AudioManager.getInstance().playWeaponSwing(def.swingType);
    return true;
  }

  public disableAttackPermanently(): void {
    this.isAttackDisabled = true;
  }

  public reset(): void {
    this.isSwinging = false;
    this.swingProgress = 0;
    this.hitTriggered = false;
    this.isAttackDisabled = false;
    if (this.weaponMesh) {
      this.weaponMesh.position.copy(this.defaultPos);
      this.weaponMesh.rotation.copy(this.defaultRot);
    }
  }

  public update(dt: number, isMoving: boolean, isSprinting: boolean, runTime: number): void {
    if (!this.weaponMesh) return;
    const def = this.getWeaponDef();
    const duration = def.swingDuration;

    if (this.isSwinging) {
      this.swingProgress += dt / duration;

      if (this.swingProgress >= 0.46 && !this.hitTriggered) {
        this.hitTriggered = true;
        if (this.onHitCallback) {
          this.onHitCallback();
        }
      }

      // Specialized Swing Animation Curves per weapon swingType
      if (def.swingType === 'overhead') {
        // Wooden Chair: Raise high above head, then crash downwards violently!
        if (this.swingProgress < 0.32) {
          const t = this.swingProgress / 0.32;
          this.weaponMesh.position.set(0.28 - t * 0.1, -0.22 + t * 0.35, -0.42);
          this.weaponMesh.rotation.set(0.35 - t * 0.8, -0.4, 0.25 - t * 0.3);
        } else if (this.swingProgress < 0.65) {
          const t = (this.swingProgress - 0.32) / 0.33;
          this.weaponMesh.position.set(
            0.18,
            THREE.MathUtils.lerp(0.13, -0.38, t),
            THREE.MathUtils.lerp(-0.42, -0.65, t)
          );
          this.weaponMesh.rotation.set(
            THREE.MathUtils.lerp(-0.45, 1.35, t),
            THREE.MathUtils.lerp(-0.4, 0.1, t),
            0
          );
        } else if (this.swingProgress <= 1.0) {
          const t = (this.swingProgress - 0.65) / 0.35;
          this.weaponMesh.position.lerpVectors(new THREE.Vector3(0.18, -0.38, -0.65), this.defaultPos, t);
          this.weaponMesh.rotation.x = THREE.MathUtils.lerp(1.35, this.defaultRot.x, t);
          this.weaponMesh.rotation.y = THREE.MathUtils.lerp(0.1, this.defaultRot.y, t);
          this.weaponMesh.rotation.z = THREE.MathUtils.lerp(0, this.defaultRot.z, t);
        } else {
          this.isSwinging = false;
          this.weaponMesh.position.copy(this.defaultPos);
          this.weaponMesh.rotation.copy(this.defaultRot);
        }
      } else if (def.swingType === 'fast') {
        // Fast snap (Slipper, Frying Pan, Spatula, Toy Hammer): Snappy whip strike!
        if (this.swingProgress < 0.2) {
          const t = this.swingProgress / 0.2;
          this.weaponMesh.position.set(0.35 + t * 0.08, -0.24 + t * 0.06, -0.45);
          this.weaponMesh.rotation.set(0.4 + t * 0.4, -0.5 - t * 0.3, 0.3);
        } else if (this.swingProgress < 0.55) {
          const t = (this.swingProgress - 0.2) / 0.35;
          this.weaponMesh.position.set(
            THREE.MathUtils.lerp(0.43, -0.28, t),
            THREE.MathUtils.lerp(-0.18, -0.25, t),
            THREE.MathUtils.lerp(-0.45, -0.55, t)
          );
          this.weaponMesh.rotation.set(
            THREE.MathUtils.lerp(0.8, -0.3, t),
            THREE.MathUtils.lerp(-0.8, 1.4, t),
            THREE.MathUtils.lerp(0.3, -1.2, t)
          );
        } else if (this.swingProgress <= 1.0) {
          const t = (this.swingProgress - 0.55) / 0.45;
          this.weaponMesh.position.lerpVectors(new THREE.Vector3(-0.28, -0.25, -0.55), this.defaultPos, t);
          this.weaponMesh.rotation.x = THREE.MathUtils.lerp(-0.3, this.defaultRot.x, t);
          this.weaponMesh.rotation.y = THREE.MathUtils.lerp(1.4, this.defaultRot.y, t);
          this.weaponMesh.rotation.z = THREE.MathUtils.lerp(-1.2, this.defaultRot.z, t);
        } else {
          this.isSwinging = false;
          this.weaponMesh.position.copy(this.defaultPos);
          this.weaponMesh.rotation.copy(this.defaultRot);
        }
      } else if (def.swingType === 'heavy') {
        // Heavy (Billboard, Electric Fan): Big wide momentum slash!
        if (this.swingProgress < 0.3) {
          const t = this.swingProgress / 0.3;
          this.weaponMesh.position.set(0.38 + t * 0.12, -0.2 + t * 0.1, -0.42);
          this.weaponMesh.rotation.set(0.5 + t * 0.4, -0.7 - t * 0.4, 0.4);
        } else if (this.swingProgress < 0.65) {
          const t = (this.swingProgress - 0.3) / 0.35;
          this.weaponMesh.position.set(
            THREE.MathUtils.lerp(0.5, -0.45, t),
            THREE.MathUtils.lerp(-0.1, -0.32, t),
            THREE.MathUtils.lerp(-0.42, -0.6, t)
          );
          this.weaponMesh.rotation.set(
            THREE.MathUtils.lerp(0.9, -0.5, t),
            THREE.MathUtils.lerp(-1.1, 1.5, t),
            THREE.MathUtils.lerp(0.4, -1.3, t)
          );
        } else if (this.swingProgress <= 1.0) {
          const t = (this.swingProgress - 0.65) / 0.35;
          this.weaponMesh.position.lerpVectors(new THREE.Vector3(-0.45, -0.32, -0.6), this.defaultPos, t);
          this.weaponMesh.rotation.x = THREE.MathUtils.lerp(-0.5, this.defaultRot.x, t);
          this.weaponMesh.rotation.y = THREE.MathUtils.lerp(1.5, this.defaultRot.y, t);
          this.weaponMesh.rotation.z = THREE.MathUtils.lerp(-1.3, this.defaultRot.z, t);
        } else {
          this.isSwinging = false;
          this.weaponMesh.position.copy(this.defaultPos);
          this.weaponMesh.rotation.copy(this.defaultRot);
        }
      } else {
        // Standard (Baseball Bat, Broom)
        if (this.swingProgress < 0.25) {
          const t = this.swingProgress / 0.25;
          this.weaponMesh.position.set(0.38 + t * 0.05, -0.22 + t * 0.08, -0.45);
          this.weaponMesh.rotation.set(0.6 + t * 0.3, -0.6 - t * 0.2, 0.4);
        } else if (this.swingProgress < 0.6) {
          const t = (this.swingProgress - 0.25) / 0.35;
          this.weaponMesh.position.set(
            THREE.MathUtils.lerp(0.43, -0.3, t),
            THREE.MathUtils.lerp(-0.14, -0.28, t),
            THREE.MathUtils.lerp(-0.45, -0.55, t)
          );
          this.weaponMesh.rotation.set(
            THREE.MathUtils.lerp(0.9, -0.4, t),
            THREE.MathUtils.lerp(-0.8, 1.2, t),
            THREE.MathUtils.lerp(0.4, -1.1, t)
          );
        } else if (this.swingProgress <= 1.0) {
          const t = (this.swingProgress - 0.6) / 0.4;
          this.weaponMesh.position.lerpVectors(new THREE.Vector3(-0.3, -0.28, -0.55), this.defaultPos, t);
          this.weaponMesh.rotation.x = THREE.MathUtils.lerp(-0.4, this.defaultRot.x, t);
          this.weaponMesh.rotation.y = THREE.MathUtils.lerp(1.2, this.defaultRot.y, t);
          this.weaponMesh.rotation.z = THREE.MathUtils.lerp(-1.1, this.defaultRot.z, t);
        } else {
          this.isSwinging = false;
          this.weaponMesh.position.copy(this.defaultPos);
          this.weaponMesh.rotation.copy(this.defaultRot);
        }
      }
    } else {
      // Idle / Walking Sway
      let bobX = 0;
      let bobY = 0;
      if (isMoving) {
        const bobSpeed = isSprinting ? 12 : 8;
        const bobAmp = isSprinting ? 0.025 : 0.014;
        bobX = Math.cos(runTime * bobSpeed) * bobAmp;
        bobY = Math.sin(runTime * bobSpeed * 2) * bobAmp;
      } else {
        // Gentle breathing
        bobY = Math.sin(runTime * 2) * 0.005;
      }

      this.weaponMesh.position.set(
        this.defaultPos.x + bobX,
        this.defaultPos.y + bobY,
        this.defaultPos.z
      );
    }
  }
}
