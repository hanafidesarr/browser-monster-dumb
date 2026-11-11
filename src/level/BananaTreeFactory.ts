import * as THREE from 'three';
import { TextureGenerator } from './TextureGenerator.ts';

export class BananaTreeFactory {
  private static trunkMat: THREE.MeshLambertMaterial | null = null;
  private static leafMat: THREE.MeshLambertMaterial | null = null;
  private static driedLeafMat: THREE.MeshLambertMaterial | null = null;
  private static budMat: THREE.MeshLambertMaterial | null = null;
  private static fernMat: THREE.MeshLambertMaterial | null = null;

  private static getMaterials() {
    if (!this.trunkMat) {
      this.trunkMat = new THREE.MeshLambertMaterial({
        map: TextureGenerator.createBananaTrunkTexture(),
        roughness: 0.85,
      });

      this.leafMat = new THREE.MeshLambertMaterial({
        map: TextureGenerator.createBananaLeafTexture(),
        side: THREE.DoubleSide,
        roughness: 0.75,
      });

      this.driedLeafMat = new THREE.MeshLambertMaterial({
        map: TextureGenerator.createDriedLeafTexture(),
        side: THREE.DoubleSide,
        roughness: 0.9,
      });

      this.budMat = new THREE.MeshLambertMaterial({
        map: TextureGenerator.createBananaBudTexture(),
        roughness: 0.7,
      });

      // Fern / undergrowth material
      const fernTex = TextureGenerator.createBananaLeafTexture();
      this.fernMat = new THREE.MeshLambertMaterial({
        map: fernTex,
        side: THREE.DoubleSide,
        color: 0x5a883a,
        roughness: 0.8,
      });
    }

    return {
      trunk: this.trunkMat,
      leaf: this.leafMat,
      driedLeaf: this.driedLeafMat,
      bud: this.budMat,
      fern: this.fernMat,
    };
  }

  // Generate an arching, drooping banana leaf geometry
  public static createLeafGeometry(
    length: number = 2.4,
    maxWidth: number = 0.65,
    droopAmount: number = 1.15
  ): THREE.BufferGeometry {
    const segments = 7;
    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      // Arc along +Z (length) and drooping parabolic along -Y
      const z = t * length;
      const y = -Math.pow(t, 1.8) * droopAmount + Math.sin(t * Math.PI) * 0.22;

      // Width profile: narrow petiole at base, wide paddle in middle, tapered tip
      let width = 0;
      if (t < 0.75) {
        width = maxWidth * Math.sin((t / 0.75) * Math.PI * 0.5);
      } else {
        width = maxWidth * (1 - (t - 0.75) / 0.25);
      }

      // Inverted V-droop (wings droop slightly relative to central midrib)
      const wingDroop = 0.08 * (width / maxWidth);

      // Vertex 0: Left wing (-X)
      vertices.push(-width * 0.5, y - wingDroop, z);
      uvs.push(0, t);

      // Vertex 1: Center midrib (0)
      vertices.push(0, y, z);
      uvs.push(0.5, t);

      // Vertex 2: Right wing (+X)
      vertices.push(width * 0.5, y - wingDroop, z);
      uvs.push(1, t);
    }

    for (let i = 0; i < segments; i++) {
      const rowA = i * 3;
      const rowB = (i + 1) * 3;

      // Left quad
      indices.push(rowA, rowB, rowB + 1);
      indices.push(rowA, rowB + 1, rowA + 1);

      // Right quad
      indices.push(rowA + 1, rowB + 1, rowB + 2);
      indices.push(rowA + 1, rowB + 2, rowA + 2);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  // Create a single 3D Banana Tree
  public static createBananaTree(options: {
    height?: number;
    trunkRadius?: number;
    leanX?: number;
    leanZ?: number;
    hasBud?: boolean;
    seed?: number;
  } = {}): THREE.Group {
    const mats = this.getMaterials();
    const treeGroup = new THREE.Group();
    treeGroup.name = 'BananaTree';

    const h = options.height ?? 3.2;
    const rBase = options.trunkRadius ?? 0.22;
    const rTop = rBase * 0.55;
    const leanX = options.leanX ?? (Math.random() - 0.5) * 0.15;
    const leanZ = options.leanZ ?? (Math.random() - 0.5) * 0.15;
    const hasBud = options.hasBud ?? Math.random() > 0.4;

    // 1. Tapered Trunk (Batang / Gedebog Pisang)
    const trunkGeo = new THREE.CylinderGeometry(rTop, rBase, h, 7, 3);
    // Skew trunk slightly for natural lean
    const posAttr = trunkGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const py = posAttr.getY(i) + h / 2; // 0 to h
      const t = py / h;
      posAttr.setX(i, posAttr.getX(i) + leanX * t * t);
      posAttr.setZ(i, posAttr.getZ(i) + leanZ * t * t);
    }
    trunkGeo.computeVertexNormals();

    const trunkMesh = new THREE.Mesh(trunkGeo, mats.trunk);
    trunkMesh.position.y = h / 2;
    trunkMesh.castShadow = true;
    trunkMesh.receiveShadow = true;
    treeGroup.add(trunkMesh);

    // Crown position at top of trunk
    const crownX = leanX;
    const crownY = h - 0.15;
    const crownZ = leanZ;

    // 2. Arching Banana Leaves (Crown)
    const numLeaves = 7 + Math.floor(Math.random() * 3);
    const leafGeo = this.createLeafGeometry(h * 0.72, rBase * 2.8, 0.95);

    for (let i = 0; i < numLeaves; i++) {
      const leafMesh = new THREE.Mesh(leafGeo, mats.leaf);
      leafMesh.castShadow = true;
      leafMesh.receiveShadow = true;

      // Evenly distribute azimuth angle with small organic jitter
      const angle = (i / numLeaves) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      // Elevation angle: younger leaves stand higher, outer leaves droop more
      const elev = 0.25 + (i % 3) * 0.15 + (Math.random() - 0.5) * 0.1;
      const roll = (Math.random() - 0.5) * 0.25;

      leafMesh.position.set(crownX, crownY, crownZ);
      leafMesh.rotation.order = 'YXZ';
      leafMesh.rotation.y = angle;
      leafMesh.rotation.x = elev;
      leafMesh.rotation.z = roll;

      treeGroup.add(leafMesh);
    }

    // 3. Dried drooping leaves (Klaras) hanging down along trunk
    const driedGeo = this.createLeafGeometry(h * 0.55, rBase * 2.2, 1.6);
    const numDried = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < numDried; i++) {
      const driedMesh = new THREE.Mesh(driedGeo, mats.driedLeaf);
      driedMesh.castShadow = true;
      driedMesh.position.set(crownX, crownY - 0.25, crownZ);
      driedMesh.rotation.order = 'YXZ';
      driedMesh.rotation.y = Math.random() * Math.PI * 2;
      driedMesh.rotation.x = 0.95 + Math.random() * 0.3; // Hanging almost straight down
      treeGroup.add(driedMesh);
    }

    // 4. Banana Heart / Blossom (Jantung Pisang)
    if (hasBud) {
      const budStalk = new THREE.Group();
      budStalk.position.set(crownX, crownY, crownZ);
      budStalk.rotation.y = Math.random() * Math.PI * 2;

      // Curved stalk
      const stalkGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.7, 5);
      stalkGeo.rotateX(0.7);
      const stalkMesh = new THREE.Mesh(stalkGeo, mats.trunk);
      stalkMesh.position.set(0, -0.2, 0.2);
      budStalk.add(stalkMesh);

      // Teardrop bud
      const budGeo = new THREE.ConeGeometry(0.12, 0.38, 6);
      budGeo.rotateX(Math.PI); // Pointing downward
      const budMesh = new THREE.Mesh(budGeo, mats.bud);
      budMesh.position.set(0, -0.5, 0.38);
      budStalk.add(budMesh);

      treeGroup.add(budStalk);
    }

    return treeGroup;
  }

  // Create a dense clump of banana trees for an obstacle tile
  public static createObstacleCluster(cellSize: number, seed: number): THREE.Group {
    const cluster = new THREE.Group();
    cluster.name = 'BananaCluster';

    // Pseudorandom based on cell seed
    const pseudo = (offset: number) => {
      const s = Math.sin(seed * 997.3 + offset * 113.1);
      return s - Math.floor(s);
    };

    // 1. Tall Mother Tree (center-dominant)
    const motherTree = this.createBananaTree({
      height: 3.1 + pseudo(1) * 0.7,
      trunkRadius: 0.22 + pseudo(2) * 0.05,
      leanX: (pseudo(3) - 0.5) * 0.2,
      leanZ: (pseudo(4) - 0.5) * 0.2,
      hasBud: true,
    });
    motherTree.position.set((pseudo(5) - 0.5) * cellSize * 0.25, 0, (pseudo(6) - 0.5) * cellSize * 0.25);
    motherTree.rotation.y = pseudo(7) * Math.PI * 2;
    cluster.add(motherTree);

    // 2. Medium Banana Tree (growing beside mother)
    const medTree = this.createBananaTree({
      height: 2.3 + pseudo(8) * 0.5,
      trunkRadius: 0.17 + pseudo(9) * 0.04,
      leanX: (pseudo(10) - 0.5) * 0.25,
      leanZ: (pseudo(11) - 0.5) * 0.25,
      hasBud: pseudo(12) > 0.5,
    });
    const medAngle = pseudo(13) * Math.PI * 2;
    const medDist = cellSize * 0.24 + pseudo(14) * cellSize * 0.15;
    medTree.position.set(Math.cos(medAngle) * medDist, 0, Math.sin(medAngle) * medDist);
    medTree.rotation.y = pseudo(15) * Math.PI * 2;
    cluster.add(medTree);

    // 3. Small Sapling / Shoot (Anak Pisang)
    const sapling = this.createBananaTree({
      height: 1.3 + pseudo(16) * 0.5,
      trunkRadius: 0.11 + pseudo(17) * 0.03,
      leanX: (pseudo(18) - 0.5) * 0.2,
      leanZ: (pseudo(19) - 0.5) * 0.2,
      hasBud: false,
    });
    const sapAngle = medAngle + Math.PI * 0.75 + (pseudo(20) - 0.5) * 0.5;
    const sapDist = cellSize * 0.26 + pseudo(21) * cellSize * 0.14;
    sapling.position.set(Math.cos(sapAngle) * sapDist, 0, Math.sin(sapAngle) * sapDist);
    sapling.rotation.y = pseudo(22) * Math.PI * 2;
    cluster.add(sapling);

    // 4. Wild jungle ferns at the base
    const mats = this.getMaterials();
    const fernGeo = this.createLeafGeometry(0.85, 0.35, 0.45);
    for (let f = 0; f < 3; f++) {
      const fern = new THREE.Mesh(fernGeo, mats.fern);
      fern.position.set((pseudo(23 + f) - 0.5) * cellSize * 0.4, 0.05, (pseudo(26 + f) - 0.5) * cellSize * 0.4);
      fern.rotation.y = pseudo(29 + f) * Math.PI * 2;
      fern.rotation.x = 0.45 + pseudo(32 + f) * 0.3;
      cluster.add(fern);
    }

    return cluster;
  }
}
