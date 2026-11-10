import * as THREE from 'three';
import { TextureGenerator } from '../level/TextureGenerator.ts';

export class MonsterModel {
  public group: THREE.Group;

  // Nodes for procedural articulation
  public pelvis: THREE.Group;
  public spine: THREE.Group;
  public torso: THREE.Group;
  public neck: THREE.Group;
  public head: THREE.Group;
  public jaw: THREE.Group;

  public leftArmUpper: THREE.Group;
  public leftArmLower: THREE.Group;
  public rightArmUpper: THREE.Group;
  public rightArmLower: THREE.Group;

  public leftLegUpper: THREE.Group;
  public leftLegLower: THREE.Group;
  public rightLegUpper: THREE.Group;
  public rightLegLower: THREE.Group;

  constructor() {
    this.group = new THREE.Group();
    this.group.name = 'MonsterRoot';
    this.group.scale.set(1.35, 1.35, 1.35); // Prominent, imposing horror stature

    const monsterTex = TextureGenerator.createMonsterTexture();
    const monsterMat = new THREE.MeshLambertMaterial({
      map: monsterTex,
      roughness: 0.8,
    });

    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });

    // 1. Pelvis
    this.pelvis = new THREE.Group();
    this.pelvis.position.set(0, 1.0, 0);
    this.group.add(this.pelvis);

    const pelvisMesh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.28), monsterMat);
    this.pelvis.add(pelvisMesh);

    // 2. Spine & Torso
    this.spine = new THREE.Group();
    this.spine.position.set(0, 0.12, 0);
    this.pelvis.add(this.spine);

    this.torso = new THREE.Group();
    this.torso.position.set(0, 0.25, 0);
    this.spine.add(this.torso);

    const torsoMesh = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.32), monsterMat);
    torsoMesh.position.set(0, 0.3, 0);
    this.torso.add(torsoMesh);

    // Hunchback protrusion (unsettling horror silhouette)
    const hunchMesh = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.45, 0.22), monsterMat);
    hunchMesh.position.set(0, 0.45, -0.16);
    this.torso.add(hunchMesh);

    // 3. Neck & Head
    this.neck = new THREE.Group();
    this.neck.position.set(0, 0.65, 0.05);
    this.torso.add(this.neck);

    const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.25, 6), monsterMat);
    neckMesh.position.set(0, 0.1, 0);
    this.neck.add(neckMesh);

    this.head = new THREE.Group();
    this.head.position.set(0, 0.22, 0);
    this.neck.add(this.head);

    // Disturbing elongated skull
    const craniumMesh = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.38, 0.42), monsterMat);
    craniumMesh.position.set(0, 0.15, 0.05);
    this.head.add(craniumMesh);

    // Sunken red glowing eyes with eerie red aura
    const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.08);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.11, 0.16, 0.25);
    this.head.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.11, 0.16, 0.25);
    this.head.add(rightEye);

    const eyeGlow = new THREE.PointLight(0xff0000, 1.2, 5, 1.5);
    eyeGlow.position.set(0, 0.16, 0.35);
    this.head.add(eyeGlow);

    // Unhinged lower jaw
    this.jaw = new THREE.Group();
    this.jaw.position.set(0, -0.02, 0.12);
    this.head.add(this.jaw);

    const jawMesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.28), monsterMat);
    jawMesh.position.set(0, -0.05, 0.05);
    this.jaw.add(jawMesh);

    // 4. Arms (Elongated, unnatural)
    // Left Arm
    this.leftArmUpper = new THREE.Group();
    this.leftArmUpper.position.set(-0.35, 0.55, 0);
    this.torso.add(this.leftArmUpper);

    const upperArmGeo = new THREE.BoxGeometry(0.14, 0.55, 0.14);
    const leftArmMesh = new THREE.Mesh(upperArmGeo, monsterMat);
    leftArmMesh.position.set(0, -0.25, 0);
    this.leftArmUpper.add(leftArmMesh);

    this.leftArmLower = new THREE.Group();
    this.leftArmLower.position.set(0, -0.52, 0);
    this.leftArmUpper.add(this.leftArmLower);

    const lowerArmGeo = new THREE.BoxGeometry(0.12, 0.58, 0.12);
    const leftLowerArmMesh = new THREE.Mesh(lowerArmGeo, monsterMat);
    leftLowerArmMesh.position.set(0, -0.28, 0);
    this.leftArmLower.add(leftLowerArmMesh);

    // Claws
    const clawGeo = new THREE.BoxGeometry(0.14, 0.22, 0.06);
    const leftClaws = new THREE.Mesh(clawGeo, monsterMat);
    leftClaws.position.set(0, -0.6, 0);
    this.leftArmLower.add(leftClaws);

    // Right Arm
    this.rightArmUpper = new THREE.Group();
    this.rightArmUpper.position.set(0.35, 0.55, 0);
    this.torso.add(this.rightArmUpper);

    const rightArmMesh = new THREE.Mesh(upperArmGeo, monsterMat);
    rightArmMesh.position.set(0, -0.25, 0);
    this.rightArmUpper.add(rightArmMesh);

    this.rightArmLower = new THREE.Group();
    this.rightArmLower.position.set(0, -0.52, 0);
    this.rightArmUpper.add(this.rightArmLower);

    const rightLowerArmMesh = new THREE.Mesh(lowerArmGeo, monsterMat);
    rightLowerArmMesh.position.set(0, -0.28, 0);
    this.rightArmLower.add(rightLowerArmMesh);

    const rightClaws = new THREE.Mesh(clawGeo, monsterMat);
    rightClaws.position.set(0, -0.6, 0);
    this.rightArmLower.add(rightClaws);

    // 5. Legs
    // Left Leg
    this.leftLegUpper = new THREE.Group();
    this.leftLegUpper.position.set(-0.16, -0.1, 0);
    this.pelvis.add(this.leftLegUpper);

    const upperLegGeo = new THREE.BoxGeometry(0.16, 0.6, 0.16);
    const leftLegMesh = new THREE.Mesh(upperLegGeo, monsterMat);
    leftLegMesh.position.set(0, -0.28, 0);
    this.leftLegUpper.add(leftLegMesh);

    this.leftLegLower = new THREE.Group();
    this.leftLegLower.position.set(0, -0.55, 0);
    this.leftLegUpper.add(this.leftLegLower);

    const lowerLegGeo = new THREE.BoxGeometry(0.14, 0.65, 0.14);
    const leftLowerLegMesh = new THREE.Mesh(lowerLegGeo, monsterMat);
    leftLowerLegMesh.position.set(0, -0.3, 0);
    this.leftLegLower.add(leftLowerLegMesh);

    // Right Leg
    this.rightLegUpper = new THREE.Group();
    this.rightLegUpper.position.set(0.16, -0.1, 0);
    this.pelvis.add(this.rightLegUpper);

    const rightLegMesh = new THREE.Mesh(upperLegGeo, monsterMat);
    rightLegMesh.position.set(0, -0.28, 0);
    this.rightLegUpper.add(rightLegMesh);

    this.rightLegLower = new THREE.Group();
    this.rightLegLower.position.set(0, -0.55, 0);
    this.rightLegUpper.add(this.rightLegLower);

    const rightLowerLegMesh = new THREE.Mesh(lowerLegGeo, monsterMat);
    rightLowerLegMesh.position.set(0, -0.3, 0);
    this.rightLegLower.add(rightLowerLegMesh);

    // Cast shadows for all meshes
    this.group.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });

    // Default to sitting posture
    this.applySittingPosture(0);
  }

  // SITTING_IDLE: slouched on the floor with bent knees, tucked arms, gentle breathing
  public applySittingPosture(time: number): void {
    const breath = Math.sin(time * 2.2) * 0.04;
    const twitch = (Math.sin(time * 0.7) > 0.95 ? (Math.random() - 0.5) * 0.1 : 0);

    this.pelvis.position.set(0, 0.42 + breath * 0.2, 0);
    this.pelvis.rotation.set(0.1, 0, 0);

    this.spine.rotation.set(0.35 + breath, 0, 0);
    this.torso.rotation.set(0.2, 0, 0);

    this.neck.rotation.set(0.15, twitch, 0);
    this.head.rotation.set(0.25, twitch * 2, 0);
    this.jaw.rotation.set(0.08, 0, 0);

    // Legs folded on floor
    this.leftLegUpper.rotation.set(-1.45, -0.25, 0.15);
    this.leftLegLower.rotation.set(2.2, 0, 0);

    this.rightLegUpper.rotation.set(-1.45, 0.25, -0.15);
    this.rightLegLower.rotation.set(2.2, 0, 0);

    // Arms resting limp near knees
    this.leftArmUpper.rotation.set(0.4, 0, -0.25);
    this.leftArmLower.rotation.set(-0.8, 0, 0);

    this.rightArmUpper.rotation.set(0.4, 0, 0.25);
    this.rightArmLower.rotation.set(-0.8, 0, 0);
  }

  // HIT_REACTION: Head flinches violently forward, arms splay
  public applyHitReaction(progress: number): void {
    const p = Math.min(1, Math.max(0, progress));
    const flinch = Math.sin(p * Math.PI);

    this.pelvis.position.set(0, 0.32, 0);
    this.spine.rotation.set(0.35 + flinch * 0.8, 0, 0);
    this.neck.rotation.set(flinch * 1.2, 0, (Math.random() - 0.5) * 0.3);
    this.head.rotation.set(flinch * 1.1, 0, 0);
    this.jaw.rotation.set(flinch * 0.6, 0, 0);

    this.leftArmUpper.rotation.set(-0.3 - flinch * 0.5, 0, -0.6);
    this.rightArmUpper.rotation.set(-0.3 - flinch * 0.5, 0, 0.6);
  }

  // SCREAM: Torso snaps back, mouth gapes wide, head vibrates
  public applyScream(progress: number, time: number): void {
    const jitter = (Math.random() - 0.5) * 0.12;

    this.pelvis.position.set(0, 0.45, 0);
    this.spine.rotation.set(-0.3, jitter, 0);
    this.neck.rotation.set(-0.5, jitter * 2, 0);
    this.head.rotation.set(-0.6 + jitter, 0, 0);
    this.jaw.rotation.set(0.85, 0, 0); // Wide gaping scream

    // Arms clawing the air
    this.leftArmUpper.rotation.set(-0.8 + jitter, 0, -0.7);
    this.leftArmLower.rotation.set(-1.2, 0, 0);

    this.rightArmUpper.rotation.set(-0.8 - jitter, 0, 0.7);
    this.rightArmLower.rotation.set(-1.2, 0, 0);

    this.leftLegUpper.rotation.set(-1.1, -0.2, 0);
    this.leftLegLower.rotation.set(1.5, 0, 0);
    this.rightLegUpper.rotation.set(-1.1, 0.2, 0);
    this.rightLegLower.rotation.set(1.5, 0, 0);
  }

  // STAND_UP: Unfurls limbs and rises from 0.45 to full height 1.15
  public applyStandUp(progress: number): void {
    const t = Math.min(1, Math.max(0, progress));

    this.pelvis.position.set(0, THREE.MathUtils.lerp(0.45, 1.15, t), 0);
    this.spine.rotation.set(THREE.MathUtils.lerp(0.3, 0.15, t), 0, 0);
    this.neck.rotation.set(THREE.MathUtils.lerp(-0.4, 0.1, t), 0, 0);
    this.head.rotation.set(THREE.MathUtils.lerp(-0.5, 0.1, t), 0, 0);
    this.jaw.rotation.set(THREE.MathUtils.lerp(0.8, 0.15, t), 0, 0);

    // Legs straighten
    this.leftLegUpper.rotation.set(THREE.MathUtils.lerp(-1.1, 0, t), 0, 0);
    this.leftLegLower.rotation.set(THREE.MathUtils.lerp(1.5, 0, t), 0, 0);
    this.rightLegUpper.rotation.set(THREE.MathUtils.lerp(-1.1, 0, t), 0, 0);
    this.rightLegLower.rotation.set(THREE.MathUtils.lerp(1.5, 0, t), 0, 0);

    // Arms drop into aggressive ready posture
    this.leftArmUpper.rotation.set(THREE.MathUtils.lerp(-0.8, 0.2, t), 0, -0.2);
    this.leftArmLower.rotation.set(THREE.MathUtils.lerp(-1.2, -0.4, t), 0, 0);
    this.rightArmUpper.rotation.set(THREE.MathUtils.lerp(-0.8, 0.2, t), 0, 0.2);
    this.rightArmLower.rotation.set(THREE.MathUtils.lerp(-1.2, -0.4, t), 0, 0);
  }

  // RUN: Unnatural fast gait with flailing arms and lurching torso
  public applyRun(time: number, speed: number): void {
    const stride = time * speed * 2.2;
    const sinL = Math.sin(stride);
    const sinR = Math.sin(stride + Math.PI);
    const bob = Math.abs(Math.cos(stride)) * 0.12;

    this.pelvis.position.set(0, 1.1 - bob, 0);
    this.spine.rotation.set(0.3, Math.sin(stride) * 0.15, 0); // Lurching forward
    this.neck.rotation.set(0.1, 0, 0);
    this.head.rotation.set(0.15, 0, 0);
    this.jaw.rotation.set(0.25 + Math.abs(sinL) * 0.2, 0, 0);

    // Legs alternating stride
    this.leftLegUpper.rotation.set(sinL * 0.85, 0, 0);
    this.leftLegLower.rotation.set(sinL > 0 ? sinL * 1.2 : 0.1, 0, 0);

    this.rightLegUpper.rotation.set(sinR * 0.85, 0, 0);
    this.rightLegLower.rotation.set(sinR > 0 ? sinR * 1.2 : 0.1, 0, 0);

    // Arms lunging forward
    this.leftArmUpper.rotation.set(-sinL * 0.8 - 0.2, 0, -0.3);
    this.leftArmLower.rotation.set(-0.6 - Math.abs(sinL) * 0.5, 0, 0);

    this.rightArmUpper.rotation.set(-sinR * 0.8 - 0.2, 0, 0.3);
    this.rightArmLower.rotation.set(-0.6 - Math.abs(sinR) * 0.5, 0, 0);
  }

  // CATCH_PLAYER: Aggressive grab towards the camera
  public applyCatch(time: number): void {
    this.pelvis.position.set(0, 1.15, 0.2);
    this.spine.rotation.set(0.4, 0, 0);
    this.neck.rotation.set(0.1, 0, 0);
    this.head.rotation.set(0.2, 0, 0);
    this.jaw.rotation.set(0.7, 0, 0);

    // Arms lunging forward directly towards camera
    this.leftArmUpper.rotation.set(-1.4, 0, -0.2);
    this.leftArmLower.rotation.set(-0.3, 0, 0);
    this.rightArmUpper.rotation.set(-1.4, 0, 0.2);
    this.rightArmLower.rotation.set(-0.3, 0, 0);
  }
}
