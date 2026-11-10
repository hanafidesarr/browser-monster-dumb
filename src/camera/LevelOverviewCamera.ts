import * as THREE from 'three';
import { LevelDefinition } from '../level/LevelData.ts';

export class LevelOverviewCamera {
  public camera: THREE.PerspectiveCamera;
  private canvas: HTMLCanvasElement;
  private levelDef: LevelDefinition | null = null;

  // Orbit / Pan / Zoom parameters
  private target = new THREE.Vector3(0, 0, 0);
  private distance: number = 32;
  private minDistance: number = 12;
  private maxDistance: number = 55;
  private polarAngle: number = (55 * Math.PI) / 180; // top-down inclined view
  private azimuthAngle: number = 0;

  // Interaction tracking
  private isInteracting: boolean = false;
  private isPanning: boolean = false;
  private isRotating: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  // Mobile multi-touch
  private activeTouches: Map<number, { x: number; y: number }> = new Map();
  private initialPinchDist: number = 0;
  private initialPinchZoom: number = 0;
  private initialTwoFingerAngle: number = 0;

  // Transition to first-person
  public isTransitioning: boolean = false;
  private transitionProgress: number = 0;
  private transitionDuration: number = 1.6; // smooth cinematic fly-down
  private startPos = new THREE.Vector3();
  private startRot = new THREE.Quaternion();
  private endPos = new THREE.Vector3();
  private endRot = new THREE.Quaternion();
  private onTransitionComplete: (() => void) | null = null;

  private isEnabled: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);

    this.setupDesktopEvents();
    this.setupMobileEvents();
  }

  public setLevel(level: LevelDefinition): void {
    this.levelDef = level;
    this.target.set(0, 0, 0);
    this.distance = 32;
    this.polarAngle = (55 * Math.PI) / 180;
    this.azimuthAngle = 0;
    this.updateCameraTransform();
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    this.isInteracting = false;
    this.isPanning = false;
    this.isRotating = false;
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
    // Clamp target within level boundaries
    if (this.levelDef) {
      const maxBound = (this.levelDef.gridWidth * this.levelDef.cellSize) / 2;
      this.target.x = Math.max(-maxBound, Math.min(maxBound, this.target.x));
      this.target.z = Math.max(-maxBound, Math.min(maxBound, this.target.z));
    }

    const x = this.target.x + this.distance * Math.sin(this.polarAngle) * Math.sin(this.azimuthAngle);
    const y = this.target.y + this.distance * Math.cos(this.polarAngle);
    const z = this.target.z + this.distance * Math.sin(this.polarAngle) * Math.cos(this.azimuthAngle);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.target);
  }

  private setupDesktopEvents(): void {
    this.canvas.addEventListener('mousedown', (e: MouseEvent) => {
      if (!this.isEnabled || this.isTransitioning) return;
      this.isInteracting = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      if (e.button === 2) {
        // RMB: Pan
        this.isPanning = true;
        this.isRotating = false;
      } else if (e.button === 0) {
        // LMB: Rotate
        this.isRotating = true;
        this.isPanning = false;
      }
    });

    window.addEventListener('mousemove', (e: MouseEvent) => {
      if (!this.isEnabled || !this.isInteracting || this.isTransitioning) return;

      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      if (this.isRotating) {
        this.azimuthAngle -= dx * 0.008;
        this.polarAngle = Math.max(
          (20 * Math.PI) / 180,
          Math.min((80 * Math.PI) / 180, this.polarAngle - dy * 0.008)
        );
      } else if (this.isPanning) {
        const panSpeed = this.distance * 0.0018;
        // Pan along camera right and forward vectors projected onto ground
        const right = new THREE.Vector3(Math.cos(this.azimuthAngle), 0, -Math.sin(this.azimuthAngle));
        const fwd = new THREE.Vector3(-Math.sin(this.azimuthAngle), 0, -Math.cos(this.azimuthAngle));

        this.target.addScaledVector(right, -dx * panSpeed);
        this.target.addScaledVector(fwd, -dy * panSpeed);
      }
    });

    window.addEventListener('mouseup', () => {
      this.isInteracting = false;
      this.isPanning = false;
      this.isRotating = false;
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

    // Prevent context menu during RMB drag
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
        this.initialTwoFingerAngle = Math.atan2(touches[1].y - touches[0].y, touches[1].x - touches[0].x);
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e: TouchEvent) => {
      if (!this.isEnabled || this.isTransitioning) return;
      e.preventDefault();

      if (this.activeTouches.size === 1) {
        // 1 finger: Pan camera
        const touch = e.changedTouches[0];
        const prev = this.activeTouches.get(touch.identifier);
        if (prev) {
          const dx = touch.clientX - prev.x;
          const dy = touch.clientY - prev.y;
          this.activeTouches.set(touch.identifier, { x: touch.clientX, y: touch.clientY });

          const panSpeed = this.distance * 0.0022;
          const right = new THREE.Vector3(Math.cos(this.azimuthAngle), 0, -Math.sin(this.azimuthAngle));
          const fwd = new THREE.Vector3(-Math.sin(this.azimuthAngle), 0, -Math.cos(this.azimuthAngle));

          this.target.addScaledVector(right, -dx * panSpeed);
          this.target.addScaledVector(fwd, -dy * panSpeed);
        }
      } else if (this.activeTouches.size === 2) {
        // Update active touches
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          this.activeTouches.set(touch.identifier, { x: touch.clientX, y: touch.clientY });
        }

        const touches = Array.from(this.activeTouches.values());
        // Pinch Zoom
        const currentDist = Math.hypot(touches[0].x - touches[1].x, touches[0].y - touches[1].y);
        const factor = this.initialPinchDist / (currentDist || 1);
        this.distance = Math.max(
          this.minDistance,
          Math.min(this.maxDistance, this.initialPinchZoom * factor)
        );

        // 2-Finger Rotation
        const currentAngle = Math.atan2(touches[1].y - touches[0].y, touches[1].x - touches[0].x);
        const angleDiff = currentAngle - this.initialTwoFingerAngle;
        this.azimuthAngle -= angleDiff * 0.5;
        this.initialTwoFingerAngle = currentAngle;
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
