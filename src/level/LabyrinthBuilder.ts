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

export type { WorldRamp, WorldBridge, StairwellOpening };

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
  exitMarker: THREE.Group;
  playerWorldSpawn: { x: number; y: number; z: number; rotationY: number };
  monsterWorldSpawn: { x: number; y: number; z: number; rotationY: number };
  exitWorldPos: { x: number; y: number; z: number };
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
  public static buildLevel(level: LevelDefinition): LevelBuildResult {
    // PRESERVE LEVEL 1: If Level 1 or Banana Garden, use the original lush banana plantation builder
    if (level.theme === 'banana_garden' || level.id === 1) {
      return this.buildBananaGardenLevel(level);
    }

    // For Levels 2 to 10: Build distinct themed 3D environments
    return this.buildThemedLevel(level);
  }

  // =========================================================================
  // LEVEL 1 — HAUNTED BANANA GARDEN (100% PRESERVED EXISTING LEVEL)
  // =========================================================================
  private static buildBananaGardenLevel(level: LevelDefinition): LevelBuildResult {
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
      color: 0xe0f2fe,
      size: 0.28,
      transparent: true,
      opacity: 0.9,
    });
    const starfield = new THREE.Points(starGeo, starMat);
    rootGroup.add(starfield);

    const skyLight = new THREE.DirectionalLight(0xdce7f5, 2.6);
    skyLight.position.set(halfWidth * 0.8, 55, -halfHeight * 0.85);
    skyLight.target.position.set(0, 0, 0);
    rootGroup.add(skyLight);
    rootGroup.add(skyLight.target);

    const ambientLight = new THREE.AmbientLight(0x40556b, 2.4);
    rootGroup.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x8cb0d4, 0x273d2d, 2.0);
    rootGroup.add(hemiLight);

    // 3. Spawns & Clearings Calculation
    const pSpawnWx = (level.playerSpawn.x + 0.5) * cellSize - halfWidth;
    const pSpawnWz = (level.playerSpawn.z + 0.5) * cellSize - halfHeight;

    const mSpawnWx = (level.monsterSpawn.x + 0.5) * cellSize - halfWidth;
    const mSpawnWz = (level.monsterSpawn.z + 0.5) * cellSize - halfHeight;

    const exitWx = (level.exitDoor.x + 0.5) * cellSize - halfWidth;
    const exitWz = (level.exitDoor.z + 0.5) * cellSize - halfHeight;

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
      if (Math.hypot(x - mSpawnWx, z - mSpawnWz) < 5.0) return true;
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
    exitDoorGroup.position.set(exitWx, 0, exitWz);

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
      new THREE.Vector3(exitWx - cellSize * 0.8, 0, exitWz - cellSize * 0.8),
      new THREE.Vector3(exitWx + cellSize * 0.8, wallHeight, exitWz + cellSize * 0.8)
    );

    // Markers for Overview Camera
    const markers = this.createOverviewMarkers(pSpawnWx, mSpawnWx, mSpawnWz, exitWx, exitWz, wallHeight, pSpawnWz);
    rootGroup.add(markers.playerMarker);
    rootGroup.add(markers.monsterMarker);
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
      monsterMarker: markers.monsterMarker,
      exitMarker: markers.exitMarker,
      playerWorldSpawn: { x: pSpawnWx, y: 1.5, z: pSpawnWz, rotationY: level.playerSpawn.rotationY },
      monsterWorldSpawn: { x: mSpawnWx, y: 0, z: mSpawnWz, rotationY: level.monsterSpawn.rotationY },
      exitWorldPos: { x: exitWx, y: 0, z: exitWz },
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
  // THEMED LEVELS BUILDER (LEVELS 2 TO 10)
  // =========================================================================
  private static buildThemedLevel(level: LevelDefinition): LevelBuildResult {
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
        ambientHex = 0x48524b;
        lightHex = 0xd6e5d8;
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

    floorTexture.repeat.set(gridWidth * 0.8, gridHeight * 0.8);
    const floorMat = new THREE.MeshLambertMaterial({ map: floorTexture, roughness: 0.8, side: THREE.DoubleSide });

    // Ground floor: solid everywhere
    const floorGeo = new THREE.PlaneGeometry(totalW, totalH);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.set(0, 0, 0);
    floorMesh.receiveShadow = true;
    rootGroup.add(floorMesh);

    const blockingMeshes: THREE.Object3D[] = [floorMesh];

    // Upper floor platforms: construct with true 3D cutouts for stairwell and bridge openings
    for (let f = 1; f < floorCount; f++) {
      const floorY = f * floorHeight;
      const floorQuads: THREE.BufferGeometry[] = [];

      for (let gz = 0; gz < gridHeight; gz++) {
        for (let gx = 0; gx < gridWidth; gx++) {
          // Check if this cell is part of a stairwell opening or bridge chasm on floor f
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
        let totalPos = 0;
        let totalNorm = 0;
        let totalUv = 0;
        let totalIndices = 0;

        floorQuads.forEach((q) => {
          totalPos += q.attributes.position.array.length;
          totalNorm += q.attributes.normal.array.length;
          totalUv += q.attributes.uv.array.length;
          if (q.index) totalIndices += q.index.array.length;
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

        floorQuads.forEach((q) => {
          posArr.set(q.attributes.position.array, posOffset);
          normArr.set(q.attributes.normal.array, normOffset);
          uvArr.set(q.attributes.uv.array, uvOffset);

          if (q.index) {
            for (let i = 0; i < q.index.array.length; i++) {
              indexArr[indexOffset + i] = q.index.array[i] + vertexOffset;
            }
            indexOffset += q.index.array.length;
          }

          posOffset += q.attributes.position.array.length;
          normOffset += q.attributes.normal.array.length;
          uvOffset += q.attributes.uv.array.length;
          vertexOffset += q.attributes.position.count;
        });

        const mergedFloorGeo = new THREE.BufferGeometry();
        mergedFloorGeo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
        mergedFloorGeo.setAttribute('normal', new THREE.BufferAttribute(normArr, 3));
        mergedFloorGeo.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));
        mergedFloorGeo.setIndex(new THREE.BufferAttribute(indexArr, 1));

        const uFloorMesh = new THREE.Mesh(mergedFloorGeo, floorMat);
        uFloorMesh.name = `FloorPlatform_${f}`;
        uFloorMesh.receiveShadow = true;
        rootGroup.add(uFloorMesh);
        blockingMeshes.push(uFloorMesh);
      }
    }

    // 3. Themed Ceiling (Topmost Floor)
    const ceilingTex = TextureGenerator.createCeilingTexture();
    ceilingTex.repeat.set(gridWidth, gridHeight);
    const ceilingMat = new THREE.MeshLambertMaterial({ map: ceilingTex, roughness: 0.9, side: THREE.DoubleSide });
    const ceilingGeo = new THREE.PlaneGeometry(totalW, totalH);
    ceilingGeo.rotateX(Math.PI / 2);
    const ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceilingMesh.position.set(0, totalLevelHeight, 0);
    rootGroup.add(ceilingMesh);
    blockingMeshes.push(ceilingMesh);

    // 4. Merged Denser Walls Mesh for High Performance
    wallTexture.repeat.set(1, 1);
    const wallMat = new THREE.MeshLambertMaterial({ map: wallTexture, roughness: 0.7 });
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
    const pSpawnWx = (level.playerSpawn.x + 0.5) * cellSize - halfWidth;
    const pSpawnWz = (level.playerSpawn.z + 0.5) * cellSize - halfHeight;

    const mSpawnWx = (level.monsterSpawn.x + 0.5) * cellSize - halfWidth;
    const mSpawnWz = (level.monsterSpawn.z + 0.5) * cellSize - halfHeight;

    const exitWx = (level.exitDoor.x + 0.5) * cellSize - halfWidth;
    const exitWz = (level.exitDoor.z + 0.5) * cellSize - halfHeight;

    // 6. Themed Props & Navigation Obstacles
    const propColliders: Array<{ x: number; z: number; radius: number }> = [];
    this.spawnThemedProps(level, halfWidth, halfHeight, cellSize, rootGroup, propColliders);

    // 7. Themed Exit Door
    const exitDoorGroup = new THREE.Group();
    exitDoorGroup.name = 'ThemedExitDoor';
    exitDoorGroup.position.set(exitWx, 0, exitWz);

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
      new THREE.Vector3(exitWx - cellSize * 0.8, 0, exitWz - cellSize * 0.8),
      new THREE.Vector3(exitWx + cellSize * 0.8, wallHeight, exitWz + cellSize * 0.8)
    );

    // 8. Corridors Atmospheric Lights
    this.spawnCorridorLights(level, halfWidth, halfHeight, cellSize, wallHeight, rootGroup);

    // 9. Overview Markers (Anchored safely above topmost roof in multi-floor environments)
    const markers = this.createOverviewMarkers(pSpawnWx, mSpawnWx, mSpawnWz, exitWx, exitWz, totalLevelHeight, pSpawnWz);
    rootGroup.add(markers.playerMarker);
    rootGroup.add(markers.monsterMarker);
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
        const startWx = (ramp.startCell.x + 0.5) * cellSize - halfWidth;
        const startWz = (ramp.startCell.z + 0.5) * cellSize - halfHeight;
        const startY = ramp.fromFloor * floorHeight;

        const endWx = (ramp.endCell.x + 0.5) * cellSize - halfWidth;
        const endWz = (ramp.endCell.z + 0.5) * cellSize - halfHeight;
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
        const stairMesh = EnvironmentPropFactory.createStaircase(rampWidth, height, length);
        const midX = (startWx + endWx) / 2;
        const midZ = (startWz + endWz) / 2;

        stairMesh.position.set(midX, startY, midZ);
        stairMesh.rotation.y = angle;
        rootGroup.add(stairMesh);

        // Safety Balustrades around the 3 closed sides of the upper-floor stairwell opening
        const openMinX = Math.min(startWx, endWx) - rampWidth / 2;
        const openMaxX = Math.max(startWx, endWx) + rampWidth / 2;
        const openMinZ = Math.min(startWz, endWz) - rampWidth / 2;
        const openMaxZ = Math.max(startWz, endWz) + rampWidth / 2;
        const upperY = ramp.toFloor * floorHeight;
        const railingThick = 0.25;

        if (Math.abs(dx) >= Math.abs(dz)) {
          // Stairs run horizontally along X: balustrades on North & South sides, plus back end
          const sideLength = openMaxX - openMinX;
          const bNorth = EnvironmentPropFactory.createStairwellBalustrade(sideLength);
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

          const bSouth = EnvironmentPropFactory.createStairwellBalustrade(sideLength);
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
          const bBack = EnvironmentPropFactory.createStairwellBalustrade(rampWidth);
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
      cylinderColliders: propColliders.map((p) => ({ x: p.x, z: p.z, radius: p.radius, label: 'themed_prop' })),
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
      monsterMarker: markers.monsterMarker,
      exitMarker: markers.exitMarker,
      playerWorldSpawn: { x: pSpawnWx, y: 1.5, z: pSpawnWz, rotationY: level.playerSpawn.rotationY },
      monsterWorldSpawn: { x: mSpawnWx, y: 0, z: mSpawnWz, rotationY: level.monsterSpawn.rotationY },
      exitWorldPos: { x: exitWx, y: 0, z: exitWz },
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
    colliders: Array<{ x: number; z: number; radius: number }>
  ): void {
    const { grid, gridWidth, gridHeight, theme } = level;

    // Scan for open corridor cells suitable for props (avoid spawns & exit)
    const isSpawnOrExit = (gx: number, gz: number) => {
      if (Math.abs(gx - level.playerSpawn.x) <= 1 && Math.abs(gz - level.playerSpawn.z) <= 1) return true;
      if (Math.abs(gx - level.monsterSpawn.x) <= 1 && Math.abs(gz - level.monsterSpawn.z) <= 1) return true;
      if (Math.abs(gx - level.exitDoor.x) <= 1 && Math.abs(gz - level.exitDoor.z) <= 1) return true;
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
    });
  }

  // =========================================================================
  // OVERVIEW CAMERA MARKERS
  // =========================================================================
  private static createOverviewMarkers(
    pSpawnWx: number,
    mSpawnWx: number,
    mSpawnWz: number,
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

    // Monster Marker (Red Warning Torus)
    const monsterMarker = new THREE.Group();
    monsterMarker.name = 'PocongOverviewMarker';
    monsterMarker.position.set(mSpawnWx, markerY, mSpawnWz);

    const monsterRingGeo = new THREE.TorusGeometry(1.2, 0.12, 6, 16);
    monsterRingGeo.rotateX(Math.PI / 2);
    const monsterRing = new THREE.Mesh(monsterRingGeo, new THREE.MeshBasicMaterial({ color: 0xef4444, wireframe: true }));
    monsterMarker.add(monsterRing);

    const centerDot = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
    monsterMarker.add(centerDot);

    // Exit Marker (Green Diamond)
    const exitMarker = new THREE.Group();
    exitMarker.name = 'ExitOverviewMarker';
    exitMarker.position.set(exitWx, markerY, exitWz);

    const exitBeacon = new THREE.Mesh(new THREE.OctahedronGeometry(1.1, 0), new THREE.MeshBasicMaterial({ color: 0x22c55e }));
    exitMarker.add(exitBeacon);

    return { playerMarker, monsterMarker, exitMarker };
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
    if (level.weaponPickups && level.weaponPickups.length > 0) {
      level.weaponPickups.forEach((loc) => {
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
