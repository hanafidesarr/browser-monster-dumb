import * as THREE from 'three';
import { LevelDefinition } from '../level/LevelData.ts';

export class LevelOverviewCamera {
  public camera: THREE.PerspectiveCamera;
  private canvas: HTMLCanvasElement;
  private levelDef: LevelDefinition | null = null;

  // Direct Top-Down 2D Map Pan & Zoom parameters (No 3D Rotation)
  private target = new THREE.Vector3(0, 0, 0);
  private distance: number = 32;
  private minDistance: number = 12;
  private maxDistance: number = 65;

  // Interaction tracking (Pan only)
  private isInteracting: boolean = false;
  private isPanning: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  // Mobile multi-touch
  private activeTouches: Map<number, { x: number; y: number }> = new Map();
  private initialPinchDist: number = 0;
  private initialPinchZoom: number = 0;

  // Transition to first-person
  public isTransitioning: boolean = false;
  private transitionProgress: number = 0;
  private transitionDuration: number = 0.8; // Snappy, smooth dive into first-person
  private startPos = new THREE.Vector3();
  private startRot = new THREE.Quaternion();
  private endPos = new THREE.Vector3();
  private endRot = new THREE.Quaternion();
  private onTransitionComplete: (() => void) | null = null;

  private isEnabled: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 250);
    this.camera.up.set(0, 0, -1); // Top-down map: -Z is North/Up, +Z is South/Down, +X is East/Right

    this.setupDesktopEvents();
    this.setupMobileEvents();
  }

  public setLevel(level: LevelDefinition): void {
    this.levelDef = level;

    const maxDim = Math.max(level.gridWidth * level.cellSize, level.gridHeight * level.cellSize);
    // Camera distance sized so entire map fits cleanly and clearly in upper region above weapon panel
    this.distance = Math.max(28, maxDim * 1.12);
    this.minDistance = 12;
    this.maxDistance = Math.max(70, maxDim * 2.4);

    // Initial target: offset in +Z so level is centered in the upper clear region above bottom controls
    const clearanceZ = this.distance * 0.14;
    this.target.set(0, 0, clearanceZ);

    this.updateCameraTransform();
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.isInteracting = false;
    this.isPanning = false;
    this.activeTouches.clear();
  }

  public startTransitionToFirstPerson(
    targetPos: THREE.Vector3,
    targetYaw: number,
    targetPitch: number,
    onComplete: () => void
  ): void {
    this.isTransitioning = true;
    this.transitionProgress = 0;
    this.isEnabled = false;
    this.onTransitionComplete = onComplete;

    this.startPos.copy(this.camera.position);
    this.startRot.copy(this.camera.quaternion);

    this.endPos.copy(targetPos);
    this.endRot.setFromEuler(new THREE.Euler(targetPitch, targetYaw, 0, 'YXZ'));
  }

  public update(dt: number): void {
    if (this.isTransitioning) {
      this.transitionProgress += dt / this.transitionDuration;
      const t = Math.min(1, this.transitionProgress);

      // Smooth easeInOutCubic
      const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

      this.camera.position.lerpVectors(this.startPos, this.endPos, ease);
      this.camera.quaternion.slerpQuaternions(this.startRot, this.endRot, ease);

      if (this.transitionProgress >= 1.0) {
        this.isTransitioning = false;
        if (this.onTransitionComplete) {
          this.onTransitionComplete();
        }
      }
    } else if (this.isEnabled) {
      this.updateCameraTransform();
    }
  }

  private updateCameraTransform(): void {
    // Clamp target within level boundaries with bottom panel clearance offset
    if (this.levelDef) {
      const maxBoundX = (this.levelDef.gridWidth * this.levelDef.cellSize) * 0.65;
      const maxBoundZ = (this.levelDef.gridHeight * this.levelDef.cellSize) * 0.65;
      const clearanceZ = this.distance * 0.16;
      this.target.x = THREE.MathUtils.clamp(this.target.x, -maxBoundX, maxBoundX);
      this.target.z = THREE.MathUtils.clamp(this.target.z, -maxBoundZ + clearanceZ, maxBoundZ + clearanceZ);
    }

    // Direct vertical top-down camera looking straight down at map
    this.camera.position.set(this.target.x, this.distance, this.target.z);
    this.camera.up.set(0, 0, -1);
    this.camera.lookAt(this.target.x, 0, this.target.z);
  }

  private setupDesktopEvents(): void {
    this.canvas.addEventListener('mousedown', (e: MouseEvent) => {
      if (!this.isEnabled || this.isTransitioning) return;
      this.isInteracting = true;
      this.isPanning = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    window.addEventListener('mousemove', (e: MouseEvent) => {
      if (!this.isEnabled || !this.isInteracting || this.isTransitioning) return;

      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      if (this.isPanning) {
        // Direct top-down 2D map panning:
        const panSpeed = this.distance * 0.0016;
        this.target.x -= dx * panSpeed;
        this.target.z -= dy * panSpeed;
      }
    });

    window.addEventListener('mouseup', () => {
      this.isInteracting = false;
      this.isPanning = false;
    });

    // Zoom via wheel
    this.canvas.addEventListener('wheel', (e: WheelEvent) => {
      if (!this.isEnabled || this.isTransitioning) return;
      e.preventDefault();
      this.distance = Math.max(
        this.minDistance,
        Math.min(this.maxDistance, this.distance + e.deltaY * 0.035)
      );
    }, { passive: false });

    // Prevent context menu during drag
    this.canvas.addEventListener('contextmenu', (e) => {
      if (this.isEnabled) e.preventDefault();
    });
  }

  private setupMobileEvents(): void {
    this.canvas.addEventListener('touchstart', (e: TouchEvent) => {
      if (!this.isEnabled || this.isTransitioning) return;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        this.activeTouches.set(touch.identifier, { x: touch.clientX, y: touch.clientY });
      }

      if (this.activeTouches.size === 2) {
        const touches = Array.from(this.activeTouches.values());
        this.initialPinchDist = Math.hypot(touches[0].x - touches[1].x, touches[0].y - touches[1].y);
        this.initialPinchZoom = this.distance;
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e: TouchEvent) => {
      if (!this.isEnabled || this.isTransitioning) return;
      e.preventDefault();

      if (this.activeTouches.size === 1) {
        // 1 finger: Pan map
        const touch = e.changedTouches[0];
        const prev = this.activeTouches.get(touch.identifier);
        if (prev) {
          const dx = touch.clientX - prev.x;
          const dy = touch.clientY - prev.y;
          this.activeTouches.set(touch.identifier, { x: touch.clientX, y: touch.clientY });

          const panSpeed = this.distance * 0.0022;
          this.target.x -= dx * panSpeed;
          this.target.z -= dy * panSpeed;
        }
      } else if (this.activeTouches.size >= 2) {
        // 2 fingers: Pinch to Zoom (No rotation)
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          this.activeTouches.set(touch.identifier, { x: touch.clientX, y: touch.clientY });
        }

        const touches = Array.from(this.activeTouches.values());
        const currentDist = Math.hypot(touches[0].x - touches[1].x, touches[0].y - touches[1].y);
        const factor = this.initialPinchDist / (currentDist || 1);
        this.distance = Math.max(
          this.minDistance,
          Math.min(this.maxDistance, this.initialPinchZoom * factor)
        );
      }
    }, { passive: false });

    const handleTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        this.activeTouches.delete(e.changedTouches[i].identifier);
      }
    };

    this.canvas.addEventListener('touchend', handleTouchEnd);
    this.canvas.addEventListener('touchcancel', handleTouchEnd);
  }
}
