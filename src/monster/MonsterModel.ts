import * as THREE from 'three';
import { FBXLoader } from '../loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MonsterType } from '../level/LevelData.ts';

export class MonsterModel {
  public group: THREE.Group;
  public innerGroup: THREE.Group;
  public monsterType: MonsterType;

  // Visual components
  private fbxRoot: THREE.Group | null = null;
  private placeholderMesh: THREE.Group | null = null;
  private eyeLight: THREE.PointLight;
  private leftEyeGlow: THREE.Mesh;
  private rightEyeGlow: THREE.Mesh;
  private headBone: THREE.Object3D | null = null;
  private kuntiEyeMeshes: THREE.Mesh[] = [];

  // Animation mixer for skinned / animated models (Kunti & Genderwo)
  private mixer: THREE.AnimationMixer | null = null;
  private crawlAction: THREE.AnimationAction | null = null;
  private walkAction: THREE.AnimationAction | null = null;
  private isSittingEvaluated: boolean = false;
  private crawlAnimAccumulator: number = 0;
  private walkAnimAccumulator: number = 0;

  // Animation states
  public isLoaded: boolean = false;
  private baseScale: number = 0.0115;

  constructor(monsterType: MonsterType = 'pocong') {
    this.monsterType = monsterType;
    this.group = new THREE.Group();
    this.group.name = monsterType === 'kunti' ? 'KuntiRoot' : (monsterType === 'yeti' ? 'YetiRoot' : 'PocongRoot');

    this.innerGroup = new THREE.Group();
    this.innerGroup.name = monsterType === 'kunti' ? 'KuntiBody' : (monsterType === 'yeti' ? 'YetiBody' : 'PocongBody');
    this.group.add(this.innerGroup);

    if (this.monsterType === 'kunti') {
      // 1. Temporary immediate placeholder for crawling Kuntilanak while FBX is streaming
      this.placeholderMesh = this.createKuntiPlaceholder();
      this.innerGroup.add(this.placeholderMesh);

      // 2. Sinister Red Eyes (Positioned at head height ~0.48m for crawling placeholder)
      const eyeGeo = new THREE.SphereGeometry(0.016, 8, 8);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff2222 });

      this.leftEyeGlow = new THREE.Mesh(eyeGeo, eyeMat);
      this.leftEyeGlow.position.set(-0.08, 0.48, 0.58);
      this.placeholderMesh.add(this.leftEyeGlow);

      this.rightEyeGlow = new THREE.Mesh(eyeGeo, eyeMat);
      this.rightEyeGlow.position.set(0.08, 0.48, 0.58);
      this.placeholderMesh.add(this.rightEyeGlow);

      // Lightweight soft point light (localized, does not tax surrounding geometry)
      this.eyeLight = new THREE.PointLight(0xff0000, 0.4, 1.8, 2.0);
      this.eyeLight.position.set(0, 0.48, 0.65);
      this.placeholderMesh.add(this.eyeLight);

      // 3. Load KuntiMerangkak.fbx
      this.loadKuntiFBX();
    } else if (this.monsterType === 'yeti') {
      // 1. Temporary immediate placeholder for towering Genderwo while GLB is streaming
      this.placeholderMesh = this.createYetiPlaceholder();
      this.innerGroup.add(this.placeholderMesh);

      // 2. Menacing Red Eyes (Positioned at Genderwo face/eyes ~2.48m height, 0.78m forward)
      const eyeGeo = new THREE.SphereGeometry(0.035, 8, 8);
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff1111 });

      this.leftEyeGlow = new THREE.Mesh(eyeGeo, eyeMat);
      this.leftEyeGlow.position.set(-0.14, 2.48, 0.78);
      this.innerGroup.add(this.leftEyeGlow);

      this.rightEyeGlow = new THREE.Mesh(eyeGeo, eyeMat);
      this.rightEyeGlow.position.set(0.14, 2.48, 0.78);
      this.innerGroup.add(this.rightEyeGlow);

      this.eyeLight = new THREE.PointLight(0xff0000, 1.4, 4.5, 1.8);
      this.eyeLight.position.set(0, 2.48, 0.88);
      this.innerGroup.add(this.eyeLight);

      // 3. Load genderwo-walking.fbx with Mixamo walk animation
      this.loadYetiFBX();
    } else {
      // Standard Pocong setup
      this.placeholderMesh = this.createPocongPlaceholder();
      this.innerGroup.add(this.placeholderMesh);

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

      this.loadPocongFBX();
    }
  }

  // Fallback / immediate procedural crawler mesh for Kuntilanak
  private createKuntiPlaceholder(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'KuntiPlaceholder';

    const dressMat = new THREE.MeshLambertMaterial({
      color: 0xdddddd,
    });
    const skinMat = new THREE.MeshLambertMaterial({
      color: 0x948b80,
    });
    const hairMat = new THREE.MeshLambertMaterial({
      color: 0x111111,
    });

    // Crawling low torso (angled forward)
    const torsoGeo = new THREE.BoxGeometry(0.45, 0.28, 0.75);
    const torso = new THREE.Mesh(torsoGeo, dressMat);
    torso.position.set(0, 0.35, 0);
    torso.rotation.x = -0.15;
    torso.castShadow = true;
    group.add(torso);

    // Head with draped hair
    const headGeo = new THREE.SphereGeometry(0.18, 8, 8);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.set(0, 0.45, 0.48);
    head.castShadow = true;
    group.add(head);

    const hairGeo = new THREE.BoxGeometry(0.32, 0.42, 0.25);
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.set(0, 0.38, 0.45);
    hair.castShadow = true;
    group.add(hair);

    // Reaching arms
    const armGeo = new THREE.CylinderGeometry(0.06, 0.05, 0.6, 6);
    const leftArm = new THREE.Mesh(armGeo, skinMat);
    leftArm.position.set(-0.32, 0.15, 0.35);
    leftArm.rotation.x = Math.PI / 4;
    leftArm.rotation.z = -Math.PI / 6;
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, skinMat);
    rightArm.position.set(0.32, 0.15, 0.35);
    rightArm.rotation.x = Math.PI / 4;
    rightArm.rotation.z = Math.PI / 6;
    group.add(rightArm);

    // Splayed hind legs for gecko/cicak crawling stance
    const legGeo = new THREE.CylinderGeometry(0.065, 0.05, 0.62, 6);
    const leftLeg = new THREE.Mesh(legGeo, skinMat);
    leftLeg.position.set(-0.35, 0.16, -0.32);
    leftLeg.rotation.x = -Math.PI / 4;
    leftLeg.rotation.z = Math.PI / 5;
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, skinMat);
    rightLeg.position.set(0.35, 0.16, -0.32);
    rightLeg.rotation.x = -Math.PI / 4;
    rightLeg.rotation.z = -Math.PI / 5;
    group.add(rightLeg);

    return group;
  }

  // Load KuntiMerangkak.fbx with custom patched loader and assign materials
  private loadKuntiFBX(): void {
    const fbxLoader = new FBXLoader();
    const candidateUrls = [
      './models/KuntiMerangkak.fbx',
      './KuntiMerangkak.fbx',
      '/models/KuntiMerangkak.fbx',
      '/KuntiMerangkak.fbx',
      'KuntiMerangkak.fbx',
    ];

    const tryLoad = (idx: number) => {
      if (idx >= candidateUrls.length) {
        console.warn('Could not load KuntiMerangkak.fbx, retaining procedural crawler placeholder');
        return;
      }

      try {
        fbxLoader.load(
          candidateUrls[idx],
          (fbx: THREE.Group) => {
            this.kuntiEyeMeshes = [];
            fbx.traverse((child: THREE.Object3D) => {
              if (child instanceof THREE.Mesh) {
                if (child.name === 'Mesh40' || child.name === 'Mesh41') {
                  this.kuntiEyeMeshes.push(child);
                }
                child.castShadow = true;
                // Disable shadow reception on mobile skinned mesh to eliminate shadow map sampling overhead
                child.receiveShadow = false;
                // Enable frustum culling with expanded bounding sphere so off-screen Kuntilanak is culled without disappearing
                if (child.geometry) {
                  child.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 15);
                }
                child.frustumCulled = true;

                if (child.material) {
                  const mats = Array.isArray(child.material) ? child.material : [child.material];
                  const optimizedMats = mats.map((m: any) => {
                    if (!m) return m;

                    // PS1 retro pixelated texture filtering (saves texture filtering bandwidth)
                    if (m.map) {
                      m.map.minFilter = THREE.NearestFilter;
                      m.map.magFilter = THREE.NearestFilter;
                      m.map.generateMipmaps = false;
                    }

                    // Only double-side hair/thin planes; body & clothing use hardware FrontSide culling
                    const isThinPart = child.name.toLowerCase().includes('hair') || child.name.toLowerCase().includes('eyelash');
                    const side = isThinPart ? THREE.DoubleSide : THREE.FrontSide;
                    const isEyeMesh = child.name === 'Mesh40' || child.name === 'Mesh41';

                    // Lightweight MeshLambertMaterial replaces expensive Phong/PBR specular shaders
                    return new THREE.MeshLambertMaterial({
                      color: m.color || 0xd0d0d0,
                      map: m.map || null,
                      side: side,
                      emissive: isEyeMesh ? new THREE.Color(0xff1111) : new THREE.Color(0x000000),
                    });
                  });
                  child.material = Array.isArray(child.material) ? optimizedMats : optimizedMats[0];
                }
              }
            });

            // Animation setup: embedded Mixamo crawl animation
            if (fbx.animations && fbx.animations.length > 0) {
              this.mixer = new THREE.AnimationMixer(fbx);
              const clip = fbx.animations[0];
              this.crawlAction = this.mixer.clipAction(clip);
              this.crawlAction.setLoop(THREE.LoopRepeat, Infinity);
              this.crawlAction.play();
              // Start at a slight offset so initial resting posture looks natural
              this.mixer.setTime(0.08);
            }

            // Natural human scale: 1.0 matches real-world dimensions (1.62m length, 0.70m height)
            fbx.scale.set(1.0, 1.0, 1.0);
            fbx.position.set(0, 0, 0);

            // Re-parent red eye glows and eye light directly to Kuntilanak head bone
            let headBone: THREE.Object3D | null = null;
            const m40 = fbx.getObjectByName('Mesh40') as THREE.SkinnedMesh | undefined;
            if (m40 && m40.skeleton && m40.skeleton.bones) {
              headBone = m40.skeleton.bones.find((b) => b.name === 'mixamorigHead') || null;
            }
            if (!headBone) {
              fbx.traverse((c) => {
                if (!headBone && c.name === 'mixamorigHead' && (c as THREE.Bone).isBone) {
                  headBone = c;
                }
              });
            }
            this.headBone = headBone;

            if (headBone) {
              headBone.add(this.leftEyeGlow);
              headBone.add(this.rightEyeGlow);
              headBone.add(this.eyeLight);

              // Accurately aligned to Kuntilanak's eye sockets / pupil centers in head bone local space
              this.leftEyeGlow.position.set(-0.031, 0.102, 0.082);
              this.rightEyeGlow.position.set(0.022, 0.101, 0.083);
              this.eyeLight.position.set(-0.005, 0.102, 0.100);
            } else {
              this.innerGroup.add(this.leftEyeGlow);
              this.innerGroup.add(this.rightEyeGlow);
              this.innerGroup.add(this.eyeLight);
              this.leftEyeGlow.position.set(-0.08, 0.48, 0.58);
              this.rightEyeGlow.position.set(0.08, 0.48, 0.58);
              this.eyeLight.position.set(0, 0.48, 0.65);
            }

            // Remove placeholder and insert FBX model
            if (this.placeholderMesh && this.placeholderMesh.parent) {
              this.innerGroup.remove(this.placeholderMesh);
              this.placeholderMesh = null;
            }

            this.fbxRoot = fbx;
            this.innerGroup.add(fbx);
            this.isSittingEvaluated = false;
            this.isLoaded = true;
          },
          undefined,
          () => {
            tryLoad(idx + 1);
          }
        );
      } catch (_) {
        tryLoad(idx + 1);
      }
    };

    tryLoad(0);
  }

  // Fallback / immediate procedural lumbering Genderwo mesh
  private createYetiPlaceholder(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'YetiPlaceholder';

    const furMat = new THREE.MeshLambertMaterial({ color: 0xd8e4ee });
    const faceMat = new THREE.MeshLambertMaterial({ color: 0x4a5568 });
    const hornMat = new THREE.MeshLambertMaterial({ color: 0x2d3748 });

    // Massive hunched upper torso
    const chestGeo = new THREE.BoxGeometry(1.4, 0.9, 0.9);
    const chest = new THREE.Mesh(chestGeo, furMat);
    chest.position.set(0, 1.6, 0.15);
    chest.castShadow = true;
    group.add(chest);

    // Abdomen & hips
    const absGeo = new THREE.BoxGeometry(1.1, 0.7, 0.75);
    const abs = new THREE.Mesh(absGeo, furMat);
    abs.position.set(0, 0.95, 0.05);
    abs.castShadow = true;
    group.add(abs);

    // Head
    const headGeo = new THREE.BoxGeometry(0.65, 0.55, 0.6);
    const head = new THREE.Mesh(headGeo, furMat);
    head.position.set(0, 2.35, 0.45);
    head.castShadow = true;
    group.add(head);

    // Dark snout / face plate
    const snoutGeo = new THREE.BoxGeometry(0.38, 0.28, 0.25);
    const snout = new THREE.Mesh(snoutGeo, faceMat);
    snout.position.set(0, 2.35, 0.75);
    group.add(snout);

    // Horns / beast ears
    const hornGeo = new THREE.ConeGeometry(0.1, 0.35, 5);
    const leftHorn = new THREE.Mesh(hornGeo, hornMat);
    leftHorn.position.set(-0.35, 2.68, 0.45);
    leftHorn.rotation.z = Math.PI / 6;
    group.add(leftHorn);

    const rightHorn = new THREE.Mesh(hornGeo, hornMat);
    rightHorn.position.set(0.35, 2.68, 0.45);
    rightHorn.rotation.z = -Math.PI / 6;
    group.add(rightHorn);

    // Heavy arms hanging low
    const armGeo = new THREE.BoxGeometry(0.35, 1.1, 0.4);
    const leftArm = new THREE.Mesh(armGeo, furMat);
    leftArm.position.set(-0.9, 1.35, 0.2);
    leftArm.rotation.z = Math.PI / 16;
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, furMat);
    rightArm.position.set(0.9, 1.35, 0.2);
    rightArm.rotation.z = -Math.PI / 16;
    group.add(rightArm);

    // Sturdy legs
    const legGeo = new THREE.BoxGeometry(0.42, 0.75, 0.45);
    const leftLeg = new THREE.Mesh(legGeo, furMat);
    leftLeg.position.set(-0.4, 0.38, 0);
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, furMat);
    rightLeg.position.set(0.4, 0.38, 0);
    group.add(rightLeg);

    return group;
  }

  // Load genderwo-walking.fbx with FBXLoader and assign textures & embedded Mixamo walk animation
  private loadYetiFBX(): void {
    const fbxLoader = new FBXLoader();
    const texLoader = new THREE.TextureLoader();
    const yetiTex = texLoader.load('./textures/Yeti2_0.png');
    // Crucial fix: FBX UV coordinates expect un-flipped texture upload (flipY = false)
    // Three.js TextureLoader defaults to flipY = true, which caused the texture on Genderwo to map upside down (0.22% match vs 99.93% match).
    yetiTex.flipY = false;
    yetiTex.colorSpace = THREE.SRGBColorSpace;
    yetiTex.minFilter = THREE.NearestFilter;
    yetiTex.magFilter = THREE.NearestFilter;
    yetiTex.generateMipmaps = false;

    const candidateUrls = [
      './models/genderwo-walking.fbx',
      '/models/genderwo-walking.fbx',
      './genderwo-walking.fbx',
      '/genderwo-walking.fbx',
      'genderwo-walking.fbx',
      './models/yeti.glb',
      '/models/yeti.glb',
    ];

    const tryLoad = (idx: number) => {
      if (idx >= candidateUrls.length) {
        console.warn('Could not load genderwo-walking.fbx, retaining procedural genderwo placeholder');
        return;
      }

      try {
        fbxLoader.load(
          candidateUrls[idx],
          (fbx: THREE.Group) => {
            fbx.traverse((child: THREE.Object3D) => {
              if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = false;
                child.frustumCulled = false;
                if (child.geometry) {
                  child.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1.4, 0), 25);
                }

                child.material = new THREE.MeshLambertMaterial({
                  color: 0xffffff,
                  map: yetiTex,
                  side: THREE.DoubleSide,
                });
              }
            });

            // Embedded Mixamo walking animation
            if (fbx.animations && fbx.animations.length > 0) {
              this.mixer = new THREE.AnimationMixer(fbx);
              const clip = fbx.animations[0];

              // Convert Root-Motion to In-Place Walk:
              // Lock mixamorigHips.position Z travel to initial value
              const hipsTrack = clip.tracks.find((t) => t.name === 'mixamorigHips.position');
              if (hipsTrack) {
                const baseZ = hipsTrack.values[2];
                for (let i = 2; i < hipsTrack.values.length; i += 3) {
                  hipsTrack.values[i] = baseZ;
                }
              }

              this.walkAction = this.mixer.clipAction(clip);
              this.walkAction.setLoop(THREE.LoopRepeat, Infinity);
              this.walkAction.play();
              this.mixer.setTime(0.04);
            }

            // Scale factor 0.92 gives height ~2.65m, width ~1.76m (large & intimidating, fits through 4m cemetery passages)
            fbx.scale.set(0.92, 0.92, 0.92);
            fbx.position.set(0, 0, 0);

            // Re-parent red eye glows and eye light directly into Genderwo mixamorigHead bone
            let headBone: THREE.Object3D | null = null;
            fbx.traverse((c) => {
              if (!headBone && c.name === 'mixamorigHead' && (c as THREE.Bone).isBone) {
                headBone = c;
              }
            });
            this.headBone = headBone;

            if (headBone) {
              headBone.add(this.leftEyeGlow);
              headBone.add(this.rightEyeGlow);
              headBone.add(this.eyeLight);

              // Accurately aligned to Genderwo eye sockets in head bone local space
              this.leftEyeGlow.position.set(-0.12, 0.02, 0.28);
              this.rightEyeGlow.position.set(0.12, 0.02, 0.28);
              this.eyeLight.position.set(0, 0.02, 0.38);
            }

            // Remove placeholder and insert FBX model
            if (this.placeholderMesh && this.placeholderMesh.parent) {
              this.innerGroup.remove(this.placeholderMesh);
              this.placeholderMesh = null;
            }

            this.fbxRoot = fbx;
            this.innerGroup.add(fbx);
            this.isSittingEvaluated = false;
            this.isLoaded = true;
          },
          undefined,
          () => {
            tryLoad(idx + 1);
          }
        );
      } catch (_) {
        tryLoad(idx + 1);
      }
    };

    tryLoad(0);
  }

  // Fallback / immediate procedural shroud mesh
  private createPocongPlaceholder(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'PocongPlaceholder';

    const shroudMat = new THREE.MeshLambertMaterial({
      color: 0xcccccc,
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
    });

    const faceMaterial = new THREE.MeshLambertMaterial({
      map: faceTex,
      normalMap: faceNormal,
      specularMap: faceSpec,
      side: THREE.DoubleSide,
    });

    const fbxLoader = new FBXLoader();
    try {
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
    } catch (_) {}
  }

  // 1. IDLE / SLEEPING: Motionless or subtle breathing in the dark
  public applySittingPosture(time: number): void {
    if (this.monsterType === 'kunti') {
      if (this.mixer && !this.isSittingEvaluated) {
        // Evaluate at natural wide-splayed limb frame (~0.12s) once instead of recomputing all bones every frame
        this.mixer.setTime(0.12);
        this.isSittingEvaluated = true;
      }
      const breathe = Math.sin(time * 1.8) * 0.012;
      // Clinging to vertical wall surface like a cicak (lizard/gecko):
      // Belly, palms of hands, and soles of feet pressed flush against the wall surface (-Z).
      // Body is oriented vertically flat along the wall (rotX = -PI/2, rotZ = PI),
      // with head facing up (+Y) and glowing red eyes looking into the room.
      this.innerGroup.position.set(0, breathe, -0.06);
      this.innerGroup.rotation.set(-Math.PI / 2, 0, Math.PI + Math.sin(time * 1.2) * 0.02);

      const eyeIntensity = 0.5 + Math.sin(time * 3.0) * 0.2;
      this.eyeLight.intensity = eyeIntensity;
      (this.leftEyeGlow.material as THREE.MeshBasicMaterial).color.setHex(0xff1111);
      (this.rightEyeGlow.material as THREE.MeshBasicMaterial).color.setHex(0xff1111);
      for (const m of this.kuntiEyeMeshes) {
        if (m.material && (m.material as THREE.MeshLambertMaterial).emissive) {
          (m.material as THREE.MeshLambertMaterial).emissive.setHex(0xbb0000);
        }
      }
      return;
    }

    if (this.monsterType === 'yeti') {
      if (this.mixer && !this.isSittingEvaluated) {
        this.mixer.setTime(0.04);
        this.isSittingEvaluated = true;
      }
      const breathe = Math.sin(time * 1.5) * 0.02;
      this.innerGroup.position.set(0, breathe, 0);
      this.innerGroup.rotation.set(0.04, 0, Math.sin(time * 1.0) * 0.015);
      this.innerGroup.scale.set(1.0 + breathe * 0.15, 1.0 + breathe * 0.35, 1.0 + breathe * 0.15);
      const eyeIntensity = 0.9 + Math.sin(time * 2.5) * 0.4;
      this.eyeLight.intensity = eyeIntensity;
      (this.leftEyeGlow.material as THREE.MeshBasicMaterial).color.setHex(0xcc0000);
      (this.rightEyeGlow.material as THREE.MeshBasicMaterial).color.setHex(0xcc0000);
      return;
    }

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

    if (this.monsterType === 'kunti') {
      this.isSittingEvaluated = false;
      // Recoils and smoothly transitions from wall-clinging cicak posture (-PI/2, 0, PI) to floor crawl posture (0, 0, 0)
      const rotX = THREE.MathUtils.lerp(-Math.PI / 2, 0, p);
      const rotZ = THREE.MathUtils.lerp(Math.PI, 0, p);
      const posZ = THREE.MathUtils.lerp(-0.06, 0, p);
      this.innerGroup.rotation.set(rotX - flinch * 0.35, 0, rotZ + (Math.random() - 0.5) * flinch * 0.25);
      this.innerGroup.position.set(0, flinch * 0.1, posZ + flinch * 0.25);
      this.eyeLight.intensity = 3.0;
      return;
    }

    if (this.monsterType === 'yeti') {
      this.innerGroup.position.set((Math.random() - 0.5) * 0.08 * flinch, flinch * 0.08, -flinch * 0.42);
      this.innerGroup.rotation.set(-flinch * 0.38, (Math.random() - 0.5) * 0.15, 0);
      this.eyeLight.intensity = 3.2;
      return;
    }

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

  // 3. SCREAM: Head snaps back towards night sky / shrieks violently
  public applyScream(progress: number, time: number): void {
    const p = Math.min(1, Math.max(0, progress));
    const jitterX = (Math.random() - 0.5) * 0.14;
    const jitterZ = (Math.random() - 0.5) * 0.14;

    if (this.monsterType === 'kunti') {
      this.innerGroup.position.set(jitterX, 0.08 * Math.sin(p * Math.PI), jitterZ);
      this.innerGroup.rotation.set(-0.35, (Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2);
      const flare = 2.5 + Math.sin(time * 25) * 1.5;
      this.eyeLight.intensity = flare;
      (this.leftEyeGlow.material as THREE.MeshBasicMaterial).color.setHex(0xff1111);
      (this.rightEyeGlow.material as THREE.MeshBasicMaterial).color.setHex(0xff1111);
      return;
    }

    if (this.monsterType === 'yeti') {
      const shake = (Math.random() - 0.5) * 0.14;
      this.innerGroup.position.set(shake, 0.06 * Math.sin(p * Math.PI), shake);
      this.innerGroup.rotation.set(-0.32, (Math.random() - 0.5) * 0.12, 0);
      const flare = 3.0 + Math.sin(time * 25) * 1.8;
      this.eyeLight.intensity = flare;
      (this.leftEyeGlow.material as THREE.MeshBasicMaterial).color.setHex(0xff0000);
      (this.rightEyeGlow.material as THREE.MeshBasicMaterial).color.setHex(0xff0000);
      return;
    }

    this.innerGroup.position.set(jitterX, 0.08 * Math.sin(p * Math.PI), jitterZ);
    this.innerGroup.rotation.set(-0.45, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.15);

    // Flare glowing red eyes
    const flare = 2.2 + Math.sin(time * 25) * 1.2;
    this.eyeLight.intensity = flare;
    (this.leftEyeGlow.material as THREE.MeshBasicMaterial).color.setHex(0xff3333);
    (this.rightEyeGlow.material as THREE.MeshBasicMaterial).color.setHex(0xff3333);
  }

  // 4. STAND UP: Transition posture into chase
  public applyStandUp(progress: number): void {
    const t = Math.min(1, Math.max(0, progress));

    if (this.monsterType === 'kunti') {
      // Drops directly into fast crawling posture
      this.innerGroup.position.set(0, 0, 0);
      this.innerGroup.rotation.set(0, 0, 0);
      this.innerGroup.scale.set(1.0, 1.0, 1.0);
      this.eyeLight.intensity = 2.2;
      return;
    }

    if (this.monsterType === 'yeti') {
      this.innerGroup.position.set(0, 0, 0);
      this.innerGroup.rotation.set(0.08, 0, 0);
      this.innerGroup.scale.set(1.0, 1.0, 1.0);
      this.eyeLight.intensity = 2.4;
      return;
    }

    this.innerGroup.position.set(0, THREE.MathUtils.lerp(0.08, 0, t), 0);
    this.innerGroup.rotation.set(THREE.MathUtils.lerp(-0.45, 0, t), 0, 0);

    // Spring compression squash
    const squash = Math.sin(t * Math.PI) * 0.1;
    this.innerGroup.scale.set(1.0 + squash, 1.0 - squash * 1.5, 1.0 + squash);

    this.eyeLight.intensity = 2.0;
  }

  // 5. CRAWL (MERANGKAK) — Kuntilanak Mixamo Crawl Animation Loop
  public applyCrawl(dt: number, speed: number): void {
    this.isSittingEvaluated = false;
    if (this.mixer) {
      // mixamo.com clip duration is ~0.667s
      // Match crawling limb cycle to movement speed
      const animRate = Math.max(0.6, speed / 3.2);
      this.crawlAnimAccumulator += dt;
      // Throttled skeletal animation update (~33 FPS) to eliminate mobile CPU/GPU bottleneck while maintaining smooth motion
      if (this.crawlAnimAccumulator >= 0.03) {
        this.mixer.update(this.crawlAnimAccumulator * animRate);
        this.crawlAnimAccumulator = 0;
      }
    }
    // Stay low and grounded
    this.innerGroup.position.set(0, 0, 0);
    this.innerGroup.rotation.set(0, 0, 0);
    this.innerGroup.scale.set(1.0, 1.0, 1.0);

    // Glowing intense red eyes during chase
    this.eyeLight.intensity = 1.0;
    (this.leftEyeGlow.material as THREE.MeshBasicMaterial).color.setHex(0xff0000);
    (this.rightEyeGlow.material as THREE.MeshBasicMaterial).color.setHex(0xff0000);
    for (const m of this.kuntiEyeMeshes) {
      if (m.material && (m.material as THREE.MeshLambertMaterial).emissive) {
        (m.material as THREE.MeshLambertMaterial).emissive.setHex(0xff0000);
      }
    }
  }

  // 5b. WALK (MELANGKAH) — Genderwo Mixamo Walk Animation Loop
  public applyWalk(dt: number, speed: number): void {
    this.isSittingEvaluated = false;
    if (this.mixer) {
      // mixamo.com clip duration is ~1.167s
      // Match walking limb cadence to movement speed
      const animRate = Math.max(0.6, speed / 2.6);
      this.walkAnimAccumulator += dt;
      // Throttled skeletal animation update (~33 FPS) to eliminate mobile CPU/GPU bottleneck while maintaining smooth motion
      if (this.walkAnimAccumulator >= 0.03) {
        this.mixer.update(this.walkAnimAccumulator * animRate);
        this.walkAnimAccumulator = 0;
      }
    }

    // Heavy menacing predator posture
    this.innerGroup.position.set(0, 0, 0);
    this.innerGroup.rotation.set(0.06, 0, 0);
    this.innerGroup.scale.set(1.0, 1.0, 1.0);

    this.eyeLight.intensity = 1.6;
    (this.leftEyeGlow.material as THREE.MeshBasicMaterial).color.setHex(0xff0000);
    (this.rightEyeGlow.material as THREE.MeshBasicMaterial).color.setHex(0xff0000);
  }

  // 6. HOP (MELONCAT): Pocong Airborne jump animation
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
    if (this.monsterType === 'kunti') {
      this.applyCrawl(0.016, speed);
    } else if (this.monsterType === 'yeti') {
      this.applyWalk(0.016, speed);
    } else {
      const cycle = (time * (speed / 2.8)) % 1.0;
      this.applyHopAnimation(cycle, cycle < 0.7);
    }
  }

  // 7. CATCH PLAYER: Jumpscare leap right into player camera
  public applyCatch(time: number): void {
    if (this.monsterType === 'kunti') {
      this.innerGroup.position.set(0, 0.25, 0.45);
      this.innerGroup.rotation.set(-0.25, Math.sin(time * 30) * 0.12, 0);
      this.innerGroup.scale.set(1.35, 1.35, 1.35);
      this.eyeLight.intensity = 4.5;
      (this.leftEyeGlow.material as THREE.MeshBasicMaterial).color.setHex(0xff0000);
      (this.rightEyeGlow.material as THREE.MeshBasicMaterial).color.setHex(0xff0000);
      for (const m of this.kuntiEyeMeshes) {
        if (m.material && (m.material as THREE.MeshLambertMaterial).emissive) {
          (m.material as THREE.MeshLambertMaterial).emissive.setHex(0xff0000);
        }
      }
      return;
    }

    if (this.monsterType === 'yeti') {
      this.innerGroup.position.set(0, 0.05, 0.35);
      this.innerGroup.rotation.set(-0.14, Math.sin(time * 25) * 0.08, 0);
      this.innerGroup.scale.set(1.15, 1.15, 1.15);
      this.eyeLight.intensity = 4.8;
      (this.leftEyeGlow.material as THREE.MeshBasicMaterial).color.setHex(0xff0000);
      (this.rightEyeGlow.material as THREE.MeshBasicMaterial).color.setHex(0xff0000);
      return;
    }

    this.innerGroup.position.set(0, 0.4, 0.45);
    this.innerGroup.rotation.set(-0.35, Math.sin(time * 30) * 0.15, 0);
    this.innerGroup.scale.set(1.25, 1.25, 1.25);

    this.eyeLight.intensity = 4.0;
    (this.leftEyeGlow.material as THREE.MeshBasicMaterial).color.setHex(0xff0000);
    (this.rightEyeGlow.material as THREE.MeshBasicMaterial).color.setHex(0xff0000);
  }
}
