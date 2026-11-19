export interface SaveData {
  unlockedLevel: number;
  currentLevel: number;
  completedLevels: Record<number, { time: number; date: string }>;
  unlockedWeapons: string[];
  selectedWeapon: string;
  language?: 'id' | 'en';
  hasChosenLanguage?: boolean;
  weaponsLockedV2Migration?: boolean;
  settings: {
    masterVolume: number;
    sfxVolume: number;
    musicVolume: number;
    mobileControlMode: 'simple' | 'fps';
    mouseSensitivity: number;
    touchSensitivity: number;
    graphicsQuality: 'low' | 'med' | 'high';
    language?: 'id' | 'en';
  };
}

const STORAGE_KEY = 'monster_dumb_save_v1';

const DEFAULT_SAVE: SaveData = {
  unlockedLevel: 1,
  currentLevel: 1,
  completedLevels: {},
  unlockedWeapons: ['baseball_bat'],
  selectedWeapon: 'baseball_bat',
  language: 'id',
  hasChosenLanguage: false,
  weaponsLockedV2Migration: true,
  settings: {
    masterVolume: 80,
    sfxVolume: 90,
    musicVolume: 70,
    mobileControlMode: 'simple',
    mouseSensitivity: 5,
    touchSensitivity: 8,
    graphicsQuality: 'med',
    language: 'id',
  },
};

export class SaveManager {
  private static instance: SaveManager;
  private data: SaveData;

  private constructor() {
    this.data = this.load();
    this.save();
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

        // Migrate legacy 'signboard' -> 'grenade' and 'slipper' -> 'machine_gun'
        if (parsed.unlockedWeapons && Array.isArray(parsed.unlockedWeapons)) {
          parsed.unlockedWeapons = parsed.unlockedWeapons.map((w: string) => {
            if (w === 'signboard') return 'grenade';
            if (w === 'slipper') return 'machine_gun';
            return w;
          });
        }
        if (parsed.selectedWeapon === 'signboard') {
          parsed.selectedWeapon = 'grenade';
        }
        if (parsed.selectedWeapon === 'slipper') {
          parsed.selectedWeapon = 'machine_gun';
        }

        // Calculate unlocked level strictly from completed levels (must finish current level to unlock next level)
        let maxCompleted = 0;
        if (parsed.completedLevels && typeof parsed.completedLevels === 'object') {
          for (const lvlStr of Object.keys(parsed.completedLevels)) {
            const lvlNum = parseInt(lvlStr, 10);
            if (!isNaN(lvlNum) && parsed.completedLevels[lvlNum]) {
              maxCompleted = Math.max(maxCompleted, lvlNum);
            }
          }
        }
        // Player starts with Level 1 unlocked. Each completed level unlocks the next level (up to 6 for public players)
        const unlockedLevel = Math.min(6, Math.max(1, maxCompleted + 1));
        const currentLevel = typeof parsed.currentLevel === 'number'
          ? Math.min(Math.max(1, parsed.currentLevel), unlockedLevel)
          : unlockedLevel;

        let unlockedWeapons = parsed.unlockedWeapons && Array.isArray(parsed.unlockedWeapons)
          ? [...parsed.unlockedWeapons]
          : ['baseball_bat'];

        // Strict weapon lock enforcement:
        // Level 2 -> machine_gun (only unlocked if picked up or level 2 completed or level 3+ reached)
        const hasCompletedLvl2 = !!(parsed.completedLevels && parsed.completedLevels[2]);
        if (!hasCompletedLvl2 && unlockedLevel < 2) {
          unlockedWeapons = unlockedWeapons.filter((w: string) => w !== 'machine_gun' && w !== 'slipper');
        }

        // Level 3 -> grenade (only unlocked if picked up or level 3 completed or level 4+ reached)
        const hasCompletedLvl3 = !!(parsed.completedLevels && parsed.completedLevels[3]);
        if (!hasCompletedLvl3 && unlockedLevel < 3) {
          unlockedWeapons = unlockedWeapons.filter((w: string) => w !== 'grenade' && w !== 'signboard');
        }

        // Level 4 -> rasengan (strictly locked unless Level 4 has been completed)
        const hasCompletedLvl4 = !!(parsed.completedLevels && parsed.completedLevels[4]);
        if (!hasCompletedLvl4) {
          unlockedWeapons = unlockedWeapons.filter((w: string) => w !== 'rasengan' && w !== 'toy_hammer');
        }

        // Level 5 -> kamehameha (strictly locked unless Level 5 has been completed)
        const hasCompletedLvl5 = !!(parsed.completedLevels && parsed.completedLevels[5]);
        if (!hasCompletedLvl5) {
          unlockedWeapons = unlockedWeapons.filter((w: string) => w !== 'kamehameha' && w !== 'electric_fan');
        }

        if (!unlockedWeapons.includes('baseball_bat')) {
          unlockedWeapons.unshift('baseball_bat');
        }

        let selectedWeapon = parsed.selectedWeapon || 'baseball_bat';
        if (!unlockedWeapons.includes(selectedWeapon)) {
          selectedWeapon = 'baseball_bat';
        }

        return {
          ...DEFAULT_SAVE,
          ...parsed,
          unlockedLevel,
          unlockedWeapons,
          selectedWeapon: parsed.selectedWeapon || 'baseball_bat',
          currentLevel,
          settings,
          weaponsLockedV2Migration: true,
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

  public isDevModeEnabled(): boolean {
    if (typeof window === 'undefined' || !window.location) return false;
    try {
      const search = window.location.search;
      if (search) {
        const params = new URLSearchParams(search);
        if (
          params.get('dev') === '1' ||
          params.get('dev') === 'true' ||
          params.has('dev') ||
          params.get('mode') === 'dev' ||
          params.has('test') ||
          params.has('unlock') ||
          params.has('all')
        ) {
          return true;
        }
      }
      if (typeof window.localStorage !== 'undefined') {
        if (
          window.localStorage.getItem('monster_dumb_dev') === '1' ||
          window.localStorage.getItem('dev') === '1'
        ) {
          return true;
        }
      }
    } catch (_) {}
    return false;
  }

  public getData(): SaveData {
    if (this.isDevModeEnabled()) {
      return {
        ...this.data,
        unlockedLevel: Math.max(10, this.data.unlockedLevel),
        currentLevel: this.data.currentLevel || 1,
      };
    }
    return this.data;
  }

  public getCurrentLevel(): number {
    return this.data.currentLevel || 1;
  }

  public setCurrentLevel(levelNumber: number): void {
    const maxLevel = this.isDevModeEnabled() ? 10 : 6;
    if (levelNumber >= 1 && levelNumber <= maxLevel && this.isLevelUnlocked(levelNumber)) {
      this.data.currentLevel = levelNumber;
      this.save();
    }
  }

  public getUnlockedLevel(): number {
    if (this.isDevModeEnabled()) return 10;
    return Math.min(6, this.data.unlockedLevel || 1);
  }

  public unlockLevel(levelNumber: number): void {
    const maxLevel = this.isDevModeEnabled() ? 10 : 6;
    if (levelNumber <= maxLevel && levelNumber > this.data.unlockedLevel) {
      this.data.unlockedLevel = levelNumber;
      this.data.currentLevel = levelNumber;
      this.save();
    }
  }

  public recordCompletion(levelNumber: number, timeSeconds: number): void {
    this.data.completedLevels[levelNumber] = {
      time: timeSeconds,
      date: new Date().toISOString(),
    };
    // Unlock next level if applicable (capped at Level 6 for public players)
    const maxLevel = this.isDevModeEnabled() ? 10 : 6;
    if (levelNumber + 1 <= maxLevel && levelNumber + 1 > this.data.unlockedLevel) {
      this.data.unlockedLevel = levelNumber + 1;
    }
    if (levelNumber + 1 <= maxLevel) {
      this.data.currentLevel = levelNumber + 1;
    }
    this.save();
  }

  public isLevelUnlocked(levelNumber: number): boolean {
    // Level 1 is always unlocked by default
    if (levelNumber === 1) return true;
    // Levels 7 to 10 are strictly disabled and on-progress unless dev=1 is enabled
    if (levelNumber >= 7 && levelNumber <= 10) {
      return this.isDevModeEnabled();
    }
    if (this.isDevModeEnabled()) return true;
    // Must complete previous levels: levelNumber must be <= unlockedLevel
    return levelNumber <= (this.data.unlockedLevel || 1);
  }

  public isLevelCompleted(levelNumber: number): boolean {
    return !!this.data.completedLevels[levelNumber];
  }

  public isWeaponUnlocked(weaponId: string): boolean {
    if (['frying_pan', 'chair', 'broom', 'spatula'].includes(weaponId)) return false;
    const effectiveId = weaponId === 'signboard' ? 'grenade' : (weaponId === 'slipper' ? 'machine_gun' : weaponId);
    if (!this.data.unlockedWeapons) {
      this.data.unlockedWeapons = ['baseball_bat'];
    }
    return this.data.unlockedWeapons.includes(effectiveId);
  }

  public unlockWeapon(weaponId: string): boolean {
    if (['frying_pan', 'chair', 'broom', 'spatula'].includes(weaponId)) return false;
    const effectiveId = weaponId === 'signboard' ? 'grenade' : (weaponId === 'slipper' ? 'machine_gun' : weaponId);
    if (!this.data.unlockedWeapons) {
      this.data.unlockedWeapons = ['baseball_bat'];
    }
    if (!this.data.unlockedWeapons.includes(effectiveId)) {
      this.data.unlockedWeapons.push(effectiveId);
      this.save();
      return true;
    }
    return false;
  }

  public getSelectedWeapon(): string {
    const w = this.data.selectedWeapon || 'baseball_bat';
    const validWeapons = ['baseball_bat', 'machine_gun', 'grenade', 'rasengan', 'kamehameha'];
    if (!validWeapons.includes(w) || !this.isWeaponUnlocked(w)) {
      this.data.selectedWeapon = 'baseball_bat';
      return 'baseball_bat';
    }
    return w;
  }

  public setSelectedWeapon(weaponId: string): void {
    const effectiveId = weaponId === 'signboard' ? 'grenade' : (weaponId === 'slipper' ? 'machine_gun' : weaponId);
    if (this.isWeaponUnlocked(effectiveId)) {
      this.data.selectedWeapon = effectiveId;
      this.save();
    }
  }

  public getLanguage(): 'id' | 'en' {
    return this.data.settings?.language || this.data.language || 'id';
  }

  public setLanguage(lang: 'id' | 'en'): void {
    if (!this.data.settings) {
      this.data.settings = { ...DEFAULT_SAVE.settings };
    }
    this.data.settings.language = lang;
    this.data.language = lang;
    this.save();
  }

  public hasChosenLanguage(): boolean {
    return !!this.data.hasChosenLanguage;
  }

  public setChosenLanguage(chosen: boolean = true): void {
    this.data.hasChosenLanguage = chosen;
    this.save();
  }
}
