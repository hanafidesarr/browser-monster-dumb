import { SaveManager, SaveData } from './SaveManager.ts';

export class SettingsManager {
  private static instance: SettingsManager;
  private saveManager: SaveManager;

  private constructor() {
    this.saveManager = SaveManager.getInstance();
  }

  public static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  public get settings(): SaveData['settings'] {
    return this.saveManager.getData().settings;
  }

  public updateSetting<K extends keyof SaveData['settings']>(
    key: K,
    value: SaveData['settings'][K]
  ): void {
    this.saveManager.getData().settings[key] = value;
    this.saveManager.save();
  }
}
