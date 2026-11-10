import { SettingsManager } from './SettingsManager.ts';

export interface MovementInput {
  forward: number; // -1 to 1
  right: number;   // -1 to 1
  isSprinting: boolean;
}

export class InputManager {
  private static instance: InputManager;

  // Desktop Keys
  private keys: Record<string, boolean> = {};

  // Mouse Look Delta
  public mouseDeltaX: number = 0;
  public mouseDeltaY: number = 0;
  public isPointerLocked: boolean = false;

  // Mobile Joysticks & Touch Look
  public joystickVector: { x: number; y: number } = { x: 0, y: 0 };
  public touchLookDeltaX: number = 0;
  public touchLookDeltaY: number = 0;
  public isMobileSprinting: boolean = false;

  // Attack Action Trigger
  public attackRequested: boolean = false;

  // Pause Action Trigger
  public pauseRequested: boolean = false;

  // Touch tracking
  private activeTouchLookId: number | null = null;
  private lastTouchLookPos: { x: number; y: number } = { x: 0, y: 0 };

  private activeJoystickTouchId: number | null = null;
  private joystickCenter: { x: number; y: number } = { x: 0, y: 0 };
  private joystickRadius: number = 55;

  private isEnabled: boolean = true;
  private isOverviewMode: boolean = false;

  private constructor() {
    this.setupDesktopListeners();
    this.setupMobileListeners();
  }

  public static getInstance(): InputManager {
    if (!InputManager.instance) {
      InputManager.instance = new InputManager();
    }
    return InputManager.instance;
  }

  public setOverviewMode(overview: boolean): void {
    this.isOverviewMode = overview;
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    if (!enabled) {
      this.resetInputs();
    }
  }

  public resetInputs(): void {
    this.keys = {};
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.joystickVector = { x: 0, y: 0 };
    this.touchLookDeltaX = 0;
    this.touchLookDeltaY = 0;
    this.attackRequested = false;
    this.pauseRequested = false;
  }

  private setupDesktopListeners(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      this.keys[e.code] = true;
      if (e.code === 'Escape') {
        this.pauseRequested = true;
      }
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      this.keys[e.code] = false;
    });

    // Mouse movement
    window.addEventListener('mousemove', (e: MouseEvent) => {
      if (this.isPointerLocked && this.isEnabled && !this.isOverviewMode) {
        const sens = SettingsManager.getInstance().settings.mouseSensitivity * 0.0006;
        this.mouseDeltaX += e.movementX * sens;
        this.mouseDeltaY += e.movementY * sens;
      }
    });

    // Pointer Lock change listener
    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = !!document.pointerLockElement;
    });

    // Mouse Click for attack
    window.addEventListener('mousedown', (e: MouseEvent) => {
      if (e.button === 0 && this.isPointerLocked && this.isEnabled && !this.isOverviewMode) {
        this.attackRequested = true;
      }
    });
  }

  public requestPointerLock(canvas: HTMLElement): void {
    if (!this.isPointerLocked && !this.isOverviewMode) {
      try {
        canvas.requestPointerLock();
      } catch (_) {}
    }
  }

  public exitPointerLock(): void {
    if (document.pointerLockElement) {
      try {
        document.exitPointerLock();
      } catch (_) {}
    }
  }

  private setupMobileListeners(): void {
    const lookZone = document.getElementById('touch-look-zone');
    const joystickBaseCenter = document.getElementById('joystick-base-center');
    const joystickKnobCenter = document.getElementById('joystick-knob-center');
    const joystickBaseLeft = document.getElementById('joystick-base-left');
    const joystickKnobLeft = document.getElementById('joystick-knob-left');
    const sprintBtn = document.getElementById('btn-touch-sprint');
    const attackBtn = document.getElementById('btn-contextual-attack');

    // Contextual Attack Button
    attackBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.attackRequested = true;
    });

    // Sprint Button in Mode B
    if (sprintBtn) {
      sprintBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.isMobileSprinting = true;
        sprintBtn.classList.add('active');
      });
      const endSprint = (e: TouchEvent) => {
        e.preventDefault();
        this.isMobileSprinting = false;
        sprintBtn.classList.remove('active');
      };
      sprintBtn.addEventListener('touchend', endSprint);
      sprintBtn.addEventListener('touchcancel', endSprint);
    }

    // Generic Joystick touch binding helper
    const bindJoystick = (base: HTMLElement | null, knob: HTMLElement | null) => {
      if (!base || !knob) return;

      const handleTouchStart = (e: TouchEvent) => {
        if (this.activeJoystickTouchId !== null) return;
        const touch = e.changedTouches[0];
        this.activeJoystickTouchId = touch.identifier;

        const rect = base.getBoundingClientRect();
        this.joystickCenter = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };
        this.updateJoystickPosition(touch.clientX, touch.clientY, knob);
      };

      const handleTouchMove = (e: TouchEvent) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          if (touch.identifier === this.activeJoystickTouchId) {
            this.updateJoystickPosition(touch.clientX, touch.clientY, knob);
            break;
          }
        }
      };

      const handleTouchEnd = (e: TouchEvent) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          if (touch.identifier === this.activeJoystickTouchId) {
            this.activeJoystickTouchId = null;
            this.joystickVector = { x: 0, y: 0 };
            knob.style.transform = `translate(-50%, -50%)`;
            break;
          }
        }
      };

      base.addEventListener('touchstart', handleTouchStart, { passive: false });
      window.addEventListener('touchmove', handleTouchMove, { passive: false });
      window.addEventListener('touchend', handleTouchEnd, { passive: false });
      window.addEventListener('touchcancel', handleTouchEnd, { passive: false });
    };

    bindJoystick(joystickBaseCenter, joystickKnobCenter);
    bindJoystick(joystickBaseLeft, joystickKnobLeft);

    // Look Area Touch
    if (lookZone) {
      lookZone.addEventListener('touchstart', (e: TouchEvent) => {
        if (this.activeTouchLookId !== null) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          // Ignore if it's over the active joystick
          if (touch.identifier !== this.activeJoystickTouchId) {
            this.activeTouchLookId = touch.identifier;
            this.lastTouchLookPos = { x: touch.clientX, y: touch.clientY };
            break;
          }
        }
      }, { passive: false });

      window.addEventListener('touchmove', (e: TouchEvent) => {
        if (this.activeTouchLookId === null) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          if (touch.identifier === this.activeTouchLookId) {
            const dx = touch.clientX - this.lastTouchLookPos.x;
            const dy = touch.clientY - this.lastTouchLookPos.y;
            this.lastTouchLookPos = { x: touch.clientX, y: touch.clientY };

            const sens = SettingsManager.getInstance().settings.touchSensitivity * 0.0006;
            this.touchLookDeltaX += dx * sens;
            this.touchLookDeltaY += dy * sens;
            break;
          }
        }
      }, { passive: false });

      const endLook = (e: TouchEvent) => {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === this.activeTouchLookId) {
            this.activeTouchLookId = null;
            break;
          }
        }
      };
      window.addEventListener('touchend', endLook);
      window.addEventListener('touchcancel', endLook);
    }
  }

  private updateJoystickPosition(touchX: number, touchY: number, knob: HTMLElement): void {
    const dx = touchX - this.joystickCenter.x;
    const dy = touchY - this.joystickCenter.y;
    const distance = Math.hypot(dx, dy);

    const clampedDist = Math.min(distance, this.joystickRadius);
    const angle = Math.atan2(dy, dx);

    const knobX = Math.cos(angle) * clampedDist;
    const knobY = Math.sin(angle) * clampedDist;

    knob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;

    // Dead zone check (10%)
    if (clampedDist < 6) {
      this.joystickVector = { x: 0, y: 0 };
    } else {
      const normDist = clampedDist / this.joystickRadius;
      this.joystickVector = {
        x: (dx / (distance || 1)) * normDist,
        y: -(dy / (distance || 1)) * normDist, // Invert Y so up is positive forward
      };
    }
  }

  // Get Consolidated Movement Input
  public getMovementInput(): MovementInput {
    if (!this.isEnabled || this.isOverviewMode) {
      return { forward: 0, right: 0, isSprinting: false };
    }

    let forward = 0;
    let right = 0;
    let isSprinting = false;

    // Desktop Keyboard
    if (this.keys['KeyW'] || this.keys['ArrowUp']) forward += 1;
    if (this.keys['KeyS'] || this.keys['ArrowDown']) forward -= 1;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) right -= 1;
    if (this.keys['KeyD'] || this.keys['ArrowRight']) right += 1;

    if (this.keys['ShiftLeft'] || this.keys['ShiftRight']) {
      isSprinting = true;
    }

    // Mobile Joystick input
    if (Math.abs(this.joystickVector.y) > 0.05) forward += this.joystickVector.y;
    if (Math.abs(this.joystickVector.x) > 0.05) right += this.joystickVector.x;

    const mode = SettingsManager.getInstance().settings.mobileControlMode;
    if (mode === 'simple') {
      // In Simple Joystick mode: Displacement magnitude controls walking to sprinting!
      const displacement = Math.hypot(this.joystickVector.x, this.joystickVector.y);
      if (displacement > 0.85) {
        isSprinting = true;
      }
    } else {
      // Advanced FPS Mode: Sprint button
      if (this.isMobileSprinting) isSprinting = true;
    }

    // Clamp values
    forward = Math.max(-1, Math.min(1, forward));
    right = Math.max(-1, Math.min(1, right));

    return { forward, right, isSprinting };
  }

  // Consume and reset frame look deltas
  public consumeLookDelta(): { dx: number; dy: number } {
    const dx = this.mouseDeltaX + this.touchLookDeltaX;
    const dy = this.mouseDeltaY + this.touchLookDeltaY;
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.touchLookDeltaX = 0;
    this.touchLookDeltaY = 0;
    return { dx, dy };
  }

  public consumeAttackRequest(): boolean {
    const req = this.attackRequested;
    this.attackRequested = false;
    return req;
  }

  public consumePauseRequest(): boolean {
    const req = this.pauseRequested;
    this.pauseRequested = false;
    return req;
  }
}
