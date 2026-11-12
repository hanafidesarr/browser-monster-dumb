export interface SaveData {
  unlockedLevel: number;
  completedLevels: Record<number, { time: number; date: string }>;
  unlockedWeapons: string[];
  selectedWeapon: string;
  settings: {
    masterVolume: number;
    sfxVolume: number;
    musicVolume: number;
    mobileControlMode: 'simple' | 'fps';
    mouseSensitivity: number;
    touchSensitivity: number;
    graphicsQuality: 'low' | 'med' | 'high';
  };
}

const STORAGE_KEY = 'monster_dumb_save_v1';

const DEFAULT_SAVE: SaveData = {
  unlockedLevel: 1,
  completedLevels: {},
  unlockedWeapons: ['baseball_bat'],
  selectedWeapon: 'baseball_bat',
  settings: {
    masterVolume: 80,
    sfxVolume: 90,
    musicVolume: 70,
    mobileControlMode: 'simple',
    mouseSensitivity: 5,
    touchSensitivity: 8,
    graphicsQuality: 'med',
  },
};

export class SaveManager {
  private static instance: SaveManager;
  private data: SaveData;

  private constructor() {
    this.data = this.load();
  }

  public static getInstance(): SaveManager {
    if (!SaveManager.instance) {
      SaveManager.instance = new SaveManager();
    }
    return SaveManager.instance;
  }

  private load(): SaveData {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const settings = {
          ...DEFAULT_SAVE.settings,
          ...(parsed.settings || {}),
        };
        // Automatically upgrade legacy low touch sensitivity defaults
        if (!settings.touchSensitivity || settings.touchSensitivity <= 5) {
          settings.touchSensitivity = 8;
        }
        return {
          ...DEFAULT_SAVE,
          ...parsed,
          settings,
        };
      }
    } catch (e) {
      console.warn('Failed to load save data, using defaults:', e);
    }
    return { ...DEFAULT_SAVE };
  }

  public save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  }

  public getData(): SaveData {
    return this.data;
  }

  public unlockLevel(levelNumber: number): void {
    if (levelNumber > this.data.unlockedLevel) {
      this.data.unlockedLevel = levelNumber;
      this.save();
    }
  }

  public recordCompletion(levelNumber: number, timeSeconds: number): void {
    this.data.completedLevels[levelNumber] = {
      time: timeSeconds,
      date: new Date().toISOString(),
    };
    // Unlock next level if applicable (up to 10)
    if (levelNumber + 1 <= 10 && levelNumber + 1 > this.data.unlockedLevel) {
      this.data.unlockedLevel = levelNumber + 1;
    }
    this.save();
  }

  public isLevelUnlocked(levelNumber: number): boolean {
    return levelNumber <= this.data.unlockedLevel;
  }

  public isLevelCompleted(levelNumber: number): boolean {
    return !!this.data.completedLevels[levelNumber];
  }

  public isWeaponUnlocked(weaponId: string): boolean {
    if (!this.data.unlockedWeapons) {
      this.data.unlockedWeapons = ['baseball_bat'];
    }
    return this.data.unlockedWeapons.includes(weaponId);
  }

  public unlockWeapon(weaponId: string): boolean {
    if (!this.data.unlockedWeapons) {
      this.data.unlockedWeapons = ['baseball_bat'];
    }
    if (!this.data.unlockedWeapons.includes(weaponId)) {
      this.data.unlockedWeapons.push(weaponId);
      this.save();
      return true;
    }
    return false;
  }

  public getSelectedWeapon(): string {
    return this.data.selectedWeapon || 'baseball_bat';
  }

  public setSelectedWeapon(weaponId: string): void {
    if (this.isWeaponUnlocked(weaponId)) {
      this.data.selectedWeapon = weaponId;
      this.save();
    }
  }
}
