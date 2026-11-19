import * as THREE from 'three';
import { TextureGenerator } from './TextureGenerator.ts';

export interface BanyanTreeOptions {
  height?: number;
  trunkRadius?: number;
  canopyRadius?: number;
  isSacredCenterpiece?: boolean;
  seed?: number;
}

export class BanyanTreeFactory {
  private static barkMat: THREE.MeshLambertMaterial | null = null;
  private static canopyMat: THREE.MeshLambertMaterial | null = null;
  private static aerialRootMat: THREE.MeshLambertMaterial | null = null;
  private static polengMat: THREE.MeshLambertMaterial | null = null;
  private static frangipaniBarkMat: THREE.MeshLambertMaterial | null = null;
  private static plumeriaFlowerMat: THREE.MeshBasicMaterial | null = null;

  public static getMaterials() {
    if (typeof document === 'undefined') {
      const dummy = new THREE.MeshBasicMaterial();
      return {
        bark: dummy,
        canopy: dummy,
        root: dummy,
        poleng: dummy,
        frangipaniBark: dummy,
        plumeria: dummy,
      };
    }

    if (!this.barkMat) {
      this.barkMat = new THREE.MeshLambertMaterial({
        map: TextureGenerator.createBanyanBarkTexture(),
      });
      this.canopyMat = new THREE.MeshLambertMaterial({
        map: TextureGenerator.createBanyanCanopyTexture(),
      });
      this.aerialRootMat = new THREE.MeshLambertMaterial({
        map: TextureGenerator.createBanyanBarkTexture(),
      });
      this.polengMat = new THREE.MeshLambertMaterial({
        map: TextureGenerator.createPolengClothTexture(),
        side: THREE.DoubleSide,
      });
      this.frangipaniBarkMat = new THREE.MeshLambertMaterial({
        color: 0x8a847a,
      });
      this.plumeriaFlowerMat = new THREE.MeshBasicMaterial({
        color: 0xfffae0,
        side: THREE.DoubleSide,
      });
    }

    return {
      bark: this.barkMat,
      canopy: this.canopyMat,
      root: this.aerialRootMat,
      poleng: this.polengMat,
      frangipaniBark: this.frangipaniBarkMat,
      plumeria: this.plumeriaFlowerMat,
    };
  }

  /**
   * Helper to merge buffer geometries for high-performance batched rendering
   */
  public static mergeGeometries(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
    if (geos.length === 0) return new THREE.BufferGeometry();
    let totalPos = 0;
    let totalNorm = 0;
    let totalUv = 0;
    let totalIndices = 0;

    geos.forEach((g) => {
      totalPos += g.attributes.position.array.length;
      if (g.attributes.normal) totalNorm += g.attributes.normal.array.length;
      if (g.attributes.uv) totalUv += g.attributes.uv.array.length;
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
      if (g.attributes.normal) normArr.set(g.attributes.normal.array, normOffset);
      if (g.attributes.uv) uvArr.set(g.attributes.uv.array, uvOffset);

      if (g.index) {
        for (let i = 0; i < g.index.array.length; i++) {
          indexArr[indexOffset + i] = g.index.array[i] + vertexOffset;
        }
        indexOffset += g.index.array.length;
      }

      posOffset += g.attributes.position.array.length;
      if (g.attributes.normal) normOffset += g.attributes.normal.array.length;
      if (g.attributes.uv) uvOffset += g.attributes.uv.array.length;
      vertexOffset += g.attributes.position.count;
    });

    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    if (totalNorm > 0) merged.setAttribute('normal', new THREE.BufferAttribute(normArr, 3));
    if (totalUv > 0) merged.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));
    if (totalIndices > 0) merged.setIndex(new THREE.BufferAttribute(indexArr, 1));
    return merged;
  }

  /**
   * Generates transformed geometries for a banyan tree, separated into wood/bark and canopy/leaves.
   */
  public static generateBanyanGeometries(options: BanyanTreeOptions = {}): {
    woodGeo: THREE.BufferGeometry;
    canopyGeo: THREE.BufferGeometry;
  } {
    const height = options.height ?? 8.2;
    const trunkRadius = options.trunkRadius ?? 0.85;
    const canopyRadius = options.canopyRadius ?? 4.8;
    const isSacred = !!options.isSacredCenterpiece;

    const woodGeos: THREE.BufferGeometry[] = [];
    const canopyGeos: THREE.BufferGeometry[] = [];
    const dummy = new THREE.Object3D();

    // 1. Central Girthy Knotted Trunk
    const trunkGeo = new THREE.CylinderGeometry(
      trunkRadius * 0.75,
      trunkRadius * 1.25,
      height * 0.65,
      8
    );
    trunkGeo.translate(0, (height * 0.65) / 2, 0);
    woodGeos.push(trunkGeo);

    // 2. Surrounding Fused Buttress Columns
    const buttressCount = isSacred ? 6 : 4;
    for (let i = 0; i < buttressCount; i++) {
      const angle = (i / buttressCount) * Math.PI * 2 + 0.2;
      const bRad = trunkRadius * 0.32;
      const bDist = trunkRadius * 0.82;
      const bGeo = new THREE.CylinderGeometry(bRad * 0.7, bRad * 1.3, height * 0.6, 6);
      dummy.position.set(
        Math.cos(angle) * bDist,
        (height * 0.6) / 2,
        Math.sin(angle) * bDist
      );
      dummy.rotation.set(0, 0, (Math.random() - 0.5) * 0.08);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      bGeo.applyMatrix4(dummy.matrix);
      woodGeos.push(bGeo);
    }

    // 3. Sprawling Lateral Branches & Hanging Aerial Roots
    const branchCount = isSacred ? 6 : 5;
    const branchBaseY = height * 0.58;

    for (let i = 0; i < branchCount; i++) {
      const angle = (i / branchCount) * Math.PI * 2 + (i % 2) * 0.3;
      const bLength = canopyRadius * 0.85;
      const bThickness = trunkRadius * 0.35;

      // Diagonal / horizontal limb
      const branchGeo = new THREE.CylinderGeometry(bThickness * 0.5, bThickness, bLength, 6);
      const reachX = Math.cos(angle) * (bLength * 0.45);
      const reachZ = Math.sin(angle) * (bLength * 0.45);
      dummy.position.set(reachX, branchBaseY + 0.6, reachZ);
      dummy.rotation.set(0, -angle + Math.PI / 2, Math.PI / 3.2);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      branchGeo.applyMatrix4(dummy.matrix);
      woodGeos.push(branchGeo);

      // Aerial Prop Roots
      const rootCount = isSacred ? 3 : 2;
      for (let r = 0; r < rootCount; r++) {
        const rootFrac = 0.45 + r * 0.35;
        const rootX = Math.cos(angle) * (bLength * rootFrac);
        const rootZ = Math.sin(angle) * (bLength * rootFrac);
        const rootTopY = branchBaseY + 1.2 - r * 0.3;

        const rootGeo = new THREE.CylinderGeometry(0.045, 0.065, rootTopY, 5);
        dummy.position.set(rootX, rootTopY / 2, rootZ);
        dummy.rotation.set(0, 0, (Math.random() - 0.5) * 0.04);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        rootGeo.applyMatrix4(dummy.matrix);
        woodGeos.push(rootGeo);
      }

      // Clustered Canopy Dome on branch tip
      const tipX = Math.cos(angle) * (bLength * 0.9);
      const tipZ = Math.sin(angle) * (bLength * 0.9);
      const domeRadius = canopyRadius * 0.45;
      const domeGeo = new THREE.DodecahedronGeometry(domeRadius, 1);
      dummy.position.set(tipX, branchBaseY + 1.6, tipZ);
      dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1.2, 0.75, 1.2);
      dummy.updateMatrix();
      domeGeo.applyMatrix4(dummy.matrix);
      canopyGeos.push(domeGeo);
    }

    // 4. Massive Upper Central Canopy Crown
    const centerCrownGeo = new THREE.DodecahedronGeometry(canopyRadius * 0.65, 1);
    dummy.position.set(0, height * 0.82, 0);
    dummy.rotation.set(0, 0, 0);
    dummy.scale.set(1.4, 0.85, 1.4);
    dummy.updateMatrix();
    centerCrownGeo.applyMatrix4(dummy.matrix);
    canopyGeos.push(centerCrownGeo);

    return {
      woodGeo: this.mergeGeometries(woodGeos),
      canopyGeo: this.mergeGeometries(canopyGeos),
    };
  }

  /**
   * Creates an authentic Indonesian Banyan Tree (Pohon Beringin) with merged
   * geometry meshes for maximum rendering performance.
   */
  public static createBanyanTree(options: BanyanTreeOptions = {}): THREE.Group {
    const group = new THREE.Group();
    group.name = 'BanyanTree';

    const height = options.height ?? 8.2;
    const trunkRadius = options.trunkRadius ?? 0.85;
    const isSacred = !!options.isSacredCenterpiece;
    const mats = this.getMaterials();

    const { woodGeo, canopyGeo } = this.generateBanyanGeometries(options);

    const woodMesh = new THREE.Mesh(woodGeo, mats.bark);
    woodMesh.name = 'BanyanWood';
    group.add(woodMesh);

    const canopyMesh = new THREE.Mesh(canopyGeo, mats.canopy);
    canopyMesh.name = 'BanyanCanopy';
    group.add(canopyMesh);

    // Sacred Centerpiece Trim (Kain Poleng + Sesajen + Dupa Mistis)
    if (isSacred) {
      // Sacred checkered cloth band wrapped tightly around banyan trunk
      const polengGeo = new THREE.CylinderGeometry(
        trunkRadius * 1.16,
        trunkRadius * 1.28,
        1.25,
        10,
        1,
        true
      );
      const polengMesh = new THREE.Mesh(polengGeo, mats.poleng);
      polengMesh.position.y = 1.35;
      group.add(polengMesh);

      // Yellow/gold sash cord binding the cloth
      const sashGeo = new THREE.TorusGeometry(trunkRadius * 1.22, 0.035, 6, 12);
      const sashMat = new THREE.MeshBasicMaterial({ color: 0xeab308 });
      const sashMesh = new THREE.Mesh(sashGeo, sashMat);
      sashMesh.rotation.x = Math.PI / 2;
      sashMesh.position.y = 1.45;
      group.add(sashMesh);

      // Bamboo Sesajen Tray (Tampah Sesajen di bawah pohon)
      const trayGeo = new THREE.CylinderGeometry(0.38, 0.32, 0.08, 10);
      const trayMat = new THREE.MeshLambertMaterial({ color: 0x5a4428 });
      const tray = new THREE.Mesh(trayGeo, trayMat);
      tray.position.set(trunkRadius + 0.35, 0.04, 0.25);
      group.add(tray);

      // Incense holder & offerings on tray
      const incenseMat = new THREE.MeshBasicMaterial({ color: 0x991b1b });
      const incenseGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.35, 4);
      const incense = new THREE.Mesh(incenseGeo, incenseMat);
      incense.position.set(trunkRadius + 0.35, 0.22, 0.25);
      incense.rotation.z = 0.15;
      group.add(incense);

      // Glowing incense ember light
      const emberLight = new THREE.PointLight(0xff6622, 0.8, 4.5);
      emberLight.position.set(trunkRadius + 0.35, 0.45, 0.25);
      group.add(emberLight);
    }

    return group;
  }

  /**
   * Creates an Indonesian Cemetery Frangipani Tree (Pohon Kamboja Kuburan)
   * with crooked pale grayish wood, sparse twisted forks, and white flowers.
   */
  public static createFrangipaniTree(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'FrangipaniTree';
    const mats = this.getMaterials();

    // Crooked trunk
    const trunkGeo = new THREE.CylinderGeometry(0.18, 0.26, 2.2, 6);
    const trunk = new THREE.Mesh(trunkGeo, mats.frangipaniBark);
    trunk.position.set(0, 1.1, 0);
    trunk.rotation.z = 0.12;
    group.add(trunk);

    // Fork 1 (reaching north-west)
    const fork1Geo = new THREE.CylinderGeometry(0.11, 0.16, 1.6, 5);
    const fork1 = new THREE.Mesh(fork1Geo, mats.frangipaniBark);
    fork1.position.set(-0.35, 2.4, -0.2);
    fork1.rotation.z = Math.PI / 4;
    fork1.rotation.y = 0.4;
    group.add(fork1);

    // Fork 2 (reaching south-east)
    const fork2Geo = new THREE.CylinderGeometry(0.10, 0.15, 1.7, 5);
    const fork2 = new THREE.Mesh(fork2Geo, mats.frangipaniBark);
    fork2.position.set(0.42, 2.5, 0.25);
    fork2.rotation.z = -Math.PI / 4.5;
    fork2.rotation.y = -0.5;
    group.add(fork2);

    // Sparse leafy foliage cluster on tip 1
    const leafGeo1 = new THREE.DodecahedronGeometry(0.75, 0);
    const leaves1 = new THREE.Mesh(leafGeo1, mats.canopy);
    leaves1.position.set(-0.85, 3.1, -0.4);
    group.add(leaves1);

    // Sparse leafy foliage cluster on tip 2
    const leafGeo2 = new THREE.DodecahedronGeometry(0.85, 0);
    const leaves2 = new THREE.Mesh(leafGeo2, mats.canopy);
    leaves2.position.set(0.95, 3.2, 0.5);
    group.add(leaves2);

    // White plumeria blossoms on tips
    const flowerGeo = new THREE.CircleGeometry(0.14, 5);
    const flower1 = new THREE.Mesh(flowerGeo, mats.plumeria);
    flower1.position.set(-0.85, 3.4, -0.3);
    flower1.rotation.x = -Math.PI / 3;
    group.add(flower1);

    const flower2 = new THREE.Mesh(flowerGeo, mats.plumeria);
    flower2.position.set(0.95, 3.5, 0.6);
    flower2.rotation.x = -Math.PI / 4;
    group.add(flower2);

    return group;
  }
}
