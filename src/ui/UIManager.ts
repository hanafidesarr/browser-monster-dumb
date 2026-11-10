import { SaveManager } from '../core/SaveManager.ts';
import { SettingsManager } from '../core/SettingsManager.ts';
import { AudioManager } from '../core/AudioManager.ts';
import { ALL_LEVELS, LevelDefinition } from '../level/LevelData.ts';

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
  private contextualAttackWrapper = document.getElementById('contextual-attack-wrapper')!;
  private detectionMeterContainer = document.getElementById('detection-meter-container')!;
  private detectionMeterFill = document.getElementById('detection-meter-fill')!;
  private joystickCenter = document.getElementById('joystick-container-center')!;
  private joystickLeft = document.getElementById('joystick-container-left')!;
  private btnSprint = document.getElementById('btn-touch-sprint')!;

  // Overview Elements
  private overviewLevelTitle = document.getElementById('overview-level-title')!;

  // Game Over & Complete Elements
  private gameOverReason = document.getElementById('game-over-reason')!;
  private completeLevelName = document.getElementById('complete-level-name')!;
  private completeTime = document.getElementById('complete-time')!;
  private btnCompleteNext = document.getElementById('btn-complete-next') as HTMLButtonElement;

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
    this.screenOverview.classList.add('active');
  }

  public showGameplayHUD(): void {
    this.hideAllScreens();
    this.hudGameplay.classList.add('active');
    this.setAttackPromptVisible(false);
    this.setDetectionMeter(0);
    this.applyMobileControlLayout();
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

  public setAttackPromptVisible(visible: boolean): void {
    if (visible) {
      this.contextualAttackWrapper.classList.remove('hidden');
    } else {
      this.contextualAttackWrapper.classList.add('hidden');
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
    const mode = SettingsManager.getInstance().settings.mobileControlMode;
    if (mode === 'simple') {
      // Center-bottom joystick
      this.joystickCenter.classList.remove('hidden');
      this.joystickLeft.classList.add('hidden');
      this.btnSprint.classList.add('hidden');
    } else {
      // Advanced FPS: left joystick + sprint button
      this.joystickCenter.classList.add('hidden');
      this.joystickLeft.classList.remove('hidden');
      this.btnSprint.classList.remove('hidden');
    }
  }

  private setupMenuNavigation(): void {
    const audio = AudioManager.getInstance();

    // Main Menu Buttons
    document.getElementById('btn-menu-play')?.addEventListener('click', () => {
      audio.playUiClick();
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

    // Settings Back
    document.getElementById('btn-settings-back')?.addEventListener('click', () => {
      audio.playUiClick();
      this.showMainMenu();
    });

    // Overview Buttons
    document.getElementById('btn-start-level')?.addEventListener('click', () => {
      audio.playUiClick();
      if (this.onStartLevelRequested) {
        this.onStartLevelRequested();
      }
    });

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

      const card = document.createElement('div');
      card.className = `level-card ${isUnlocked ? 'unlocked' : 'locked'}`;

      card.innerHTML = `
        <div class="level-number">LEVEL ${level.id.toString().padStart(2, '0')}</div>
        <div class="level-name">${level.title}</div>
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
