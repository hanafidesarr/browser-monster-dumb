import * as THREE from 'three';
import { LevelDefinition } from './LevelData.ts';
import { TextureGenerator } from './TextureGenerator.ts';
import { BananaTreeFactory } from './BananaTreeFactory.ts';
import { BanyanTreeFactory } from './BanyanTreeFactory.ts';
import { WeaponId } from '../weapon/WeaponData.ts';
import { WeaponModelFactory } from '../weapon/WeaponModelFactory.ts';
import { EnvironmentPropFactory } from './EnvironmentPropFactory.ts';
import {
  WorldRamp,
  WorldBridge,
  StairwellOpening,
  LevelCollisionConfig,
  EnvironmentId,
  BoxCollider,
  FallZoneConfig,
} from './LevelCollisionConfig.ts';
import { SpawnManager, SelectedSpawns } from './SpawnManager.ts';
import { SaveManager } from '../core/SaveManager.ts';

export type { WorldRamp, WorldBridge, StairwellOpening, SelectedSpawns };

export interface WorldWeaponPickup {
  weaponId: WeaponId;
  group: THREE.Group;
  position: THREE.Vector3;
  collected: boolean;
}

export interface WorldInteractiveSwitch {
  id: string;
  name: string;
  group: THREE.Group;
  position: THREE.Vector3;
  activated: boolean;
  beaconMesh: THREE.Mesh;
  light: THREE.PointLight;
}

export interface LevelBuildResult {
  rootGroup: THREE.Group;
  wallsMesh: THREE.Mesh;
  exitDoorMesh: THREE.Group;
  exitTriggerBox: THREE.Box3;
  playerMarker: THREE.Group;
  monsterMarker: THREE.Group;
  monsterMarkers: THREE.Group[];
  exitMarker: THREE.Group;
  overviewMapGroup: THREE.Group;
  playerWorldSpawn: { x: number; y: number; z: number; rotationY: number; floor?: number };
  monsterWorldSpawn: { x: number; y: number; z: number; rotationY: number; floor?: number };
  monsterWorldSpawns: Array<{ x: number; y: number; z: number; rotationY: number; floor?: number }>;
  exitWorldPos: { x: number; y: number; z: number; floor?: number };
  selectedSpawns?: SelectedSpawns;
  treeColliders: Array<{ x: number; z: number; radius: number }>;
  updatedGrid: number[][];
  navigationGrid: number[][];
  collisionConfig: LevelCollisionConfig;
  weaponPickups: WorldWeaponPickup[];
  interactiveSwitches?: WorldInteractiveSwitch[];
  floorCount: number;
  floorHeight: number;
  ramps: WorldRamp[];
  bridges: WorldBridge[];
  stairOpenings: StairwellOpening[];
  blockingMeshes: THREE.Object3D[];
}

export class LabyrinthBuilder {
  public static buildLevel(level: LevelDefinition, spawns?: SelectedSpawns): LevelBuildResult {
    // PRESERVE LEVEL 1: If Level 1 or Banana Garden, use the original lush banana plantation builder
    if (level.theme === 'banana_garden' || level.id === 1) {
      return this.buildBananaGardenLevel(level, spawns);
    }

    // LEVEL 4: Sacred Indonesian Cemetery & Banyan Grove (Expansive Outdoor)
    if (level.theme === 'cemetery' || level.id === 4) {
      return this.buildCemeteryLevel(level, spawns);
    }

    // LEVEL 5: Military Underground Bunker (Outdoor Outpost & Expansive Concrete Bunker)
    if (level.theme === 'bunker' || level.id === 5) {
      return this.buildBunkerLevel(level, spawns);
    }

    // For Levels 2, 3, 6 to 10: Build distinct themed 3D environments
    return this.buildThemedLevel(level, spawns);
  }

  // =========================================================================
  // LEVEL 1 — HAUNTED BANANA GARDEN (100% PRESERVED EXISTING LEVEL)
  // =========================================================================
  private static buildBananaGardenLevel(level: LevelDefinition, spawns?: SelectedSpawns): LevelBuildResult {
    const rootGroup = new THREE.Group();
    rootGroup.name = 'BananaForestRoot';

    const { gridWidth, gridHeight, cellSize, wallHeight } = level;
    const halfWidth = (gridWidth * cellSize) / 2;
    const halfHeight = (gridHeight * cellSize) / 2;

    // 1. Forest Ground (Tanah Kebun Pisang Luas)
    const floorTex = TextureGenerator.createForestGroundTexture();
    floorTex.repeat.set(gridWidth * 1.5, gridHeight * 1.5);

    const floorMat = new THREE.MeshLambertMaterial({
      map: floorTex,
      roughness: 0.9,
      side: THREE.DoubleSide,
    });

    const totalW = gridWidth * cellSize + 50;
    const totalH = gridHeight * cellSize + 50;

    const floorGeo = new THREE.PlaneGeometry(totalW, totalH);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.set(0, 0, 0);
    floorMesh.receiveShadow = true;
    rootGroup.add(floorMesh);

    // 2. Open Night Sky & Starfield
    const starCount = 320;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * totalW * 2.5;
      starPositions[i * 3 + 1] = 28 + Math.random() * 45;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * totalH * 2.5;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xf5f5f5,
      size: 0.22,
      transparent: true,
      opacity: 0.65,
    });
    const starfield = new THREE.Points(starGeo, starMat);
    rootGroup.add(starfield);

    // Haunted Banana Garden (Level 1) Atmospheric Lighting:
    // Brightness matched to Level 2 (School) for clear navigation and vivid visibility
    const skyLight = new THREE.DirectionalLight(0xd6e5d8, 1.8);
    skyLight.position.set(halfWidth * 0.8, 55, -halfHeight * 0.85);
    skyLight.target.position.set(0, 0, 0);
    rootGroup.add(skyLight);
    rootGroup.add(skyLight.target);

    // Bright ambient fill matching Level 2
    const ambientLight = new THREE.AmbientLight(0x3d4740, 2.2);
    rootGroup.add(ambientLight);

    // Complementary sky vs earth bounce light
    const hemiLight = new THREE.HemisphereLight(0xd6e5d8, 0x2d3630, 0.95);
    rootGroup.add(hemiLight);

    // 3. Spawns & Clearings Calculation
    const selectedSpawns = spawns || SpawnManager.generateSpawns(level);
    const pSpawnWx = selectedSpawns.player.x;
    const pSpawnWy = selectedSpawns.player.y;
    const pSpawnWz = selectedSpawns.player.z;

    const monsterSpawns = selectedSpawns.monsters;
    const mSpawnWx = monsterSpawns[0].x;
    const mSpawnWy = monsterSpawns[0].y;
    const mSpawnWz = monsterSpawns[0].z;

    const exitWx = selectedSpawns.exit.x;
    const exitWy = selectedSpawns.exit.y;
    const exitWz = selectedSpawns.exit.z;

    // 4. Randomized, Organic Banana Tree Placement
    const forestObstaclesGroup = new THREE.Group();
    forestObstaclesGroup.name = 'BananaObstacles';

    const treeColliders: Array<{ x: number; z: number; radius: number }> = [];
    const updatedGrid: number[][] = Array.from({ length: gridHeight }, () => Array(gridWidth).fill(0));

    for (let gz = 0; gz < gridHeight; gz++) {
      for (let gx = 0; gx < gridWidth; gx++) {
        if (gx === 0 || gx === gridWidth - 1 || gz === 0 || gz === gridHeight - 1) {
          updatedGrid[gz][gx] = 1;
        }
      }
    }

    // Boundary Trees
    for (let gx = 0; gx < gridWidth; gx++) {
      const nWx = (gx + 0.5) * cellSize - halfWidth;
      const nWz = 0.5 * cellSize - halfHeight;
      const sWz = (gridHeight - 0.5) * cellSize - halfHeight;

      const nTree = BananaTreeFactory.createBananaTree({ height: 7.0, trunkRadius: 0.36 });
      nTree.position.set(nWx, 0, nWz);
      forestObstaclesGroup.add(nTree);

      const sTree = BananaTreeFactory.createBananaTree({ height: 7.2, trunkRadius: 0.36 });
      sTree.position.set(nWx, 0, sWz);
      forestObstaclesGroup.add(sTree);
    }

    for (let gz = 1; gz < gridHeight - 1; gz++) {
      const wWx = 0.5 * cellSize - halfWidth;
      const eWx = (gridWidth - 0.5) * cellSize - halfWidth;
      const wWz = (gz + 0.5) * cellSize - halfHeight;

      const wTree = BananaTreeFactory.createBananaTree({ height: 7.1, trunkRadius: 0.36 });
      wTree.position.set(wWx, 0, wWz);
      forestObstaclesGroup.add(wTree);

      const eTree = BananaTreeFactory.createBananaTree({ height: 6.9, trunkRadius: 0.36 });
      eTree.position.set(eWx, 0, wWz);
      forestObstaclesGroup.add(eTree);
    }

    // Sacred Ancient Banana Tree over Pocong Shrine (stands behind resting Pocong)
    const sacredTree = BananaTreeFactory.createBananaTree({
      height: 7.8,
      trunkRadius: 0.45,
      hasBud: true,
    });
    sacredTree.position.set(mSpawnWx, 0, mSpawnWz - 1.8);
    forestObstaclesGroup.add(sacredTree);
    treeColliders.push({ x: mSpawnWx, z: mSpawnWz - 1.8, radius: 0.55 });

    let seed = 9876543;
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const isNearClearings = (x: number, z: number): boolean => {
      if (Math.hypot(x - pSpawnWx, z - pSpawnWz) < 6.0) return true;
      for (let i = 0; i < monsterSpawns.length; i++) {
        if (Math.hypot(x - monsterSpawns[i].x, z - monsterSpawns[i].z) < 5.0) return true;
      }
      if (Math.hypot(x - exitWx, z - exitWz) < 6.5) return true;
      if (Math.abs(x) > halfWidth - 3.8 || Math.abs(z) > halfHeight - 3.8) return true;
      return false;
    };

    const minTreeSpacing = 4.2;
    const candidateAttempts = 900;

    for (let i = 0; i < candidateAttempts; i++) {
      const tx = (rnd() * 2 - 1) * (halfWidth - 3.5);
      const tz = (rnd() * 2 - 1) * (halfHeight - 3.5);

      if (isNearClearings(tx, tz)) continue;

      let tooClose = false;
      for (let j = 0; j < treeColliders.length; j++) {
        const ct = treeColliders[j];
        if (Math.hypot(tx - ct.x, tz - ct.z) < minTreeSpacing) {
          tooClose = true;
          break;
        }
      }

      if (!tooClose) {
        const treeHeight = 6.2 + rnd() * 1.6;
        const trunkR = 0.30 + rnd() * 0.08;
        const leanX = (rnd() - 0.5) * 0.35;
        const leanZ = (rnd() - 0.5) * 0.35;

        const tree = BananaTreeFactory.createBananaTree({
          height: treeHeight,
          trunkRadius: trunkR,
          leanX,
          leanZ,
          hasBud: rnd() > 0.35,
        });
        tree.position.set(tx, 0, tz);
        tree.rotation.y = rnd() * Math.PI * 2;
        forestObstaclesGroup.add(tree);

        if (rnd() > 0.6) {
          const shoot = BananaTreeFactory.createBananaTree({
            height: 1.8 + rnd() * 0.7,
            trunkRadius: 0.12,
            hasBud: false,
          });
          shoot.position.set(tx + 0.45, 0, tz + 0.35);
          shoot.rotation.y = rnd() * Math.PI * 2;
          forestObstaclesGroup.add(shoot);
        }

        treeColliders.push({ x: tx, z: tz, radius: 0.48 });

        const gx = Math.floor((tx + halfWidth) / cellSize);
        const gz = Math.floor((tz + halfHeight) / cellSize);
        if (gx >= 0 && gx < gridWidth && gz >= 0 && gz < gridHeight) {
          if (!isNearClearings(tx, tz)) {
            updatedGrid[gz][gx] = 1;
          }
        }
      }
    }

    rootGroup.add(forestObstaclesGroup);

    // Wall colliders mesh
    const wallMat = new THREE.MeshBasicMaterial({ visible: false });
    const wallsMesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), wallMat);
    rootGroup.add(wallsMesh);

    // Bamboo Exit Gate
    const exitDoorGroup = new THREE.Group();
    exitDoorGroup.name = 'VillageExitGate';
    exitDoorGroup.position.set(exitWx, exitWy, exitWz);

    const bambooTex = TextureGenerator.createBambooTexture();
    const woodTex = TextureGenerator.createGateWoodTexture();
    const bambooMat = new THREE.MeshLambertMaterial({ map: bambooTex, roughness: 0.8 });
    const woodMat = new THREE.MeshLambertMaterial({ map: woodTex, roughness: 0.85 });

    const postGeo = new THREE.CylinderGeometry(0.14, 0.16, 3.8, 7);
    const leftPost = new THREE.Mesh(postGeo, bambooMat);
    leftPost.position.set(-cellSize * 0.38, 1.9, 0);
    exitDoorGroup.add(leftPost);

    const rightPost = new THREE.Mesh(postGeo, bambooMat);
    rightPost.position.set(cellSize * 0.38, 1.9, 0);
    exitDoorGroup.add(rightPost);

    const lintel = new THREE.Mesh(new THREE.BoxGeometry(cellSize * 1.05, 0.24, 0.28), woodMat);
    lintel.position.set(0, 3.5, 0);
    exitDoorGroup.add(lintel);

    const signCanvas = document.createElement('canvas');
    signCanvas.width = 256;
    signCanvas.height = 64;
    const sCtx = signCanvas.getContext('2d')!;
    sCtx.fillStyle = '#261a10';
    sCtx.fillRect(0, 0, 256, 64);
    sCtx.strokeStyle = '#4a3520';
    sCtx.lineWidth = 4;
    sCtx.strokeRect(2, 2, 252, 60);
    sCtx.fillStyle = '#45f56c';
    sCtx.font = 'bold 24px monospace';
    sCtx.textAlign = 'center';
    sCtx.textBaseline = 'middle';
    sCtx.fillText('JALAN KELUAR', 128, 32);

    const signTex = new THREE.CanvasTexture(signCanvas);
    const signMesh = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.5, 0.08), new THREE.MeshBasicMaterial({ map: signTex }));
    signMesh.position.set(0, 3.0, 0.12);
    exitDoorGroup.add(signMesh);

    const exitPointLight = new THREE.PointLight(0x22c55e, 2.0, 10, 1.2);
    exitPointLight.position.set(0, 2.4, 0.4);
    exitDoorGroup.add(exitPointLight);

    rootGroup.add(exitDoorGroup);

    const exitTriggerBox = new THREE.Box3(
      new THREE.Vector3(exitWx - cellSize * 0.8, exitWy, exitWz - cellSize * 0.8),
      new THREE.Vector3(exitWx + cellSize * 0.8, exitWy + wallHeight, exitWz + cellSize * 0.8)
    );

    // Markers for Overview Camera
    const markers = this.createOverviewMarkers(pSpawnWx, monsterSpawns, exitWx, exitWz, wallHeight, pSpawnWz);
    rootGroup.add(markers.playerMarker);
    markers.monsterMarkers.forEach((m) => rootGroup.add(m));
    rootGroup.add(markers.exitMarker);

    // Pickups
    const weaponPickups = this.spawnWorldPickups(level, halfWidth, halfHeight, cellSize, rootGroup);

    // LEVEL 1 SPECIFIC COLLISION CONFIGURATION
    // Pure single-floor open plantation: strictly cylinder tree colliders, no stairs, no grid wall cubes
    const collisionConfig: LevelCollisionConfig = {
      levelId: 1,
      environmentId: 'haunted_banana_garden',
      multiFloor: false,
      floorCount: 1,
      floorHeight: 0,
      perimeterMargin: 1.2,
      useGridWalls: false, // Critical: open plantation, player slides around tree cylinders, no 3.8m box walls!
      cylinderColliders: treeColliders.map((t) => ({ x: t.x, z: t.z, radius: t.radius, label: 'banana_tree' })),
      boxColliders: [],
      hasStairs: false,
      ramps: [],
      bridges: [],
      stairOpenings: [],
      fallZones: [],
    };

    // 2D Paper Sketch Collider Map
    const overviewMapGroup = LabyrinthBuilder.createOverviewColliderMap(
      level,
      updatedGrid,
      treeColliders,
      pSpawnWx,
      pSpawnWz,
      selectedSpawns.player.rotationY,
      monsterSpawns
    );

    return {
      rootGroup,
      wallsMesh,
      exitDoorMesh: exitDoorGroup,
      exitTriggerBox,
      playerMarker: markers.playerMarker,
      monsterMarker: markers.monsterMarkers[0],
      monsterMarkers: markers.monsterMarkers,
      exitMarker: markers.exitMarker,
      overviewMapGroup,
      playerWorldSpawn: { x: pSpawnWx, y: pSpawnWy, z: pSpawnWz, rotationY: selectedSpawns.player.rotationY, floor: selectedSpawns.player.floor },
      monsterWorldSpawn: { x: mSpawnWx, y: mSpawnWy, z: mSpawnWz, rotationY: monsterSpawns[0].rotationY, floor: monsterSpawns[0].floor },
      monsterWorldSpawns: monsterSpawns,
      exitWorldPos: { x: exitWx, y: exitWy, z: exitWz, floor: selectedSpawns.exit.floor },
      selectedSpawns,
      treeColliders,
      updatedGrid,
      navigationGrid: updatedGrid,
      collisionConfig,
      weaponPickups,
      floorCount: 1,
      floorHeight: 0,
      ramps: [],
      bridges: [],
      stairOpenings: [],
      blockingMeshes: [wallsMesh, floorMesh],
    };
  }

  // =========================================================================
  // LEVEL 4 — SACRED INDONESIAN CEMETERY & EXPANSIVE BANYAN GROVE
  // =========================================================================
  private static buildCemeteryLevel(level: LevelDefinition, spawns?: SelectedSpawns): LevelBuildResult {
    const rootGroup = new THREE.Group();
    rootGroup.name = 'CemeteryRoot';

    const { gridWidth, gridHeight, cellSize, wallHeight } = level;
    const halfWidth = (gridWidth * cellSize) / 2;
    const halfHeight = (gridHeight * cellSize) / 2;

    // 1. Expansive Dark Damp Cemetery Ground
    const floorTex = typeof document !== 'undefined'
      ? TextureGenerator.createCemeteryGroundTexture()
      : undefined;
    if (floorTex) {
      floorTex.repeat.set(gridWidth * 1.5, gridHeight * 1.5);
    }

    const floorMat = new THREE.MeshLambertMaterial({
      map: floorTex,
      roughness: 0.9,
      side: THREE.DoubleSide,
    });

    const totalW = gridWidth * cellSize + 60;
    const totalH = gridHeight * cellSize + 60;

    const floorGeo = new THREE.PlaneGeometry(totalW, totalH);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.set(0, 0, 0);
    floorMesh.receiveShadow = true;
    rootGroup.add(floorMesh);

    // 2. Open Eerie Night Sky & Starfield
    const starCount = 380;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * totalW * 2.5;
      starPositions[i * 3 + 1] = 30 + Math.random() * 50;
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * totalH * 2.5;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xe8eef5,
      size: 0.24,
      transparent: true,
      opacity: 0.65,
    });
    rootGroup.add(new THREE.Points(starGeo, starMat));

    // 3. Cemetery Atmospheric Lighting — Brightness matched to Level 1
    const skyLight = new THREE.DirectionalLight(0xd6e5d8, 2.0);
    skyLight.position.set(halfWidth * 0.8, 60, -halfHeight * 0.85);
    skyLight.target.position.set(0, 0, 0);
    rootGroup.add(skyLight);
    rootGroup.add(skyLight.target);

    const ambientLight = new THREE.AmbientLight(0x3d4740, 2.3);
    rootGroup.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xd6e5d8, 0x2d3630, 1.05);
    rootGroup.add(hemiLight);

    // 4. Spawns Calculation
    const selectedSpawns = spawns || SpawnManager.generateSpawns(level);
    const pSpawnWx = selectedSpawns.player.x;
    const pSpawnWy = selectedSpawns.player.y;
    const pSpawnWz = selectedSpawns.player.z;

    const monsterSpawns = selectedSpawns.monsters;
    const mSpawnWx = monsterSpawns[0].x;
    const mSpawnWy = monsterSpawns[0].y;
    const mSpawnWz = monsterSpawns[0].z;

    const exitWx = selectedSpawns.exit.x;
    const exitWy = selectedSpawns.exit.y;
    const exitWz = selectedSpawns.exit.z;

    // 5. Perimeter Boundaries & Obstacle Colliders
    const treeColliders: Array<{ x: number; z: number; radius: number; label?: string }> = [];
    const updatedGrid: number[][] = Array.from({ length: gridHeight }, () => Array(gridWidth).fill(0));

    for (let gz = 0; gz < gridHeight; gz++) {
      for (let gx = 0; gx < gridWidth; gx++) {
        if (gx === 0 || gx === gridWidth - 1 || gz === 0 || gz === gridHeight - 1) {
          updatedGrid[gz][gx] = 1;
        }
      }
    }

    // Boundary Perimeter Trees (Pohon Beringin Pembatas Luar — No walls, natural tree boundary like Level 1)
    for (let gx = 0; gx < gridWidth; gx++) {
      const nWx = (gx + 0.5) * cellSize - halfWidth;
      const nWz = 0.5 * cellSize - halfHeight;
      const sWz = (gridHeight - 0.5) * cellSize - halfHeight;

      const nBanyan = BanyanTreeFactory.createBanyanTree({ height: 8.5, trunkRadius: 1.1, canopyRadius: 4.8 });
      nBanyan.position.set(nWx, 0, nWz);
      rootGroup.add(nBanyan);
      treeColliders.push({ x: nWx, z: nWz, radius: 1.25, label: 'perimeter_banyan' });

      const sBanyan = BanyanTreeFactory.createBanyanTree({ height: 8.8, trunkRadius: 1.15, canopyRadius: 5.0 });
      sBanyan.position.set(nWx, 0, sWz);
      rootGroup.add(sBanyan);
      treeColliders.push({ x: nWx, z: sWz, radius: 1.25, label: 'perimeter_banyan' });
    }

    for (let gz = 1; gz < gridHeight - 1; gz++) {
      const wWx = 0.5 * cellSize - halfWidth;
      const eWx = (gridWidth - 0.5) * cellSize - halfWidth;
      const wWz = (gz + 0.5) * cellSize - halfHeight;

      const wBanyan = BanyanTreeFactory.createBanyanTree({ height: 8.4, trunkRadius: 1.1, canopyRadius: 4.8 });
      wBanyan.position.set(wWx, 0, wWz);
      rootGroup.add(wBanyan);
      treeColliders.push({ x: wWx, z: wWz, radius: 1.25, label: 'perimeter_banyan' });

      const eBanyan = BanyanTreeFactory.createBanyanTree({ height: 8.6, trunkRadius: 1.12, canopyRadius: 4.9 });
      eBanyan.position.set(eWx, 0, wWz);
      rootGroup.add(eBanyan);
      treeColliders.push({ x: eWx, z: wWz, radius: 1.25, label: 'perimeter_banyan' });
    }

    // Invisible dummy wall mesh so LabyrinthBuild interface has wallsMesh (just like Level 1)
    const wallMat = new THREE.MeshBasicMaterial({ visible: false });
    const wallsMesh = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.1), wallMat);
    rootGroup.add(wallsMesh);

    // 6. Sacred Centerpiece Banyan Tree at Map Center (gx: 13, gz: 13)
    const centerWx = (13 + 0.5) * cellSize - halfWidth;
    const centerWz = (13 + 0.5) * cellSize - halfHeight;
    const centerTree = BanyanTreeFactory.createBanyanTree({
      height: 11.2,
      trunkRadius: 1.45,
      canopyRadius: 7.2,
      isSacredCenterpiece: true,
    });
    centerTree.position.set(centerWx, 0, centerWz);
    rootGroup.add(centerTree);
    treeColliders.push({ x: centerWx, z: centerWz, radius: 1.6, label: 'sacred_banyan_center' });
    updatedGrid[13][13] = 1;

    // 7. Kuncen Caretaker Shack (Gubuk Kuncen) at gx: 7, gz: 13
    const kuncenWx = (7 + 0.5) * cellSize - halfWidth;
    const kuncenWz = (13 + 0.5) * cellSize - halfHeight;
    const kuncenHut = EnvironmentPropFactory.createKuncenHut();
    kuncenHut.position.set(kuncenWx, 0, kuncenWz);
    kuncenHut.rotation.y = -Math.PI / 2; // Facing east towards central sacred banyan
    rootGroup.add(kuncenHut);
    treeColliders.push({ x: kuncenWx, z: kuncenWz, radius: 2.1, label: 'kuncen_hut' });
    updatedGrid[13][7] = 1;

    // 8. Dense Organic Banyan Grove (Pohon Beringin Rapat seperti Level 1)
    let seed = 4829107;
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const isNearClearings = (x: number, z: number): boolean => {
      if (Math.hypot(x - pSpawnWx, z - pSpawnWz) < 7.0) return true;
      for (let i = 0; i < monsterSpawns.length; i++) {
        if (Math.hypot(x - monsterSpawns[i].x, z - monsterSpawns[i].z) < 4.5) return true;
      }
      if (Math.hypot(x - exitWx, z - exitWz) < 8.0) return true;
      if (Math.hypot(x - kuncenWx, z - kuncenWz) < 5.5) return true;
      if (Math.hypot(x - centerWx, z - centerWz) < 5.5) return true;
      // Arterial paths: diagonal avenue and central cross axes for player sprint & monster chase
      if (Math.abs(x - z) < 2.4 && Math.hypot(x, z) < halfWidth * 0.9) return true;
      if (Math.abs(x) < 2.2 || Math.abs(z) < 2.2) return true;
      if (Math.abs(x) > halfWidth - 5.0 || Math.abs(z) > halfHeight - 5.0) return true;
      return false;
    };

    const minTreeSpacing = 6.2;
    const candidateAttempts = 450;

    for (let i = 0; i < candidateAttempts; i++) {
      const tx = (rnd() * 2 - 1) * (halfWidth - 5.5);
      const tz = (rnd() * 2 - 1) * (halfHeight - 5.5);

      if (isNearClearings(tx, tz)) continue;

      let tooClose = false;
      for (let j = 0; j < treeColliders.length; j++) {
        const ct = treeColliders[j];
        if (Math.hypot(tx - ct.x, tz - ct.z) < minTreeSpacing) {
          tooClose = true;
          break;
        }
      }

      if (!tooClose) {
        const treeH = 7.4 + rnd() * 2.8;
        const trunkR = 0.82 + rnd() * 0.35;
        const canopyR = 4.2 + rnd() * 1.4;

        const banyan = BanyanTreeFactory.createBanyanTree({
          height: treeH,
          trunkRadius: trunkR,
          canopyRadius: canopyR,
        });
        banyan.position.set(tx, 0, tz);
        banyan.rotation.y = rnd() * Math.PI * 2;
        rootGroup.add(banyan);

        treeColliders.push({ x: tx, z: tz, radius: trunkR + 0.25, label: 'banyan_tree' });

        const gx = Math.floor((tx + halfWidth) / cellSize);
        const gz = Math.floor((tz + halfHeight) / cellSize);
        if (gx >= 0 && gx < gridWidth && gz >= 0 && gz < gridHeight) {
          if (!isNearClearings(tx, tz)) {
            updatedGrid[gz][gx] = 1;
          }
        }
      }
    }

    // 9. Indonesian Cemetery Clusters & Rows (Banyak Makam Khas Indonesia)
    // IMPORTANT: To ensure player and monsters can freely walk, run, and sprint smoothly,
    // graves are visual fixtures without large blocking cylinder colliders or solid grid flags!
    const graveTypes: Array<'kijing_stone' | 'kijing_mossy' | 'kijing_white' | 'earthen'> = [
      'kijing_mossy', 'kijing_stone', 'kijing_mossy', 'kijing_white', 'earthen', 'earthen'
    ];

    const spawnGrave = (
      type: 'kijing_stone' | 'kijing_mossy' | 'kijing_white' | 'earthen',
      wx: number,
      wz: number,
      rotY: number = 0
    ) => {
      let grave: THREE.Group;
      if (type === 'kijing_stone') {
        grave = EnvironmentPropFactory.createIndonesianGraveKijing('stone');
      } else if (type === 'kijing_mossy') {
        grave = EnvironmentPropFactory.createIndonesianGraveKijing('mossy');
      } else if (type === 'kijing_white') {
        grave = EnvironmentPropFactory.createIndonesianGraveKijing('whitewash');
      } else {
        grave = EnvironmentPropFactory.createIndonesianGraveEarthen();
      }

      grave.position.set(wx, 0, wz);
      grave.rotation.y = rotY;
      rootGroup.add(grave);
    };

    // Organized cemetery rows (Barisan Pemakaman Tradisional Indonesia)
    let graveIdx = 0;

    // Sector A: North-East Kijing & Earthen Cemetery Rows (gx: 15..22, gz: 4..10)
    for (let gz = 4; gz <= 10; gz += 2) {
      for (let gx = 15; gx <= 22; gx += 2) {
        const type = graveTypes[graveIdx++ % graveTypes.length];
        const gWx = (gx + 0.5) * cellSize - halfWidth + (rnd() - 0.5) * 0.5;
        const gWz = (gz + 0.5) * cellSize - halfHeight + (rnd() - 0.5) * 0.5;
        spawnGrave(type, gWx, gWz, (rnd() - 0.5) * 0.15);
      }
    }

    // Sector B: South-West Earthen Mounds & Mossy Tombstones (gx: 4..11, gz: 15..21)
    for (let gz = 15; gz <= 21; gz += 2) {
      for (let gx = 4; gx <= 11; gx += 2) {
        const type = graveTypes[graveIdx++ % graveTypes.length];
        const gWx = (gx + 0.5) * cellSize - halfWidth + (rnd() - 0.5) * 0.5;
        const gWz = (gz + 0.5) * cellSize - halfHeight + (rnd() - 0.5) * 0.5;
        spawnGrave(type, gWx, gWz, (rnd() - 0.5) * 0.2);
      }
    }

    // Sector C: South-East Ancient Family Graveyard (gx: 15..22, gz: 15..21)
    for (let gz = 15; gz <= 21; gz += 2) {
      for (let gx = 15; gx <= 22; gx += 2) {
        if (gx >= 23 && gz >= 23) continue; // Leave exit path clear
        const type = graveTypes[graveIdx++ % graveTypes.length];
        const gWx = (gx + 0.5) * cellSize - halfWidth + (rnd() - 0.5) * 0.5;
        const gWz = (gz + 0.5) * cellSize - halfHeight + (rnd() - 0.5) * 0.5;
        spawnGrave(type, gWx, gWz, (rnd() - 0.5) * 0.15);
      }
    }

    // Sector D: North-West Ancient Mossy Plots (gx: 5..10, gz: 6..10)
    for (let gz = 6; gz <= 10; gz += 2) {
      for (let gx = 5; gx <= 10; gx += 2) {
        const gWx = (gx + 0.5) * cellSize - halfWidth + (rnd() - 0.5) * 0.5;
        const gWz = (gz + 0.5) * cellSize - halfHeight + (rnd() - 0.5) * 0.5;
        if (Math.hypot(gWx - pSpawnWx, gWz - pSpawnWz) < 6.0) continue;
        const type = graveTypes[graveIdx++ % graveTypes.length];
        spawnGrave(type, gWx, gWz, Math.PI / 2 + (rnd() - 0.5) * 0.15);
      }
    }

    // Sector E: Sacred Banyan Clearing Surrounding Graves (Makam Keramat Sesepuh)
    const elderGraves = [
      { gx: 12, gz: 11, rot: 0 },
      { gx: 14, gz: 11, rot: 0.05 },
      { gx: 12, gz: 15, rot: -0.05 },
      { gx: 14, gz: 15, rot: 0 },
      { gx: 11, gz: 13, rot: Math.PI / 2 },
      { gx: 15, gz: 13, rot: -Math.PI / 2 },
    ];
    for (const eg of elderGraves) {
      const gWx = (eg.gx + 0.5) * cellSize - halfWidth;
      const gWz = (eg.gz + 0.5) * cellSize - halfHeight;
      spawnGrave('kijing_mossy', gWx, gWz, eg.rot);
    }

    // 11. Cemetery Bamboo Torches & Lantern Posts (Obor Bambu Kuburan)
    const torchCoords = [
      { gx: 3, gz: 5 },
      { gx: 7, gz: 11 },
      { gx: 13, gz: 11 },
      { gx: 13, gz: 15 },
      { gx: 15, gz: 8 },
      { gx: 19, gz: 12 },
      { gx: 8, gz: 17 },
      { gx: 12, gz: 17 },
      { gx: 21, gz: 19 },
      { gx: 23, gz: 22 },
    ];

    torchCoords.forEach((tc) => {
      const tWx = (tc.gx + 0.5) * cellSize - halfWidth;
      const tWz = (tc.gz + 0.5) * cellSize - halfHeight;
      const torch = EnvironmentPropFactory.createCemeteryLanternPost();
      torch.position.set(tWx, 0, tWz);
      rootGroup.add(torch);
    });

    // 12. Ancient Cemetery Exit Gate at (exitWx, exitWy, exitWz)
    const exitGateGroup = new THREE.Group();
    exitGateGroup.name = 'CemeteryExitGateGroup';
    const exitGate = EnvironmentPropFactory.createCemeteryIronGate();
    exitGateGroup.add(exitGate);
    exitGateGroup.position.set(exitWx, exitWy, exitWz);
    exitGateGroup.rotation.y = selectedSpawns.exit.rotationY || 0;
    rootGroup.add(exitGateGroup);

    const exitTriggerBox = new THREE.Box3(
      new THREE.Vector3(exitWx - cellSize * 0.8, exitWy, exitWz - cellSize * 0.8),
      new THREE.Vector3(exitWx + cellSize * 0.8, exitWy + wallHeight, exitWz + cellSize * 0.8)
    );

    // 13. Markers for Overview Camera
    const markers = this.createOverviewMarkers(pSpawnWx, monsterSpawns, exitWx, exitWz, wallHeight, pSpawnWz);
    rootGroup.add(markers.playerMarker);
    markers.monsterMarkers.forEach((m) => rootGroup.add(m));
    rootGroup.add(markers.exitMarker);

    // 14. World Weapon Pickups (Sapu Ijuk di depan Gubuk Kuncen)
    const weaponPickups = this.spawnWorldPickups(level, halfWidth, halfHeight, cellSize, rootGroup);

    // 15. Level Collision Configuration (Pure Open Cemetery Ground with Cylinder Colliders)
    const collisionConfig: LevelCollisionConfig = {
      levelId: 4,
      environmentId: 'sacred_cemetery',
      multiFloor: false,
      floorCount: 1,
      floorHeight: 0,
      perimeterMargin: 1.2,
      useGridWalls: false, // Open outdoor cemetery, player weaves freely through trees and graves
      cylinderColliders: treeColliders.map((t) => ({
        x: t.x,
        z: t.z,
        radius: t.radius,
        label: t.label || 'cemetery_obstacle',
      })),
      boxColliders: [],
      hasStairs: false,
      ramps: [],
      bridges: [],
      stairOpenings: [],
      fallZones: [],
    };

    // 16. 2D Paper Sketch Collider Map
    const overviewMapGroup = LabyrinthBuilder.createOverviewColliderMap(
      level,
      updatedGrid,
      treeColliders,
      pSpawnWx,
      pSpawnWz,
      selectedSpawns.player.rotationY,
      monsterSpawns
    );

    return {
      rootGroup,
      wallsMesh,
      exitDoorMesh: exitGateGroup,
      exitTriggerBox,
      playerMarker: markers.playerMarker,
      monsterMarker: markers.monsterMarkers[0],
      monsterMarkers: markers.monsterMarkers,
      exitMarker: markers.exitMarker,
      overviewMapGroup,
      playerWorldSpawn: {
        x: pSpawnWx,
        y: pSpawnWy,
        z: pSpawnWz,
        rotationY: selectedSpawns.player.rotationY,
        floor: 0,
      },
      monsterWorldSpawn: {
        x: mSpawnWx,
        y: mSpawnWy,
        z: mSpawnWz,
        rotationY: monsterSpawns[0].rotationY,
        floor: 0,
      },
      monsterWorldSpawns: monsterSpawns,
      exitWorldPos: { x: exitWx, y: exitWy, z: exitWz, floor: 0 },
      selectedSpawns,
      treeColliders,
      updatedGrid,
      navigationGrid: updatedGrid,
      collisionConfig,
      weaponPickups,
      floorCount: 1,
      floorHeight: 0,
      ramps: [],
      bridges: [],
      stairOpenings: [],
      blockingMeshes: [wallsMesh, floorMesh],
    };
  }

  // =========================================================================
  // LEVEL 5 — MILITARY UNDERGROUND BUNKER (Outdoor Outpost & Expansive Bunker)
  // =========================================================================
  private static buildBunkerLevel(
    level: LevelDefinition,
    spawns?: SelectedSpawns
  ): LevelBuildResult {
    const rootGroup = new THREE.Group();
    rootGroup.name = 'MilitaryBunkerRoot';

    const { gridWidth, gridHeight, cellSize, wallHeight } = level;
    const halfWidth = (gridWidth * cellSize) / 2;
    const halfHeight = (gridHeight * cellSize) / 2;

    // 1. Spawns Calculation
    const selectedSpawns = spawns || SpawnManager.generateSpawns(level);
    const pSpawnWx = selectedSpawns.player.x;
    const pSpawnWy = selectedSpawns.player.y;
    const pSpawnWz = selectedSpawns.player.z;

    const monsterSpawns = selectedSpawns.monsters;
    const mSpawnWx = monsterSpawns[0].x;
    const mSpawnWy = monsterSpawns[0].y;
    const mSpawnWz = monsterSpawns[0].z;

    const exitWx = selectedSpawns.exit.x;
    const exitWy = selectedSpawns.exit.y;
    const exitWz = selectedSpawns.exit.z;

    // 2. Grids and Colliders Setup
    const updatedGrid: number[][] = level.grid.map((row) => [...row]);
    const obstacleColliders: Array<{ x: number; z: number; radius: number; label?: string }> = [];

    // 3. Dual Floors: Outdoor Trench Outpost (z <= -32m) & Concrete Bunker Interior (z >= -32m)
    // 3A. Outdoor Outpost Ground (z: -66m to -32m, strictly non-overlapping with bunker floor to eliminate blinking)
    const outdoorTex = typeof document !== 'undefined'
      ? TextureGenerator.createOutdoorBunkerTrenchTexture()
      : undefined;
    if (outdoorTex) {
      // Calm, spacious repeat matching the rest of the game to eliminate moiré and grain shimmering
      outdoorTex.repeat.set(gridWidth * 0.35, 6 * 0.35);
    }
    const outdoorMat = new THREE.MeshLambertMaterial({
      map: outdoorTex,
      side: THREE.DoubleSide,
    });
    // Outdoor ground spans from z = -66m to z = -32m (center z = -49m, depth = 34m, width = 132m)
    const outdoorFloorGeo = new THREE.PlaneGeometry(gridWidth * cellSize + 24, 34);
    outdoorFloorGeo.rotateX(-Math.PI / 2);
    const outdoorFloorMesh = new THREE.Mesh(outdoorFloorGeo, outdoorMat);
    outdoorFloorMesh.position.set(0, 0, -49);
    outdoorFloorMesh.receiveShadow = true;
    rootGroup.add(outdoorFloorMesh);

    // 3B. Bunker Concrete Floor (z: -32m to 66m, meets outdoor floor seamlessly at z = -32m with ZERO overlap)
    const bunkerFloorTex = typeof document !== 'undefined'
      ? TextureGenerator.createBunkerFloorTexture()
      : undefined;
    if (bunkerFloorTex) {
      bunkerFloorTex.repeat.set(gridWidth * 0.35, (gridHeight - 5) * 0.35);
    }
    const bunkerFloorMat = new THREE.MeshLambertMaterial({
      map: bunkerFloorTex,
      side: THREE.DoubleSide,
    });
    // Bunker concrete floor spans from z = -32m to z = 66m (center z = 17m, depth = 98m, width = 132m)
    const bunkerFloorGeo = new THREE.PlaneGeometry(gridWidth * cellSize + 24, 98);
    bunkerFloorGeo.rotateX(-Math.PI / 2);
    const bunkerFloorMesh = new THREE.Mesh(bunkerFloorGeo, bunkerFloorMat);
    bunkerFloorMesh.position.set(0, 0, 17);
    bunkerFloorMesh.receiveShadow = true;
    rootGroup.add(bunkerFloorMesh);

    // 4. Open Night Sky & Starfield (Strictly over outdoor outpost sky, z <= -34m)
    const starCount = 280;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * (gridWidth * cellSize + 24);
      starPositions[i * 3 + 1] = 22 + Math.random() * 40;
      starPositions[i * 3 + 2] = -halfHeight - 12 + Math.random() * 30; // strictly z: -66 to -36
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xf0f4f8,
      size: 0.22,
      transparent: true,
      opacity: 0.7,
    });
    rootGroup.add(new THREE.Points(starGeo, starMat));

    // 5. Tactical Metal Stairwells & Upper Mezzanine Setup (2 Floors)
    const floorCount = level.floorCount || 2;
    const floorHeight = level.floorHeight || 4.8;
    const totalLevelHeight = floorCount * floorHeight;

    // Identify stairwell cutouts on Floor 1 so stairs are physically and visibly open
    const stairOpenings: StairwellOpening[] = [];
    if (level.ramps && level.ramps.length > 0) {
      level.ramps.forEach((r) => {
        const dx = r.endCell.x - r.startCell.x;
        const dz = r.endCell.z - r.startCell.z;
        const stepX = Math.sign(dx);
        const stepZ = Math.sign(dz);

        // Open incline on toFloor covers incline cells up to the landing threshold (landing itself has solid floor!)
        const openEndGx = stepX !== 0 ? r.endCell.x - stepX : r.endCell.x;
        const openEndGz = stepZ !== 0 ? r.endCell.z - stepZ : r.endCell.z;

        const minGx = Math.min(r.startCell.x, openEndGx);
        const maxGx = Math.max(r.startCell.x, openEndGx);
        const minGz = Math.min(r.startCell.z, openEndGz);
        const maxGz = Math.max(r.startCell.z, openEndGz);

        const minWx = minGx * cellSize - halfWidth;
        const maxWx = (maxGx + 1) * cellSize - halfWidth;
        const minWz = minGz * cellSize - halfHeight;
        const maxWz = (maxGz + 1) * cellSize - halfHeight;

        // Inset by 0.15m at the open exit landing so walking off the top step onto the upper floor is never flagged as in void
        const boxMinX = minWx + (stepX < 0 ? 0.15 : -0.1);
        const boxMaxX = maxWx - (stepX > 0 ? 0.15 : -0.1);
        const boxMinZ = minWz + (stepZ < 0 ? 0.15 : -0.1);
        const boxMaxZ = maxWz - (stepZ > 0 ? 0.15 : -0.1);

        stairOpenings.push({
          floor: r.toFloor,
          minGx,
          maxGx,
          minGz,
          maxGz,
          box: new THREE.Box3(
            new THREE.Vector3(boxMinX, r.toFloor * floorHeight - 0.5, boxMinZ),
            new THREE.Vector3(boxMaxX, r.toFloor * floorHeight + 2.5, boxMaxZ)
          ),
        });
      });
    }

    // 5A. Upper Mezzanine Platform (Lantai 2: y = 4.8m, gz: 5..25, gx: 1..25)
    const upperFloorQuads: THREE.BufferGeometry[] = [];
    const upperSoffitQuads: THREE.BufferGeometry[] = [];

    for (let gz = 5; gz <= 25; gz++) {
      for (let gx = 1; gx <= 25; gx++) {
        // Open only the stairwell incline cutouts; landing cells (gz: 9) have solid floors!
        const inStair = stairOpenings.some(
          (o) => gx >= o.minGx && gx <= o.maxGx && gz >= o.minGz && gz <= o.maxGz
        );

        if (!inStair) {
          const cWx = (gx + 0.5) * cellSize - halfWidth;
          const cWz = (gz + 0.5) * cellSize - halfHeight;

          // Top walkable floor quad
          const topQuad = new THREE.PlaneGeometry(cellSize, cellSize);
          topQuad.rotateX(-Math.PI / 2);
          topQuad.translate(cWx, floorHeight, cWz);
          upperFloorQuads.push(topQuad);

          // Underside ceiling quad (Floor 0 ceiling soffit)
          const botQuad = new THREE.PlaneGeometry(cellSize, cellSize);
          botQuad.rotateX(Math.PI / 2);
          botQuad.translate(cWx, floorHeight - 0.2, cWz);
          upperSoffitQuads.push(botQuad);
        }
      }
    }

    let upperFloorMesh: THREE.Mesh | null = null;
    if (upperFloorQuads.length > 0) {
      const mergedUpperGeo = this.mergeBufferGeometries(upperFloorQuads);
      upperFloorMesh = new THREE.Mesh(mergedUpperGeo, bunkerFloorMat);
      upperFloorMesh.name = 'BunkerFloor1_Platform';
      upperFloorMesh.receiveShadow = true;
      rootGroup.add(upperFloorMesh);
    }

    // Ceiling material for industrial underside and topmost ceiling
    const bunkerCeilingTex = typeof document !== 'undefined'
      ? TextureGenerator.createCeilingTexture()
      : undefined;
    if (bunkerCeilingTex) {
      bunkerCeilingTex.repeat.set(gridWidth * 0.35, (gridHeight - 5) * 0.35);
    }
    const ceilingMat = new THREE.MeshLambertMaterial({
      color: 0x383b38,
      map: bunkerCeilingTex,
      side: THREE.DoubleSide,
    });

    if (upperSoffitQuads.length > 0) {
      const mergedSoffitGeo = this.mergeBufferGeometries(upperSoffitQuads);
      const soffitMesh = new THREE.Mesh(mergedSoffitGeo, ceilingMat);
      soffitMesh.name = 'BunkerFloor0_Soffit';
      rootGroup.add(soffitMesh);
    }

    // 5B. Tactical Metal Stairwells (2 Tangga Baja Militer Penghubung Lantai 1 & Lantai 2)
    const bunkerWallTex = typeof document !== 'undefined'
      ? TextureGenerator.createBunkerWallTexture()
      : undefined;
    if (bunkerWallTex) {
      bunkerWallTex.repeat.set(1, 1);
    }

    const worldRamps: WorldRamp[] = [];
    const railingBoxes: BoxCollider[] = [];

    if (level.ramps && level.ramps.length > 0) {
      level.ramps.forEach((ramp) => {
        const dx = ramp.endCell.x - ramp.startCell.x;
        const dz = ramp.endCell.z - ramp.startCell.z;
        const stepX = Math.sign(dx);
        const stepZ = Math.sign(dz);

        let startWx: number;
        let startWz: number;
        let endWx: number;
        let endWz: number;

        if (stepX !== 0) {
          if (stepX > 0) {
            startWx = ramp.startCell.x * cellSize - halfWidth;
            endWx = ramp.endCell.x * cellSize - halfWidth;
          } else {
            startWx = (ramp.startCell.x + 1) * cellSize - halfWidth;
            endWx = (ramp.endCell.x + 1) * cellSize - halfWidth;
          }
          startWz = (ramp.startCell.z + 0.5) * cellSize - halfHeight;
          endWz = (ramp.endCell.z + 0.5) * cellSize - halfHeight;
        } else {
          if (stepZ > 0) {
            startWz = ramp.startCell.z * cellSize - halfHeight;
            endWz = ramp.endCell.z * cellSize - halfHeight;
          } else {
            startWz = (ramp.startCell.z + 1) * cellSize - halfHeight;
            endWz = (ramp.endCell.z + 1) * cellSize - halfHeight;
          }
          startWx = (ramp.startCell.x + 0.5) * cellSize - halfWidth;
          endWx = (ramp.endCell.x + 0.5) * cellSize - halfWidth;
        }

        const startY = ramp.fromFloor * floorHeight;
        const endY = ramp.toFloor * floorHeight;

        const deltaX = endWx - startWx;
        const deltaZ = endWz - startWz;
        const length = Math.hypot(deltaX, deltaZ);
        const height = endY - startY;
        const angle = Math.atan2(deltaX, deltaZ);

        const dirX = length > 0.001 ? deltaX / length : 1;
        const dirZ = length > 0.001 ? deltaZ / length : 0;
        const normX = -dirZ;
        const normZ = dirX;

        const rampWidth = cellSize;
        const stairMesh = EnvironmentPropFactory.createWallStaircase(
          rampWidth,
          height,
          length,
          level.theme,
          bunkerWallTex
        );
        const midX = (startWx + endWx) / 2;
        const midZ = (startWz + endWz) / 2;

        stairMesh.position.set(midX, startY, midZ);
        stairMesh.rotation.y = angle;
        rootGroup.add(stairMesh);

        // Safety Parapets / Railings around upper-floor stairwell opening
        const railingThick = 0.25;
        const upperY = endY;

        const sideMinX = midX - rampWidth / 2;
        const sideMaxX = midX + rampWidth / 2;
        const sideMinZ = Math.min(startWz, endWz);
        const sideMaxZ = Math.max(startWz, endWz);
        const sideLength = sideMaxZ - sideMinZ;
        const sideMidZ = (sideMinZ + sideMaxZ) / 2;

        const minGz = Math.min(ramp.startCell.z, ramp.endCell.z);
        const maxGz = Math.max(ramp.startCell.z, ramp.endCell.z);

        const westGx = ramp.startCell.x - 1;
        const hasWestWall = westGx >= 0 && westGx < gridWidth &&
          Array.from({ length: maxGz - minGz + 1 }, (_, i) => minGz + i).every((gz) => updatedGrid[gz][westGx] === 1);

        const eastGx = ramp.startCell.x + 1;
        const hasEastWall = eastGx >= 0 && eastGx < gridWidth &&
          Array.from({ length: maxGz - minGz + 1 }, (_, i) => minGz + i).every((gz) => updatedGrid[gz][eastGx] === 1);

        if (!hasWestWall) {
          const bWest = EnvironmentPropFactory.createWallStairwellParapet(sideLength, 1.05, level.theme);
          bWest.position.set(sideMinX, upperY, sideMidZ);
          rootGroup.add(bWest);
          railingBoxes.push({
            minX: sideMinX - railingThick,
            maxX: sideMinX + railingThick,
            minZ: sideMinZ,
            maxZ: sideMaxZ,
            minY: upperY,
            maxY: upperY + 1.2,
            label: 'parapet_west',
          });
        }

        if (!hasEastWall) {
          const bEast = EnvironmentPropFactory.createWallStairwellParapet(sideLength, 1.05, level.theme);
          bEast.position.set(sideMaxX, upperY, sideMidZ);
          rootGroup.add(bEast);
          railingBoxes.push({
            minX: sideMaxX - railingThick,
            maxX: sideMaxX + railingThick,
            minZ: sideMinZ,
            maxZ: sideMaxZ,
            minY: upperY,
            maxY: upperY + 1.2,
            label: 'parapet_east',
          });
        }

        // Solid back wall collider at high end of stairs on Floor 0 (stops below upper floor landing)
        railingBoxes.push({
          minX: midX - rampWidth / 2,
          maxX: midX + rampWidth / 2,
          minZ: endWz - 0.25,
          maxZ: endWz + 0.25,
          minY: startY,
          maxY: startY + height / 2,
          label: 'stair_back_wall',
        });

        const box = new THREE.Box3(
          new THREE.Vector3(
            Math.min(startWx, endWx) - rampWidth / 2 - 0.4,
            Math.min(startY, endY) - 0.5,
            Math.min(startWz, endWz) - rampWidth / 2 - 0.4
          ),
          new THREE.Vector3(
            Math.max(startWx, endWx) + rampWidth / 2 + 0.4,
            Math.max(startY, endY) + 3.0,
            Math.max(startWz, endWz) + rampWidth / 2 + 0.4
          )
        );

        worldRamps.push({
          fromFloor: ramp.fromFloor,
          toFloor: ramp.toFloor,
          startWorld: { x: startWx, y: startY, z: startWz },
          endWorld: { x: endWx, y: endY, z: endWz },
          width: rampWidth,
          length,
          box,
          dirX,
          dirZ,
          normX,
          normZ,
        });
      });
    }

    // 5C. Topmost Heavy Industrial Concrete Ceiling (At y = totalLevelHeight = 9.6m, over bunker interior)
    const ceilingGeo = new THREE.PlaneGeometry(gridWidth * cellSize + 24, 98);
    ceilingGeo.rotateX(Math.PI / 2);
    const ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceilingMesh.position.set(0, totalLevelHeight, 17);
    rootGroup.add(ceilingMesh);

    // 6. Atmospheric Lighting
    // Directional cold moonlight over outdoor outpost
    const moonLight = new THREE.DirectionalLight(0xd6e5d8, 1.8);
    moonLight.position.set(halfWidth * 0.7, 50, -halfHeight * 0.85);
    moonLight.target.position.set(0, 0, -halfHeight * 0.5);
    rootGroup.add(moonLight);
    rootGroup.add(moonLight.target);

    // Bunker ambient fill
    const ambientLight = new THREE.AmbientLight(0x353835, 2.2);
    rootGroup.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xd6e5d8, 0x222622, 0.95);
    rootGroup.add(hemiLight);

    // 7. Multi-Floor Bunker Walls (Lantai 1 Beton Abu-Abu & Lantai 2 Pelat Baja Hitam Lapis Baja)
    // 7A. Lantai 1 Walls: Reinforced Concrete (y: 0 to 4.8m)
    const bunkerWallMat = new THREE.MeshLambertMaterial({
      map: bunkerWallTex,
    });
    const floor0WallGeos: THREE.BufferGeometry[] = [];

    // Grand bunker blast entrance arch header above opening at gz: 5, gx: 12..14
    const archH = floorHeight - 3.4;
    const archGeo = new THREE.BoxGeometry(3 * cellSize, archH, cellSize);
    archGeo.translate(
      (13 + 0.5) * cellSize - halfWidth,
      3.4 + archH / 2,
      (5 + 0.5) * cellSize - halfHeight
    );
    floor0WallGeos.push(archGeo);

    // Standard straight reinforced concrete bunker walls on Floor 0
    for (let gz = 0; gz < gridHeight; gz++) {
      for (let gx = 0; gx < gridWidth; gx++) {
        if (updatedGrid[gz][gx] === 1) {
          const bGeo = new THREE.BoxGeometry(cellSize, floorHeight, cellSize);
          bGeo.translate(
            (gx + 0.5) * cellSize - halfWidth,
            floorHeight / 2,
            (gz + 0.5) * cellSize - halfHeight
          );
          floor0WallGeos.push(bGeo);
        }
      }
    }
    const wallsMesh0 = new THREE.Mesh(this.mergeBufferGeometries(floor0WallGeos), bunkerWallMat);
    wallsMesh0.name = 'BunkerConcreteWalls_Floor0';
    wallsMesh0.castShadow = true;
    wallsMesh0.receiveShadow = true;
    rootGroup.add(wallsMesh0);

    // 7B. Lantai 2 Walls: Reinforced Armored Steel Bulkheads (y: 4.8m to 9.6m, "tapi dengan dinding yang berbeda")
    const armoredWallTex = typeof document !== 'undefined'
      ? TextureGenerator.createArmoredBunkerWallTexture()
      : undefined;
    if (armoredWallTex) {
      armoredWallTex.repeat.set(1, 1);
    }
    const armoredWallMat = new THREE.MeshLambertMaterial({
      map: armoredWallTex,
    });
    const floor1WallGeos: THREE.BufferGeometry[] = [];

    // Floor 1 walls (strictly inside bunker, gz >= 5)
    for (let gz = 5; gz < gridHeight; gz++) {
      for (let gx = 0; gx < gridWidth; gx++) {
        if (updatedGrid[gz][gx] === 1) {
          const bGeo = new THREE.BoxGeometry(cellSize, floorHeight, cellSize);
          bGeo.translate(
            (gx + 0.5) * cellSize - halfWidth,
            floorHeight + floorHeight / 2,
            (gz + 0.5) * cellSize - halfHeight
          );
          floor1WallGeos.push(bGeo);
        }
      }
    }
    const wallsMesh1 = new THREE.Mesh(this.mergeBufferGeometries(floor1WallGeos), armoredWallMat);
    wallsMesh1.name = 'BunkerArmoredWalls_Floor1';
    wallsMesh1.castShadow = true;
    wallsMesh1.receiveShadow = true;
    rootGroup.add(wallsMesh1);

    // 8. Heavy Steel Blast Entrance Portal at Threshold (gz: 5, gx: 13)
    const entranceGroup = new THREE.Group();
    entranceGroup.name = 'BunkerBlastEntranceGroup';
    const blastEntrance = EnvironmentPropFactory.createBunkerBlastEntrance();
    blastEntrance.position.set((13 + 0.5) * cellSize - halfWidth, 0, (5 + 0.5) * cellSize - halfHeight);
    entranceGroup.add(blastEntrance);
    rootGroup.add(entranceGroup);

    // 9. Outdoor Trench Outpost Props: Sandbag Fortifications & Ammo Crate Stacks
    const sandbagCoords = [
      { gx: 2, gz: 4 },
      { gx: 8, gz: 4 },
      { gx: 18, gz: 4 },
      { gx: 24, gz: 4 },
    ];
    for (const sb of sandbagCoords) {
      const sWx = (sb.gx + 0.5) * cellSize - halfWidth;
      const sWz = (sb.gz + 0.5) * cellSize - halfHeight;
      const sandbags = EnvironmentPropFactory.createBunkerSandbags();
      sandbags.position.set(sWx, 0, sWz);
      rootGroup.add(sandbags);
      obstacleColliders.push({ x: sWx, z: sWz, radius: 1.1, label: 'sandbags' });
    }

    const crateCoords = [
      { gx: 7, gz: 3 },
      { gx: 19, gz: 3 },
      { gx: 13, gz: 10 }, // Inside decontamination corridor
      { gx: 4, gz: 16 },  // Inside barracks
      { gx: 22, gz: 16 }, // Inside armory
    ];
    for (const cr of crateCoords) {
      const cWx = (cr.gx + 0.5) * cellSize - halfWidth;
      const cWz = (cr.gz + 0.5) * cellSize - halfHeight;
      const crates = EnvironmentPropFactory.createBunkerCrateStack();
      crates.position.set(cWx, 0, cWz);
      rootGroup.add(crates);
      obstacleColliders.push({ x: cWx, z: cWz, radius: 0.95, label: 'crates' });
    }

    // 10. Bunker Warning Cage Lights (Floor 0 & Floor 1)
    // Floor 0 Lights (amber/red at y = 2.4m)
    const lightCoords = [
      { gx: 13, gz: 6, red: false },
      { gx: 13, gz: 9, red: true },
      { gx: 4, gz: 14, red: false },
      { gx: 8, gz: 12, red: true },
      { gx: 18, gz: 10, red: false },
      { gx: 18, gz: 14, red: false },
      { gx: 13, gz: 13, red: false },
      { gx: 13, gz: 17, red: true },
      { gx: 6, gz: 18, red: false },
      { gx: 6, gz: 22, red: true },
      { gx: 20, gz: 18, red: false },
      { gx: 20, gz: 22, red: true },
      { gx: 13, gz: 21, red: false },
    ];
    for (const lc of lightCoords) {
      const lWx = (lc.gx + 0.5) * cellSize - halfWidth;
      const lWz = (lc.gz + 0.5) * cellSize - halfHeight;
      const lamp = EnvironmentPropFactory.createBunkerCageLight(lc.red);
      lamp.position.set(lWx, 2.4, lWz);
      rootGroup.add(lamp);
    }

    // Floor 1 Lights: Red flashing emergency cage lights in armored corridors (y = floorHeight + 2.4m)
    const floor1LightCoords = [
      { gx: 4, gz: 8, red: true },
      { gx: 22, gz: 8, red: true },
      { gx: 13, gz: 14, red: true },
      { gx: 8, gz: 18, red: true },
      { gx: 18, gz: 18, red: true },
      { gx: 24, gz: 23, red: false }, // near exit vault door (amber)
    ];
    for (const flc of floor1LightCoords) {
      const lWx = (flc.gx + 0.5) * cellSize - halfWidth;
      const lWz = (flc.gz + 0.5) * cellSize - halfHeight;
      const lamp = EnvironmentPropFactory.createBunkerCageLight(flc.red);
      lamp.position.set(lWx, floorHeight + 2.4, lWz);
      rootGroup.add(lamp);
    }

    // 11. Sektor 5: Emergency Vault Exit Door (On Floor 1 at exitWx, exitWy, exitWz)
    const exitVaultGroup = new THREE.Group();
    exitVaultGroup.name = 'BunkerExitVaultGroup';
    const exitVault = EnvironmentPropFactory.createBunkerExitVault();
    exitVaultGroup.add(exitVault);
    exitVaultGroup.position.set(exitWx, exitWy, exitWz);
    exitVaultGroup.rotation.y = selectedSpawns.exit.rotationY || 0;
    rootGroup.add(exitVaultGroup);

    const exitTriggerBox = new THREE.Box3(
      new THREE.Vector3(exitWx - cellSize * 0.8, exitWy, exitWz - cellSize * 0.8),
      new THREE.Vector3(exitWx + cellSize * 0.8, exitWy + floorHeight, exitWz + cellSize * 0.8)
    );

    // 12. Markers for Overview Camera
    const markers = this.createOverviewMarkers(pSpawnWx, monsterSpawns, exitWx, exitWz, totalLevelHeight, pSpawnWz);
    rootGroup.add(markers.playerMarker);
    markers.monsterMarkers.forEach((m) => rootGroup.add(m));
    rootGroup.add(markers.exitMarker);

    // 13. World Weapon Pickups (Spatula di pos parit luar!)
    const weaponPickups = this.spawnWorldPickups(level, halfWidth, halfHeight, cellSize, rootGroup);

    // 14. Level Collision Configuration (Isolated Multi-Floor Military Bunker Collision)
    const collisionConfig: LevelCollisionConfig = {
      levelId: 5,
      environmentId: 'military_bunker',
      multiFloor: true,
      floorCount: 2,
      floorHeight: 4.8,
      perimeterMargin: 1.2,
      useGridWalls: true,
      wallGrid: updatedGrid,
      cylinderColliders: obstacleColliders.map((t) => ({
        x: t.x,
        z: t.z,
        radius: t.radius,
        label: t.label || 'bunker_obstacle',
      })),
      boxColliders: railingBoxes,
      hasStairs: true,
      ramps: worldRamps,
      bridges: [],
      stairOpenings,
      fallZones: [],
    };

    // 15. 2D Paper Sketch Collider Map
    const overviewMapGroup = LabyrinthBuilder.createOverviewColliderMap(
      level,
      updatedGrid,
      obstacleColliders,
      pSpawnWx,
      pSpawnWz,
      selectedSpawns.player.rotationY,
      monsterSpawns
    );

    const blockingList: THREE.Object3D[] = [wallsMesh0, wallsMesh1, outdoorFloorMesh, bunkerFloorMesh, ceilingMesh];
    if (upperFloorMesh) blockingList.push(upperFloorMesh);

    return {
      rootGroup,
      wallsMesh: wallsMesh0,
      exitDoorMesh: exitVaultGroup,
      exitTriggerBox,
      playerMarker: markers.playerMarker,
      monsterMarker: markers.monsterMarkers[0],
      monsterMarkers: markers.monsterMarkers,
      exitMarker: markers.exitMarker,
      overviewMapGroup,
      playerWorldSpawn: {
        x: pSpawnWx,
        y: pSpawnWy,
        z: pSpawnWz,
        rotationY: selectedSpawns.player.rotationY,
        floor: 0,
      },
      monsterWorldSpawn: {
        x: mSpawnWx,
        y: mSpawnWy,
        z: mSpawnWz,
        rotationY: monsterSpawns[0].rotationY,
        floor: monsterSpawns[0].floor || 0,
      },
      monsterWorldSpawns: monsterSpawns,
      exitWorldPos: { x: exitWx, y: exitWy, z: exitWz, floor: 1 },
      selectedSpawns,
      treeColliders: obstacleColliders,
      updatedGrid,
      navigationGrid: updatedGrid,
      collisionConfig,
      weaponPickups,
      floorCount: 2,
      floorHeight: 4.8,
      ramps: worldRamps,
      bridges: [],
      stairOpenings,
      blockingMeshes: blockingList,
    };
  }

  // Helper to merge BufferGeometries with positions, normals, and UVs
  private static mergeBufferGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
    if (geos.length === 0) return new THREE.BufferGeometry();
    let totalPos = 0;
    let totalNorm = 0;
    let totalUv = 0;
    let totalIndices = 0;

    geos.forEach((g) => {
      totalPos += g.attributes.position.array.length;
      totalNorm += g.attributes.normal.array.length;
      totalUv += g.attributes.uv.array.length;
      if (g.index) totalIndices += g.index.array.length;
    });

    const posArr = new Float32Array(totalPos);
    const normArr = new Float32Array(totalNorm);
    const uvArr = new Float32Array(totalUv);
    const indexArr = new Uint32Array(totalIndices);

    let posOffset = 0;
    let normOffset = 0;
    let uvOffset = 0;
    let indexOffset = 0;
    let vertexOffset = 0;

    geos.forEach((g) => {
      posArr.set(g.attributes.position.array, posOffset);
      normArr.set(g.attributes.normal.array, normOffset);
      uvArr.set(g.attributes.uv.array, uvOffset);

      if (g.index) {
        for (let i = 0; i < g.index.array.length; i++) {
          indexArr[indexOffset + i] = g.index.array[i] + vertexOffset;
        }
        indexOffset += g.index.array.length;
      }

      posOffset += g.attributes.position.array.length;
      normOffset += g.attributes.normal.array.length;
      uvOffset += g.attributes.uv.array.length;
      vertexOffset += g.attributes.position.count;
    });

    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    merged.setAttribute('normal', new THREE.BufferAttribute(normArr, 3));
    merged.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));
    merged.setIndex(new THREE.BufferAttribute(indexArr, 1));
    return merged;
  }

  // =========================================================================
  // THEMED LEVELS BUILDER (LEVELS 2 TO 10)
  // =========================================================================
  private static buildThemedLevel(level: LevelDefinition, spawns?: SelectedSpawns): LevelBuildResult {
    const rootGroup = new THREE.Group();
    rootGroup.name = `${level.theme}_Root`;

    const { gridWidth, gridHeight, cellSize, wallHeight } = level;
    // Clone grid and guarantee that all ramp / stair corridors and bridge approaches are completely free of wall colliders
    const grid = level.grid.map((row) => [...row]);
    if (level.ramps && level.ramps.length > 0) {
      for (const r of level.ramps) {
        const minGx = Math.min(r.startCell.x, r.endCell.x);
        const maxGx = Math.max(r.startCell.x, r.endCell.x);
        const minGz = Math.min(r.startCell.z, r.endCell.z);
        const maxGz = Math.max(r.startCell.z, r.endCell.z);
        for (let gz = minGz; gz <= maxGz; gz++) {
          for (let gx = minGx; gx <= maxGx; gx++) {
            grid[gz][gx] = 0;
          }
        }
      }
    }
    if (level.bridges && level.bridges.length > 0) {
      for (const b of level.bridges) {
        const minGx = Math.min(b.startCell.x, b.endCell.x) - 1;
        const maxGx = Math.max(b.startCell.x, b.endCell.x) + 1;
        const minGz = Math.min(b.startCell.z, b.endCell.z) - 1;
        const maxGz = Math.max(b.startCell.z, b.endCell.z) + 1;
        for (let gz = Math.max(1, minGz); gz <= Math.min(gridHeight - 2, maxGz); gz++) {
          for (let gx = Math.max(1, minGx); gx <= Math.min(gridWidth - 2, maxGx); gx++) {
            grid[gz][gx] = 0;
          }
        }
      }
    }
    const halfWidth = (gridWidth * cellSize) / 2;
    const halfHeight = (gridHeight * cellSize) / 2;
    const totalW = gridWidth * cellSize;
    const totalH = gridHeight * cellSize;

    // Theme Asset Selection
    let wallTexture: THREE.CanvasTexture;
    let floorTexture: THREE.CanvasTexture;
    let ambientHex = 0x3d4852;
    let lightHex = 0xdde6ed;
    let lightIntensity = 2.0;

    switch (level.theme) {
      case 'school':
        wallTexture = TextureGenerator.createSchoolWallTexture();
        floorTexture = TextureGenerator.createSchoolFloorTexture();
        ambientHex = 0x3d4740;
        lightHex = 0xd6e5d8;
        lightIntensity = 1.8;
        break;
      case 'labyrinth':
        wallTexture = TextureGenerator.createWallTexture();
        floorTexture = TextureGenerator.createFloorTexture();
        ambientHex = 0x3d4740;
        lightHex = 0xd6e5d8;
        lightIntensity = 1.8;
        break;
      case 'hospital':
        wallTexture = TextureGenerator.createHospitalWallTexture();
        floorTexture = TextureGenerator.createHospitalFloorTexture();
        ambientHex = 0x3d4e48;
        lightHex = 0xd6e5d8;
        lightIntensity = 1.8;
        break;
      case 'sewer':
        wallTexture = TextureGenerator.createSewerWallTexture();
        floorTexture = TextureGenerator.createSewerWaterTexture();
        ambientHex = 0x3d4840;
        lightHex = 0xd6e5d8;
        lightIntensity = 1.8;
        break;
      case 'factory':
        wallTexture = TextureGenerator.createFactoryWallTexture();
        floorTexture = TextureGenerator.createFactoryFloorTexture();
        ambientHex = 0x48423c;
        lightHex = 0xf5ebd8;
        lightIntensity = 1.8;
        break;
      case 'hotel':
        wallTexture = TextureGenerator.createHotelWallTexture();
        floorTexture = TextureGenerator.createHotelCarpetTexture();
        ambientHex = 0x463c3f;
        lightHex = 0xf5ebd8;
        lightIntensity = 1.8;
        break;
      case 'subway':
        wallTexture = TextureGenerator.createSubwayWallTexture();
        floorTexture = TextureGenerator.createSubwayPlatformTexture();
        ambientHex = 0x3d474e;
        lightHex = 0xdbe4ed;
        lightIntensity = 1.8;
        break;
      case 'research_facility':
        wallTexture = TextureGenerator.createLabWallTexture();
        floorTexture = TextureGenerator.createLabFloorTexture();
        ambientHex = 0x3c4652;
        lightHex = 0xdbe8f5;
        lightIntensity = 1.8;
        break;
      case 'nightmare':
      default:
        wallTexture = TextureGenerator.createNightmareWallTexture();
        floorTexture = TextureGenerator.createNightmareFloorTexture();
        ambientHex = 0x54424a;
        lightHex = 0xffdbe0;
        lightIntensity = 2.0;
        break;
    }

    // 1. Atmospheric Ambient & Directional Lighting
    const ambientLight = new THREE.AmbientLight(ambientHex, 2.2);
    rootGroup.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(lightHex, lightIntensity);
    dirLight.position.set(halfWidth * 0.7, 35, -halfHeight * 0.7);
    rootGroup.add(dirLight);

    // Complementary sky vs earth bounce light matching Level 2
    const hemiLight = new THREE.HemisphereLight(lightHex, 0x2d3630, 0.95);
    rootGroup.add(hemiLight);

    // 2. Themed Floor & Multi-Floor Platforms with Stairwell Openings
    const floorCount = level.floorCount || 1;
    const floorHeight = level.floorHeight || 3.8;
    const totalLevelHeight = floorCount * floorHeight;

    // Identify all stairwell openings on upper floors so they are physically and visibly open
    const stairOpenings: StairwellOpening[] = [];
    if (level.ramps && level.ramps.length > 0) {
      level.ramps.forEach((r) => {
        const dx = r.endCell.x - r.startCell.x;
        const dz = r.endCell.z - r.startCell.z;
        const stepX = Math.sign(dx);
        const stepZ = Math.sign(dz);

        // Open incline on toFloor covers incline cells up to the landing threshold
        const openEndGx = stepX !== 0 ? r.endCell.x - stepX : r.endCell.x;
        const openEndGz = stepZ !== 0 ? r.endCell.z - stepZ : r.endCell.z;

        const minGx = Math.min(r.startCell.x, openEndGx);
        const maxGx = Math.max(r.startCell.x, openEndGx);
        const minGz = Math.min(r.startCell.z, openEndGz);
        const maxGz = Math.max(r.startCell.z, openEndGz);

        const minWx = minGx * cellSize - halfWidth;
        const maxWx = (maxGx + 1) * cellSize - halfWidth;
        const minWz = minGz * cellSize - halfHeight;
        const maxWz = (maxGz + 1) * cellSize - halfHeight;

        // Inset by 0.15m at the open exit landing so walking off the top step onto the upper floor is never flagged as in void
        const boxMinX = minWx + (stepX < 0 ? 0.15 : -0.1);
        const boxMaxX = maxWx - (stepX > 0 ? 0.15 : -0.1);
        const boxMinZ = minWz + (stepZ < 0 ? 0.15 : -0.1);
        const boxMaxZ = maxWz - (stepZ > 0 ? 0.15 : -0.1);

        stairOpenings.push({
          floor: r.toFloor,
          minGx,
          maxGx,
          minGz,
          maxGz,
          box: new THREE.Box3(
            new THREE.Vector3(boxMinX, r.toFloor * floorHeight - 0.5, boxMinZ),
            new THREE.Vector3(boxMaxX, r.toFloor * floorHeight + 2.5, boxMaxZ)
          ),
        });
      });
    }

    // Identify bridge chasm openings on upper floors so they are physically and visibly open
    const bridgeOpenings: Array<{ floor: number; minGx: number; maxGx: number; minGz: number; maxGz: number }> = [];
    if (level.bridges && level.bridges.length > 0) {
      level.bridges.forEach((b) => {
        const dx = b.endCell.x - b.startCell.x;
        const dz = b.endCell.z - b.startCell.z;
        const stepX = Math.sign(dx);
        const stepZ = Math.sign(dz);

        // The open span between the landing piers
        const spanStartGx = stepX !== 0 ? b.startCell.x + stepX : b.startCell.x;
        const spanEndGx = stepX !== 0 ? b.endCell.x - stepX : b.endCell.x;
        const spanStartGz = stepZ !== 0 ? b.startCell.z + stepZ : b.startCell.z;
        const spanEndGz = stepZ !== 0 ? b.endCell.z - stepZ : b.endCell.z;

        bridgeOpenings.push({
          floor: b.floor,
          minGx: Math.min(spanStartGx, spanEndGx),
          maxGx: Math.max(spanStartGx, spanEndGx),
          minGz: Math.min(spanStartGz, spanEndGz),
          maxGz: Math.max(spanStartGz, spanEndGz),
        });
      });
    }

    // Themed Props & Obstacles colliders array (available early for structural support pillars)
    const propColliders: Array<{ x: number; z: number; radius: number; minY?: number; maxY?: number; label?: string }> = [];

    // Spacious, calm floor texture repeat across all levels (Level 2 to 10) — eliminates moiré and player dizziness
    floorTexture.repeat.set(gridWidth * 0.35, gridHeight * 0.35);
    const floorMat = new THREE.MeshLambertMaterial({ map: floorTexture, side: THREE.DoubleSide });

    // Ground floor: solid everywhere
    const floorGeo = new THREE.PlaneGeometry(totalW, totalH);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.set(0, 0, 0);
    floorMesh.receiveShadow = true;
    rootGroup.add(floorMesh);

    const blockingMeshes: THREE.Object3D[] = [floorMesh];

    // Upper floor platforms: construct with true 3D volume, thickness, and underside
    for (let f = 1; f < floorCount; f++) {
      const floorY = f * floorHeight;

      if (level.theme === 'school') {
        const slabThickness = 0.40;
        const ceilingSlabMat = new THREE.MeshLambertMaterial({
          map: TextureGenerator.createSchoolCeilingSlabTexture(),
        });
        const slabEdgeMat = new THREE.MeshLambertMaterial({
          map: TextureGenerator.createSchoolSlabEdgeTexture(),
        });

        const topQuads: THREE.BufferGeometry[] = [];
        const bottomQuads: THREE.BufferGeometry[] = [];
        const edgeQuads: THREE.BufferGeometry[] = [];

        for (let gz = 0; gz < gridHeight; gz++) {
          for (let gx = 0; gx < gridWidth; gx++) {
            const inStairOpening = stairOpenings.some(
              (o) => o.floor === f && gx >= o.minGx && gx <= o.maxGx && gz >= o.minGz && gz <= o.maxGz
            );
            const inBridgeOpening = bridgeOpenings.some(
              (o) => o.floor === f && gx >= o.minGx && gx <= o.maxGx && gz >= o.minGz && gz <= o.maxGz
            );
            const inOpening = inStairOpening || inBridgeOpening;

            if (!inOpening) {
              const cWx = (gx + 0.5) * cellSize - halfWidth;
              const cWz = (gz + 0.5) * cellSize - halfHeight;

              // Top walkable surface (Faces UP)
              const topQuad = new THREE.PlaneGeometry(cellSize, cellSize);
              topQuad.rotateX(-Math.PI / 2);
              topQuad.translate(cWx, floorY, cWz);
              const uvsTop = topQuad.attributes.uv;
              const u0 = gx / gridWidth;
              const u1 = (gx + 1) / gridWidth;
              const v0 = gz / gridHeight;
              const v1 = (gz + 1) / gridHeight;
              uvsTop.setXY(0, u0, v1);
              uvsTop.setXY(1, u1, v1);
              uvsTop.setXY(2, u0, v0);
              uvsTop.setXY(3, u1, v0);
              uvsTop.needsUpdate = true;
              topQuads.push(topQuad);

              // Bottom soffit surface (Faces DOWN)
              const bottomQuad = new THREE.PlaneGeometry(cellSize, cellSize);
              bottomQuad.rotateX(Math.PI / 2);
              bottomQuad.translate(cWx, floorY - slabThickness, cWz);
              const uvsBot = bottomQuad.attributes.uv;
              uvsBot.setXY(0, u0, v0);
              uvsBot.setXY(1, u1, v0);
              uvsBot.setXY(2, u0, v1);
              uvsBot.setXY(3, u1, v1);
              uvsBot.needsUpdate = true;
              bottomQuads.push(bottomQuad);

              // Vertical slab edges along openings or perimeter
              // North (gz - 1)
              const northOpen = gz === 0 || stairOpenings.some(o => o.floor === f && gx >= o.minGx && gx <= o.maxGx && (gz - 1) >= o.minGz && (gz - 1) <= o.maxGz) || bridgeOpenings.some(o => o.floor === f && gx >= o.minGx && gx <= o.maxGx && (gz - 1) >= o.minGz && (gz - 1) <= o.maxGz);
              if (northOpen) {
                const edgeN = new THREE.PlaneGeometry(cellSize, slabThickness);
                edgeN.rotateY(Math.PI);
                edgeN.translate(cWx, floorY - slabThickness / 2, gz * cellSize - halfHeight);
                edgeQuads.push(edgeN);
              }

              // South (gz + 1)
              const southOpen = gz === gridHeight - 1 || stairOpenings.some(o => o.floor === f && gx >= o.minGx && gx <= o.maxGx && (gz + 1) >= o.minGz && (gz + 1) <= o.maxGz) || bridgeOpenings.some(o => o.floor === f && gx >= o.minGx && gx <= o.maxGx && (gz + 1) >= o.minGz && (gz + 1) <= o.maxGz);
              if (southOpen) {
                const edgeS = new THREE.PlaneGeometry(cellSize, slabThickness);
                edgeS.translate(cWx, floorY - slabThickness / 2, (gz + 1) * cellSize - halfHeight);
                edgeQuads.push(edgeS);
              }

              // West (gx - 1)
              const westOpen = gx === 0 || stairOpenings.some(o => o.floor === f && (gx - 1) >= o.minGx && (gx - 1) <= o.maxGx && gz >= o.minGz && gz <= o.maxGz) || bridgeOpenings.some(o => o.floor === f && (gx - 1) >= o.minGx && (gx - 1) <= o.maxGx && gz >= o.minGz && gz <= o.maxGz);
              if (westOpen) {
                const edgeW = new THREE.PlaneGeometry(cellSize, slabThickness);
                edgeW.rotateY(-Math.PI / 2);
                edgeW.translate(gx * cellSize - halfWidth, floorY - slabThickness / 2, cWz);
                edgeQuads.push(edgeW);
              }

              // East (gx + 1)
              const eastOpen = gx === gridWidth - 1 || stairOpenings.some(o => o.floor === f && (gx + 1) >= o.minGx && (gx + 1) <= o.maxGx && gz >= o.minGz && gz <= o.maxGz) || bridgeOpenings.some(o => o.floor === f && (gx + 1) >= o.minGx && (gx + 1) <= o.maxGx && gz >= o.minGz && gz <= o.maxGz);
              if (eastOpen) {
                const edgeE = new THREE.PlaneGeometry(cellSize, slabThickness);
                edgeE.rotateY(Math.PI / 2);
                edgeE.translate((gx + 1) * cellSize - halfWidth, floorY - slabThickness / 2, cWz);
                edgeQuads.push(edgeE);
              }
            }
          }
        }

        if (topQuads.length > 0) {
          const topMesh = new THREE.Mesh(this.mergeBufferGeometries(topQuads), floorMat);
          topMesh.name = `SchoolFloorTop_${f}`;
          topMesh.receiveShadow = true;
          rootGroup.add(topMesh);
          blockingMeshes.push(topMesh);
        }

        if (bottomQuads.length > 0) {
          const bottomMesh = new THREE.Mesh(this.mergeBufferGeometries(bottomQuads), ceilingSlabMat);
          bottomMesh.name = `SchoolFloorBottom_${f}`;
          rootGroup.add(bottomMesh);
          blockingMeshes.push(bottomMesh);
        }

        if (edgeQuads.length > 0) {
          const edgeMesh = new THREE.Mesh(this.mergeBufferGeometries(edgeQuads), slabEdgeMat);
          edgeMesh.name = `SchoolFloorEdge_${f}`;
          rootGroup.add(edgeMesh);
          blockingMeshes.push(edgeMesh);
        }

        // Structural Support Columns in School Hallway & Atrium (cleared around stairways to prevent player trapping)
        const pillarCoords = [
          { gx: 6, gz: 7 },
          { gx: 11, gz: 7 },
          { gx: 16, gz: 7 },
          { gx: 6, gz: 13 },
          { gx: 11, gz: 13 },
          { gx: 16, gz: 13 },
          { gx: 12, gz: 8 },
          { gx: 15, gz: 8 },
          { gx: 12, gz: 10 },
          { gx: 15, gz: 10 },
        ];
        const pillarHeight = floorHeight - slabThickness;
        pillarCoords.forEach((p) => {
          const px = (p.gx + 0.5) * cellSize - halfWidth;
          const pz = (p.gz + 0.5) * cellSize - halfHeight;
          const pillarGroup = EnvironmentPropFactory.createSchoolSupportPillar(pillarHeight);
          pillarGroup.position.set(px, 0, pz);
          rootGroup.add(pillarGroup);

          propColliders.push({
            x: px,
            z: pz,
            radius: 0.35,
            minY: 0,
            maxY: pillarHeight,
            label: 'support_pillar',
          });
        });
      } else {
        const floorQuads: THREE.BufferGeometry[] = [];

        for (let gz = 0; gz < gridHeight; gz++) {
          for (let gx = 0; gx < gridWidth; gx++) {
            const inStairOpening = stairOpenings.some(
              (o) => o.floor === f && gx >= o.minGx && gx <= o.maxGx && gz >= o.minGz && gz <= o.maxGz
            );
            const inBridgeOpening = bridgeOpenings.some(
              (o) => o.floor === f && gx >= o.minGx && gx <= o.maxGx && gz >= o.minGz && gz <= o.maxGz
            );
            const inOpening = inStairOpening || inBridgeOpening;

            if (!inOpening) {
              const quad = new THREE.PlaneGeometry(cellSize, cellSize);
              quad.rotateX(-Math.PI / 2);
              const cWx = (gx + 0.5) * cellSize - halfWidth;
              const cWz = (gz + 0.5) * cellSize - halfHeight;
              quad.translate(cWx, floorY, cWz);

              // Seamless UVs across the floor matching ground plane UV mapping
              const uvs = quad.attributes.uv;
              const u0 = gx / gridWidth;
              const u1 = (gx + 1) / gridWidth;
              const v0 = gz / gridHeight;
              const v1 = (gz + 1) / gridHeight;

              uvs.setXY(0, u0, v1);
              uvs.setXY(1, u1, v1);
              uvs.setXY(2, u0, v0);
              uvs.setXY(3, u1, v0);
              uvs.needsUpdate = true;

              floorQuads.push(quad);
            }
          }
        }

        if (floorQuads.length > 0) {
          const mergedFloorGeo = this.mergeBufferGeometries(floorQuads);
          const uFloorMesh = new THREE.Mesh(mergedFloorGeo, floorMat);
          uFloorMesh.name = `FloorPlatform_${f}`;
          uFloorMesh.receiveShadow = true;
          rootGroup.add(uFloorMesh);
          blockingMeshes.push(uFloorMesh);
        }
      }
    }

    // 3. Themed Ceiling (Topmost Floor)
    const ceilingTex = TextureGenerator.createCeilingTexture();
    ceilingTex.repeat.set(gridWidth, gridHeight);
    const ceilingMat = new THREE.MeshLambertMaterial({ map: ceilingTex, side: THREE.DoubleSide });
    const ceilingGeo = new THREE.PlaneGeometry(totalW, totalH);
    ceilingGeo.rotateX(Math.PI / 2);
    const ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceilingMesh.position.set(0, totalLevelHeight, 0);
    rootGroup.add(ceilingMesh);
    blockingMeshes.push(ceilingMesh);

    // 4. Merged Denser Walls Mesh for High Performance
    wallTexture.repeat.set(1, 1);
    const wallMat = new THREE.MeshLambertMaterial({ map: wallTexture });
    const unitWallBox = new THREE.BoxGeometry(cellSize, floorHeight, cellSize);
    const mergedGeos: THREE.BufferGeometry[] = [];

    for (let f = 0; f < floorCount; f++) {
      const floorY = f * floorHeight;
      for (let gz = 0; gz < gridHeight; gz++) {
        for (let gx = 0; gx < gridWidth; gx++) {
          if (grid[gz][gx] === 1) {
            const wx = (gx + 0.5) * cellSize - halfWidth;
            const wz = (gz + 0.5) * cellSize - halfHeight;
            const cloned = unitWallBox.clone();
            cloned.translate(wx, floorY + floorHeight / 2, wz);
            mergedGeos.push(cloned);
          }
        }
      }
    }

    // Merge Wall Geometries into single draw call
    let mergedWallsGeo: THREE.BufferGeometry;
    if (mergedGeos.length > 0) {
      let totalPos = 0;
      let totalNorm = 0;
      let totalUv = 0;
      let totalIndices = 0;

      mergedGeos.forEach((g) => {
        totalPos += g.attributes.position.array.length;
        totalNorm += g.attributes.normal.array.length;
        totalUv += g.attributes.uv.array.length;
        if (g.index) totalIndices += g.index.array.length;
      });

      const posArr = new Float32Array(totalPos);
      const normArr = new Float32Array(totalNorm);
      const uvArr = new Float32Array(totalUv);
      const indexArr = new Uint32Array(totalIndices);

      let posOffset = 0;
      let normOffset = 0;
      let uvOffset = 0;
      let indexOffset = 0;
      let vertexOffset = 0;

      mergedGeos.forEach((g) => {
        posArr.set(g.attributes.position.array, posOffset);
        normArr.set(g.attributes.normal.array, normOffset);
        uvArr.set(g.attributes.uv.array, uvOffset);

        if (g.index) {
          for (let i = 0; i < g.index.array.length; i++) {
            indexArr[indexOffset + i] = g.index.array[i] + vertexOffset;
          }
          indexOffset += g.index.array.length;
        }

        posOffset += g.attributes.position.array.length;
        normOffset += g.attributes.normal.array.length;
        uvOffset += g.attributes.uv.array.length;
        vertexOffset += g.attributes.position.count;
      });

      mergedWallsGeo = new THREE.BufferGeometry();
      mergedWallsGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
      mergedWallsGeo.setAttribute('normal', new THREE.BufferAttribute(normArr, 3));
      mergedWallsGeo.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));
      mergedWallsGeo.setIndex(new THREE.BufferAttribute(indexArr, 1));
    } else {
      mergedWallsGeo = new THREE.BufferGeometry();
    }

    const wallsMesh = new THREE.Mesh(mergedWallsGeo, wallMat);
    wallsMesh.name = `${level.theme}_Walls`;
    wallsMesh.castShadow = true;
    wallsMesh.receiveShadow = true;
    rootGroup.add(wallsMesh);
    blockingMeshes.push(wallsMesh);

    // 5. Spawns & World Coordinates
    const selectedSpawns = spawns || SpawnManager.generateSpawns(level);
    const pSpawnWx = selectedSpawns.player.x;
    const pSpawnWy = selectedSpawns.player.y;
    const pSpawnWz = selectedSpawns.player.z;

    const monsterSpawns = selectedSpawns.monsters;
    const mSpawnWx = monsterSpawns[0].x;
    const mSpawnWy = monsterSpawns[0].y;
    const mSpawnWz = monsterSpawns[0].z;

    const exitWx = selectedSpawns.exit.x;
    const exitWy = selectedSpawns.exit.y;
    const exitWz = selectedSpawns.exit.z;

    // 6. Themed Props & Navigation Obstacles
    this.spawnThemedProps(level, halfWidth, halfHeight, cellSize, rootGroup, propColliders, selectedSpawns);

    // 7. Themed Exit Door
    const exitDoorGroup = new THREE.Group();
    exitDoorGroup.name = 'ThemedExitDoor';

    // In Level 3 (or when exit normal is {-1, 0}), flush the door firmly against the east dead-end wall at gx=8!
    let finalExitWx = exitWx;
    let finalExitWy = exitWy;
    let finalExitWz = exitWz;
    if (level.id === 3 || (level.exitDoor as any)?.normal?.x === -1) {
      // East dead-end wall face is at gx=8 -> boundary at 8 * cellSize - halfWidth
      finalExitWx = 8 * cellSize - halfWidth - 0.12;
      finalExitWz = (15 + 0.5) * cellSize - halfHeight;
    }

    exitDoorGroup.position.set(finalExitWx, finalExitWy, finalExitWz);
    exitDoorGroup.rotation.y = selectedSpawns.exit.rotationY ?? (level.exitDoor as any)?.rotationY ?? 0;

    const doorTex = TextureGenerator.createExitDoorTexture(level.exitLockedInitially || false);
    const doorMat = new THREE.MeshBasicMaterial({ map: doorTex });
    const doorGeo = new THREE.BoxGeometry(cellSize * 0.9, wallHeight * 0.75, 0.2);
    const doorMesh = new THREE.Mesh(doorGeo, doorMat);
    doorMesh.position.y = (wallHeight * 0.75) / 2;
    exitDoorGroup.add(doorMesh);

    // Glowing Exit Header Sign
    if (typeof document !== 'undefined') {
      const lintelSignCanvas = document.createElement('canvas');
      lintelSignCanvas.width = 256;
      lintelSignCanvas.height = 64;
      const lCtx = lintelSignCanvas.getContext('2d')!;
      lCtx.fillStyle = '#064e3b';
      lCtx.fillRect(0, 0, 256, 64);
      lCtx.strokeStyle = '#22c55e';
      lCtx.lineWidth = 4;
      lCtx.strokeRect(4, 4, 248, 56);
      lCtx.font = 'bold 24px monospace, sans-serif';
      lCtx.textAlign = 'center';
      lCtx.textBaseline = 'middle';
      lCtx.fillStyle = '#4ade80';
      lCtx.fillText('★ EXIT / KELUAR ★', 128, 32);
      const lintelSignTex = new THREE.CanvasTexture(lintelSignCanvas);
      lintelSignTex.needsUpdate = true;
      const lintelSign = new THREE.Mesh(
        new THREE.PlaneGeometry(2.4, 0.6),
        new THREE.MeshBasicMaterial({ map: lintelSignTex, side: THREE.DoubleSide })
      );
      lintelSign.position.set(0, wallHeight * 0.75 + 0.35, 0.12);
      exitDoorGroup.add(lintelSign);
    }

    const exitPointLight = new THREE.PointLight(
      level.exitLockedInitially ? 0xf59e0b : 0x22c55e,
      3.6,
      16,
      1.1
    );
    exitPointLight.position.set(0, (wallHeight * 0.75) / 2 + 0.8, 0.6);
    exitDoorGroup.add(exitPointLight);
    rootGroup.add(exitDoorGroup);

    // Generous and precise exit trigger box encompassing the entire exit corridor cell
    const exitTriggerBox = new THREE.Box3(
      new THREE.Vector3(
        (7 - 0.2) * cellSize - halfWidth,
        exitWy - 0.5,
        (15 - 0.4) * cellSize - halfHeight
      ),
      new THREE.Vector3(
        (8 + 0.5) * cellSize - halfWidth,
        exitWy + wallHeight + 1.0,
        (15 + 1.4) * cellSize - halfHeight
      )
    );

    // 8. Corridors Atmospheric Lights
    this.spawnCorridorLights(level, halfWidth, halfHeight, cellSize, wallHeight, rootGroup);

    // 9. Overview Markers (Anchored safely above topmost roof in multi-floor environments)
    const markers = this.createOverviewMarkers(pSpawnWx, monsterSpawns, exitWx, exitWz, totalLevelHeight, pSpawnWz);
    rootGroup.add(markers.playerMarker);
    markers.monsterMarkers.forEach((m) => rootGroup.add(m));
    rootGroup.add(markers.exitMarker);

    // 10. Weapon Pickups
    const weaponPickups = this.spawnWorldPickups(level, halfWidth, halfHeight, cellSize, rootGroup);

    // 11. Interactive Switches (Level 9 Research Facility)
    const interactiveSwitches: WorldInteractiveSwitch[] = [];
    if (level.interactiveSwitches && level.interactiveSwitches.length > 0) {
      level.interactiveSwitches.forEach((sw) => {
        const swWx = (sw.x + 0.5) * cellSize - halfWidth;
        const swWz = (sw.z + 0.5) * cellSize - halfHeight;

        const terminal = EnvironmentPropFactory.createEmergencySwitchTerminal(false);
        terminal.group.position.set(swWx, 0, swWz);
        rootGroup.add(terminal.group);

        propColliders.push({ x: swWx, z: swWz, radius: 0.45 });

        interactiveSwitches.push({
          id: sw.id,
          name: sw.name,
          group: terminal.group,
          position: new THREE.Vector3(swWx, 0, swWz),
          activated: false,
          beaconMesh: terminal.beaconMesh,
          light: terminal.light,
        });
      });
    }

    // 12. Stairs & Ramps (Multi-Floor Vertical System)
    const worldRamps: WorldRamp[] = [];
    const railingBoxes: BoxCollider[] = [];
    if (level.ramps && level.ramps.length > 0) {
      level.ramps.forEach((ramp) => {
        const dx = ramp.endCell.x - ramp.startCell.x;
        const dz = ramp.endCell.z - ramp.startCell.z;
        const stepX = Math.sign(dx);
        const stepZ = Math.sign(dz);

        let startWx: number;
        let startWz: number;
        let endWx: number;
        let endWz: number;

        if (stepX !== 0) {
          // Stairs run horizontally along X: seamless connection to floor slab boundaries
          if (stepX > 0) {
            startWx = ramp.startCell.x * cellSize - halfWidth;
            endWx = ramp.endCell.x * cellSize - halfWidth;
          } else {
            startWx = (ramp.startCell.x + 1) * cellSize - halfWidth;
            endWx = (ramp.endCell.x + 1) * cellSize - halfWidth;
          }
          startWz = (ramp.startCell.z + 0.5) * cellSize - halfHeight;
          endWz = (ramp.endCell.z + 0.5) * cellSize - halfHeight;
        } else {
          // Stairs run vertically along Z: seamless connection to floor slab boundaries
          if (stepZ > 0) {
            startWz = ramp.startCell.z * cellSize - halfHeight;
            endWz = ramp.endCell.z * cellSize - halfHeight;
          } else {
            startWz = (ramp.startCell.z + 1) * cellSize - halfHeight;
            endWz = (ramp.endCell.z + 1) * cellSize - halfHeight;
          }
          startWx = (ramp.startCell.x + 0.5) * cellSize - halfWidth;
          endWx = (ramp.endCell.x + 0.5) * cellSize - halfWidth;
        }

        const startY = ramp.fromFloor * floorHeight;
        const endY = ramp.toFloor * floorHeight;

        const deltaX = endWx - startWx;
        const deltaZ = endWz - startWz;
        const length = Math.hypot(deltaX, deltaZ);
        const height = endY - startY;
        const angle = Math.atan2(deltaX, deltaZ);

        const dirX = length > 0.001 ? deltaX / length : 1;
        const dirZ = length > 0.001 ? deltaZ / length : 0;
        const normX = -dirZ;
        const normZ = dirX;

        // Stair width fills the full corridor cell opening so left and right flank walls sit 100% flush (rapat) against the floor slab
        const rampWidth = cellSize;
        const stairMesh = EnvironmentPropFactory.createWallStaircase(
          rampWidth,
          height,
          length,
          level.theme,
          wallTexture
        );
        const midX = (startWx + endWx) / 2;
        const midZ = (startWz + endWz) / 2;

        stairMesh.position.set(midX, startY, midZ);
        stairMesh.rotation.y = angle;
        rootGroup.add(stairMesh);

        // Safety Parapets around the closed sides of the upper-floor stairwell opening
        // Note: Parapets are only placed along open edges (e.g. open atriums). Where adjacent grid cells are solid walls,
        // full-height walls already bound the corridor seamlessly.
        const upperY = ramp.toFloor * floorHeight;
        const railingThick = 0.22;

        if (Math.abs(deltaX) >= Math.abs(deltaZ)) {
          // Stairs run horizontally along X
          const sideMinX = Math.min(startWx, endWx);
          const sideMaxX = Math.max(startWx, endWx);
          const sideMinZ = midZ - rampWidth / 2;
          const sideMaxZ = midZ + rampWidth / 2;
          const sideLength = sideMaxX - sideMinX;
          const sideMidX = (sideMinX + sideMaxX) / 2;

          const stepX = Math.sign(deltaX);
          const backGx = ramp.startCell.x - stepX;
          const backGz = ramp.startCell.z;
          const hasBackWall = backGx >= 0 && backGx < gridWidth && grid[backGz][backGx] === 1;

          const minGx = Math.min(ramp.startCell.x, ramp.endCell.x);
          const maxGx = Math.max(ramp.startCell.x, ramp.endCell.x);

          const northGz = ramp.startCell.z - 1;
          const hasNorthWall = northGz >= 0 && northGz < gridHeight &&
            Array.from({ length: maxGx - minGx + 1 }, (_, i) => minGx + i).every((gx) => grid[northGz][gx] === 1);

          const southGz = ramp.startCell.z + 1;
          const hasSouthWall = southGz >= 0 && southGz < gridHeight &&
            Array.from({ length: maxGx - minGx + 1 }, (_, i) => minGx + i).every((gx) => grid[southGz][gx] === 1);

          if (!hasNorthWall) {
            const bNorth = EnvironmentPropFactory.createWallStairwellParapet(sideLength, 1.05, level.theme);
            bNorth.position.set(sideMidX, upperY, sideMinZ);
            bNorth.rotation.y = Math.PI / 2;
            rootGroup.add(bNorth);
            railingBoxes.push({
              minX: sideMinX,
              maxX: sideMaxX,
              minZ: sideMinZ - railingThick,
              maxZ: sideMinZ + railingThick,
              minY: upperY,
              maxY: upperY + 1.2,
              label: 'parapet_north',
            });
          }

          if (!hasSouthWall) {
            const bSouth = EnvironmentPropFactory.createWallStairwellParapet(sideLength, 1.05, level.theme);
            bSouth.position.set(sideMidX, upperY, sideMaxZ);
            bSouth.rotation.y = Math.PI / 2;
            rootGroup.add(bSouth);
            railingBoxes.push({
              minX: sideMinX,
              maxX: sideMaxX,
              minZ: sideMaxZ - railingThick,
              maxZ: sideMaxZ + railingThick,
              minY: upperY,
              maxY: upperY + 1.2,
              label: 'parapet_south',
            });
          }

          if (!hasBackWall && level.theme === 'school') {
            const bBack = EnvironmentPropFactory.createWallStairwellParapet(rampWidth, 1.05, level.theme);
            bBack.position.set(startWx, upperY, midZ);
            rootGroup.add(bBack);
            railingBoxes.push({
              minX: startWx - railingThick,
              maxX: startWx + railingThick,
              minZ: sideMinZ,
              maxZ: sideMaxZ,
              minY: upperY,
              maxY: upperY + 1.2,
              label: 'parapet_back',
            });
          }
        } else {
          // Stairs run vertically along Z
          const sideMinX = midX - rampWidth / 2;
          const sideMaxX = midX + rampWidth / 2;
          const sideMinZ = Math.min(startWz, endWz);
          const sideMaxZ = Math.max(startWz, endWz);
          const sideLength = sideMaxZ - sideMinZ;
          const sideMidZ = (sideMinZ + sideMaxZ) / 2;

          const stepZ = Math.sign(deltaZ);
          const backGz = ramp.startCell.z - stepZ;
          const backGx = ramp.startCell.x;
          const hasBackWall = backGz >= 0 && backGz < gridHeight && grid[backGz][backGx] === 1;

          const minGz = Math.min(ramp.startCell.z, ramp.endCell.z);
          const maxGz = Math.max(ramp.startCell.z, ramp.endCell.z);

          const westGx = ramp.startCell.x - 1;
          const hasWestWall = westGx >= 0 && westGx < gridWidth &&
            Array.from({ length: maxGz - minGz + 1 }, (_, i) => minGz + i).every((gz) => grid[gz][westGx] === 1);

          const eastGx = ramp.startCell.x + 1;
          const hasEastWall = eastGx >= 0 && eastGx < gridWidth &&
            Array.from({ length: maxGz - minGz + 1 }, (_, i) => minGz + i).every((gz) => grid[gz][eastGx] === 1);

          if (!hasWestWall) {
            const bWest = EnvironmentPropFactory.createWallStairwellParapet(sideLength, 1.05, level.theme);
            bWest.position.set(sideMinX, upperY, sideMidZ);
            rootGroup.add(bWest);
            railingBoxes.push({
              minX: sideMinX - railingThick,
              maxX: sideMinX + railingThick,
              minZ: sideMinZ,
              maxZ: sideMaxZ,
              minY: upperY,
              maxY: upperY + 1.2,
              label: 'parapet_west',
            });
          }

          if (!hasEastWall) {
            const bEast = EnvironmentPropFactory.createWallStairwellParapet(sideLength, 1.05, level.theme);
            bEast.position.set(sideMaxX, upperY, sideMidZ);
            rootGroup.add(bEast);
            railingBoxes.push({
              minX: sideMaxX - railingThick,
              maxX: sideMaxX + railingThick,
              minZ: sideMinZ,
              maxZ: sideMaxZ,
              minY: upperY,
              maxY: upperY + 1.2,
              label: 'parapet_east',
            });
          }

          if (!hasBackWall && level.theme === 'school') {
            const bBack = EnvironmentPropFactory.createWallStairwellParapet(rampWidth, 1.05, level.theme);
            bBack.position.set(midX, upperY, startWz);
            bBack.rotation.y = Math.PI / 2;
            rootGroup.add(bBack);
            railingBoxes.push({
              minX: sideMinX,
              maxX: sideMaxX,
              minZ: startWz - railingThick,
              maxZ: startWz + railingThick,
              minY: upperY,
              maxY: upperY + 1.2,
              label: 'parapet_back',
            });
          }
        }

        // Solid back wall collider at the high end of the stairs (Floor 0, from startY to startY + height - 0.2)
        // Completely impenetrable for players approaching the back of the stairs on Floor 0, while keeping upper floor landing 100% open
        const backWallThick = 0.25;
        if (Math.abs(deltaX) >= Math.abs(deltaZ)) {
          railingBoxes.push({
            minX: endWx - backWallThick,
            maxX: endWx + backWallThick,
            minZ: midZ - rampWidth / 2,
            maxZ: midZ + rampWidth / 2,
            minY: startY,
            maxY: startY + height - 0.2,
            label: 'stair_back_wall',
          });
        } else {
          railingBoxes.push({
            minX: midX - rampWidth / 2,
            maxX: midX + rampWidth / 2,
            minZ: endWz - backWallThick,
            maxZ: endWz + backWallThick,
            minY: startY,
            maxY: startY + height - 0.2,
            label: 'stair_back_wall',
          });
        }

        const box = new THREE.Box3(
          new THREE.Vector3(
            Math.min(startWx, endWx) - rampWidth / 2 - 0.4,
            Math.min(startY, endY) - 0.5,
            Math.min(startWz, endWz) - rampWidth / 2 - 0.4
          ),
          new THREE.Vector3(
            Math.max(startWx, endWx) + rampWidth / 2 + 0.4,
            Math.max(startY, endY) + 3.0,
            Math.max(startWz, endWz) + rampWidth / 2 + 0.4
          )
        );

        worldRamps.push({
          fromFloor: ramp.fromFloor,
          toFloor: ramp.toFloor,
          startWorld: { x: startWx, y: startY, z: startWz },
          endWorld: { x: endWx, y: endY, z: endWz },
          width: rampWidth,
          length,
          box,
          dirX,
          dirZ,
          normX,
          normZ,
        });
      });
    }

    // 13. Wooden Bridges (Types A, B, and C)
    const worldBridges: WorldBridge[] = [];
    const fallZones: FallZoneConfig[] = [];
    if (level.bridges && level.bridges.length > 0) {
      level.bridges.forEach((b) => {
        const startWx = (b.startCell.x + 0.5) * cellSize - halfWidth;
        const startWz = (b.startCell.z + 0.5) * cellSize - halfHeight;
        const endWx = (b.endCell.x + 0.5) * cellSize - halfWidth;
        const endWz = (b.endCell.z + 0.5) * cellSize - halfHeight;

        const dx = endWx - startWx;
        const dz = endWz - startWz;
        const length = Math.hypot(dx, dz);
        const angle = Math.atan2(dx, dz);

        const bridgeWidth = 2.4;
        const bridgeHeight = b.floor * floorHeight;

        const bridgeMesh = EnvironmentPropFactory.createWoodenBridge(b.type, length, bridgeWidth);
        const midX = (startWx + endWx) / 2;
        const midZ = (startWz + endWz) / 2;
        bridgeMesh.position.set(midX, bridgeHeight, midZ);
        bridgeMesh.rotation.y = angle;
        rootGroup.add(bridgeMesh);

        // Complete Lower Environment directly beneath the bridge
        const lowerY = Math.max(0, (b.floor - 1) * floorHeight);
        if (level.theme === 'sewer') {
          // Sewer waterway/sludge channel directly under bridge
          const canalGeo = new THREE.PlaneGeometry(bridgeWidth * 1.5, length * 1.05);
          canalGeo.rotateX(-Math.PI / 2);
          const canalMat = new THREE.MeshStandardMaterial({
            color: 0x142b1a,
            roughness: 0.15,
            metalness: 0.3,
          });
          const canal = new THREE.Mesh(canalGeo, canalMat);
          canal.position.set(midX, lowerY + 0.04, midZ);
          canal.rotation.y = angle;
          rootGroup.add(canal);
        } else if (level.theme === 'nightmare') {
          // Fatal void pit under broken bridge in nightmare tower
          const voidGeo = new THREE.PlaneGeometry(bridgeWidth * 2.0, length * 1.4);
          voidGeo.rotateX(-Math.PI / 2);
          const voidMat = new THREE.MeshBasicMaterial({ color: 0x180306 });
          const voidMesh = new THREE.Mesh(voidGeo, voidMat);
          voidMesh.position.set(midX, lowerY + 0.02, midZ);
          voidMesh.rotation.y = angle;
          rootGroup.add(voidMesh);
        } else {
          // Lower platform / courtyard path under bridge
          const lowerPathGeo = new THREE.PlaneGeometry(bridgeWidth * 1.3, length * 1.05);
          lowerPathGeo.rotateX(-Math.PI / 2);
          const lowerPathMat = new THREE.MeshLambertMaterial({ color: 0x2b3036 });
          const lowerPath = new THREE.Mesh(lowerPathGeo, lowerPathMat);
          lowerPath.position.set(midX, lowerY + 0.02, midZ);
          lowerPath.rotation.y = angle;
          rootGroup.add(lowerPath);
        }

        const box = new THREE.Box3(
          new THREE.Vector3(
            Math.min(startWx, endWx) - bridgeWidth / 2,
            bridgeHeight - 0.5,
            Math.min(startWz, endWz) - bridgeWidth / 2
          ),
          new THREE.Vector3(
            Math.max(startWx, endWx) + bridgeWidth / 2,
            bridgeHeight + 2.0,
            Math.max(startWz, endWz) + bridgeWidth / 2
          )
        );

        let gapBox: THREE.Box3 | undefined;
        if (b.type === 'broken') {
          const gapSpan = length * 0.35;
          const isHorizontal = Math.abs(dx) >= Math.abs(dz);
          const gapMinX = isHorizontal ? midX - gapSpan / 2 : midX - bridgeWidth * 0.45;
          const gapMaxX = isHorizontal ? midX + gapSpan / 2 : midX + bridgeWidth * 0.45;
          const gapMinZ = isHorizontal ? midZ - bridgeWidth * 0.45 : midZ - gapSpan / 2;
          const gapMaxZ = isHorizontal ? midZ + bridgeWidth * 0.45 : midZ + gapSpan / 2;

          gapBox = new THREE.Box3(
            new THREE.Vector3(gapMinX, bridgeHeight - 0.5, gapMinZ),
            new THREE.Vector3(gapMaxX, bridgeHeight + 2.0, gapMaxZ)
          );
          fallZones.push({
            box: gapBox,
            fatal: b.floor === 0 || level.theme === 'nightmare',
            description: `broken_bridge_${b.id}_gap`,
          });
        }

        worldBridges.push({
          id: b.id,
          floor: b.floor,
          type: b.type,
          startWorld: { x: startWx, y: bridgeHeight, z: startWz },
          endWorld: { x: endWx, y: bridgeHeight, z: endWz },
          height: bridgeHeight,
          width: bridgeWidth,
          length,
          box,
          gapBox,
        });
      });
    }

    // LEVEL-SPECIFIC COLLISION CONFIGURATION (LEVELS 2 TO 10)
    const collisionConfig: LevelCollisionConfig = {
      levelId: level.id,
      environmentId: level.theme as EnvironmentId,
      multiFloor: floorCount > 1,
      floorCount,
      floorHeight,
      perimeterMargin: 1.0,
      useGridWalls: true, // Structured indoor/maze levels use grid wall cubes
      wallGrid: grid,
      cylinderColliders: propColliders.map((p) => ({
        x: p.x,
        z: p.z,
        radius: p.radius,
        minY: p.minY,
        maxY: p.maxY,
        label: p.label || 'themed_prop',
      })),
      boxColliders: railingBoxes,
      hasStairs: worldRamps.length > 0,
      ramps: worldRamps,
      bridges: worldBridges,
      stairOpenings,
      fallZones,
    };

    // 2D Paper Sketch Collider Map
    const overviewMapGroup = LabyrinthBuilder.createOverviewColliderMap(
      level,
      grid,
      propColliders,
      pSpawnWx,
      pSpawnWz,
      selectedSpawns.player.rotationY,
      monsterSpawns
    );

    return {
      rootGroup,
      wallsMesh,
      exitDoorMesh: exitDoorGroup,
      exitTriggerBox,
      playerMarker: markers.playerMarker,
      monsterMarker: markers.monsterMarkers[0],
      monsterMarkers: markers.monsterMarkers,
      exitMarker: markers.exitMarker,
      overviewMapGroup,
      playerWorldSpawn: { x: pSpawnWx, y: pSpawnWy, z: pSpawnWz, rotationY: selectedSpawns.player.rotationY, floor: selectedSpawns.player.floor },
      monsterWorldSpawn: { x: mSpawnWx, y: mSpawnWy, z: mSpawnWz, rotationY: monsterSpawns[0].rotationY, floor: monsterSpawns[0].floor },
      monsterWorldSpawns: monsterSpawns,
      exitWorldPos: { x: exitWx, y: exitWy, z: exitWz, floor: selectedSpawns.exit.floor },
      selectedSpawns,
      treeColliders: propColliders,
      updatedGrid: grid,
      navigationGrid: grid,
      collisionConfig,
      weaponPickups,
      interactiveSwitches,
      floorCount,
      floorHeight,
      ramps: worldRamps,
      bridges: worldBridges,
      stairOpenings,
      blockingMeshes,
    };
  }

  // =========================================================================
  // THEMED PROPS POPULATION
  // =========================================================================
  private static spawnThemedProps(
    level: LevelDefinition,
    halfWidth: number,
    halfHeight: number,
    cellSize: number,
    rootGroup: THREE.Group,
    colliders: Array<{ x: number; z: number; radius: number; minY?: number; maxY?: number; label?: string }>,
    selectedSpawns?: SelectedSpawns
  ): void {
    if (level.theme === 'labyrinth' || level.id === 3) {
      this.spawnLabyrinthLevelProps(level, halfWidth, halfHeight, cellSize, rootGroup, selectedSpawns);
      return;
    }
    if (level.theme === 'school') {
      this.spawnSchoolLevelProps(level, halfWidth, halfHeight, cellSize, rootGroup, colliders);
      return;
    }

    const { grid, gridWidth, gridHeight, theme } = level;

    // Scan for open corridor cells suitable for props (avoid spawns & exit)
    const isSpawnOrExit = (gx: number, gz: number) => {
      if (Math.abs(gx - level.playerSpawn.x) <= 2 && Math.abs(gz - level.playerSpawn.z) <= 2) return true;
      if (Math.abs(gx - level.monsterSpawn.x) <= 1 && Math.abs(gz - level.monsterSpawn.z) <= 1) return true;
      if (Math.abs(gx - level.exitDoor.x) <= 1 && Math.abs(gz - level.exitDoor.z) <= 1) return true;
      if (selectedSpawns) {
        const pCellX = Math.floor((selectedSpawns.player.x + halfWidth) / cellSize);
        const pCellZ = Math.floor((selectedSpawns.player.z + halfHeight) / cellSize);
        if (Math.abs(gx - pCellX) <= 2 && Math.abs(gz - pCellZ) <= 2) return true;
        for (const m of selectedSpawns.monsters) {
          const mCellX = Math.floor((m.x + halfWidth) / cellSize);
          const mCellZ = Math.floor((m.z + halfHeight) / cellSize);
          if (Math.abs(gx - mCellX) <= 1 && Math.abs(gz - mCellZ) <= 1) return true;
        }
        const eCellX = Math.floor((selectedSpawns.exit.x + halfWidth) / cellSize);
        const eCellZ = Math.floor((selectedSpawns.exit.z + halfHeight) / cellSize);
        if (Math.abs(gx - eCellX) <= 1 && Math.abs(gz - eCellZ) <= 1) return true;
      }
      return false;
    };

    // Strictly prevent props from spawning near interactive switches
    const isNearSwitch = (gx: number, gz: number) => {
      if (level.interactiveSwitches) {
        for (const sw of level.interactiveSwitches) {
          if (Math.abs(gx - sw.x) <= 2 && Math.abs(gz - sw.z) <= 2) return true;
        }
      }
      return false;
    };

    // Strictly prevent props from spawning on or directly adjacent to stairs, landings, and bridges
    const isRampOrBridge = (gx: number, gz: number) => {
      if (level.ramps) {
        for (const r of level.ramps) {
          const minX = Math.min(r.startCell.x, r.endCell.x) - 1;
          const maxX = Math.max(r.startCell.x, r.endCell.x) + 1;
          const minZ = Math.min(r.startCell.z, r.endCell.z) - 1;
          const maxZ = Math.max(r.startCell.z, r.endCell.z) + 1;
          if (gx >= minX && gx <= maxX && gz >= minZ && gz <= maxZ) return true;
        }
      }
      if (level.bridges) {
        for (const b of level.bridges) {
          const minX = Math.min(b.startCell.x, b.endCell.x) - 1;
          const maxX = Math.max(b.startCell.x, b.endCell.x) + 1;
          const minZ = Math.min(b.startCell.z, b.endCell.z) - 1;
          const maxZ = Math.max(b.startCell.z, b.endCell.z) + 1;
          if (gx >= minX && gx <= maxX && gz >= minZ && gz <= maxZ) return true;
        }
      }
      return false;
    };

    let propSeed = level.id * 12345;
    const propRnd = () => {
      propSeed = (propSeed * 9301 + 49297) % 233280;
      return propSeed / 233280;
    };

    for (let gz = 2; gz < gridHeight - 2; gz++) {
      for (let gx = 2; gx < gridWidth - 2; gx++) {
        if (grid[gz][gx] === 0 && !isSpawnOrExit(gx, gz) && !isRampOrBridge(gx, gz) && !isNearSwitch(gx, gz)) {
          // Probability of prop in room corner/side
          if (propRnd() > 0.82) {
            const wx = (gx + 0.5) * cellSize - halfWidth + (propRnd() - 0.5) * (cellSize * 0.35);
            const wz = (gz + 0.5) * cellSize - halfHeight + (propRnd() - 0.5) * (cellSize * 0.35);

            let propGroup: THREE.Group | null = null;
            let radius = 0.45;

            switch (theme) {
              case 'school':
                if (propRnd() > 0.4) {
                  propGroup = EnvironmentPropFactory.createSchoolDesk();
                } else {
                  propGroup = EnvironmentPropFactory.createSchoolLocker();
                  radius = 0.55;
                }
                break;
              case 'labyrinth':
                propGroup = EnvironmentPropFactory.createIndustrialPipeWall();
                radius = 0.35;
                break;
              case 'hospital':
                if (propRnd() > 0.4) {
                  propGroup = EnvironmentPropFactory.createHospitalBed();
                  radius = 0.65;
                } else {
                  propGroup = EnvironmentPropFactory.createWheelchair();
                  radius = 0.4;
                }
                break;
              case 'sewer':
                propGroup = EnvironmentPropFactory.createSewerPipeTunnel();
                radius = 0.5;
                break;
              case 'factory':
                if (propRnd() > 0.5) {
                  propGroup = EnvironmentPropFactory.createWoodenCrate();
                  radius = 0.5;
                } else {
                  propGroup = EnvironmentPropFactory.createOilDrum();
                  radius = 0.38;
                }
                break;
              case 'hotel':
                if (propRnd() > 0.5) {
                  propGroup = EnvironmentPropFactory.createHotelSofa();
                  radius = 0.65;
                } else {
                  propGroup = EnvironmentPropFactory.createLuggageStack();
                  radius = 0.4;
                }
                break;
              case 'subway':
                if (propRnd() > 0.5) {
                  propGroup = EnvironmentPropFactory.createSubwayBench();
                  radius = 0.55;
                } else {
                  propGroup = EnvironmentPropFactory.createTicketTurnstile();
                  radius = 0.45;
                }
                break;
              case 'research_facility':
                propGroup = EnvironmentPropFactory.createComputerConsole();
                radius = 0.55;
                break;
              case 'nightmare':
                propGroup = EnvironmentPropFactory.createAbyssMonolith();
                radius = 0.5;
                break;
            }

            if (propGroup) {
              propGroup.position.set(wx, 0, wz);
              propGroup.rotation.y = propRnd() * Math.PI * 2;
              rootGroup.add(propGroup);
              colliders.push({ x: wx, z: wz, radius });
            }
          }
        }
      }
    }
  }

  // Dedicated Labyrinth (Level 3) Props: Guide Arrows pointing to stairs & Pocong Floor Trails
  private static spawnLabyrinthLevelProps(
    level: LevelDefinition,
    halfWidth: number,
    halfHeight: number,
    cellSize: number,
    rootGroup: THREE.Group,
    selectedSpawns?: SelectedSpawns
  ): void {
    if (level.id !== 3) return;

    const addArrow = (
      wallGx: number,
      wallGz: number,
      face: 'north' | 'south' | 'east' | 'west',
      dir: 'right' | 'left' | 'up',
      label: string,
      floor: number = 0,
      colorType: 'stairs' | 'exit' = 'stairs'
    ) => {
      const decal = EnvironmentPropFactory.createDirectionalArrowDecal(dir, label, colorType);
      const wy = floor * (level.floorHeight || 3.8);

      let wx = (wallGx + 0.5) * cellSize - halfWidth;
      let wz = (wallGz + 0.5) * cellSize - halfHeight;
      let rotY = 0;

      if (face === 'west') {
        wx = wallGx * cellSize - halfWidth - 0.06;
        rotY = -Math.PI / 2;
      } else if (face === 'east') {
        wx = (wallGx + 1) * cellSize - halfWidth + 0.06;
        rotY = Math.PI / 2;
      } else if (face === 'north') {
        wz = wallGz * cellSize - halfHeight - 0.06;
        rotY = Math.PI;
      } else if (face === 'south') {
        wz = (wallGz + 1) * cellSize - halfHeight + 0.06;
        rotY = 0;
      }

      decal.position.set(wx, wy, wz);
      decal.rotation.y = rotY;
      rootGroup.add(decal);
    };

    // 1. Near spawn: Wall at (4, 1), West face (in front of player coming east from (1, 1) -> (3, 1))
    addArrow(4, 1, 'west', 'right', 'TANGGA / STAIRS ➔', 0);

    // 2. Turn at (7, 3): Wall at (8, 3), West face (in front of player coming east along row 3)
    addArrow(8, 3, 'west', 'right', 'TANGGA / STAIRS ➔', 0);

    // 3. Turn at (7, 7): Wall at (7, 8), North face (in front of player coming south)
    addArrow(7, 8, 'north', 'right', 'TANGGA / STAIRS ➔', 0);

    // 4. Turn at (5, 9): Wall at (5, 10), North face (in front of player coming south)
    addArrow(5, 10, 'north', 'left', '⬅ TANGGA / STAIRS', 0);

    // 5. Turn at (7, 9): Wall at (8, 9), West face (in front of player coming east)
    addArrow(8, 9, 'west', 'right', 'TANGGA / STAIRS ➔', 0);

    // 6. Major intersection at (7, 13): Wall at (7, 14), North face (in front of player coming south)
    addArrow(7, 14, 'north', 'left', '⬅ TANGGA / STAIRS ⬅', 0);

    // 7. Base of the stairs at (17, 13): Wall at (17, 14), North face (facing the stairs at (17, 12))
    addArrow(17, 14, 'north', 'up', '⬆ LANTAI 2 / 2ND FLOOR', 0);

    // =======================================================================
    // FLOOR 2 EXIT SIGNS — HANYA DI AREA DEKAT PINTU MASUK & KORIDOR EXIT (7, 15)
    // =======================================================================
    const addFloorExitDecal = (cellX: number, cellZ: number, rotY: number, label: string = 'EXIT ➔') => {
      const decal = EnvironmentPropFactory.createFloorExitArrowDecal(label);
      const wx = (cellX + 0.5) * cellSize - halfWidth;
      const wz = (cellZ + 0.5) * cellSize - halfHeight;
      const wy = 1 * (level.floorHeight || 3.8) + 0.025; // Tepat menempel di lantai 2
      decal.position.set(wx, wy, wz);
      decal.rotation.y = rotY;
      rootGroup.add(decal);
    };

    // 1. Tepat di pintu masuk lorong exit (ujung barat Row 13 belok ke selatan):
    addArrow(0, 13, 'east', 'left', '⬅ PINTU EXIT (BELOK)', 1, 'exit'); // Dinding depan belokan
    addFloorExitDecal(1, 14, Math.PI, 'EXIT ➔'); // Panah lantai hijau menunjuk ke selatan

    // 2. Di belokan masuk ke koridor lurus Row 15:
    addArrow(1, 16, 'north', 'left', '⬅ PINTU EXIT / EXIT', 1, 'exit'); // Dinding depan belokan ke timur
    addFloorExitDecal(1, 15, -Math.PI / 2, 'EXIT ➔'); // Panah lantai hijau menunjuk ke timur masuk koridor

    // 3. Di sepanjang koridor lurus Row 15 menuju Pintu Exit:
    addFloorExitDecal(4, 15, -Math.PI / 2, 'EXIT ➔'); // Panah lantai hijau menuntun ke timur
    addArrow(5, 14, 'south', 'right', 'PINTU EXIT ➔', 1, 'exit'); // Rambu dinding menuntun lurus ke timur
    addFloorExitDecal(6, 15, -Math.PI / 2, '★ EXIT ★'); // Panah lantai hijau tepat di depan pintu exit

    // 4. Tepat di Pintu Exit di (7, 15):
    addArrow(7, 14, 'south', 'right', '★ PINTU EXIT ★', 1, 'exit'); // Rambu dinding di samping pintu exit
    addArrow(8, 15, 'west', 'up', '★ PINTU EXIT / EXIT ★', 1, 'exit'); // Rambu dinding tempat pintu exit menempel

    // =======================================================================
    // FLOOR 1 (FLOOR 0) ACCURATE PROXIMITY BLOOD DECALS (HANYA DI AREA DEKAT POCONG)
    // =======================================================================
    let mGx = 11;
    let mGz = 7;
    let monsterWx = (11 + 0.5) * cellSize - halfWidth;
    let monsterWz = (7 + 0.5) * cellSize - halfHeight;

    if (selectedSpawns && selectedSpawns.monsters && selectedSpawns.monsters.length > 0) {
      monsterWx = selectedSpawns.monsters[0].x;
      monsterWz = selectedSpawns.monsters[0].z;
      // Gunakan Math.floor agar koordinat sel grid Pocong 100% presisi
      mGx = Math.floor((monsterWx + halfWidth) / cellSize);
      mGz = Math.floor((monsterWz + halfHeight) / cellSize);
    }

    // 1. Genangan Darah Besar (Blood Pool) tepat di bawah kaki posisi Pocong berada
    const nestDecal = EnvironmentPropFactory.createPocongTrailDecal('blood_pool');
    nestDecal.position.set(monsterWx, 0.025, monsterWz);
    nestDecal.rotation.y = Math.random() * Math.PI * 2;
    rootGroup.add(nestDecal);

    // 2. BFS di koridor lantai 0 HANYA sampai radius 4 langkah koridor dari Pocong
    const maxProximityDist = 4;
    const { grid, gridWidth, gridHeight } = level;
    const dist: number[][] = Array.from({ length: gridHeight }, () => Array(gridWidth).fill(-1));
    const nextToMonster: Array<Array<{ x: number; z: number } | null>> = Array.from({ length: gridHeight }, () =>
      Array(gridWidth).fill(null)
    );

    const queue: Array<{ x: number; z: number }> = [{ x: mGx, z: mGz }];
    dist[mGz][mGx] = 0;

    const dirs = [
      { dx: 0, dz: -1 },
      { dx: 0, dz: 1 },
      { dx: -1, dz: 0 },
      { dx: 1, dz: 0 },
    ];

    const nearCells: Array<{ x: number; z: number; dist: number; nextX: number; nextZ: number }> = [];

    while (queue.length > 0) {
      const curr = queue.shift()!;
      if (dist[curr.z][curr.x] >= maxProximityDist) continue;

      for (const d of dirs) {
        const nx = curr.x + d.dx;
        const nz = curr.z + d.dz;
        if (nx >= 0 && nx < gridWidth && nz >= 0 && nz < gridHeight && grid[nz][nx] === 0 && dist[nz][nx] === -1) {
          dist[nz][nx] = dist[curr.z][curr.x] + 1;
          nextToMonster[nz][nx] = { x: curr.x, z: curr.z };
          nearCells.push({
            x: nx,
            z: nz,
            dist: dist[nz][nx],
            nextX: curr.x,
            nextZ: curr.z,
          });
          queue.push({ x: nx, z: nz });
        }
      }
    }

    // 3. Letakkan jejak darah akurat pada sel-sel di area dekat Pocong
    for (const cell of nearCells) {
      const dx = cell.nextX - cell.x;
      const dz = cell.nextZ - cell.z;
      // Rotasi yaw agar semburan dan seretan jejak darah menghadap akurat ke arah sel Pocong
      const rotY = Math.atan2(-dx, -dz);

      const cellCenterWx = (cell.x + 0.5) * cellSize - halfWidth;
      const cellCenterWz = (cell.z + 0.5) * cellSize - halfHeight;

      if (cell.dist === 1) {
        // Tepat 1 langkah di koridor menuju Pocong:
        // Seretan tapak berdarah tebal mengarah langsung ke sel Pocong
        const dragDecal = EnvironmentPropFactory.createPocongTrailDecal('blood_drag');
        dragDecal.position.set(cellCenterWx, 0.025, cellCenterWz);
        dragDecal.rotation.y = rotY;
        rootGroup.add(dragDecal);

        // Tambahan cipratan darah segar menempel di lantai
        const spDecal = EnvironmentPropFactory.createPocongTrailDecal('blood_splatter');
        spDecal.position.set(cellCenterWx + dx * 0.35, 0.025, cellCenterWz + dz * 0.35);
        spDecal.rotation.y = Math.random() * Math.PI * 2;
        rootGroup.add(spDecal);
      } else if (cell.dist === 2 || cell.dist === 3) {
        // 2-3 langkah dari Pocong: jejak seretan darah menuntun menuju langkah berikutnya
        const dragDecal = EnvironmentPropFactory.createPocongTrailDecal('blood_drag');
        dragDecal.position.set(cellCenterWx, 0.025, cellCenterWz);
        dragDecal.rotation.y = rotY;
        rootGroup.add(dragDecal);
      } else if (cell.dist === 4) {
        // 4 langkah dari Pocong: cipratan bercak darah peringatan bahwa Pocong sudah dekat
        const spDecal = EnvironmentPropFactory.createPocongTrailDecal('blood_splatter');
        spDecal.position.set(cellCenterWx, 0.025, cellCenterWz);
        spDecal.rotation.y = Math.random() * Math.PI * 2;
        rootGroup.add(spDecal);
      }
    }
  }

  // Dedicated School Props Population across Floor 0 and Floor 1
  private static spawnSchoolLevelProps(
    level: LevelDefinition,
    halfWidth: number,
    halfHeight: number,
    cellSize: number,
    rootGroup: THREE.Group,
    colliders: Array<{ x: number; z: number; radius: number; minY?: number; maxY?: number; label?: string }>
  ): void {
    const fHeight = level.floorHeight || 3.8;

    const addProp = (
      group: THREE.Group,
      gx: number,
      gz: number,
      floor: number,
      rotY: number = 0,
      radius: number = 0,
      label: string = 'school_prop'
    ) => {
      const wx = (gx + 0.5) * cellSize - halfWidth;
      const wy = floor * fHeight;
      const wz = (gz + 0.5) * cellSize - halfHeight;

      group.position.set(wx, wy, wz);
      group.rotation.y = rotY;
      rootGroup.add(group);

      if (radius > 0) {
        colliders.push({
          x: wx,
          z: wz,
          radius,
          minY: wy,
          maxY: wy + 2.8,
          label,
        });
      }
    };

    const addWallProp = (
      group: THREE.Group,
      gx: number,
      gz: number,
      floor: number,
      rotY: number = 0,
      offsetZ: number = 0,
      offsetX: number = 0
    ) => {
      const wx = (gx + 0.5) * cellSize - halfWidth + offsetX;
      const wy = floor * fHeight;
      const wz = (gz + 0.5) * cellSize - halfHeight + offsetZ;
      group.position.set(wx, wy, wz);
      group.rotation.y = rotY;
      rootGroup.add(group);
    };

    // =========================================================================
    // FLOOR 0: GROUND CLASSROOMS & CORRIDORS
    // =========================================================================

    // North Wing Classrooms (Floor 0)
    // Room 1 (gx 1-4, gz 1-5): Player spawn at (3, 3)
    addWallProp(EnvironmentPropFactory.createBlackboard(), 2.5, 0.5, 0, 0, 0.4);
    addProp(EnvironmentPropFactory.createTeacherDesk(), 2.0, 4.2, 0, Math.PI, 0.65, 'teacher_desk');
    addProp(EnvironmentPropFactory.createSchoolDesk(), 1.6, 2.2, 0, 0, 0.45, 'school_desk');
    addProp(EnvironmentPropFactory.createSchoolDesk(), 1.6, 3.4, 0, 0, 0.45, 'school_desk');
    addProp(EnvironmentPropFactory.createTrashBin(), 3.6, 5.2, 0, 0, 0.25, 'trash_bin');

    // Room 2 (gx 6-10, gz 1-5): Door at (8, 6)
    addWallProp(EnvironmentPropFactory.createBlackboard(), 8.0, 0.5, 0, 0, 0.4);
    addProp(EnvironmentPropFactory.createTeacherDesk(), 7.2, 4.4, 0, Math.PI, 0.65, 'teacher_desk');
    addProp(EnvironmentPropFactory.createSchoolDesk(), 6.8, 2.2, 0, 0, 0.45, 'school_desk');
    addProp(EnvironmentPropFactory.createSchoolDesk(), 9.2, 2.2, 0, 0, 0.45, 'school_desk');
    addProp(EnvironmentPropFactory.createSchoolDesk(), 6.8, 3.4, 0, 0, 0.45, 'school_desk');
    addProp(EnvironmentPropFactory.createSchoolDesk(), 9.2, 3.4, 0, 0, 0.45, 'school_desk');
    addProp(EnvironmentPropFactory.createSchoolBookshelf(), 6.2, 2.0, 0, Math.PI / 2, 0.50, 'bookshelf');
    addProp(EnvironmentPropFactory.createTrashBin(), 8.6, 5.2, 0, 0, 0.25, 'trash_bin');

    // Room 3 (gx 12-15, gz 1-5): Door at (13, 6)
    addWallProp(EnvironmentPropFactory.createBlackboard(), 13.5, 0.5, 0, 0, 0.4);
    addProp(EnvironmentPropFactory.createTeacherDesk(), 14.0, 4.4, 0, Math.PI, 0.65, 'teacher_desk');
    addProp(EnvironmentPropFactory.createSchoolDesk(), 12.8, 2.4, 0, 0, 0.45, 'school_desk');
    addProp(EnvironmentPropFactory.createSchoolDesk(), 14.5, 2.4, 0, 0, 0.45, 'school_desk');
    addProp(EnvironmentPropFactory.createMetalStorageCabinet(), 12.2, 3.8, 0, Math.PI / 2, 0.55, 'cabinet');

    // Room 4 (gx 17-19, gz 1-5): Door at (17, 6), Frying pan pickup at (17, 3)
    addWallProp(EnvironmentPropFactory.createBlackboard(), 18.2, 0.5, 0, 0, 0.4);
    addProp(EnvironmentPropFactory.createSchoolDesk(), 18.5, 1.8, 0, 0, 0.45, 'school_desk');
    addProp(EnvironmentPropFactory.createSchoolDesk(), 18.5, 4.5, 0, 0, 0.45, 'school_desk');
    addProp(EnvironmentPropFactory.createSchoolLocker(), 19.2, 3.2, 0, -Math.PI / 2, 0.60, 'lockers');

    // South Wing Classrooms (Floor 0)
    // Room 5 (gx 1-4, gz 15-19): Door at (3, 14)
    addWallProp(EnvironmentPropFactory.createBlackboard(), 2.5, 19.5, 0, Math.PI, -0.4);
    addProp(EnvironmentPropFactory.createTeacherDesk(), 2.2, 15.5, 0, 0, 0.65, 'teacher_desk');
    addProp(EnvironmentPropFactory.createSchoolDesk(), 1.8, 17.5, 0, Math.PI, 0.45, 'school_desk');
    addProp(EnvironmentPropFactory.createSchoolDesk(), 3.5, 17.5, 0, Math.PI, 0.45, 'school_desk');
    addProp(EnvironmentPropFactory.createSchoolBookshelf(), 1.2, 18.5, 0, Math.PI / 2, 0.50, 'bookshelf');
    addProp(EnvironmentPropFactory.createTrashBin(), 3.6, 15.2, 0, 0, 0.25, 'trash_bin');

    // Room 6 (gx 6-10, gz 15-19): Door at (8, 14)
    addWallProp(EnvironmentPropFactory.createBlackboard(), 8.0, 19.5, 0, Math.PI, -0.4);
    addProp(EnvironmentPropFactory.createSchoolDesk(), 6.8, 16.5, 0, Math.PI, 0.45, 'school_desk');
    addProp(EnvironmentPropFactory.createSchoolDesk(), 9.2, 16.5, 0, Math.PI, 0.45, 'school_desk');
    addProp(EnvironmentPropFactory.createSchoolDesk(), 6.8, 18.2, 0, Math.PI, 0.45, 'school_desk');
    addProp(EnvironmentPropFactory.createStackedChairsObstacle(), 8.0, 17.5, 0, 0.4, 0.55, 'stacked_chairs');

    // Room 7 (gx 12-15, gz 15-19): Door at (13, 14)
    addWallProp(EnvironmentPropFactory.createBlackboard(), 13.5, 19.5, 0, Math.PI, -0.4);
    addProp(EnvironmentPropFactory.createMetalStorageCabinet(), 12.2, 16.5, 0, Math.PI / 2, 0.55, 'cabinet');
    addProp(EnvironmentPropFactory.createMetalStorageCabinet(), 12.2, 18.2, 0, Math.PI / 2, 0.55, 'cabinet');
    addProp(EnvironmentPropFactory.createSchoolDesk(), 14.0, 17.2, 0, Math.PI, 0.45, 'school_desk');
    addProp(EnvironmentPropFactory.createCardboardBoxesStack(), 14.5, 15.5, 0, 0.2, 0.45, 'box_stack');

    // Room 8 (gx 17-19, gz 15-19): Exit Door at (18, 18)
    addProp(EnvironmentPropFactory.createSchoolLocker(), 17.2, 16.5, 0, Math.PI / 2, 0.60, 'lockers');
    addProp(EnvironmentPropFactory.createTrashBin(), 17.5, 19.0, 0, 0, 0.25, 'trash_bin');

    // Floor 0 Central Hallway & Atrium (gz 7-13)
    addWallProp(EnvironmentPropFactory.createNoticeBoard(), 5.5, 5.5, 0, 0, 0.4);
    addWallProp(EnvironmentPropFactory.createNoticeBoard(), 15.5, 5.5, 0, 0, 0.4);
    addWallProp(EnvironmentPropFactory.createNoticeBoard(), 5.5, 14.5, 0, Math.PI, -0.4);
    addWallProp(EnvironmentPropFactory.createNoticeBoard(), 15.5, 14.5, 0, Math.PI, -0.4);

    addProp(EnvironmentPropFactory.createSchoolLocker(), 4.0, 6.8, 0, 0, 0.60, 'lockers');
    addProp(EnvironmentPropFactory.createSchoolLocker(), 18.0, 6.8, 0, 0, 0.60, 'lockers');
    addProp(EnvironmentPropFactory.createSchoolLocker(), 4.0, 13.2, 0, Math.PI, 0.60, 'lockers');
    addProp(EnvironmentPropFactory.createSchoolLocker(), 18.0, 13.2, 0, Math.PI, 0.60, 'lockers');

    addProp(EnvironmentPropFactory.createStackedChairsObstacle(), 4.5, 10.0, 0, 0.3, 0.55, 'stacked_chairs');
    addProp(EnvironmentPropFactory.createOverturnedDesk(), 16.5, 10.0, 0, 0.7, 0.55, 'overturned_desk');
    addProp(EnvironmentPropFactory.createFallenBookshelfObstacle(), 10.5, 12.0, 0, -0.2, 0.65, 'fallen_shelf');
    addProp(EnvironmentPropFactory.createCardboardBoxesStack(), 5.0, 8.0, 0, 0.5, 0.45, 'box_stack');

    addProp(EnvironmentPropFactory.createScatteredPapersDebris(), 7.0, 11.0, 0, 0.1, 0);
    addProp(EnvironmentPropFactory.createScatteredPapersDebris(), 13.0, 11.0, 0, -0.4, 0);
    addProp(EnvironmentPropFactory.createScatteredPapersDebris(), 10.0, 8.0, 0, 0.8, 0);

    // =========================================================================
    // FLOOR 1: UPPER MEZZANINE, SCIENCE LAB, LIBRARY ARCHIVE & CLASSROOMS
    // =========================================================================

    // North Wing Classrooms (Floor 1)
    // Room 1 (Floor 1): Computer / Electronics Lab
    addWallProp(EnvironmentPropFactory.createBlackboard(), 2.5, 0.5, 1, 0, 0.4);
    addProp(EnvironmentPropFactory.createLabCounterWithCRT(), 2.0, 2.5, 1, Math.PI / 2, 0.60, 'crt_lab');
    addProp(EnvironmentPropFactory.createLabCounterWithCRT(), 2.0, 4.2, 1, Math.PI / 2, 0.60, 'crt_lab');
    addProp(EnvironmentPropFactory.createCardboardBoxesStack(), 3.5, 2.0, 1, 0.3, 0.45, 'box_stack');

    // Room 2 (Floor 1): Dilapidated classroom
    addWallProp(EnvironmentPropFactory.createBlackboard(), 8.0, 0.5, 1, 0, 0.4);
    addProp(EnvironmentPropFactory.createStackedChairsObstacle(), 8.5, 3.5, 1, 0.5, 0.55, 'stacked_chairs');
    addProp(EnvironmentPropFactory.createOverturnedDesk(), 7.0, 2.5, 1, -0.4, 0.55, 'overturned_desk');
    addProp(EnvironmentPropFactory.createMetalStorageCabinet(), 10.0, 2.0, 1, -Math.PI / 2, 0.55, 'cabinet');
    addProp(EnvironmentPropFactory.createScatteredPapersDebris(), 8.0, 2.5, 1, 0, 0);

    // Room 3 (Floor 1): School Library Archive
    addWallProp(EnvironmentPropFactory.createBlackboard(), 13.5, 0.5, 1, 0, 0.4);
    addProp(EnvironmentPropFactory.createSchoolBookshelf(), 13.5, 2.2, 1, 0, 0.50, 'bookshelf');
    addProp(EnvironmentPropFactory.createSchoolBookshelf(), 13.5, 4.4, 1, 0, 0.50, 'bookshelf');
    addProp(EnvironmentPropFactory.createSchoolDesk(), 14.5, 3.2, 1, -Math.PI / 2, 0.45, 'school_desk');
    addProp(EnvironmentPropFactory.createCardboardBoxesStack(), 12.5, 3.5, 1, 0.4, 0.45, 'box_stack');

    // Room 4 (Floor 1): Records Storage
    addProp(EnvironmentPropFactory.createMetalStorageCabinet(), 18.5, 2.0, 1, Math.PI, 0.55, 'cabinet');
    addProp(EnvironmentPropFactory.createMetalStorageCabinet(), 18.5, 4.4, 1, Math.PI, 0.55, 'cabinet');
    addProp(EnvironmentPropFactory.createCardboardBoxesStack(), 17.5, 4.4, 1, -0.3, 0.45, 'box_stack');

    // South Wing Classrooms (Floor 1)
    // Room 5 (Floor 1): Classroom with fallen bookshelf
    addWallProp(EnvironmentPropFactory.createBlackboard(), 2.5, 19.5, 1, Math.PI, -0.4);
    addProp(EnvironmentPropFactory.createFallenBookshelfObstacle(), 2.5, 17.0, 1, 0.3, 0.65, 'fallen_shelf');
    addProp(EnvironmentPropFactory.createOverturnedDesk(), 3.5, 18.2, 1, 0.8, 0.55, 'overturned_desk');

    // Room 6 (Floor 1): Science Chemistry Lab
    addWallProp(EnvironmentPropFactory.createBlackboard(), 8.0, 19.5, 1, Math.PI, -0.4);
    addProp(EnvironmentPropFactory.createLabCounterWithCRT(), 7.5, 16.5, 1, 0, 0.60, 'crt_lab');
    addProp(EnvironmentPropFactory.createLabCounterWithCRT(), 7.5, 18.5, 1, 0, 0.60, 'crt_lab');
    addProp(EnvironmentPropFactory.createMetalStorageCabinet(), 9.8, 17.2, 1, -Math.PI / 2, 0.55, 'cabinet');

    // Room 7 (Floor 1): Storage & broken furniture
    addWallProp(EnvironmentPropFactory.createBlackboard(), 13.5, 19.5, 1, Math.PI, -0.4);
    addProp(EnvironmentPropFactory.createOverturnedDesk(), 13.5, 16.5, 1, 0.5, 0.55, 'overturned_desk');
    addProp(EnvironmentPropFactory.createStackedChairsObstacle(), 14.5, 18.0, 1, -0.4, 0.55, 'stacked_chairs');

    // Room 8 (Floor 1): Upper archive
    addProp(EnvironmentPropFactory.createSchoolLocker(), 17.2, 16.5, 1, Math.PI / 2, 0.60, 'lockers');
    addProp(EnvironmentPropFactory.createCardboardBoxesStack(), 18.5, 16.0, 1, 0.2, 0.45, 'box_stack');

    // Upper Mezzanine Corridor & Walkways (Floor 1)
    addWallProp(EnvironmentPropFactory.createNoticeBoard(), 5.5, 5.5, 1, 0, 0.4);
    addWallProp(EnvironmentPropFactory.createNoticeBoard(), 15.5, 5.5, 1, 0, 0.4);
    addWallProp(EnvironmentPropFactory.createNoticeBoard(), 5.5, 14.5, 1, Math.PI, -0.4);
    addWallProp(EnvironmentPropFactory.createNoticeBoard(), 15.5, 14.5, 1, Math.PI, -0.4);

    addProp(EnvironmentPropFactory.createSchoolLocker(), 4.0, 6.8, 1, 0, 0.60, 'lockers');
    addProp(EnvironmentPropFactory.createSchoolLocker(), 18.0, 6.8, 1, 0, 0.60, 'lockers');
    addProp(EnvironmentPropFactory.createSchoolLocker(), 4.0, 13.2, 1, Math.PI, 0.60, 'lockers');
    addProp(EnvironmentPropFactory.createSchoolLocker(), 18.0, 13.2, 1, Math.PI, 0.60, 'lockers');

    addProp(EnvironmentPropFactory.createStackedChairsObstacle(), 10.5, 8.0, 1, 0.2, 0.55, 'stacked_chairs');
    addProp(EnvironmentPropFactory.createOverturnedDesk(), 16.5, 9.0, 1, -0.6, 0.55, 'overturned_desk');
    addProp(EnvironmentPropFactory.createCardboardBoxesStack(), 5.5, 12.0, 1, 0.5, 0.45, 'box_stack');

    addProp(EnvironmentPropFactory.createScatteredPapersDebris(), 10.0, 10.0, 1, 0.4, 0);
    addProp(EnvironmentPropFactory.createScatteredPapersDebris(), 14.0, 8.0, 1, -0.3, 0);
  }

  // =========================================================================
  // ATMOSPHERIC CORRIDOR LIGHTS
  // =========================================================================
  private static spawnCorridorLights(
    level: LevelDefinition,
    halfWidth: number,
    halfHeight: number,
    cellSize: number,
    wallHeight: number,
    rootGroup: THREE.Group
  ): void {
    const lightCoords =
      (level.theme === 'labyrinth' || level.id === 3)
        ? [
            { x: 3, z: 3 },
            { x: 9, z: 3 },
            { x: 17, z: 3 },
            { x: 3, z: 9 },
            { x: 11, z: 7 },
            { x: 17, z: 9 },
            { x: 17, z: 13 },
            { x: 3, z: 15 },
            { x: 11, z: 15 },
            { x: 17, z: 17 },
            { x: 7, z: 15 },
            { x: 13, z: 19 },
          ]
        : level.gridWidth <= 15
        ? [
            { x: 1, z: 5 },
            { x: 5, z: 5 },
            { x: 7, z: 7 },
            { x: 7, z: 11 },
            { x: 9, z: 13 },
            { x: 13, z: 11 },
          ]
        : [
            { x: 5, z: 5 },
            { x: 15, z: 5 },
            { x: 5, z: 15 },
            { x: 15, z: 15 },
            { x: 10, z: 10 },
            { x: 10, z: 4 },
            { x: 10, z: 16 },
            { x: 4, z: 10 },
            { x: 16, z: 10 },
          ];

    let lightHex = 0xffecd1;
    if (level.theme === 'school') lightHex = 0xffe4b5;
    if (level.theme === 'hospital') lightHex = 0xd6f0e6;
    if (level.theme === 'sewer') lightHex = 0xdaf0d8;
    if (level.theme === 'factory') lightHex = 0xfff0c4;
    if (level.theme === 'hotel') lightHex = 0xffecd1;
    if (level.theme === 'subway') lightHex = 0xdeecf5;
    if (level.theme === 'research_facility') lightHex = 0xd8eeff;
    if (level.theme === 'nightmare') lightHex = 0xffd1d6;

    lightCoords.forEach((c) => {
      const wx = (c.x + 0.5) * cellSize - halfWidth;
      const wz = (c.z + 0.5) * cellSize - halfHeight;

      if (level.theme === 'labyrinth' || level.id === 3) {
        // Pure ceiling light without physical prop to preserve 100% clean classic labyrinth corridors
        // Floor 0: Cold industrial greenish-white (0xd6e5d8) | Floor 1: Emergency warm amber-gold (0xffb347)
        const fCount = level.floorCount || 1;
        const fHeight = level.floorHeight || 3.8;
        for (let f = 0; f < fCount; f++) {
          const hex = (f === 1 && level.id === 3) ? 0xffb347 : lightHex;
          const pureLight = new THREE.PointLight(hex, f === 1 ? 2.4 : 2.0, 12, 1.2);
          pureLight.position.set(wx, f * fHeight + wallHeight * 0.85, wz);
          rootGroup.add(pureLight);
        }
      } else {
        const lightGroup = EnvironmentPropFactory.createHangingCageLight(lightHex);
        lightGroup.position.set(wx, 0, wz);
        rootGroup.add(lightGroup);

        if (level.floorCount && level.floorCount > 1) {
          for (let f = 1; f < level.floorCount; f++) {
            const upperLight = EnvironmentPropFactory.createHangingCageLight(lightHex);
            upperLight.position.set(wx, f * (level.floorHeight || 3.8), wz);
            rootGroup.add(upperLight);
          }
        }
      }
    });
  }

  // =========================================================================
  // OVERVIEW CAMERA MARKERS
  // =========================================================================
  private static createOverviewMarkers(
    pSpawnWx: number,
    monsterSpawns: Array<{ x: number; y: number; z: number }>,
    exitWx: number,
    exitWz: number,
    wallHeight: number,
    pSpawnWz: number
  ) {
    const markerY = wallHeight + 2.4;

    // Player Marker (Cyan Arrow)
    const playerMarker = new THREE.Group();
    playerMarker.name = 'PlayerOverviewMarker';
    playerMarker.position.set(pSpawnWx, markerY, pSpawnWz);

    const arrowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const arrowShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 1.6, 8), arrowMat);
    arrowShaft.position.set(0, 0.8, 0);
    playerMarker.add(arrowShaft);

    const arrowHead = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.1, 8), arrowMat);
    arrowHead.rotateX(Math.PI);
    playerMarker.add(arrowHead);

    const dirCone = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.0, 8), new THREE.MeshBasicMaterial({ color: 0x7dd3fc }));
    dirCone.position.set(0, 0.8, 1.1);
    dirCone.rotateX(Math.PI / 2);
    playerMarker.add(dirCone);

    // Monster Markers (Red Warning Toruses) - Hidden from overview map per user specification
    const monsterMarkers: THREE.Group[] = [];
    monsterSpawns.forEach((m, idx) => {
      const monsterMarker = new THREE.Group();
      monsterMarker.name = `PocongOverviewMarker_${idx + 1}`;
      monsterMarker.position.set(m.x, markerY, m.z);
      monsterMarker.visible = false; // Hidden from map

      const monsterRingGeo = new THREE.TorusGeometry(1.2, 0.12, 6, 16);
      monsterRingGeo.rotateX(Math.PI / 2);
      const monsterRing = new THREE.Mesh(monsterRingGeo, new THREE.MeshBasicMaterial({ color: 0xef4444, wireframe: true }));
      monsterMarker.add(monsterRing);

      const centerDot = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
      monsterMarker.add(centerDot);

      monsterMarkers.push(monsterMarker);
    });

    // Exit Marker (Green Diamond) - Hidden from map per user specification
    const exitMarker = new THREE.Group();
    exitMarker.name = 'ExitOverviewMarker';
    exitMarker.position.set(exitWx, markerY, exitWz);
    exitMarker.visible = false;

    const exitBeacon = new THREE.Mesh(new THREE.OctahedronGeometry(1.1, 0), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
    exitMarker.add(exitBeacon);

    return {
      playerMarker,
      monsterMarker: monsterMarkers[0],
      monsterMarkers,
      exitMarker,
    };
  }

  // =========================================================================
  // TOP-DOWN 2D PAPER SKETCH COLLIDER MAP (Dull Off-White Paper, Hand-Drawn Black Ink Walls, Red Hantu & Blue Player)
  // =========================================================================
  private static createSketchMarkerTexture(label: 'Player' | 'Hantu', circleColor: string): THREE.CanvasTexture {
    if (typeof document === 'undefined') {
      return new THREE.Texture() as THREE.CanvasTexture;
    }
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return new THREE.CanvasTexture(canvas);
    }

    ctx.clearRect(0, 0, 512, 512);

    // 1. Hand-drawn colored circle with sketchy black ink border
    const centerX = 256;
    const centerY = 176;
    const radius = 96;

    // Fill circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = circleColor;
    ctx.fill();

    // Sketchy double ink border (hand-drawn pen stroke)
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#111827';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX + 2, centerY - 2, radius + 2, 0, Math.PI * 2);
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#1f2937';
    ctx.stroke();

    // Direction arrow on Player circle
    if (label === 'Player') {
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - 56);
      ctx.lineTo(centerX + 36, centerY + 16);
      ctx.lineTo(centerX - 36, centerY + 16);
      ctx.closePath();
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#111827';
      ctx.stroke();
    } else {
      // Spooky eye slits on Hantu circle
      ctx.fillStyle = '#111827';
      ctx.beginPath();
      ctx.arc(centerX - 28, centerY - 12, 12, 0, Math.PI * 2);
      ctx.arc(centerX + 28, centerY - 12, 12, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Bold black text label below circle
    ctx.font = '900 88px "Courier New", monospace, sans-serif';
    ctx.fillStyle = '#111827';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(label, centerX, 308);

    // Subtle underline on text like a notebook note
    ctx.beginPath();
    const metrics = ctx.measureText ? ctx.measureText(label) : null;
    const textWidth = metrics && typeof metrics.width === 'number' ? metrics.width : 160;
    ctx.moveTo(centerX - textWidth / 2 - 12, 420);
    ctx.lineTo(centerX + textWidth / 2 + 12, 420);
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#111827';
    ctx.stroke();

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;
    return texture;
  }

  public static createOverviewColliderMap(
    level: LevelDefinition,
    grid: number[][],
    treeColliders: Array<{ x: number; z: number; radius: number }> = [],
    playerSpawnX: number,
    playerSpawnZ: number,
    playerRotationY: number,
    monsterSpawns: Array<{ x: number; y: number; z: number }> = []
  ): THREE.Group {
    const mapGroup = new THREE.Group();
    mapGroup.name = 'OverviewColliderMap';

    const { cellSize, gridWidth, gridHeight } = level;
    const halfWidth = (gridWidth * cellSize) / 2;
    const halfHeight = (gridHeight * cellSize) / 2;
    const mapY = 0.2; // Flat on paper ground plane

    // 1. Dull Off-White Paper Base Sheet (Putih Kusam)
    const paperWidth = gridWidth * cellSize + 16;
    const paperHeight = gridHeight * cellSize + 16;
    const planeGeo = new THREE.PlaneGeometry(paperWidth, paperHeight);
    planeGeo.rotateX(-Math.PI / 2);
    const planeMat = new THREE.MeshBasicMaterial({ color: 0xeee9df }); // Dull aged paper
    const basePlane = new THREE.Mesh(planeGeo, planeMat);
    basePlane.name = 'OverviewPaperBase';
    basePlane.position.set(0, mapY - 0.05, 0);
    mapGroup.add(basePlane);

    // Subtle hand-drawn sketch paper outer margin border
    const margin = 1.0;
    const paperMarginVertices = [
      -halfWidth - margin, mapY - 0.04, -halfHeight - margin,
       halfWidth + margin, mapY - 0.04, -halfHeight - margin,
       halfWidth + margin, mapY - 0.04, -halfHeight - margin,
       halfWidth + margin, mapY - 0.04,  halfHeight + margin,
       halfWidth + margin, mapY - 0.04,  halfHeight + margin,
      -halfWidth - margin, mapY - 0.04,  halfHeight + margin,
      -halfWidth - margin, mapY - 0.04,  halfHeight + margin,
      -halfWidth - margin, mapY - 0.04, -halfHeight - margin,
    ];
    const marginGeo = new THREE.BufferGeometry();
    marginGeo.setAttribute('position', new THREE.Float32BufferAttribute(paperMarginVertices, 3));
    const marginMat = new THREE.LineBasicMaterial({ color: 0xb5afa2 }); // Pencil margin line
    mapGroup.add(new THREE.LineSegments(marginGeo, marginMat));

    // 2. Wall Interior Pencil Shading Wash (Light warm tint so walls are distinguishable from paper corridors)
    const wallCells: Array<{ cx: number; cz: number }> = [];
    for (let gz = 0; gz < gridHeight; gz++) {
      for (let gx = 0; gx < gridWidth; gx++) {
        if (grid[gz] && grid[gz][gx] === 1) {
          wallCells.push({
            cx: (gx + 0.5) * cellSize - halfWidth,
            cz: (gz + 0.5) * cellSize - halfHeight,
          });
        }
      }
    }

    if (wallCells.length > 0) {
      const fillGeo = new THREE.PlaneGeometry(cellSize, cellSize);
      fillGeo.rotateX(-Math.PI / 2);
      const fillMat = new THREE.MeshBasicMaterial({ color: 0xdcd6c8 }); // Pencil shaded wash
      const instancedFill = new THREE.InstancedMesh(fillGeo, fillMat, wallCells.length);
      const dummy = new THREE.Object3D();
      for (let i = 0; i < wallCells.length; i++) {
        dummy.position.set(wallCells[i].cx, mapY - 0.03, wallCells[i].cz);
        dummy.updateMatrix();
        instancedFill.setMatrixAt(i, dummy.matrix);
      }
      instancedFill.instanceMatrix.needsUpdate = true;
      mapGroup.add(instancedFill);
    }

    // 3. Hand-Drawn Black Ink Wall Lines ("tembok dengan garis hitam")
    const lineVertices: number[] = [];

    // Helper to add hand-drawn sketch line with natural corner overshoots
    const addSketchLine = (x0: number, z0: number, x1: number, z1: number) => {
      const dx = x1 - x0;
      const dz = z1 - z0;
      const len = Math.hypot(dx, dz);
      if (len < 0.001) return;
      const nx = dx / len;
      const nz = dz / len;
      const overshoot = 0.15; // Natural human architectural pen overshoot at corners

      // Primary stroke with corner overshoot
      lineVertices.push(
        x0 - nx * overshoot, mapY, z0 - nz * overshoot,
        x1 + nx * overshoot, mapY, z1 + nz * overshoot
      );
    };

    // Perimeter boundary of the level map
    addSketchLine(-halfWidth, -halfHeight,  halfWidth, -halfHeight);
    addSketchLine( halfWidth, -halfHeight,  halfWidth,  halfHeight);
    addSketchLine( halfWidth,  halfHeight, -halfWidth,  halfHeight);
    addSketchLine(-halfWidth,  halfHeight, -halfWidth, -halfHeight);

    // Grid wall contours (borders between wall and walkable space)
    for (let gz = 0; gz < gridHeight; gz++) {
      for (let gx = 0; gx < gridWidth; gx++) {
        if (grid[gz] && grid[gz][gx] === 1) {
          const x0 = gx * cellSize - halfWidth;
          const x1 = (gx + 1) * cellSize - halfWidth;
          const z0 = gz * cellSize - halfHeight;
          const z1 = (gz + 1) * cellSize - halfHeight;

          // North edge
          if (gz === 0 || (grid[gz - 1] && grid[gz - 1][gx] === 0)) {
            addSketchLine(x0, z0, x1, z0);
          }
          // South edge
          if (gz === gridHeight - 1 || (grid[gz + 1] && grid[gz + 1][gx] === 0)) {
            addSketchLine(x0, z1, x1, z1);
          }
          // West edge
          if (gx === 0 || (grid[gz] && grid[gz][gx - 1] === 0)) {
            addSketchLine(x0, z0, x0, z1);
          }
          // East edge
          if (gx === gridWidth - 1 || (grid[gz] && grid[gz][gx + 1] === 0)) {
            addSketchLine(x1, z0, x1, z1);
          }
        }
      }
    }

    // Circular obstacle/tree colliders (Level 1 Plantation) - Hand-drawn tree doodles
    if (treeColliders && treeColliders.length > 0) {
      const ringSegments = 16;
      for (const tree of treeColliders) {
        const r = Math.max(0.45, tree.radius);
        // Sketchy circular boundary loop
        for (let s = 0; s < ringSegments; s++) {
          const a1 = (s / ringSegments) * Math.PI * 2;
          const a2 = ((s + 1) / ringSegments) * Math.PI * 2;
          lineVertices.push(
            tree.x + Math.cos(a1) * r, mapY, tree.z + Math.sin(a1) * r,
            tree.x + Math.cos(a2) * r, mapY, tree.z + Math.sin(a2) * r
          );
        }
        // Small central trunk cross/dot
        lineVertices.push(
          tree.x - 0.12, mapY, tree.z,
          tree.x + 0.12, mapY, tree.z,
          tree.x, mapY, tree.z - 0.12,
          tree.x, mapY, tree.z + 0.12
        );
      }
    }

    const linesGeo = new THREE.BufferGeometry();
    linesGeo.setAttribute('position', new THREE.Float32BufferAttribute(lineVertices, 3));
    const linesMat = new THREE.LineBasicMaterial({
      color: 0x111111, // Hand-drawn deep black ink
      linewidth: 2,
    });
    const linesMesh = new THREE.LineSegments(linesGeo, linesMat);
    linesMesh.name = 'OverviewColliderLines';
    mapGroup.add(linesMesh);

    // 4. PLAYER MARKER: Blue Circle with Black Text "Player"
    const markerSize = Math.max(6.5, cellSize * 1.65);
    const playerTex = LabyrinthBuilder.createSketchMarkerTexture('Player', '#2563eb');
    const playerPlaneGeo = new THREE.PlaneGeometry(markerSize, markerSize);
    playerPlaneGeo.rotateX(-Math.PI / 2);
    const playerMat = new THREE.MeshBasicMaterial({
      map: playerTex,
      transparent: true,
    });
    const playerMesh = new THREE.Mesh(playerPlaneGeo, playerMat);
    playerMesh.name = 'OverviewPlayerMarker';
    playerMesh.position.set(playerSpawnX, mapY + 0.05, playerSpawnZ);
    mapGroup.add(playerMesh);

    // 5. MONSTER / HANTU MARKER: Red Circle with Black Text "Hantu"
    const hantuTex = LabyrinthBuilder.createSketchMarkerTexture('Hantu', '#dc2626');
    const hantuPlaneGeo = new THREE.PlaneGeometry(markerSize, markerSize);
    hantuPlaneGeo.rotateX(-Math.PI / 2);
    const hantuMat = new THREE.MeshBasicMaterial({
      map: hantuTex,
      transparent: true,
    });

    if (monsterSpawns && monsterSpawns.length > 0) {
      monsterSpawns.forEach((m, idx) => {
        const hantuMesh = new THREE.Mesh(hantuPlaneGeo, hantuMat);
        hantuMesh.name = `OverviewHantuMarker_${idx + 1}`;
        hantuMesh.position.set(m.x, mapY + 0.05, m.z);
        mapGroup.add(hantuMesh);
      });
    }

    return mapGroup;
  }

  // =========================================================================
  // WEAPON PICKUPS SPAWNER
  // =========================================================================
  private static spawnWorldPickups(
    level: LevelDefinition,
    halfWidth: number,
    halfHeight: number,
    cellSize: number,
    rootGroup: THREE.Group
  ): WorldWeaponPickup[] {
    const weaponPickups: WorldWeaponPickup[] = [];
    const saveManager = SaveManager.getInstance();

    if (level.weaponPickups && level.weaponPickups.length > 0) {
      level.weaponPickups.forEach((loc) => {
        // ONE PERMANENT WEAPON UNLOCK = ALL WORLD PICKUPS WITH THE SAME WEAPON ID ARE HIDDEN
        // If this weapon has already been permanently unlocked by the player, do not spawn its world pickup
        if (saveManager.isWeaponUnlocked(loc.weaponId)) {
          return;
        }

        const wx = (loc.x + 0.5) * cellSize - halfWidth;
        const wz = (loc.z + 0.5) * cellSize - halfHeight;
        const pickupGroup = WeaponModelFactory.createWorldPickup(loc.weaponId);
        pickupGroup.position.set(wx, 0, wz);
        rootGroup.add(pickupGroup);

        weaponPickups.push({
          weaponId: loc.weaponId,
          group: pickupGroup,
          position: new THREE.Vector3(wx, 0, wz),
          collected: false,
        });
      });
    }
    return weaponPickups;
  }
}
