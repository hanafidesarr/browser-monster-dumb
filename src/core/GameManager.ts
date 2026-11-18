import * as THREE from 'three';
import { ALL_LEVELS, LevelDefinition } from '../level/LevelData.ts';
import { LabyrinthBuilder, LevelBuildResult, WorldWeaponPickup, WorldInteractiveSwitch } from '../level/LabyrinthBuilder.ts';
import { GridPathfinding } from '../pathfinding/GridPathfinding.ts';
import { LevelOverviewCamera } from '../camera/LevelOverviewCamera.ts';
import { FirstPersonController } from '../player/FirstPersonController.ts';
import { MonsterController } from '../monster/MonsterController.ts';
import { AudioManager } from './AudioManager.ts';
import { InputManager } from './InputManager.ts';
import { SaveManager } from './SaveManager.ts';
import { SettingsManager } from './SettingsManager.ts';
import { UIManager } from '../ui/UIManager.ts';
import { WeaponId, WeaponDefinition, WEAPON_MAP } from '../weapon/WeaponData.ts';
import { GrenadeSystem } from '../weapon/GrenadeSystem.ts';

export type GameState =
  | 'MAIN_MENU'
  | 'LEVEL_SELECT'
  | 'LEVEL_OVERVIEW'
  | 'STEALTH'
  | 'ATTACK'
  | 'CHASE'
  | 'JUMPSCARE'
  | 'GAME_OVER'
  | 'LEVEL_COMPLETE'
  | 'PAUSED';

export class GameManager {
  private static instance: GameManager;

  // Three.js Core
  private canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;

  // Cameras
  private overviewCam: LevelOverviewCamera;
  private fpController: FirstPersonController;
  private activeCamera: THREE.Camera;

  // Level & Actors
  private currentLevelIndex: number = 0;
  private currentLevelDef: LevelDefinition;
  private levelBuild: LevelBuildResult | null = null;
  private pathfinding: GridPathfinding | null = null;
  private monsters: MonsterController[] = [];
  public get monster(): MonsterController {
    return this.monsters[0];
  }

  // Game State
  public state: GameState = 'MAIN_MENU';
  private previousState: GameState = 'MAIN_MENU';
  private gameplayTimer: number = 0;
  private isTimerRunning: boolean = false;
  private isAttackSuccessful: boolean = false;
  private isExitUnlocked: boolean = true; // Special objective flag (Level 9)

  // Level 1 Capture Jumpscare Presentation
  private isJumpscareActive: boolean = false;
  private jumpscareTimer: number = 0;
  private jumpscareDuration: number = 1.25;
  private jumpscareReason: string = 'Pocong berhasil menangkapmu!';
  private jumpscareReasonEn: string = 'The Pocong caught you!';
  private activeCatchingMonster: MonsterController | null = null;
  private jumpscareInitialCamPos: THREE.Vector3 = new THREE.Vector3();

  // Screen Shake
  private shakeIntensity: number = 0;
  private shakeDecay: number = 5.0;

  // Clock
  private clock = new THREE.Clock();
  private totalTime: number = 0;

  private constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: false, // PS1 style: sharp pixels!
      powerPreference: 'high-performance',
    });

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x101416);
    // Night atmosphere without moon
    this.scene.fog = new THREE.Fog(0x101416, 50, 140);

    this.currentLevelDef = ALL_LEVELS[0];

    // Initialize Cameras & Controllers
    this.overviewCam = new LevelOverviewCamera(this.canvas);
    this.fpController = new FirstPersonController();
    this.scene.add(this.fpController.camera);

    this.activeCamera = this.overviewCam.camera;

    // Apply Graphics Resolution
    this.applyGraphicsQuality(SettingsManager.getInstance().settings.graphicsQuality);

    // Setup Window Resize, Fullscreen, & Mobile Orientation Changes
    const triggerResize = () => {
      this.onWindowResize();
      setTimeout(() => this.onWindowResize(), 150);
      setTimeout(() => this.onWindowResize(), 350);
    };

    window.addEventListener('resize', () => this.onWindowResize());
    window.addEventListener('orientationchange', triggerResize);
    document.addEventListener('fullscreenchange', triggerResize);
    document.addEventListener('webkitfullscreenchange', triggerResize);

    // Setup UI Callbacks
    this.setupUICallbacks();

    // Start Rendering Loop
    this.animate();
  }

  public static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }

  public init(): void {
    const rawUrl = typeof window !== 'undefined' ? window.location.href : '';
    const hash = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : '';
    const searchPart = typeof window !== 'undefined'
      ? (window.location.search || (rawUrl.includes('?') ? '?' + rawUrl.split('?')[1].split('#')[0] : ''))
      : '';
    const queryStr = searchPart ? searchPart.replace(/^\?/, '') : hash;
    const params = queryStr ? new URLSearchParams(queryStr) : null;
    const hasExplicitLevel = params && params.has('level');
    const qLevel = hasExplicitLevel ? parseInt(params.get('level') || '1', 10) : null;
    const qView = params ? params.get('view') : null;
    const hideUi = params ? params.get('hide_ui') === 'true' : false;

    // Start in level preview in background
    const targetLevel = (qLevel !== null && qLevel >= 1 && qLevel <= ALL_LEVELS.length)
      ? qLevel
      : SaveManager.getInstance().getCurrentLevel();
    this.loadLevel(targetLevel, false);

    // Show Main Menu by default unless audit hideUi or direct phase requested
    const qPhase = params ? params.get('phase') : null;
    if (qPhase === 'gameplay' || qPhase === 'attack_alert') {
      this.state = 'STEALTH';
      this.activeCamera = this.fpController.camera;
      this.fpController.setEnabled(true);
      this.overviewCam.setEnabled(false);
      UIManager.getInstance().showGameplayHUD();
      if (qPhase === 'attack_alert') {
        UIManager.getInstance().setAttackPromptVisible(true);
      }
    } else if (!hideUi) {
      this.state = 'MAIN_MENU';
      UIManager.getInstance().showMainMenu();
    } else {
      this.state = 'MAIN_MENU';
      const uiRoot = document.getElementById('ui-root');
      if (uiRoot) uiRoot.style.display = 'none';
    }

    if (qView) {
      this.applyAuditView(qView);
    }

    // User click or mousedown requests pointer lock when playing (desktop mouse look)
    const requestGamePointerLock = (e?: Event) => {
      if (this.state === 'STEALTH' || this.state === 'CHASE') {
        if (e && e.target) {
          const target = e.target as HTMLElement;
          if (
            target &&
            target.closest(
              '#btn-hud-pause, #btn-toggle-fullscreen, .retro-btn, button, input, select, textarea'
            )
          ) {
            return;
          }
        }
        AudioManager.getInstance().resume();
        InputManager.getInstance().requestPointerLock(this.canvas);
      }
    };

    this.canvas.addEventListener('click', requestGamePointerLock);
    window.addEventListener('click', requestGamePointerLock);
    window.addEventListener('mousedown', (e: MouseEvent) => {
      if (e.button === 0) requestGamePointerLock(e);
    });
  }

  private applyAuditView(view: string): void {
    if (!this.levelBuild) return;
    const level = this.currentLevelDef;
    const { cellSize, gridWidth, gridHeight } = level;
    const halfW = (gridWidth * cellSize) / 2;
    const halfH = (gridHeight * cellSize) / 2;
    const totalHeight = (level.floorCount || 1) * (level.floorHeight || 3.8);

    this.activeCamera = this.overviewCam.camera;
    this.overviewCam.setEnabled(false);

    if (view === 'stairs' && this.levelBuild.collisionConfig.ramps.length > 0) {
      const ramp = this.levelBuild.collisionConfig.ramps[0];
      const rx = (ramp.startWorld.x + ramp.endWorld.x) / 2;
      const ry = (ramp.startWorld.y + ramp.endWorld.y) / 2;
      const rz = (ramp.startWorld.z + ramp.endWorld.z) / 2;
      this.overviewCam.camera.position.set(rx + 8, ry + 5, rz + 8);
      this.overviewCam.camera.lookAt(rx, ry + 1.2, rz);
    } else if (view === 'bridge' && this.levelBuild.collisionConfig.bridges.length > 0) {
      const b = this.levelBuild.collisionConfig.bridges[0];
      const bx = (b.box.min.x + b.box.max.x) / 2;
      const by = b.height;
      const bz = (b.box.min.z + b.box.max.z) / 2;
      this.overviewCam.camera.position.set(bx + 7, by + 4, bz + 7);
      this.overviewCam.camera.lookAt(bx, by - 0.5, bz);
    } else if (view === 'multifloor') {
      this.overviewCam.camera.position.set(-halfW * 0.75, totalHeight + 12, halfH * 0.85);
      this.overviewCam.camera.lookAt(0, totalHeight * 0.4, 0);
    } else {
      this.overviewCam.camera.position.set(-halfW * 0.85, totalHeight + 22, halfH * 1.05);
      this.overviewCam.camera.lookAt(0, totalHeight * 0.35, 0);
    }
    this.overviewCam.camera.updateProjectionMatrix();
  }

  private applyGraphicsQuality(quality: 'low' | 'med' | 'high'): void {
    const dpr = window.devicePixelRatio || 1;
    let pixelScale = 1.0;

    if (quality === 'low') {
      pixelScale = 0.45; // Authentic PS1 240p downsample (super light)
    } else if (quality === 'med') {
      pixelScale = 0.75; // PS1 480p
    } else {
      pixelScale = Math.min(dpr, 1.25); // High (lightweight and sharp)
    }

    this.renderer.setPixelRatio(pixelScale);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private onWindowResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.overviewCam.camera.aspect = width / height;
    this.overviewCam.camera.updateProjectionMatrix();

    this.fpController.camera.aspect = width / height;
    this.fpController.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.applyGraphicsQuality(SettingsManager.getInstance().settings.graphicsQuality);
  }

  private setupUICallbacks(): void {
    const ui = UIManager.getInstance();
    const audio = AudioManager.getInstance();

    ui.onPlayRequested = (levelId: number) => {
      this.loadLevel(levelId, true);
    };

    ui.onStartLevelRequested = () => {
      this.startLevelTransition();
    };

    ui.onResumeRequested = () => {
      this.resumeGame();
    };

    ui.onRestartRequested = () => {
      this.restartLevel();
    };

    ui.onExitToMenuRequested = () => {
      this.exitToMainMenu();
    };

    ui.onNextLevelRequested = () => {
      const nextId = this.currentLevelDef.id + 1;
      if (nextId <= ALL_LEVELS.length) {
        this.loadLevel(nextId, true);
      } else {
        this.exitToMainMenu();
      }
    };

    ui.onGraphicsChanged = (q) => {
      this.applyGraphicsQuality(q);
    };

    ui.onWeaponSelected = (weaponId) => {
      this.fpController.weapon.setWeapon(weaponId);
    };
  }

  private setupMonsterCallbacks(m: MonsterController): void {
    const ui = UIManager.getInstance();
    const monsterName = m.monsterType === 'kunti' ? 'Kuntilanak' : (m.monsterType === 'yeti' ? 'Genderwo' : 'Pocong');

    m.onPlayerDetected = () => {
      if (this.state === 'STEALTH') {
        this.triggerGameOver(
          `${monsterName} mendeteksi keberadaanmu!`,
          `The ${monsterName} detected your presence!`
        );
      }
    };

    m.onPlayerCaught = () => {
      this.handlePlayerCaught(
        m,
        `${monsterName} berhasil menangkapmu!`,
        `The ${monsterName} caught you!`
      );
    };

    m.onChaseStarted = () => {
      if (this.state !== 'CHASE') {
        this.state = 'CHASE';
        ui.switchToChaseControls();
        const actionVerb = m.monsterType === 'kunti' ? 'MERANGKAK' : (m.monsterType === 'yeti' ? 'BERLARI' : 'MELONCAT');
        ui.setStatusText(
          `${monsterName.toUpperCase()} ${actionVerb} MENGEJAR! CEPAT LARI KE PINTU KELUAR!`,
          `${monsterName.toUpperCase()} IS CHASING YOU! SPRINT TO THE EXIT DOOR!`
        );
      }
    };
  }

  // Load a Level Definition and construct 3D Environment
  public loadLevel(levelId: number, enterOverview: boolean = true): void {
    const levelIndex = ALL_LEVELS.findIndex((l) => l.id === levelId);
    this.currentLevelIndex = levelIndex >= 0 ? levelIndex : 0;
    this.currentLevelDef = ALL_LEVELS[this.currentLevelIndex];
    SaveManager.getInstance().setCurrentLevel(this.currentLevelDef.id);

    // Remove existing level meshes and dispose hierarchy completely to prevent any collider or memory leaks
    if (this.levelBuild) {
      if (this.levelBuild.overviewMapGroup) {
        this.scene.remove(this.levelBuild.overviewMapGroup);
        this.disposeHierarchy(this.levelBuild.overviewMapGroup);
      }
      this.scene.remove(this.levelBuild.rootGroup);
      this.disposeHierarchy(this.levelBuild.rootGroup);
      this.levelBuild = null as any;
    }

    // Remove existing monsters and dispose hierarchy
    AudioManager.getInstance().stopKuntiChaseAudio();
    GrenadeSystem.getInstance().reset(this.scene);
    if (this.monsters.length > 0) {
      for (const m of this.monsters) {
        this.scene.remove(m.group);
        this.disposeHierarchy(m.group);
      }
      this.monsters = [];
    }

    // Build Labyrinth
    this.levelBuild = LabyrinthBuilder.buildLevel(this.currentLevelDef);
    this.scene.add(this.levelBuild.rootGroup);
    if (this.levelBuild.overviewMapGroup) {
      this.scene.add(this.levelBuild.overviewMapGroup);
      this.levelBuild.overviewMapGroup.visible = false;
    }

    // Setup Pathfinding (using isolated navigation grid per level)
    const navGrid = this.levelBuild.navigationGrid || this.levelBuild.updatedGrid || this.currentLevelDef.grid;
    this.pathfinding = new GridPathfinding(
      navGrid,
      this.currentLevelDef.cellSize
    );

    // Setup Player with isolated level-specific collision configuration
    this.fpController.setLevel(
      this.currentLevelDef,
      this.pathfinding,
      this.levelBuild.playerWorldSpawn,
      this.levelBuild.collisionConfig
    );
    this.fpController.onFatalFall = () => {
      this.triggerGameOver('Jatuh ke dalam jurang kegelapan!');
    };
    this.fpController.setEnabled(false);

    // Equip currently selected comedy weapon from persistent save
    const savedWeaponId = SaveManager.getInstance().getSelectedWeapon() as WeaponId;
    this.fpController.weapon.setWeapon(savedWeaponId);

    // Setup Monsters with isolated level-specific collision configuration
    const isLevel2 = this.currentLevelDef.id === 2;
    const defaultMonsterType = this.currentLevelDef.monsterType || (isLevel2 ? 'kunti' : 'pocong');
    const monsterSpawns = this.levelBuild.monsterWorldSpawns || [this.levelBuild.monsterWorldSpawn];
    for (let i = 0; i < monsterSpawns.length; i++) {
      const mType = (this.currentLevelDef.monsterTypes && this.currentLevelDef.monsterTypes[i])
        ? this.currentLevelDef.monsterTypes[i]
        : defaultMonsterType;
      if (mType === 'kunti') {
        AudioManager.getInstance().loadKuntiAudio();
      }
      const m = new MonsterController(mType);
      m.id = `${mType}_${i + 1}`;
      this.scene.add(m.group);
      m.setLevel(
        this.currentLevelDef,
        this.pathfinding,
        monsterSpawns[i],
        this.levelBuild.collisionConfig,
        undefined,
        undefined,
        undefined,
        mType
      );
      this.setupMonsterCallbacks(m);
      this.monsters.push(m);
    }
    // Link otherMonsters for mutual separation
    for (const m of this.monsters) {
      m.otherMonsters = this.monsters;
    }
    if (this.monsters.length > 0) {
      this.fpController.setMonsterObstacle(this.monsters[0].position);
    }

    // Exit door stays completely hidden until player strikes/attacks a ghost
    if (this.levelBuild?.exitDoorMesh) {
      this.levelBuild.exitDoorMesh.visible = false;
      const doorPointLight = this.levelBuild.exitDoorMesh.children.find((c) => c instanceof THREE.PointLight) as THREE.PointLight;
      if (doorPointLight) {
        doorPointLight.color.setHex(0x22c55e); // Green light ready for when it appears
        doorPointLight.intensity = 3.8;
      }
    }
    if (this.levelBuild?.exitMarker) {
      this.levelBuild.exitMarker.visible = false;
    }

    // Setup Overview Camera
    this.overviewCam.setLevel(this.currentLevelDef);
    this.activeCamera = this.overviewCam.camera;

    // Reset gameplay vars
    this.gameplayTimer = 0;
    this.isTimerRunning = false;
    this.isAttackSuccessful = false;
    this.isExitUnlocked = !this.currentLevelDef.exitLockedInitially;
    this.shakeIntensity = 0;
    this.isJumpscareActive = false;
    this.jumpscareTimer = 0;
    this.activeCatchingMonster = null;
    this.fpController.weapon.group.visible = true;
    UIManager.getInstance().hideJumpscareOverlay();
    this.state = enterOverview ? 'LEVEL_OVERVIEW' : 'STEALTH';
    InputManager.getInstance().resetInputs();

    if (enterOverview) {
      this.enterOverviewPhase();
    }
  }

  private getLevelMonsterDisplayName(): string {
    if (!this.currentLevelDef) return 'POCONG';
    if (this.currentLevelDef.monsterTypes && this.currentLevelDef.monsterTypes.length > 0) {
      return this.currentLevelDef.monsterTypes
        .map((t) => (t === 'kunti' ? 'KUNTILANAK' : t === 'yeti' ? 'GENDERWO' : 'POCONG'))
        .join(' & ');
    }
    if (this.currentLevelDef.monsterType === 'kunti' || this.currentLevelDef.id === 2) {
      return 'KUNTILANAK';
    }
    if (this.currentLevelDef.monsterType === 'yeti') {
      return 'GENDERWO';
    }
    return 'POCONG';
  }

  private getThemeFogColor(): number {
    switch (this.currentLevelDef.theme) {
      case 'banana_garden': return 0x242e29; // Matched to school (Level 2)
      case 'cemetery': return 0x242e29;      // Same bright clear tone as banana garden (Level 1)
      case 'bunker': return 0x24282c;        // Cold concrete military bunker tone
      case 'cavern': return 0x222624;        // Atmospheric ancient cave tone
      case 'school': return 0x242e29;
      case 'labyrinth': return 0x262f33; // Bright clean tone matching Level 2
      case 'hospital': return 0x252e2a;  // Bright clean tone matching Level 2
      case 'sewer': return 0x272e26;     // Bright fresh tone matching Level 2
      case 'factory': return 0x2e2924;   // Bright warm tone matching Level 2
      case 'hotel': return 0x2e2528;     // Bright warm tone matching Level 2
      case 'subway': return 0x252b30;    // Bright cool tone matching Level 2
      case 'research_facility': return 0x242c33; // Bright cool tone matching Level 2
      case 'nightmare': return 0x382c32; // Bright visible tone matching Level 2
      default: return 0x242e29;
    }
  }

  private getThemeFog(fogColor: number): THREE.Fog {
    switch (this.currentLevelDef?.theme) {
      case 'cemetery':
        return new THREE.Fog(fogColor, 20, 75); // Eerie atmospheric graveyard mist
      case 'labyrinth':
        return new THREE.Fog(fogColor, 25, 80); // Concrete underground tension
      case 'school':
        return new THREE.Fog(fogColor, 30, 95);
      case 'banana_garden':
      default:
        return new THREE.Fog(fogColor, 40, 125);
    }
  }

  // PRE-GAME LOADOUT PHASE: Weapon Selection & Mission Briefing (No Map)
  private enterOverviewPhase(): void {
    this.state = 'LEVEL_OVERVIEW';
    this.scene.background = new THREE.Color(0x0c0e12); // Clean dark horror background
    this.scene.fog = new THREE.Fog(0x0c0e12, 40, 130);
    this.overviewCam.setEnabled(false);
    InputManager.getInstance().setOverviewMode(false);
    InputManager.getInstance().exitPointerLock();

    // Hide 3D textured world meshes and monsters while on loadout screen
    if (this.levelBuild) {
      this.levelBuild.rootGroup.visible = false;
      if (this.levelBuild.overviewMapGroup) {
        this.levelBuild.overviewMapGroup.visible = false;
      }
      this.levelBuild.playerMarker.visible = false;
      if (this.levelBuild.monsterMarkers) {
        this.levelBuild.monsterMarkers.forEach((m) => (m.visible = false));
      } else if (this.levelBuild.monsterMarker) {
        this.levelBuild.monsterMarker.visible = false;
      }
      this.levelBuild.exitMarker.visible = false;
    }

    for (const m of this.monsters) {
      m.group.visible = false;
    }

    UIManager.getInstance().showOverview(this.currentLevelDef);
    AudioManager.getInstance().startAmbience();
  }

  // Start Level: Direct instant handover into First Person View (No transition animation)
  private startLevelTransition(): void {
    if (this.state !== 'LEVEL_OVERVIEW' || !this.levelBuild) return;

    // Synchronously request pointer lock within direct user gesture from START LEVEL button
    InputManager.getInstance().requestPointerLock(this.canvas);

    // Hide 2D blueprint map and restore full 3D world environment & monsters
    if (this.levelBuild.overviewMapGroup) {
      this.levelBuild.overviewMapGroup.visible = false;
    }
    this.levelBuild.rootGroup.visible = true;
    for (const m of this.monsters) {
      m.group.visible = true;
    }

    // Hide overview markers for first-person gameplay
    this.levelBuild.playerMarker.visible = false;
    if (this.levelBuild.monsterMarkers) {
      this.levelBuild.monsterMarkers.forEach((m) => (m.visible = false));
    } else if (this.levelBuild.monsterMarker) {
      this.levelBuild.monsterMarker.visible = false;
    }
    this.levelBuild.exitMarker.visible = false;

    // Immediately disable overview camera
    this.overviewCam.setEnabled(false);

    // Restore gameplay graphics quality
    this.applyGraphicsQuality(SettingsManager.getInstance().settings.graphicsQuality);

    // Direct instant handover to First Person Controller!
    const fogColor = this.getThemeFogColor();
    this.scene.background = new THREE.Color(fogColor);
    this.scene.fog = this.getThemeFog(fogColor);
    this.activeCamera = this.fpController.camera;
    this.fpController.setEnabled(true);
    InputManager.getInstance().setOverviewMode(false);
    InputManager.getInstance().resetInputs(); // Clear any buffered clicks or touch events!
    InputManager.getInstance().requestPointerLock(this.canvas);

    this.state = 'STEALTH';
    this.isTimerRunning = true;

    const currentWeaponId = this.fpController.weapon.getWeaponId();
    const isGrenade = currentWeaponId === 'grenade' || currentWeaponId === 'signboard';
    const isMachineGun = currentWeaponId === 'machine_gun' || currentWeaponId === 'slipper';
    const actionVerb = isGrenade ? 'LEMPAR' : (isMachineGun ? 'TEMBAK' : 'PUKUL');
    UIManager.getInstance().showGameplayHUD(actionVerb);

    const monsterName = this.getLevelMonsterDisplayName();
    const weaponDef = this.fpController.weapon.getWeaponDef();
    const weaponName = weaponDef ? weaponDef.name.toUpperCase() : 'SENJATA';
    if (this.currentLevelDef.exitLockedInitially) {
      if (isGrenade) {
        UIManager.getInstance().setStatusText(
          `LEMPAR GRANAT KE ${monsterName} & AKTIFKAN SEMUA TERMINAL UNTUK MEMUNCULKAN PINTU EXIT!`,
          `THROW GRENADE AT ${monsterName} & ACTIVATE ALL TERMINALS TO REVEAL THE EXIT DOOR!`
        );
      } else if (isMachineGun) {
        UIManager.getInstance().setStatusText(
          `TEMBAK ${monsterName} & AKTIFKAN SEMUA TERMINAL UNTUK MEMUNCULKAN PINTU EXIT!`,
          `SHOOT ${monsterName} & ACTIVATE ALL TERMINALS TO REVEAL THE EXIT DOOR!`
        );
      } else {
        UIManager.getInstance().setStatusText(
          `PUKUL ${monsterName} & AKTIFKAN SEMUA TERMINAL UNTUK MEMUNCULKAN PINTU EXIT!`,
          `STRIKE ${monsterName} & ACTIVATE ALL TERMINALS TO REVEAL THE EXIT DOOR!`
        );
      }
    } else {
      if (isGrenade) {
        UIManager.getInstance().setStatusText(
          `LEMPAR GRANAT KE ARAH ${monsterName}! PINTU EXIT AKAN MUNCUL SETELAH TERKENA LEDAKAN.`,
          `THROW GRENADE AT ${monsterName}! THE EXIT DOOR WILL APPEAR AFTER IMPACT.`
        );
      } else if (isMachineGun) {
        UIManager.getInstance().setStatusText(
          `CARI & TEMBAK ${monsterName} DENGAN ${weaponName}! PINTU EXIT AKAN MUNCUL SETELAH TERTEMBAK.`,
          `FIND & SHOOT ${monsterName} WITH ${weaponName}! THE EXIT DOOR WILL APPEAR AFTER IMPACT.`
        );
      } else {
        UIManager.getInstance().setStatusText(
          `CARI & PUKUL ${monsterName} DENGAN ${weaponName}! PINTU EXIT AKAN MUNCUL SETELAH DIPUKUL.`,
          `FIND & STRIKE ${monsterName} WITH ${weaponName}! THE EXIT DOOR WILL APPEAR AFTER IMPACT.`
        );
      }
    }
  }

  // Execute Weapon Attack or Throwable Launch on Monster
  private performAttack(): void {
    if (this.state !== 'STEALTH' || this.isAttackSuccessful) return;

    const currentWeaponId = this.fpController.weapon.getWeaponId();
    const isGrenade = currentWeaponId === 'grenade' || currentWeaponId === 'signboard';
    const isMachineGun = currentWeaponId === 'machine_gun' || currentWeaponId === 'slipper';

    // Ranged Firearm: Machine Gun
    if (isMachineGun) {
      const weaponDef = this.fpController.weapon.getWeaponDef();
      this.handleMachineGunShot(weaponDef);
      return;
    }

    // Ranged Throwable: Hand Grenade
    if (isGrenade) {
      const weaponDef = this.fpController.weapon.getWeaponDef();
      // Reset viewmodel so previous throw animation never blocks or drops inputs
      this.fpController.weapon.reset();
      this.fpController.weapon.swing(() => {
        // Projectile launched from hand into 3D world at exact hand release moment!
        GrenadeSystem.getInstance().throwGrenade(
          this.scene,
          this.fpController.camera,
          (impactPos) => {
            this.handleGrenadeDetonation(impactPos, weaponDef);
          }
        );
      });
      return;
    }

    // Standard Melee Strike (Baseball Bat, Frying Pan, Slipper, Chair, etc.)
    const blocking = this.levelBuild ? this.levelBuild.blockingMeshes : [];
    const forward = this.fpController.getForwardVector();
    let hitMonster: MonsterController | null = null;

    for (const m of this.monsters) {
      if (
        m.isHitByPlayerSwing(
          this.fpController.camera,
          this.fpController.position,
          forward,
          blocking,
          this.fpController.currentFloor
        )
      ) {
        hitMonster = m;
        break;
      }
    }

    if (hitMonster) {
      // Strike connected on monster's body!
      this.state = 'ATTACK';
      this.isAttackSuccessful = true;

      // Reveal exit door and unlock it with bright green illumination!
      if (this.levelBuild?.exitDoorMesh) {
        this.levelBuild.exitDoorMesh.visible = true;
        const doorPointLight = this.levelBuild.exitDoorMesh.children.find((c) => c instanceof THREE.PointLight) as THREE.PointLight;
        if (doorPointLight) {
          doorPointLight.color.setHex(0x22c55e);
          doorPointLight.intensity = 3.8;
        }
      }

      // Clear monster obstacle and switch mobile button to SPRINT
      this.fpController.setMonsterObstacle(null);
      UIManager.getInstance().switchToChaseControls();

      // 1. Swing weapon animation
      const weaponDef = this.fpController.weapon.getWeaponDef();
      this.fpController.weapon.swing(() => {
        this.fpController.weapon.disableAttackPermanently();
      });

      // 2. Immediately trigger hit reaction on struck monster with weapon characteristics, scream, and chase!
      hitMonster.triggerWeaponHit(weaponDef, this.fpController.position);
      for (const m of this.monsters) {
        if (m !== hitMonster) {
          m.wakeUpAndChase();
        }
      }
      this.triggerScreenShake(0.4);
      if (this.currentLevelDef.theme === 'bunker') {
        AudioManager.getInstance().playBunkerKlaxon();
      }
      const monsterName = hitMonster.monsterType === 'kunti' ? 'KUNTILANAK' : (hitMonster.monsterType === 'yeti' ? 'GENDERWO' : 'POCONG');
      if (this.currentLevelDef.theme === 'bunker') {
        UIManager.getInstance().setStatusText(
          `BUNKER CODE RED LOCKDOWN! SEMUA HANTU MENGEJAR! CEPAT LARI KE PINTU EVAKUASI LANTAI 2!`,
          `BUNKER CODE RED LOCKDOWN! ALL GHOSTS CHASING! SPRINT TO THE FLOOR 2 EXIT VAULT!`
        );
      } else if (this.currentLevelDef.exitLockedInitially) {
        UIManager.getInstance().setStatusText(
          `${monsterName} TERSTUN! AKTIFKAN SEMUA TERMINAL UNTUK MEMBUKA PINTU EXIT!`,
          `${monsterName} IS STUNNED! ACTIVATE ALL TERMINALS TO UNLOCK THE EXIT DOOR!`
        );
      } else {
        UIManager.getInstance().setStatusText(
          `${monsterName} TERSTUN & PINTU EXIT TELAH MUNCUL! CEPAT LARI MENUJU PINTU EXIT!`,
          `${monsterName} IS STUNNED & EXIT DOOR HAS APPEARED! SPRINT TO THE EXIT!`
        );
      }
      return;
    }

    // Swung into air or obstructed/different floor - allow swinging again
    const swung = this.fpController.weapon.swing(() => {});
    if (swung) {
      const monsterName = this.getLevelMonsterDisplayName();
      UIManager.getInstance().setStatusText(
        `DEKATI ${monsterName} DAN PUKUL TUBUHNYA!`,
        `APPROACH ${monsterName} AND STRIKE IT!`
      );
      setTimeout(() => {
        if (this.state === 'STEALTH') {
          UIManager.getInstance().setStatusText(
            `CARI & PUKUL ${monsterName}! PINTU EXIT AKAN MUNCUL SETELAH DIPUKUL.`,
            `FIND & STRIKE ${monsterName}! THE EXIT DOOR WILL APPEAR AFTER IMPACT.`
          );
        }
      }, 1800);
    }
  }

  // Handle Ranged Firearm Shot (Machine Gun)
  private handleMachineGunShot(weaponDef: WeaponDefinition): void {
    if (this.state !== 'STEALTH' || this.isAttackSuccessful) return;

    // Trigger weapon recoil swing animation
    this.fpController.weapon.swing(() => {});

    // Trace bullet ray from camera
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), this.fpController.camera);
    raycaster.far = 40.0;

    const blocking = this.levelBuild ? this.levelBuild.blockingMeshes : [];
    const wallIntersects = raycaster.intersectObjects(blocking, true);
    const maxRayDist = wallIntersects.length > 0 ? wallIntersects[0].distance : 40.0;

    const MAX_GUN_RANGE = 22.0; // Effective firearm threshold (meters)
    let hitMonster: MonsterController | null = null;
    let closestDist = maxRayDist;
    let isAimingBeyondRange = false;

    const ray = raycaster.ray;
    for (const m of this.monsters) {
      if (m.state !== 'SITTING_IDLE' || m.isAwake) continue;

      // Vertical separation validation (must be on the same floor/level height)
      const playerFeetY = this.fpController.position.y - 1.65;
      const verticalDist = Math.abs(playerFeetY - m.position.y);
      if (verticalDist > 2.2) continue;

      const monsterCenterY = m.monsterType === 'kunti' ? 0.45 : (m.monsterType === 'yeti' ? 1.4 : 0.9);
      const monsterCenter = new THREE.Vector3(m.position.x, m.position.y + monsterCenterY, m.position.z);
      const distFromPlayer = this.fpController.position.distanceTo(monsterCenter);

      let isHit = false;
      let hitDist = 999.0;

      // 1. Direct mesh raycast
      const monsterHits = raycaster.intersectObjects(m.group.children, true);
      if (monsterHits.length > 0 && monsterHits[0].distance <= maxRayDist) {
        isHit = true;
        hitDist = monsterHits[0].distance;
      } else {
        // 2. Point-to-ray proximity tolerance for forgiving, responsive aim (crosshair near monster body)
        const toMonster = new THREE.Vector3().subVectors(monsterCenter, ray.origin);
        const distAlongRay = toMonster.dot(ray.direction);

        if (distAlongRay > 0 && distAlongRay <= maxRayDist) {
          const closestPointOnRay = new THREE.Vector3().copy(ray.origin).addScaledVector(ray.direction, distAlongRay);
          const perpDist = closestPointOnRay.distanceTo(monsterCenter);
          if (perpDist <= 0.85) {
            isHit = true;
            hitDist = distAlongRay;
          }
        }
      }

      if (isHit) {
        if (distFromPlayer > MAX_GUN_RANGE) {
          // Monster is in crosshairs but too far away: do NOT trigger/wake up monster!
          isAimingBeyondRange = true;
        } else if (hitDist < closestDist) {
          closestDist = hitDist;
          hitMonster = m;
        }
      }
    }

    if (hitMonster) {
      this.state = 'ATTACK';
      this.isAttackSuccessful = true;

      // Reveal exit door and unlock it with bright green illumination
      if (this.levelBuild?.exitDoorMesh) {
        this.levelBuild.exitDoorMesh.visible = true;
        const doorPointLight = this.levelBuild.exitDoorMesh.children.find((c) => c instanceof THREE.PointLight) as THREE.PointLight;
        if (doorPointLight) {
          doorPointLight.color.setHex(0x22c55e);
          doorPointLight.intensity = 3.8;
        }
      }

      // Clear obstacle & switch mobile controls to SPRINT
      this.fpController.setMonsterObstacle(null);
      UIManager.getInstance().switchToChaseControls();

      // Permanently disable attack now that monster has been shot
      this.fpController.weapon.disableAttackPermanently();

      // Trigger hit reaction with gunshot sound, scream, knockback away from player (1.8m), and ranged sprint boost!
      hitMonster.triggerWeaponHit(weaponDef, this.fpController.position, 1.8, true);
      for (const m of this.monsters) {
        if (m !== hitMonster) {
          m.wakeUpAndChase();
        }
      }
      this.triggerScreenShake(0.5);
      if (this.currentLevelDef.theme === 'bunker') {
        AudioManager.getInstance().playBunkerKlaxon();
      }

      const monsterName = hitMonster.monsterType === 'kunti' ? 'KUNTILANAK' : (hitMonster.monsterType === 'yeti' ? 'GENDERWO' : 'POCONG');
      if (this.currentLevelDef.theme === 'bunker') {
        UIManager.getInstance().setStatusText(
          `BUNKER CODE RED LOCKDOWN! SEMUA HANTU MENGEJAR! CEPAT LARI KE PINTU EVAKUASI LANTAI 2!`,
          `BUNKER CODE RED LOCKDOWN! ALL GHOSTS CHASING! SPRINT TO THE FLOOR 2 EXIT VAULT!`
        );
      } else if (this.currentLevelDef.exitLockedInitially) {
        UIManager.getInstance().setStatusText(
          `${monsterName} TERKENA TEMBAKAN! AKTIFKAN SEMUA TERMINAL UNTUK MEMBUKA PINTU EXIT!`,
          `${monsterName} WAS SHOT! ACTIVATE ALL TERMINALS TO UNLOCK THE EXIT DOOR!`
        );
      } else {
        UIManager.getInstance().setStatusText(
          `${monsterName} TERKENA TEMBAKAN & PINTU EXIT TELAH MUNCUL! CEPAT LARI MENUJU PINTU EXIT!`,
          `${monsterName} WAS SHOT & THE EXIT DOOR HAS APPEARED! SPRINT TO THE EXIT!`
        );
      }
    } else {
      // Missed shot or beyond range: Screen shake & notify player
      this.triggerScreenShake(0.2);
      const isKunti = this.currentLevelDef.monsterType === 'kunti' || this.currentLevelDef.id === 2;
      const monsterName = isKunti ? 'KUNTILANAK' : 'POCONG';

      if (isAimingBeyondRange) {
        UIManager.getInstance().setStatusText(
          `TERLALU JAUH! DEKATI ${monsterName} HINGGA JARAK TEMBAK (MAKSIMAL 22 METER)!`,
          `TOO FAR! GET CLOSER TO ${monsterName} INTO FIRING RANGE (MAX 22 METERS)!`
        );
      } else {
        UIManager.getInstance().setStatusText(
          `TEMBAKAN MELESET! ARAHKAN KE ${monsterName} DAN TEMBAK LAGI!`,
          `MISSED SHOT! AIM AT ${monsterName} AND SHOOT AGAIN!`
        );
      }

      setTimeout(() => {
        if (this.state === 'STEALTH') {
          UIManager.getInstance().setStatusText(
            `TEMBAK ${monsterName}! PINTU EXIT AKAN MUNCUL SETELAH TERTEMBAK.`,
            `SHOOT ${monsterName}! THE EXIT DOOR WILL APPEAR AFTER IMPACT.`
          );
        }
      }, 2000);
    }
  }

  // Handle Grenade Detonation Blast: Impact on Monster vs Miss
  private handleGrenadeDetonation(impactPos: THREE.Vector3, weaponDef: WeaponDefinition): void {
    if (this.state !== 'STEALTH') return;

    // Check if any sleeping monster is within blast radius (4.6m horizontal, 3.2m vertical for wall-clinging height)
    let hitMonster: MonsterController | null = null;
    for (const m of this.monsters) {
      const monsterCenterY = m.monsterType === 'kunti' ? 0.45 : (m.monsterType === 'yeti' ? 1.4 : 0.9);
      const monsterCenter = new THREE.Vector3(m.position.x, m.position.y + monsterCenterY, m.position.z);
      const hDist = Math.hypot(impactPos.x - monsterCenter.x, impactPos.z - monsterCenter.z);
      const vDist = Math.abs(impactPos.y - monsterCenter.y);
      if (hDist <= 4.6 && vDist <= 3.2) {
        if (!this.pathfinding || this.pathfinding.hasLineOfSight(impactPos.x, impactPos.z, m.position.x, m.position.z)) {
          hitMonster = m;
          break;
        }
      }
    }

    if (hitMonster) {
      // RULE: When grenade hits / triggers the monster, grenade disappears from player screen and monster awakens
      this.state = 'ATTACK';
      this.isAttackSuccessful = true;

      // Reveal exit door and unlock it with bright green illumination
      if (this.levelBuild?.exitDoorMesh) {
        this.levelBuild.exitDoorMesh.visible = true;
        const doorPointLight = this.levelBuild.exitDoorMesh.children.find((c) => c instanceof THREE.PointLight) as THREE.PointLight;
        if (doorPointLight) {
          doorPointLight.color.setHex(0x22c55e);
          doorPointLight.intensity = 3.8;
        }
      }

      // Clear obstacle & switch mobile controls to SPRINT
      this.fpController.setMonsterObstacle(null);
      UIManager.getInstance().switchToChaseControls();

      // Permanently disable attack and hide grenade viewmodel from player's screen!
      this.fpController.weapon.disableAttackPermanently();
      this.fpController.weapon.setVisible(false);

      // Trigger hit reaction, explosion impact, scream, directional knockback (2.2m), and ranged sprint boost!
      hitMonster.triggerWeaponHit(weaponDef, impactPos, 2.2, true);
      for (const m of this.monsters) {
        if (m !== hitMonster) {
          m.wakeUpAndChase();
        }
      }
      this.triggerScreenShake(0.65);
      if (this.currentLevelDef.theme === 'bunker') {
        AudioManager.getInstance().playBunkerKlaxon();
      }

      const monsterName = hitMonster.monsterType === 'kunti' ? 'KUNTILANAK' : (hitMonster.monsterType === 'yeti' ? 'GENDERWO' : 'POCONG');
      if (this.currentLevelDef.theme === 'bunker') {
        UIManager.getInstance().setStatusText(
          `BUNKER CODE RED LOCKDOWN! SEMUA HANTU MENGEJAR! CEPAT LARI KE PINTU EVAKUASI LANTAI 2!`,
          `BUNKER CODE RED LOCKDOWN! ALL GHOSTS CHASING! SPRINT TO THE FLOOR 2 EXIT VAULT!`
        );
      } else if (this.currentLevelDef.exitLockedInitially) {
        UIManager.getInstance().setStatusText(
          `${monsterName} TERKENA LEDAKAN GRANAT! AKTIFKAN SEMUA TERMINAL UNTUK MEMBUKA PINTU EXIT!`,
          `${monsterName} WAS HIT BY GRENADE! ACTIVATE ALL TERMINALS TO UNLOCK THE EXIT DOOR!`
        );
      } else {
        UIManager.getInstance().setStatusText(
          `${monsterName} TERKENA LEDAKAN GRANAT & PINTU EXIT TELAH MUNCUL! CEPAT LARI MENUJU PINTU EXIT!`,
          `${monsterName} WAS HIT BY GRENADE & THE EXIT DOOR HAS APPEARED! SPRINT TO THE EXIT!`
        );
      }
    } else {
      // RULE: When grenade misses, it remains on the player's screen and player can throw again!
      this.fpController.weapon.setVisible(true);
      this.fpController.weapon.reset();
      this.triggerScreenShake(0.25);

      const monsterName = this.getLevelMonsterDisplayName();
      UIManager.getInstance().setStatusText(
        `LEMPARAN MELESET! ARAHKAN KE DEKAT ${monsterName} DAN LEMPAR LAGI!`,
        `GRENADE MISSED! THROW NEAR ${monsterName} AND TRY AGAIN!`
      );
      setTimeout(() => {
        if (this.state === 'STEALTH') {
          UIManager.getInstance().setStatusText(
            `LEMPAR GRANAT KE ARAH ${monsterName}! PINTU EXIT AKAN MUNCUL SETELAH TERKENA LEDAKAN.`,
            `THROW GRENADE AT ${monsterName}! THE EXIT DOOR WILL APPEAR AFTER IMPACT.`
          );
        }
      }, 2400);
    }
  }

  private triggerScreenShake(amount: number): void {
    this.shakeIntensity = amount;
  }

  // Handle monster catching player (Face Jumpscare presentation directly in front of player)
  private handlePlayerCaught(m?: MonsterController, reason: string = 'Monster berhasil menangkapmu!', enReason?: string): void {
    if (this.state === 'GAME_OVER' || this.state === 'JUMPSCARE' || this.isJumpscareActive) return;

    const monsterName = (this.currentLevelDef?.id === 2 || m?.monsterType === 'kunti')
      ? 'Kuntilanak'
      : (m?.monsterType === 'yeti' ? 'Genderwo' : 'Pocong');
    const effectiveReason = reason.includes('Pocong') || reason.includes('Monster')
      ? `${monsterName} berhasil menangkapmu!`
      : reason;
    const effectiveEnReason = enReason || `The ${monsterName} caught you!`;

    // Trigger face jumpscare directly in front of player for all monsters
    this.triggerCaptureJumpscare(m, effectiveReason, effectiveEnReason);
  }

  // Capture Jumpscare Presentation: Monster face positioned directly in front of player
  private triggerCaptureJumpscare(m?: MonsterController, reason: string = 'Monster berhasil menangkapmu!', enReason?: string): void {
    if (this.state === 'GAME_OVER' || this.state === 'JUMPSCARE' || this.isJumpscareActive) return;
    this.isJumpscareActive = true;
    this.state = 'JUMPSCARE';
    this.jumpscareTimer = 0;
    this.jumpscareReason = reason;
    this.jumpscareReasonEn = enReason || 'The monster caught you!';
    this.isTimerRunning = false;

    // 1. Disable normal player controls & exit pointer lock
    this.fpController.setEnabled(false);
    InputManager.getInstance().exitPointerLock();
    try {
      if (document.exitPointerLock) document.exitPointerLock();
    } catch (_) {}

    // Hide gameplay HUD prompts and touch controls
    const ui = UIManager.getInstance();
    ui.setAttackPromptVisible(false);
    ui.setDetectionMeter(0);
    ui.hidePickupPrompt();
    ui.showJumpscareOverlay();

    const catchingMonster = m || this.monsters[0];
    this.activeCatchingMonster = catchingMonster;
    const isKunti = (this.currentLevelDef?.id === 2 || catchingMonster?.monsterType === 'kunti');

    // 2. Play monster scream audio & stinger
    if (isKunti) {
      AudioManager.getInstance().playKuntiSound(true);
    } else if (catchingMonster?.monsterType === 'yeti') {
      AudioManager.getInstance().playYetiRoar();
    } else {
      AudioManager.getInstance().playPocongScream(true);
    }
    AudioManager.getInstance().playCaughtStinger();

    // 3. Camera presentation & Monster Face Framing
    // Hide weapon model during jumpscare so it doesn't obstruct the monster face
    this.fpController.weapon.group.visible = false;

    // Record initial camera position and get forward vector
    this.jumpscareInitialCamPos.copy(this.fpController.camera.position);
    const forward = new THREE.Vector3();
    this.fpController.camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() < 0.001) forward.set(0, 0, -1);
    forward.normalize();

    // Align player camera horizontally so look pitch is zero (dead ahead)
    const currentYaw = this.fpController.getYaw();
    this.fpController.setLookAngles(currentYaw, 0);

    if (catchingMonster) {
      // Place monster face EXACTLY in front of the camera (0.68m) at eye level
      const camPos = this.fpController.camera.position;
      catchingMonster.position.copy(camPos).addScaledVector(forward, 0.68);

      // Vertical offset so eyes and face are precisely at camPos.y
      if (catchingMonster.monsterType === 'kunti') {
        catchingMonster.position.y = camPos.y - 0.55;
      } else if (catchingMonster.monsterType === 'yeti') {
        catchingMonster.position.y = camPos.y - 2.15;
      } else {
        catchingMonster.position.y = camPos.y - 1.62;
      }

      // Face monster directly into player camera
      catchingMonster.rotationY = Math.atan2(-forward.x, -forward.z);
      catchingMonster.state = 'CATCH_PLAYER';
      catchingMonster.model.applyCatch(0);
    }

    // Heavy violent initial screen shake
    this.shakeIntensity = 0.65;
  }

  // Trigger Game Over
  private triggerGameOver(reason: string, enReason?: string): void {
    if (this.state === 'GAME_OVER') return;
    this.state = 'GAME_OVER';
    this.isTimerRunning = false;
    this.fpController.setEnabled(false);
    AudioManager.getInstance().stopKuntiChaseAudio();
    InputManager.getInstance().exitPointerLock();
    try {
      if (document.exitPointerLock) {
        document.exitPointerLock();
      }
    } catch (_) {}

    UIManager.getInstance().showGameOver(reason, enReason);
  }

  // Escape Reached: Level Complete!
  private triggerLevelComplete(): void {
    this.state = 'LEVEL_COMPLETE';
    this.isTimerRunning = false;
    this.fpController.setEnabled(false);
    AudioManager.getInstance().stopKuntiChaseAudio();
    InputManager.getInstance().exitPointerLock();

    AudioManager.getInstance().playLevelComplete();

    // Record progress
    SaveManager.getInstance().recordCompletion(this.currentLevelDef.id, this.gameplayTimer);

    const hasNext = this.currentLevelDef.id + 1 <= ALL_LEVELS.length;
    UIManager.getInstance().showLevelComplete(this.currentLevelDef, this.gameplayTimer, hasNext);
  }

  // Pause Game
  private pauseGame(): void {
    if (this.state === 'STEALTH' || this.state === 'CHASE' || this.state === 'ATTACK') {
      this.previousState = this.state;
      this.state = 'PAUSED';
      this.fpController.setEnabled(false);
      InputManager.getInstance().exitPointerLock();
      UIManager.getInstance().showPauseMenu();
    }
  }

  // Resume Game
  private resumeGame(): void {
    if (this.state === 'PAUSED') {
      this.state = this.previousState;
      this.fpController.setEnabled(true);
      InputManager.getInstance().requestPointerLock(this.canvas);
      UIManager.getInstance().showGameplayHUD();
    }
  }

  // Restart Level (Returns to PRE-GAME OVERVIEW per specification)
  private restartLevel(): void {
    this.loadLevel(this.currentLevelDef.id, true);
  }

  // Exit to Main Menu
  private exitToMainMenu(): void {
    this.state = 'MAIN_MENU';
    if (this.levelBuild?.overviewMapGroup) {
      this.levelBuild.overviewMapGroup.visible = false;
    }
    if (this.levelBuild?.rootGroup) {
      this.levelBuild.rootGroup.visible = false;
    }
    this.overviewCam.setEnabled(false);
    InputManager.getInstance().setOverviewMode(false);
    this.scene.background = new THREE.Color(0x101416);
    this.applyGraphicsQuality(SettingsManager.getInstance().settings.graphicsQuality);
    AudioManager.getInstance().stopKuntiChaseAudio();
    this.scene.fog = new THREE.Fog(0x101416, 100, 240);
    this.isTimerRunning = false;
    this.fpController.setEnabled(false);
    InputManager.getInstance().exitPointerLock();
    UIManager.getInstance().showMainMenu();
  }

  // Main Render & Game Loop
  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.1);
    this.totalTime += dt;

    if (this.isTimerRunning) {
      this.gameplayTimer += dt;
    }

    const inputMgr = InputManager.getInstance();

    // Check Pause Request
    if (inputMgr.consumePauseRequest()) {
      if (this.state === 'PAUSED') {
        this.resumeGame();
      } else {
        this.pauseGame();
      }
    }

    // State Updates
    if (this.state === 'JUMPSCARE' || this.isJumpscareActive) {
      this.jumpscareTimer += dt;

      if (this.activeCatchingMonster) {
        // Violently animate Pocong jaw/head and flare glowing red eyes
        this.activeCatchingMonster.model.applyCatch(this.jumpscareTimer);
      }

      // Screen shake decay during jumpscare
      if (this.shakeIntensity > 0.001) {
        const shakeX = (Math.random() - 0.5) * this.shakeIntensity;
        const shakeY = (Math.random() - 0.5) * this.shakeIntensity;
        this.fpController.camera.position.x = this.jumpscareInitialCamPos.x + shakeX;
        this.fpController.camera.position.y = this.jumpscareInitialCamPos.y + shakeY;
        this.shakeIntensity = Math.max(0, this.shakeIntensity - this.shakeDecay * dt);
      }

      if (this.jumpscareTimer >= this.jumpscareDuration) {
        this.isJumpscareActive = false;
        UIManager.getInstance().hideJumpscareOverlay();
        this.fpController.weapon.group.visible = true;
        this.triggerGameOver(this.jumpscareReason, this.jumpscareReasonEn);
      }

      this.renderer.render(this.scene, this.activeCamera);
      return;
    }

    if (this.state === 'LEVEL_OVERVIEW') {
      this.overviewCam.update(dt);

      // Pulse player radar marker on top-down blueprint map
      if (this.levelBuild?.overviewMapGroup) {
        const pMarker = this.levelBuild.overviewMapGroup.getObjectByName('OverviewPlayerMarker');
        if (pMarker) {
          const pulse = 1.0 + Math.sin(this.totalTime * 4.0) * 0.12;
          pMarker.scale.set(pulse, 1.0, pulse);
        }
      }
    } else if (this.state === 'STEALTH' || this.state === 'ATTACK' || this.state === 'CHASE') {
      // 1. Update Player
      this.fpController.update(dt, this.totalTime);

      // 2. Update All Monsters
      const isChasePhase = this.isAttackSuccessful || this.state === 'CHASE' || this.state === 'ATTACK';
      for (const m of this.monsters) {
        m.update(dt, this.totalTime, this.fpController.position, isChasePhase);
      }

      // Animate world weapon pickups
      this.animateWorldPickups(this.totalTime);

      // Update Grenade Projectile & Explosion Smoke/Fire Particles
      const blockingMeshes = this.levelBuild ? this.levelBuild.blockingMeshes : [];
      const monsterPositions = this.monsters.map((m) => m.position);
      const floorHeight = this.levelBuild?.floorHeight || 3.8;
      const currentFloorY = this.fpController
        ? Math.max(0, this.fpController.currentFloor * floorHeight)
        : (this.levelBuild?.playerWorldSpawn?.y || 0);
      GrenadeSystem.getInstance().update(dt, this.scene, blockingMeshes, monsterPositions, currentFloorY);

      // 3. Attack Check & Weapon Pickup Discovery (during STEALTH phase)
      if (this.state === 'STEALTH') {
        const blocking = this.levelBuild ? this.levelBuild.blockingMeshes : [];
        let canAttackAny = false;
        let nearestDist = Infinity;
        let nearestMonster: MonsterController | null = null;
        let nearestAttackableDist = Infinity;
        let nearestAttackableMonster: MonsterController | null = null;

        for (const m of this.monsters) {
          const isAttackable = m.canBeAttackedFromBehind(
            this.fpController.position,
            blocking,
            this.fpController.currentFloor
          );
          if (isAttackable) {
            canAttackAny = true;
            const dist = this.fpController.position.distanceTo(m.position);
            if (dist < nearestAttackableDist) {
              nearestAttackableDist = dist;
              nearestAttackableMonster = m;
            }
          }
          const dist = this.fpController.position.distanceTo(m.position);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearestMonster = m;
          }
        }

        // Set collision obstacle to the target monster
        if (nearestAttackableMonster) {
          this.fpController.setMonsterObstacle(nearestAttackableMonster.position);
        } else if (nearestMonster) {
          this.fpController.setMonsterObstacle(nearestMonster.position);
        }

        const currentWeaponId = this.fpController.weapon.getWeaponId();
        const isGrenade = currentWeaponId === 'grenade' || currentWeaponId === 'signboard';
        const isMachineGun = currentWeaponId === 'machine_gun' || currentWeaponId === 'slipper';
        const actionVerb = isGrenade ? 'LEMPAR' : (isMachineGun ? 'TEMBAK' : 'PUKUL');

        if (isGrenade || isMachineGun) {
          const target = nearestAttackableMonster || nearestMonster;
          const alertDist = isMachineGun ? 25.0 : 18.0;
          const floorHeight = this.levelBuild?.floorHeight || 3.8;
          const monsterFloor = target ? Math.max(0, Math.round(target.position.y / floorHeight)) : 0;
          const sameFloor = target
            ? (this.fpController.currentFloor === monsterFloor || Math.abs(this.fpController.position.y - target.position.y) < 2.5)
            : false;
          const isNearMonster = nearestDist <= alertDist && sameFloor;
          canAttackAny = isNearMonster;
        }

        const targetMonster = nearestAttackableMonster || nearestMonster;
        const targetMonsterName = targetMonster?.monsterType === 'kunti' ? 'Kuntilanak' : (targetMonster?.monsterType === 'yeti' ? 'Genderwo' : 'Pocong');
        UIManager.getInstance().setAttackPromptVisible(canAttackAny, targetMonsterName, actionVerb);
        UIManager.getInstance().setDetectionMeter(0);

        if (inputMgr.consumeAttackRequest()) {
          this.performAttack();
        }

        // Check weapon pickup discovery in level environment
        this.updateWeaponPickups();
      } else {
        UIManager.getInstance().setAttackPromptVisible(false);
        UIManager.getInstance().setDetectionMeter(0);
        UIManager.getInstance().hidePickupPrompt();
      }

      // 4. Escape Door Trigger Check & Catch Check (during CHASE phase!)
      if (this.state === 'CHASE') {
        for (const m of this.monsters) {
          const horizontalDist = Math.hypot(
            m.position.x - this.fpController.position.x,
            m.position.z - this.fpController.position.z
          );
          const verticalDiff = Math.abs(m.position.y - (this.fpController.position.y - 1.65));
          if (m.stateTime > MonsterController.CATCH_GRACE_PERIOD && horizontalDist <= 1.5 && verticalDiff <= 1.5) {
            const mName = m.monsterType === 'kunti' ? 'Kuntilanak' : (m.monsterType === 'yeti' ? 'Genderwo' : 'Pocong');
            this.handlePlayerCaught(m, `${mName} berhasil menangkapmu!`);
            return;
          }
        }

        if (
          this.isAttackSuccessful &&
          this.levelBuild &&
          this.levelBuild.exitDoorMesh?.visible &&
          this.levelBuild.exitTriggerBox.containsPoint(this.fpController.position)
        ) {
          if (this.currentLevelDef.exitLockedInitially && !this.isExitUnlocked) {
            UIManager.getInstance().setStatusText(
              'PINTU EXIT MASIH TERKUNCI! AKTIFKAN SEMUA TERMINAL!',
              'EXIT DOOR IS LOCKED! ACTIVATE ALL TERMINALS!'
            );
          } else {
            this.triggerLevelComplete();
          }
        } else if (
          !this.isAttackSuccessful &&
          this.levelBuild &&
          this.levelBuild.exitDoorMesh?.visible &&
          this.levelBuild.exitTriggerBox.containsPoint(this.fpController.position)
        ) {
          const mName = this.getLevelMonsterDisplayName();
          const fName = this.currentLevelDef.id === 3 ? 'LANTAI 1' : 'ARENA';
          UIManager.getInstance().setStatusText(
            `PINTU EXIT TERKUNCI! TEMUKAN & SERANG ${mName} DI ${fName} DULU!`,
            `EXIT LOCKED! FIND & STRIKE ${mName} FIRST!`
          );
        }
      }

      // 5. Screen Shake
      if (this.shakeIntensity > 0.001) {
        const shakeX = (Math.random() - 0.5) * this.shakeIntensity;
        const shakeY = (Math.random() - 0.5) * this.shakeIntensity;
        this.fpController.camera.position.x += shakeX;
        this.fpController.camera.position.y += shakeY;
        this.shakeIntensity = Math.max(0, this.shakeIntensity - this.shakeDecay * dt);
      }


    } else if (this.state === 'MAIN_MENU') {
      // Gentle background rotation in main menu
      this.overviewCam.update(dt);
    }

    // Render Active Camera
    this.renderer.render(this.scene, this.activeCamera);
  };

  private animateWorldPickups(totalTime: number): void {
    if (!this.levelBuild?.weaponPickups) return;
    for (let i = 0; i < this.levelBuild.weaponPickups.length; i++) {
      const pickup = this.levelBuild.weaponPickups[i];
      if (!pickup.collected) {
        pickup.group.rotation.y = totalTime * 1.5;
        const bobY = Math.sin(totalTime * 3.0 + i) * 0.08;
        const wMesh = pickup.group.getObjectByName('PickupWeaponMesh');
        if (wMesh) {
          wMesh.position.y = 0.75 + bobY;
        }
      }
    }
  }

  // Helper: World-Space to Screen-Space Projection for Contextual Prompts
  private projectWorldToScreen(worldPos: THREE.Vector3): { x: number; y: number } | null {
    const p = worldPos.clone().project(this.fpController.camera);
    // If behind the camera (p.z > 1.0), return null to hide
    if (p.z > 1.0) return null;

    const x = (p.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-p.y * 0.5 + 0.5) * window.innerHeight;

    // Viewport padding clamping (ensures prompt stays within screen bounds & safe areas)
    const pad = 30;
    const clampedX = Math.max(pad, Math.min(window.innerWidth - pad, x));
    const clampedY = Math.max(pad, Math.min(window.innerHeight - pad, y));
    return { x: clampedX, y: clampedY };
  }

  // Helper: Line-of-sight raycast against solid walls, floors, and ceilings
  private isObstructedByGeometry(from: THREE.Vector3, to: THREE.Vector3): boolean {
    if (!this.levelBuild || !this.levelBuild.blockingMeshes || this.levelBuild.blockingMeshes.length === 0) return false;
    const dir = new THREE.Vector3().subVectors(to, from);
    const dist = dir.length();
    if (dist <= 0.05) return false;
    dir.normalize();

    const ray = new THREE.Raycaster(from, dir, 0.05, dist);
    const hits = ray.intersectObjects(this.levelBuild.blockingMeshes, true);
    return hits.length > 0 && hits[0].distance < dist - 0.25;
  }

  private updateWeaponPickups(): void {
    if (this.state !== 'STEALTH' && this.state !== 'CHASE') {
      UIManager.getInstance().hidePickupPrompt();
      return;
    }

    const playerPos = this.fpController.position;
    const inputMgr = InputManager.getInstance();
    let nearPickup: WorldWeaponPickup | null = null;
    let minDist = 2.6; // 2.6m interaction pickup range

    if (this.levelBuild?.weaponPickups) {
      for (const pickup of this.levelBuild.weaponPickups) {
        if (!pickup.collected && !SaveManager.getInstance().isWeaponUnlocked(pickup.weaponId)) {
          // Reject cross-floor prompts (must be on compatible height threshold <= 1.75m)
          const verticalDiff = Math.abs(pickup.position.y - (playerPos.y - 1.65));
          if (verticalDiff <= 1.75) {
            const pickupAnchor = new THREE.Vector3(pickup.position.x, pickup.position.y + 0.75, pickup.position.z);
            const dist3D = playerPos.distanceTo(pickupAnchor);
            if (dist3D <= minDist) {
              // Line-of-sight raycast: reject if behind walls, floors, or ceilings
              if (!this.isObstructedByGeometry(playerPos, pickupAnchor)) {
                minDist = dist3D;
                nearPickup = pickup;
              }
            }
          }
        }
      }
    }

    if (nearPickup) {
      const def = WEAPON_MAP[nearPickup.weaponId];
      const anchor = new THREE.Vector3(nearPickup.position.x, nearPickup.position.y + 0.85, nearPickup.position.z);
      const screenPos = this.projectWorldToScreen(anchor);
      UIManager.getInstance().showPickupPrompt(def.nameId, () => {
        this.collectWeapon(nearPickup!);
      }, screenPos || undefined);

      if (inputMgr.consumeInteractRequest()) {
        this.collectWeapon(nearPickup);
      }
      return;
    }

    // Check Interactive Switches (Level 9 Special Objective)
    const switchHandled = this.updateInteractiveSwitches();
    if (!switchHandled) {
      UIManager.getInstance().hidePickupPrompt();
    }
  }

  private updateInteractiveSwitches(): boolean {
    if (!this.levelBuild?.interactiveSwitches) return false;

    const playerPos = this.fpController.position;
    const inputMgr = InputManager.getInstance();
    let nearSwitch: WorldInteractiveSwitch | null = null;
    let minDist = 2.6;

    for (const sw of this.levelBuild.interactiveSwitches) {
      if (!sw.activated) {
        const verticalDiff = Math.abs(sw.position.y - (playerPos.y - 1.65));
        if (verticalDiff <= 1.75) {
          const switchCenter = new THREE.Vector3(sw.position.x, sw.position.y + 1.1, sw.position.z);
          const dist3D = playerPos.distanceTo(switchCenter);
          if (dist3D <= minDist) {
            if (!this.isObstructedByGeometry(playerPos, switchCenter)) {
              minDist = dist3D;
              nearSwitch = sw;
            }
          }
        }
      }
    }

    if (nearSwitch) {
      const switchCenter = new THREE.Vector3(nearSwitch.position.x, nearSwitch.position.y + 1.25, nearSwitch.position.z);
      const screenPos = this.projectWorldToScreen(switchCenter);
      UIManager.getInstance().showPickupPrompt(nearSwitch.name, () => {
        this.activateSwitch(nearSwitch!);
      }, screenPos || undefined);

      if (inputMgr.consumeInteractRequest()) {
        this.activateSwitch(nearSwitch);
      }
      return true;
    }

    return false;
  }

  private activateSwitch(sw: WorldInteractiveSwitch): void {
    if (sw.activated) return;
    sw.activated = true;

    // Green beacon and light indicating activation
    (sw.beaconMesh.material as THREE.MeshBasicMaterial).color.setHex(0x22c55e);
    sw.light.color.setHex(0x22c55e);

    AudioManager.getInstance().playUiClick();
    AudioManager.getInstance().playPickupWeapon();

    const allSwitches = this.levelBuild?.interactiveSwitches || [];
    const allActivated = allSwitches.every((s) => s.activated);

    if (allActivated) {
      this.isExitUnlocked = true;
      if (this.levelBuild?.exitDoorMesh) {
        const doorPointLight = this.levelBuild.exitDoorMesh.children.find((c) => c instanceof THREE.PointLight) as THREE.PointLight;
        if (doorPointLight) {
          doorPointLight.color.setHex(0x22c55e);
        }
      }
      UIManager.getInstance().setStatusText(
        'SEMUA TERMINAL AKTIF! PINTU EXIT TERBUKA! LARI KE KELUAR!',
        'ALL TERMINALS ACTIVE! EXIT DOOR UNLOCKED! SPRINT TO THE EXIT!'
      );
    } else {
      const remaining = allSwitches.filter((s) => !s.activated).length;
      UIManager.getInstance().setStatusText(
        `${sw.name} DIAKTIFKAN! TERSISA ${remaining} TERMINAL LAGI!`,
        `${sw.name} ACTIVATED! ${remaining} TERMINALS REMAINING!`
      );
    }
  }

  private collectWeapon(pickup: WorldWeaponPickup): void {
    if (pickup.collected) return;
    pickup.collected = true;
    pickup.group.visible = false;
    UIManager.getInstance().hidePickupPrompt();

    // Unlock permanently in persistent save data
    const wasNewlyUnlocked = SaveManager.getInstance().unlockWeapon(pickup.weaponId);
    SaveManager.getInstance().setSelectedWeapon(pickup.weaponId);
    this.fpController.weapon.setWeapon(pickup.weaponId);

    const isGrenade = pickup.weaponId === 'grenade' || pickup.weaponId === 'signboard';
    const isMachineGun = pickup.weaponId === 'machine_gun' || pickup.weaponId === 'slipper';
    const actionVerb = isGrenade ? 'LEMPAR' : (isMachineGun ? 'TEMBAK' : 'PUKUL');
    UIManager.getInstance().showGameplayHUD(actionVerb);

    // Hide all other world pickups of the same weapon ID in the active level environment
    if (this.levelBuild?.weaponPickups) {
      for (const other of this.levelBuild.weaponPickups) {
        if (other.weaponId === pickup.weaponId) {
          other.collected = true;
          other.group.visible = false;
        }
      }
    }

    if (wasNewlyUnlocked) {
      AudioManager.getInstance().playPickupWeapon();
      const def = WEAPON_MAP[pickup.weaponId];
      UIManager.getInstance().showWeaponDiscoveryToast(def.id, def.description);
      UIManager.getInstance().setStatusText(
        `SENJATA DIPAKAI: ${def.nameId.toUpperCase()}!`,
        `WEAPON EQUIPPED: ${def.name.toUpperCase()}!`
      );
    }
  }

  private disposeHierarchy(obj: THREE.Object3D): void {
    obj.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        if (mesh.geometry) {
          mesh.geometry.dispose();
        }
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose());
          } else {
            mesh.material.dispose();
          }
        }
      }
    });
  }
}
