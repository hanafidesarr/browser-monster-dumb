import * as THREE from 'three';
import { TextureGenerator } from '../level/TextureGenerator.ts';
import { AudioManager } from '../core/AudioManager.ts';

export class WeaponController {
  public group: THREE.Group;
  private batMesh: THREE.Group;
  private isSwinging: boolean = false;
  private swingProgress: number = 0;
  private swingDuration: number = 0.38; // fast, snappy PS1 melee strike
  private onHitCallback: (() => void) | null = null;
  private hitTriggered: boolean = false;
  private isAttackDisabled: boolean = false;

  // Rest / Idle Position relative to camera
  private defaultPos = new THREE.Vector3(0.32, -0.28, -0.5);
  private defaultRot = new THREE.Euler(0.2, -0.3, 0.2);

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'WeaponViewmodelGroup';

    this.batMesh = this.buildBatMesh();
    this.batMesh.position.copy(this.defaultPos);
    this.batMesh.rotation.copy(this.defaultRot);
    this.group.add(this.batMesh);
  }

  private buildBatMesh(): THREE.Group {
    const batGroup = new THREE.Group();
    batGroup.name = 'BaseballBat';

    const batTex = TextureGenerator.createBatTexture();
    const batMat = new THREE.MeshLambertMaterial({
      map: batTex,
      roughness: 0.7,
    });

    // Barrel / Thick striking end
    const barrelGeo = new THREE.CylinderGeometry(0.045, 0.035, 0.45, 8);
    const barrel = new THREE.Mesh(barrelGeo, batMat);
    barrel.position.set(0, 0.25, 0);
    batGroup.add(barrel);

    // Rounded top knob
    const topKnobGeo = new THREE.SphereGeometry(0.045, 8, 6);
    const topKnob = new THREE.Mesh(topKnobGeo, batMat);
    topKnob.position.set(0, 0.47, 0);
    batGroup.add(topKnob);

    // Handle / Tapered shaft
    const handleGeo = new THREE.CylinderGeometry(0.035, 0.02, 0.35, 8);
    const handle = new THREE.Mesh(handleGeo, batMat);
    handle.position.set(0, -0.15, 0);
    batGroup.add(handle);

    // Butt knob / grip end
    const buttKnobGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.03, 8);
    const buttKnob = new THREE.Mesh(buttKnobGeo, batMat);
    buttKnob.position.set(0, -0.33, 0);
    batGroup.add(buttKnob);

    return batGroup;
  }

  public swing(onHit: () => void): boolean {
    if (this.isSwinging || this.isAttackDisabled) return false;

    this.isSwinging = true;
    this.swingProgress = 0;
    this.hitTriggered = false;
    this.onHitCallback = onHit;

    AudioManager.getInstance().playBatSwing();
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
    this.batMesh.position.copy(this.defaultPos);
    this.batMesh.rotation.copy(this.defaultRot);
  }

  public update(dt: number, isMoving: boolean, isSprinting: boolean, runTime: number): void {
    if (this.isSwinging) {
      this.swingProgress += dt / this.swingDuration;

      if (this.swingProgress >= 0.48 && !this.hitTriggered) {
        this.hitTriggered = true;
        if (this.onHitCallback) {
          this.onHitCallback();
        }
      }

      // Attack Animation Curve (Windup -> Full Swing Slash -> Return)
      if (this.swingProgress < 0.25) {
        // Phase 1: Windup back
        const t = this.swingProgress / 0.25;
        this.batMesh.position.set(0.38 + t * 0.05, -0.22 + t * 0.08, -0.45);
        this.batMesh.rotation.set(0.6 + t * 0.3, -0.6 - t * 0.2, 0.4);
      } else if (this.swingProgress < 0.6) {
        // Phase 2: Forward heavy strike across screen
        const t = (this.swingProgress - 0.25) / 0.35;
        this.batMesh.position.set(
          THREE.MathUtils.lerp(0.43, -0.3, t),
          THREE.MathUtils.lerp(-0.14, -0.28, t),
          THREE.MathUtils.lerp(-0.45, -0.55, t)
        );
        this.batMesh.rotation.set(
          THREE.MathUtils.lerp(0.9, -0.4, t),
          THREE.MathUtils.lerp(-0.8, 1.2, t),
          THREE.MathUtils.lerp(0.4, -1.1, t)
        );
      } else if (this.swingProgress <= 1.0) {
        // Phase 3: Recoil and recover to ready
        const t = (this.swingProgress - 0.6) / 0.4;
        this.batMesh.position.lerpVectors(new THREE.Vector3(-0.3, -0.28, -0.55), this.defaultPos, t);
        this.batMesh.rotation.x = THREE.MathUtils.lerp(-0.4, this.defaultRot.x, t);
        this.batMesh.rotation.y = THREE.MathUtils.lerp(1.2, this.defaultRot.y, t);
        this.batMesh.rotation.z = THREE.MathUtils.lerp(-1.1, this.defaultRot.z, t);
      } else {
        this.isSwinging = false;
        this.batMesh.position.copy(this.defaultPos);
        this.batMesh.rotation.copy(this.defaultRot);
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

      this.batMesh.position.set(
        this.defaultPos.x + bobX,
        this.defaultPos.y + bobY,
        this.defaultPos.z
      );
    }
  }
}
