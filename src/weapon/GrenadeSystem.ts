import * as THREE from 'three';
import { AudioManager } from '../core/AudioManager.ts';
import { WeaponModelFactory } from './WeaponModelFactory.ts';

interface GrenadeProjectile {
  mesh: THREE.Group;
  velocity: THREE.Vector3;
  aliveTime: number;
  maxLife: number;
  onExplode: (impactPos: THREE.Vector3) => void;
}

interface ExplosionInstance {
  group: THREE.Group;
  light: THREE.PointLight;
  fireball: THREE.Mesh;
  sparks: Array<{ mesh: THREE.Mesh; velocity: THREE.Vector3 }>;
  smokePuffs: Array<{ sprite: THREE.Sprite; velocity: THREE.Vector3; rotSpeed: number; baseScale: number }>;
  time: number;
  duration: number;
}

export class GrenadeSystem {
  private static instance: GrenadeSystem | null = null;
  private projectiles: GrenadeProjectile[] = [];
  private explosions: ExplosionInstance[] = [];
  private smokeTexture: THREE.CanvasTexture | null = null;
  private sparkMaterial: THREE.MeshBasicMaterial | null = null;

  public static getInstance(): GrenadeSystem {
    if (!GrenadeSystem.instance) {
      GrenadeSystem.instance = new GrenadeSystem();
    }
    return GrenadeSystem.instance;
  }

  constructor() {
    this.initResources();
  }

  private initResources(): void {
    // Generate soft radial smoke puff texture
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const cx = 64;
        const cy = 64;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60);
        grad.addColorStop(0, 'rgba(50, 48, 45, 0.95)');
        grad.addColorStop(0.35, 'rgba(90, 85, 80, 0.75)');
        grad.addColorStop(0.7, 'rgba(130, 125, 120, 0.35)');
        grad.addColorStop(1, 'rgba(160, 155, 150, 0.0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, 60, 0, Math.PI * 2);
        ctx.fill();

        // Add internal noisy clumps for volumetric smoke look
        for (let i = 0; i < 8; i++) {
          const ox = cx + (Math.random() - 0.5) * 36;
          const oy = cy + (Math.random() - 0.5) * 36;
          const r = 16 + Math.random() * 18;
          const g = ctx.createRadialGradient(ox, oy, 0, ox, oy, r);
          g.addColorStop(0, 'rgba(70, 65, 60, 0.4)');
          g.addColorStop(1, 'rgba(90, 85, 80, 0.0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(ox, oy, r, 0, Math.PI * 2);
          ctx.fill();
        }

        this.smokeTexture = new THREE.CanvasTexture(canvas);
      }
    } catch (_) {
      this.smokeTexture = null;
    }

    this.sparkMaterial = new THREE.MeshBasicMaterial({ color: 0xffaa33 });
  }

  public isGrenadeInFlight(): boolean {
    return this.projectiles.length > 0;
  }

  // Launch a thrown grenade projectile from first-person camera
  public throwGrenade(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    onExplode: (impactPos: THREE.Vector3) => void
  ): boolean {
    const projectileMesh = WeaponModelFactory.createGrenadeModel();
    projectileMesh.name = `FlyingGrenadeProjectile_${Date.now()}`;
    // Scale up slightly for prominent FPS visual clarity so the player can see it fly into the world!
    projectileMesh.scale.set(1.5, 1.5, 1.5);

    // Initial position: matches the player's hand release position at the center-front of camera
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);

    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);

    const spawnPos = camera.position
      .clone()
      .addScaledVector(forward, 0.78)
      .addScaledVector(right, 0.08)
      .addScaledVector(up, -0.06);

    projectileMesh.position.copy(spawnPos);
    scene.add(projectileMesh);

    // Initial ballistic velocity: fast forward thrust with upward arc
    const throwSpeed = 22.0;
    const upwardThrust = 4.2;
    const velocity = forward.clone().multiplyScalar(throwSpeed).add(new THREE.Vector3(0, upwardThrust, 0));

    this.projectiles.push({
      mesh: projectileMesh,
      velocity,
      aliveTime: 0,
      maxLife: 1.8, // 1.8s fuse guarantees it ALWAYS explodes quickly
      onExplode,
    });

    return true;
  }

  // Trigger high-impact explosion with fireball flash, dynamic point light, flying sparks, and spreading smoke
  public spawnExplosion(scene: THREE.Scene, pos: THREE.Vector3): void {
    AudioManager.getInstance().playExplosion();

    const explosionGroup = new THREE.Group();
    explosionGroup.name = 'GrenadeExplosionGroup';
    explosionGroup.position.copy(pos);

    // 1. Dynamic Blast Light (illuminates walls, floors, ceiling)
    const blastLight = new THREE.PointLight(0xff6611, 16, 18, 1.2);
    blastLight.position.set(0, 0.4, 0);
    explosionGroup.add(blastLight);

    // 2. Expanding Core Fireball Sphere
    const fireGeom = new THREE.SphereGeometry(0.5, 10, 8);
    const fireMat = new THREE.MeshBasicMaterial({
      color: 0xffaa22,
      transparent: true,
      opacity: 0.95,
    });
    const fireball = new THREE.Mesh(fireGeom, fireMat);
    explosionGroup.add(fireball);

    // 3. Flying Fiery Sparks & Debris
    const sparks: Array<{ mesh: THREE.Mesh; velocity: THREE.Vector3 }> = [];
    const sparkCount = 14;
    const sparkGeom = new THREE.BoxGeometry(0.06, 0.06, 0.06);
    for (let i = 0; i < sparkCount; i++) {
      const sparkMesh = new THREE.Mesh(sparkGeom, this.sparkMaterial || new THREE.MeshBasicMaterial({ color: 0xff8800 }));
      sparkMesh.position.set(0, 0.2, 0);
      explosionGroup.add(sparkMesh);

      const angle = Math.random() * Math.PI * 2;
      const pitch = (Math.random() - 0.2) * Math.PI * 0.5;
      const spd = 5.0 + Math.random() * 8.0;
      const sVel = new THREE.Vector3(
        Math.cos(angle) * Math.cos(pitch) * spd,
        Math.sin(pitch) * spd + 3.0,
        Math.sin(angle) * Math.cos(pitch) * spd
      );
      sparks.push({ mesh: sparkMesh, velocity: sVel });
    }

    // 4. Wide Spreading Smoke Puffs ("kemudia asap yang keluar menyebar cukup luas selanjutnya menghilang perlahan")
    const smokePuffs: Array<{ sprite: THREE.Sprite; velocity: THREE.Vector3; rotSpeed: number; baseScale: number }> = [];
    const puffCount = 18;

    for (let i = 0; i < puffCount; i++) {
      const spriteMat = new THREE.SpriteMaterial({
        map: this.smokeTexture,
        color: 0x3d3935,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      });
      const sprite = new THREE.Sprite(spriteMat);

      // Random starting radial offset
      const startAngle = (i / puffCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const startDist = 0.2 + Math.random() * 0.4;
      sprite.position.set(
        Math.cos(startAngle) * startDist,
        0.1 + Math.random() * 0.3,
        Math.sin(startAngle) * startDist
      );

      // Broad outward spreading velocity
      const outSpeed = 1.4 + Math.random() * 2.2; // Spreads up to ~5-7 meters outward
      const upwardRise = 0.35 + Math.random() * 0.5; // Gentle thermal rise
      const pVel = new THREE.Vector3(
        Math.cos(startAngle) * outSpeed,
        upwardRise,
        Math.sin(startAngle) * outSpeed
      );

      const baseScale = 1.0 + Math.random() * 0.6;
      sprite.scale.set(baseScale, baseScale, 1);
      explosionGroup.add(sprite);

      smokePuffs.push({
        sprite,
        velocity: pVel,
        rotSpeed: (Math.random() - 0.5) * 1.5,
        baseScale,
      });
    }

    scene.add(explosionGroup);

    this.explosions.push({
      group: explosionGroup,
      light: blastLight,
      fireball,
      sparks,
      smokePuffs,
      time: 0,
      duration: 3.4, // Smoke lingers and fades away over 3.4s
    });
  }

  // Update flying projectile physics and active explosions
  public update(
    dt: number,
    scene: THREE.Scene,
    blockingMeshes: THREE.Object3D[] = [],
    monsterPositions: THREE.Vector3[] = [],
    groundY: number = 0
  ): void {
    // 1. Update In-Flight Projectiles (Guaranteed to always fly and explode)
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.aliveTime += dt;

      // Gravity & Tumble (dynamic 3D tumbling spin in air)
      p.velocity.y -= 9.8 * dt;
      p.mesh.rotation.x += dt * 10.0;
      p.mesh.rotation.y += dt * 6.0;
      p.mesh.rotation.z += dt * 8.0;

      const currentPos = p.mesh.position.clone();
      const stepVec = p.velocity.clone().multiplyScalar(dt);
      const nextPos = currentPos.clone().add(stepVec);
      const stepDist = stepVec.length();

      let hasImpacted = false;
      const impactPos = nextPos.clone();

      // 1. Raycast collision along flight path with solid walls & environment
      if (blockingMeshes.length > 0 && stepDist > 0.001) {
        const raycaster = new THREE.Raycaster(currentPos, stepVec.clone().normalize(), 0, stepDist + 0.20);
        const hits = raycaster.intersectObjects(blockingMeshes, true);
        if (hits.length > 0) {
          hasImpacted = true;
          impactPos.copy(hits[0].point);
        }
      }

      // 2. Downward raycast from nextPos to catch floors & stairs at any elevation
      if (!hasImpacted && blockingMeshes.length > 0) {
        const downRay = new THREE.Raycaster(nextPos, new THREE.Vector3(0, -1, 0), 0, 0.45);
        const floorHits = downRay.intersectObjects(blockingMeshes, true);
        if (floorHits.length > 0) {
          hasImpacted = true;
          impactPos.copy(floorHits[0].point);
        }
      }

      // 3. Absolute safety ground floor impact fallback
      if (!hasImpacted && nextPos.y <= groundY + 0.1) {
        hasImpacted = true;
        impactPos.y = groundY + 0.1;
      }

      // 4. Direct proximity collision with sleeping monsters
      if (!hasImpacted) {
        for (const mPos of monsterPositions) {
          if (nextPos.distanceTo(mPos) <= 1.1) {
            hasImpacted = true;
            impactPos.copy(mPos);
            break;
          }
        }
      }

      // 5. Max flight timer fuse (1.8s) - guarantees grenade ALWAYS explodes even in mid-air
      if (!hasImpacted && p.aliveTime >= p.maxLife) {
        hasImpacted = true;
      }

      if (hasImpacted) {
        // Detonate!
        scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
        this.spawnExplosion(scene, impactPos);
        p.onExplode(impactPos);
      } else {
        p.mesh.position.copy(nextPos);
      }
    }

    // 2. Update Active Explosions (Fireball, Light, Sparks, Wide Smoke)
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const exp = this.explosions[i];
      exp.time += dt;
      const progress = exp.time / exp.duration;

      // Fireball phase (0.0 -> 0.35s)
      if (exp.time <= 0.35) {
        const fireT = exp.time / 0.35;
        const fireScale = THREE.MathUtils.lerp(0.5, 3.2, Math.sin(fireT * Math.PI * 0.7));
        exp.fireball.scale.set(fireScale, fireScale, fireScale);
        (exp.fireball.material as THREE.MeshBasicMaterial).opacity = 1 - fireT * 0.6;
      } else {
        exp.fireball.visible = false;
      }

      // Light flash decay
      if (exp.time <= 0.45) {
        const lightT = exp.time / 0.45;
        exp.light.intensity = THREE.MathUtils.lerp(16, 0, lightT * lightT);
      } else {
        exp.light.intensity = 0;
      }

      // Sparks physics
      for (const sp of exp.sparks) {
        sp.velocity.y -= 12.0 * dt;
        sp.velocity.multiplyScalar(0.96); // Air drag
        sp.mesh.position.addScaledVector(sp.velocity, dt);
        if (exp.time > 0.5) {
          sp.mesh.scale.multiplyScalar(0.94);
        }
      }

      // Smoke Cloud Expansion & Lingering Fade
      // Spreads out broadly across horizontal space, grows huge, then slowly vanishes
      for (const puff of exp.smokePuffs) {
        // Horizontal deceleration (smoke slows as it expands)
        puff.velocity.x *= 0.97;
        puff.velocity.z *= 0.97;
        puff.sprite.position.addScaledVector(puff.velocity, dt);

        // Broad volumetric smoke expansion (scale expands from 1.0 up to 4.2m+)
        const expansion = THREE.MathUtils.lerp(puff.baseScale, puff.baseScale * 3.6, Math.min(1, exp.time / 1.5));
        puff.sprite.scale.set(expansion, expansion, 1);

        // Slow fade out over duration ("selanjutnya menghilang perlahan")
        const fade = Math.max(0, 1 - Math.pow(progress, 1.2));
        puff.sprite.material.opacity = fade * 0.85;
      }

      if (progress >= 1.0) {
        scene.remove(exp.group);
        this.explosions.splice(i, 1);
      }
    }
  }

  // Reset / Clear all active projectiles and explosion particles
  public reset(scene?: THREE.Scene): void {
    for (const p of this.projectiles) {
      if (scene) scene.remove(p.mesh);
    }
    this.projectiles = [];
    for (const exp of this.explosions) {
      if (scene) scene.remove(exp.group);
    }
    this.explosions = [];
  }
}
