import { SaveManager } from '../core/SaveManager.ts';
import { SettingsManager } from '../core/SettingsManager.ts';
import { AudioManager } from '../core/AudioManager.ts';
import { ALL_LEVELS, LevelDefinition } from '../level/LevelData.ts';
import { ALL_WEAPONS, WeaponId, WEAPON_MAP } from '../weapon/WeaponData.ts';

export class UIManager {
  private static instance: UIManager;

  // Screens
  private screenMainMenu = document.getElementById('screen-main-menu')!;
  private screenLevelSelect = document.getElementById('screen-level-select')!;
  private screenSettings = document.getElementById('screen-settings')!;
  private screenOverview = document.getElementById('screen-overview')!;
  private hudGameplay = document.getElementById('hud-gameplay')!;
  private screenPause = document.getElementById('screen-pause')!;
  private screenGameOver = document.getElementById('screen-game-over')!;
  private screenLevelComplete = document.getElementById('screen-level-complete')!;

  // HUD Elements
  private hudStatusText = document.getElementById('hud-status-text')!;
  private desktopAttackPrompt = document.getElementById('desktop-attack-prompt');
  private btnMobileAttack = document.getElementById('btn-mobile-attack');
  private contextualAttackWrapper = document.getElementById('contextual-attack-wrapper');
  private detectionMeterContainer = document.getElementById('detection-meter-container')!;
  private detectionMeterFill = document.getElementById('detection-meter-fill')!;
  private joystickCenter = document.getElementById('joystick-container-center')!;
  private joystickLeft = document.getElementById('joystick-container-left')!;
  private btnSprint = document.getElementById('btn-touch-sprint')!;

  // Overview Elements
  private overviewLevelTitle = document.getElementById('overview-level-title')!;
  private overviewWeaponList = document.getElementById('overview-weapon-list');

  // In-Game Pickup & Discovery HUD Elements
  private hudPickupPrompt = document.getElementById('hud-pickup-prompt');
  private hudPickupTitle = document.getElementById('hud-pickup-title');
  private hudWeaponToast = document.getElementById('hud-weapon-toast');
  private toastWeaponName = document.getElementById('toast-weapon-name');
  private toastWeaponDesc = document.getElementById('toast-weapon-desc');
  private currentPickupAction: (() => void) | null = null;
  private toastTimeout: any = null;

  // Game Over & Complete Elements
  private gameOverReason = document.getElementById('game-over-reason')!;
  private completeLevelName = document.getElementById('complete-level-name')!;
  private completeTime = document.getElementById('complete-time')!;
  private btnCompleteNext = document.getElementById('btn-complete-next') as HTMLButtonElement;
  private jumpscareOverlay = document.getElementById('jumpscare-overlay');

  // Level Selection Container
  private levelsContainer = document.getElementById('levels-container')!;

  // Callbacks
  public onPlayRequested: ((levelId: number) => void) | null = null;
  public onStartLevelRequested: () => void = null as unknown as () => void;
  public onResumeRequested: () => void = null as unknown as () => void;
  public onRestartRequested: () => void = null as unknown as () => void;
  public onExitToMenuRequested: () => void = null as unknown as () => void;
  public onNextLevelRequested: () => void = null as unknown as () => void;
  public onGraphicsChanged: ((quality: 'low' | 'med' | 'high') => void) | null = null;
  public onWeaponSelected: ((weaponId: WeaponId) => void) | null = null;

  private constructor() {
    this.setupMenuNavigation();
    this.setupSettingsBindings();
    this.populateLevelsList();
    this.applyMobileControlLayout();
  }

  public static getInstance(): UIManager {
    if (!UIManager.instance) {
      UIManager.instance = new UIManager();
    }
    return UIManager.instance;
  }

  public hideAllScreens(): void {
    const screens = [
      this.screenMainMenu,
      this.screenLevelSelect,
      this.screenSettings,
      this.screenOverview,
      this.hudGameplay,
      this.screenPause,
      this.screenGameOver,
      this.screenLevelComplete,
    ];
    screens.forEach((s) => s.classList.remove('active'));
    this.hideJumpscareOverlay();
  }

  public showJumpscareOverlay(): void {
    if (this.jumpscareOverlay) {
      this.jumpscareOverlay.classList.remove('hidden');
    }
  }

  public hideJumpscareOverlay(): void {
    if (this.jumpscareOverlay) {
      this.jumpscareOverlay.classList.add('hidden');
    }
  }

  public showMainMenu(): void {
    this.hideAllScreens();
    this.screenMainMenu.classList.add('active');
  }

  public showLevelSelect(): void {
    this.hideAllScreens();
    this.populateLevelsList();
    this.screenLevelSelect.classList.add('active');
  }

  public showSettings(fromPause: boolean = false): void {
    this.hideAllScreens();
    this.screenSettings.classList.add('active');
  }

  public showOverview(level: LevelDefinition): void {
    this.hideAllScreens();
    this.overviewLevelTitle.textContent = `LEVEL ${level.id} — ${level.title}`;
    const monsterLegend = document.querySelector('.legend-item:nth-child(2)');
    if (monsterLegend) {
      const isKunti = level.monsterType === 'kunti' || level.id === 2;
      const count = level.monsterCount || 1;
      const countLabel = count > 1 ? ` (${count} Hantu)` : '';
      monsterLegend.innerHTML = `<span class="legend-dot monster-dot"></span> ${isKunti ? 'Kuntilanak' : 'Pocong'} (Tertidur)${countLabel}`;
    }
    const missionBanner = document.querySelector('.overview-mission-banner');
    if (missionBanner) {
      const isKunti = level.monsterType === 'kunti' || level.id === 2;
      const monsterName = isKunti ? 'Kuntilanak' : 'Pocong';
      missionBanner.innerHTML = `<span class="mission-icon">&#127919;</span> <strong>MISI:</strong> Cari & pukul ${monsterName} untuk memunculkan pintu keluar!`;
    }
    this.populateWeaponSelection();
    this.screenOverview.classList.add('active');
  }

  // Populate dynamic 9-weapon comedic arsenal with unlocked & locked state
  public populateWeaponSelection(): void {
    if (!this.overviewWeaponList) return;
    this.overviewWeaponList.innerHTML = '';

    const save = SaveManager.getInstance();
    const audio = AudioManager.getInstance();
    const selectedWeaponId = save.getSelectedWeapon();

    const weaponIcons: Record<string, string> = {
      baseball_bat: '&#9876;',
      signboard: '&#129534;',
      frying_pan: '&#127859;',
      slipper: '&#128094;',
      chair: '&#129681;',
      broom: '&#129529;',
      spatula: '&#127860;',
      toy_hammer: '&#128296;',
      electric_fan: '&#127744;',
    };

    ALL_WEAPONS.forEach((w) => {
      const isUnlocked = save.isWeaponUnlocked(w.id);
      const isSelected = selectedWeaponId === w.id;

      const card = document.createElement('div');
      card.className = `weapon-card ${isUnlocked ? 'unlocked' : 'locked'} ${isSelected ? 'selected' : ''}`;

      card.innerHTML = `
        <div class="weapon-card-top">
          <span class="weapon-badge">${isSelected ? 'DIPAKAI' : (isUnlocked ? 'TERSEDIA' : 'TERKUNCI')}</span>
          <span>${isUnlocked ? (isSelected ? '&#10004;' : '') : '&#128274;'}</span>
        </div>
        <div class="weapon-card-icon">${weaponIcons[w.id] || '&#9876;'}</div>
        <div class="weapon-card-name">${w.nameId}</div>
        <div class="weapon-card-desc">${isUnlocked ? w.description : 'Temukan di dalam level'}</div>
      `;

      if (isUnlocked) {
        card.addEventListener('click', () => {
          audio.playUiClick();
          save.setSelectedWeapon(w.id);
          this.populateWeaponSelection();
          if (this.onWeaponSelected) {
            this.onWeaponSelected(w.id);
          }
        });
      }

      this.overviewWeaponList!.appendChild(card);
    });
  }

  // Show In-Game Contextual Weapon Pickup Prompt (Anchored in world/screen space)
  public showPickupPrompt(weaponName: string, onPickup: () => void, screenPos?: { x: number; y: number }): void {
    if (!this.hudPickupPrompt || !this.hudPickupTitle) return;
    this.currentPickupAction = onPickup;
    this.hudPickupTitle.textContent = `TEMUKAN: ${weaponName.toUpperCase()}`;
    this.hudPickupPrompt.classList.remove('hidden');

    if (screenPos) {
      this.hudPickupPrompt.style.position = 'fixed';
      this.hudPickupPrompt.style.left = `${screenPos.x}px`;
      this.hudPickupPrompt.style.top = `${screenPos.y}px`;
      this.hudPickupPrompt.style.bottom = 'auto';
      this.hudPickupPrompt.style.transform = 'translate(-50%, -100%)';
    } else {
      this.hudPickupPrompt.style.position = '';
      this.hudPickupPrompt.style.left = '';
      this.hudPickupPrompt.style.top = '';
      this.hudPickupPrompt.style.bottom = '';
      this.hudPickupPrompt.style.transform = '';
    }
  }

  public hidePickupPrompt(): void {
    if (!this.hudPickupPrompt) return;
    this.currentPickupAction = null;
    this.hudPickupPrompt.classList.add('hidden');
    this.hudPickupPrompt.style.position = '';
    this.hudPickupPrompt.style.left = '';
    this.hudPickupPrompt.style.top = '';
    this.hudPickupPrompt.style.bottom = '';
    this.hudPickupPrompt.style.transform = '';
  }

  public triggerPickup(): void {
    if (this.currentPickupAction) {
      const action = this.currentPickupAction;
      this.currentPickupAction = null;
      this.hidePickupPrompt();
      action();
    }
  }

  // Show Discovery Celebration Toast
  public showWeaponDiscoveryToast(weaponName: string, description: string): void {
    if (!this.hudWeaponToast || !this.toastWeaponName || !this.toastWeaponDesc) return;
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.toastWeaponName.textContent = `SENJATA BARU: ${weaponName.toUpperCase()}!`;
    this.toastWeaponDesc.textContent = `${description} Sekarang tersimpan di koleksi senjatamu.`;
    this.hudWeaponToast.classList.remove('hidden');

    this.toastTimeout = setTimeout(() => {
      this.hudWeaponToast?.classList.add('hidden');
    }, 4500);
  }

  public showGameplayHUD(): void {
    this.hideAllScreens();
    this.hudGameplay.classList.add('active');
    if (this.btnMobileAttack) {
      this.btnMobileAttack.style.display = 'flex';
      this.btnMobileAttack.classList.remove('can-strike');
      const label = this.btnMobileAttack.querySelector('.touch-attack-label');
      if (label) label.textContent = 'PUKUL';
    }
    if (this.btnSprint) {
      this.btnSprint.style.display = 'none';
      this.btnSprint.classList.remove('active');
    }
    this.setAttackPromptVisible(false);
    this.setDetectionMeter(0);
    this.applyMobileControlLayout();
  }

  // Switch to Chase Phase Controls (Sprint button replaces Attack button on mobile!)
  public switchToChaseControls(): void {
    this.setAttackPromptVisible(false);
    if (this.btnMobileAttack) {
      this.btnMobileAttack.style.display = 'none';
    }
    if (this.btnSprint) {
      this.btnSprint.style.display = 'flex';
      this.btnSprint.classList.remove('active');
    }
  }

  public hideAttackControls(): void {
    this.setAttackPromptVisible(false);
    if (this.btnMobileAttack) {
      this.btnMobileAttack.style.display = 'none';
    }
    if (this.btnSprint) {
      this.btnSprint.style.display = 'none';
      this.btnSprint.classList.remove('active');
    }
  }

  public showPauseMenu(): void {
    this.hudGameplay.classList.remove('active');
    this.screenPause.classList.add('active');
  }

  public hidePauseMenu(): void {
    this.screenPause.classList.remove('active');
    this.hudGameplay.classList.add('active');
  }

  public showGameOver(reason: string): void {
    this.hideAllScreens();
    this.screenGameOver.classList.add('active');
    this.gameOverReason.textContent = reason;
  }

  public showLevelComplete(level: LevelDefinition, timeSeconds: number, hasNextLevel: boolean): void {
    this.hideAllScreens();
    this.screenLevelComplete.classList.add('active');
    this.completeLevelName.textContent = level.title;

    const mins = Math.floor(timeSeconds / 60);
    const secs = (timeSeconds % 60).toFixed(1);
    this.completeTime.textContent = `${mins.toString().padStart(2, '0')}:${secs.padStart(4, '0')}`;

    if (hasNextLevel) {
      this.btnCompleteNext.style.display = 'block';
    } else {
      this.btnCompleteNext.style.display = 'none';
    }
  }

  public setStatusText(text: string): void {
    this.hudStatusText.textContent = text;
  }

  public setAttackPromptVisible(visible: boolean, monsterName: string = 'POCONG'): void {
    // 1. Single Monster Alert: Only show the black-background banner prompt
    if (this.desktopAttackPrompt) {
      if (visible) {
        const titleEl = this.desktopAttackPrompt.querySelector('.prompt-title');
        if (titleEl) {
          titleEl.textContent = `PUKUL ${monsterName.toUpperCase()}!`;
        }
        this.desktopAttackPrompt.classList.remove('hidden');
      } else {
        this.desktopAttackPrompt.classList.add('hidden');
      }
    }

    // 2. Disable duplicate proximity alert (red circular contextual button is permanently hidden)
    if (this.contextualAttackWrapper) {
      this.contextualAttackWrapper.classList.add('hidden');
    }

    // 3. Highlight mobile thumb attack button when in striking position
    if (this.btnMobileAttack) {
      const label = this.btnMobileAttack.querySelector('.touch-attack-label');
      if (visible) {
        this.btnMobileAttack.classList.add('can-strike');
        if (label) label.textContent = 'PUKUL!';
      } else {
        this.btnMobileAttack.classList.remove('can-strike');
        if (label) label.textContent = 'PUKUL';
      }
    }
  }

  public setDetectionMeter(percent: number): void {
    if (percent > 0.05) {
      this.detectionMeterContainer.classList.remove('hidden');
      this.detectionMeterFill.style.width = `${Math.min(100, Math.floor(percent * 100))}%`;
    } else {
      this.detectionMeterContainer.classList.add('hidden');
      this.detectionMeterFill.style.width = '0%';
    }
  }

  public applyMobileControlLayout(): void {
    // Always use left-positioned joystick for maximum thumb comfort
    this.joystickLeft.classList.remove('hidden');
    this.joystickCenter.classList.add('hidden');
  }

  private setupMenuNavigation(): void {
    const audio = AudioManager.getInstance();

    // Comprehensive helper to enter true fullscreen and lock landscape orientation
    const requestFullScreenAndLandscape = async () => {
      const docEl = document.documentElement as any;
      try {
        if (!document.fullscreenElement && !(document as any).webkitFullscreenElement) {
          if (docEl.requestFullscreen) {
            await docEl.requestFullscreen({ navigationUI: 'hide' });
          } else if (docEl.webkitRequestFullscreen) {
            await docEl.webkitRequestFullscreen();
          } else if (docEl.mozRequestFullScreen) {
            await docEl.mozRequestFullScreen();
          } else if (docEl.msRequestFullscreen) {
            await docEl.msRequestFullscreen();
          }
        }
      } catch (_) {}

      try {
        if (screen.orientation && (screen.orientation as any).lock) {
          await (screen.orientation as any).lock('landscape');
        }
      } catch (_) {}
    };

    const toggleFullscreen = async () => {
      if (document.fullscreenElement || (document as any).webkitFullscreenElement) {
        try {
          if (document.exitFullscreen) {
            await document.exitFullscreen();
          } else if ((document as any).webkitExitFullscreen) {
            await (document as any).webkitExitFullscreen();
          }
        } catch (_) {}
      } else {
        await requestFullScreenAndLandscape();
      }
    };

    // Fullscreen Toggle Button in HUD
    const btnToggleFullscreen = document.getElementById('btn-toggle-fullscreen');
    btnToggleFullscreen?.addEventListener('click', (e) => {
      e.stopPropagation();
      audio.playUiClick();
      toggleFullscreen();
    });

    const landscapeOverlay = document.getElementById('landscape-prompt-overlay');

    document.getElementById('btn-enter-fullscreen-landscape')?.addEventListener('click', async () => {
      audio.playUiClick();
      await requestFullScreenAndLandscape();
      landscapeOverlay?.classList.remove('show-portrait');
    });

    document.getElementById('btn-dismiss-landscape')?.addEventListener('click', () => {
      audio.playUiClick();
      landscapeOverlay?.classList.remove('show-portrait');
    });

    const checkShowLandscapePrompt = () => {
      if (window.innerWidth < 900 && window.innerHeight > window.innerWidth) {
        landscapeOverlay?.classList.add('show-portrait');
      } else {
        landscapeOverlay?.classList.remove('show-portrait');
      }
    };

    // Auto-dismiss prompt and update orientation when device rotated
    window.addEventListener('resize', checkShowLandscapePrompt);
    window.addEventListener('orientationchange', () => {
      setTimeout(checkShowLandscapePrompt, 200);
      if (window.innerWidth > window.innerHeight) {
        requestFullScreenAndLandscape();
      }
    });

    // Main Menu Buttons
    document.getElementById('btn-menu-play')?.addEventListener('click', () => {
      audio.playUiClick();
      requestFullScreenAndLandscape();
      checkShowLandscapePrompt();
      const currentUnlocked = SaveManager.getInstance().getData().unlockedLevel;
      if (this.onPlayRequested) {
        this.onPlayRequested(currentUnlocked);
      }
    });

    document.getElementById('btn-menu-levels')?.addEventListener('click', () => {
      audio.playUiClick();
      this.showLevelSelect();
    });

    document.getElementById('btn-menu-settings')?.addEventListener('click', () => {
      audio.playUiClick();
      this.showSettings(false);
    });

    // Level Select Back
    document.getElementById('btn-levels-back')?.addEventListener('click', () => {
      audio.playUiClick();
      this.showMainMenu();
    });

    // HUD Pickup Button Touch / Click
    const pickupPrompt = document.getElementById('hud-pickup-prompt');
    if (pickupPrompt) {
      pickupPrompt.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.triggerPickup();
      });
      pickupPrompt.addEventListener('touchend', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.triggerPickup();
      });
    }

    // Settings Back
    document.getElementById('btn-settings-back')?.addEventListener('click', () => {
      audio.playUiClick();
      this.showMainMenu();
    });

    // Overview Buttons
    const startBtn = document.getElementById('btn-start-level');
    if (startBtn) {
      let startHandled = false;
      const onStart = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        if (startHandled) return;
        startHandled = true;
        setTimeout(() => { startHandled = false; }, 350);
        audio.playUiClick();
        requestFullScreenAndLandscape();
        checkShowLandscapePrompt();
        if (this.onStartLevelRequested) {
          this.onStartLevelRequested();
        }
      };
      startBtn.addEventListener('click', onStart);
      startBtn.addEventListener('touchend', onStart);
    }

    document.getElementById('btn-overview-back')?.addEventListener('click', () => {
      audio.playUiClick();
      this.showMainMenu();
    });

    const bindAction = (elementId: string, action: () => void) => {
      const el = document.getElementById(elementId);
      if (!el) return;
      let handled = false;
      const trigger = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        if (handled) return;
        handled = true;
        setTimeout(() => { handled = false; }, 250);
        action();
      };
      el.addEventListener('click', trigger);
      el.addEventListener('touchend', trigger);
    };

    // Pause Buttons
    document.getElementById('btn-hud-pause')?.addEventListener('click', () => {
      audio.playUiClick();
      this.showPauseMenu();
    });

    bindAction('btn-pause-resume', () => {
      audio.playUiClick();
      this.hidePauseMenu();
      if (this.onResumeRequested) this.onResumeRequested();
    });

    bindAction('btn-pause-restart', () => {
      audio.playUiClick();
      this.hidePauseMenu();
      if (this.onRestartRequested) this.onRestartRequested();
    });

    bindAction('btn-pause-settings', () => {
      audio.playUiClick();
      this.showSettings(true);
    });

    bindAction('btn-pause-menu', () => {
      audio.playUiClick();
      this.hidePauseMenu();
      if (this.onExitToMenuRequested) this.onExitToMenuRequested();
    });

    // Game Over Buttons (Guaranteed instant response on click or touch)
    bindAction('btn-game-over-retry', () => {
      audio.playUiClick();
      this.hideAllScreens();
      if (this.onRestartRequested) this.onRestartRequested();
    });

    bindAction('btn-game-over-menu', () => {
      audio.playUiClick();
      this.hideAllScreens();
      if (this.onExitToMenuRequested) this.onExitToMenuRequested();
    });

    // Level Complete Buttons
    this.btnCompleteNext.addEventListener('click', (e) => {
      e.stopPropagation();
      audio.playUiClick();
      this.hideAllScreens();
      if (this.onNextLevelRequested) this.onNextLevelRequested();
    });

    bindAction('btn-complete-retry', () => {
      audio.playUiClick();
      this.hideAllScreens();
      if (this.onRestartRequested) this.onRestartRequested();
    });

    bindAction('btn-complete-menu', () => {
      audio.playUiClick();
      this.hideAllScreens();
      if (this.onExitToMenuRequested) this.onExitToMenuRequested();
    });
  }

  private setupSettingsBindings(): void {
    const settings = SettingsManager.getInstance();
    const audio = AudioManager.getInstance();

    // Volume Sliders
    const masterSlider = document.getElementById('setting-master-vol') as HTMLInputElement;
    const sfxSlider = document.getElementById('setting-sfx-vol') as HTMLInputElement;
    const musicSlider = document.getElementById('setting-music-vol') as HTMLInputElement;

    const labelMaster = document.getElementById('label-master-vol')!;
    const labelSfx = document.getElementById('label-sfx-vol')!;
    const labelMusic = document.getElementById('label-music-vol')!;

    masterSlider.value = settings.settings.masterVolume.toString();
    sfxSlider.value = settings.settings.sfxVolume.toString();
    musicSlider.value = settings.settings.musicVolume.toString();

    labelMaster.textContent = `${masterSlider.value}%`;
    labelSfx.textContent = `${sfxSlider.value}%`;
    labelMusic.textContent = `${musicSlider.value}%`;

    masterSlider.addEventListener('input', () => {
      settings.updateSetting('masterVolume', parseInt(masterSlider.value));
      labelMaster.textContent = `${masterSlider.value}%`;
      audio.updateVolumes();
    });

    sfxSlider.addEventListener('input', () => {
      settings.updateSetting('sfxVolume', parseInt(sfxSlider.value));
      labelSfx.textContent = `${sfxSlider.value}%`;
      audio.updateVolumes();
    });

    musicSlider.addEventListener('input', () => {
      settings.updateSetting('musicVolume', parseInt(musicSlider.value));
      labelMusic.textContent = `${musicSlider.value}%`;
      audio.updateVolumes();
    });

    // Control Modes
    const btnSimple = document.getElementById('btn-mode-simple')!;
    const btnFps = document.getElementById('btn-mode-fps')!;

    if (settings.settings.mobileControlMode === 'simple') {
      btnSimple.classList.add('active');
      btnFps.classList.remove('active');
    } else {
      btnFps.classList.add('active');
      btnSimple.classList.remove('active');
    }

    btnSimple.addEventListener('click', () => {
      audio.playUiClick();
      settings.updateSetting('mobileControlMode', 'simple');
      btnSimple.classList.add('active');
      btnFps.classList.remove('active');
      this.applyMobileControlLayout();
    });

    btnFps.addEventListener('click', () => {
      audio.playUiClick();
      settings.updateSetting('mobileControlMode', 'fps');
      btnFps.classList.add('active');
      btnSimple.classList.remove('active');
      this.applyMobileControlLayout();
    });

    // Sensitivity Sliders
    const mouseSens = document.getElementById('setting-mouse-sens') as HTMLInputElement;
    const touchSens = document.getElementById('setting-touch-sens') as HTMLInputElement;
    const labelMouseSens = document.getElementById('label-mouse-sens')!;
    const labelTouchSens = document.getElementById('label-touch-sens')!;

    mouseSens.value = settings.settings.mouseSensitivity.toString();
    touchSens.value = settings.settings.touchSensitivity.toString();
    labelMouseSens.textContent = mouseSens.value;
    labelTouchSens.textContent = touchSens.value;

    mouseSens.addEventListener('input', () => {
      settings.updateSetting('mouseSensitivity', parseInt(mouseSens.value));
      labelMouseSens.textContent = mouseSens.value;
    });

    touchSens.addEventListener('input', () => {
      settings.updateSetting('touchSensitivity', parseInt(touchSens.value));
      labelTouchSens.textContent = touchSens.value;
    });

    // Graphics Quality
    const btnGfxLow = document.getElementById('btn-gfx-low')!;
    const btnGfxMed = document.getElementById('btn-gfx-med')!;
    const btnGfxHigh = document.getElementById('btn-gfx-high')!;

    const setGfxActive = (q: 'low' | 'med' | 'high') => {
      btnGfxLow.classList.toggle('active', q === 'low');
      btnGfxMed.classList.toggle('active', q === 'med');
      btnGfxHigh.classList.toggle('active', q === 'high');
      settings.updateSetting('graphicsQuality', q);
      if (this.onGraphicsChanged) this.onGraphicsChanged(q);
    };

    setGfxActive(settings.settings.graphicsQuality);

    btnGfxLow.addEventListener('click', () => { audio.playUiClick(); setGfxActive('low'); });
    btnGfxMed.addEventListener('click', () => { audio.playUiClick(); setGfxActive('med'); });
    btnGfxHigh.addEventListener('click', () => { audio.playUiClick(); setGfxActive('high'); });
  }

  // Populate the 10 levels dynamically in Level Selection
  private populateLevelsList(): void {
    this.levelsContainer.innerHTML = '';
    const save = SaveManager.getInstance();
    const audio = AudioManager.getInstance();

    ALL_LEVELS.forEach((level) => {
      const isUnlocked = save.isLevelUnlocked(level.id);
      const isCompleted = save.isLevelCompleted(level.id);
      const monsterType = level.monsterType || (level.id === 2 ? 'kunti' : 'pocong');
      const monsterName = monsterType === 'kunti' ? 'Kuntilanak' : 'Pocong';
      const monsterCount = level.monsterCount || 1;

      const card = document.createElement('div');
      card.className = `level-card ${isUnlocked ? 'unlocked' : 'locked'}`;

      card.innerHTML = `
        <div class="level-number">LEVEL ${level.id.toString().padStart(2, '0')}</div>
        <div class="level-name">${level.title}</div>
        <div class="level-meta-row">
          <span class="level-monster-badge" title="${monsterCount} ${monsterName}">
            <span class="monster-icon">&#128123;</span>
            <span class="monster-count-text">${monsterCount} ${monsterName}</span>
          </span>
          <span class="level-floor-badge">&#127970; ${level.floorCount || 1} Lantai</span>
        </div>
        <div class="level-status-row">
          <span>${isCompleted ? 'COMPLETED' : (isUnlocked ? 'AVAILABLE' : 'LOCKED')}</span>
          <span class="${isCompleted ? 'badge-completed' : (isUnlocked ? 'badge-unlocked' : 'badge-locked')}">
            ${isCompleted ? '&#9733; 100%' : (isUnlocked ? '&#9658; PLAY' : '&#128274;')}
          </span>
        </div>
      `;

      if (isUnlocked) {
        card.addEventListener('click', () => {
          audio.playUiClick();
          if (this.onPlayRequested) {
            this.onPlayRequested(level.id);
          }
        });
      }

      this.levelsContainer.appendChild(card);
    });
  }
}
