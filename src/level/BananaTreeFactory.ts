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
        roughness: 0.82,
      });

      this.leafMat = new THREE.MeshLambertMaterial({
        map: TextureGenerator.createBananaLeafTexture(),
        side: THREE.DoubleSide,
        roughness: 0.7,
      });

      this.driedLeafMat = new THREE.MeshLambertMaterial({
        map: TextureGenerator.createDriedLeafTexture(),
        side: THREE.DoubleSide,
        roughness: 0.88,
      });

      this.budMat = new THREE.MeshLambertMaterial({
        map: TextureGenerator.createBananaBudTexture(),
        roughness: 0.65,
      });

      this.fernMat = new THREE.MeshLambertMaterial({
        map: TextureGenerator.createBananaLeafTexture(),
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
    length: number = 3.6,
    maxWidth: number = 0.85,
    droopAmount: number = 1.3
  ): THREE.BufferGeometry {
    const segments = 8;
    const vertices: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      // Arc along +Z (length) and drooping parabolic along -Y
      const z = t * length;
      const y = -Math.pow(t, 1.8) * droopAmount + Math.sin(t * Math.PI) * 0.35;

      // Width profile: narrow petiole at base, wide paddle in middle, tapered tip
      let width = 0;
      if (t < 0.75) {
        width = maxWidth * Math.sin((t / 0.75) * Math.PI * 0.5);
      } else {
        width = maxWidth * (1 - (t - 0.75) / 0.25);
      }

      // Inverted V-droop (wings droop slightly relative to central midrib)
      const wingDroop = 0.1 * (width / maxWidth);

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

  // Create a tall, majestic 3D Banana Tree (Height 5.8m - 7.5m, high umbrella canopy)
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
    treeGroup.name = 'TallBananaTree';

    // Tall height so player runs freely under the canopy
    const h = options.height ?? 6.5;
    const rBase = options.trunkRadius ?? 0.32;
    const rTop = rBase * 0.55;
    const leanX = options.leanX ?? (Math.random() - 0.5) * 0.25;
    const leanZ = options.leanZ ?? (Math.random() - 0.5) * 0.25;
    const hasBud = options.hasBud ?? Math.random() > 0.35;

    // 1. Tall Tapered Trunk (Batang Gedebog Pisang)
    const trunkGeo = new THREE.CylinderGeometry(rTop, rBase, h, 8, 4);
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

    // Crown position at very top of tall trunk
    const crownX = leanX;
    const crownY = h - 0.2;
    const crownZ = leanZ;

    // 2. High Arching Banana Leaves (Umbrella Canopy)
    const numLeaves = 8 + Math.floor(Math.random() * 3);
    const leafGeo = this.createLeafGeometry(h * 0.58, rBase * 2.6, 1.4);

    for (let i = 0; i < numLeaves; i++) {
      const leafMesh = new THREE.Mesh(leafGeo, mats.leaf);
      leafMesh.castShadow = true;
      leafMesh.receiveShadow = true;

      // Evenly distribute azimuth angle with small organic jitter
      const angle = (i / numLeaves) * Math.PI * 2 + (Math.random() - 0.5) * 0.25;
      // High elevation angle: branches out and gently droops high above player head
      const elev = 0.22 + (i % 3) * 0.12 + (Math.random() - 0.5) * 0.1;
      const roll = (Math.random() - 0.5) * 0.2;

      leafMesh.position.set(crownX, crownY, crownZ);
      leafMesh.rotation.order = 'YXZ';
      leafMesh.rotation.y = angle;
      leafMesh.rotation.x = elev;
      leafMesh.rotation.z = roll;

      treeGroup.add(leafMesh);
    }

    // 3. Dried drooping leaves (Klaras) hanging down along upper trunk
    const driedGeo = this.createLeafGeometry(h * 0.42, rBase * 2.0, 1.8);
    const numDried = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < numDried; i++) {
      const driedMesh = new THREE.Mesh(driedGeo, mats.driedLeaf);
      driedMesh.castShadow = true;
      driedMesh.position.set(crownX, crownY - 0.4, crownZ);
      driedMesh.rotation.order = 'YXZ';
      driedMesh.rotation.y = Math.random() * Math.PI * 2;
      driedMesh.rotation.x = 1.05 + Math.random() * 0.25; // Hanging straight down high up
      treeGroup.add(driedMesh);
    }

    // 4. Banana Heart / Blossom (Jantung Pisang)
    if (hasBud) {
      const budStalk = new THREE.Group();
      budStalk.position.set(crownX, crownY, crownZ);
      budStalk.rotation.y = Math.random() * Math.PI * 2;

      // Curved stalk
      const stalkGeo = new THREE.CylinderGeometry(0.05, 0.06, 1.0, 5);
      stalkGeo.rotateX(0.7);
      const stalkMesh = new THREE.Mesh(stalkGeo, mats.trunk);
      stalkMesh.position.set(0, -0.3, 0.3);
      budStalk.add(stalkMesh);

      // Teardrop bud
      const budGeo = new THREE.ConeGeometry(0.16, 0.48, 6);
      budGeo.rotateX(Math.PI);
      const budMesh = new THREE.Mesh(budGeo, mats.bud);
      budMesh.position.set(0, -0.75, 0.55);
      budStalk.add(budMesh);

      treeGroup.add(budStalk);
    }

    return treeGroup;
  }

  // Create a single tall banana tree obstacle (reduced count, open plantation feel)
  public static createObstacleCluster(cellSize: number, seed: number): THREE.Group {
    const cluster = new THREE.Group();
    cluster.name = 'BananaTreeObstacle';

    const pseudo = (offset: number) => {
      const s = Math.sin(seed * 997.3 + offset * 113.1);
      return s - Math.floor(s);
    };

    // 1. One Grand Tall Banana Tree per obstacle node (height 6.0m - 7.5m)
    const tree = this.createBananaTree({
      height: 6.2 + pseudo(1) * 1.3,
      trunkRadius: 0.30 + pseudo(2) * 0.08,
      leanX: (pseudo(3) - 0.5) * 0.35,
      leanZ: (pseudo(4) - 0.5) * 0.35,
      hasBud: pseudo(5) > 0.3,
    });
    // Slight organic offset within cell
    tree.position.set((pseudo(6) - 0.5) * cellSize * 0.2, 0, (pseudo(7) - 0.5) * cellSize * 0.2);
    tree.rotation.y = pseudo(8) * Math.PI * 2;
    cluster.add(tree);

    // 2. Small young shoot at tree base (35% chance)
    if (pseudo(9) > 0.65) {
      const shoot = this.createBananaTree({
        height: 1.6 + pseudo(10) * 0.6,
        trunkRadius: 0.12,
        leanX: (pseudo(11) - 0.5) * 0.2,
        leanZ: (pseudo(12) - 0.5) * 0.2,
        hasBud: false,
      });
      shoot.position.set(tree.position.x + 0.45, 0, tree.position.z + 0.35);
      shoot.rotation.y = pseudo(13) * Math.PI * 2;
      cluster.add(shoot);
    }

    // 3. Small fern tuft at the base of the trunk
    const mats = this.getMaterials();
    const fernGeo = this.createLeafGeometry(0.9, 0.35, 0.4);
    for (let f = 0; f < 2; f++) {
      const fern = new THREE.Mesh(fernGeo, mats.fern);
      fern.position.set(tree.position.x + (f === 0 ? 0.3 : -0.3), 0.05, tree.position.z + (f === 0 ? 0.2 : -0.2));
      fern.rotation.y = (f * Math.PI) + pseudo(14 + f) * 0.5;
      fern.rotation.x = 0.5;
      cluster.add(fern);
    }

    return cluster;
  }
}
