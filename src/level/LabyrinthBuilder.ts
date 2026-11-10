import * as THREE from 'three';
import { LevelDefinition } from './LevelData.ts';
import { TextureGenerator } from './TextureGenerator.ts';

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
    rootGroup.name = 'LabyrinthRoot';

    const { grid, gridWidth, gridHeight, cellSize, wallHeight } = level;
    const halfWidth = (gridWidth * cellSize) / 2;
    const halfHeight = (gridHeight * cellSize) / 2;

    // 1. Textures & Materials
    const wallTex = TextureGenerator.createWallTexture();
    const floorTex = TextureGenerator.createFloorTexture();
    const ceilTex = TextureGenerator.createCeilingTexture();
    const doorTex = TextureGenerator.createExitDoorTexture(false);

    // Wall texture repeats nicely on height
    wallTex.repeat.set(1, 1);
    floorTex.repeat.set(gridWidth, gridHeight);
    ceilTex.repeat.set(gridWidth, gridHeight);

    const wallMat = new THREE.MeshLambertMaterial({
      map: wallTex,
      roughness: 0.9,
    });

    const floorMat = new THREE.MeshLambertMaterial({
      map: floorTex,
      roughness: 0.95,
    });

    const ceilMat = new THREE.MeshLambertMaterial({
      map: ceilTex,
      roughness: 0.95,
    });

    // 2. Floor & Ceiling Meshes
    const totalW = gridWidth * cellSize;
    const totalH = gridHeight * cellSize;

    const floorGeo = new THREE.PlaneGeometry(totalW, totalH);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.position.set(0, 0, 0);
    floorMesh.receiveShadow = true;
    rootGroup.add(floorMesh);

    const ceilGeo = new THREE.PlaneGeometry(totalW, totalH);
    ceilGeo.rotateX(Math.PI / 2);
    const ceilMesh = new THREE.Mesh(ceilGeo, ceilMat);
    ceilMesh.position.set(0, wallHeight, 0);
    rootGroup.add(ceilMesh);

    // 3. Concrete Walls Geometry
    // We can create a merged geometry of all wall blocks for maximum rendering performance
    const wallBoxes: THREE.BoxGeometry[] = [];
    const wallMatrix = new THREE.Matrix4();
    const mergedGeos: THREE.BufferGeometry[] = [];

    const unitBox = new THREE.BoxGeometry(cellSize, wallHeight, cellSize);

    for (let gz = 0; gz < gridHeight; gz++) {
      for (let gx = 0; gx < gridWidth; gx++) {
        if (grid[gz][gx] === 1) {
          const wx = (gx + 0.5) * cellSize - halfWidth;
          const wz = (gz + 0.5) * cellSize - halfHeight;
          const cloned = unitBox.clone();
          cloned.translate(wx, wallHeight / 2, wz);
          mergedGeos.push(cloned);
        }
      }
    }

    // Merge geometries
    // If multiple geometries, merge buffers
    let mergedWallsGeo: THREE.BufferGeometry;
    if (mergedGeos.length > 0) {
      // Manual simple merge
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
    wallsMesh.name = 'LabyrinthWalls';
    wallsMesh.castShadow = true;
    wallsMesh.receiveShadow = true;
    rootGroup.add(wallsMesh);

    // 4. Calculate World Positions
    const pSpawnWx = (level.playerSpawn.x + 0.5) * cellSize - halfWidth;
    const pSpawnWz = (level.playerSpawn.z + 0.5) * cellSize - halfHeight;

    const mSpawnWx = (level.monsterSpawn.x + 0.5) * cellSize - halfWidth;
    const mSpawnWz = (level.monsterSpawn.z + 0.5) * cellSize - halfHeight;

    const exitWx = (level.exitDoor.x + 0.5) * cellSize - halfWidth;
    const exitWz = (level.exitDoor.z + 0.5) * cellSize - halfHeight;

    // 5. Exit Door Mesh & Trigger
    const exitDoorGroup = new THREE.Group();
    exitDoorGroup.name = 'ExitDoorGroup';
    exitDoorGroup.position.set(exitWx, 0, exitWz);

    const doorMat = new THREE.MeshLambertMaterial({
      map: doorTex,
      roughness: 0.8,
    });

    const doorGeo = new THREE.BoxGeometry(cellSize * 0.9, wallHeight * 0.85, 0.25);
    const doorMesh = new THREE.Mesh(doorGeo, doorMat);
    doorMesh.position.set(0, (wallHeight * 0.85) / 2, 0);
    exitDoorGroup.add(doorMesh);

    // Glowing green emergency light above exit door
    const exitSignGeo = new THREE.BoxGeometry(0.8, 0.3, 0.3);
    const exitSignMat = new THREE.MeshBasicMaterial({ color: 0x45f56c });
    const exitSignMesh = new THREE.Mesh(exitSignGeo, exitSignMat);
    exitSignMesh.position.set(0, wallHeight * 0.88, 0.2);
    exitDoorGroup.add(exitSignMesh);

    const exitPointLight = new THREE.PointLight(0x22c55e, 1.2, 7);
    exitPointLight.position.set(0, wallHeight * 0.88, 0.5);
    exitDoorGroup.add(exitPointLight);

    rootGroup.add(exitDoorGroup);

    // Escape Trigger Box (player enters within 1.5 units of exit door)
    const exitTriggerBox = new THREE.Box3(
      new THREE.Vector3(exitWx - cellSize * 0.6, 0, exitWz - cellSize * 0.6),
      new THREE.Vector3(exitWx + cellSize * 0.6, wallHeight, exitWz + cellSize * 0.6)
    );

    // 6. Atmospheric PS1 Lights
    // Dark moody ambient light
    const ambientLight = new THREE.AmbientLight(0x1a2028, 0.9);
    rootGroup.add(ambientLight);

    // Subtle overhead industrial lamps along main corridors
    const lightPositions = [
      { gx: 3, gz: 1 },
      { gx: 7, gz: 3 },
      { gx: 1, gz: 7 },
      { gx: 7, gz: 7 }, // Above monster chamber (dim flickering)
      { gx: 11, gz: 7 },
      { gx: 7, gz: 11 },
      { gx: 13, gz: 11 },
    ];

    lightPositions.forEach((pos, idx) => {
      const lx = (pos.gx + 0.5) * cellSize - halfWidth;
      const lz = (pos.gz + 0.5) * cellSize - halfHeight;

      const pLight = new THREE.PointLight(0xaad4f5, 0.75, 9, 1.8);
      pLight.position.set(lx, wallHeight - 0.3, lz);
      rootGroup.add(pLight);

      // Hanging fixture mesh
      const fixtureGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.2, 6);
      const fixtureMat = new THREE.MeshBasicMaterial({ color: 0xddeeff });
      const fixtureMesh = new THREE.Mesh(fixtureGeo, fixtureMat);
      fixtureMesh.position.set(lx, wallHeight - 0.1, lz);
      rootGroup.add(fixtureMesh);
    });

    // 7. PRE-GAME OVERVIEW 3D MARKERS (CRITICAL FEATURE)
    // Marker A: Player Start (Blue Arrow pointing in initial player direction)
    const playerMarker = new THREE.Group();
    playerMarker.name = 'PlayerOverviewMarker';
    playerMarker.position.set(pSpawnWx, wallHeight + 1.2, pSpawnWz);

    const arrowMat = new THREE.MeshBasicMaterial({ color: 0x2a8bf2 });
    const arrowShaftGeo = new THREE.CylinderGeometry(0.15, 0.15, 1.0, 8);
    const arrowShaft = new THREE.Mesh(arrowShaftGeo, arrowMat);
    arrowShaft.position.set(0, 0.5, 0);
    playerMarker.add(arrowShaft);

    const arrowHeadGeo = new THREE.ConeGeometry(0.45, 0.7, 8);
    const arrowHead = new THREE.Mesh(arrowHeadGeo, arrowMat);
    arrowHead.position.set(0, 0, 0);
    arrowHead.rotateX(Math.PI); // Pointing down towards spawn
    playerMarker.add(arrowHead);

    // Direction pointer
    const dirConeGeo = new THREE.ConeGeometry(0.3, 0.8, 8);
    const dirCone = new THREE.Mesh(dirConeGeo, new THREE.MeshBasicMaterial({ color: 0x60a5fa }));
    dirCone.position.set(0, 0.5, 0.8);
    dirCone.rotateX(Math.PI / 2);
    playerMarker.add(dirCone);

    rootGroup.add(playerMarker);

    // Marker B: Monster Indicator (Pulsing Red Reticle above sitting monster)
    const monsterMarker = new THREE.Group();
    monsterMarker.name = 'MonsterOverviewMarker';
    monsterMarker.position.set(mSpawnWx, wallHeight + 1.2, mSpawnWz);

    const monsterRingMat = new THREE.MeshBasicMaterial({
      color: 0xe63946,
      wireframe: true,
    });
    const monsterRingGeo = new THREE.TorusGeometry(0.8, 0.08, 6, 16);
    monsterRingGeo.rotateX(Math.PI / 2);
    const monsterRing = new THREE.Mesh(monsterRingGeo, monsterRingMat);
    monsterMarker.add(monsterRing);

    const monsterCenterDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.25, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    monsterMarker.add(monsterCenterDot);

    rootGroup.add(monsterMarker);

    // Marker C: Exit Door Marker (Green Beacon and EXIT sign)
    const exitMarker = new THREE.Group();
    exitMarker.name = 'ExitOverviewMarker';
    exitMarker.position.set(exitWx, wallHeight + 1.2, exitWz);

    const exitBeaconMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const exitBeaconGeo = new THREE.OctahedronGeometry(0.65, 0);
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
