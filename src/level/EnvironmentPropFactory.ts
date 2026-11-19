import * as THREE from 'three';
import { TextureGenerator } from './TextureGenerator.ts';

export interface PropCollider {
  x: number;
  z: number;
  radius: number;
}

export class EnvironmentPropFactory {
  // Shared GPU texture / material caches to eliminate duplicate canvas creations and draw-call thrashing
  private static _directionalArrowMatMap = new Map<string, THREE.MeshBasicMaterial>();
  private static _floorExitArrowMatMap = new Map<string, THREE.MeshBasicMaterial>();
  private static _pocongTrailMatMap = new Map<string, THREE.MeshBasicMaterial>();
  // =========================================================================
  // LEVEL 2 — ABANDONED SCHOOL PROPS
  // =========================================================================

  public static createSchoolDesk(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'SchoolDesk';

    const woodMat = new THREE.MeshLambertMaterial({ color: 0x765335 });
    const metalMat = new THREE.MeshLambertMaterial({ color: 0x242a2e });

    // Tabletop
    const topGeo = new THREE.BoxGeometry(1.3, 0.08, 0.85);
    const top = new THREE.Mesh(topGeo, woodMat);
    top.position.y = 0.82;
    top.castShadow = true;
    group.add(top);

    // Book cubby beneath desktop
    const cubbyGeo = new THREE.BoxGeometry(1.2, 0.12, 0.75);
    const cubby = new THREE.Mesh(cubbyGeo, metalMat);
    cubby.position.y = 0.70;
    group.add(cubby);

    // Metal legs
    const legGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.82, 6);
    const legPositions = [
      { x: -0.55, z: -0.35 },
      { x: 0.55, z: -0.35 },
      { x: -0.55, z: 0.35 },
      { x: 0.55, z: 0.35 },
    ];
    legPositions.forEach((pos) => {
      const leg = new THREE.Mesh(legGeo, metalMat);
      leg.position.set(pos.x, 0.41, pos.z);
      group.add(leg);
    });

    // Chair placed behind desk
    const chairSeatGeo = new THREE.BoxGeometry(0.48, 0.05, 0.48);
    const seat = new THREE.Mesh(chairSeatGeo, woodMat);
    seat.position.set(0, 0.45, 0.65);
    group.add(seat);

    const chairBackGeo = new THREE.BoxGeometry(0.46, 0.32, 0.04);
    const back = new THREE.Mesh(chairBackGeo, woodMat);
    back.position.set(0, 0.72, 0.88);
    group.add(back);

    const chairLegGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.45, 6);
    [
      { x: -0.2, z: 0.45 },
      { x: 0.2, z: 0.45 },
      { x: -0.2, z: 0.85 },
      { x: 0.2, z: 0.85 },
    ].forEach((pos) => {
      const cl = new THREE.Mesh(chairLegGeo, metalMat);
      cl.position.set(pos.x, 0.225, pos.z);
      group.add(cl);
    });

    return group;
  }

  public static createTeacherDesk(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'TeacherDesk';

    const darkWoodMat = new THREE.MeshLambertMaterial({ color: 0x5a3e26 });
    const metalMat = new THREE.MeshLambertMaterial({ color: 0x22262a });
    const greenMat = new THREE.MeshLambertMaterial({ color: 0x1f4733 });
    const paperMat = new THREE.MeshBasicMaterial({ color: 0xe8e2d2 });

    // Sturdy teacher desk top
    const deskTop = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.95), darkWoodMat);
    deskTop.position.y = 0.85;
    deskTop.castShadow = true;
    group.add(deskTop);

    // Left pedestal drawer bank
    const leftPedestal = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.75, 0.85), darkWoodMat);
    leftPedestal.position.set(-0.6, 0.425, 0);
    group.add(leftPedestal);

    // Right legs
    const rightLeg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 6), metalMat);
    rightLeg1.position.set(0.75, 0.4, -0.38);
    group.add(rightLeg1);
    const rightLeg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 6), metalMat);
    rightLeg2.position.set(0.75, 0.4, 0.38);
    group.add(rightLeg2);

    // Front modesty panel
    const modestyPanel = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.5, 0.04), darkWoodMat);
    modestyPanel.position.set(0, 0.55, -0.42);
    group.add(modestyPanel);

    // Vintage Banker's desk lamp
    const lampBase = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.03, 8), metalMat);
    lampBase.position.set(-0.5, 0.915, -0.2);
    group.add(lampBase);
    const lampArm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.35, 6), metalMat);
    lampArm.position.set(-0.5, 1.08, -0.2);
    group.add(lampArm);
    const lampShade = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.12), greenMat);
    lampShade.position.set(-0.5, 1.25, -0.16);
    group.add(lampShade);

    // Graded exam papers stack with red ink mark
    const paperStack = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.06, 0.45), paperMat);
    paperStack.position.set(0.35, 0.93, 0.1);
    paperStack.rotation.y = 0.15;
    group.add(paperStack);

    // Teacher's chair
    const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.52), darkWoodMat);
    chairSeat.position.set(0, 0.48, 0.85);
    group.add(chairSeat);
    const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.45, 0.06), darkWoodMat);
    chairBack.position.set(0, 0.82, 1.08);
    group.add(chairBack);

    return group;
  }

  public static createStackedChairsObstacle(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'StackedChairsObstacle';

    const woodMat = new THREE.MeshLambertMaterial({ color: 0x6e4c2f });
    const metalMat = new THREE.MeshLambertMaterial({ color: 0x22262a });

    // 4 chairs haphazardly interlocked and tilted
    const seatGeo = new THREE.BoxGeometry(0.48, 0.05, 0.48);
    const backGeo = new THREE.BoxGeometry(0.46, 0.32, 0.04);

    for (let i = 0; i < 4; i++) {
      const chairGroup = new THREE.Group();
      const seat = new THREE.Mesh(seatGeo, woodMat);
      seat.position.y = 0.45;
      chairGroup.add(seat);

      const back = new THREE.Mesh(backGeo, woodMat);
      back.position.set(0, 0.72, 0.22);
      chairGroup.add(back);

      const legGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.45, 6);
      [
        { x: -0.2, z: -0.2 },
        { x: 0.2, z: -0.2 },
        { x: -0.2, z: 0.2 },
        { x: 0.2, z: 0.2 },
      ].forEach((p) => {
        const leg = new THREE.Mesh(legGeo, metalMat);
        leg.position.set(p.x, 0.225, p.z);
        chairGroup.add(leg);
      });

      chairGroup.position.set(
        (Math.random() - 0.5) * 0.25,
        i * 0.22,
        (Math.random() - 0.5) * 0.25
      );
      chairGroup.rotation.y = (i * 0.45) + (Math.random() - 0.5) * 0.3;
      chairGroup.rotation.z = (i * 0.08) - 0.04;
      group.add(chairGroup);
    }

    return group;
  }

  public static createOverturnedDesk(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'OverturnedDesk';

    const woodMat = new THREE.MeshLambertMaterial({ color: 0x765335 });
    const metalMat = new THREE.MeshLambertMaterial({ color: 0x242a2e });
    const paperMat = new THREE.MeshBasicMaterial({ color: 0xded8c8 });

    // Desk lying sideways on the ground
    const deskGroup = new THREE.Group();
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 0.85), woodMat);
    top.position.y = 0.82;
    deskGroup.add(top);

    const legGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.82, 6);
    [
      { x: -0.55, z: -0.35 },
      { x: 0.55, z: -0.35 },
      { x: -0.55, z: 0.35 },
      { x: 0.55, z: 0.35 },
    ].forEach((pos) => {
      const leg = new THREE.Mesh(legGeo, metalMat);
      leg.position.set(pos.x, 0.41, pos.z);
      deskGroup.add(leg);
    });

    deskGroup.rotation.z = Math.PI / 2 + 0.15;
    deskGroup.rotation.y = 0.3;
    deskGroup.position.set(0, 0.45, 0);
    group.add(deskGroup);

    // Scattered loose paper sheets around the fallen desk
    for (let i = 0; i < 4; i++) {
      const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.38), paperMat);
      paper.rotation.x = -Math.PI / 2;
      paper.rotation.z = Math.random() * Math.PI;
      paper.position.set(
        (Math.random() - 0.5) * 1.5,
        0.01 + i * 0.002,
        (Math.random() - 0.5) * 1.5
      );
      group.add(paper);
    }

    return group;
  }

  public static createSchoolBookshelf(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'SchoolBookshelf';

    const woodMat = new THREE.MeshLambertMaterial({ color: 0x4e3722 });
    const bookColors = [0x7a3028, 0x2a443a, 0x364860, 0x6e522e];

    // Frame (sides, top, bottom, back)
    const sideGeo = new THREE.BoxGeometry(0.42, 2.3, 0.05);
    const leftSide = new THREE.Mesh(sideGeo, woodMat);
    leftSide.position.set(-0.7, 1.15, 0);
    group.add(leftSide);

    const rightSide = new THREE.Mesh(sideGeo, woodMat);
    rightSide.position.set(0.7, 1.15, 0);
    group.add(rightSide);

    const topGeo = new THREE.BoxGeometry(1.45, 0.06, 0.42);
    const top = new THREE.Mesh(topGeo, woodMat);
    top.position.set(0, 2.3, 0);
    group.add(top);

    const bottom = new THREE.Mesh(topGeo, woodMat);
    bottom.position.set(0, 0.08, 0);
    group.add(bottom);

    const backGeo = new THREE.BoxGeometry(1.4, 2.2, 0.03);
    const back = new THREE.Mesh(backGeo, woodMat);
    back.position.set(0, 1.15, -0.19);
    group.add(back);

    // Shelves with books
    for (let s = 1; s <= 4; s++) {
      const shelfY = s * 0.45;
      const shelf = new THREE.Mesh(topGeo, woodMat);
      shelf.position.set(0, shelfY, 0);
      group.add(shelf);

      // Row of textbooks
      const bookBlockGeo = new THREE.BoxGeometry(0.55, 0.28, 0.32);
      const mat = new THREE.MeshLambertMaterial({ color: bookColors[s % bookColors.length] });
      const booksLeft = new THREE.Mesh(bookBlockGeo, mat);
      booksLeft.position.set(-0.35, shelfY + 0.14, 0);
      group.add(booksLeft);

      const mat2 = new THREE.MeshLambertMaterial({ color: bookColors[(s + 1) % bookColors.length] });
      const booksRight = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.26, 0.32), mat2);
      booksRight.position.set(0.38, shelfY + 0.13, 0);
      group.add(booksRight);
    }

    return group;
  }

  public static createFallenBookshelfObstacle(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'FallenBookshelfObstacle';

    const shelf = this.createSchoolBookshelf();
    shelf.rotation.x = Math.PI / 2 - 0.1;
    shelf.rotation.y = 0.25;
    shelf.position.set(0, 0.22, 0);
    group.add(shelf);

    // Scattered books on the floor around the fallen shelf
    const bookMat = new THREE.MeshLambertMaterial({ color: 0x6e2c24 });
    for (let i = 0; i < 5; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.32), bookMat);
      b.position.set(
        (Math.random() - 0.5) * 1.8,
        0.03,
        (Math.random() - 0.5) * 1.6
      );
      b.rotation.y = Math.random() * Math.PI;
      group.add(b);
    }

    return group;
  }

  public static createMetalStorageCabinet(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'MetalStorageCabinet';

    const metalMat = new THREE.MeshLambertMaterial({ color: 0x3e4a44 });
    const handleMat = new THREE.MeshBasicMaterial({ color: 0x1a201d });

    // Cabinet body
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.1, 0.55), metalMat);
    body.position.y = 1.05;
    body.castShadow = true;
    group.add(body);

    // Two doors with seam
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.02, 1.95, 0.02), handleMat);
    seam.position.set(0, 1.05, 0.28);
    group.add(seam);

    // Door handles
    const handle1 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.15, 0.05), handleMat);
    handle1.position.set(-0.06, 1.05, 0.3);
    group.add(handle1);
    const handle2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.15, 0.05), handleMat);
    handle2.position.set(0.06, 1.05, 0.3);
    group.add(handle2);

    return group;
  }

  public static createLabCounterWithCRT(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'LabCounterWithCRT';

    const counterMat = new THREE.MeshLambertMaterial({ color: 0x2e3532 });
    const beigeMat = new THREE.MeshLambertMaterial({ color: 0x9e9886 });
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x16201b });

    // Heavy lab counter table
    const counter = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.85, 0.85), counterMat);
    counter.position.y = 0.425;
    group.add(counter);

    // Old 90s CRT Monitor
    const crtBody = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.42, 0.45), beigeMat);
    crtBody.position.set(-0.25, 1.06, 0);
    group.add(crtBody);

    const crtScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.3), screenMat);
    crtScreen.position.set(-0.25, 1.06, 0.23);
    group.add(crtScreen);

    // CRT base stand
    const crtStand = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.05, 8), beigeMat);
    crtStand.position.set(-0.25, 0.875, 0);
    group.add(crtStand);

    // CRT Keyboard
    const keyboard = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.03, 0.18), beigeMat);
    keyboard.position.set(-0.25, 0.865, 0.28);
    group.add(keyboard);

    // Desktop Tower
    const tower = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.45, 0.42), beigeMat);
    tower.position.set(0.5, 1.075, 0);
    group.add(tower);

    return group;
  }

  public static createBlackboard(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Blackboard';

    const frameMat = new THREE.MeshLambertMaterial({ color: 0x3d2b1a });
    const boardMat = new THREE.MeshLambertMaterial({ color: 0x1a2e22 });
    const chalkMat = new THREE.MeshBasicMaterial({ color: 0xdde5de });

    const frameGeo = new THREE.BoxGeometry(3.2, 1.6, 0.08);
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.y = 2.0;
    group.add(frame);

    const boardGeo = new THREE.BoxGeometry(3.0, 1.4, 0.1);
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.position.y = 2.0;
    group.add(board);

    // Chalk tray
    const trayGeo = new THREE.BoxGeometry(3.0, 0.06, 0.16);
    const tray = new THREE.Mesh(trayGeo, frameMat);
    tray.position.set(0, 1.25, 0.06);
    group.add(tray);

    // Faint chalk marks / geometric diagram
    const chalkDiagram = new THREE.Mesh(new THREE.PlaneGeometry(0.65, 0.65), chalkMat);
    chalkDiagram.position.set(-0.6, 2.0, 0.055);
    group.add(chalkDiagram);

    return group;
  }

  public static createNoticeBoard(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'NoticeBoard';

    const frameMat = new THREE.MeshLambertMaterial({ color: 0x4a3420 });
    const corkMat = new THREE.MeshLambertMaterial({ color: 0x8a623c });
    const flyerMat = new THREE.MeshBasicMaterial({ color: 0xd8d2c2 });
    const redFlyerMat = new THREE.MeshBasicMaterial({ color: 0x9e382d });

    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.2, 0.06), frameMat);
    frame.position.y = 1.9;
    group.add(frame);

    const cork = new THREE.Mesh(new THREE.BoxGeometry(1.88, 1.08, 0.08), corkMat);
    cork.position.y = 1.9;
    group.add(cork);

    // Pinned notice papers
    const flyer1 = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.45), flyerMat);
    flyer1.position.set(-0.45, 1.95, 0.045);
    flyer1.rotation.z = 0.05;
    group.add(flyer1);

    const flyer2 = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.42), redFlyerMat);
    flyer2.position.set(0.35, 1.88, 0.045);
    flyer2.rotation.z = -0.08;
    group.add(flyer2);

    return group;
  }

  public static createTrashBin(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'TrashBin';

    const binMat = new THREE.MeshLambertMaterial({ color: 0x2c332e });
    const paperMat = new THREE.MeshBasicMaterial({ color: 0xdedede });

    const bin = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.18, 0.52, 8, 1, true), binMat);
    bin.position.y = 0.26;
    group.add(bin);

    // Crumpled paper balls inside and spilled
    for (let i = 0; i < 3; i++) {
      const p = new THREE.Mesh(new THREE.DodecahedronGeometry(0.06), paperMat);
      p.position.set(
        (Math.random() - 0.5) * 0.15,
        0.45,
        (Math.random() - 0.5) * 0.15
      );
      group.add(p);
    }

    return group;
  }

  public static createCardboardBoxesStack(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'CardboardBoxesStack';

    const boxMat = new THREE.MeshLambertMaterial({ color: 0x7a6344 });
    const tapeMat = new THREE.MeshBasicMaterial({ color: 0x4d3b24 });

    // Bottom large box
    const box1 = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.55, 0.75), boxMat);
    box1.position.y = 0.275;
    group.add(box1);

    const tape1 = new THREE.Mesh(new THREE.BoxGeometry(0.77, 0.04, 0.12), tapeMat);
    tape1.position.y = 0.55;
    group.add(tape1);

    // Top medium box (tilted)
    const box2 = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.45, 0.58), boxMat);
    box2.position.set(0.05, 0.775, -0.04);
    box2.rotation.y = 0.35;
    group.add(box2);

    return group;
  }

  public static createScatteredPapersDebris(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'ScatteredPapersDebris';

    const paperMat = new THREE.MeshBasicMaterial({ color: 0xd5cfbe });

    for (let i = 0; i < 6; i++) {
      const sheet = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.42), paperMat);
      sheet.rotation.x = -Math.PI / 2;
      sheet.rotation.z = Math.random() * Math.PI;
      sheet.position.set(
        (Math.random() - 0.5) * 1.8,
        0.005 + i * 0.002,
        (Math.random() - 0.5) * 1.8
      );
      group.add(sheet);
    }

    return group;
  }

  public static createSchoolSupportPillar(height: number): THREE.Group {
    const group = new THREE.Group();
    group.name = 'SchoolSupportPillar';

    const pillarMat = new THREE.MeshLambertMaterial({ color: 0x343d37 });
    const trimMat = new THREE.MeshLambertMaterial({ color: 0x272e29 });

    // Square concrete column shaft
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.55, height - 0.45, 0.55), pillarMat);
    shaft.position.y = height / 2;
    shaft.castShadow = true;
    group.add(shaft);

    // Base plinth
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.25, 0.75), trimMat);
    base.position.y = 0.125;
    group.add(base);

    // Capital trim connecting to upper floor slab
    const capital = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.20, 0.75), trimMat);
    capital.position.y = height - 0.10;
    group.add(capital);

    return group;
  }

  public static createSchoolLocker(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'SchoolLocker';

    const lockerMat = new THREE.MeshLambertMaterial({ color: 0x35423e });
    const ventMat = new THREE.MeshBasicMaterial({ color: 0x1a211f });
    const handleMat = new THREE.MeshBasicMaterial({ color: 0x222a27 });

    // Bank of 3 tall institutional school lockers
    const bodyGeo = new THREE.BoxGeometry(1.6, 2.4, 0.65);
    const body = new THREE.Mesh(bodyGeo, lockerMat);
    body.position.y = 1.2;
    body.castShadow = true;
    group.add(body);

    for (let i = -0.5; i <= 0.5; i += 0.5) {
      // Vents
      const ventGeo = new THREE.PlaneGeometry(0.32, 0.22);
      const vent = new THREE.Mesh(ventGeo, ventMat);
      vent.position.set(i, 2.1, 0.33);
      group.add(vent);

      // Handle latch
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.18, 0.04), handleMat);
      handle.position.set(i + 0.16, 1.2, 0.34);
      group.add(handle);
    }

    return group;
  }

  public static createSchoolStaircase(width: number, height: number, length: number): THREE.Group {
    return EnvironmentPropFactory.createWallStaircase(width, height, length, 'school');
  }

  public static createSchoolStairwellRailing(length: number, height: number = 1.05): THREE.Group {
    return EnvironmentPropFactory.createWallStairwellParapet(length, height, 'school');
  }

  private static createSmoothFlankWallGeometry(
    wallThick: number,
    length: number,
    height: number,
    parapetHeight: number
  ): THREE.BufferGeometry {
    const halfT = wallThick / 2;
    const halfL = length / 2;

    const v0 = [-halfT, 0, -halfL];
    const v1 = [-halfT, parapetHeight, -halfL];
    const v2 = [halfT, 0, -halfL];
    const v3 = [halfT, parapetHeight, -halfL];
    const v4 = [-halfT, 0, halfL];
    const v5 = [-halfT, height + parapetHeight, halfL];
    const v6 = [halfT, 0, halfL];
    const v7 = [halfT, height + parapetHeight, halfL];

    const triangles = [
      // Bottom (facing -Y)
      v0, v6, v4,   v0, v2, v6,
      // Front (facing -Z)
      v0, v1, v3,   v0, v3, v2,
      // Back (facing +Z)
      v4, v7, v5,   v4, v6, v7,
      // Left outer/inner (facing -X)
      v0, v4, v5,   v0, v5, v1,
      // Right outer/inner (facing +X)
      v2, v3, v7,   v2, v7, v6,
      // Top diagonal slope (facing +Y / tilted)
      v1, v5, v7,   v1, v7, v3,
    ];

    const positions = new Float32Array(triangles.flat());
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.computeVertexNormals();
    return geo;
  }

  public static createWallStaircase(
    width: number,
    height: number,
    length: number,
    theme: string = 'concrete',
    wallTexture?: THREE.Texture
  ): THREE.Group {
    const stair = new THREE.Group();
    stair.name = 'WallStaircase';

    // Theme color palette
    let stepColor = 0x484e56;
    let nosingColor = 0x22262a;
    let wallColor = 0x5a626c;
    let baseColor = 0x3e444c;

    switch (theme) {
      case 'school':
        stepColor = 0x444c48;
        nosingColor = 0x1f2522;
        wallColor = 0x647067;
        baseColor = 0x38413b;
        break;
      case 'labyrinth':
        stepColor = 0x50545a;
        nosingColor = 0x222428;
        wallColor = 0x626870;
        baseColor = 0x3e4248;
        break;
      case 'hospital':
        stepColor = 0x5e6870;
        nosingColor = 0x242d32;
        wallColor = 0x76828a;
        baseColor = 0x465058;
        break;
      case 'sewer':
        stepColor = 0x2e3634;
        nosingColor = 0x161c1a;
        wallColor = 0x3c4642;
        baseColor = 0x28302c;
        break;
      case 'factory':
        stepColor = 0x3c4248;
        nosingColor = 0x1c1e22;
        wallColor = 0x505862;
        baseColor = 0x363c42;
        break;
      case 'hotel':
        stepColor = 0x645a50;
        nosingColor = 0x383028;
        wallColor = 0x786e64;
        baseColor = 0x544a40;
        break;
      case 'subway':
        stepColor = 0x464c54;
        nosingColor = 0x1e2226;
        wallColor = 0x5a646e;
        baseColor = 0x3a424a;
        break;
      case 'research_facility':
        stepColor = 0x48525c;
        nosingColor = 0x1e242a;
        wallColor = 0x64707e;
        baseColor = 0x3c444e;
        break;
      case 'nightmare':
        stepColor = 0x201e26;
        nosingColor = 0x100e14;
        wallColor = 0x2c2634;
        baseColor = 0x1c1822;
        break;
    }

    const stepMat = new THREE.MeshLambertMaterial({ color: stepColor });
    const nosingMat = new THREE.MeshLambertMaterial({ color: nosingColor });
    const wallMat = wallTexture
      ? new THREE.MeshLambertMaterial({ map: wallTexture })
      : new THREE.MeshLambertMaterial({ color: wallColor });

    const wallThick = 0.22;
    const parapetHeight = 0.95;
    const stepWidth = width - 2 * wallThick;

    // 1. Individual solid steps with nosing
    const numSteps = Math.max(8, Math.round(height / 0.20));
    const stepHeight = height / numSteps;
    const stepDepth = length / numSteps;

    for (let i = 0; i < numSteps; i++) {
      const stepY = stepHeight * (i + 1);
      const stepZ = -length / 2 + (i + 0.5) * stepDepth;

      // Solid concrete core under step extending all the way to floor level
      const stepMesh = new THREE.Mesh(
        new THREE.BoxGeometry(stepWidth, stepY, stepDepth + 0.005),
        stepMat
      );
      stepMesh.position.set(0, stepY / 2, stepZ);
      stepMesh.receiveShadow = true;
      stair.add(stepMesh);

      // Distinct tread nosing trim along front tread edge (contained cleanly between side walls)
      const nosing = new THREE.Mesh(
        new THREE.BoxGeometry(stepWidth, 0.035, 0.07),
        nosingMat
      );
      nosing.position.set(0, stepY, stepZ + stepDepth / 2 - 0.035);
      stair.add(nosing);
    }

    // 2. Continuous Solid Smooth Masonry Flank Walls (Tembok Samping Lurus Rapi, Tidak Bergerigi)
    // Profile is a smooth diagonal right-trapezoid prism with flat outer faces (no stepped teeth, no black bars)
    const wallGeo = EnvironmentPropFactory.createSmoothFlankWallGeometry(
      wallThick,
      length,
      height,
      parapetHeight
    );

    // Left flank wall (outer face exactly flush at -width / 2)
    const leftWall = new THREE.Mesh(wallGeo, wallMat);
    leftWall.position.set(-width / 2 + wallThick / 2, 0, 0);
    leftWall.receiveShadow = true;
    leftWall.castShadow = true;
    stair.add(leftWall);

    // Right flank wall (outer face exactly flush at +width / 2)
    const rightWall = new THREE.Mesh(wallGeo, wallMat);
    rightWall.position.set(width / 2 - wallThick / 2, 0, 0);
    rightWall.receiveShadow = true;
    rightWall.castShadow = true;
    stair.add(rightWall);

    // 3. Full-width, full-height vertical rear wall covering the back of the stairs
    // Textured with the level's themed wall texture so looking at the back of the staircase looks identical to a normal concrete wall
    const backWallThickness = 0.08;
    const backWallGeo = new THREE.BoxGeometry(width, height, backWallThickness);
    const backWallMesh = new THREE.Mesh(backWallGeo, wallMat);
    backWallMesh.name = 'StaircaseRearWall';
    backWallMesh.position.set(0, height / 2, length / 2 + 0.01);
    backWallMesh.receiveShadow = true;
    backWallMesh.castShadow = true;
    stair.add(backWallMesh);

    return stair;
  }

  public static createWallStairwellParapet(
    length: number,
    height: number = 1.05,
    theme: string = 'concrete'
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = 'WallStairwellParapet';

    let wallColor = 0x5a626c;
    let copingColor = 0x30363e;
    let baseColor = 0x3e444c;

    switch (theme) {
      case 'school':
        wallColor = 0x647067;
        copingColor = 0x2e3530;
        baseColor = 0x38413b;
        break;
      case 'labyrinth':
        wallColor = 0x626870;
        copingColor = 0x2e3238;
        baseColor = 0x3e4248;
        break;
      case 'hospital':
        wallColor = 0x76828a;
        copingColor = 0x354048;
        baseColor = 0x465058;
        break;
      case 'sewer':
        wallColor = 0x3c4642;
        copingColor = 0x222a26;
        baseColor = 0x28302c;
        break;
      case 'factory':
        wallColor = 0x505862;
        copingColor = 0x282e34;
        baseColor = 0x363c42;
        break;
      case 'hotel':
        wallColor = 0x786e64;
        copingColor = 0x443a32;
        baseColor = 0x544a40;
        break;
      case 'subway':
        wallColor = 0x5a646e;
        copingColor = 0x2c3238;
        baseColor = 0x3a424a;
        break;
      case 'research_facility':
        wallColor = 0x64707e;
        copingColor = 0x2e3640;
        baseColor = 0x3c444e;
        break;
      case 'nightmare':
        wallColor = 0x2c2634;
        copingColor = 0x16131c;
        baseColor = 0x1c1822;
        break;
    }

    const wallMat = new THREE.MeshLambertMaterial({ color: wallColor });

    const wallThick = 0.22;

    // Solid masonry parapet wall body
    const wall = new THREE.Mesh(new THREE.BoxGeometry(wallThick, height, length), wallMat);
    wall.position.y = height / 2;
    wall.receiveShadow = true;
    wall.castShadow = true;
    group.add(wall);

    // Clean matching parapet top coping cap
    const coping = new THREE.Mesh(
      new THREE.BoxGeometry(wallThick + 0.02, 0.06, length),
      wallMat
    );
    coping.position.y = height + 0.03;
    coping.receiveShadow = true;
    group.add(coping);

    return group;
  }

  // =========================================================================
  // LEVEL 3 — THE LABYRINTH (CONCRETE UNDERGROUND MAZE) PROPS
  // =========================================================================

  public static createIndustrialPipeWall(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'IndustrialPipes';

    const pipeMat = new THREE.MeshLambertMaterial({ color: 0x5a6369, roughness: 0.6 });
    const valveMat = new THREE.MeshLambertMaterial({ color: 0xb82b2b });

    // Horizontal pipe
    const pipeGeo = new THREE.CylinderGeometry(0.12, 0.12, 3.8, 8);
    pipeGeo.rotateZ(Math.PI / 2);
    const pipe = new THREE.Mesh(pipeGeo, pipeMat);
    pipe.position.y = 2.4;
    group.add(pipe);

    // Valve wheel
    const valveGeo = new THREE.TorusGeometry(0.18, 0.03, 6, 12);
    const valve = new THREE.Mesh(valveGeo, valveMat);
    valve.position.set(0, 2.4, 0.14);
    group.add(valve);

    return group;
  }

  public static createHangingCageLight(colorHex: number = 0xffe0a3): THREE.Group {
    const group = new THREE.Group();
    group.name = 'HangingCageLight';

    const metalMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const bulbMat = new THREE.MeshBasicMaterial({ color: colorHex });

    // Cord
    const cordGeo = new THREE.CylinderGeometry(0.015, 0.015, 1.2, 4);
    const cord = new THREE.Mesh(cordGeo, metalMat);
    cord.position.y = 3.6;
    group.add(cord);

    // Cage shade
    const cageGeo = new THREE.CylinderGeometry(0.25, 0.15, 0.35, 6, 1, true);
    const cage = new THREE.Mesh(cageGeo, metalMat);
    cage.position.y = 2.85;
    group.add(cage);

    // Bulb
    const bulbGeo = new THREE.SphereGeometry(0.09, 6, 6);
    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    bulb.position.y = 2.85;
    group.add(bulb);

    // Point Light
    const light = new THREE.PointLight(colorHex, 1.8, 10, 1.2);
    light.position.y = 2.8;
    group.add(light);

    return group;
  }

  // =========================================================================
  // LEVEL 4 — THE HOSPITAL PROPS
  // =========================================================================

  public static createHospitalBed(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'HospitalBed';

    const frameMat = new THREE.MeshLambertMaterial({ color: 0xd4ded9 });
    const sheetMat = new THREE.MeshLambertMaterial({ color: 0x8aaba0 });
    const pillowMat = new THREE.MeshLambertMaterial({ color: 0xe5ebe8 });

    // Metal Frame Base
    const baseGeo = new THREE.BoxGeometry(1.2, 0.15, 2.2);
    const base = new THREE.Mesh(baseGeo, frameMat);
    base.position.y = 0.65;
    group.add(base);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.65, 6);
    const legCoords = [
      { x: -0.52, z: -0.95 },
      { x: 0.52, z: -0.95 },
      { x: -0.52, z: 0.95 },
      { x: 0.52, z: 0.95 },
    ];
    legCoords.forEach((c) => {
      const leg = new THREE.Mesh(legGeo, frameMat);
      leg.position.set(c.x, 0.32, c.z);
      group.add(leg);
    });

    // Mattress & Bed Sheets
    const mattressGeo = new THREE.BoxGeometry(1.1, 0.22, 2.1);
    const mattress = new THREE.Mesh(mattressGeo, sheetMat);
    mattress.position.y = 0.82;
    group.add(mattress);

    // Pillow
    const pillowGeo = new THREE.BoxGeometry(0.75, 0.12, 0.45);
    const pillow = new THREE.Mesh(pillowGeo, pillowMat);
    pillow.position.set(0, 0.95, -0.75);
    group.add(pillow);

    // Headboard & Footboard
    const headboardGeo = new THREE.BoxGeometry(1.2, 0.85, 0.08);
    const headboard = new THREE.Mesh(headboardGeo, frameMat);
    headboard.position.set(0, 0.95, -1.05);
    group.add(headboard);

    const footboardGeo = new THREE.BoxGeometry(1.2, 0.65, 0.08);
    const footboard = new THREE.Mesh(footboardGeo, frameMat);
    footboard.position.set(0, 0.85, 1.05);
    group.add(footboard);

    return group;
  }

  public static createWheelchair(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Wheelchair';

    const metalMat = new THREE.MeshLambertMaterial({ color: 0x9ca3af });
    const seatMat = new THREE.MeshLambertMaterial({ color: 0x1f2937 });

    // Wheels
    const wheelGeo = new THREE.TorusGeometry(0.35, 0.03, 6, 16);
    const leftWheel = new THREE.Mesh(wheelGeo, metalMat);
    leftWheel.position.set(-0.38, 0.35, 0);
    leftWheel.rotateY(Math.PI / 2);
    group.add(leftWheel);

    const rightWheel = new THREE.Mesh(wheelGeo, metalMat);
    rightWheel.position.set(0.38, 0.35, 0);
    rightWheel.rotateY(Math.PI / 2);
    group.add(rightWheel);

    // Seat
    const seatGeo = new THREE.BoxGeometry(0.65, 0.06, 0.6);
    const seat = new THREE.Mesh(seatGeo, seatMat);
    seat.position.set(0, 0.45, 0);
    group.add(seat);

    // Backrest
    const backGeo = new THREE.BoxGeometry(0.65, 0.55, 0.06);
    const back = new THREE.Mesh(backGeo, seatMat);
    back.position.set(0, 0.72, -0.28);
    group.add(back);

    return group;
  }

  // =========================================================================
  // LEVEL 5 — THE SEWER PROPS
  // =========================================================================

  public static createSewerPipeTunnel(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'SewerPipeTunnel';

    const pipeMat = new THREE.MeshLambertMaterial({ color: 0x2e3b33, roughness: 0.9 });

    // Large conduit ring
    const ringGeo = new THREE.TorusGeometry(1.4, 0.16, 8, 16);
    const ring = new THREE.Mesh(ringGeo, pipeMat);
    ring.position.y = 1.4;
    group.add(ring);

    return group;
  }

  public static createCatwalkBridge(width: number, length: number): THREE.Group {
    const group = new THREE.Group();
    group.name = 'CatwalkBridge';

    const metalMat = new THREE.MeshLambertMaterial({ color: 0x3d444b });

    // Metal plank base
    const baseGeo = new THREE.BoxGeometry(width, 0.1, length);
    const base = new THREE.Mesh(baseGeo, metalMat);
    base.position.y = 0.05;
    group.add(base);

    // Safety side railings
    const railGeo = new THREE.BoxGeometry(0.06, 0.85, length);
    const leftRail = new THREE.Mesh(railGeo, metalMat);
    leftRail.position.set(-width / 2 + 0.05, 0.45, 0);
    group.add(leftRail);

    const rightRail = new THREE.Mesh(railGeo, metalMat);
    rightRail.position.set(width / 2 - 0.05, 0.45, 0);
    group.add(rightRail);

    return group;
  }

  // =========================================================================
  // LEVEL 6 — THE FACTORY PROPS
  // =========================================================================

  public static createIndustrialMachine(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'IndustrialMachine';

    const steelMat = new THREE.MeshLambertMaterial({ color: 0x38414a, roughness: 0.7 });
    const rustMat = new THREE.MeshLambertMaterial({ color: 0x6e3828 });
    const yellowHazardMat = new THREE.MeshLambertMaterial({ color: 0xd97706 });

    // Machine block
    const baseGeo = new THREE.BoxGeometry(1.8, 1.4, 1.8);
    const base = new THREE.Mesh(baseGeo, steelMat);
    base.position.y = 0.7;
    group.add(base);

    // Motor turbine cylinder on top
    const turbineGeo = new THREE.CylinderGeometry(0.45, 0.45, 1.4, 8);
    turbineGeo.rotateZ(Math.PI / 2);
    const turbine = new THREE.Mesh(turbineGeo, rustMat);
    turbine.position.set(0, 1.6, 0);
    group.add(turbine);

    // Warning light
    const beaconGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.25, 6);
    const beacon = new THREE.Mesh(beaconGeo, yellowHazardMat);
    beacon.position.set(0.65, 1.52, 0.65);
    group.add(beacon);

    return group;
  }

  public static createWoodenCrate(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'WoodenCrate';

    const woodMat = new THREE.MeshLambertMaterial({ color: 0x694f36 });
    const trimMat = new THREE.MeshLambertMaterial({ color: 0x38291b });

    const boxGeo = new THREE.BoxGeometry(1.1, 1.1, 1.1);
    const box = new THREE.Mesh(boxGeo, woodMat);
    box.position.y = 0.55;
    group.add(box);

    const trimGeo = new THREE.BoxGeometry(1.15, 0.08, 1.15);
    const trimTop = new THREE.Mesh(trimGeo, trimMat);
    trimTop.position.y = 1.05;
    group.add(trimTop);

    const trimBottom = new THREE.Mesh(trimGeo, trimMat);
    trimBottom.position.y = 0.05;
    group.add(trimBottom);

    return group;
  }

  public static createOilDrum(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'OilDrum';

    const drumMat = new THREE.MeshLambertMaterial({ color: 0x1e3a5f, roughness: 0.6 });

    const drumGeo = new THREE.CylinderGeometry(0.38, 0.38, 1.25, 10);
    const drum = new THREE.Mesh(drumGeo, drumMat);
    drum.position.y = 0.62;
    group.add(drum);

    return group;
  }

  // =========================================================================
  // LEVEL 7 — THE HOTEL PROPS
  // =========================================================================

  public static createHotelSofa(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'HotelSofa';

    const velvetMat = new THREE.MeshLambertMaterial({ color: 0x5c1920 });
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x2b1307 });

    // Seat cushion
    const seatGeo = new THREE.BoxGeometry(1.8, 0.35, 0.85);
    const seat = new THREE.Mesh(seatGeo, velvetMat);
    seat.position.y = 0.38;
    group.add(seat);

    // Backrest
    const backGeo = new THREE.BoxGeometry(1.8, 0.65, 0.25);
    const back = new THREE.Mesh(backGeo, velvetMat);
    back.position.set(0, 0.75, -0.32);
    group.add(back);

    // Armrests
    const armGeo = new THREE.BoxGeometry(0.22, 0.52, 0.85);
    const leftArm = new THREE.Mesh(armGeo, velvetMat);
    leftArm.position.set(-0.95, 0.5, 0);
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, velvetMat);
    rightArm.position.set(0.95, 0.5, 0);
    group.add(rightArm);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.04, 0.02, 0.2, 5);
    const legs = [
      { x: -0.85, z: -0.35 },
      { x: 0.85, z: -0.35 },
      { x: -0.85, z: 0.35 },
      { x: 0.85, z: 0.35 },
    ];
    legs.forEach((l) => {
      const leg = new THREE.Mesh(legGeo, woodMat);
      leg.position.set(l.x, 0.1, l.z);
      group.add(leg);
    });

    return group;
  }

  public static createLuggageStack(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'LuggageStack';

    const leather1 = new THREE.MeshLambertMaterial({ color: 0x5e3717 });
    const leather2 = new THREE.MeshLambertMaterial({ color: 0x2b2927 });

    const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.28, 0.6), leather1);
    c1.position.y = 0.14;
    group.add(c1);

    const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.24, 0.5), leather2);
    c2.position.set(0.04, 0.38, 0.02);
    c2.rotateY(0.25);
    group.add(c2);

    return group;
  }

  // =========================================================================
  // LEVEL 8 — THE SUBWAY PROPS
  // =========================================================================

  public static createSubwayBench(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'SubwayBench';

    const woodMat = new THREE.MeshLambertMaterial({ color: 0x7c4f26 });
    const frameMat = new THREE.MeshLambertMaterial({ color: 0x222629 });

    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.45), woodMat);
    seat.position.y = 0.45;
    group.add(seat);

    const back = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.35, 0.05), woodMat);
    back.position.set(0, 0.72, -0.2);
    group.add(back);

    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.45, 6), frameMat);
    leg.position.set(-0.65, 0.22, 0);
    group.add(leg);

    const leg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.45, 6), frameMat);
    leg2.position.set(0.65, 0.22, 0);
    group.add(leg2);

    return group;
  }

  public static createTicketTurnstile(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'TicketTurnstile';

    const steelMat = new THREE.MeshLambertMaterial({ color: 0x8a9299 });
    const redMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.0, 0.95), steelMat);
    body.position.y = 0.5;
    group.add(body);

    const indicator = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.06), redMat);
    indicator.position.set(0, 0.98, 0.42);
    group.add(indicator);

    // Tripod arms
    const armGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.55, 6);
    armGeo.rotateZ(Math.PI / 2);
    const arm = new THREE.Mesh(armGeo, steelMat);
    arm.position.set(0.28, 0.75, 0);
    group.add(arm);

    return group;
  }

  // =========================================================================
  // LEVEL 9 — RESEARCH FACILITY PROPS & INTERACTIVE SWITCHES
  // =========================================================================

  public static createComputerConsole(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'ComputerConsole';

    const metalMat = new THREE.MeshLambertMaterial({ color: 0x3d4852 });
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 });
    const keyboardMat = new THREE.MeshLambertMaterial({ color: 0x1e2429 });

    // Desk console base
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.85, 0.75), metalMat);
    base.position.y = 0.42;
    group.add(base);

    // CRT Monitor
    const mon = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 0.4), metalMat);
    mon.position.set(0, 1.1, -0.1);
    group.add(mon);

    // Glowing screen
    const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.35), screenMat);
    scr.position.set(0, 1.1, 0.11);
    group.add(scr);

    // Keyboard
    const kb = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.03, 0.22), keyboardMat);
    kb.position.set(0, 0.86, 0.18);
    group.add(kb);

    return group;
  }

  // Interactive Switch Terminal for Level 9 (Unlocks Exit Gate!)
  public static createEmergencySwitchTerminal(activated: boolean = false): {
    group: THREE.Group;
    beaconMesh: THREE.Mesh;
    light: THREE.PointLight;
  } {
    const group = new THREE.Group();
    group.name = 'EmergencySwitchTerminal';

    const pillarMat = new THREE.MeshLambertMaterial({ color: 0x283038 });
    const panelMat = new THREE.MeshLambertMaterial({ color: 0x181c20 });
    const beaconColor = activated ? 0x22c55e : 0xf59e0b;
    const beaconMat = new THREE.MeshBasicMaterial({ color: beaconColor });

    // Terminal Pedestal
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.35, 1.2, 8), pillarMat);
    pedestal.position.y = 0.6;
    group.add(pedestal);

    // Angled control panel
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.12, 0.45), panelMat);
    panel.position.set(0, 1.25, 0);
    panel.rotateX(0.35);
    group.add(panel);

    // Glowing Activation Beacon
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), beaconMat);
    beacon.position.set(0, 1.38, 0);
    group.add(beacon);

    // Halo light
    const light = new THREE.PointLight(beaconColor, 2.2, 8, 1.2);
    light.position.set(0, 1.45, 0);
    group.add(light);

    return { group, beaconMesh: beacon, light };
  }

  // =========================================================================
  // LEVEL 10 — THE NIGHTMARE PROPS
  // =========================================================================

  public static createAbyssMonolith(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'AbyssMonolith';

    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x4a3c46, roughness: 0.85 });
    const redVeinMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    const pilar = new THREE.Mesh(new THREE.BoxGeometry(0.7, 4.2, 0.7), stoneMat);
    pilar.position.y = 2.1;
    pilar.rotateZ(0.08);
    pilar.rotateX(-0.06);
    group.add(pilar);

    const vein = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.8, 0.72), redVeinMat);
    vein.position.y = 2.1;
    vein.rotateZ(0.08);
    vein.rotateX(-0.06);
    group.add(vein);

    return group;
  }

  // =========================================================================
  // MULTI-FLOOR WOODEN BRIDGES & STAIRS / RAMPS (PART 3.1)
  // =========================================================================

  public static createWoodenBridge(
    type: 'stable' | 'unstable' | 'broken',
    length: number,
    width: number = 2.4
  ): THREE.Group {
    const bridge = new THREE.Group();
    bridge.name = `WoodenBridge_${type}`;

    const woodDarkMat = new THREE.MeshLambertMaterial({ color: 0x5c3d24 });
    const woodLightMat = new THREE.MeshLambertMaterial({ color: 0x825838 });
    const ropeMat = new THREE.MeshLambertMaterial({ color: 0x3d3024 });

    // Long supporting timber beams underneath
    const beamGeo = new THREE.BoxGeometry(0.24, 0.35, length);
    const leftBeam = new THREE.Mesh(beamGeo, woodDarkMat);
    leftBeam.position.set(-width / 2 + 0.25, -0.2, 0);
    bridge.add(leftBeam);

    const rightBeam = new THREE.Mesh(beamGeo, woodDarkMat);
    rightBeam.position.set(width / 2 - 0.25, -0.2, 0);
    bridge.add(rightBeam);

    // Vertical Timber Trestle Piers / Support Pylons (Grounding the bridge to the lower environment)
    const pylonHeight = 4.2;
    const pylonGeo = new THREE.BoxGeometry(0.24, pylonHeight, 0.24);
    const strutGeo = new THREE.BoxGeometry(width - 0.2, 0.16, 0.16);
    const pylonZPositions = [-length / 2 + 0.65, length / 2 - 0.65];
    if (length > 7.0) {
      pylonZPositions.splice(1, 0, 0); // Middle support trestle for longer bridges
    }

    for (let pz of pylonZPositions) {
      const pLeft = new THREE.Mesh(pylonGeo, woodDarkMat);
      pLeft.position.set(-width / 2 + 0.25, -pylonHeight / 2 - 0.2, pz);
      bridge.add(pLeft);

      const pRight = new THREE.Mesh(pylonGeo, woodDarkMat);
      pRight.position.set(width / 2 - 0.25, -pylonHeight / 2 - 0.2, pz);
      bridge.add(pRight);

      // Horizontal cross-strut between the two pylons
      const strut1 = new THREE.Mesh(strutGeo, woodDarkMat);
      strut1.position.set(0, -1.2, pz);
      bridge.add(strut1);

      const strut2 = new THREE.Mesh(strutGeo, woodDarkMat);
      strut2.position.set(0, -2.8, pz);
      bridge.add(strut2);
    }

    // Cross planks
    const plankWidth = 0.38;
    const plankGap = 0.08;
    const plankCount = Math.floor(length / (plankWidth + plankGap));
    const startZ = -length / 2 + plankWidth / 2;

    const plankGeo = new THREE.BoxGeometry(width, 0.1, plankWidth);

    for (let i = 0; i < plankCount; i++) {
      // In Type C (Broken bridge), create deliberate gaps/missing planks in the middle
      if (type === 'broken') {
        const normPos = Math.abs(i - plankCount / 2) / (plankCount / 2);
        if (normPos < 0.35 && i % 2 === 0) {
          // Missing plank! Create open hazard hole
          continue;
        }
      }

      const mat = (i % 2 === 0) ? woodDarkMat : woodLightMat;
      const plank = new THREE.Mesh(plankGeo, mat);
      const zPos = startZ + i * (plankWidth + plankGap);
      plank.position.set(0, 0, zPos);

      // In Type B (Unstable bridge), give planks slight realistic tilt & wobble
      if (type === 'unstable') {
        plank.rotation.y = (Math.sin(i * 3.7) * 0.06);
        plank.rotation.z = (Math.cos(i * 2.3) * 0.04);
        plank.position.y += Math.sin(i * 1.5) * 0.02;
      }

      plank.castShadow = true;
      plank.receiveShadow = true;
      bridge.add(plank);
    }

    // Side guard rails / rope posts
    const postGeo = new THREE.CylinderGeometry(0.06, 0.07, 1.1, 6);
    const postSpacing = 1.8;
    const numPosts = Math.max(2, Math.floor(length / postSpacing));
    const pStartZ = -length / 2 + 0.3;

    for (let i = 0; i <= numPosts; i++) {
      const z = pStartZ + i * (length - 0.6) / numPosts;

      // In broken bridge, some posts are snapped or missing
      if (type === 'broken' && i === Math.floor(numPosts / 2)) {
        continue;
      }

      const leftPost = new THREE.Mesh(postGeo, woodDarkMat);
      leftPost.position.set(-width / 2 + 0.15, 0.55, z);
      bridge.add(leftPost);

      const rightPost = new THREE.Mesh(postGeo, woodDarkMat);
      rightPost.position.set(width / 2 - 0.15, 0.55, z);
      bridge.add(rightPost);
    }

    // Ropes along the posts
    const ropeGeo = new THREE.CylinderGeometry(0.03, 0.03, length, 6);
    ropeGeo.rotateX(Math.PI / 2);

    const leftRope = new THREE.Mesh(ropeGeo, ropeMat);
    leftRope.position.set(-width / 2 + 0.15, 0.9, 0);
    bridge.add(leftRope);

    const rightRope = new THREE.Mesh(ropeGeo, ropeMat);
    rightRope.position.set(width / 2 - 0.15, 0.9, 0);
    bridge.add(rightRope);

    return bridge;
  }

  public static createStaircase(width: number, height: number, length: number): THREE.Group {
    return EnvironmentPropFactory.createWallStaircase(width, height, length, 'concrete');
  }

  public static createStairwellBalustrade(length: number, height: number = 1.05): THREE.Group {
    return EnvironmentPropFactory.createWallStairwellParapet(length, height, 'concrete');
  }

  public static createDirectionalArrowDecal(
    dir: 'right' | 'left' | 'up',
    label: string = 'TANGGA / STAIRS',
    colorType: 'stairs' | 'exit' = 'stairs',
    subLabel?: string
  ): THREE.Group {
    const group = new THREE.Group();
    group.name = 'DirectionalArrowDecal';

    const cacheKey = `${dir}_${label}_${colorType}_${subLabel || ''}`;
    if (this._directionalArrowMatMap.has(cacheKey)) {
      const cachedMat = this._directionalArrowMatMap.get(cacheKey)!;
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8), cachedMat);
      mesh.position.y = 1.9;
      mesh.renderOrder = 50;
      group.add(mesh);
      return group;
    }

    if (typeof document === 'undefined') {
      const dummy = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8), new THREE.MeshBasicMaterial());
      dummy.position.y = 1.9;
      group.add(dummy);
      return group;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Transparent background
    ctx.clearRect(0, 0, 512, 256);

    // Grunge stencil spray background
    const isExit = colorType === 'exit';
    const haloGrad = ctx.createRadialGradient(256, 128, 20, 256, 128, 240);
    if (isExit) {
      haloGrad.addColorStop(0, 'rgba(5, 38, 18, 0.92)');
      haloGrad.addColorStop(0.65, 'rgba(5, 30, 15, 0.5)');
      haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    } else {
      haloGrad.addColorStop(0, 'rgba(15, 20, 25, 0.88)');
      haloGrad.addColorStop(0.65, 'rgba(15, 20, 25, 0.45)');
      haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    }
    ctx.fillStyle = haloGrad;
    ctx.fillRect(0, 0, 512, 256);

    // Parse primary (Indonesian) & secondary (English) labels
    let primaryText = label;
    let secondaryText = subLabel || '';
    if (!secondaryText) {
      if (label.includes('\n')) {
        const parts = label.split('\n');
        primaryText = parts[0].trim();
        secondaryText = parts[1].trim();
      } else if (label.includes(' / ')) {
        const parts = label.split(' / ');
        primaryText = parts[0].trim();
        secondaryText = parts[1].trim();
      }
    }

    // Phosphorescent paint color (Stairs: pale warm chalk | Exit: vivid emergency emerald phosphor)
    const arrowColor = isExit ? '#4ade80' : '#fffae0';
    const primaryColor = isExit ? '#86efac' : '#fff4b8';
    const secondaryColor = isExit ? '#bbf7d0' : '#fde68a';

    ctx.fillStyle = arrowColor;
    ctx.strokeStyle = arrowColor;
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw directional arrow
    if (dir === 'right') {
      ctx.beginPath();
      ctx.moveTo(70, 75);
      ctx.lineTo(410, 75);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(330, 25);
      ctx.lineTo(430, 75);
      ctx.lineTo(330, 125);
      ctx.stroke();
    } else if (dir === 'left') {
      ctx.beginPath();
      ctx.moveTo(442, 75);
      ctx.lineTo(102, 75);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(182, 25);
      ctx.lineTo(82, 75);
      ctx.lineTo(182, 125);
      ctx.stroke();
    } else {
      // UP
      ctx.beginPath();
      ctx.moveTo(256, 115);
      ctx.lineTo(256, 25);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(195, 65);
      ctx.lineTo(256, 20);
      ctx.lineTo(317, 65);
      ctx.stroke();
    }

    // Text rendering helper with adaptive font sizing to prevent truncation
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const getFitFont = (text: string, baseSize: number, maxLen: number = 22) => {
      const size = text.length > maxLen ? Math.max(16, Math.floor(baseSize * (maxLen / text.length))) : baseSize;
      return `bold ${size}px "Share Tech Mono", monospace, sans-serif`;
    };

    if (secondaryText) {
      // Bilingual 2-Line Layout (Indonesian on line 1, English on line 2)
      ctx.font = getFitFont(primaryText, 28, 22);
      ctx.fillStyle = primaryColor;
      ctx.fillText(primaryText, 256, 172);

      ctx.font = getFitFont(secondaryText, 22, 24);
      ctx.fillStyle = secondaryColor;
      ctx.fillText(secondaryText, 256, 214);
    } else {
      // Single line layout
      ctx.font = getFitFont(primaryText, 32, 20);
      ctx.fillStyle = primaryColor;
      ctx.fillText(primaryText, 256, 185);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;

    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      alphaTest: 0.05,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4.0,
      polygonOffsetUnits: -4.0,
    });
    this._directionalArrowMatMap.set(cacheKey, mat);

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8), mat);
    mesh.position.y = 1.9; // Eye level
    mesh.renderOrder = 50;
    group.add(mesh);

    return group;
  }

  // =========================================================================
  // LEVEL 4 — INDONESIAN CEMETERY PROPS (Makam Khas Indonesia, Gapura, Gubuk Kuncen)
  // =========================================================================

  /**
   * Traditional Indonesian Kijing Tombstone (Makam Semen Kijing Tradisional)
   * Two-tiered concrete plinth with head and foot tombstones and plumeria petals.
   */
  public static createIndonesianGraveKijing(variant: 'stone' | 'mossy' | 'whitewash' = 'stone'): THREE.Group {
    const group = new THREE.Group();
    group.name = 'IndonesianGraveKijing';

    const stoneTex = typeof document !== 'undefined'
      ? TextureGenerator.createTombstoneTexture()
      : undefined;

    const stoneColor = variant === 'mossy' ? 0x4a5445 : (variant === 'whitewash' ? 0x9e9e9a : 0x55585d);
    const graveMat = new THREE.MeshLambertMaterial({
      color: stoneColor,
      map: stoneTex,
    });

    const flowerMat = new THREE.MeshBasicMaterial({ color: 0xfffae0 });

    // Lower plinth base
    const baseGeo = new THREE.BoxGeometry(1.85, 0.28, 0.85);
    const base = new THREE.Mesh(baseGeo, graveMat);
    base.position.y = 0.14;
    group.add(base);

    // Upper stepped plinth
    const stepGeo = new THREE.BoxGeometry(1.55, 0.18, 0.62);
    const step = new THREE.Mesh(stepGeo, graveMat);
    step.position.y = 0.37;
    group.add(step);

    // Head and Foot Tombstones (Nisan Kepala & Nisan Kaki)
    for (const xOffset of [-0.62, 0.62]) {
      // Cylindrical nisan body with dome top
      const nisanGeo = new THREE.CylinderGeometry(0.08, 0.10, 0.48, 6);
      const nisan = new THREE.Mesh(nisanGeo, graveMat);
      nisan.position.set(xOffset, 0.70, 0);
      nisan.rotation.z = (Math.random() - 0.5) * 0.08;
      group.add(nisan);

      const domeGeo = new THREE.SphereGeometry(0.09, 5, 5);
      const dome = new THREE.Mesh(domeGeo, graveMat);
      dome.position.set(xOffset, 0.94, 0);
      group.add(dome);
    }

    // Scattered Kamboja petals on top of grave
    for (let i = 0; i < 4; i++) {
      const petal = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.08), flowerMat);
      petal.position.set(
        (Math.random() - 0.5) * 0.9,
        0.47,
        (Math.random() - 0.5) * 0.4
      );
      petal.rotation.x = -Math.PI / 2;
      group.add(petal);
    }

    return group;
  }

  /**
   * Traditional Earthen Mound Grave (Makam Gundukan Tanah Desa)
   * Red dirt soil mound with simple wooden stakes (patok nisan kayu).
   */
  public static createIndonesianGraveEarthen(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'IndonesianGraveEarthen';

    const soilMat = new THREE.MeshLambertMaterial({ color: 0x3d281a });
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x2e2216 });
    const grassMat = new THREE.MeshLambertMaterial({ color: 0x364822 });

    // Curved soil mound
    const moundGeo = new THREE.CylinderGeometry(0.38, 0.48, 1.7, 6);
    moundGeo.rotateZ(Math.PI / 2);
    const mound = new THREE.Mesh(moundGeo, soilMat);
    mound.position.set(0, 0.22, 0);
    mound.scale.set(1.0, 0.65, 1.0);
    group.add(mound);

    // Weathered wooden grave stakes (patok kayu)
    for (const xOffset of [-0.68, 0.68]) {
      const stakeGeo = new THREE.BoxGeometry(0.09, 0.55, 0.04);
      const stake = new THREE.Mesh(stakeGeo, woodMat);
      stake.position.set(xOffset, 0.42, 0);
      stake.rotation.z = (Math.random() - 0.5) * 0.16;
      stake.rotation.y = (Math.random() - 0.5) * 0.2;
      group.add(stake);
    }

    // Small tufts of grass on edge
    for (let i = 0; i < 3; i++) {
      const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.25, 4), grassMat);
      tuft.position.set((Math.random() - 0.5) * 1.2, 0.25, (Math.random() - 0.5) * 0.5);
      group.add(tuft);
    }

    return group;
  }

  /**
   * Graveyard Caretaker Shack (Gubuk Kuncen Penjaga Makam)
   * Wooden shack with palm-fiber thatch roof and porch.
   */
  public static createKuncenHut(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'KuncenHut';

    const woodMat = new THREE.MeshLambertMaterial({ color: 0x3d2c1c });
    const plankMat = new THREE.MeshLambertMaterial({ color: 0x4d3822 });
    const thatchMat = new THREE.MeshLambertMaterial({ color: 0x281f14 });

    // Main hut walls (3.2m wide, 2.6m deep, 2.4m tall)
    const wallsGeo = new THREE.BoxGeometry(3.2, 2.4, 2.6);
    const walls = new THREE.Mesh(wallsGeo, woodMat);
    walls.position.y = 1.2;
    group.add(walls);

    // Front porch floor plinth
    const porchGeo = new THREE.BoxGeometry(3.4, 0.15, 1.2);
    const porch = new THREE.Mesh(porchGeo, plankMat);
    porch.position.set(0, 0.08, 1.8);
    group.add(porch);

    // Front porch wooden support posts
    for (const px of [-1.5, 1.5]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.4, 5), woodMat);
      post.position.set(px, 1.2, 2.3);
      group.add(post);
    }

    // Gabled Thatch Roof (Atap Ijuk Miring)
    const roofGeo = new THREE.ConeGeometry(3.0, 1.4, 4);
    roofGeo.rotateY(Math.PI / 4);
    const roof = new THREE.Mesh(roofGeo, thatchMat);
    roof.scale.set(1.4, 1.0, 1.35);
    roof.position.set(0, 2.9, 0.3);
    group.add(roof);

    // Kuncen oil lantern hanging on porch
    const lanternMat = new THREE.MeshBasicMaterial({ color: 0xffaa44 });
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.22, 6), lanternMat);
    lantern.position.set(0.8, 2.0, 2.2);
    group.add(lantern);

    const light = new THREE.PointLight(0xff9933, 1.0, 8.5);
    light.position.set(0.8, 1.9, 2.2);
    group.add(light);

    return group;
  }

  /**
   * Ancient Cemetery Iron Gate (Gerbang Besi Pintu Keluar Makam Tua)
   * Two stone boundary pillars with rusty wrought iron gates.
   */
  public static createCemeteryIronGate(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'CemeteryIronGate';

    const pillarMat = new THREE.MeshLambertMaterial({ color: 0x4a4742 });
    const ironMat = new THREE.MeshLambertMaterial({ color: 0x222426 });

    // Left and Right Stone Pillars
    for (const px of [-1.55, 1.55]) {
      const pillarGeo = new THREE.BoxGeometry(0.72, 3.4, 0.72);
      const pillar = new THREE.Mesh(pillarGeo, pillarMat);
      pillar.position.set(px, 1.7, 0);
      group.add(pillar);

      // Pillar pyramid cap
      const capGeo = new THREE.ConeGeometry(0.55, 0.45, 4);
      capGeo.rotateY(Math.PI / 4);
      const cap = new THREE.Mesh(capGeo, pillarMat);
      cap.position.set(px, 3.6, 0);
      group.add(cap);
    }

    // Rusty iron gate leaves (slightly ajar / open inviting escape)
    // Left gate leaf
    const gateGeo = new THREE.BoxGeometry(1.25, 2.6, 0.06);
    const leftGate = new THREE.Mesh(gateGeo, ironMat);
    leftGate.position.set(-0.65, 1.4, 0.2);
    leftGate.rotation.y = 0.35; // slightly swung open
    group.add(leftGate);

    // Right gate leaf
    const rightGate = new THREE.Mesh(gateGeo, ironMat);
    rightGate.position.set(0.65, 1.4, -0.2);
    rightGate.rotation.y = -0.4;
    group.add(rightGate);

    // Green escape beacon light on gate arch
    const beaconLight = new THREE.PointLight(0x22c55e, 1.6, 14.0);
    beaconLight.position.set(0, 3.2, 0);
    group.add(beaconLight);

    return group;
  }

  /**
   * Graveyard Bamboo Torch / Lantern Post
   */
  public static createCemeteryLanternPost(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'CemeteryLanternPost';

    const bambooMat = new THREE.MeshLambertMaterial({ color: 0x4a4428 });
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xff8822 });

    // Bamboo stake in ground
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.1, 5), bambooMat);
    pole.position.y = 1.05;
    group.add(pole);

    // Flame head
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 5), flameMat);
    flame.position.y = 2.15;
    group.add(flame);

    // Warm eerie flickering light
    const torchLight = new THREE.PointLight(0xff8822, 0.9, 7.5);
    torchLight.position.y = 2.2;
    group.add(torchLight);

    return group;
  }

  // =========================================================================
  // LEVEL 5 — ANCIENT CAVERN PROPS (Batu Purba, Stalagmit, Obor Gua, Perapian)
  // =========================================================================

  /**
   * Stalagmite Stone Pillar Cluster (Pilar Bebatuan Stalagmit Gua)
   */
  public static createStalagmiteCluster(height: number = 2.4, baseRadius: number = 0.55): THREE.Group {
    const group = new THREE.Group();
    group.name = 'StalagmiteCluster';

    const stoneTex = typeof document !== 'undefined'
      ? TextureGenerator.createStalagmiteTexture()
      : undefined;

    const rockMat = new THREE.MeshLambertMaterial({
      color: 0x4a463e,
      map: stoneTex,
    });

    // Central main tapered stalagmite cone
    const mainGeo = new THREE.ConeGeometry(baseRadius, height, 7);
    const mainCone = new THREE.Mesh(mainGeo, rockMat);
    mainCone.position.y = height / 2;
    mainCone.rotation.y = Math.random() * Math.PI;
    group.add(mainCone);

    // 2-3 smaller secondary stalagmite shoots around base
    const shootOffsets = [
      { ox: baseRadius * 0.7, oz: 0.1, h: height * 0.55, r: baseRadius * 0.45 },
      { ox: -baseRadius * 0.5, oz: baseRadius * 0.6, h: height * 0.42, r: baseRadius * 0.38 },
      { ox: -baseRadius * 0.4, oz: -baseRadius * 0.5, h: height * 0.65, r: baseRadius * 0.5 },
    ];

    for (const s of shootOffsets) {
      const sGeo = new THREE.ConeGeometry(s.r, s.h, 6);
      const sMesh = new THREE.Mesh(sGeo, rockMat);
      sMesh.position.set(s.ox, s.h / 2, s.oz);
      sMesh.rotation.z = (Math.random() - 0.5) * 0.12;
      group.add(sMesh);
    }

    return group;
  }

  /**
   * Stalactite Ceiling Rock Cluster (Batu Menetes Menggantung dari Langit-Langit)
   */
  public static createStalactiteCluster(height: number = 1.8, radius: number = 0.45): THREE.Group {
    const group = new THREE.Group();
    group.name = 'StalactiteCluster';

    const rockMat = new THREE.MeshLambertMaterial({
      color: 0x3d3932,
    });

    // Inverted cone hanging down from ceiling
    const coneGeo = new THREE.ConeGeometry(radius, height, 6);
    coneGeo.rotateX(Math.PI); // Point downwards
    const coneMesh = new THREE.Mesh(coneGeo, rockMat);
    coneMesh.position.y = -height / 2;
    group.add(coneMesh);

    return group;
  }

  /**
   * Ancient Cave Stone Torch Sconce (Obor Batu Dinding Gua Berkedip)
   */
  public static createCaveWallTorch(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'CaveWallTorch';

    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x36332c });
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x221a12 });
    const flameMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });

    // Stone bracket mount
    const bracketGeo = new THREE.BoxGeometry(0.22, 0.32, 0.28);
    const bracket = new THREE.Mesh(bracketGeo, stoneMat);
    group.add(bracket);

    // Diagonal wood/stone torch branch
    const branchGeo = new THREE.CylinderGeometry(0.04, 0.05, 0.65, 5);
    const branch = new THREE.Mesh(branchGeo, woodMat);
    branch.rotation.x = Math.PI / 4;
    branch.position.set(0, 0.18, 0.22);
    group.add(branch);

    // Glowing flame head
    const flameGeo = new THREE.ConeGeometry(0.09, 0.26, 6);
    const flame = new THREE.Mesh(flameGeo, flameMat);
    flame.position.set(0, 0.44, 0.42);
    group.add(flame);

    // Warm ambient point light
    const fireLight = new THREE.PointLight(0xf59e0b, 1.6, 9.0, 1.4);
    fireLight.position.set(0, 0.48, 0.46);
    group.add(fireLight);

    return group;
  }

  /**
   * Explorer Campfire Site (Perapian Batu Penjelajah Luar Gua)
   */
  public static createExplorerCampfire(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'ExplorerCampfire';

    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x484238 });
    const ashMat = new THREE.MeshLambertMaterial({ color: 0x1f1d1a });
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x382212 });
    const emberMat = new THREE.MeshBasicMaterial({ color: 0xd97706 });

    // Inner ash bed
    const ash = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.70, 0.08, 10), ashMat);
    ash.position.y = 0.04;
    group.add(ash);

    // Circular ring of rough boundary rocks
    const rockCount = 8;
    for (let i = 0; i < rockCount; i++) {
      const angle = (i / rockCount) * Math.PI * 2;
      const rockGeo = new THREE.DodecahedronGeometry(0.18 + (i % 2) * 0.04);
      const rockMesh = new THREE.Mesh(rockGeo, stoneMat);
      rockMesh.position.set(Math.cos(angle) * 0.72, 0.14, Math.sin(angle) * 0.72);
      group.add(rockMesh);
    }

    // Crossed burnt logs
    const log1 = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.85, 5), woodMat);
    log1.rotation.set(0, Math.PI / 4, Math.PI / 2);
    log1.position.y = 0.12;
    group.add(log1);

    const log2 = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.82, 5), woodMat);
    log2.rotation.set(0, -Math.PI / 4, Math.PI / 2);
    log2.position.y = 0.14;
    group.add(log2);

    // Glowing warm embers
    const ember = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 6), emberMat);
    ember.position.y = 0.16;
    group.add(ember);

    const emberLight = new THREE.PointLight(0xd97706, 1.2, 6.0);
    emberLight.position.y = 0.28;
    group.add(emberLight);

    return group;
  }

  /**
   * Cavern Exit Fissure Gate (Celah Batu Gua Kuno Keluar)
   */
  public static createCavernExitArch(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'CavernExitArch';

    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x3a362f });
    const greenGlowMat = new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.8 });

    // Left stone monolith pillar
    const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(0.7, 4.2, 0.9), stoneMat);
    leftPillar.position.set(-1.4, 2.1, 0);
    leftPillar.rotation.z = -0.04;
    group.add(leftPillar);

    // Right stone monolith pillar
    const rightPillar = new THREE.Mesh(new THREE.BoxGeometry(0.7, 4.2, 0.9), stoneMat);
    rightPillar.position.set(1.4, 2.1, 0);
    rightPillar.rotation.z = 0.04;
    group.add(rightPillar);

    // Top lintel arch rock
    const topLintel = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.85, 1.1), stoneMat);
    topLintel.position.set(0, 4.2, 0);
    group.add(topLintel);

    // Luminous mystical green beacon portal inside opening
    const portalMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 3.6), greenGlowMat);
    portalMesh.position.set(0, 1.8, 0.05);
    group.add(portalMesh);

    // Green beacon point light
    const exitLight = new THREE.PointLight(0x10b981, 2.2, 12.0);
    exitLight.position.set(0, 2.2, 0.4);
    group.add(exitLight);

    return group;
  }

  // =========================================================================
  // LEVEL 5 — UNDERGROUND MILITARY BUNKER PROPS
  // =========================================================================

  /**
   * Military Outpost Sandbag Fortification (Barikade Karung Pasir Militer Luar)
   */
  public static createBunkerSandbags(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'BunkerSandbags';

    const bagMat = new THREE.MeshLambertMaterial({ color: 0x8a7b58 });

    // 3 layers of stacked sandbags
    const bagGeo = new THREE.BoxGeometry(0.85, 0.24, 0.45);
    for (let layer = 0; layer < 3; layer++) {
      const count = 3 - (layer % 2);
      const offsetX = (layer % 2) * 0.4;
      for (let i = 0; i < count; i++) {
        const bag = new THREE.Mesh(bagGeo, bagMat);
        bag.position.set(-0.8 + offsetX + i * 0.85, layer * 0.22 + 0.12, 0);
        bag.rotation.y = (Math.random() - 0.5) * 0.08;
        group.add(bag);
      }
    }

    return group;
  }

  /**
   * Ammo Crates and Supply Barrels (Peti Amunisi & Drum Logam Militer)
   */
  public static createBunkerCrateStack(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'BunkerCrateStack';

    const crateMat = new THREE.MeshLambertMaterial({ color: 0x3d4734 }); // Olive drab
    const drumMat = new THREE.MeshLambertMaterial({ color: 0x27353f });

    // Two crates on floor
    const c1 = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.75, 0.9), crateMat);
    c1.position.set(-0.55, 0.38, 0);
    group.add(c1);

    const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.85), crateMat);
    c2.position.set(0.5, 0.35, 0.1);
    group.add(c2);

    // One crate stacked on top
    const c3 = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.65, 0.8), crateMat);
    c3.position.set(-0.45, 1.08, 0);
    c3.rotation.y = 0.15;
    group.add(c3);

    // Steel fuel drum
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.95, 8), drumMat);
    drum.position.set(1.1, 0.48, -0.2);
    group.add(drum);

    return group;
  }

  /**
   * Heavy Blast Entrance Hatch (Pintu Baja Gerbang Masuk Bunker Luar)
   */
  public static createBunkerBlastEntrance(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'BunkerBlastEntrance';

    const steelMat = new THREE.MeshLambertMaterial({ color: 0x2c3338 });
    const hazardMat = new THREE.MeshLambertMaterial({ color: 0xd97706 });
    const yellowLightMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });

    // Reinforced steel bulkhead frame
    const frameLeft = new THREE.Mesh(new THREE.BoxGeometry(0.65, 4.4, 0.8), steelMat);
    frameLeft.position.set(-2.2, 2.2, 0);
    group.add(frameLeft);

    const frameRight = new THREE.Mesh(new THREE.BoxGeometry(0.65, 4.4, 0.8), steelMat);
    frameRight.position.set(2.2, 2.2, 0);
    group.add(frameRight);

    const frameTop = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.8, 0.85), steelMat);
    frameTop.position.set(0, 4.0, 0);
    group.add(frameTop);

    // Hazard striped header bar
    const hazardBar = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.25, 0.9), hazardMat);
    hazardBar.position.set(0, 3.48, 0);
    group.add(hazardBar);

    // Steel threshold plate across doorway seam
    const thresholdPlate = new THREE.Mesh(new THREE.BoxGeometry(5.0, 0.06, 1.4), steelMat);
    thresholdPlate.position.set(0, 0.03, 0);
    thresholdPlate.receiveShadow = true;
    group.add(thresholdPlate);

    // Overhead industrial floodlight
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.25, 0.3), yellowLightMat);
    lamp.position.set(0, 3.9, 0.55);
    group.add(lamp);

    const floodlight = new THREE.PointLight(0xfbbf24, 2.0, 16.0);
    floodlight.position.set(0, 3.8, 0.8);
    group.add(floodlight);

    return group;
  }

  /**
   * Industrial Caged Bunker Warning Light (Lampu Peringatan Berkedip Koridor Bunker)
   */
  public static createBunkerCageLight(isRed: boolean = false): THREE.Group {
    const group = new THREE.Group();
    group.name = 'BunkerCageLight';

    const colorHex = isRed ? 0xef4444 : 0xf59e0b;
    const bulbMat = new THREE.MeshBasicMaterial({ color: colorHex });
    const cageMat = new THREE.MeshLambertMaterial({ color: 0x1f2224 });

    // Base bracket
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.35, 0.18), cageMat);
    group.add(base);

    // Glowing bulb
    const bulb = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.28, 6), bulbMat);
    bulb.position.set(0, 0, 0.16);
    group.add(bulb);

    // Wire guard cage
    const wireGuard = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.32, 0.24), cageMat);
    wireGuard.position.set(0, 0, 0.16);
    group.add(wireGuard);

    // Point Light
    const light = new THREE.PointLight(colorHex, 1.8, 9.5, 1.3);
    light.position.set(0, 0, 0.3);
    if (isRed) light.name = 'BunkerRedPointLight';
    group.add(light);

    return group;
  }

  /**
   * Emergency Vault Exit Door (Pintu Keluar Baja Darurat Bunker)
   */
  public static createBunkerExitVault(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'BunkerExitVault';

    const steelMat = new THREE.MeshLambertMaterial({ color: 0x242b2e });
    const greenLightMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });

    // Vault portal frame
    const frame = new THREE.Mesh(new THREE.BoxGeometry(3.6, 4.2, 0.7), steelMat);
    frame.position.y = 2.1;
    group.add(frame);

    // Emergency escape exit beacon sign
    const sign = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.45, 0.1), greenLightMat);
    sign.position.set(0, 3.8, 0.4);
    group.add(sign);

    // Wheel handle
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.05, 6, 12), steelMat);
    wheel.position.set(0, 1.9, 0.4);
    group.add(wheel);

    // Green emergency illumination
    const exitLight = new THREE.PointLight(0x10b981, 2.4, 12.0);
    exitLight.position.set(0, 2.2, 0.8);
    group.add(exitLight);

    return group;
  }

  /**
   * Level 3 Floor Trail Decal — Vivid Red Blood Stains & Splatters on Floor
   * Distinct crimson blood marks guiding players directly towards Pocong's location on Floor 0.
   */
  public static createPocongTrailDecal(
    type: 'dirt_footprints' | 'shroud_cloth' | 'grave_soil_cluster' | 'blood_drag' | 'blood_splatter' | 'blood_pool'
  ): THREE.Mesh {
    // Map legacy names to blood decals
    let bloodType: 'blood_drag' | 'blood_splatter' | 'blood_pool' = 'blood_drag';
    if (type === 'grave_soil_cluster' || type === 'blood_pool') {
      bloodType = 'blood_pool';
    } else if (type === 'shroud_cloth' || type === 'blood_splatter') {
      bloodType = 'blood_splatter';
    } else {
      bloodType = 'blood_drag';
    }

    const size = bloodType === 'blood_pool' ? 2.6 : (bloodType === 'blood_drag' ? 1.6 : 1.4);
    const geo = new THREE.PlaneGeometry(size, size);
    // Bake horizontal ground orientation directly into geometry vertices
    // so any mesh.rotation.y smoothly spins flat on the floor without tilting!
    geo.rotateX(-Math.PI / 2);

    if (this._pocongTrailMatMap.has(bloodType)) {
      const cachedMat = this._pocongTrailMatMap.get(bloodType)!;
      const mesh = new THREE.Mesh(geo, cachedMat);
      mesh.name = `PocongTrail_${bloodType}`;
      mesh.position.y = 0.025;
      mesh.renderOrder = 25;
      return mesh;
    }

    if (typeof document === 'undefined') {
      const dummy = new THREE.Mesh(geo, new THREE.MeshBasicMaterial());
      dummy.position.y = 0.025;
      return dummy;
    }

    const canvasSize = bloodType === 'blood_pool' ? 512 : 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, canvasSize, canvasSize);

    if (bloodType === 'blood_drag') {
      const s = canvasSize / 128;

      // Bloody foot drag and splatters pointing UP (towards forward direction)
      const drawBloodFootprint = (cx: number, cy: number, w: number, h: number, rot: number) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);

        // Core thick blood stain
        const grad = ctx.createRadialGradient(0, 0, 1 * s, 0, 0, Math.max(w, h));
        grad.addColorStop(0, 'rgba(115, 0, 0, 0.98)');
        grad.addColorStop(0.35, 'rgba(180, 10, 10, 0.95)');
        grad.addColorStop(0.8, 'rgba(140, 5, 5, 0.85)');
        grad.addColorStop(1, 'rgba(95, 0, 0, 0)');
        ctx.fillStyle = grad;

        ctx.beginPath();
        ctx.ellipse(0, 0, w, h, 0, 0, Math.PI * 2);
        ctx.fill();

        // Dark coagulated center clots
        ctx.fillStyle = 'rgba(50, 0, 0, 0.95)';
        for (let i = 0; i < 4; i++) {
          const rx = (Math.random() - 0.5) * w * 0.8;
          const ry = (Math.random() - 0.5) * h * 0.8;
          ctx.beginPath();
          ctx.arc(rx, ry, 1.2 * s + Math.random() * 2 * s, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      };

      // Drag smears behind footprint
      const dragGrad = ctx.createLinearGradient(64 * s, 115 * s, 64 * s, 65 * s);
      dragGrad.addColorStop(0, 'rgba(140, 5, 5, 0.72)');
      dragGrad.addColorStop(0.6, 'rgba(175, 12, 12, 0.45)');
      dragGrad.addColorStop(1, 'rgba(90, 0, 0, 0)');
      ctx.fillStyle = dragGrad;
      ctx.fillRect(44 * s, 65 * s, 40 * s, 45 * s);

      // Two bloody drag / foot impressions
      drawBloodFootprint(52 * s, 56 * s, 11 * s, 24 * s, -0.06);
      drawBloodFootprint(76 * s, 56 * s, 11 * s, 24 * s, 0.06);

      // Splatter droplets sprayed forward (in the direction of travel)
      ctx.fillStyle = 'rgba(195, 15, 15, 0.94)';
      for (let i = 0; i < 22; i++) {
        const x = 32 * s + Math.random() * 64 * s;
        const y = 8 * s + Math.random() * 45 * s;
        const r = 1 * s + Math.random() * 2.5 * s;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (bloodType === 'blood_splatter') {
      const s = canvasSize / 128;
      ctx.save();
      ctx.translate(64 * s, 64 * s);

      // Central irregular pool of crimson blood
      ctx.beginPath();
      const points = 10;
      for (let i = 0; i < points; i++) {
        const angle = (i / points) * Math.PI * 2;
        const dist = (20 + (Math.sin(i * 3.7) * 8 + Math.cos(i * 2.1) * 6)) * s;
        const px = Math.cos(angle) * dist;
        const py = Math.sin(angle) * dist;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();

      const poolGrad = ctx.createRadialGradient(0, 0, 2 * s, 0, 0, 32 * s);
      poolGrad.addColorStop(0, 'rgba(110, 0, 0, 0.98)');
      poolGrad.addColorStop(0.5, 'rgba(175, 15, 15, 0.95)');
      poolGrad.addColorStop(0.85, 'rgba(140, 5, 5, 0.85)');
      poolGrad.addColorStop(1, 'rgba(80, 0, 0, 0)');
      ctx.fillStyle = poolGrad;
      ctx.fill();

      // Splatter arms / tendrils projecting outwards
      ctx.strokeStyle = 'rgba(180, 15, 15, 0.94)';
      ctx.lineWidth = 3 * s;
      ctx.lineCap = 'round';
      const armAngles = [0.3, 0.9, 1.8, 2.7, 3.6, 4.4, 5.3];
      for (const ang of armAngles) {
        ctx.beginPath();
        const startR = 15 * s;
        const endR = (35 + Math.random() * 20) * s;
        ctx.moveTo(Math.cos(ang) * startR, Math.sin(ang) * startR);
        ctx.lineTo(Math.cos(ang) * endR, Math.sin(ang) * endR);
        ctx.stroke();

        // Droplet at end of arm
        ctx.beginPath();
        ctx.arc(
          Math.cos(ang) * (endR + 4 * s),
          Math.sin(ang) * (endR + 4 * s),
          (1.5 + Math.random() * 2) * s,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      // Small scattered satellite blood droplets
      ctx.fillStyle = 'rgba(190, 20, 20, 0.92)';
      for (let i = 0; i < 28; i++) {
        const rad = (25 + Math.random() * 32) * s;
        const ang = Math.random() * Math.PI * 2;
        const bx = Math.cos(ang) * rad;
        const by = Math.sin(ang) * rad;
        const br = (0.8 + Math.random() * 2.2) * s;
        ctx.beginPath();
        ctx.arc(bx, by, br, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    } else {
      // 'blood_pool' - Massive pool of dark red blood at Pocong's resting spot
      const s = canvasSize / 256;
      ctx.save();
      ctx.translate(128 * s, 128 * s);

      // Deep dark coagulated core
      const baseGrad = ctx.createRadialGradient(0, 0, 15 * s, 0, 0, 110 * s);
      baseGrad.addColorStop(0, 'rgba(65, 0, 0, 0.98)');
      baseGrad.addColorStop(0.35, 'rgba(115, 0, 0, 0.96)');
      baseGrad.addColorStop(0.7, 'rgba(175, 12, 12, 0.9)');
      baseGrad.addColorStop(0.9, 'rgba(140, 5, 5, 0.65)');
      baseGrad.addColorStop(1, 'rgba(70, 0, 0, 0)');
      ctx.fillStyle = baseGrad;

      // Organic pool shape with varying radii
      ctx.beginPath();
      const numPoints = 24;
      for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * Math.PI * 2;
        const r = (75 + Math.sin(i * 2.3) * 16 + Math.cos(i * 3.8) * 12 + Math.sin(i * 5.1) * 8) * s;
        const px = Math.cos(angle) * r;
        const py = Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();

      // Blood smears / finger-drag marks reaching outwards
      ctx.strokeStyle = 'rgba(150, 10, 10, 0.88)';
      ctx.lineWidth = 5 * s;
      ctx.lineCap = 'round';
      for (let i = 0; i < 5; i++) {
        const ang = 0.5 + i * 1.25;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * 60 * s, Math.sin(ang) * 60 * s);
        ctx.quadraticCurveTo(
          Math.cos(ang + 0.2) * 85 * s,
          Math.sin(ang + 0.2) * 85 * s,
          Math.cos(ang - 0.1) * 115 * s,
          Math.sin(ang - 0.1) * 115 * s
        );
        ctx.stroke();
      }

      // Dense perimeter blood splatters and drops
      ctx.fillStyle = 'rgba(195, 18, 18, 0.94)';
      for (let i = 0; i < 60; i++) {
        const rad = (65 + Math.random() * 55) * s;
        const ang = Math.random() * Math.PI * 2;
        const x = Math.cos(ang) * rad;
        const y = Math.sin(ang) * rad;
        const cr = (1.2 + Math.random() * 3.8) * s;
        ctx.beginPath();
        ctx.arc(x, y, cr, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;

    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -3.0,
      polygonOffsetUnits: -3.0,
    });
    this._pocongTrailMatMap.set(bloodType, mat);

    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = `PocongTrail_${bloodType}`;
    mesh.position.y = 0.025;
    mesh.renderOrder = 25;
    return mesh;
  }

  /**
   * Floor Emergency Exit Decal — Vivid Green Phosphor Arrow on the Floor
   * Specifically guides players right at the entrance corridor leading to the Exit Door.
   */
  public static createFloorExitArrowDecal(label: string = 'EXIT ➔'): THREE.Mesh {
    const geo = new THREE.PlaneGeometry(1.8, 1.8);
    geo.rotateX(-Math.PI / 2);

    if (this._floorExitArrowMatMap.has(label)) {
      const cachedMat = this._floorExitArrowMatMap.get(label)!;
      const mesh = new THREE.Mesh(geo, cachedMat);
      mesh.name = 'FloorExitArrowDecal';
      mesh.position.y = 0.025;
      mesh.renderOrder = 25;
      return mesh;
    }

    if (typeof document === 'undefined') {
      const dummy = new THREE.Mesh(geo, new THREE.MeshBasicMaterial());
      dummy.position.y = 0.025;
      return dummy;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, 256, 256);

    // Stencil grunge backdrop
    const halo = ctx.createRadialGradient(128, 128, 10, 128, 128, 120);
    halo.addColorStop(0, 'rgba(5, 40, 20, 0.90)');
    halo.addColorStop(0.7, 'rgba(5, 30, 15, 0.45)');
    halo.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, 256, 256);

    // Vivid emerald phosphor arrow pointing UP (towards forward direction)
    const arrowColor = '#4ade80';
    ctx.fillStyle = arrowColor;
    ctx.strokeStyle = arrowColor;
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Arrow stem
    ctx.beginPath();
    ctx.moveTo(128, 185);
    ctx.lineTo(128, 65);
    ctx.stroke();

    // Arrow head
    ctx.beginPath();
    ctx.moveTo(65, 120);
    ctx.lineTo(128, 50);
    ctx.lineTo(191, 120);
    ctx.stroke();

    // Neon text label below arrow
    ctx.font = 'bold 26px "Share Tech Mono", monospace, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#86efac';
    ctx.fillText(label, 128, 218);

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;

    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -3.0,
      polygonOffsetUnits: -3.0,
    });
    this._floorExitArrowMatMap.set(label, mat);

    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = 'FloorExitArrowDecal';
    mesh.position.y = 0.025;
    mesh.renderOrder = 25;
    return mesh;
  }

  // =========================================================================
  // LEVEL 6 — HIGH-RISE CONSTRUCTION SITE PROPS (Tower Crane, Skybridge, Rebar, Scaffolding)
  // =========================================================================

  /**
   * Heavy Industrial Tower Crane (Derek Menara Konstruksi Bergerak)
   * Returns root group along with rotating jib and gently swinging hook group!
   */
  public static createTowerCrane(
    mastHeight: number = 22.0,
    jibLength: number = 24.0
  ): { root: THREE.Group; jib: THREE.Group; hook: THREE.Group } {
    const root = new THREE.Group();
    root.name = 'TowerCraneRoot';

    const yellowMat = new THREE.MeshLambertMaterial({ color: 0xf59e0b, roughness: 0.5 });
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x1f2421, roughness: 0.7 });
    const concreteMat = new THREE.MeshLambertMaterial({ color: 0x64748b, roughness: 0.8 });
    const cableMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
    const redLightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    // 1. Concrete Base Footing Foundation
    const footing = new THREE.Mesh(new THREE.BoxGeometry(3.6, 1.2, 3.6), concreteMat);
    footing.position.y = 0.6;
    root.add(footing);

    // 2. Vertical Lattice Mast Tower (4 Corner Steel Chords + Horizontal Ties)
    const mastGroup = new THREE.Group();
    const chordGeo = new THREE.BoxGeometry(0.18, mastHeight, 0.18);
    const hw = 1.1;
    const chords = [
      [-hw, -hw],
      [hw, -hw],
      [-hw, hw],
      [hw, hw],
    ];
    for (const [cx, cz] of chords) {
      const col = new THREE.Mesh(chordGeo, yellowMat);
      col.position.set(cx, mastHeight / 2 + 1.2, cz);
      mastGroup.add(col);
    }

    // Horizontal Lattice Braces every 2.4 meters
    for (let y = 2.4; y < mastHeight + 1.2; y += 2.4) {
      const tieGeo = new THREE.BoxGeometry(2.3, 0.12, 0.12);
      const tie1 = new THREE.Mesh(tieGeo, darkMat);
      tie1.position.set(0, y, hw);
      const tie2 = new THREE.Mesh(tieGeo, darkMat);
      tie2.position.set(0, y, -hw);
      const tie3Geo = new THREE.BoxGeometry(0.12, 0.12, 2.3);
      const tie3 = new THREE.Mesh(tie3Geo, darkMat);
      tie3.position.set(hw, y, 0);
      const tie4 = new THREE.Mesh(tie3Geo, darkMat);
      tie4.position.set(-hw, y, 0);
      mastGroup.add(tie1, tie2, tie3, tie4);
    }
    root.add(mastGroup);

    // 3. Rotating Slew Ring & Jib Arm Unit (At mastHeight + 1.2m)
    const jib = new THREE.Group();
    jib.name = 'CraneJib';
    jib.position.set(0, mastHeight + 1.2, 0);

    // Operator Cab
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.2, 1.8), yellowMat);
    cab.position.set(1.4, 1.2, 0);
    jib.add(cab);

    // Crane Tower Apex Peak (Cathead A-frame)
    const apexHeight = 5.5;
    const apex = new THREE.Mesh(new THREE.ConeGeometry(1.4, apexHeight, 4), darkMat);
    apex.position.set(0, apexHeight / 2, 0);
    apex.rotation.y = Math.PI / 4;
    jib.add(apex);

    // Blinking Red Aviation Beacon at Crane Peak
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), redLightMat);
    beacon.position.set(0, apexHeight + 0.15, 0);
    const beaconLight = new THREE.PointLight(0xef4444, 2.5, 25.0, 1.2);
    beaconLight.position.set(0, apexHeight + 0.3, 0);
    jib.add(beacon);
    jib.add(beaconLight);

    // Horizontal Forward Jib (Triangular steel truss)
    const forwardJibGeo = new THREE.BoxGeometry(0.8, 0.8, jibLength);
    forwardJibGeo.translate(0, 0.5, jibLength / 2);
    const forwardJib = new THREE.Mesh(forwardJibGeo, yellowMat);
    jib.add(forwardJib);

    // Rear Counter-Jib (With concrete counterweights)
    const counterLen = 9.0;
    const counterJibGeo = new THREE.BoxGeometry(0.8, 0.8, counterLen);
    counterJibGeo.translate(0, 0.5, -counterLen / 2);
    const counterJib = new THREE.Mesh(counterJibGeo, yellowMat);
    jib.add(counterJib);

    const counterWeight = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.8, 3.2), concreteMat);
    counterWeight.position.set(0, 0.9, -counterLen + 1.8);
    jib.add(counterWeight);

    // 4. Trolley & Swinging Hook Unit (Positioned out along forward jib at z = 14m)
    const hook = new THREE.Group();
    hook.name = 'CraneHook';
    hook.position.set(0, 0.5, 14.0);

    // Hoist Cable dropping down ~8 meters
    const cableLen = 8.5;
    const cableGeo = new THREE.CylinderGeometry(0.02, 0.02, cableLen, 6);
    cableGeo.translate(0, -cableLen / 2, 0);
    const cable = new THREE.Mesh(cableGeo, cableMat);
    hook.add(cable);

    // Cargo Hook Block & Heavy Steel I-Beam suspended at bottom
    const block = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.4), yellowMat);
    block.position.set(0, -cableLen, 0);
    hook.add(block);

    // Heavy Suspended Structural Steel Girder (Swinging Cargo)
    const girder = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 4.8), darkMat);
    girder.position.set(0, -cableLen - 0.5, 0);
    hook.add(girder);

    jib.add(hook);
    root.add(jib);

    return { root, jib, hook };
  }

  /**
   * Skybridge Truss Catwalk (Jembatan Rangka Baja Penghubung Antar Gedung)
   */
  public static createSkybridgeTruss(width: number, length: number): THREE.Group {
    const bridge = new THREE.Group();
    bridge.name = 'SkybridgeTruss';

    const steelMat = new THREE.MeshLambertMaterial({ color: 0x334155, roughness: 0.6 });
    const deckMat = new THREE.MeshLambertMaterial({ color: 0x475569, roughness: 0.7 });
    const railMat = new THREE.MeshLambertMaterial({ color: 0xf59e0b, roughness: 0.4 });

    // Corrugated heavy steel deck floor
    const deck = new THREE.Mesh(new THREE.BoxGeometry(width, 0.22, length), deckMat);
    deck.position.y = 0.11;
    bridge.add(deck);

    // Bottom structural support I-beams
    const beamL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.45, length), steelMat);
    beamL.position.set(-width / 2 + 0.12, -0.22, 0);
    const beamR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.45, length), steelMat);
    beamR.position.set(width / 2 - 0.12, -0.22, 0);
    bridge.add(beamL, beamR);

    // Safety Railings (Yellow caution handrails at y = 1.1m)
    const postCount = Math.max(3, Math.floor(length / 2.2));
    for (let i = 0; i <= postCount; i++) {
      const zPos = -length / 2 + (i / postCount) * length;
      const postGeo = new THREE.BoxGeometry(0.08, 1.15, 0.08);
      const postL = new THREE.Mesh(postGeo, railMat);
      postL.position.set(-width / 2 + 0.08, 0.68, zPos);
      const postR = new THREE.Mesh(postGeo, railMat);
      postR.position.set(width / 2 - 0.08, 0.68, zPos);
      bridge.add(postL, postR);
    }

    // Top horizontal handrails
    const railGeo = new THREE.CylinderGeometry(0.035, 0.035, length, 8);
    railGeo.rotateX(Math.PI / 2);
    const topRailL = new THREE.Mesh(railGeo, railMat);
    topRailL.position.set(-width / 2 + 0.08, 1.25, 0);
    const topRailR = new THREE.Mesh(railGeo, railMat);
    topRailR.position.set(width / 2 - 0.08, 1.25, 0);
    bridge.add(topRailL, topRailR);

    // Mid safety bar
    const midRailL = new THREE.Mesh(railGeo, railMat);
    midRailL.position.set(-width / 2 + 0.08, 0.65, 0);
    const midRailR = new THREE.Mesh(railGeo, railMat);
    midRailR.position.set(width / 2 - 0.08, 0.65, 0);
    bridge.add(midRailL, midRailR);

    return bridge;
  }

  /**
   * Construction Rebar Bundle Stack (Tumpukan Besi Beton Proyek)
   */
  public static createRebarStack(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'RebarStack';

    const rebarMat = new THREE.MeshLambertMaterial({ color: 0x4a3b32, roughness: 0.8 }); // Rusted steel
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x85542b, roughness: 0.7 });

    // Wooden Dunnage Blocks
    const dunnage1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.16, 0.22), woodMat);
    dunnage1.position.set(0, 0.08, -1.2);
    const dunnage2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.16, 0.22), woodMat);
    dunnage2.position.set(0, 0.08, 1.2);
    group.add(dunnage1, dunnage2);

    // 24 Corrugated Steel Rebar Bars
    const barGeo = new THREE.CylinderGeometry(0.035, 0.035, 3.6, 6);
    barGeo.rotateX(Math.PI / 2);

    for (let row = 0; row < 3; row++) {
      for (let col = -3; col <= 3; col++) {
        const bar = new THREE.Mesh(barGeo, rebarMat);
        bar.position.set(col * 0.14, 0.22 + row * 0.14, (Math.random() - 0.5) * 0.2);
        group.add(bar);
      }
    }
    return group;
  }

  /**
   * Cement Bags on Pallet (Tumpukan Sak Semen Proyek)
   */
  public static createCementBagsPallet(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'CementBagsPallet';

    const palletMat = new THREE.MeshLambertMaterial({ color: 0x92613b, roughness: 0.7 });
    const bagMat = new THREE.MeshLambertMaterial({ color: 0x94a3b8, roughness: 0.9 }); // Gray paper bag

    // Wooden Pallet Base
    const pallet = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.14, 1.4), palletMat);
    pallet.position.y = 0.07;
    group.add(pallet);

    // Stacked Bags of Cement
    for (let layer = 0; layer < 3; layer++) {
      for (let bx = -0.32; bx <= 0.32; bx += 0.64) {
        for (let bz = -0.32; bz <= 0.32; bz += 0.64) {
          const bag = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.22, 0.55), bagMat);
          bag.position.set(bx, 0.25 + layer * 0.22, bz);
          bag.rotation.y = (Math.random() - 0.5) * 0.1;
          group.add(bag);
        }
      }
    }
    return group;
  }

  /**
   * Dual Halogen Construction Floodlight Tripod (Lampu Sorot Proyek)
   */
  public static createConstructionFloodlight(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'ConstructionFloodlight';

    const yellowMat = new THREE.MeshLambertMaterial({ color: 0xf59e0b, roughness: 0.4 });
    const metalMat = new THREE.MeshLambertMaterial({ color: 0x1e2421, roughness: 0.7 });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xfffae0 });

    // Tripod Legs
    for (let i = 0; i < 3; i++) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4, 6), metalMat);
      leg.position.set(Math.cos((i * Math.PI * 2) / 3) * 0.4, 0.6, Math.sin((i * Math.PI * 2) / 3) * 0.4);
      leg.rotation.x = Math.cos((i * Math.PI * 2) / 3) * 0.35;
      leg.rotation.z = Math.sin((i * Math.PI * 2) / 3) * 0.35;
      group.add(leg);
    }

    // Mast Pole
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 8), metalMat);
    mast.position.y = 1.4;
    group.add(mast);

    // Crossbar
    const crossbar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.06), yellowMat);
    crossbar.position.y = 2.4;
    group.add(crossbar);

    // Dual Halogen Floodlamp Fixtures
    for (const side of [-0.32, 0.32]) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 0.22), yellowMat);
      box.position.set(side, 2.45, 0.08);
      box.rotation.x = -0.3; // Angled down towards ground
      group.add(box);

      const bulb = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.2), glowMat);
      bulb.position.set(side, 2.42, 0.2);
      bulb.rotation.x = -0.3;
      group.add(bulb);
    }

    // High-Intensity Illumination Point Light
    const light = new THREE.PointLight(0xfffae0, 2.4, 16.0, 1.3);
    light.position.set(0, 2.5, 0.4);
    group.add(light);

    return group;
  }

  /**
   * Pipe Scaffolding Frame (Perancah Pipa Konstruksi)
   */
  public static createConstructionScaffolding(width: number = 2.4, height: number = 4.8): THREE.Group {
    const group = new THREE.Group();
    group.name = 'ConstructionScaffolding';

    const pipeMat = new THREE.MeshLambertMaterial({ color: 0x475569, roughness: 0.5 });
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x92613b, roughness: 0.7 });

    // Vertical Corner Pipes
    const hw = width / 2;
    for (const [x, z] of [
      [-hw, -0.6],
      [hw, -0.6],
      [-hw, 0.6],
      [hw, 0.6],
    ]) {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, height, 8), pipeMat);
      col.position.set(x, height / 2, z);
      group.add(col);
    }

    // Wooden Walkway Planks at mid & top
    for (const y of [height * 0.5, height]) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(width, 0.08, 1.1), woodMat);
      plank.position.set(0, y, 0);
      group.add(plank);
    }

    return group;
  }
}
