import * as THREE from 'three';
import { WeaponId } from './WeaponData.ts';

export class WeaponModelFactory {
  // Shared retro materials & textures cache
  private static cachedTextures: Map<string, THREE.CanvasTexture> = new Map();

  private static getOrCreateTexture(key: string, drawFn: (ctx: CanvasRenderingContext2D, size: number) => void): THREE.CanvasTexture {
    if (this.cachedTextures.has(key)) {
      return this.cachedTextures.get(key)!;
    }
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    drawFn(ctx, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.colorSpace = THREE.SRGBColorSpace;
    this.cachedTextures.set(key, texture);
    return texture;
  }

  // 1. Baseball Bat
  private static createBatModel(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'BatMesh';

    const tex = this.getOrCreateTexture('bat', (ctx, size) => {
      ctx.fillStyle = '#b88950';
      ctx.fillRect(0, 0, size, size);
      for (let i = 0; i < size; i += 4) {
        ctx.fillStyle = i % 8 === 0 ? '#996c38' : '#c99a5e';
        ctx.fillRect(0, i, size, 2);
      }
      ctx.fillStyle = '#1c1b18';
      ctx.fillRect(0, size - 40, size, 40);
    });

    const mat = new THREE.MeshLambertMaterial({ map: tex, roughness: 0.7 });
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.45, 8), mat);
    barrel.position.set(0, 0.25, 0);
    group.add(barrel);

    const topKnob = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), mat);
    topKnob.position.set(0, 0.47, 0);
    group.add(topKnob);

    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.02, 0.35, 8), mat);
    handle.position.set(0, -0.15, 0);
    group.add(handle);

    const buttKnob = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 8), mat);
    buttKnob.position.set(0, -0.33, 0);
    group.add(buttKnob);

    return group;
  }

  // 2. Advertising Billboard / Signboard
  private static createSignboardModel(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'SignboardMesh';

    const poleMat = new THREE.MeshLambertMaterial({ color: 0x5a636e, roughness: 0.8 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.85, 8), poleMat);
    pole.position.set(0, 0, 0);
    group.add(pole);

    const boardTex = this.getOrCreateTexture('signboard', (ctx, size) => {
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = '#fef08a';
      ctx.lineWidth = 6;
      ctx.strokeRect(4, 4, size - 8, size - 8);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 22px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('PROMO', size / 2, 45);
      ctx.font = 'bold 20px monospace';
      ctx.fillStyle = '#fef08a';
      ctx.fillText('WARUNG', size / 2, 80);
      ctx.font = '14px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('DISCOUNT', size / 2, 108);
    });

    const boardMat = new THREE.MeshLambertMaterial({ map: boardTex, roughness: 0.6 });
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.42, 0.035), boardMat);
    board.position.set(0, 0.35, 0);
    group.add(board);

    return group;
  }

  // 3. Frying Pan
  private static createFryingPanModel(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'FryingPanMesh';

    const ironTex = this.getOrCreateTexture('pan_iron', (ctx, size) => {
      ctx.fillStyle = '#26282b';
      ctx.fillRect(0, 0, size, size);
      for (let x = 0; x < size; x += 4) {
        for (let y = 0; y < size; y += 4) {
          if (Math.random() > 0.6) {
            ctx.fillStyle = '#3a3d42';
            ctx.fillRect(x, y, 3, 3);
          }
        }
      }
    });

    const ironMat = new THREE.MeshLambertMaterial({ map: ironTex, roughness: 0.5 });

    // Round pan base
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.16, 0.05, 12), ironMat);
    base.position.set(0, 0.22, 0);
    base.rotateX(Math.PI / 2);
    group.add(base);

    // Pan handle
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.016, 0.32, 8), ironMat);
    handle.position.set(0, -0.06, 0);
    group.add(handle);

    // Grip hole
    const holeRing = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.006, 6, 8), ironMat);
    holeRing.position.set(0, -0.22, 0);
    group.add(holeRing);

    return group;
  }

  // 4. Giant Slipper
  private static createSlipperModel(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'GiantSlipperMesh';

    const soleTex = this.getOrCreateTexture('slipper_sole', (ctx, size) => {
      ctx.fillStyle = '#0284c7'; // Sky blue
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(0, size * 0.4, size, size * 0.2);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, size * 0.85, size, size * 0.15); // White sole base
    });

    const soleMat = new THREE.MeshLambertMaterial({ map: soleTex, roughness: 0.7 });
    const sole = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.55, 0.06), soleMat);
    sole.position.set(0, 0.12, 0);
    group.add(sole);

    // Rubber V-straps (White straps)
    const strapMat = new THREE.MeshLambertMaterial({ color: 0xffffff, roughness: 0.5 });
    const strapL = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.22, 8), strapMat);
    strapL.position.set(-0.06, 0.16, 0.05);
    strapL.rotation.set(-0.3, 0, 0.45);
    group.add(strapL);

    const strapR = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.22, 8), strapMat);
    strapR.position.set(0.06, 0.16, 0.05);
    strapR.rotation.set(-0.3, 0, -0.45);
    group.add(strapR);

    // Center toe plug
    const toePlug = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.06, 8), strapMat);
    toePlug.position.set(0, 0.26, 0.04);
    group.add(toePlug);

    return group;
  }

  // 5. Wooden Chair
  private static createChairModel(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'WoodenChairMesh';

    const woodTex = this.getOrCreateTexture('chair_wood', (ctx, size) => {
      ctx.fillStyle = '#78350f';
      ctx.fillRect(0, 0, size, size);
      for (let y = 0; y < size; y += 6) {
        ctx.fillStyle = y % 12 === 0 ? '#92400e' : '#652b0b';
        ctx.fillRect(0, y, size, 3);
      }
    });

    const woodMat = new THREE.MeshLambertMaterial({ map: woodTex, roughness: 0.8 });

    // Seat
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.04, 0.38), woodMat);
    seat.position.set(0, 0.15, 0);
    group.add(seat);

    // 4 Legs
    const legGeo = new THREE.CylinderGeometry(0.02, 0.016, 0.38, 6);
    const legOffsets = [
      [-0.15, -0.15],
      [0.15, -0.15],
      [-0.15, 0.15],
      [0.15, 0.15],
    ];
    legOffsets.forEach(([ox, oz]) => {
      const leg = new THREE.Mesh(legGeo, woodMat);
      leg.position.set(ox, -0.04, oz);
      group.add(leg);
    });

    // Backrest posts & slats
    const postGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.38, 6);
    const postL = new THREE.Mesh(postGeo, woodMat);
    postL.position.set(-0.15, 0.34, -0.15);
    group.add(postL);

    const postR = new THREE.Mesh(postGeo, woodMat);
    postR.position.set(0.15, 0.34, -0.15);
    group.add(postR);

    const slatGeo = new THREE.BoxGeometry(0.34, 0.06, 0.02);
    const slat1 = new THREE.Mesh(slatGeo, woodMat);
    slat1.position.set(0, 0.44, -0.15);
    group.add(slat1);

    const slat2 = new THREE.Mesh(slatGeo, woodMat);
    slat2.position.set(0, 0.32, -0.15);
    group.add(slat2);

    return group;
  }

  // 6. Broom
  private static createBroomModel(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'BroomMesh';

    const bambooMat = new THREE.MeshLambertMaterial({ color: 0xd4a373, roughness: 0.7 });
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.85, 8), bambooMat);
    handle.position.set(0, -0.05, 0);
    group.add(handle);

    // Bristle bundle (Sapu ijuk dark fiber)
    const bristleTex = this.getOrCreateTexture('broom_bristle', (ctx, size) => {
      ctx.fillStyle = '#292524';
      ctx.fillRect(0, 0, size, size);
      for (let x = 0; x < size; x += 3) {
        ctx.fillStyle = x % 6 === 0 ? '#44403c' : '#1c1917';
        ctx.fillRect(x, 0, 2, size);
      }
    });

    const bristleMat = new THREE.MeshLambertMaterial({ map: bristleTex, roughness: 0.9 });
    const bristles = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.42, 8), bristleMat);
    bristles.position.set(0, 0.42, 0);
    group.add(bristles);

    // Binding wrap
    const wrapMat = new THREE.MeshLambertMaterial({ color: 0xdc2626 });
    const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.05, 8), wrapMat);
    wrap.position.set(0, 0.28, 0);
    group.add(wrap);

    return group;
  }

  // 7. Giant Spatula
  private static createSpatulaModel(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'GiantSpatulaMesh';

    const metalMat = new THREE.MeshLambertMaterial({ color: 0xcbd5e1, roughness: 0.35 });

    // Handle
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.016, 0.55, 8), metalMat);
    handle.position.set(0, -0.05, 0);
    group.add(handle);

    // Wood grip on end of handle
    const gripMat = new THREE.MeshLambertMaterial({ color: 0x92400e, roughness: 0.8 });
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.22, 8), gripMat);
    grip.position.set(0, -0.22, 0);
    group.add(grip);

    // Flat wide blade
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.28, 0.015), metalMat);
    blade.position.set(0, 0.32, 0);
    group.add(blade);

    // Decorative slots in spatula blade
    const slotMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    for (let i = -1; i <= 1; i++) {
      const slot = new THREE.Mesh(new THREE.PlaneGeometry(0.02, 0.16), slotMat);
      slot.position.set(i * 0.055, 0.32, 0.01);
      group.add(slot);
    }

    return group;
  }

  // 8. Toy Hammer
  private static createToyHammerModel(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'ToyHammerMesh';

    const yellowMat = new THREE.MeshLambertMaterial({ color: 0xfacc15, roughness: 0.4 });
    const redMat = new THREE.MeshLambertMaterial({ color: 0xef4444, roughness: 0.4 });
    const blueMat = new THREE.MeshLambertMaterial({ color: 0x3b82f6, roughness: 0.4 });

    // Handle
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.48, 8), blueMat);
    handle.position.set(0, -0.06, 0);
    group.add(handle);

    // Hammer center block
    const block = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 0.12), yellowMat);
    block.position.set(0, 0.24, 0);
    group.add(block);

    // Ribbed squeaky striking cylinders on both sides
    const drumGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.14, 10);
    drumGeo.rotateZ(Math.PI / 2);

    const drumL = new THREE.Mesh(drumGeo, redMat);
    drumL.position.set(-0.11, 0.24, 0);
    group.add(drumL);

    const drumR = new THREE.Mesh(drumGeo, redMat);
    drumR.position.set(0.11, 0.24, 0);
    group.add(drumR);

    return group;
  }

  // 9. Electric Fan
  private static createElectricFanModel(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'ElectricFanMesh';

    const plasticMat = new THREE.MeshLambertMaterial({ color: 0x0ea5e9, roughness: 0.4 });
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x1e293b, roughness: 0.6 });
    const bladeMat = new THREE.MeshLambertMaterial({ color: 0x38bdf8, roughness: 0.3 });

    // Stand base
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.05, 10), plasticMat);
    base.position.set(0, -0.22, 0);
    group.add(base);

    // Stem
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.32, 8), darkMat);
    stem.position.set(0, -0.06, 0);
    group.add(stem);

    // Motor housing
    const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.12, 8), darkMat);
    motor.rotateX(Math.PI / 2);
    motor.position.set(0, 0.16, -0.05);
    group.add(motor);

    // Outer cage wire ring
    const cageRing = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.015, 6, 16), plasticMat);
    cageRing.position.set(0, 0.16, 0.02);
    group.add(cageRing);

    // 3 Fan blades
    const fanCenter = new THREE.Group();
    fanCenter.position.set(0, 0.16, 0.02);
    for (let i = 0; i < 3; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.01), bladeMat);
      blade.position.y = 0.09;
      const bladePivot = new THREE.Group();
      bladePivot.rotation.z = (i * Math.PI * 2) / 3;
      bladePivot.add(blade);
      fanCenter.add(bladePivot);
    }
    group.add(fanCenter);

    return group;
  }

  // Factory entry for First-Person Viewmodel Model
  public static createViewmodel(weaponId: WeaponId): THREE.Group {
    let mesh: THREE.Group;
    switch (weaponId) {
      case 'baseball_bat':
        mesh = this.createBatModel();
        break;
      case 'signboard':
        mesh = this.createSignboardModel();
        break;
      case 'frying_pan':
        mesh = this.createFryingPanModel();
        break;
      case 'slipper':
        mesh = this.createSlipperModel();
        break;
      case 'chair':
        mesh = this.createChairModel();
        break;
      case 'broom':
        mesh = this.createBroomModel();
        break;
      case 'spatula':
        mesh = this.createSpatulaModel();
        break;
      case 'toy_hammer':
        mesh = this.createToyHammerModel();
        break;
      case 'electric_fan':
        mesh = this.createElectricFanModel();
        break;
      default:
        mesh = this.createBatModel();
    }
    return mesh;
  }

  // Factory entry for World Pickup (Includes subtle glowing ground ring and floating pedestal)
  public static createWorldPickup(weaponId: WeaponId): THREE.Group {
    const pickupRoot = new THREE.Group();
    pickupRoot.name = `Pickup_${weaponId}`;

    // 1. Core Weapon 3D Model (Slightly tilted up to catch the eye)
    const weaponMesh = this.createViewmodel(weaponId);
    weaponMesh.name = 'PickupWeaponMesh';
    weaponMesh.position.set(0, 0.75, 0);
    weaponMesh.scale.set(1.15, 1.15, 1.15);
    weaponMesh.rotation.set(0.35, 0, 0.25);
    pickupRoot.add(weaponMesh);

    // 2. Holographic Ground Ring (Warm amber glowing ring showing item spot)
    const ringGeo = new THREE.RingGeometry(0.45, 0.58, 16);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const groundRing = new THREE.Mesh(ringGeo, ringMat);
    groundRing.position.y = 0.08;
    pickupRoot.add(groundRing);

    // 3. Subtle floating vertical sparkle diamond
    const sparkGeo = new THREE.OctahedronGeometry(0.12, 0);
    const sparkMat = new THREE.MeshBasicMaterial({
      color: 0xfde68a,
      transparent: true,
      opacity: 0.8,
    });
    const sparkle = new THREE.Mesh(sparkGeo, sparkMat);
    sparkle.position.set(0, 1.45, 0);
    sparkle.name = 'PickupSparkle';
    pickupRoot.add(sparkle);

    return pickupRoot;
  }
}
