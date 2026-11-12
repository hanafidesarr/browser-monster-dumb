import * as THREE from 'three';
import { FBXLoader } from '../loaders/FBXLoader.js';

export class MonsterModel {
  public group: THREE.Group;
  public innerGroup: THREE.Group;

  // Visual components
  private fbxRoot: THREE.Group | null = null;
  private placeholderMesh: THREE.Group | null = null;
  private eyeLight: THREE.PointLight;
  private leftEyeGlow: THREE.Mesh;
  private rightEyeGlow: THREE.Mesh;
  private auraParticles: THREE.Points;

  // Animation states
  public isLoaded: boolean = false;
  private baseScale: number = 0.0115;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'PocongRoot';

    this.innerGroup = new THREE.Group();
    this.innerGroup.name = 'PocongBody';
    this.group.add(this.innerGroup);

    // 1. Temporary immediate placeholder while FBX is streaming (zero black/missing frame)
    this.placeholderMesh = this.createPocongPlaceholder();
    this.innerGroup.add(this.placeholderMesh);

    // 2. Sinister Red Eyes (Hollow glowing sockets)
    const eyeGeo = new THREE.SphereGeometry(0.035, 6, 6);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff1111 });

    this.leftEyeGlow = new THREE.Mesh(eyeGeo, eyeMat);
    this.leftEyeGlow.position.set(-0.1, 1.62, 0.22);
    this.innerGroup.add(this.leftEyeGlow);

    this.rightEyeGlow = new THREE.Mesh(eyeGeo, eyeMat);
    this.rightEyeGlow.position.set(0.1, 1.62, 0.22);
    this.innerGroup.add(this.rightEyeGlow);

    this.eyeLight = new THREE.PointLight(0xff0000, 1.5, 4.5, 1.5);
    this.eyeLight.position.set(0, 1.62, 0.35);
    this.innerGroup.add(this.eyeLight);

    // 3. Eerie Floating Mist / Aura Particles
    this.auraParticles = this.createAuraParticles();
    this.innerGroup.add(this.auraParticles);

    // 4. Load the actual pocong.fbx 3D model
    this.loadPocongFBX();
  }

  // Fallback / immediate procedural shroud mesh
  private createPocongPlaceholder(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'PocongPlaceholder';

    const shroudMat = new THREE.MeshLambertMaterial({
      color: 0xcccccc,
      roughness: 0.9,
    });

    // Wrapped body column
    const bodyGeo = new THREE.CylinderGeometry(0.24, 0.26, 1.8, 8);
    const body = new THREE.Mesh(bodyGeo, shroudMat);
    body.position.y = 0.9;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Head bulge
    const headGeo = new THREE.SphereGeometry(0.25, 8, 8);
    const head = new THREE.Mesh(headGeo, shroudMat);
    head.position.y = 1.65;
    head.castShadow = true;
    group.add(head);

    // Top knot (Tali pocong kepala)
    const knotGeo = new THREE.ConeGeometry(0.12, 0.35, 6);
    const knot = new THREE.Mesh(knotGeo, shroudMat);
    knot.position.y = 2.0;
    group.add(knot);

    return group;
  }

  // Create eerie supernatural mist particles floating around pocong
  private createAuraParticles(): THREE.Points {
    const count = 35;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 0.9;
      positions[i * 3 + 1] = Math.random() * 2.1;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.9;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0x88ffaa,
      size: 0.06,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
    });

    return new THREE.Points(geo, mat);
  }

  // Load pocong.fbx with custom patched loader and assign textures
  private loadPocongFBX(): void {
    const texLoader = new THREE.TextureLoader();

    // Textures extracted from pocong-for-game.zip
    const clothTex = texLoader.load('./textures/22.png');
    const clothNormal = texLoader.load('./textures/sbklx0p_2K_Normal.jpg');
    const clothAO = texLoader.load('./textures/pocon1_ao.png');

    const faceTex = texLoader.load('./textures/3.png');
    const faceNormal = texLoader.load('./textures/zombie1Normal.png');
    const faceSpec = texLoader.load('./textures/zombie1Specular.png');

    const shroudMaterial = new THREE.MeshLambertMaterial({
      map: clothTex,
      normalMap: clothNormal,
      aoMap: clothAO,
      side: THREE.DoubleSide,
      roughness: 0.85,
    });

    const faceMaterial = new THREE.MeshLambertMaterial({
      map: faceTex,
      normalMap: faceNormal,
      specularMap: faceSpec,
      side: THREE.DoubleSide,
      roughness: 0.65,
    });

    const fbxLoader = new FBXLoader();
    fbxLoader.load(
      './models/pocong.fbx',
      (fbx: THREE.Group) => {
        // Traverse and assign materials
        fbx.traverse((child: THREE.Object3D) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;

            const name = child.name.toLowerCase();
            if (name.includes('cylinder') || name.includes('cloth') || name.includes('body')) {
              child.material = shroudMaterial;
            } else {
              child.material = faceMaterial;
            }
          }
        });

        // Compute bounding box and normalize scale
        const box = new THREE.Box3().setFromObject(fbx);
        const size = new THREE.Vector3();
        box.getSize(size);

        // Target height ~2.1m (tall Indonesian horror ghost)
        const targetHeight = 2.1;
        const scaleFactor = size.y > 0 ? targetHeight / size.y : this.baseScale;
        this.baseScale = scaleFactor;

        fbx.scale.set(scaleFactor, scaleFactor, scaleFactor);
        // Align base of shroud to floor (Y = 0)
        fbx.position.set(0, -box.min.y * scaleFactor, 0);

        // Remove placeholder and insert FBX model
        if (this.placeholderMesh && this.placeholderMesh.parent) {
          this.innerGroup.remove(this.placeholderMesh);
          this.placeholderMesh = null;
        }

        this.fbxRoot = fbx;
        this.innerGroup.add(fbx);
        this.isLoaded = true;
      },
      undefined,
      (err: unknown) => {
        console.warn('Could not load pocong.fbx, retaining procedural shroud:', err);
      }
    );
  }

  // 1. IDLE / SLEEPING: Motionless standing upright, eerie slow swaying in the dark
  public applySittingPosture(time: number): void {
    const sway = Math.sin(time * 1.5) * 0.04;
    const tilt = Math.cos(time * 1.1) * 0.03;
    const floatBob = Math.sin(time * 2.0) * 0.02;

    this.innerGroup.position.set(0, floatBob, 0);
    this.innerGroup.rotation.set(tilt, 0, sway);

    // Subtle scale breathing
    this.innerGroup.scale.set(1.0, 1.0 + Math.sin(time * 2.2) * 0.015, 1.0);

    // Dim, menacing eye glow pulse
    const eyeIntensity = 0.8 + Math.sin(time * 3.0) * 0.4;
    this.eyeLight.intensity = eyeIntensity;
    (this.leftEyeGlow.material as THREE.MeshBasicMaterial).color.setHex(0xbb0000);
    (this.rightEyeGlow.material as THREE.MeshBasicMaterial).color.setHex(0xbb0000);
  }

  // 2. HIT REACTION: Recoils based on weapon reaction type
  public applyHitReaction(progress: number, reactionType: string = 'snap'): void {
    const p = Math.min(1, Math.max(0, progress));
    const flinch = Math.sin(p * Math.PI);

    switch (reactionType) {
      case 'surprise': {
        // Frying pan / Spatula: sudden high upward jerk and shudder
        this.innerGroup.position.set(0, flinch * 0.22, -flinch * 0.18);
        this.innerGroup.rotation.set(-flinch * 0.45, (Math.random() - 0.5) * 0.15, 0);
        this.innerGroup.scale.set(1.0 + flinch * 0.15, 1.0 + flinch * 0.25, 1.0 + flinch * 0.15);
        break;
      }

      case 'stagger': {
        // Billboard / Chair / Fan: heavy backward stagger and sideways stumble
        const stumbleX = Math.sin(p * Math.PI * 1.5) * 0.25;
        this.innerGroup.position.set(stumbleX, 0, -flinch * 0.38);
        this.innerGroup.rotation.set(-flinch * 0.75, stumbleX * 1.8, stumbleX * 0.8);
        break;
      }

      case 'slap': {
        // Giant Slipper: sharp sideways slap snap
        const slapRoll = Math.sin(p * Math.PI) * 0.55;
        this.innerGroup.position.set(flinch * 0.18, 0, -flinch * 0.15);
        this.innerGroup.rotation.set(-flinch * 0.35, flinch * 0.4, -slapRoll);
        break;
      }

      case 'wobble': {
        // Toy Hammer: cartoon spring vibration wobble
        const wobbleX = Math.sin(p * Math.PI * 6) * 0.12 * (1 - p);
        this.innerGroup.position.set(wobbleX, 0, -flinch * 0.2);
        this.innerGroup.rotation.set(-flinch * 0.5, wobbleX * 3.5, wobbleX * 2);
        break;
      }

      case 'snap':
      default: {
        // Standard bat hit: jerk backwards
        const shudder = (Math.random() - 0.5) * 0.12 * flinch;
        this.innerGroup.position.set(shudder, 0, -flinch * 0.25);
        this.innerGroup.rotation.set(-flinch * 0.65, shudder * 2, (Math.random() - 0.5) * 0.2);
        break;
      }
    }

    this.eyeLight.intensity = 2.8;
  }

  // 3. SCREAM: Head snaps back towards night sky, shakes violently, eye flare
  public applyScream(progress: number, time: number): void {
    const p = Math.min(1, Math.max(0, progress));
    const jitterX = (Math.random() - 0.5) * 0.14;
    const jitterZ = (Math.random() - 0.5) * 0.14;

    this.innerGroup.position.set(jitterX, 0.08 * Math.sin(p * Math.PI), jitterZ);
    this.innerGroup.rotation.set(-0.45, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.15);

    // Flare glowing red eyes
    const flare = 2.2 + Math.sin(time * 25) * 1.2;
    this.eyeLight.intensity = flare;
    (this.leftEyeGlow.material as THREE.MeshBasicMaterial).color.setHex(0xff3333);
    (this.rightEyeGlow.material as THREE.MeshBasicMaterial).color.setHex(0xff3333);
  }

  // 4. STAND UP: Snaps upright, preparing spring-loaded tension for hopping chase
  public applyStandUp(progress: number): void {
    const t = Math.min(1, Math.max(0, progress));

    this.innerGroup.position.set(0, THREE.MathUtils.lerp(0.08, 0, t), 0);
    this.innerGroup.rotation.set(THREE.MathUtils.lerp(-0.45, 0, t), 0, 0);

    // Spring compression squash
    const squash = Math.sin(t * Math.PI) * 0.1;
    this.innerGroup.scale.set(1.0 + squash, 1.0 - squash * 1.5, 1.0 + squash);

    this.eyeLight.intensity = 2.0;
  }

  // 5. HOP (MELONCAT): Pitch forward into air, stretch in air, squash on landing impact
  public applyHopAnimation(hopPhase: number, isAirborne: boolean): void {
    if (isAirborne) {
      // Mid-air: pitch forward into the direction of leap (-18 degrees)
      const airProgress = hopPhase / 0.7; // 0 to 1
      const forwardPitch = -0.32 * Math.sin(airProgress * Math.PI);
      this.innerGroup.rotation.set(forwardPitch, 0, 0);

      // Vertical stretch in flight
      const stretch = Math.sin(airProgress * Math.PI) * 0.12;
      this.innerGroup.scale.set(1.0 - stretch * 0.5, 1.0 + stretch, 1.0 - stretch * 0.5);
    } else {
      // Ground contact / landing squash impact (rebounding for next hop)
      const landProgress = (hopPhase - 0.7) / 0.3; // 0 to 1
      const impactSquash = Math.sin(landProgress * Math.PI) * 0.14;

      this.innerGroup.rotation.set(0.06, 0, 0);
      this.innerGroup.scale.set(1.0 + impactSquash, 1.0 - impactSquash * 1.4, 1.0 + impactSquash);
    }

    this.eyeLight.intensity = 1.8 + (isAirborne ? 0.6 : 0);
  }

  // Legacy applyRun wrapper
  public applyRun(time: number, speed: number): void {
    // Handled directly by MonsterController's hopping cycle
    const cycle = (time * (speed / 2.8)) % 1.0;
    this.applyHopAnimation(cycle, cycle < 0.7);
  }

  // 6. CATCH PLAYER: Jumpscare leap right into player camera
  public applyCatch(time: number): void {
    this.innerGroup.position.set(0, 0.4, 0.45);
    this.innerGroup.rotation.set(-0.35, Math.sin(time * 30) * 0.15, 0);
    this.innerGroup.scale.set(1.25, 1.25, 1.25);

    this.eyeLight.intensity = 4.0;
    (this.leftEyeGlow.material as THREE.MeshBasicMaterial).color.setHex(0xff0000);
    (this.rightEyeGlow.material as THREE.MeshBasicMaterial).color.setHex(0xff0000);
  }
}
