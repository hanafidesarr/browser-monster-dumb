import * as THREE from 'three';
import { LevelDefinition } from './LevelData.ts';
import { TextureGenerator } from './TextureGenerator.ts';
import { BananaTreeFactory } from './BananaTreeFactory.ts';

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
}

export class LabyrinthBuilder {
  public static buildLevel(level: LevelDefinition): LevelBuildResult {
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
    });

    const totalW = gridWidth * cellSize + 50; // Spacious extended forest terrain
    const totalH = gridHeight * cellSize + 50;

    const floorGeo = new THREE.PlaneGeometry(totalW, totalH);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.set(0, 0, 0);
    floorMesh.receiveShadow = true;
    rootGroup.add(floorMesh);

    // 2. Open Night Sky & Glorious Moonlight (Bulan Purnama Terang & Cahaya Bulan)
    // Twinkling Starfield in the night sky
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

    // Ambient Night Lighting (Suasana malam alami tanpa bulan)
    const ambientLight = new THREE.AmbientLight(0x283848, 1.5);
    rootGroup.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x40556b, 0x18261e, 1.2);
    rootGroup.add(hemiLight);

    // 3. Spawns & Clearings Calculation
    const pSpawnWx = (level.playerSpawn.x + 0.5) * cellSize - halfWidth;
    const pSpawnWz = (level.playerSpawn.z + 0.5) * cellSize - halfHeight;

    const mSpawnWx = (level.monsterSpawn.x + 0.5) * cellSize - halfWidth;
    const mSpawnWz = (level.monsterSpawn.z + 0.5) * cellSize - halfHeight;

    const exitWx = (level.exitDoor.x + 0.5) * cellSize - halfWidth;
    const exitWz = (level.exitDoor.z + 0.5) * cellSize - halfHeight;

    // 4. Randomized, Organic, Lush Banana Tree Placement
    const forestObstaclesGroup = new THREE.Group();
    forestObstaclesGroup.name = 'BananaObstacles';

    const treeColliders: Array<{ x: number; z: number; radius: number }> = [];
    const updatedGrid: number[][] = Array.from({ length: gridHeight }, () => Array(gridWidth).fill(0));

    // Outer boundary walls in grid
    for (let gz = 0; gz < gridHeight; gz++) {
      for (let gx = 0; gx < gridWidth; gx++) {
        if (gx === 0 || gx === gridWidth - 1 || gz === 0 || gz === gridHeight - 1) {
          updatedGrid[gz][gx] = 1;
        }
      }
    }

    // A. Dense Perimeter Boundary Trees (Enclosing the plantation)
    for (let gx = 0; gx < gridWidth; gx++) {
      // North and South perimeter trees
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
      // West and East perimeter trees
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

    // B. Sacred Ancient Banana Tree directly over Pocong Shrine
    const sacredTree = BananaTreeFactory.createBananaTree({
      height: 7.8,
      trunkRadius: 0.45,
      hasBud: true,
    });
    sacredTree.position.set(mSpawnWx + 0.5, 0, mSpawnWz - 0.6);
    forestObstaclesGroup.add(sacredTree);
    treeColliders.push({ x: mSpawnWx + 0.5, z: mSpawnWz - 0.6, radius: 0.55 });

    // C. Organic Pseudo-Random Inner Plantation Trees (~55-65 trees)
    // Seeded generator for consistent organic glade
    let seed = 9876543;
    const rnd = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };

    const isNearClearings = (x: number, z: number): boolean => {
      // Player spawn clearing (radius 6.0m)
      if (Math.hypot(x - pSpawnWx, z - pSpawnWz) < 6.0) return true;
      // Pocong resting clearing (radius 5.0m)
      if (Math.hypot(x - mSpawnWx, z - mSpawnWz) < 5.0) return true;
      // Exit gate clearing (radius 6.5m)
      if (Math.hypot(x - exitWx, z - exitWz) < 6.5) return true;
      // Perimeter margin
      if (Math.abs(x) > halfWidth - 3.8 || Math.abs(z) > halfHeight - 3.8) return true;
      return false;
    };

    const minTreeSpacing = 4.2; // 4.2m minimum between trunks ensures wide, generous running corridors
    const candidateAttempts = 900;

    for (let i = 0; i < candidateAttempts; i++) {
      const tx = (rnd() * 2 - 1) * (halfWidth - 3.5);
      const tz = (rnd() * 2 - 1) * (halfHeight - 3.5);

      if (isNearClearings(tx, tz)) continue;

      // Check distance to existing trees
      let tooClose = false;
      for (let j = 0; j < treeColliders.length; j++) {
        const ct = treeColliders[j];
        if (Math.hypot(tx - ct.x, tz - ct.z) < minTreeSpacing) {
          tooClose = true;
          break;
        }
      }

      if (!tooClose) {
        // Place tall, lush banana tree
        const treeHeight = 6.2 + rnd() * 1.6; // 6.2m to 7.8m tall!
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

        // Small young shoot at trunk base (40% chance for extra lushness)
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

        // Add trunk collider
        treeColliders.push({ x: tx, z: tz, radius: 0.48 });

        // Mark corresponding grid cell for Pocong A* pathfinding
        const gx = Math.floor((tx + halfWidth) / cellSize);
        const gz = Math.floor((tz + halfHeight) / cellSize);
        if (gx >= 0 && gx < gridWidth && gz >= 0 && gz < gridHeight) {
          // Never block clearings in grid
          if (!isNearClearings(tx, tz)) {
            updatedGrid[gz][gx] = 1;
          }
        }
      }
    }

    rootGroup.add(forestObstaclesGroup);

    // Build merged boundary collider for wallsMesh
    const unitBox = new THREE.BoxGeometry(cellSize, wallHeight, cellSize);
    const mergedGeos: THREE.BufferGeometry[] = [];
    for (let gz = 0; gz < gridHeight; gz++) {
      for (let gx = 0; gx < gridWidth; gx++) {
        if (gx === 0 || gx === gridWidth - 1 || gz === 0 || gz === gridHeight - 1) {
          const wx = (gx + 0.5) * cellSize - halfWidth;
          const wz = (gz + 0.5) * cellSize - halfHeight;
          const cloned = unitBox.clone();
          cloned.translate(wx, wallHeight / 2, wz);
          mergedGeos.push(cloned);
        }
      }
    }

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

    const wallMat = new THREE.MeshBasicMaterial({ visible: false });
    const wallsMesh = new THREE.Mesh(mergedWallsGeo, wallMat);
    wallsMesh.name = 'BananaGroveColliders';
    rootGroup.add(wallsMesh);

    // 5. Village Bamboo Exit Gate (Gapura Bambu Desa / Pintu Keluar)
    const exitDoorGroup = new THREE.Group();
    exitDoorGroup.name = 'VillageExitGate';
    exitDoorGroup.position.set(exitWx, 0, exitWz);

    const bambooTex = TextureGenerator.createBambooTexture();
    const woodTex = TextureGenerator.createGateWoodTexture();

    const bambooMat = new THREE.MeshLambertMaterial({ map: bambooTex, roughness: 0.8 });
    const woodMat = new THREE.MeshLambertMaterial({ map: woodTex, roughness: 0.85 });

    // Gate Left Post
    const postGeo = new THREE.CylinderGeometry(0.14, 0.16, 3.8, 7);
    const leftPost = new THREE.Mesh(postGeo, bambooMat);
    leftPost.position.set(-cellSize * 0.38, 1.9, 0);
    leftPost.castShadow = true;
    exitDoorGroup.add(leftPost);

    // Gate Right Post
    const rightPost = new THREE.Mesh(postGeo, bambooMat);
    rightPost.position.set(cellSize * 0.38, 1.9, 0);
    rightPost.castShadow = true;
    exitDoorGroup.add(rightPost);

    // Crossbeam lintel
    const lintelGeo = new THREE.BoxGeometry(cellSize * 1.05, 0.24, 0.28);
    const lintel = new THREE.Mesh(lintelGeo, woodMat);
    lintel.position.set(0, 3.5, 0);
    lintel.castShadow = true;
    exitDoorGroup.add(lintel);

    // Sign board: "KELUAR / EXIT"
    const signGeo = new THREE.BoxGeometry(1.8, 0.5, 0.08);
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
    const signMat = new THREE.MeshBasicMaterial({ map: signTex });
    const signMesh = new THREE.Mesh(signGeo, signMat);
    signMesh.position.set(0, 3.0, 0.12);
    exitDoorGroup.add(signMesh);

    // Hanging warm lantern
    const lanternGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.35, 6);
    const lanternMat = new THREE.MeshBasicMaterial({ color: 0xffe8aa });
    const lantern = new THREE.Mesh(lanternGeo, lanternMat);
    lantern.position.set(0, 2.5, 0);
    exitDoorGroup.add(lantern);

    const exitPointLight = new THREE.PointLight(0x22c55e, 2.0, 10, 1.2);
    exitPointLight.position.set(0, 2.4, 0.4);
    exitDoorGroup.add(exitPointLight);

    rootGroup.add(exitDoorGroup);

    // Escape Trigger Box
    const exitTriggerBox = new THREE.Box3(
      new THREE.Vector3(exitWx - cellSize * 0.8, 0, exitWz - cellSize * 0.8),
      new THREE.Vector3(exitWx + cellSize * 0.8, wallHeight, exitWz + cellSize * 0.8)
    );

    // 6. Bamboo Torches (Obor Bambu) placed around open clearings & glades
    const torchPositions = [
      { x: pSpawnWx + 3.0, z: pSpawnWz + 1.0 },
      { x: mSpawnWx - 2.5, z: mSpawnWz + 2.5 },
      { x: exitWx - 3.0, z: exitWz - 1.0 },
      { x: -halfWidth * 0.45, z: -halfHeight * 0.45 },
      { x: halfWidth * 0.45, z: -halfHeight * 0.45 },
      { x: -halfWidth * 0.45, z: halfHeight * 0.45 },
      { x: halfWidth * 0.45, z: halfHeight * 0.45 },
      { x: 0, z: -halfHeight * 0.55 },
      { x: 0, z: halfHeight * 0.55 },
      { x: -halfWidth * 0.55, z: 0 },
      { x: halfWidth * 0.55, z: 0 },
    ];

    torchPositions.forEach((pos) => {
      const torchGroup = new THREE.Group();
      torchGroup.position.set(pos.x, 0, pos.z);

      const stakeGeo = new THREE.CylinderGeometry(0.05, 0.06, 1.8, 5);
      const stake = new THREE.Mesh(stakeGeo, bambooMat);
      stake.position.y = 0.9;
      stake.castShadow = true;
      torchGroup.add(stake);

      const flameGeo = new THREE.OctahedronGeometry(0.14, 0);
      flameGeo.scale(0.8, 1.5, 0.8);
      const flameMat = new THREE.MeshBasicMaterial({ color: 0xffaa33 });
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.y = 1.85;
      torchGroup.add(flame);

      const torchLight = new THREE.PointLight(0xff8833, 2.2, 12, 1.2);
      torchLight.position.set(0, 1.85, 0);
      torchGroup.add(torchLight);

      rootGroup.add(torchGroup);
    });

    // 7. Eerie Red Glow at Pocong Resting Shrine
    const pocongShrineLight = new THREE.PointLight(0xd9162a, 2.5, 12, 1.2);
    pocongShrineLight.position.set(mSpawnWx, 1.8, mSpawnWz);
    rootGroup.add(pocongShrineLight);

    // 8. Fireflies (Kunang-kunang Hutan)
    const fireflyCount = 80;
    const fireflyGeo = new THREE.BufferGeometry();
    const ffPositions = new Float32Array(fireflyCount * 3);
    for (let i = 0; i < fireflyCount; i++) {
      ffPositions[i * 3] = (Math.random() - 0.5) * totalW * 0.75;
      ffPositions[i * 3 + 1] = 0.5 + Math.random() * 2.5;
      ffPositions[i * 3 + 2] = (Math.random() - 0.5) * totalH * 0.75;
    }
    fireflyGeo.setAttribute('position', new THREE.BufferAttribute(ffPositions, 3));
    const fireflyMat = new THREE.PointsMaterial({
      color: 0xc7f9cc,
      size: 0.14,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });
    const fireflies = new THREE.Points(fireflyGeo, fireflyMat);
    rootGroup.add(fireflies);

    // 9. Pre-Game Tactical Overview Markers (Luminous Beacons, Ground Rings & Light Pillars)
    const markerY = wallHeight + 2.5;

    // Helper: create a vertical cylindrical light pillar connecting ground to sky
    const createBeaconPillar = (color: number, radius: number = 0.45, height: number = 16.0) => {
      const geo = new THREE.CylinderGeometry(radius * 0.7, radius, height, 16, 1, true);
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.38,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = height / 2;
      return mesh;
    };

    // Helper: create concentric glowing holographic ground rings
    const createGroundRings = (color: number, outerR: number, innerR: number) => {
      const group = new THREE.Group();
      const ringMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const r1 = new THREE.Mesh(new THREE.TorusGeometry(outerR, 0.12, 8, 32), ringMat);
      r1.rotateX(Math.PI / 2);
      r1.position.y = 0.15;
      group.add(r1);

      const r2 = new THREE.Mesh(new THREE.TorusGeometry(innerR, 0.08, 8, 24), ringMat);
      r2.rotateX(Math.PI / 2);
      r2.position.y = 0.15;
      group.add(r2);

      return group;
    };

    // Marker A: Player Start (Vibrant Cyan Tactical Beacon)
    const playerMarker = new THREE.Group();
    playerMarker.name = 'PlayerOverviewMarker';
    playerMarker.position.set(pSpawnWx, 0, pSpawnWz);

    playerMarker.add(createBeaconPillar(0x38bdf8, 0.5, 16.0));
    playerMarker.add(createGroundRings(0x38bdf8, 2.5, 1.4));

    // Floating overhead chevron indicator
    const arrowGroup = new THREE.Group();
    arrowGroup.position.y = markerY;
    const arrowMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const arrowShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.6, 12), arrowMat);
    arrowShaft.position.set(0, 0.8, 0);
    arrowGroup.add(arrowShaft);

    const arrowHead = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.2, 12), arrowMat);
    arrowHead.rotateX(Math.PI);
    arrowHead.position.set(0, 0, 0);
    arrowGroup.add(arrowHead);

    const playerBeaconLight = new THREE.PointLight(0x38bdf8, 3.5, 20, 1.2);
    playerBeaconLight.position.y = markerY;
    playerMarker.add(playerBeaconLight);
    playerMarker.add(arrowGroup);
    rootGroup.add(playerMarker);

    // Marker B: Pocong Shrine (Crimson Warning Hologram Beacon)
    const monsterMarker = new THREE.Group();
    monsterMarker.name = 'PocongOverviewMarker';
    monsterMarker.position.set(mSpawnWx, 0, mSpawnWz);

    monsterMarker.add(createBeaconPillar(0xef4444, 0.55, 16.0));
    monsterMarker.add(createGroundRings(0xef4444, 2.8, 1.6));

    // Floating danger core
    const dangerCore = new THREE.Group();
    dangerCore.position.y = markerY;
    const dangerOrb = new THREE.Mesh(
      new THREE.SphereGeometry(0.65, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xff1111 })
    );
    dangerCore.add(dangerOrb);

    const dangerRing1 = new THREE.Mesh(
      new THREE.TorusGeometry(1.4, 0.1, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0xff3333, wireframe: true })
    );
    dangerRing1.rotateX(Math.PI / 2);
    dangerCore.add(dangerRing1);

    const monsterBeaconLight = new THREE.PointLight(0xff0000, 4.0, 22, 1.2);
    monsterBeaconLight.position.y = markerY;
    monsterMarker.add(monsterBeaconLight);
    monsterMarker.add(dangerCore);
    rootGroup.add(monsterMarker);

    // Marker C: Exit Gate (Emerald Escape Gateway Beacon)
    const exitMarker = new THREE.Group();
    exitMarker.name = 'ExitOverviewMarker';
    exitMarker.position.set(exitWx, 0, exitWz);

    exitMarker.add(createBeaconPillar(0x22c55e, 0.6, 16.0));
    exitMarker.add(createGroundRings(0x22c55e, 3.0, 1.8));

    // Floating green gateway star
    const exitDiamond = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.2, 0),
      new THREE.MeshBasicMaterial({ color: 0x4ade80 })
    );
    exitDiamond.position.y = markerY;
    exitMarker.add(exitDiamond);

    const exitBeaconLight = new THREE.PointLight(0x22c55e, 4.0, 24, 1.2);
    exitBeaconLight.position.y = markerY;
    exitMarker.add(exitBeaconLight);
    rootGroup.add(exitMarker);

    return {
      rootGroup,
      wallsMesh,
      exitDoorMesh: exitDoorGroup,
      exitTriggerBox,
      playerMarker,
      monsterMarker,
      exitMarker,
      playerWorldSpawn: { x: pSpawnWx, y: 1.5, z: pSpawnWz, rotationY: level.playerSpawn.rotationY },
      monsterWorldSpawn: { x: mSpawnWx, y: 0, z: mSpawnWz, rotationY: level.monsterSpawn.rotationY },
      exitWorldPos: { x: exitWx, y: 0, z: exitWz },
      treeColliders,
      updatedGrid,
    };
  }
}
