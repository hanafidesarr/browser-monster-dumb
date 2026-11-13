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

  // Attack Action Trigger with Input Buffer
  public attackRequested: boolean = false;
  private attackRequestedTime: number = 0;
  public interactRequested: boolean = false;

  // Pause Action Trigger
  public pauseRequested: boolean = false;

  // Touch tracking
  private activeTouchLookId: number | null = null;
  private lastTouchLookPos: { x: number; y: number } = { x: 0, y: 0 };

  private activeJoystickTouchId: number | null = null;
  private isJoystickPointerDown: boolean = false;
  private activeJoystickKnob: HTMLElement | null = null;
  private joystickKnobs: (HTMLElement | null)[] = [];
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

  public resetJoystick(): void {
    this.activeJoystickTouchId = null;
    this.isJoystickPointerDown = false;
    this.activeJoystickKnob = null;
    this.joystickVector = { x: 0, y: 0 };
    for (const knob of this.joystickKnobs) {
      if (knob) {
        knob.style.transform = 'translate(-50%, -50%)';
      }
    }
  }

  public resetInputs(): void {
    this.keys = {};
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.resetJoystick();
    this.touchLookDeltaX = 0;
    this.touchLookDeltaY = 0;
    this.attackRequested = false;
    this.attackRequestedTime = 0;
    this.pauseRequested = false;
  }

  public requestAttack(): void {
    this.attackRequested = true;
    this.attackRequestedTime = performance.now();
  }

  public consumeAttackRequest(): boolean {
    const now = performance.now();
    if (this.attackRequested || (this.attackRequestedTime > 0 && now - this.attackRequestedTime < 450)) {
      this.attackRequested = false;
      this.attackRequestedTime = 0;
      return true;
    }
    return false;
  }

  public requestInteract(): void {
    this.interactRequested = true;
  }

  public consumeInteractRequest(): boolean {
    if (this.interactRequested) {
      this.interactRequested = false;
      return true;
    }
    return false;
  }

  private setupDesktopListeners(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      this.keys[e.code] = true;
      if (e.code === 'Escape') {
        this.pauseRequested = true;
      }
      if (e.code === 'KeyE') {
        this.requestInteract();
      }
      // Spacebar, E, F, Enter attack triggering with comprehensive layout & key compatibility
      const isAttackKey =
        e.code === 'Space' ||
        e.code === 'Spacebar' ||
        e.key === ' ' ||
        e.key === 'Spacebar' ||
        e.code === 'KeyE' ||
        e.code === 'KeyF' ||
        e.code === 'Enter';

      if (isAttackKey) {
        e.preventDefault();
        this.requestAttack();
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

    // Mouse Click for attack (Left Mouse Button)
    window.addEventListener('mousedown', (e: MouseEvent) => {
      if (e.button === 0 && this.isEnabled && !this.isOverviewMode) {
        this.requestAttack();
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
    try {
      if (document.exitPointerLock) {
        document.exitPointerLock();
      }
    } catch (_) {}
    this.isPointerLocked = false;
  }

  private setupMobileListeners(): void {
    const lookZone = document.getElementById('touch-look-zone');
    const joystickBaseCenter = document.getElementById('joystick-base-center');
    const joystickKnobCenter = document.getElementById('joystick-knob-center');
    const joystickBaseLeft = document.getElementById('joystick-base-left');
    const joystickKnobLeft = document.getElementById('joystick-knob-left');
    const sprintBtn = document.getElementById('btn-touch-sprint');
    const mobileAttackBtn = document.getElementById('btn-mobile-attack');
    const contextualAttackBtn = document.getElementById('btn-contextual-attack');
    const desktopAttackPrompt = document.getElementById('desktop-attack-prompt');

    // Attack Button (Fast, responsive tap handling on mobile)
    const bindAttackElement = (btn: HTMLElement | null) => {
      if (!btn) return;
      const onAttackTap = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        this.requestAttack();
      };
      btn.addEventListener('pointerdown', onAttackTap, { passive: false });
      btn.addEventListener('touchstart', onAttackTap, { passive: false });
      btn.addEventListener('click', onAttackTap);
    };

    bindAttackElement(mobileAttackBtn);
    bindAttackElement(contextualAttackBtn);
    bindAttackElement(desktopAttackPrompt);

    // Sprint Button (Replaces attack button on mobile during chase phase)
    if (sprintBtn) {
      const startSprint = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        this.isMobileSprinting = true;
        sprintBtn.classList.add('active');
      };
      const endSprint = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        this.isMobileSprinting = false;
        sprintBtn.classList.remove('active');
      };

      sprintBtn.addEventListener('touchstart', startSprint, { passive: false });
      sprintBtn.addEventListener('pointerdown', startSprint, { passive: false });
      sprintBtn.addEventListener('mousedown', startSprint);

      sprintBtn.addEventListener('touchend', endSprint, { passive: false });
      sprintBtn.addEventListener('touchcancel', endSprint, { passive: false });
      sprintBtn.addEventListener('pointerup', endSprint, { passive: false });
      sprintBtn.addEventListener('pointercancel', endSprint, { passive: false });
      sprintBtn.addEventListener('mouseup', endSprint);
    }

    // Store joystick knobs for unified reset handling
    this.joystickKnobs = [joystickKnobCenter, joystickKnobLeft];

    // Unified Mobile Joystick System
    const setupJoystickElement = (base: HTMLElement | null, knob: HTMLElement | null) => {
      if (!base || !knob) return;

      const onTouchStart = (e: TouchEvent) => {
        if (this.activeJoystickTouchId !== null) return;
        const touch = e.changedTouches[0];
        this.activeJoystickTouchId = touch.identifier;
        this.activeJoystickKnob = knob;

        const rect = base.getBoundingClientRect();
        this.joystickCenter = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };
        this.updateJoystickPosition(touch.clientX, touch.clientY);
      };

      const onPointerDown = (e: PointerEvent) => {
        if (e.pointerType === 'touch') return; // Handled by touch events
        this.isJoystickPointerDown = true;
        this.activeJoystickKnob = knob;

        const rect = base.getBoundingClientRect();
        this.joystickCenter = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };
        this.updateJoystickPosition(e.clientX, e.clientY);
      };

      base.addEventListener('touchstart', onTouchStart, { passive: false });
      base.addEventListener('pointerdown', onPointerDown, { passive: false });
      base.addEventListener('mousedown', (e: MouseEvent) => {
        this.isJoystickPointerDown = true;
        this.activeJoystickKnob = knob;
        const rect = base.getBoundingClientRect();
        this.joystickCenter = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };
        this.updateJoystickPosition(e.clientX, e.clientY);
      });
    };

    setupJoystickElement(joystickBaseCenter, joystickKnobCenter);
    setupJoystickElement(joystickBaseLeft, joystickKnobLeft);

    // Global touch movement & release listeners for seamless control
    window.addEventListener('touchmove', (e: TouchEvent) => {
      if (this.activeJoystickTouchId === null) return;
      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === this.activeJoystickTouchId) {
          this.updateJoystickPosition(touch.clientX, touch.clientY);
          break;
        }
      }
    }, { passive: false });

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        this.resetJoystick();
        return;
      }
      if (this.activeJoystickTouchId !== null) {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === this.activeJoystickTouchId) {
            this.resetJoystick();
            break;
          }
        }
      }
    };

    window.addEventListener('touchend', handleTouchEnd, { passive: false });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    // Pointer / Mouse Move & Release
    window.addEventListener('pointermove', (e: PointerEvent) => {
      if (e.pointerType !== 'touch' && this.isJoystickPointerDown) {
        this.updateJoystickPosition(e.clientX, e.clientY);
      }
    });

    window.addEventListener('mousemove', (e: MouseEvent) => {
      if (this.isJoystickPointerDown) {
        this.updateJoystickPosition(e.clientX, e.clientY);
      }
    });

    const handlePointerRelease = () => {
      if (this.isJoystickPointerDown) {
        this.resetJoystick();
      }
    };

    window.addEventListener('pointerup', handlePointerRelease);
    window.addEventListener('pointercancel', handlePointerRelease);
    window.addEventListener('mouseup', handlePointerRelease);
    window.addEventListener('blur', () => this.resetJoystick());
    window.addEventListener('orientationchange', () => this.resetJoystick());

    // Look Area Touch (Right side of screen, avoiding the movement joystick and attack button)
    if (lookZone) {
      lookZone.addEventListener('touchstart', (e: TouchEvent) => {
        if (this.activeTouchLookId !== null) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          // Check if touch is NOT in bottom-right corner where attack button is located (120px zone)
          const isNearAttackButton =
            touch.clientX > window.innerWidth - 130 &&
            touch.clientY > window.innerHeight - 130;

          // Only start camera look if not on active joystick, on right side (>28% width), and not tapping attack button
          if (
            touch.identifier !== this.activeJoystickTouchId &&
            touch.clientX > window.innerWidth * 0.28 &&
            !isNearAttackButton
          ) {
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

            const sens = SettingsManager.getInstance().settings.touchSensitivity * 0.0016;
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

  private updateJoystickPosition(touchX: number, touchY: number, knob?: HTMLElement | null): void {
    const targetKnob = knob || this.activeJoystickKnob;
    const dx = touchX - this.joystickCenter.x;
    const dy = touchY - this.joystickCenter.y;
    const distance = Math.hypot(dx, dy);

    const clampedDist = Math.min(distance, this.joystickRadius);
    const angle = Math.atan2(dy, dx);

    const knobX = Math.cos(angle) * clampedDist;
    const knobY = Math.sin(angle) * clampedDist;

    if (targetKnob) {
      targetKnob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
    }

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

  public consumePauseRequest(): boolean {
    const req = this.pauseRequested;
    this.pauseRequested = false;
    return req;
  }
}
