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

    const woodMat = new THREE.MeshLambertMaterial({ color: 0x825a36 });
    const metalMat = new THREE.MeshLambertMaterial({ color: 0x2b3036 });

    // Tabletop
    const topGeo = new THREE.BoxGeometry(1.3, 0.08, 0.85);
    const top = new THREE.Mesh(topGeo, woodMat);
    top.position.y = 0.82;
    top.castShadow = true;
    group.add(top);

    // Metal legs
    const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.82, 6);
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
    const chairSeatGeo = new THREE.BoxGeometry(0.5, 0.05, 0.5);
    const seat = new THREE.Mesh(chairSeatGeo, woodMat);
    seat.position.set(0, 0.45, 0.65);
    group.add(seat);

    const chairBackGeo = new THREE.BoxGeometry(0.48, 0.35, 0.04);
    const back = new THREE.Mesh(chairBackGeo, woodMat);
    back.position.set(0, 0.72, 0.88);
    group.add(back);

    return group;
  }

  public static createBlackboard(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'Blackboard';

    const frameMat = new THREE.MeshLambertMaterial({ color: 0x4a3420 });
    const boardMat = new THREE.MeshLambertMaterial({ color: 0x1a2e22 });

    const frameGeo = new THREE.BoxGeometry(3.2, 1.6, 0.1);
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.y = 2.0;
    group.add(frame);

    const boardGeo = new THREE.BoxGeometry(3.0, 1.4, 0.12);
    const board = new THREE.Mesh(boardGeo, boardMat);
    board.position.y = 2.0;
    group.add(board);

    // Chalk tray
    const trayGeo = new THREE.BoxGeometry(3.0, 0.06, 0.18);
    const tray = new THREE.Mesh(trayGeo, frameMat);
    tray.position.set(0, 1.18, 0.06);
    group.add(tray);

    return group;
  }

  public static createSchoolLocker(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'SchoolLocker';

    const lockerMat = new THREE.MeshLambertMaterial({ color: 0x3d4a46 });
    const ventMat = new THREE.MeshBasicMaterial({ color: 0x1d2422 });

    // 3 joined lockers
    const bodyGeo = new THREE.BoxGeometry(1.6, 2.4, 0.7);
    const body = new THREE.Mesh(bodyGeo, lockerMat);
    body.position.y = 1.2;
    group.add(body);

    for (let i = -0.5; i <= 0.5; i += 0.5) {
      const ventGeo = new THREE.PlaneGeometry(0.35, 0.25);
      const vent = new THREE.Mesh(ventGeo, ventMat);
      vent.position.set(i, 2.1, 0.36);
      group.add(vent);
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
