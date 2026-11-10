import * as THREE from 'three';
import { ALL_LEVELS, LevelDefinition } from '../level/LevelData.ts';
import { LabyrinthBuilder, LevelBuildResult } from '../level/LabyrinthBuilder.ts';
import { GridPathfinding } from '../pathfinding/GridPathfinding.ts';
import { LevelOverviewCamera } from '../camera/LevelOverviewCamera.ts';
import { FirstPersonController } from '../player/FirstPersonController.ts';
import { MonsterController } from '../monster/MonsterController.ts';
import { AudioManager } from './AudioManager.ts';
import { InputManager } from './InputManager.ts';
import { SaveManager } from './SaveManager.ts';
import { SettingsManager } from './SettingsManager.ts';
import { UIManager } from '../ui/UIManager.ts';

export type GameState =
  | 'MAIN_MENU'
  | 'LEVEL_SELECT'
  | 'LEVEL_OVERVIEW'
  | 'STEALTH'
  | 'ATTACK'
  | 'CHASE'
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
  private monster: MonsterController;

  // Game State
  public state: GameState = 'MAIN_MENU';
  private previousState: GameState = 'MAIN_MENU';
  private gameplayTimer: number = 0;
  private isTimerRunning: boolean = false;
  private isAttackSuccessful: boolean = false;

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
    this.scene.background = new THREE.Color(0x181e26);
    // Atmospheric PS1 Fog (soft depth without obscuring the labyrinth)
    this.scene.fog = new THREE.Fog(0x181e26, 12, 60);

    this.currentLevelDef = ALL_LEVELS[0];

    // Initialize Cameras & Controllers
    this.overviewCam = new LevelOverviewCamera(this.canvas);
    this.fpController = new FirstPersonController();
    this.scene.add(this.fpController.camera);

    this.monster = new MonsterController();
    this.scene.add(this.monster.group);

    this.activeCamera = this.overviewCam.camera;

    // Apply Graphics Resolution
    this.applyGraphicsQuality(SettingsManager.getInstance().settings.graphicsQuality);

    // Setup Window Resize
    window.addEventListener('resize', () => this.onWindowResize());

    // Setup UI Callbacks
    this.setupUICallbacks();

    // Setup Monster Callbacks
    this.setupMonsterCallbacks();

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
    // Show Main Menu by default
    this.state = 'MAIN_MENU';
    UIManager.getInstance().showMainMenu();

    // Start in Overview level 1 preview in background
    this.loadLevel(1, false);

    // Canvas click requests pointer lock when playing
    this.canvas.addEventListener('click', () => {
      AudioManager.getInstance().resume();
      if (this.state === 'STEALTH' || this.state === 'CHASE') {
        InputManager.getInstance().requestPointerLock(this.canvas);
      }
    });
  }

  private applyGraphicsQuality(quality: 'low' | 'med' | 'high'): void {
    const dpr = window.devicePixelRatio || 1;
    let pixelScale = 1.0;

    if (quality === 'low') {
      pixelScale = 0.45; // Authentic PS1 240p downsample
    } else if (quality === 'med') {
      pixelScale = 0.75; // PS1 480p
    } else {
      pixelScale = Math.min(dpr, 1.5); // High
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
  }

  private setupMonsterCallbacks(): void {
    const ui = UIManager.getInstance();

    this.monster.onPlayerDetected = () => {
      if (this.state === 'STEALTH') {
        this.triggerGameOver('The monster detected your presence.');
      }
    };

    this.monster.onPlayerCaught = () => {
      if (this.state === 'CHASE' || this.state === 'DETECT_PLAYER') {
        this.triggerGameOver('The monster caught you.');
      }
    };

    this.monster.onChaseStarted = () => {
      this.state = 'CHASE';
      ui.setStatusText('CHASE: RUN TO THE EXIT DOOR!');
    };
  }

  // Load a Level Definition and construct 3D Environment
  public loadLevel(levelId: number, enterOverview: boolean = true): void {
    const levelIndex = ALL_LEVELS.findIndex((l) => l.id === levelId);
    this.currentLevelIndex = levelIndex >= 0 ? levelIndex : 0;
    this.currentLevelDef = ALL_LEVELS[this.currentLevelIndex];

    // Remove existing level meshes
    if (this.levelBuild) {
      this.scene.remove(this.levelBuild.rootGroup);
    }

    // Build Labyrinth
    this.levelBuild = LabyrinthBuilder.buildLevel(this.currentLevelDef);
    this.scene.add(this.levelBuild.rootGroup);

    // Setup Pathfinding
    this.pathfinding = new GridPathfinding(
      this.currentLevelDef.grid,
      this.currentLevelDef.cellSize
    );

    // Setup Player
    this.fpController.setLevel(
      this.currentLevelDef,
      this.pathfinding,
      this.levelBuild.playerWorldSpawn
    );
    this.fpController.setEnabled(false);

    // Setup Monster
    this.monster.setLevel(
      this.currentLevelDef,
      this.pathfinding,
      this.levelBuild.monsterWorldSpawn
    );

    // Setup Overview Camera
    this.overviewCam.setLevel(this.currentLevelDef);
    this.activeCamera = this.overviewCam.camera;

    // Reset gameplay vars
    this.gameplayTimer = 0;
    this.isTimerRunning = false;
    this.isAttackSuccessful = false;
    this.shakeIntensity = 0;

    if (enterOverview) {
      this.enterOverviewPhase();
    }
  }

  // PRE-GAME OVERVIEW PHASE (CRITICAL FEATURE)
  private enterOverviewPhase(): void {
    this.state = 'LEVEL_OVERVIEW';
    this.activeCamera = this.overviewCam.camera;
    this.overviewCam.setEnabled(true);
    InputManager.getInstance().setOverviewMode(true);
    InputManager.getInstance().exitPointerLock();

    // Markers visible during Overview
    if (this.levelBuild) {
      this.levelBuild.playerMarker.visible = true;
      this.levelBuild.monsterMarker.visible = true;
      this.levelBuild.exitMarker.visible = true;
    }

    UIManager.getInstance().showOverview(this.currentLevelDef);
    AudioManager.getInstance().startAmbience();
  }

  // Start Level Cinematic Transition: Flies overview camera down into First Person View!
  private startLevelTransition(): void {
    if (this.state !== 'LEVEL_OVERVIEW' || !this.levelBuild) return;

    // Hide overview markers for first-person gameplay
    this.levelBuild.playerMarker.visible = false;
    this.levelBuild.monsterMarker.visible = false;
    this.levelBuild.exitMarker.visible = false;

    // Smoothly fly camera to player spawn
    const targetPos = this.fpController.position;
    const targetYaw = this.fpController.getYaw();
    const targetPitch = this.fpController.getPitch();

    this.overviewCam.startTransitionToFirstPerson(
      targetPos,
      targetYaw,
      targetPitch,
      () => {
        // Transition complete: handover to First Person Controller!
        this.activeCamera = this.fpController.camera;
        this.fpController.setEnabled(true);
        InputManager.getInstance().setOverviewMode(false);
        InputManager.getInstance().requestPointerLock(this.canvas);

        this.state = 'STEALTH';
        this.isTimerRunning = true;

        UIManager.getInstance().showGameplayHUD();
        UIManager.getInstance().setStatusText('STEALTH: Sneak behind the monster');
      }
    );
  }

  // Execute Contextual Baseball Bat Attack
  private performAttack(): void {
    if (this.state !== 'STEALTH' || this.isAttackSuccessful) return;

    const canAttack = this.monster.canBeAttackedFromBehind(this.fpController.position);
    if (!canAttack) return;

    this.state = 'ATTACK';
    this.isAttackSuccessful = true;

    // Permanent disable attack for this attempt
    this.fpController.weapon.disableAttackPermanently();
    UIManager.getInstance().setAttackPromptVisible(false);

    // Swing bat
    this.fpController.weapon.swing(() => {
      // Hit connected on monster's head!
      this.monster.triggerBatHit();
      this.triggerScreenShake(0.35);
      UIManager.getInstance().setStatusText('MONSTER HIT! PREPARE TO RUN!');
    });
  }

  private triggerScreenShake(amount: number): void {
    this.shakeIntensity = amount;
  }

  // Trigger Game Over
  private triggerGameOver(reason: string): void {
    this.state = 'GAME_OVER';
    this.isTimerRunning = false;
    this.fpController.setEnabled(false);
    InputManager.getInstance().exitPointerLock();

    UIManager.getInstance().showGameOver(reason);
  }

  // Escape Reached: Level Complete!
  private triggerLevelComplete(): void {
    this.state = 'LEVEL_COMPLETE';
    this.isTimerRunning = false;
    this.fpController.setEnabled(false);
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
    if (this.state === 'LEVEL_OVERVIEW') {
      this.overviewCam.update(dt);
    } else if (this.state === 'STEALTH' || this.state === 'ATTACK' || this.state === 'CHASE') {
      // 1. Update Player
      this.fpController.update(dt, this.totalTime);

      // 2. Update Monster
      this.monster.update(dt, this.totalTime, this.fpController.position);

      // 3. Stealth Contextual Attack Check
      if (this.state === 'STEALTH') {
        const canAttack = this.monster.canBeAttackedFromBehind(this.fpController.position);
        UIManager.getInstance().setAttackPromptVisible(canAttack);
        UIManager.getInstance().setDetectionMeter(this.monster.detectionPercent);

        if (canAttack && inputMgr.consumeAttackRequest()) {
          this.performAttack();
        }
      } else {
        UIManager.getInstance().setAttackPromptVisible(false);
        UIManager.getInstance().setDetectionMeter(0);
      }

      // 4. Escape Door Trigger Check (only active during CHASE phase!)
      if (this.state === 'CHASE' && this.levelBuild) {
        if (this.levelBuild.exitTriggerBox.containsPoint(this.fpController.position)) {
          this.triggerLevelComplete();
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
}
