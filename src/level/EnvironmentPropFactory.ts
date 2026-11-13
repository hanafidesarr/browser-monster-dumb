import * as THREE from 'three';

export interface PropCollider {
  x: number;
  z: number;
  radius: number;
}

export class EnvironmentPropFactory {
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
    const stair = new THREE.Group();
    stair.name = 'SchoolStaircase';

    const numSteps = 19;
    const stepHeight = height / numSteps;
    const stepDepth = length / numSteps;

    const concreteMat = new THREE.MeshLambertMaterial({ color: 0x3d4741 });
    const nosingMat = new THREE.MeshLambertMaterial({ color: 0x1f2622 });
    const carriageMat = new THREE.MeshLambertMaterial({ color: 0x2c342f });

    // Individual solid steps
    for (let i = 0; i < numSteps; i++) {
      const stepY = stepHeight * (i + 1);
      const stepZ = -length / 2 + (i + 0.5) * stepDepth;

      const stepMesh = new THREE.Mesh(
        new THREE.BoxGeometry(width, stepY, stepDepth),
        concreteMat
      );
      stepMesh.position.set(0, stepY / 2, stepZ);
      stepMesh.receiveShadow = true;
      stair.add(stepMesh);

      // Dark nosing trim along front tread edge
      const nosing = new THREE.Mesh(
        new THREE.BoxGeometry(width + 0.04, 0.03, 0.06),
        nosingMat
      );
      nosing.position.set(0, stepY, stepZ + stepDepth / 2 - 0.03);
      stair.add(nosing);
    }

    // Solid angled carriage beams underneath on both flanks (closes off sides and underside)
    const slopeAngle = Math.atan2(height, length);
    const carriageLength = Math.hypot(height, length);
    const carriageGeo = new THREE.BoxGeometry(0.12, 0.45, carriageLength);

    const leftCarriage = new THREE.Mesh(carriageGeo, carriageMat);
    leftCarriage.rotation.x = -slopeAngle + Math.PI / 2;
    leftCarriage.position.set(-width / 2 - 0.06, height / 2 - 0.08, 0);
    stair.add(leftCarriage);

    const rightCarriage = new THREE.Mesh(carriageGeo, carriageMat);
    rightCarriage.rotation.x = -slopeAngle + Math.PI / 2;
    rightCarriage.position.set(width / 2 + 0.06, height / 2 - 0.08, 0);
    stair.add(rightCarriage);

    // Painted school iron handrails with vertical pickets along stair slope
    const railMat = new THREE.MeshLambertMaterial({ color: 0x202723 });
    const handrailGeo = new THREE.CylinderGeometry(0.04, 0.04, carriageLength + 0.3, 6);

    const leftHandrail = new THREE.Mesh(handrailGeo, railMat);
    leftHandrail.rotation.x = -slopeAngle + Math.PI / 2;
    leftHandrail.position.set(-width / 2 - 0.06, height / 2 + 0.95, 0);
    stair.add(leftHandrail);

    const rightHandrail = new THREE.Mesh(handrailGeo, railMat);
    rightHandrail.rotation.x = -slopeAngle + Math.PI / 2;
    rightHandrail.position.set(width / 2 + 0.06, height / 2 + 0.95, 0);
    stair.add(rightHandrail);

    // Vertical stair posts (newels) every ~1.5m
    const numStairPosts = 5;
    for (let p = 0; p <= numStairPosts; p++) {
      const frac = p / numStairPosts;
      const pY = frac * height + 0.5;
      const pZ = -length / 2 + frac * length;

      const pLeft = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.0, 0.08), railMat);
      pLeft.position.set(-width / 2 - 0.06, pY, pZ);
      stair.add(pLeft);

      const pRight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.0, 0.08), railMat);
      pRight.position.set(width / 2 + 0.06, pY, pZ);
      stair.add(pRight);
    }

    return stair;
  }

  public static createSchoolStairwellRailing(length: number, height: number = 1.0): THREE.Group {
    const group = new THREE.Group();
    group.name = 'SchoolStairwellRailing';

    const railMat = new THREE.MeshLambertMaterial({ color: 0x222a25 });

    // Top rail
    const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, length), railMat);
    topRail.position.y = height;
    group.add(topRail);

    // Mid safety rail
    const midRail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, length), railMat);
    midRail.position.y = height * 0.52;
    group.add(midRail);

    // Sturdy square posts
    const postCount = Math.max(2, Math.floor(length / 1.2));
    const startZ = -length / 2;
    for (let i = 0; i <= postCount; i++) {
      const z = startZ + (i * length) / postCount;
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, height, 0.09), railMat);
      post.position.set(0, height / 2, z);
      group.add(post);
    }

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

    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x140a10, roughness: 0.95 });
    const redVeinMat = new THREE.MeshBasicMaterial({ color: 0xb91c1c });

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
    const stair = new THREE.Group();
    stair.name = 'Staircase';

    const numSteps = Math.max(4, Math.round(height / 0.26));
    const stepHeight = height / numSteps;
    const stepDepth = length / numSteps;

    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x4a4f56 });
    const woodMat = new THREE.MeshLambertMaterial({ color: 0x6e5238 });
    const stringerMat = new THREE.MeshLambertMaterial({ color: 0x363a40 });

    for (let i = 0; i < numSteps; i++) {
      const stepGeo = new THREE.BoxGeometry(width, stepHeight * (i + 1), stepDepth);
      const stepMesh = new THREE.Mesh(stepGeo, stoneMat);
      const y = (stepHeight * (i + 1)) / 2;
      const z = -length / 2 + (i + 0.5) * stepDepth;
      stepMesh.position.set(0, y, z);
      stepMesh.receiveShadow = true;
      stair.add(stepMesh);

      // Wooden tread nosing
      const noseGeo = new THREE.BoxGeometry(width + 0.06, 0.04, 0.08);
      const noseMesh = new THREE.Mesh(noseGeo, woodMat);
      noseMesh.position.set(0, stepHeight * (i + 1), z + stepDepth / 2 - 0.04);
      stair.add(noseMesh);
    }

    // Integrated Upper Landing Platform (Connects seamlessly to upper floor slab)
    const landingDepth = 0.75;
    const landingGeo = new THREE.BoxGeometry(width, 0.12, landingDepth);
    const landingMesh = new THREE.Mesh(landingGeo, stoneMat);
    landingMesh.position.set(0, height - 0.06, length / 2 + landingDepth / 2);
    landingMesh.receiveShadow = true;
    stair.add(landingMesh);

    const landingNoseGeo = new THREE.BoxGeometry(width + 0.06, 0.04, 0.08);
    const landingNose = new THREE.Mesh(landingNoseGeo, woodMat);
    landingNose.position.set(0, height, length / 2 + landingDepth - 0.04);
    stair.add(landingNose);

    // Solid closed side stringers along the stair slope
    const stringerLength = Math.hypot(height, length + landingDepth * 0.5);
    const stringerAngle = Math.atan2(height, length);
    const stringerGeo = new THREE.BoxGeometry(0.06, 0.38, stringerLength);

    const leftStringer = new THREE.Mesh(stringerGeo, stringerMat);
    leftStringer.rotation.x = -stringerAngle + Math.PI / 2;
    leftStringer.position.set(-width / 2 - 0.03, height / 2, 0);
    stair.add(leftStringer);

    const rightStringer = new THREE.Mesh(stringerGeo, stringerMat);
    rightStringer.rotation.x = -stringerAngle + Math.PI / 2;
    rightStringer.position.set(width / 2 + 0.03, height / 2, 0);
    stair.add(rightStringer);

    // Side handrails and vertical newel posts
    const railMat = new THREE.MeshLambertMaterial({ color: 0x22262b });
    const postMat = new THREE.MeshLambertMaterial({ color: 0x2d3238 });
    const railLength = Math.hypot(height, length);
    const railGeo = new THREE.CylinderGeometry(0.04, 0.04, railLength + landingDepth * 0.8, 6);
    const railAngle = Math.atan2(height, length);

    const leftRail = new THREE.Mesh(railGeo, railMat);
    leftRail.rotation.x = -railAngle + Math.PI / 2;
    leftRail.position.set(-width / 2 - 0.05, height / 2 + 0.85, landingDepth * 0.2);
    stair.add(leftRail);

    const rightRail = new THREE.Mesh(railGeo, railMat);
    rightRail.rotation.x = -railAngle + Math.PI / 2;
    rightRail.position.set(width / 2 + 0.05, height / 2 + 0.85, landingDepth * 0.2);
    stair.add(rightRail);

    // Vertical Newel Posts (Bottom, Middle, and Top Landing)
    const postGeo = new THREE.BoxGeometry(0.08, 0.95, 0.08);
    const postZPositions = [-length / 2 + 0.2, 0, length / 2];
    for (let pz of postZPositions) {
      const frac = (pz + length / 2) / length;
      const py = frac * height + 0.45;

      const pLeft = new THREE.Mesh(postGeo, postMat);
      pLeft.position.set(-width / 2 - 0.05, py, pz);
      stair.add(pLeft);

      const pRight = new THREE.Mesh(postGeo, postMat);
      pRight.position.set(width / 2 + 0.05, py, pz);
      stair.add(pRight);
    }

    return stair;
  }

  public static createStairwellBalustrade(length: number, height: number = 0.95): THREE.Group {
    const group = new THREE.Group();
    group.name = 'StairwellBalustrade';

    const postMat = new THREE.MeshLambertMaterial({ color: 0x3d3024 });
    const railMat = new THREE.MeshLambertMaterial({ color: 0x5c4228 });

    // Top rail
    const topRailGeo = new THREE.BoxGeometry(0.12, 0.08, length);
    const topRail = new THREE.Mesh(topRailGeo, railMat);
    topRail.position.y = height;
    group.add(topRail);

    // Mid rail
    const midRailGeo = new THREE.BoxGeometry(0.08, 0.05, length);
    const midRail = new THREE.Mesh(midRailGeo, railMat);
    midRail.position.y = height * 0.52;
    group.add(midRail);

    // Vertical posts
    const postCount = Math.max(2, Math.floor(length / 1.4));
    const postGeo = new THREE.BoxGeometry(0.1, height, 0.1);
    const startZ = -length / 2;
    for (let i = 0; i <= postCount; i++) {
      const z = startZ + (i * length) / postCount;
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(0, height / 2, z);
      group.add(post);
    }

    return group;
  }
}
