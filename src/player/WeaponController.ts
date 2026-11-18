import * as THREE from 'three';
import { AudioManager } from '../core/AudioManager.ts';
import { WeaponId, WeaponDefinition, WEAPON_MAP } from '../weapon/WeaponData.ts';
import { WeaponModelFactory } from '../weapon/WeaponModelFactory.ts';

export type RasenganState =
  | 'idle'
  | 'preparing'
  | 'charging'
  | 'charged'
  | 'thrusting'
  | 'impact'
  | 'recovering';

export class WeaponController {
  public group: THREE.Group;
  private currentWeaponId: WeaponId = 'baseball_bat';
  private weaponMesh: THREE.Group | null = null;

  private isSwinging: boolean = false;
  private swingProgress: number = 0;
  private onHitCallback: (() => void) | null = null;
  private hitTriggered: boolean = false;
  private isAttackDisabled: boolean = false;

  // Kamehameha Technique State
  private specialState: 'none' | 'kamehameha_charge' | 'kamehameha_fire' = 'none';
  private kamehamehaChargeProgress: number = 0;

  // Rasengan 5-Stage Animation State Machine
  private rasenganState: RasenganState = 'idle';
  private rasenganTimer: number = 0;
  private rasenganOnImpactCallback: (() => void) | null = null;
  private rasenganOnCompleteCallback: (() => void) | null = null;
  private rasenganImpactTriggered: boolean = false;

  // Exact Stage Durations in seconds (Total sequence: ~1.80s, perfectly matched with audio)
  private readonly RASENGAN_STAGE_DURATIONS: Record<Exclude<RasenganState, 'idle'>, number> = {
    preparing: 0.30,   // Stage 1: 300 ms (Hand moves forward from idle, wrist rotates upward, chakra activates)
    charging: 0.55,    // Stage 2: 550 ms (Held in front of camera, rapid rotation around sphere center, glow ramps up)
    charged: 0.25,     // Stage 3: 250 ms (Stable full charge hold, particle swirl, ready to thrust)
    thrusting: 0.20,   // Stage 4: 200 ms (Fast coordinated arm thrust forward toward target)
    impact: 0.12,      // Stage 5: 120 ms (Impact hold, hit callback, energy peak)
    recovering: 0.38,  // Recovery: 380 ms (Smooth ease-in-out return to idle)
  };

  // Coordinated First-Person Arm & Hand Poses
  private readonly RASENGAN_POSES = {
    idle: {
      pos: new THREE.Vector3(0.26, -0.24, -0.44),
      rot: new THREE.Euler(0.15, -0.18, 0.08),
    },
    prep: {
      pos: new THREE.Vector3(0.22, -0.21, -0.41),
      rot: new THREE.Euler(0.18, -0.13, 0.12),
    },
    charge: {
      pos: new THREE.Vector3(0.18, -0.18, -0.38),
      rot: new THREE.Euler(0.16, -0.10, 0.09),
    },
    charged: {
      pos: new THREE.Vector3(0.16, -0.17, -0.36),
      rot: new THREE.Euler(0.14, -0.08, 0.07),
    },
    thrust: {
      pos: new THREE.Vector3(0.06, -0.14, -0.58),
      rot: new THREE.Euler(0.03, -0.04, 0.02),
    },
  };

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
    } else if (weaponId === 'rasengan' || weaponId === 'toy_hammer') {
      this.defaultPos.set(0.26, -0.24, -0.44);
      this.defaultRot.set(0.15, -0.18, 0.08);
    } else if (weaponId === 'kamehameha' || weaponId === 'electric_fan') {
      this.defaultPos.set(0.0, -0.28, -0.46);
      this.defaultRot.set(0.12, 0.0, 0.0);
    } else {
      this.defaultPos.set(0.32, -0.28, -0.5);
      this.defaultRot.set(0.2, -0.3, 0.2);
    }

    this.weaponMesh.position.copy(this.defaultPos);
    this.weaponMesh.rotation.copy(this.defaultRot);
    const kamehamehaKi = this.weaponMesh.getObjectByName('KamehamehaKiGroup');
    if (kamehamehaKi) kamehamehaKi.visible = false;
    const kLight = this.weaponMesh.getObjectByName('KamehamehaPointLight') as THREE.PointLight;
    if (kLight) kLight.visible = false;
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

    // Rasengan uses its dedicated 5-stage animation state machine
    if (this.currentWeaponId === 'rasengan' || this.currentWeaponId === 'toy_hammer') {
      return this.startRasenganSequence(onHit);
    }

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

  public getWeaponMesh(): THREE.Group | null {
    return this.weaponMesh;
  }

  public getKamehamehaSphereWorldPosition(target: THREE.Vector3): boolean {
    if (!this.weaponMesh) return false;
    const kiGroup = this.weaponMesh.getObjectByName('KamehamehaKiGroup');
    if (kiGroup) {
      kiGroup.getWorldPosition(target);
      return true;
    }
    return false;
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
    this.specialState = 'none';
    this.kamehamehaChargeProgress = 0;
    this.rasenganState = 'idle';
    this.rasenganTimer = 0;
    this.rasenganImpactTriggered = false;
    this.rasenganOnImpactCallback = null;
    this.rasenganOnCompleteCallback = null;
    this.setVisible(true);
    if (this.weaponMesh) {
      this.weaponMesh.position.copy(this.defaultPos);
      this.weaponMesh.rotation.copy(this.defaultRot);
      const muzzleFlash = this.weaponMesh.getObjectByName('MuzzleFlash');
      if (muzzleFlash) muzzleFlash.visible = false;
      const kamehamehaKi = this.weaponMesh.getObjectByName('KamehamehaKiGroup');
      if (kamehamehaKi) {
        kamehamehaKi.scale.set(1, 1, 1);
        kamehamehaKi.visible = false;
      }
      const kLight = this.weaponMesh.getObjectByName('KamehamehaPointLight') as THREE.PointLight;
      if (kLight) {
        kLight.intensity = 2.6;
        kLight.visible = false;
      }
      const rasenganEnergy = this.weaponMesh.getObjectByName('RasenganEnergyGroup');
      if (rasenganEnergy) rasenganEnergy.scale.set(0.85, 0.85, 0.85);
      const rLight = this.weaponMesh.getObjectByName('RasenganPointLight') as THREE.PointLight;
      if (rLight) rLight.intensity = 1.8;
      const plasma = this.weaponMesh.getObjectByName('RasenganPlasma') as THREE.Mesh;
      if (plasma && plasma.material) {
        (plasma.material as THREE.MeshBasicMaterial).opacity = 0.65;
      }
    }
  }

  // --- Anime Techniques Viewmodel Animation Controls ---
  public startKamehamehaCharge(): void {
    this.specialState = 'kamehameha_charge';
    this.kamehamehaChargeProgress = 0;
    this.isSwinging = false;
    if (this.weaponMesh) {
      const kamehamehaKi = this.weaponMesh.getObjectByName('KamehamehaKiGroup');
      if (kamehamehaKi) kamehamehaKi.visible = true;
      const kLight = this.weaponMesh.getObjectByName('KamehamehaPointLight') as THREE.PointLight;
      if (kLight) kLight.visible = true;
    }
  }

  public updateKamehamehaCharge(progress: number): void {
    this.kamehamehaChargeProgress = Math.max(0, Math.min(1, progress));
  }

  public fireKamehamehaPose(): void {
    this.specialState = 'kamehameha_fire';
    if (this.weaponMesh) {
      const kamehamehaKi = this.weaponMesh.getObjectByName('KamehamehaKiGroup');
      if (kamehamehaKi) kamehamehaKi.visible = true;
      const kLight = this.weaponMesh.getObjectByName('KamehamehaPointLight') as THREE.PointLight;
      if (kLight) kLight.visible = true;
    }
  }

  public resetKamehameha(): void {
    this.reset();
  }

  // --- Rasengan 5-Stage Sequence Public API ---
  public isRasenganAnimating(): boolean {
    return this.rasenganState !== 'idle';
  }

  public getRasenganState(): RasenganState {
    return this.rasenganState;
  }

  public startRasenganSequence(onImpact?: () => void, onComplete?: () => void): boolean {
    if (this.rasenganState !== 'idle' || this.isAttackDisabled) return false;
    this.rasenganState = 'preparing';
    this.rasenganTimer = 0;
    this.rasenganImpactTriggered = false;
    this.rasenganOnImpactCallback = onImpact || null;
    this.rasenganOnCompleteCallback = onComplete || null;
    this.isSwinging = false;
    return true;
  }

  public resetRasengan(): void {
    this.reset();
  }

  // Dedicated 5-Stage First-Person Rasengan Animation Controller
  private updateRasenganAnimation(dt: number, runTime: number): void {
    if (!this.weaponMesh) return;
    this.rasenganTimer += dt;

    const energyGroup = this.weaponMesh.getObjectByName('RasenganEnergyGroup');
    const plasma = this.weaponMesh.getObjectByName('RasenganPlasma') as THREE.Mesh;
    const ring1 = energyGroup?.children.find((c) => (c as THREE.Mesh).geometry instanceof THREE.TorusGeometry) as THREE.Mesh;
    const ring2 = energyGroup?.children.filter((c) => (c as THREE.Mesh).geometry instanceof THREE.TorusGeometry)[1] as THREE.Mesh;
    const ring3 = energyGroup?.children.filter((c) => (c as THREE.Mesh).geometry instanceof THREE.TorusGeometry)[2] as THREE.Mesh;
    const light = this.weaponMesh.getObjectByName('RasenganPointLight') as THREE.PointLight;
    const particles = this.weaponMesh.getObjectByName('RasenganParticles') as THREE.Group;

    // Helper for smooth vector & euler interpolation
    const setPose = (p1: THREE.Vector3, p2: THREE.Vector3, r1: THREE.Euler, r2: THREE.Euler, t: number) => {
      this.weaponMesh!.position.lerpVectors(p1, p2, t);
      this.weaponMesh!.rotation.x = THREE.MathUtils.lerp(r1.x, r2.x, t);
      this.weaponMesh!.rotation.y = THREE.MathUtils.lerp(r1.y, r2.y, t);
      this.weaponMesh!.rotation.z = THREE.MathUtils.lerp(r1.z, r2.z, t);
    };

    const poses = this.RASENGAN_POSES;

    switch (this.rasenganState) {
      case 'preparing': {
        const dur = this.RASENGAN_STAGE_DURATIONS.preparing;
        const p = Math.min(1.0, this.rasenganTimer / dur);
        // Smooth ease-in
        const ease = p * p;
        setPose(poses.idle.pos, poses.prep.pos, poses.idle.rot, poses.prep.rot, ease);

        if (energyGroup) {
          // Sphere rotates strictly around its own center
          energyGroup.rotation.y += dt * (12.0 + ease * 12.0);
          energyGroup.rotation.z += dt * (8.0 + ease * 8.0);
          const s = THREE.MathUtils.lerp(0.85, 0.95, ease);
          energyGroup.scale.set(s, s, s);
        }
        if (particles) {
          particles.rotation.y += dt * (10.0 + ease * 10.0);
          particles.rotation.z += dt * (8.0 + ease * 6.0);
        }
        if (light) {
          light.intensity = THREE.MathUtils.lerp(1.8, 3.2, ease);
        }
        if (plasma && plasma.material) {
          (plasma.material as THREE.MeshBasicMaterial).opacity = THREE.MathUtils.lerp(0.65, 0.78, ease);
        }

        if (p >= 1.0) {
          this.rasenganState = 'charging';
          this.rasenganTimer = 0;
        }
        break;
      }

      case 'charging': {
        const dur = this.RASENGAN_STAGE_DURATIONS.charging;
        const p = Math.min(1.0, this.rasenganTimer / dur);
        // Controlled acceleration
        const ease = p * (2 - p);

        // Subtle hand vibration as energy builds up
        const vibAmp = 0.0025 * p;
        const vibX = (Math.random() - 0.5) * vibAmp;
        const vibY = (Math.random() - 0.5) * vibAmp;
        setPose(poses.prep.pos, poses.charge.pos, poses.prep.rot, poses.charge.rot, ease);
        this.weaponMesh.position.x += vibX;
        this.weaponMesh.position.y += vibY;

        if (energyGroup) {
          // High-speed rotation strictly around sphere center
          const spinSpeed = 24.0 + p * 26.0;
          energyGroup.rotation.y += dt * spinSpeed;
          energyGroup.rotation.z += dt * (spinSpeed * 0.75);

          if (ring1) ring1.rotation.y += dt * (20.0 + p * 25.0);
          if (ring2) ring2.rotation.z += dt * (16.0 + p * 22.0);
          if (ring3) ring3.rotation.x += dt * (14.0 + p * 20.0);

          const pulse = 1.0 + Math.sin(runTime * 28.0) * (0.04 + p * 0.06);
          const baseScale = THREE.MathUtils.lerp(0.95, 1.0, p);
          energyGroup.scale.set(baseScale * pulse, baseScale * pulse, baseScale * pulse);
        }
        if (particles) {
          particles.rotation.y += dt * (20.0 + p * 25.0);
          particles.rotation.z += dt * (14.0 + p * 18.0);
        }
        if (light) {
          light.intensity = THREE.MathUtils.lerp(3.2, 6.5, p);
        }
        if (plasma && plasma.material) {
          (plasma.material as THREE.MeshBasicMaterial).opacity = THREE.MathUtils.lerp(0.78, 0.88, p);
        }

        if (p >= 1.0) {
          this.rasenganState = 'charged';
          this.rasenganTimer = 0;
        }
        break;
      }

      case 'charged': {
        const dur = this.RASENGAN_STAGE_DURATIONS.charged;
        const p = Math.min(1.0, this.rasenganTimer / dur);

        // Stable holding attacking position
        setPose(poses.charge.pos, poses.charged.pos, poses.charge.rot, poses.charged.rot, p);

        if (energyGroup) {
          energyGroup.rotation.y += dt * 50.0;
          energyGroup.rotation.z += dt * 38.0;
          if (ring1) ring1.rotation.y += dt * 45.0;
          if (ring2) ring2.rotation.z += dt * 38.0;
          if (ring3) ring3.rotation.x += dt * 34.0;
          const pulse = 1.0 + Math.sin(runTime * 32.0) * 0.05;
          energyGroup.scale.set(pulse, pulse, pulse);
        }
        if (particles) {
          particles.rotation.y += dt * 45.0;
          particles.rotation.z += dt * 32.0;
        }
        if (light) {
          light.intensity = 6.5 + Math.sin(runTime * 30.0) * 0.5;
        }

        if (p >= 1.0) {
          this.rasenganState = 'thrusting';
          this.rasenganTimer = 0;
        }
        break;
      }

      case 'thrusting': {
        const dur = this.RASENGAN_STAGE_DURATIONS.thrusting;
        const p = Math.min(1.0, this.rasenganTimer / dur);
        // Fast explosive ease-out for powerful forward thrust
        const ease = 1 - Math.pow(1 - p, 3);

        setPose(poses.charged.pos, poses.thrust.pos, poses.charged.rot, poses.thrust.rot, ease);

        if (energyGroup) {
          energyGroup.rotation.y += dt * 55.0;
          energyGroup.rotation.z += dt * 42.0;
          energyGroup.scale.set(1.05, 1.05, 1.05);
        }
        if (particles) {
          particles.rotation.y += dt * 55.0;
          particles.rotation.z += dt * 40.0;
        }
        if (light) {
          light.intensity = 7.5;
        }

        if (p >= 1.0) {
          this.rasenganState = 'impact';
          this.rasenganTimer = 0;
        }
        break;
      }

      case 'impact': {
        const dur = this.RASENGAN_STAGE_DURATIONS.impact;
        const p = Math.min(1.0, this.rasenganTimer / dur);

        // Maximum extension hold with subtle crisp impact tremor
        this.weaponMesh.position.copy(poses.thrust.pos);
        this.weaponMesh.rotation.copy(poses.thrust.rot);
        const jAmp = 0.015;
        this.weaponMesh.position.x += (Math.random() - 0.5) * jAmp;
        this.weaponMesh.position.y += (Math.random() - 0.5) * jAmp;

        // Peak energy flare
        if (energyGroup) {
          energyGroup.rotation.y += dt * 60.0;
          energyGroup.rotation.z += dt * 48.0;
          energyGroup.scale.set(1.25, 1.25, 1.25);
        }
        if (light) {
          light.intensity = 12.0;
        }

        if (!this.rasenganImpactTriggered) {
          this.rasenganImpactTriggered = true;
          if (this.rasenganOnImpactCallback) {
            this.rasenganOnImpactCallback();
          }
        }

        if (p >= 1.0) {
          this.rasenganState = 'recovering';
          this.rasenganTimer = 0;
        }
        break;
      }

      case 'recovering': {
        const dur = this.RASENGAN_STAGE_DURATIONS.recovering;
        const p = Math.min(1.0, this.rasenganTimer / dur);
        // Smooth ease-in-out recovery
        const ease = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;

        setPose(poses.thrust.pos, poses.idle.pos, poses.thrust.rot, poses.idle.rot, ease);

        if (energyGroup) {
          energyGroup.rotation.y += dt * THREE.MathUtils.lerp(45.0, 14.0, ease);
          energyGroup.rotation.z += dt * THREE.MathUtils.lerp(35.0, 9.0, ease);
          const s = THREE.MathUtils.lerp(1.2, 0.85, ease);
          energyGroup.scale.set(s, s, s);
        }
        if (particles) {
          particles.rotation.y += dt * THREE.MathUtils.lerp(40.0, 10.0, ease);
          particles.rotation.z += dt * THREE.MathUtils.lerp(30.0, 8.0, ease);
        }
        if (light) {
          light.intensity = THREE.MathUtils.lerp(8.0, 1.8, ease);
        }
        if (plasma && plasma.material) {
          (plasma.material as THREE.MeshBasicMaterial).opacity = THREE.MathUtils.lerp(0.85, 0.65, ease);
        }

        if (p >= 1.0) {
          this.rasenganState = 'idle';
          this.weaponMesh.position.copy(this.defaultPos);
          this.weaponMesh.rotation.copy(this.defaultRot);
          if (this.rasenganOnCompleteCallback) {
            this.rasenganOnCompleteCallback();
          }
        }
        break;
      }
    }
  }

  public update(dt: number, isMoving: boolean, isSprinting: boolean, runTime: number): void {
    if (!this.weaponMesh) return;

    // 1. Rasengan 5-Stage Animation Sequence takes highest precedence
    if (this.rasenganState !== 'idle') {
      this.updateRasenganAnimation(dt, runTime);
      return;
    }

    // Handle Anime Special Technique Active Viewmodel Overrides
    if (this.specialState === 'kamehameha_charge') {
      const p = this.kamehamehaChargeProgress;
      // Hands drawn back to right waist/hip with subtle energy vibration
      const vibAmp = 0.002 + p * 0.006;
      const vibX = (Math.random() - 0.5) * vibAmp;
      const vibY = (Math.random() - 0.5) * vibAmp;
      const chargeX = THREE.MathUtils.lerp(0.0, 0.18, p) + vibX;
      const chargeY = THREE.MathUtils.lerp(-0.28, -0.30, p) + vibY;
      const chargeZ = THREE.MathUtils.lerp(-0.46, -0.38, p);
      this.weaponMesh.position.set(chargeX, chargeY, chargeZ);
      this.weaponMesh.rotation.set(
        THREE.MathUtils.lerp(0.12, 0.20, p),
        THREE.MathUtils.lerp(0.0, -0.35, p),
        THREE.MathUtils.lerp(0.0, 0.25, p)
      );

      const kamehamehaKi = this.weaponMesh.getObjectByName('KamehamehaKiGroup');
      if (kamehamehaKi) {
        kamehamehaKi.visible = true;
        kamehamehaKi.rotation.y += dt * (14.0 + p * 20.0);
        kamehamehaKi.rotation.x += dt * (10.0 + p * 16.0);
        const kiScale = THREE.MathUtils.lerp(0.65, 1.35, p) + Math.sin(runTime * 24.0) * (0.02 + p * 0.06);
        kamehamehaKi.scale.set(kiScale, kiScale, kiScale);
      }
      const kiLight = this.weaponMesh.getObjectByName('KamehamehaPointLight') as THREE.PointLight;
      if (kiLight) {
        kiLight.visible = true;
        kiLight.intensity = THREE.MathUtils.lerp(1.5, 3.8, p);
      }
      return;
    } else if (this.specialState === 'kamehameha_fire') {
      // Both palms thrust forward with recoil kickback (kept neatly at bottom-center of screen)
      this.weaponMesh.position.set(0.0, -0.22, -0.52);
      this.weaponMesh.rotation.set(-0.08, 0.0, 0.0);
      const kamehamehaKi = this.weaponMesh.getObjectByName('KamehamehaKiGroup');
      if (kamehamehaKi) {
        kamehamehaKi.visible = true;
        kamehamehaKi.scale.set(1.2, 1.2, 1.2);
      }
      const kiLight = this.weaponMesh.getObjectByName('KamehamehaPointLight') as THREE.PointLight;
      if (kiLight) {
        kiLight.visible = true;
        kiLight.intensity = 3.2;
      }
      return;
    }

    // Continuous Anime Energy Pulsation & Swirling Vortex in Idle
    const rasenganEnergy = this.weaponMesh.getObjectByName('RasenganEnergyGroup');
    if (rasenganEnergy) {
      rasenganEnergy.rotation.y += dt * 14.0;
      rasenganEnergy.rotation.z += dt * 9.0;
      const pulse = 0.85 + Math.sin(runTime * 18.0) * 0.04;
      rasenganEnergy.scale.set(pulse, pulse, pulse);
    }
    const particles = this.weaponMesh.getObjectByName('RasenganParticles') as THREE.Group;
    if (particles) {
      particles.rotation.y += dt * 10.0;
      particles.rotation.z += dt * 8.0;
    }
    const kamehamehaKi = this.weaponMesh.getObjectByName('KamehamehaKiGroup');
    if (kamehamehaKi) {
      if (this.specialState !== 'none') {
        kamehamehaKi.visible = true;
        kamehamehaKi.rotation.y += dt * 10.0;
        kamehamehaKi.rotation.x += dt * 7.0;
        const pulse = 1.0 + Math.sin(runTime * 15.0) * 0.08;
        kamehamehaKi.scale.set(pulse, pulse, pulse);
      } else {
        kamehamehaKi.visible = false;
        const kLight = this.weaponMesh.getObjectByName('KamehamehaPointLight') as THREE.PointLight;
        if (kLight) kLight.visible = false;
      }
    }

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
        // Authentic 5-round burst recoil pulses & flickering muzzle flashes
        const muzzleFlash = this.weaponMesh.getObjectByName('MuzzleFlash');
        if (this.swingProgress <= 1.0) {
          // 5 distinct recoil pulses mapped across the swing progress
          const burstCycle = (this.swingProgress * 5) % 1.0;
          const kickPhase = burstCycle < 0.38; // First 38% of each cycle is fierce kickback

          if (kickPhase) {
            const kickT = burstCycle / 0.38;
            this.weaponMesh.position.set(
              this.defaultPos.x + Math.sin(this.swingProgress * 40) * 0.004,
              this.defaultPos.y + kickT * 0.028,
              this.defaultPos.z + kickT * 0.065
            );
            this.weaponMesh.rotation.set(
              this.defaultRot.x - kickT * 0.16,
              this.defaultRot.y + Math.cos(this.swingProgress * 30) * 0.015,
              this.defaultRot.z + Math.sin(this.swingProgress * 25) * 0.012
            );
            if (muzzleFlash) muzzleFlash.visible = true;
          } else {
            const settleT = (burstCycle - 0.38) / 0.62;
            this.weaponMesh.position.lerpVectors(
              new THREE.Vector3(this.defaultPos.x, this.defaultPos.y + 0.028, this.defaultPos.z + 0.065),
              this.defaultPos,
              settleT
            );
            this.weaponMesh.rotation.x = THREE.MathUtils.lerp(this.defaultRot.x - 0.16, this.defaultRot.x, settleT);
            this.weaponMesh.rotation.y = THREE.MathUtils.lerp(this.weaponMesh.rotation.y, this.defaultRot.y, settleT);
            this.weaponMesh.rotation.z = THREE.MathUtils.lerp(this.weaponMesh.rotation.z, this.defaultRot.z, settleT);
            if (muzzleFlash) muzzleFlash.visible = false;
          }
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
