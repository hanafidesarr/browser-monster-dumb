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
  private isKamehamehaCharging: boolean = false;
  private kamehamehaChargeInterval: any = null;
  private kamehamehaTimeout: any = null;
  private kamehamehaFadeInterval: any = null;
  private activeKamehamehaBeam: THREE.Group | null = null;
  private lastWeaponNotReadyAlertTime: number = 0;

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
      const save = SaveManager.getInstance();
      const targetId = save.isLevelUnlocked(levelId) ? levelId : save.getCurrentLevel();
      this.loadLevel(targetId, true);
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
      const save = SaveManager.getInstance();
      const maxPlayableLevel = save.isDevModeEnabled() ? ALL_LEVELS.length : 6;
      if (nextId <= maxPlayableLevel && save.isLevelUnlocked(nextId)) {
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
      const isSpecial = weaponId === 'rasengan' || weaponId === 'toy_hammer' || weaponId === 'kamehameha' || weaponId === 'electric_fan';
      if (isSpecial) {
        this.fpController.weapon.setVisible(this.isPlayerInSpecialAttackArea());
      } else {
        this.fpController.weapon.setVisible(true);
      }
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
    this.cancelKamehamehaSequence();
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
    const isSpecial = savedWeaponId === 'rasengan' || savedWeaponId === 'toy_hammer' || savedWeaponId === 'kamehameha' || savedWeaponId === 'electric_fan';
    if (isSpecial) {
      this.fpController.weapon.setVisible(false);
    }

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
      case 'construction': return 0x202830;  // Steel-blue night construction tone
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
      case 'bunker':
        return new THREE.Fog(fogColor, 25, 80);
      case 'construction':
        return new THREE.Fog(fogColor, 35, 110); // Clear night visibility across towers & skybridge
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
    const isRasengan = currentWeaponId === 'rasengan' || currentWeaponId === 'toy_hammer';
    const isKamehameha = currentWeaponId === 'kamehameha' || currentWeaponId === 'electric_fan';
    const actionVerb = isGrenade ? 'LEMPAR' : (isMachineGun ? 'TEMBAK' : (isRasengan ? 'RASENGAN' : (isKamehameha ? 'KAMEHAMEHA' : 'PUKUL')));
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
      } else if (isRasengan) {
        UIManager.getInstance().setStatusText(
          `DEKATI ARAH ${monsterName} & HANTAM DENGAN ${weaponName}! PINTU EXIT AKAN MUNCUL SETELAH IMPACT.`,
          `APPROACH ${monsterName} & STRIKE WITH ${weaponName}! THE EXIT DOOR WILL APPEAR AFTER IMPACT.`
        );
      } else if (isKamehameha) {
        UIManager.getInstance().setStatusText(
          `BIDIK ${monsterName} DARI JAUH & TEMBAK DENGAN ${weaponName}! PINTU EXIT AKAN MUNCUL SETELAH IMPACT.`,
          `AIM AT ${monsterName} FROM AFAR & BLAST WITH ${weaponName}! THE EXIT DOOR WILL APPEAR AFTER IMPACT.`
        );
      } else {
        UIManager.getInstance().setStatusText(
          `CARI & PUKUL ${monsterName} DENGAN ${weaponName}! PINTU EXIT AKAN MUNCUL SETELAH DIPUKUL.`,
          `FIND & STRIKE ${monsterName} WITH ${weaponName}! THE EXIT DOOR WILL APPEAR AFTER IMPACT.`
        );
      }
    }
  }

  // Check if player is currently in range and line of sight to use special anime techniques (Rasengan / Kamehameha)
  private isPlayerInSpecialAttackArea(): boolean {
    const currentWeaponId = this.fpController.weapon.getWeaponId();
    const isRasengan = currentWeaponId === 'rasengan' || currentWeaponId === 'toy_hammer';
    const isKamehameha = currentWeaponId === 'kamehameha' || currentWeaponId === 'electric_fan';
    if (!isRasengan && !isKamehameha) return true;

    if (this.state !== 'STEALTH' || this.isAttackSuccessful) return false;

    const playerPos = this.fpController.position;
    for (const m of this.monsters) {
      if (m.state !== 'SITTING_IDLE' || m.isAwake) continue;

      const monsterCenterY = m.monsterType === 'kunti' ? 0.45 : (m.monsterType === 'yeti' ? 1.4 : 0.9);
      const monsterCenter = new THREE.Vector3(m.position.x, m.position.y + monsterCenterY, m.position.z);
      const dist = playerPos.distanceTo(monsterCenter);

      if (isKamehameha) {
        if (dist <= 30.0 && !this.isObstructedByGeometry(playerPos, monsterCenter)) {
          return true;
        }
      } else if (isRasengan) {
        const floorHeight = this.levelBuild?.floorHeight || 3.8;
        const monsterFloor = Math.max(0, Math.round(m.position.y / floorHeight));
        const sameFloor = this.fpController.currentFloor === monsterFloor || Math.abs(playerPos.y - (m.position.y + 1.65)) < 2.5;
        if (dist <= 18.0 && sameFloor && !this.isObstructedByGeometry(playerPos, monsterCenter)) {
          return true;
        }
      }
    }
    return false;
  }

  // Execute Weapon Attack or Throwable Launch on Monster
  private performAttack(): void {
    if (this.state !== 'STEALTH' || this.isAttackSuccessful) return;

    const currentWeaponId = this.fpController.weapon.getWeaponId();
    const isGrenade = currentWeaponId === 'grenade' || currentWeaponId === 'signboard';
    const isMachineGun = currentWeaponId === 'machine_gun' || currentWeaponId === 'slipper';
    const isRasengan = currentWeaponId === 'rasengan' || currentWeaponId === 'toy_hammer';
    const isKamehameha = currentWeaponId === 'kamehameha' || currentWeaponId === 'electric_fan';

    // Special Anime Techniques require being in the ghost area before activation
    if (isRasengan || isKamehameha) {
      if (!this.isPlayerInSpecialAttackArea()) {
        const now = performance.now();
        if (this.lastWeaponNotReadyAlertTime === 0 || now - this.lastWeaponNotReadyAlertTime >= 1200) {
          this.lastWeaponNotReadyAlertTime = now;
          UIManager.getInstance().showTemporaryWarning(
            'SENJATA BELUM BISA DIGUNAKAN!',
            'WEAPON CANNOT BE USED YET!',
            1500
          );
        }
        return;
      }
    }

    // Ranged Anime Rush: Rasengan
    if (isRasengan) {
      const weaponDef = this.fpController.weapon.getWeaponDef();
      this.handleRasenganAttack(weaponDef);
      return;
    }

    // Ranged Anime Beam: Kamehameha
    if (isKamehameha) {
      const weaponDef = this.fpController.weapon.getWeaponDef();
      this.handleKamehamehaBlast(weaponDef);
      return;
    }

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
      if (weaponDef.id === 'rasengan' || weaponDef.id === 'toy_hammer') {
        this.triggerScreenShake(0.65);
        UIManager.getInstance().setStatusText(
          `RASENGAN!!! ${monsterName} TERHANTAM PUSARAN ANGIN CHAKRA! CEPAT LARI KE PINTU EXIT!`,
          `RASENGAN STRIKE! ${monsterName} HIT BY CHAKRA VORTEX! SPRINT TO THE EXIT DOOR!`
        );
      } else if (this.currentLevelDef.theme === 'bunker') {
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

  // Handle Anime Rasengan Rush Dash & White-Blue Explosion Impact (Naruto Slow-Motion Cinematic)
  private handleRasenganAttack(weaponDef: WeaponDefinition): void {
    if (this.state !== 'STEALTH' || this.isAttackSuccessful) return;

    // 1. Find nearest valid target monster within 18.0m in front of player
    const MAX_RASENGAN_RANGE = 18.0;
    const playerPos = this.fpController.position;
    const forward = this.fpController.getForwardVector();
    let targetMonster: MonsterController | null = null;
    let closestDist = Infinity;

    for (const m of this.monsters) {
      if (m.state !== 'SITTING_IDLE' || m.isAwake) continue;

      const monsterCenterY = m.monsterType === 'kunti' ? 0.45 : (m.monsterType === 'yeti' ? 1.4 : 0.9);
      const monsterCenter = new THREE.Vector3(m.position.x, m.position.y + monsterCenterY, m.position.z);
      const dist = playerPos.distanceTo(monsterCenter);
      if (dist > MAX_RASENGAN_RANGE) continue;

      // Line of sight check
      if (this.isObstructedByGeometry(playerPos, monsterCenter)) continue;

      // Check if monster is in front of player (generous FOV <= 85 degrees)
      const toMonster = new THREE.Vector3().subVectors(monsterCenter, playerPos).normalize();
      const dot = forward.dot(toMonster);
      if (dot > 0.15 && dist < closestDist) {
        closestDist = dist;
        targetMonster = m;
      }
    }

    // Play Naruto Rasengan sound asset (naruto-rasengan.mp3) at normal playback speed (sound tetap!)
    AudioManager.getInstance().playRasenganAudio();

    if (!targetMonster) {
      // Swung into air: trigger complete 5-stage animation sequence forward
      this.fpController.weapon.startRasenganSequence(
        () => {
          // Subtle camera reaction on thrust reach
          this.triggerScreenShake(0.18);
        },
        () => {
          // Recovery complete
          const monsterName = this.getLevelMonsterDisplayName();
          UIManager.getInstance().setStatusText(
            `DEKATI ARAH ${monsterName} UNTUK MENYERANG DENGAN RASENGAN!`,
            `AIM TOWARDS ${monsterName} TO STRIKE WITH RASENGAN!`
          );
        }
      );
      UIManager.getInstance().setStatusText('RASEN...!', 'RASEN...!');
      return;
    }

    // Target locked! Begin 5-Stage Coordinated Rasengan Attack Sequence
    this.state = 'ATTACK';
    this.isAttackSuccessful = true;
    this.fpController.setEnabled(false); // Lock movement input during attack sequence

    const monsterCenterY = targetMonster.monsterType === 'kunti' ? 0.45 : (targetMonster.monsterType === 'yeti' ? 1.4 : 0.9);
    const targetMonsterPos = new THREE.Vector3(targetMonster.position.x, targetMonster.position.y + monsterCenterY, targetMonster.position.z);

    // Compute player rush end position:
    // Genderwo (Yeti) is massive with towering height and long reach, so maintain a generous 5.6m safe distance.
    // For Pocong and Kunti, keep 4.4m. Player does not advance closer than this distance.
    const isYeti = targetMonster.monsterType === 'yeti';
    const MIN_SAFE_DIST = isYeti ? 5.6 : 4.4;
    const currentDist = playerPos.distanceTo(targetMonsterPos);
    const dirToPlayer = new THREE.Vector3().subVectors(playerPos, targetMonsterPos).normalize();
    const destPos = currentDist > MIN_SAFE_DIST
      ? new THREE.Vector3().copy(targetMonsterPos).addScaledVector(dirToPlayer, MIN_SAFE_DIST)
      : playerPos.clone();
    destPos.y = targetMonster.position.y + 1.65; // Adjust player eye height to monster floor

    const startPlayerPos = playerPos.clone();
    const defaultFov = 75;
    const targetFov = 64; // Subtle telephoto anime focus

    // Trigger First-Person 5-Stage Rasengan Animation Sequence on WeaponController
    // Stage 1 (Prep: 0.30s) + Stage 2 (Charge: 0.55s) + Stage 3 (Hold: 0.25s) + Stage 4 (Thrust: 0.20s) = 1.30s to Impact!
    const approachDuration = 1.30;
    const startTime = performance.now();

    UIManager.getInstance().setStatusText('RASEN...!', 'RASEN...!');
    setTimeout(() => {
      UIManager.getInstance().setStatusText('RASENGAAAN...!', 'RASENGAAAN...!');
    }, 850);

    // Synchronize character forward approach with the weapon animation
    const approachInterval = setInterval(() => {
      const elapsed = (performance.now() - startTime) / 1000;
      const t = Math.min(1.0, elapsed / approachDuration);

      // Smooth deceleration into striking range
      const ease = 1 - Math.pow(1 - t, 2.5);
      this.fpController.position.lerpVectors(startPlayerPos, destPos, ease);

      // Smooth camera FOV focus
      this.fpController.camera.fov = THREE.MathUtils.lerp(defaultFov, targetFov, ease);
      this.fpController.camera.updateProjectionMatrix();

      if (t >= 1.0) {
        clearInterval(approachInterval);
        this.fpController.position.copy(destPos);
      }
    }, 16);

    let retreatInterval: any = null;
    let retreatTargetPos = destPos.clone();

    // Start 5-Stage Rasengan Weapon Animation with Impact and Recovery Callbacks
    this.fpController.weapon.startRasenganSequence(
      () => {
        // --- STAGE 5: IMPACT EVENT (Exact moment thrust reaches target at 1.30s) ---
        clearInterval(approachInterval);
        this.fpController.position.copy(destPos);

        // 1. Create White-Blue Chakra Detonation Explosion Effect at Monster
        this.createRasenganWhiteBlueExplosion(targetMonsterPos);

        // 2. Small controlled camera reaction during impact (Section 7)
        this.triggerScreenShake(0.65);

        // 3. Reveal and illuminate Exit Door
        if (this.levelBuild?.exitDoorMesh) {
          this.levelBuild.exitDoorMesh.visible = true;
          const doorLight = this.levelBuild.exitDoorMesh.children.find((c) => c instanceof THREE.PointLight) as THREE.PointLight;
          if (doorLight) {
            doorLight.color.setHex(0x22c55e);
            doorLight.intensity = 3.8;
          }
        }

        // 4. Monster hit reaction: knockback (6.5m for Genderwo, 5.8m for others), scream, and generous stun delay
        const knockbackDist = isYeti ? 6.5 : 5.8;
        targetMonster.triggerWeaponHit(weaponDef, this.fpController.position, knockbackDist, false, 2.8, 5.5);

        // 5. Automatic Player Recoil / Retreat Step (Mundur ke belakang setelah menyerang agar mudah lari)
        const retreatDist = isYeti ? 4.5 : 3.8;
        const retreatStartPos = destPos.clone();
        retreatTargetPos = retreatStartPos.clone();
        const steps = 15;
        for (let s = 1; s <= steps; s++) {
          const candidate = retreatStartPos.clone().addScaledVector(dirToPlayer, (retreatDist * s) / steps);
          if (!this.fpController.collidesWithWalls(candidate.x, candidate.z)) {
            retreatTargetPos.copy(candidate);
          } else {
            break; // Stop at safe boundary before wall
          }
        }

        // Smoothly animate player retreating / leaping backward over 0.50s (during Stage 5 -> Stage 6 recovery)
        const retreatDuration = 0.50;
        const retreatStartTime = performance.now();
        retreatInterval = setInterval(() => {
          const elapsed = (performance.now() - retreatStartTime) / 1000;
          const p = Math.min(1.0, elapsed / retreatDuration);
          const easeOut = 1 - Math.pow(1 - p, 2.0); // Smooth physical recoil deceleration
          this.fpController.position.lerpVectors(retreatStartPos, retreatTargetPos, easeOut);
          if (p >= 1.0) {
            clearInterval(retreatInterval);
            this.fpController.position.copy(retreatTargetPos);
          }
        }, 16);

        // Delayed awakening for secondary monsters (gives player a clear 2.2s window to escape without being ambushed)
        setTimeout(() => {
          for (const m of this.monsters) {
            if (m !== targetMonster && m.state === 'SITTING_IDLE') {
              m.wakeUpAndChase();
            }
          }
        }, 2200);

        const monsterName = targetMonster.monsterType === 'kunti' ? 'KUNTILANAK' : (targetMonster.monsterType === 'yeti' ? 'GENDERWO' : 'POCONG');
        UIManager.getInstance().setStatusText(
          `RASENGAN MENGHANCURKAN ${monsterName}! CEPAT LARI KE PINTU EXIT!`,
          `RASENGAN BLASTED ${monsterName}! SPRINT TO THE EXIT DOOR!`
        );
      },
      () => {
        // --- STAGE 6: RECOVERY COMPLETE (Arm smoothly returned to idle at 1.80s, player retreat finished) ---
        if (retreatInterval) {
          clearInterval(retreatInterval);
        }
        this.fpController.position.copy(retreatTargetPos);

        // Smooth camera FOV restoration
        const fovStart = this.fpController.camera.fov;
        const fovStartTime = performance.now();
        const fovDuration = 250;
        const fovInterval = setInterval(() => {
          const fovElapsed = performance.now() - fovStartTime;
          const fovP = Math.min(1.0, fovElapsed / fovDuration);
          this.fpController.camera.fov = THREE.MathUtils.lerp(fovStart, defaultFov, fovP);
          this.fpController.camera.updateProjectionMatrix();
          if (fovP >= 1.0) clearInterval(fovInterval);
        }, 16);

        this.fpController.setMonsterObstacle(null);
        this.fpController.setEnabled(true);
        UIManager.getInstance().switchToChaseControls();
        this.fpController.weapon.disableAttackPermanently();
        this.fpController.weapon.setVisible(false);
      }
    );
  }

  // Create White-Blue Chakra Detonation Explosion Effect at Monster
  private createRasenganWhiteBlueExplosion(pos: THREE.Vector3): void {
    const explosionGroup = new THREE.Group();
    explosionGroup.position.copy(pos);

    // 1. Inner White Blazing Core Sphere
    const coreGeo = new THREE.SphereGeometry(0.7, 16, 16);
    const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    explosionGroup.add(coreMesh);

    // 2. Outer Electric Cyan Shockwave Sphere
    const cyanGeo = new THREE.SphereGeometry(1.15, 16, 16);
    const cyanMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });
    const cyanMesh = new THREE.Mesh(cyanGeo, cyanMat);
    explosionGroup.add(cyanMesh);

    // 3. Horizontal White-Blue Shockwave Rings
    const ringGeo = new THREE.RingGeometry(0.35, 1.6, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x67e8f9,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const ringMesh1 = new THREE.Mesh(ringGeo, ringMat);
    explosionGroup.add(ringMesh1);

    const ringMesh2 = new THREE.Mesh(ringGeo, ringMat.clone());
    ringMesh2.rotation.z = Math.PI / 3;
    explosionGroup.add(ringMesh2);

    // 4. Point light flash
    const flashLight = new THREE.PointLight(0x67e8f9, 12.0, 24.0, 1.2);
    explosionGroup.add(flashLight);

    this.scene.add(explosionGroup);

    // Animate expanding and fading out over 0.65s
    const startTime = performance.now();
    const duration = 650;
    const animInterval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1.0, elapsed / duration);

      const scale = 1.0 + progress * 2.8;
      coreMesh.scale.set(scale * 0.7, scale * 0.7, scale * 0.7);
      cyanMesh.scale.set(scale, scale, scale);
      ringMesh1.scale.set(scale * 1.4, scale * 1.4, scale * 1.4);
      ringMesh2.scale.set(scale * 1.25, scale * 1.25, scale * 1.25);

      const fade = 1.0 - progress;
      coreMat.opacity = fade;
      cyanMat.opacity = fade * 0.9;
      (ringMesh1.material as THREE.MeshBasicMaterial).opacity = fade * 0.92;
      (ringMesh2.material as THREE.MeshBasicMaterial).opacity = fade * 0.8;
      flashLight.intensity = fade * 12.0;

      if (progress >= 1.0) {
        clearInterval(animInterval);
        this.scene.remove(explosionGroup);
        this.disposeHierarchy(explosionGroup);
      }
    }, 20);
  }

  // Cleanup active Kamehameha beam and timers to guarantee no hangs, memory leaks, or stale callbacks
  private cancelKamehamehaSequence(): void {
    if (this.kamehamehaChargeInterval) {
      clearInterval(this.kamehamehaChargeInterval);
      this.kamehamehaChargeInterval = null;
    }
    if (this.kamehamehaTimeout) {
      clearTimeout(this.kamehamehaTimeout);
      this.kamehamehaTimeout = null;
    }
    if (this.kamehamehaFadeInterval) {
      clearInterval(this.kamehamehaFadeInterval);
      this.kamehamehaFadeInterval = null;
    }
    if (this.activeKamehamehaBeam) {
      this.scene.remove(this.activeKamehamehaBeam);
      this.disposeHierarchy(this.activeKamehamehaBeam);
      this.activeKamehamehaBeam = null;
    }
    this.isKamehamehaCharging = false;
    AudioManager.getInstance().stopKamehamehaAudio();
    AudioManager.getInstance().stopRasenganAudio();
  }

  // Handle Ranged Anime Ki Beam (Kamehameha with charging sound delay & long energy laser beam toward monster)
  private handleKamehamehaBlast(weaponDef: WeaponDefinition): void {
    if (this.state !== 'STEALTH' || this.isAttackSuccessful || this.isKamehamehaCharging) return;

    this.isKamehamehaCharging = true;
    this.fpController.setEnabled(false); // Martial arts stance during chant
    this.fpController.weapon.startKamehamehaCharge();

    // Start playing Dragon Ball kamehameha.mp3 ("Ka... me... ha... me... HA!")
    AudioManager.getInstance().playKamehamehaAudio();

    // Dynamic Ki Gathering loop over 4.85 seconds (Ki sphere charges in hands model)
    const chargeStartTime = performance.now();
    const chargeDuration = 4850;
    this.kamehamehaChargeInterval = setInterval(() => {
      const elapsed = performance.now() - chargeStartTime;
      const progress = Math.min(1.0, elapsed / chargeDuration);

      this.fpController.weapon.updateKamehamehaCharge(progress);

      // Subtle staged tremors (screen stays clear)
      if (elapsed < 1400) {
        this.triggerScreenShake(0.04);
      } else if (elapsed < 2800) {
        this.triggerScreenShake(0.08);
      } else if (elapsed < 3900) {
        this.triggerScreenShake(0.15);
      } else {
        this.triggerScreenShake(0.25);
      }
    }, 25);

    // Staged HUD status chants
    UIManager.getInstance().setStatusText('KA... (MENGUMPULKAN KI)', 'KA... (GATHERING KI)');
    setTimeout(() => {
      if (this.isKamehamehaCharging) UIManager.getInstance().setStatusText('KA... ME...', 'KA... ME...');
    }, 1450);

    setTimeout(() => {
      if (this.isKamehamehaCharging) UIManager.getInstance().setStatusText('KA... ME... HA...', 'KA... ME... HA...');
    }, 2850);

    setTimeout(() => {
      if (this.isKamehamehaCharging) UIManager.getInstance().setStatusText('KA... ME... HA... ME...', 'KA... ME... HA... ME...');
    }, 3950);

    // 2. AT DELAY (4.85s): Voice shouts "...HAAAAAAA!!!!!" -> LONG LASER BEAM ERUPTS TOWARD MONSTER!
    this.kamehamehaTimeout = setTimeout(() => {
      if (!this.isKamehamehaCharging || (this.state !== 'STEALTH' && this.state !== 'ATTACK')) return;

      if (this.kamehamehaChargeInterval) {
        clearInterval(this.kamehamehaChargeInterval);
        this.kamehamehaChargeInterval = null;
      }

      this.fpController.weapon.fireKamehamehaPose();
      UIManager.getInstance().setStatusText('...HAAAAAAA!!!!!', '...HAAAAAAA!!!!!');

      // 3. TARGETING & DIRECTION CALCULATION
      const camPos = this.fpController.position.clone();
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(0, 0), this.fpController.camera);
      const camDir = raycaster.ray.direction.clone().normalize();
      const MAX_BEAM_RANGE = 38.0;

      // Check blocking environment geometry along aim line
      const blocking = this.levelBuild ? this.levelBuild.blockingMeshes : [];
      const wallIntersects = raycaster.intersectObjects(blocking, true);
      const validWallIntersects = wallIntersects.filter((h) => h.distance > 2.0);
      const maxRayDist = validWallIntersects.length > 0 ? Math.min(MAX_BEAM_RANGE, validWallIntersects[0].distance) : MAX_BEAM_RANGE;

      // Find valid target monster in line of sight within range
      let hitMonster: MonsterController | null = null;
      let closestDist = maxRayDist;
      let targetImpactPos = new THREE.Vector3();

      for (const m of this.monsters) {
        if (m.state !== 'SITTING_IDLE' || m.isAwake) continue;

        const monsterCenterY = m.monsterType === 'kunti' ? 0.45 : (m.monsterType === 'yeti' ? 1.4 : 0.9);
        const monsterCenter = new THREE.Vector3(m.position.x, m.position.y + monsterCenterY, m.position.z);
        const distFromPlayer = camPos.distanceTo(monsterCenter);
        if (distFromPlayer > MAX_BEAM_RANGE) continue;

        // Verify line of sight in 3D (no solid walls or floors in between)
        if (this.isObstructedByGeometry(camPos, monsterCenter)) continue;

        // Check if monster intersects ray or is within forgiving beam cylinder (2.6m radius)
        let isHit = false;
        let hitDist = distFromPlayer;

        const monsterHits = raycaster.intersectObjects(m.group.children, true);
        if (monsterHits.length > 0 && monsterHits[0].distance <= maxRayDist) {
          isHit = true;
          hitDist = monsterHits[0].distance;
        } else {
          const toMonster = new THREE.Vector3().subVectors(monsterCenter, raycaster.ray.origin);
          const distAlongRay = toMonster.dot(camDir);
          if (distAlongRay > 0 && distAlongRay <= maxRayDist) {
            const pointOnRay = new THREE.Vector3().copy(raycaster.ray.origin).addScaledVector(camDir, distAlongRay);
            if (pointOnRay.distanceTo(monsterCenter) <= 2.6) {
              isHit = true;
              hitDist = distAlongRay;
            }
          }
        }

        if (isHit && hitDist <= closestDist) {
          closestDist = hitDist;
          hitMonster = m;
          targetImpactPos.copy(monsterCenter);
        }
      }

      // If no monster hit, beam reaches wall contact or max range
      if (!hitMonster) {
        if (validWallIntersects.length > 0) {
          targetImpactPos.copy(validWallIntersects[0].point);
        } else {
          targetImpactPos.copy(camPos).addScaledVector(camDir, maxRayDist);
        }
      }

      // 4. BEAM ORIGIN & ALIGNMENT
      // Start in front of the hands, oriented directly toward the monster target
      const beamOrigin = new THREE.Vector3();
      const hasSpherePos = this.fpController.weapon.getKamehamehaSphereWorldPosition(beamOrigin);
      if (!hasSpherePos) {
        const handOffset = new THREE.Vector3(0.0, -0.22, -0.52).applyQuaternion(this.fpController.camera.quaternion);
        beamOrigin.copy(this.fpController.camera.position).add(handOffset);
      }
      const toTarget = new THREE.Vector3().subVectors(targetImpactPos, beamOrigin);
      const beamDir = toTarget.clone().normalize();
      // Push start point 0.35m forward along the laser path so it never encloses the camera lens
      beamOrigin.addScaledVector(beamDir, 0.35);

      const adjustedVector = new THREE.Vector3().subVectors(targetImpactPos, beamOrigin);
      const beamLen = Math.max(0.4, adjustedVector.length());

      const beamQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), beamDir);

      const beamGroup = new THREE.Group();
      beamGroup.position.copy(beamOrigin);
      beamGroup.quaternion.copy(beamQuat);

      // Sub-Group for the stretching laser body (stretches along Y from 0 to beamLen)
      const beamBodyGroup = new THREE.Group();

      // Layer A: Inner Laser Core (Concentrated bright white spine, radius 0.05m -> 0.07m)
      const coreGeo = new THREE.CylinderGeometry(0.05, 0.07, beamLen, 16);
      coreGeo.translate(0, beamLen / 2, 0); // Base at Y=0, tip at Y=beamLen
      const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      beamBodyGroup.add(coreMesh);

      // Layer B: Main Electric Cyan Energy Beam (Radius 0.14m -> 0.20m, clear and visible across room)
      const cyanGeo = new THREE.CylinderGeometry(0.14, 0.20, beamLen, 18);
      cyanGeo.translate(0, beamLen / 2, 0);
      const cyanMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.88,
        blending: THREE.AdditiveBlending,
      });
      const cyanMesh = new THREE.Mesh(cyanGeo, cyanMat);
      beamBodyGroup.add(cyanMesh);

      // Layer C: Outer Soft Electric Blue Aura Shell (Radius 0.22m -> 0.32m)
      const auraGeo = new THREE.CylinderGeometry(0.22, 0.32, beamLen, 18);
      auraGeo.translate(0, beamLen / 2, 0);
      const auraMat = new THREE.MeshBasicMaterial({
        color: 0x60a5fa,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const auraMesh = new THREE.Mesh(auraGeo, auraMat);
      beamBodyGroup.add(auraMesh);

      // Initially starts extending from hands (scale Y starts near 0)
      beamBodyGroup.scale.set(1.0, 0.02, 1.0);
      beamGroup.add(beamBodyGroup);

      // Layer D: Blazing Ki Surge Head (Sphere leading the laser surge toward the target)
      const headGeo = new THREE.SphereGeometry(0.18, 14, 14);
      const headMat = new THREE.MeshBasicMaterial({
        color: 0xe0f2fe,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
      });
      const beamHead = new THREE.Mesh(headGeo, headMat);
      beamHead.position.set(0, beamLen * 0.02, 0);
      beamGroup.add(beamHead);

      // Layer E: Energy Helix Rings spinning along active beam axis
      const ringMeshes: THREE.Mesh[] = [];
      const numRings = Math.min(8, Math.max(4, Math.floor(beamLen / 3.0)));
      for (let r = 0; r < numRings; r++) {
        const ringGeo = new THREE.TorusGeometry(0.26 + (r / numRings) * 0.10, 0.03, 8, 20);
        ringGeo.rotateX(Math.PI / 2); // Align ring with cylinder Y-axis
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0x93c5fd,
          transparent: true,
          opacity: 0.85,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.set(0, (beamLen * 0.02 * (r + 0.5)) / numRings, 0);
        beamGroup.add(ring);
        ringMeshes.push(ring);
      }

      // Layer F: Controlled Atmospheric Illumination (Point light along active laser path)
      const beamLight = new THREE.PointLight(0x60a5fa, 4.0, 30.0, 1.2);
      beamLight.position.set(0, 0.5, 0);
      beamGroup.add(beamLight);

      this.scene.add(beamGroup);
      this.activeKamehamehaBeam = beamGroup;

      // 5. DYNAMIC EXTENDING & SUSTAINED BEAM LIFECYCLE
      // Stage 1: Laser surge extends from hands across room to monster (0.0s to 0.22s)
      // Stage 2: Laser slams into monster -> Impact explosion & reaction! (at 0.22s)
      // Stage 3: Sustained laser blast pours into monster (0.22s to 0.70s)
      // Stage 4: Smooth fade out and recovery (0.70s to 1.00s)
      const extendDuration = 0.22; // 220ms clearly visible anime laser surge
      const totalBeamDuration = 1.00;
      let impactTriggered = false;

      // Initial subtle hand recoil
      this.triggerScreenShake(0.35);

      const fadeStartTime = performance.now();
      this.kamehamehaFadeInterval = setInterval(() => {
        const elapsed = (performance.now() - fadeStartTime) / 1000;

        // Phase 1: Rapid anime extension surge
        if (elapsed < extendDuration) {
          const rawP = Math.min(1.0, elapsed / extendDuration);
          const easeOut = 1 - Math.pow(1 - rawP, 2.2); // Energetic surge
          const currentLen = beamLen * Math.max(0.04, easeOut);

          beamBodyGroup.scale.set(1.0, easeOut, 1.0);
          beamHead.position.set(0, currentLen, 0);
          beamLight.position.set(0, currentLen * 0.5, 0);

          for (let i = 0; i < ringMeshes.length; i++) {
            ringMeshes[i].position.set(0, (currentLen * (i + 0.5)) / numRings, 0);
            ringMeshes[i].rotation.y += 0.28 * (i % 2 === 0 ? 1 : -1);
          }
        } else if (!impactTriggered) {
          // Phase 2: EXACT MOMENT LASER REACHES MONSTER!
          impactTriggered = true;
          beamBodyGroup.scale.set(1.0, 1.0, 1.0);
          beamHead.position.set(0, beamLen, 0);
          beamLight.position.set(0, beamLen * 0.5, 0);

          // Impact detonation on target
          this.createRasenganWhiteBlueExplosion(targetImpactPos);
          this.triggerScreenShake(0.65); // Impact blast impulse

          if (hitMonster) {
            this.state = 'CHASE';
            this.isAttackSuccessful = true;
            this.isKamehamehaCharging = false;

            // Reveal exit door and illuminate with green glow
            if (this.levelBuild?.exitDoorMesh) {
              this.levelBuild.exitDoorMesh.visible = true;
              const doorPointLight = this.levelBuild.exitDoorMesh.children.find((c) => c instanceof THREE.PointLight) as THREE.PointLight;
              if (doorPointLight) {
                doorPointLight.color.setHex(0x22c55e);
                doorPointLight.intensity = 3.8;
              }
            }

            this.fpController.setMonsterObstacle(null);
            this.fpController.setEnabled(true);
            UIManager.getInstance().switchToChaseControls();

            // Monster blasted with knockback, generous stun delay & catch grace period
            const isYeti = hitMonster.monsterType === 'yeti';
            const knockbackDist = isYeti ? 6.5 : 5.5;
            hitMonster.triggerWeaponHit(weaponDef, this.fpController.position, knockbackDist, false, 2.8, 5.5);

            // Delayed awakening for secondary monsters (gives player clear 2.2s window without ambush)
            setTimeout(() => {
              for (const m of this.monsters) {
                if (m !== hitMonster && m.state === 'SITTING_IDLE') {
                  m.wakeUpAndChase();
                }
              }
            }, 2200);

            const monsterName = hitMonster.monsterType === 'kunti' ? 'KUNTILANAK' : (hitMonster.monsterType === 'yeti' ? 'GENDERWO' : 'POCONG');
            UIManager.getInstance().setStatusText(
              `KAMEHAMEHA MENGHANCURKAN ${monsterName}! CEPAT LARI KE PINTU EXIT!`,
              `KAMEHAMEHA BLASTED ${monsterName}! SPRINT TO THE EXIT DOOR!`
            );
          } else {
            // Miss: hit wall or distance
            this.state = 'STEALTH';
            this.isAttackSuccessful = false;
            this.isKamehamehaCharging = false;
            this.fpController.setEnabled(true);

            const monsterName = this.getLevelMonsterDisplayName();
            UIManager.getInstance().setStatusText(
              `TEMBAKAN KAMEHAMEHA MELESET! BIDIK KE ARAH ${monsterName} DAN TEMBAK LAGI!`,
              `KAMEHAMEHA MISSED! AIM TOWARDS ${monsterName} AND FIRE AGAIN!`
            );
          }
        } else {
          // Phase 3: Sustained full-length laser drilling into target
          beamBodyGroup.scale.set(1.0, 1.0, 1.0);
          beamHead.position.set(0, beamLen, 0);
          beamLight.position.set(0, beamLen * 0.5, 0);

          for (let i = 0; i < ringMeshes.length; i++) {
            ringMeshes[i].position.set(0, (beamLen * (i + 0.5)) / numRings, 0);
            ringMeshes[i].rotation.y += 0.28 * (i % 2 === 0 ? 1 : -1);
          }

          const pulse = 1.0 + Math.sin(elapsed * 25.0) * 0.06;
          cyanMesh.scale.set(pulse, 1.0, pulse);
          auraMesh.scale.set(pulse * 1.04, 1.0, pulse * 1.04);

          // Phase 4: Fade out in last 30% of total duration
          if (elapsed > totalBeamDuration - 0.30) {
            const fadeP = (totalBeamDuration - elapsed) / 0.30;
            cyanMat.opacity = Math.max(0, fadeP * 0.88);
            auraMat.opacity = Math.max(0, fadeP * 0.45);
            coreMat.opacity = Math.max(0, fadeP);
            headMat.opacity = Math.max(0, fadeP * 0.95);
            beamLight.intensity = Math.max(0, fadeP * 4.0);
          }
        }

        // Complete & Cleanup
        if (elapsed >= totalBeamDuration) {
          if (this.kamehamehaFadeInterval) {
            clearInterval(this.kamehamehaFadeInterval);
            this.kamehamehaFadeInterval = null;
          }
          if (this.activeKamehamehaBeam) {
            this.scene.remove(this.activeKamehamehaBeam);
            this.disposeHierarchy(this.activeKamehamehaBeam);
            this.activeKamehamehaBeam = null;
          }

          // Recovery: smoothly reset weapon viewmodel back to idle (hands return to normal)
          this.fpController.weapon.resetKamehameha();
          this.fpController.setEnabled(true);

          if (this.isAttackSuccessful) {
            this.fpController.weapon.disableAttackPermanently();
            this.fpController.weapon.setVisible(false);
          }
        }
      }, 20);
    }, 4850);
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
    this.cancelKamehamehaSequence();

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
    this.cancelKamehamehaSequence();
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
    this.cancelKamehamehaSequence();
    this.state = 'LEVEL_COMPLETE';
    this.isTimerRunning = false;
    this.fpController.setEnabled(false);
    AudioManager.getInstance().stopKuntiChaseAudio();
    InputManager.getInstance().exitPointerLock();

    AudioManager.getInstance().playLevelComplete();

    // Record progress
    SaveManager.getInstance().recordCompletion(this.currentLevelDef.id, this.gameplayTimer);

    const maxPlayableLevel = SaveManager.getInstance().isDevModeEnabled() ? ALL_LEVELS.length : 6;
    const hasNext = this.currentLevelDef.id + 1 <= maxPlayableLevel && SaveManager.getInstance().isLevelUnlocked(this.currentLevelDef.id + 1);
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
        const isRasengan = currentWeaponId === 'rasengan' || currentWeaponId === 'toy_hammer';
        const isKamehameha = currentWeaponId === 'kamehameha' || currentWeaponId === 'electric_fan';
        const isSpecialTechnique = isRasengan || isKamehameha;
        const actionVerb = isGrenade ? 'LEMPAR' : (isMachineGun ? 'TEMBAK' : (isRasengan ? 'RASENGAN' : (isKamehameha ? 'KAMEHAMEHA' : 'PUKUL')));
        const targetMonster = nearestAttackableMonster || nearestMonster;
        const targetMonsterName = targetMonster?.monsterType === 'kunti' ? 'Kuntilanak' : (targetMonster?.monsterType === 'yeti' ? 'Genderwo' : 'Pocong');

        if (isSpecialTechnique) {
          const inSpecialArea = this.isPlayerInSpecialAttackArea();
          canAttackAny = inSpecialArea;
          if (inSpecialArea) {
            this.fpController.weapon.setVisible(true);
            // Hilangkan alert banner di screen ketika mendekati hantu di semua level (sesuai instruksi user)
            UIManager.getInstance().setAttackPromptVisible(false);
            UIManager.getInstance().setMobileAttackReady(true);
          } else {
            this.fpController.weapon.setVisible(false);
            UIManager.getInstance().setAttackPromptVisible(false);
            UIManager.getInstance().setMobileAttackReady(false);
          }
        } else if (isGrenade || isMachineGun) {
          const target = nearestAttackableMonster || nearestMonster;
          const alertDist = isMachineGun ? 25.0 : 18.0;
          const floorHeight = this.levelBuild?.floorHeight || 3.8;
          const monsterFloor = target ? Math.max(0, Math.round(target.position.y / floorHeight)) : 0;
          const sameFloor = target
            ? (this.fpController.currentFloor === monsterFloor || Math.abs(this.fpController.position.y - target.position.y) < 2.5)
            : false;
          canAttackAny = nearestDist <= alertDist && sameFloor;
          this.fpController.weapon.setVisible(true);
          // Hapus alert di screen ketika player mendekati hantu di semua level
          UIManager.getInstance().setAttackPromptVisible(false);
          UIManager.getInstance().setMobileAttackReady(canAttackAny);
        } else {
          this.fpController.weapon.setVisible(true);
          // Hapus alert di screen ketika player mendekati hantu di semua level
          UIManager.getInstance().setAttackPromptVisible(false);
          UIManager.getInstance().setMobileAttackReady(canAttackAny);
        }

        UIManager.getInstance().setDetectionMeter(0);

        if (inputMgr.consumeAttackRequest()) {
          this.performAttack();
        }

        // Check weapon pickup discovery in level environment
        this.updateWeaponPickups();
      } else {
        const currentWeaponId = this.fpController.weapon.getWeaponId();
        const isSpecialTechnique = currentWeaponId === 'rasengan' || currentWeaponId === 'toy_hammer' || currentWeaponId === 'kamehameha' || currentWeaponId === 'electric_fan';
        if (isSpecialTechnique && this.isAttackSuccessful) {
          this.fpController.weapon.setVisible(false);
        }
        UIManager.getInstance().setAttackPromptVisible(false);
        UIManager.getInstance().setDetectionMeter(0);
        UIManager.getInstance().hidePickupPrompt();
      }

      // 4. Escape Door Trigger Check & Catch Check (during CHASE / ATTACK phase or after attack)
      if (this.isAttackSuccessful || this.state === 'CHASE' || this.state === 'ATTACK') {
        for (const m of this.monsters) {
          const horizontalDist = Math.hypot(
            m.position.x - this.fpController.position.x,
            m.position.z - this.fpController.position.z
          );
          const verticalDiff = Math.abs(m.position.y - (this.fpController.position.y - 1.65));
          const grace = m.catchGracePeriod ?? MonsterController.CATCH_GRACE_PERIOD;
          if (m.stateTime > grace && horizontalDist <= 1.5 && verticalDiff <= 1.5) {
            const mName = m.monsterType === 'kunti' ? 'Kuntilanak' : (m.monsterType === 'yeti' ? 'Genderwo' : 'Pocong');
            this.handlePlayerCaught(m, `${mName} berhasil menangkapmu!`);
            return;
          }
        }

        const doorMesh = this.levelBuild?.exitDoorMesh;
        const doorPos = doorMesh ? doorMesh.position : null;
        const hDistToDoor = doorPos ? Math.hypot(this.fpController.position.x - doorPos.x, this.fpController.position.z - doorPos.z) : 999;
        const playerFeetY = this.fpController.position.y - 1.65;
        const vDistToDoor = doorPos ? Math.abs(playerFeetY - doorPos.y) : 999;
        const isNearExitDoor = (this.levelBuild?.exitTriggerBox && this.levelBuild.exitTriggerBox.containsPoint(this.fpController.position)) ||
                               (hDistToDoor <= 3.8 && vDistToDoor <= 2.8);

        if (this.isAttackSuccessful && isNearExitDoor) {
          if (doorMesh) doorMesh.visible = true;
          if (this.currentLevelDef.exitLockedInitially && !this.isExitUnlocked) {
            UIManager.getInstance().setStatusText(
              'PINTU EXIT MASIH TERKUNCI! AKTIFKAN SEMUA TERMINAL!',
              'EXIT DOOR IS LOCKED! ACTIVATE ALL TERMINALS!'
            );
          } else {
            this.triggerLevelComplete();
          }
        } else if (!this.isAttackSuccessful && isNearExitDoor) {
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

    // 6. Construction Site Moving Tower Crane Animation (Rotating Jib & Gently Swinging Hook)
    if (this.levelBuild?.movingCrane) {
      const craneTime = this.totalTime;
      this.levelBuild.movingCrane.jib.rotation.y = Math.sin(craneTime * 0.35) * 0.75;
      this.levelBuild.movingCrane.hook.rotation.z = Math.sin(craneTime * 1.4) * 0.09;
      this.levelBuild.movingCrane.hook.rotation.x = Math.cos(craneTime * 1.1) * 0.05;
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
    const isRasengan = pickup.weaponId === 'rasengan' || pickup.weaponId === 'toy_hammer';
    const isKamehameha = pickup.weaponId === 'kamehameha' || pickup.weaponId === 'electric_fan';
    const isSpecialTechnique = isRasengan || isKamehameha;
    if (isSpecialTechnique) {
      this.fpController.weapon.setVisible(this.isPlayerInSpecialAttackArea());
    } else {
      this.fpController.weapon.setVisible(true);
    }
    const actionVerb = isGrenade ? 'LEMPAR' : (isMachineGun ? 'TEMBAK' : (isRasengan ? 'RASENGAN' : (isKamehameha ? 'KAMEHAMEHA' : 'PUKUL')));
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
