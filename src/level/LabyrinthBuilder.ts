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
}

export class LabyrinthBuilder {
  public static buildLevel(level: LevelDefinition): LevelBuildResult {
    const rootGroup = new THREE.Group();
    rootGroup.name = 'BananaForestRoot';

    const { grid, gridWidth, gridHeight, cellSize, wallHeight } = level;
    const halfWidth = (gridWidth * cellSize) / 2;
    const halfHeight = (gridHeight * cellSize) / 2;

    // 1. Forest Ground (Tanah Kebun Pisang)
    const floorTex = TextureGenerator.createForestGroundTexture();
    floorTex.repeat.set(gridWidth * 1.5, gridHeight * 1.5);

    const floorMat = new THREE.MeshLambertMaterial({
      map: floorTex,
      roughness: 0.95,
    });

    const totalW = gridWidth * cellSize + 20; // extend slightly past boundary for endless forest horizon
    const totalH = gridHeight * cellSize + 20;

    const floorGeo = new THREE.PlaneGeometry(totalW, totalH);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.set(0, 0, 0);
    floorMesh.receiveShadow = true;
    rootGroup.add(floorMesh);

    // 2. Open Night Sky & Moon (Bulan Purnama)
    // Full Moon Sphere in the night sky
    const moonGeo = new THREE.SphereGeometry(2.4, 16, 16);
    const moonMat = new THREE.MeshBasicMaterial({
      color: 0xecfdf5,
    });
    const moonMesh = new THREE.Mesh(moonGeo, moonMat);
    moonMesh.position.set(halfWidth * 0.9, 32, -halfHeight * 1.1);
    rootGroup.add(moonMesh);

    // Glowing lunar halo plane
    const haloGeo = new THREE.PlaneGeometry(9.0, 9.0);
    const haloCanvas = document.createElement('canvas');
    haloCanvas.width = 128;
    haloCanvas.height = 128;
    const hCtx = haloCanvas.getContext('2d')!;
    const hGrad = hCtx.createRadialGradient(64, 64, 15, 64, 64, 64);
    hGrad.addColorStop(0, 'rgba(215, 240, 255, 0.65)');
    hGrad.addColorStop(0.5, 'rgba(150, 200, 240, 0.25)');
    hGrad.addColorStop(1, 'rgba(10, 20, 30, 0)');
    hCtx.fillStyle = hGrad;
    hCtx.fillRect(0, 0, 128, 128);

    const haloTex = new THREE.CanvasTexture(haloCanvas);
    const haloMat = new THREE.MeshBasicMaterial({
      map: haloTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    haloMesh.position.copy(moonMesh.position);
    haloMesh.position.z += 0.5;
    rootGroup.add(haloMesh);

    // Moonlight Directional Light
    const moonLight = new THREE.DirectionalLight(0x7fa8d4, 1.15);
    moonLight.position.set(halfWidth * 0.9, 32, -halfHeight * 1.1);
    moonLight.target.position.set(0, 0, 0);
    moonLight.castShadow = true;
    moonLight.shadow.mapSize.width = 1024;
    moonLight.shadow.mapSize.height = 1024;
    moonLight.shadow.camera.near = 10;
    moonLight.shadow.camera.far = 70;
    const d = Math.max(totalW, totalH) * 0.6;
    moonLight.shadow.camera.left = -d;
    moonLight.shadow.camera.right = d;
    moonLight.shadow.camera.top = d;
    moonLight.shadow.camera.bottom = -d;
    rootGroup.add(moonLight);
    rootGroup.add(moonLight.target);

    // Ambient Night Lighting (Soft dark jungle radiance)
    const ambientLight = new THREE.AmbientLight(0x1a2e26, 1.35);
    rootGroup.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x2d4659, 0x141f17, 1.1);
    rootGroup.add(hemiLight);

    // 3. Dense Banana Trees (Pohon Pisang sebagai Penghalang / Obstacle)
    const forestObstaclesGroup = new THREE.Group();
    forestObstaclesGroup.name = 'BananaObstacles';

    // Also build a low-poly merged collider/base mesh for raycasts
    const mergedGeos: THREE.BufferGeometry[] = [];
    const unitBox = new THREE.BoxGeometry(cellSize * 0.92, wallHeight, cellSize * 0.92);

    for (let gz = 0; gz < gridHeight; gz++) {
      for (let gx = 0; gx < gridWidth; gx++) {
        if (grid[gz][gx] === 1) {
          const wx = (gx + 0.5) * cellSize - halfWidth;
          const wz = (gz + 0.5) * cellSize - halfHeight;

          // Place dense clump of banana trees
          const cluster = BananaTreeFactory.createObstacleCluster(cellSize, gz * gridWidth + gx);
          cluster.position.set(wx, 0, wz);
          forestObstaclesGroup.add(cluster);

          // Add invisible/boundary box for raycasting
          const cloned = unitBox.clone();
          cloned.translate(wx, wallHeight / 2, wz);
          mergedGeos.push(cloned);
        }
      }
    }

    rootGroup.add(forestObstaclesGroup);

    // Merge collision geometry for wallsMesh
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

    const wallMat = new THREE.MeshBasicMaterial({ visible: false }); // invisible physics collider
    const wallsMesh = new THREE.Mesh(mergedWallsGeo, wallMat);
    wallsMesh.name = 'BananaGroveColliders';
    rootGroup.add(wallsMesh);

    // 4. Calculate World Positions
    const pSpawnWx = (level.playerSpawn.x + 0.5) * cellSize - halfWidth;
    const pSpawnWz = (level.playerSpawn.z + 0.5) * cellSize - halfHeight;

    const mSpawnWx = (level.monsterSpawn.x + 0.5) * cellSize - halfWidth;
    const mSpawnWz = (level.monsterSpawn.z + 0.5) * cellSize - halfHeight;

    const exitWx = (level.exitDoor.x + 0.5) * cellSize - halfWidth;
    const exitWz = (level.exitDoor.z + 0.5) * cellSize - halfHeight;

    // 5. Village Bamboo Exit Gate (Gapura Bambu Desa / Pintu Keluar)
    const exitDoorGroup = new THREE.Group();
    exitDoorGroup.name = 'VillageExitGate';
    exitDoorGroup.position.set(exitWx, 0, exitWz);

    const bambooTex = TextureGenerator.createBambooTexture();
    const woodTex = TextureGenerator.createGateWoodTexture();

    const bambooMat = new THREE.MeshLambertMaterial({ map: bambooTex, roughness: 0.8 });
    const woodMat = new THREE.MeshLambertMaterial({ map: woodTex, roughness: 0.85 });

    // Gate Left Post
    const postGeo = new THREE.CylinderGeometry(0.14, 0.16, 3.4, 7);
    const leftPost = new THREE.Mesh(postGeo, bambooMat);
    leftPost.position.set(-cellSize * 0.38, 1.7, 0);
    leftPost.castShadow = true;
    exitDoorGroup.add(leftPost);

    // Gate Right Post
    const rightPost = new THREE.Mesh(postGeo, bambooMat);
    rightPost.position.set(cellSize * 0.38, 1.7, 0);
    rightPost.castShadow = true;
    exitDoorGroup.add(rightPost);

    // Crossbeam lintel (Balok kayu atas)
    const lintelGeo = new THREE.BoxGeometry(cellSize * 1.05, 0.22, 0.28);
    const lintel = new THREE.Mesh(lintelGeo, woodMat);
    lintel.position.set(0, 3.1, 0);
    lintel.castShadow = true;
    exitDoorGroup.add(lintel);

    // Wooden sign board: "KELUAR / EXIT"
    const signGeo = new THREE.BoxGeometry(1.6, 0.45, 0.08);
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
    signMesh.position.set(0, 2.7, 0.12);
    exitDoorGroup.add(signMesh);

    // Hanging warm kerosene lantern (Lampu Petromak / Teplok)
    const lanternGeo = new THREE.CylinderGeometry(0.1, 0.12, 0.3, 6);
    const lanternMat = new THREE.MeshBasicMaterial({ color: 0xffe6aa });
    const lantern = new THREE.Mesh(lanternGeo, lanternMat);
    lantern.position.set(0, 2.3, 0);
    exitDoorGroup.add(lantern);

    const exitPointLight = new THREE.PointLight(0x22c55e, 1.6, 8, 1.2);
    exitPointLight.position.set(0, 2.2, 0.4);
    exitDoorGroup.add(exitPointLight);

    rootGroup.add(exitDoorGroup);

    // Escape Trigger Box
    const exitTriggerBox = new THREE.Box3(
      new THREE.Vector3(exitWx - cellSize * 0.7, 0, exitWz - cellSize * 0.7),
      new THREE.Vector3(exitWx + cellSize * 0.7, wallHeight, exitWz + cellSize * 0.7)
    );

    // 6. Bamboo Torches (Obor Bambu) along forest paths
    const torchPositions = [
      { gx: 1, gz: 1 },
      { gx: 3, gz: 1 },
      { gx: 7, gz: 1 },
      { gx: 11, gz: 1 },
      { gx: 13, gz: 1 },
      { gx: 1, gz: 5 },
      { gx: 5, gz: 5 },
      { gx: 9, gz: 5 },
      { gx: 13, gz: 5 },
      { gx: 3, gz: 7 },
      { gx: 11, gz: 7 },
      { gx: 1, gz: 9 },
      { gx: 7, gz: 9 },
      { gx: 13, gz: 9 },
      { gx: 3, gz: 11 },
      { gx: 9, gz: 11 },
      { gx: 13, gz: 11 },
      { gx: 1, gz: 13 },
      { gx: 7, gz: 13 },
      { gx: 13, gz: 13 },
    ];

    torchPositions.forEach((pos) => {
      const lx = (pos.gx + 0.5) * cellSize - halfWidth;
      const lz = (pos.gz + 0.5) * cellSize - halfHeight;

      const torchGroup = new THREE.Group();
      torchGroup.position.set(lx, 0, lz);

      // Bamboo stake stuck in ground
      const stakeGeo = new THREE.CylinderGeometry(0.045, 0.05, 1.7, 5);
      const stake = new THREE.Mesh(stakeGeo, bambooMat);
      stake.position.y = 0.85;
      stake.castShadow = true;
      torchGroup.add(stake);

      // Flame diamond
      const flameGeo = new THREE.OctahedronGeometry(0.12, 0);
      flameGeo.scale(0.8, 1.4, 0.8);
      const flameMat = new THREE.MeshBasicMaterial({ color: 0xffaa33 });
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.y = 1.75;
      torchGroup.add(flame);

      // Warm torch light
      const torchLight = new THREE.PointLight(0xff7722, 1.8, 9, 1.3);
      torchLight.position.set(0, 1.75, 0);
      torchGroup.add(torchLight);

      rootGroup.add(torchGroup);
    });

    // 7. Eerie Sinister Light at Pocong Resting Shrine
    const pocongShrineLight = new THREE.PointLight(0xbb1122, 2.4, 11, 1.2);
    pocongShrineLight.position.set(mSpawnWx, 1.8, mSpawnWz);
    rootGroup.add(pocongShrineLight);

    // 8. Kunang-kunang (Fireflies / Glowing Jungle Particles)
    const fireflyCount = 45;
    const fireflyGeo = new THREE.BufferGeometry();
    const ffPositions = new Float32Array(fireflyCount * 3);
    for (let i = 0; i < fireflyCount; i++) {
      ffPositions[i * 3] = (Math.random() - 0.5) * totalW * 0.8;
      ffPositions[i * 3 + 1] = 0.4 + Math.random() * 2.2;
      ffPositions[i * 3 + 2] = (Math.random() - 0.5) * totalH * 0.8;
    }
    fireflyGeo.setAttribute('position', new THREE.BufferAttribute(ffPositions, 3));
    const fireflyMat = new THREE.PointsMaterial({
      color: 0xbbf7d0,
      size: 0.12,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const fireflies = new THREE.Points(fireflyGeo, fireflyMat);
    rootGroup.add(fireflies);

    // 9. PRE-GAME OVERVIEW 3D MARKERS (Floating cleanly above banana canopy)
    const markerY = wallHeight + 1.8;

    // Marker A: Player Start (Blue Arrow pointing towards initial player view)
    const playerMarker = new THREE.Group();
    playerMarker.name = 'PlayerOverviewMarker';
    playerMarker.position.set(pSpawnWx, markerY, pSpawnWz);

    const arrowMat = new THREE.MeshBasicMaterial({ color: 0x2a8bf2 });
    const arrowShaftGeo = new THREE.CylinderGeometry(0.18, 0.18, 1.2, 8);
    const arrowShaft = new THREE.Mesh(arrowShaftGeo, arrowMat);
    arrowShaft.position.set(0, 0.6, 0);
    playerMarker.add(arrowShaft);

    const arrowHeadGeo = new THREE.ConeGeometry(0.5, 0.8, 8);
    const arrowHead = new THREE.Mesh(arrowHeadGeo, arrowMat);
    arrowHead.position.set(0, 0, 0);
    arrowHead.rotateX(Math.PI);
    playerMarker.add(arrowHead);

    const dirConeGeo = new THREE.ConeGeometry(0.35, 0.9, 8);
    const dirCone = new THREE.Mesh(dirConeGeo, new THREE.MeshBasicMaterial({ color: 0x60a5fa }));
    dirCone.position.set(0, 0.6, 0.9);
    dirCone.rotateX(Math.PI / 2);
    playerMarker.add(dirCone);

    rootGroup.add(playerMarker);

    // Marker B: Pocong Indicator (Pulsing Red Reticle above resting Pocong)
    const monsterMarker = new THREE.Group();
    monsterMarker.name = 'PocongOverviewMarker';
    monsterMarker.position.set(mSpawnWx, markerY, mSpawnWz);

    const monsterRingMat = new THREE.MeshBasicMaterial({
      color: 0xe63946,
      wireframe: true,
    });
    const monsterRingGeo = new THREE.TorusGeometry(0.9, 0.09, 6, 16);
    monsterRingGeo.rotateX(Math.PI / 2);
    const monsterRing = new THREE.Mesh(monsterRingGeo, monsterRingMat);
    monsterMarker.add(monsterRing);

    const monsterCenterDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    monsterMarker.add(monsterCenterDot);

    rootGroup.add(monsterMarker);

    // Marker C: Exit Gate Marker (Green Beacon above exit gate)
    const exitMarker = new THREE.Group();
    exitMarker.name = 'ExitOverviewMarker';
    exitMarker.position.set(exitWx, markerY, exitWz);

    const exitBeaconMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const exitBeaconGeo = new THREE.OctahedronGeometry(0.75, 0);
    const exitBeacon = new THREE.Mesh(exitBeaconGeo, exitBeaconMat);
    exitMarker.add(exitBeacon);

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
    };
  }
}
