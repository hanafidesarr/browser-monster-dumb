import * as THREE from 'three';
import { LevelDefinition } from './LevelData.ts';
import { TextureGenerator } from './TextureGenerator.ts';
import { BananaTreeFactory } from './BananaTreeFactory.ts';
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

    // For Levels 2 to 10: Build distinct themed 3D environments
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

    // Haunted Banana Garden (Level 1) Atmospheric Night Lighting:
    // Neutral pale moonlight and dark night tones without any artificial blue tint
    const skyLight = new THREE.DirectionalLight(0xd4d8dc, 0.75);
    skyLight.position.set(halfWidth * 0.8, 55, -halfHeight * 0.85);
    skyLight.target.position.set(0, 0, 0);
    rootGroup.add(skyLight);
    rootGroup.add(skyLight.target);

    // Subtle dark neutral ambient fill so shadows are deep but navigation is never pitch black
    const ambientLight = new THREE.AmbientLight(0x222426, 0.65);
    rootGroup.add(ambientLight);

    // Soft neutral sky vs dark earth bounce
    const hemiLight = new THREE.HemisphereLight(0x35383b, 0x181a18, 0.45);
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

    return {
      rootGroup,
      wallsMesh,
      exitDoorMesh: exitDoorGroup,
      exitTriggerBox,
      playerMarker: markers.playerMarker,
      monsterMarker: markers.monsterMarkers[0],
      monsterMarkers: markers.monsterMarkers,
      exitMarker: markers.exitMarker,
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

    const { gridWidth, gridHeight, cellSize, wallHeight, grid } = level;
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
        ambientHex = 0x3a4047;
        lightHex = 0xd5dde5;
        break;
      case 'hospital':
        wallTexture = TextureGenerator.createHospitalWallTexture();
        floorTexture = TextureGenerator.createHospitalFloorTexture();
        ambientHex = 0x3d4e48;
        lightHex = 0xcde8dc;
        break;
      case 'sewer':
        wallTexture = TextureGenerator.createSewerWallTexture();
        floorTexture = TextureGenerator.createSewerWaterTexture();
        ambientHex = 0x2b3d2c;
        lightHex = 0x88b880;
        lightIntensity = 1.6;
        break;
      case 'factory':
        wallTexture = TextureGenerator.createFactoryWallTexture();
        floorTexture = TextureGenerator.createFactoryFloorTexture();
        ambientHex = 0x473c33;
        lightHex = 0xf0d5b5;
        break;
      case 'hotel':
        wallTexture = TextureGenerator.createHotelWallTexture();
        floorTexture = TextureGenerator.createHotelCarpetTexture();
        ambientHex = 0x4d2a2e;
        lightHex = 0xf5dfbe;
        break;
      case 'subway':
        wallTexture = TextureGenerator.createSubwayWallTexture();
        floorTexture = TextureGenerator.createSubwayPlatformTexture();
        ambientHex = 0x38444d;
        lightHex = 0xd6e4ed;
        break;
      case 'research_facility':
        wallTexture = TextureGenerator.createLabWallTexture();
        floorTexture = TextureGenerator.createLabFloorTexture();
        ambientHex = 0x334454;
        lightHex = 0xcee6fa;
        break;
      case 'nightmare':
      default:
        wallTexture = TextureGenerator.createNightmareWallTexture();
        floorTexture = TextureGenerator.createNightmareFloorTexture();
        ambientHex = 0x3d1420;
        lightHex = 0xff6b7a;
        lightIntensity = 1.8;
        break;
    }

    // 1. Atmospheric Ambient & Directional Lighting
    const ambientLight = new THREE.AmbientLight(ambientHex, 2.2);
    rootGroup.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(lightHex, lightIntensity);
    dirLight.position.set(halfWidth * 0.7, 35, -halfHeight * 0.7);
    rootGroup.add(dirLight);

    // 2. Themed Floor & Multi-Floor Platforms with Stairwell Openings
    const floorCount = level.floorCount || 1;
    const floorHeight = level.floorHeight || 3.8;
    const totalLevelHeight = floorCount * floorHeight;

    // Identify all stairwell openings on upper floors so they are physically and visibly open
    const stairOpenings: StairwellOpening[] = [];
    if (level.ramps && level.ramps.length > 0) {
      level.ramps.forEach((r) => {
        let minGx: number;
        let maxGx: number;
        let minGz: number;
        let maxGz: number;

        if (level.theme === 'school' && r.isStair) {
          // School stair rises along cells 7 and 8 at z = 9, meeting cell 9 floor slab flush
          minGx = Math.min(r.startCell.x, r.endCell.x - 1);
          maxGx = Math.max(r.startCell.x, r.endCell.x - 1);
          minGz = Math.min(r.startCell.z, r.endCell.z);
          maxGz = Math.max(r.startCell.z, r.endCell.z);
        } else {
          const dx = r.endCell.x - r.startCell.x;
          const dz = r.endCell.z - r.startCell.z;
          const stepX = Math.sign(dx);
          const stepZ = Math.sign(dz);

          // Open incline on toFloor covers incline cells up to the landing threshold
          const openEndGx = stepX !== 0 ? r.endCell.x - stepX : r.endCell.x;
          const openEndGz = stepZ !== 0 ? r.endCell.z - stepZ : r.endCell.z;

          minGx = Math.min(r.startCell.x, openEndGx);
          maxGx = Math.max(r.startCell.x, openEndGx);
          minGz = Math.min(r.startCell.z, openEndGz);
          maxGz = Math.max(r.startCell.z, openEndGz);
        }

        const minWx = minGx * cellSize - halfWidth;
        const maxWx = (maxGx + 1) * cellSize - halfWidth;
        const minWz = minGz * cellSize - halfHeight;
        const maxWz = (maxGz + 1) * cellSize - halfHeight;

        stairOpenings.push({
          floor: r.toFloor,
          minGx,
          maxGx,
          minGz,
          maxGz,
          box: new THREE.Box3(
            new THREE.Vector3(minWx, r.toFloor * floorHeight - 0.5, minWz),
            new THREE.Vector3(maxWx, r.toFloor * floorHeight + 2.5, maxWz)
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

    if (level.theme === 'school') {
      floorTexture.repeat.set(gridWidth * 0.35, gridHeight * 0.35);
    } else {
      floorTexture.repeat.set(gridWidth * 0.8, gridHeight * 0.8);
    }
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
              const u0 = (gx / gridWidth) * (gridWidth * 0.35);
              const u1 = ((gx + 1) / gridWidth) * (gridWidth * 0.35);
              const v0 = (gz / gridHeight) * (gridHeight * 0.35);
              const v1 = ((gz + 1) / gridHeight) * (gridHeight * 0.35);
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

        // Structural Support Columns in School Hallway & Atrium
        const pillarCoords = [
          { gx: 6, gz: 7 },
          { gx: 11, gz: 7 },
          { gx: 16, gz: 7 },
          { gx: 6, gz: 13 },
          { gx: 11, gz: 13 },
          { gx: 16, gz: 13 },
          { gx: 6, gz: 9 },
          { gx: 10, gz: 9 },
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

              // Seamless UVs across the floor
              const uvs = quad.attributes.uv;
              const u0 = (gx / gridWidth) * (gridWidth * 0.8);
              const u1 = ((gx + 1) / gridWidth) * (gridWidth * 0.8);
              const v0 = (gz / gridHeight) * (gridHeight * 0.8);
              const v1 = ((gz + 1) / gridHeight) * (gridHeight * 0.8);

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
    exitDoorGroup.position.set(exitWx, exitWy, exitWz);

    const doorTex = TextureGenerator.createExitDoorTexture(level.exitLockedInitially || false);
    const doorMat = new THREE.MeshBasicMaterial({ map: doorTex });
    const doorGeo = new THREE.BoxGeometry(cellSize * 0.9, wallHeight * 0.75, 0.2);
    const doorMesh = new THREE.Mesh(doorGeo, doorMat);
    doorMesh.position.y = (wallHeight * 0.75) / 2;
    exitDoorGroup.add(doorMesh);

    const exitPointLight = new THREE.PointLight(
      level.exitLockedInitially ? 0xf59e0b : 0x22c55e,
      2.2,
      12,
      1.2
    );
    exitPointLight.position.set(0, (wallHeight * 0.75) / 2 + 0.8, 0.4);
    exitDoorGroup.add(exitPointLight);
    rootGroup.add(exitDoorGroup);

    const exitTriggerBox = new THREE.Box3(
      new THREE.Vector3(exitWx - cellSize * 0.8, exitWy, exitWz - cellSize * 0.8),
      new THREE.Vector3(exitWx + cellSize * 0.8, exitWy + wallHeight, exitWz + cellSize * 0.8)
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
        const isSchoolStair = level.theme === 'school' && ramp.isStair;
        let startWx: number;
        let startWz: number;
        let endWx: number;
        let endWz: number;

        if (isSchoolStair) {
          // School stair starts cleanly at west edge of cell 7 and connects flush to cell 9 slab edge
          startWx = ramp.startCell.x * cellSize - halfWidth;
          startWz = (ramp.startCell.z + 0.5) * cellSize - halfHeight;
          endWx = ramp.endCell.x * cellSize - halfWidth;
          endWz = (ramp.endCell.z + 0.5) * cellSize - halfHeight;
        } else {
          startWx = (ramp.startCell.x + 0.5) * cellSize - halfWidth;
          startWz = (ramp.startCell.z + 0.5) * cellSize - halfHeight;
          endWx = (ramp.endCell.x + 0.5) * cellSize - halfWidth;
          endWz = (ramp.endCell.z + 0.5) * cellSize - halfHeight;
        }

        const startY = ramp.fromFloor * floorHeight;
        const endY = ramp.toFloor * floorHeight;

        const dx = endWx - startWx;
        const dz = endWz - startWz;
        const length = Math.hypot(dx, dz);
        const height = endY - startY;
        const angle = Math.atan2(dx, dz);

        const dirX = length > 0.001 ? dx / length : 1;
        const dirZ = length > 0.001 ? dz / length : 0;
        const normX = -dirZ;
        const normZ = dirX;

        const rampWidth = cellSize * 0.75;
        const stairMesh = isSchoolStair
          ? EnvironmentPropFactory.createSchoolStaircase(rampWidth, height, length)
          : EnvironmentPropFactory.createStaircase(rampWidth, height, length);
        const midX = (startWx + endWx) / 2;
        const midZ = (startWz + endWz) / 2;

        stairMesh.position.set(midX, startY, midZ);
        stairMesh.rotation.y = angle;
        rootGroup.add(stairMesh);

        // Safety Balustrades around the 3 closed sides of the upper-floor stairwell opening
        const openMinX = isSchoolStair ? startWx : Math.min(startWx, endWx) - rampWidth / 2;
        const openMaxX = isSchoolStair ? endWx : Math.max(startWx, endWx) + rampWidth / 2;
        const openMinZ = Math.min(startWz, endWz) - rampWidth / 2;
        const openMaxZ = Math.max(startWz, endWz) + rampWidth / 2;
        const upperY = ramp.toFloor * floorHeight;
        const railingThick = 0.25;

        if (Math.abs(dx) >= Math.abs(dz)) {
          // Stairs run horizontally along X: balustrades on North & South sides, plus back end
          const sideLength = openMaxX - openMinX;
          const bNorth = isSchoolStair
            ? EnvironmentPropFactory.createSchoolStairwellRailing(sideLength)
            : EnvironmentPropFactory.createStairwellBalustrade(sideLength);
          bNorth.position.set(midX, upperY, openMinZ);
          bNorth.rotation.y = Math.PI / 2;
          rootGroup.add(bNorth);
          railingBoxes.push({
            minX: openMinX,
            maxX: openMaxX,
            minZ: openMinZ - railingThick,
            maxZ: openMinZ + railingThick,
            minY: upperY,
            maxY: upperY + 1.2,
            label: 'balustrade_north',
          });

          const bSouth = isSchoolStair
            ? EnvironmentPropFactory.createSchoolStairwellRailing(sideLength)
            : EnvironmentPropFactory.createStairwellBalustrade(sideLength);
          bSouth.position.set(midX, upperY, openMaxZ);
          bSouth.rotation.y = Math.PI / 2;
          rootGroup.add(bSouth);
          railingBoxes.push({
            minX: openMinX,
            maxX: openMaxX,
            minZ: openMaxZ - railingThick,
            maxZ: openMaxZ + railingThick,
            minY: upperY,
            maxY: upperY + 1.2,
            label: 'balustrade_south',
          });

          // Back railing above the foot of the stairs
          const backX = dx > 0 ? openMinX : openMaxX;
          const bBack = isSchoolStair
            ? EnvironmentPropFactory.createSchoolStairwellRailing(rampWidth)
            : EnvironmentPropFactory.createStairwellBalustrade(rampWidth);
          bBack.position.set(backX, upperY, midZ);
          rootGroup.add(bBack);
          railingBoxes.push({
            minX: backX - railingThick,
            maxX: backX + railingThick,
            minZ: openMinZ,
            maxZ: openMaxZ,
            minY: upperY,
            maxY: upperY + 1.2,
            label: 'balustrade_back',
          });
        } else {
          // Stairs run vertically along Z: balustrades on West & East sides, plus back end
          const sideLength = openMaxZ - openMinZ;
          const bWest = EnvironmentPropFactory.createStairwellBalustrade(sideLength);
          bWest.position.set(openMinX, upperY, midZ);
          rootGroup.add(bWest);
          railingBoxes.push({
            minX: openMinX - railingThick,
            maxX: openMinX + railingThick,
            minZ: openMinZ,
            maxZ: openMaxZ,
            minY: upperY,
            maxY: upperY + 1.2,
            label: 'balustrade_west',
          });

          const bEast = EnvironmentPropFactory.createStairwellBalustrade(sideLength);
          bEast.position.set(openMaxX, upperY, midZ);
          rootGroup.add(bEast);
          railingBoxes.push({
            minX: openMaxX - railingThick,
            maxX: openMaxX + railingThick,
            minZ: openMinZ,
            maxZ: openMaxZ,
            minY: upperY,
            maxY: upperY + 1.2,
            label: 'balustrade_east',
          });

          // Back railing above the foot of the stairs
          const backZ = dz > 0 ? openMinZ : openMaxZ;
          const bBack = EnvironmentPropFactory.createStairwellBalustrade(rampWidth);
          bBack.position.set(midX, upperY, backZ);
          bBack.rotation.y = Math.PI / 2;
          rootGroup.add(bBack);
          railingBoxes.push({
            minX: openMinX,
            maxX: openMaxX,
            minZ: backZ - railingThick,
            maxZ: backZ + railingThick,
            minY: upperY,
            maxY: upperY + 1.2,
            label: 'balustrade_back',
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

    return {
      rootGroup,
      wallsMesh,
      exitDoorMesh: exitDoorGroup,
      exitTriggerBox,
      playerMarker: markers.playerMarker,
      monsterMarker: markers.monsterMarkers[0],
      monsterMarkers: markers.monsterMarkers,
      exitMarker: markers.exitMarker,
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
    if (level.theme === 'school') {
      this.spawnSchoolLevelProps(level, halfWidth, halfHeight, cellSize, rootGroup, colliders);
      return;
    }

    const { grid, gridWidth, gridHeight, theme } = level;

    // Scan for open corridor cells suitable for props (avoid spawns & exit)
    const isSpawnOrExit = (gx: number, gz: number) => {
      if (Math.abs(gx - level.playerSpawn.x) <= 1 && Math.abs(gz - level.playerSpawn.z) <= 1) return true;
      if (Math.abs(gx - level.monsterSpawn.x) <= 1 && Math.abs(gz - level.monsterSpawn.z) <= 1) return true;
      if (Math.abs(gx - level.exitDoor.x) <= 1 && Math.abs(gz - level.exitDoor.z) <= 1) return true;
      if (selectedSpawns) {
        const pCellX = Math.floor((selectedSpawns.player.x + halfWidth) / cellSize);
        const pCellZ = Math.floor((selectedSpawns.player.z + halfHeight) / cellSize);
        if (Math.abs(gx - pCellX) <= 1 && Math.abs(gz - pCellZ) <= 1) return true;
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
        if (grid[gz][gx] === 0 && !isSpawnOrExit(gx, gz) && !isRampOrBridge(gx, gz)) {
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
    const lightCoords = [
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

    let lightHex = 0xffe4b5;
    if (level.theme === 'hospital') lightHex = 0xa7f3d0;
    if (level.theme === 'sewer') lightHex = 0x86efac;
    if (level.theme === 'factory') lightHex = 0xfde047;
    if (level.theme === 'subway') lightHex = 0xbfdbfe;
    if (level.theme === 'research_facility') lightHex = 0x7dd3fc;
    if (level.theme === 'nightmare') lightHex = 0xf87171;

    lightCoords.forEach((c) => {
      const wx = (c.x + 0.5) * cellSize - halfWidth;
      const wz = (c.z + 0.5) * cellSize - halfHeight;

      const lightGroup = EnvironmentPropFactory.createHangingCageLight(lightHex);
      lightGroup.position.set(wx, 0, wz);
      rootGroup.add(lightGroup);

      if (level.theme === 'school' && level.floorCount && level.floorCount > 1) {
        // Floor 1 corridor lighting for balanced multi-floor atmosphere
        const upperLight = EnvironmentPropFactory.createHangingCageLight(lightHex);
        upperLight.position.set(wx, level.floorHeight || 3.8, wz);
        rootGroup.add(upperLight);
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

    // Monster Markers (Red Warning Toruses)
    const monsterMarkers: THREE.Group[] = [];
    monsterSpawns.forEach((m, idx) => {
      const monsterMarker = new THREE.Group();
      monsterMarker.name = `PocongOverviewMarker_${idx + 1}`;
      monsterMarker.position.set(m.x, markerY, m.z);

      const monsterRingGeo = new THREE.TorusGeometry(1.2, 0.12, 6, 16);
      monsterRingGeo.rotateX(Math.PI / 2);
      const monsterRing = new THREE.Mesh(monsterRingGeo, new THREE.MeshBasicMaterial({ color: 0xef4444, wireframe: true }));
      monsterMarker.add(monsterRing);

      const centerDot = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
      monsterMarker.add(centerDot);

      monsterMarkers.push(monsterMarker);
    });

    // Exit Marker (Green Diamond)
    const exitMarker = new THREE.Group();
    exitMarker.name = 'ExitOverviewMarker';
    exitMarker.position.set(exitWx, markerY, exitWz);

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
