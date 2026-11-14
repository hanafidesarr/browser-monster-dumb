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
    } else if (weaponId === 'grenade' || weaponId === 'signboard') {
      this.defaultPos.set(0.28, -0.26, -0.42);
      this.defaultRot.set(0.15, -0.2, 0.1);
    } else if (weaponId === 'machine_gun' || weaponId === 'slipper') {
      this.defaultPos.set(0.24, -0.22, -0.48);
      this.defaultRot.set(0.04, -0.04, 0.02);
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

  public setVisible(visible: boolean): void {
    if (this.weaponMesh) {
      this.weaponMesh.visible = visible;
    }
    this.group.visible = visible;
  }

  public reset(): void {
    this.isSwinging = false;
    this.swingProgress = 0;
    this.hitTriggered = false;
    this.isAttackDisabled = false;
    this.setVisible(true);
    if (this.weaponMesh) {
      this.weaponMesh.position.copy(this.defaultPos);
      this.weaponMesh.rotation.copy(this.defaultRot);
      const muzzleFlash = this.weaponMesh.getObjectByName('MuzzleFlash');
      if (muzzleFlash) muzzleFlash.visible = false;
    }
  }

  public update(dt: number, isMoving: boolean, isSprinting: boolean, runTime: number): void {
    if (!this.weaponMesh) return;
    const def = this.getWeaponDef();
    const duration = def.swingDuration;

    if (this.isSwinging) {
      this.swingProgress += dt / duration;

      const hitThreshold = def.swingType === 'shoot' ? 0.04 : (def.swingType === 'throw' ? 0.36 : 0.46);
      if (this.swingProgress >= hitThreshold && !this.hitTriggered) {
        this.hitTriggered = true;
        if (this.onHitCallback) {
          this.onHitCallback();
        }
      }

      // Specialized Swing Animation Curves per weapon swingType
      if (def.swingType === 'shoot') {
        // Fast gun recoil and recovery
        const muzzleFlash = this.weaponMesh.getObjectByName('MuzzleFlash');
        if (this.swingProgress < 0.25) {
          const t = this.swingProgress / 0.25;
          this.weaponMesh.position.set(
            this.defaultPos.x,
            this.defaultPos.y + t * 0.035,
            this.defaultPos.z + t * 0.075
          );
          this.weaponMesh.rotation.set(
            this.defaultRot.x - t * 0.18,
            this.defaultRot.y,
            this.defaultRot.z
          );
          if (muzzleFlash) muzzleFlash.visible = true;
        } else if (this.swingProgress <= 1.0) {
          const t = (this.swingProgress - 0.25) / 0.75;
          this.weaponMesh.position.lerpVectors(
            new THREE.Vector3(this.defaultPos.x, this.defaultPos.y + 0.035, this.defaultPos.z + 0.075),
            this.defaultPos,
            t
          );
          this.weaponMesh.rotation.x = THREE.MathUtils.lerp(this.defaultRot.x - 0.18, this.defaultRot.x, t);
          this.weaponMesh.rotation.y = this.defaultRot.y;
          this.weaponMesh.rotation.z = this.defaultRot.z;
          if (muzzleFlash) muzzleFlash.visible = false;
        } else {
          this.isSwinging = false;
          this.weaponMesh.position.copy(this.defaultPos);
          this.weaponMesh.rotation.copy(this.defaultRot);
          if (muzzleFlash) muzzleFlash.visible = false;
        }
      } else if (def.swingType === 'overhead') {
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
      } else if (def.swingType === 'throw') {
        // Hand Grenade: Authentic FPS Throw Animation with Forward Thrust & Weapon Draw
        if (this.swingProgress < 0.18) {
          // 1. Wind-up / Cock arm back
          const t = this.swingProgress / 0.18;
          this.weaponMesh.visible = true;
          this.weaponMesh.position.set(
            THREE.MathUtils.lerp(this.defaultPos.x, 0.34, t),
            THREE.MathUtils.lerp(this.defaultPos.y, -0.30, t),
            THREE.MathUtils.lerp(this.defaultPos.z, -0.32, t)
          );
          this.weaponMesh.rotation.set(
            THREE.MathUtils.lerp(this.defaultRot.x, -0.45, t),
            THREE.MathUtils.lerp(this.defaultRot.y, -0.35, t),
            THREE.MathUtils.lerp(this.defaultRot.z, 0.35, t)
          );
        } else if (this.swingProgress < 0.40) {
          // 2. Powerful forward throw thrust towards crosshair center
          const t = (this.swingProgress - 0.18) / 0.22;
          const ease = t * t * (3 - 2 * t);
          this.weaponMesh.visible = true;
          this.weaponMesh.position.set(
            THREE.MathUtils.lerp(0.34, 0.08, ease),
            THREE.MathUtils.lerp(-0.30, -0.06, ease),
            THREE.MathUtils.lerp(-0.32, -0.82, ease)
          );
          this.weaponMesh.rotation.set(
            THREE.MathUtils.lerp(-0.45, 1.25, ease),
            THREE.MathUtils.lerp(-0.35, -0.10, ease),
            THREE.MathUtils.lerp(0.35, -0.25, ease)
          );
        } else if (this.swingProgress < 0.60) {
          // 3. Grenade has left hand into 3D world (viewmodel empty during flight)
          this.weaponMesh.visible = false;
        } else if (this.swingProgress <= 1.0) {
          // 4. Draw fresh grenade up from below screen (FPS weapon draw)
          if (!this.isAttackDisabled) {
            this.weaponMesh.visible = true;
            const t = (this.swingProgress - 0.60) / 0.40;
            const ease = 1 - Math.pow(1 - t, 2);
            this.weaponMesh.position.set(
              this.defaultPos.x,
              THREE.MathUtils.lerp(-0.62, this.defaultPos.y, ease),
              THREE.MathUtils.lerp(-0.55, this.defaultPos.z, ease)
            );
            this.weaponMesh.rotation.set(
              THREE.MathUtils.lerp(0.55, this.defaultRot.x, ease),
              THREE.MathUtils.lerp(-0.10, this.defaultRot.y, ease),
              THREE.MathUtils.lerp(0.0, this.defaultRot.z, ease)
            );
          }
        } else {
          this.isSwinging = false;
          if (!this.isAttackDisabled) {
            this.weaponMesh.visible = true;
            this.weaponMesh.position.copy(this.defaultPos);
            this.weaponMesh.rotation.copy(this.defaultRot);
          }
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
