import { SaveManager } from './SaveManager.ts';

export type Language = 'id' | 'en';

export interface TranslationDictionary {
  [key: string]: string | ((...args: any[]) => string);
}

const TRANSLATIONS: Record<Language, TranslationDictionary> = {
  id: {
    // Main Menu
    'menu.title': 'MONSTER DUMB',
    'menu.subtitle': 'SURVIVAL HORROR // PROTOKOL PELARIAN',
    'menu.badge': 'PSX RETRO 3D',
    'menu.play': 'MAIN',
    'menu.levelSelect': 'PILIH LEVEL',
    'menu.settings': 'PENGATURAN',
    'menu.copyright': '© 2026 MONSTER DUMB — PS1 SURVIVAL HORROR',
    'menu.headphones': 'DISARANKAN MENGGUNAKAN HEADPHONE',

    // Level Select
    'levelSelect.title': 'PILIHAN LEVEL',
    'levelSelect.back': 'KEMBALI',
    'levelSelect.testMode': 'MODE UJI TERBUKA',
    'levelSelect.locked': 'TERKUNCI',
    'levelSelect.unlocked': 'TERBUKA',
    'levelSelect.completed': 'SELESAI',
    'levelSelect.bestTime': 'WAKTU TERBAIK',

    // Settings
    'settings.title': 'PENGATURAN SISTEM',
    'settings.back': 'KEMBALI',
    'settings.audio': 'AUDIO',
    'settings.masterVol': 'Volume Utama',
    'settings.sfxVol': 'Efek Suara',
    'settings.musicVol': 'Musik Suasana',
    'settings.controls': 'KONTROL',
    'settings.controlMode': 'Mode Kontrol Mobile',
    'settings.modeSimple': 'Joystick Simpel',
    'settings.modeFps': 'FPS Lanjutan',
    'settings.mouseSens': 'Sensitivitas Mouse',
    'settings.touchSens': 'Sensitivitas Sentuh',
    'settings.graphics': 'GRAFIK',
    'settings.ps1Quality': 'Kualitas Visual PS1',
    'settings.qualityLow': 'Rendah (PS1 240p)',
    'settings.qualityMed': 'Sedang (PS1 480p)',
    'settings.qualityHigh': 'Tinggi (Tajam)',
    'settings.languageGroup': 'BAHASA / LANGUAGE',
    'settings.languageLabel': 'Pilihan Bahasa',
    'settings.langId': 'Bahasa Indonesia',
    'settings.langEn': 'English',

    // Overview / Loadout
    'overview.mission': (monster: string) =>
      `🎯 <strong>MISI:</strong> Cari & serang <strong>${monster}</strong> di dalam labirin, lalu segera lari ke pintu keluar sebelum tertangkap!`,
    'overview.weaponTitle': '⚔ PILIH SENJATA KOMEDI',
    'overview.weaponSubtitle': 'Pilih senjata untuk menyerang hantu',
    'overview.weaponSubtitleTest':
      'Pilih benda konyol untuk membangunkan hantu <span style="color:#10b981; font-weight:bold; margin-left:6px;">[MODE UJI AKTIF]</span>',
    'overview.startLevel': 'MULAI LEVEL',
    'overview.mainMenu': 'MENU UTAMA',
    'overview.selected': 'DIPILIH',
    'overview.lockedWeapon': 'Terkunci — Temukan di level terdahulu',

    // Gameplay HUD
    'hud.pickupTitle': (weapon: string) => `TEMUKAN: ${weapon.toUpperCase()}`,
    'hud.pickupHint': '[E / KLIK DISINI] AMBIL SENJATA',
    'hud.toastWeaponName': (weapon: string) => `SENJATA BARU: ${weapon.toUpperCase()}!`,
    'hud.toastWeaponDesc': (desc: string) => `${desc} Sekarang tersimpan di koleksi senjatamu.`,
    'hud.strike': (m: string) => `PUKUL ${m.toUpperCase()}!`,
    'hud.strikeKey': '[SPASI / KLIK KIRI / ENTER]',
    'hud.strikeBtn': (m: string) => `PUKUL ${m.toUpperCase()}`,
    'hud.strikeBtnHint': '[KLIK KIRI / SPASI]',
    'hud.mobileAttack': 'PUKUL',
    'hud.sprint': 'LARI',
    'hud.alert': 'WASPADA',
    'hud.desktopControlsHint':
      'WASD: Jalan | Shift: Lari | Mouse: Lihat Sekitar | Spasi / Klik Kiri: Serang',
    'hud.statusApproach': (m: string, w: string) =>
      `DEKATI ${m.toUpperCase()} & PUKUL DENGAN ${w.toUpperCase()}!`,
    'hud.statusEscape': 'LARI KE PINTU EXIT SEBELUM TERTANGKAP!',
    'hud.statusExitUnlocked': 'PINTU EXIT TERBUKA! CEPAT LARI KELUAR!',

    // Pause Menu
    'pause.title': 'GAME DIJEDA',
    'pause.resume': 'LANJUTKAN',
    'pause.restart': 'ULANGI LEVEL',
    'pause.settings': 'PENGATURAN',
    'pause.menu': 'MENU UTAMA',

    // Game Over
    'gameOver.title': 'KAMU TERTANGKAP',
    'gameOver.reasonGeneric': 'Monster mendeteksi keberadaanmu.',
    'gameOver.reasonMonster': (m: string) => `${m} berhasil menangkapmu!`,
    'gameOver.retry': 'COBA LAGI',
    'gameOver.menu': 'MENU UTAMA',

    // Level Complete
    'complete.title': 'BERHASIL KABUR!',
    'complete.levelLabel': 'LEVEL:',
    'complete.timeLabel': 'WAKTU KABUR:',
    'complete.statusLabel': 'STATUS:',
    'complete.status': 'SELESAI',
    'complete.next': 'LEVEL BERIKUTNYA',
    'complete.replay': 'MAIN LAGI',
    'complete.menu': 'MENU UTAMA',

    // Rotate to landscape prompt
    'landscape.title': 'PUTAR KE POSISI LANDSCAPE',
    'landscape.desc':
      'Untuk pengalaman layar penuh tanpa tab browser dan kontrol yang nyaman, putar HP Anda ke posisi mendatar (landscape).',
    'landscape.fullscreen': 'MASUK FULL SCREEN & LANDSCAPE',
    'landscape.dismiss': 'LANJUTKAN SAJA',

    // First Launch Language Modal
    'firstLaunch.title': 'PILIH BAHASA // SELECT LANGUAGE',
    'firstLaunch.desc': 'Silakan pilih bahasa yang ingin Anda gunakan dalam permainan:',
    'firstLaunch.confirm': 'SIMPAN & MULAI',

    // Monster names
    'monster.pocong': 'Pocong',
    'monster.kunti': 'Kuntilanak',
  },

  en: {
    // Main Menu
    'menu.title': 'MONSTER DUMB',
    'menu.subtitle': 'SURVIVAL HORROR // ESCAPE PROTOCOL',
    'menu.badge': 'PSX RETRO 3D',
    'menu.play': 'PLAY',
    'menu.levelSelect': 'LEVEL SELECT',
    'menu.settings': 'SETTINGS',
    'menu.copyright': '© 2026 MONSTER DUMB — PS1 SURVIVAL HORROR',
    'menu.headphones': 'HEADPHONES RECOMMENDED',

    // Level Select
    'levelSelect.title': 'LEVEL SELECTION',
    'levelSelect.back': 'BACK',
    'levelSelect.testMode': 'TEST MODE UNLOCKED',
    'levelSelect.locked': 'LOCKED',
    'levelSelect.unlocked': 'UNLOCKED',
    'levelSelect.completed': 'COMPLETED',
    'levelSelect.bestTime': 'BEST TIME',

    // Settings
    'settings.title': 'SYSTEM SETTINGS',
    'settings.back': 'BACK',
    'settings.audio': 'AUDIO',
    'settings.masterVol': 'Master Volume',
    'settings.sfxVol': 'Sound Effects',
    'settings.musicVol': 'Atmospheric Music',
    'settings.controls': 'CONTROLS',
    'settings.controlMode': 'Mobile Control Mode',
    'settings.modeSimple': 'Simple Joystick',
    'settings.modeFps': 'Advanced FPS',
    'settings.mouseSens': 'Mouse Sensitivity',
    'settings.touchSens': 'Touch Sensitivity',
    'settings.graphics': 'GRAPHICS',
    'settings.ps1Quality': 'PS1 Visual Quality',
    'settings.qualityLow': 'Low (PS1 240p)',
    'settings.qualityMed': 'Med (PS1 480p)',
    'settings.qualityHigh': 'High (Sharp)',
    'settings.languageGroup': 'LANGUAGE / BAHASA',
    'settings.languageLabel': 'Language Selection',
    'settings.langId': 'Bahasa Indonesia',
    'settings.langEn': 'English',

    // Overview / Loadout
    'overview.mission': (monster: string) =>
      `🎯 <strong>MISSION:</strong> Find & strike the <strong>${monster}</strong> in the maze, then sprint to the exit before getting caught!`,
    'overview.weaponTitle': '⚔ SELECT WEAPON ARSENAL',
    'overview.weaponSubtitle': 'Choose a weapon to strike the monster',
    'overview.weaponSubtitleTest':
      'Choose a funny item to awaken the monster <span style="color:#10b981; font-weight:bold; margin-left:6px;">[TEST MODE ACTIVE]</span>',
    'overview.startLevel': 'START LEVEL',
    'overview.mainMenu': 'MAIN MENU',
    'overview.selected': 'SELECTED',
    'overview.lockedWeapon': 'Locked — Find in previous levels',

    // Gameplay HUD
    'hud.pickupTitle': (weapon: string) => `FOUND: ${weapon.toUpperCase()}`,
    'hud.pickupHint': '[E / CLICK HERE] PICK UP WEAPON',
    'hud.toastWeaponName': (weapon: string) => `NEW WEAPON: ${weapon.toUpperCase()}!`,
    'hud.toastWeaponDesc': (desc: string) => `${desc} Now saved in your permanent collection.`,
    'hud.strike': (m: string) => `STRIKE ${m.toUpperCase()}!`,
    'hud.strikeKey': '[SPACE / LEFT CLICK / ENTER]',
    'hud.strikeBtn': (m: string) => `STRIKE ${m.toUpperCase()}`,
    'hud.strikeBtnHint': '[LEFT CLICK / SPACE]',
    'hud.mobileAttack': 'STRIKE',
    'hud.sprint': 'SPRINT',
    'hud.alert': 'ALERT',
    'hud.desktopControlsHint':
      'WASD: Walk | Shift: Sprint | Mouse: Look | Space / Left Click: Attack',
    'hud.statusApproach': (m: string, w: string) =>
      `APPROACH ${m.toUpperCase()} & STRIKE WITH ${w.toUpperCase()}!`,
    'hud.statusEscape': 'RUN TO THE EXIT DOOR BEFORE YOU ARE CAUGHT!',
    'hud.statusExitUnlocked': 'EXIT DOOR UNLOCKED! SPRINT OUT NOW!',

    // Pause Menu
    'pause.title': 'GAME PAUSED',
    'pause.resume': 'RESUME',
    'pause.restart': 'RESTART LEVEL',
    'pause.settings': 'SETTINGS',
    'pause.menu': 'MAIN MENU',

    // Game Over
    'gameOver.title': 'YOU WERE CAUGHT',
    'gameOver.reasonGeneric': 'The monster detected your presence.',
    'gameOver.reasonMonster': (m: string) => `The ${m} caught you!`,
    'gameOver.retry': 'RETRY LEVEL',
    'gameOver.menu': 'MAIN MENU',

    // Level Complete
    'complete.title': 'ESCAPED SAFELY!',
    'complete.levelLabel': 'LEVEL:',
    'complete.timeLabel': 'ESCAPE TIME:',
    'complete.statusLabel': 'STATUS:',
    'complete.status': 'COMPLETED',
    'complete.next': 'NEXT LEVEL',
    'complete.replay': 'REPLAY',
    'complete.menu': 'MAIN MENU',

    // Rotate to landscape prompt
    'landscape.title': 'ROTATE TO LANDSCAPE',
    'landscape.desc':
      'For full screen without browser tabs and comfortable controls, rotate your phone horizontally (landscape).',
    'landscape.fullscreen': 'ENTER FULL SCREEN & LANDSCAPE',
    'landscape.dismiss': 'CONTINUE ANYWAY',

    // First Launch Language Modal
    'firstLaunch.title': 'SELECT LANGUAGE // PILIH BAHASA',
    'firstLaunch.desc': 'Please select your preferred language for the game:',
    'firstLaunch.confirm': 'SAVE & START',

    // Monster names
    'monster.pocong': 'Pocong',
    'monster.kunti': 'Kuntilanak',
  },
};

// Level definitions dictionary (titles, subtitles, descriptions)
export interface LevelLocalization {
  title: string;
  subtitle: string;
  description: string;
}

const LEVEL_LOCALIZATION: Record<Language, Record<number, LevelLocalization>> = {
  id: {
    1: {
      title: 'KEBUN PISANG ANGKER',
      subtitle: 'SEKTOR 01 — MALAM GELAP POHON PISANG',
      description: 'Pocong berkeliaran di antara deretan pohon pisang gelap. Dekati dari belakang dan hantam dengan Tongkat Baseball!',
    },
    2: {
      title: 'SEKOLAH TERBENGKALAI',
      subtitle: 'SEKTOR 02 — LORONG KOSONG (2 LANTAI)',
      description: 'Sekolah tua berdebu 2 lantai dengan tangga dan jembatan mezanin. Carilah Wajan Penggorengan untuk memukul Kuntilanak!',
    },
    3: {
      title: 'LABIRIN BETON',
      subtitle: 'SEKTOR 03 — RUANG BAWAH TANAH (2 LANTAI)',
      description: 'Labirin beton bertingkat 2 lantai dengan tangga dan lorong jebakan. Ikuti petunjuk panah di dinding untuk menemukan tangga ke lantai 2!',
    },
    4: {
      title: 'RUMAH SAKIT TUA',
      subtitle: 'SEKTOR 04 — KORIDOR STERIL (3 LANTAI)',
      description: 'Bangsal rumah sakit 3 lantai dengan ranjang berkarat dan jembatan goyang. Temukan Sapu Ijuk legendaris di ruang cleaning!',
    },
    5: {
      title: 'GORONG-GORONG',
      subtitle: 'SEKTOR 05 — DEPOT PEMBUANGAN (2 LANTAI)',
      description: 'Saluran pembuangan 2 tingkat dengan jembatan kayu retak patah (Broken Bridge)! Hati-hati jangan jatuh ke jurang limbah!',
    },
    6: {
      title: 'PABRIK TERBENGKALAI',
      subtitle: 'SEKTOR 06 — AREA MESIN INDUSTRI (3 LANTAI)',
      description: 'Pabrik industri 3 lantai penuh pipa bertekanan, jembatan gantung goyang, dan mesin tua berdengung.',
    },
    7: {
      title: 'HOTEL BERHANTU',
      subtitle: 'SEKTOR 07 — LORONG BERKARPET (2 LANTAI)',
      description: 'Hotel tua bernuansa merah darah dengan lorong labirin panjang dan pintu-pintu misterius.',
    },
    8: {
      title: 'STASIUN METRO BAWAH TANAH',
      subtitle: 'SEKTOR 08 — PERON LORONG METRO (3 LANTAI)',
      description: 'Stasiun metro 3 lantai yang gelap dengan jalur rel berkarat, peron terbengkalai, dan jembatan layang.',
    },
    9: {
      title: 'LABORATORIUM BAWAH TANAH',
      subtitle: 'SEKTOR 09 — FASILITAS PENELITIAN (3 LANTAI)',
      description: 'Fasilitas rahasia bawah tanah dengan saklar darurat. Aktifkan saklar untuk membuka pintu keluar!',
    },
    10: {
      title: 'SARANG ABYSS',
      subtitle: 'SEKTOR 10 — KEDALAMAN GELAP TERAKHIR (4 LANTAI)',
      description: 'Puncak kegelapan 4 lantai dengan 3 monster sekaligus, jembatan retak rapuh, dan tantangan pelarian paling mematikan.',
    },
  },
  en: {
    1: {
      title: 'HAUNTED BANANA GROVE',
      subtitle: 'SECTOR 01 — DARK BANANA GROVE',
      description: 'A Pocong roams among dark banana trees. Sneak up from behind and strike it with your Baseball Bat!',
    },
    2: {
      title: 'ABANDONED SCHOOL',
      subtitle: 'SECTOR 02 — DESERTED HALLWAYS (2 FLOORS)',
      description: 'A dusty 2-floor old school with stairs and a mezzanine bridge. Find the Frying Pan to strike the Kuntilanak!',
    },
    3: {
      title: 'THE LABYRINTH',
      subtitle: 'SECTOR 03 — CONCRETE UNDERGROUND (2 FLOORS)',
      description: 'A 2-floor concrete labyrinth with stairs and tricky dead-ends. Follow arrow markings on walls to find the stairs to the 2nd floor!',
    },
    4: {
      title: 'THE HOSPITAL',
      subtitle: 'SECTOR 04 — STERILE CORRIDORS (3 FLOORS)',
      description: 'A 3-floor hospital ward with rusted beds and swaying bridges. Find the legendary Broom in the cleaning room!',
    },
    5: {
      title: 'THE SEWER',
      subtitle: 'SECTOR 05 — DRAINAGE DEPOT (2 FLOORS)',
      description: 'A 2-floor sewer canal with cracked broken bridges! Be careful not to fall into the hazardous abyss!',
    },
    6: {
      title: 'THE FACTORY',
      subtitle: 'SECTOR 06 — INDUSTRIAL MACHINERY (3 FLOORS)',
      description: 'A 3-floor industrial factory with pressure pipes, swaying bridges, and humming heavy machinery.',
    },
    7: {
      title: 'HAUNTED HOTEL',
      subtitle: 'SECTOR 07 — CARPETED CORRIDORS (2 FLOORS)',
      description: 'An eerie vintage hotel with crimson carpets, winding hallways, and mysterious guest rooms.',
    },
    8: {
      title: 'SUBWAY STATION',
      subtitle: 'SECTOR 08 — METRO PLATFORMS (3 FLOORS)',
      description: 'A dark 3-floor metro station with rusted tracks, abandoned platforms, and overhead catwalks.',
    },
    9: {
      title: 'UNDERGROUND LAB',
      subtitle: 'SECTOR 09 — RESEARCH COMPLEX (3 FLOORS)',
      description: 'A subterranean top-secret research facility. Activate the emergency terminal switch to unlock the blast door!',
    },
    10: {
      title: 'THE ABYSS',
      subtitle: 'SECTOR 10 — FINAL ABYSS (4 FLOORS)',
      description: 'The ultimate 4-floor nightmare with 3 deadly monsters, unstable fragile bridges, and the ultimate escape challenge.',
    },
  },
};

// Weapons localization dictionary
export interface WeaponLocalization {
  name: string;
  description: string;
}

const WEAPON_LOCALIZATION: Record<Language, Record<string, WeaponLocalization>> = {
  id: {
    baseball_bat: {
      name: 'Baseball Bat',
      description: 'Tongkat kayu klasik andalan. Ayunan seimbang dan mantap.',
    },
    grenade: {
      name: 'Granat Nanas',
      description: 'Granat militer berdaya ledak tinggi. Dapat dilempar dari jauh ke arah monster!',
    },
    frying_pan: {
      name: 'Wajan Penggorengan',
      description: 'Wajan besi tebal dapur nenek. Mengeluarkan dentang logam dahsyat!',
    },
    machine_gun: {
      name: 'Senapan Mesin',
      description: 'Senapan serbu otomatis berkekuatan tinggi. Tembak monster dari kejauhan!',
    },
    chair: {
      name: 'Kursi Kayu',
      description: 'Kursi kayu jati berat. Diangkat tinggi dan dihantamkan sekaligus!',
    },
    broom: {
      name: 'Sapu Ijuk',
      description: 'Sapu ijuk gagang bambu ringan. Sapuan cepat mengejutkan monster.',
    },
    spatula: {
      name: 'Spatula Raksasa',
      description: 'Sodetan masak stainless steel ukuran jumbo. Menampar punggung monster.',
    },
    toy_hammer: {
      name: 'Palu Mainan',
      description: 'Palu plastik warna-warni yang menghasilkan bunyi pegas kartun lucu.',
    },
    electric_fan: {
      name: 'Kipas Angin',
      description: 'Kipas angin meja tua yang berat. Ayunan canggung dengan dentuman unik.',
    },
  },
  en: {
    baseball_bat: {
      name: 'Baseball Bat',
      description: 'Classic trusty wooden bat. Balanced and solid swing.',
    },
    grenade: {
      name: 'Hand Grenade',
      description: 'High-explosive military grenade. Can be thrown at the monster from afar!',
    },
    frying_pan: {
      name: 'Frying Pan',
      description: 'Grandma heavy cast-iron skillet. Delivers a deafening metallic clank!',
    },
    machine_gun: {
      name: 'Machine Gun',
      description: 'High-firepower automatic assault rifle. Shoot monsters from safe range!',
    },
    chair: {
      name: 'Wooden Chair',
      description: 'Heavy solid teak chair. Lifted high overhead and slammed down hard!',
    },
    broom: {
      name: 'Broom',
      description: 'Lightweight palm-fiber broom. Quick sweeping strike that startles monsters.',
    },
    spatula: {
      name: 'Giant Spatula',
      description: 'Jumbo stainless kitchen spatula. Slaps monsters squarely on the back.',
    },
    toy_hammer: {
      name: 'Toy Hammer',
      description: 'Colorful plastic squeaky toy hammer with funny cartoon spring sounds.',
    },
    electric_fan: {
      name: 'Electric Fan',
      description: 'Heavy vintage oscillating desk fan. Clunky swing with a unique thud.',
    },
  },
};

export class LocalizationManager {
  private static instance: LocalizationManager;
  private currentLanguage: Language = 'id';
  private listeners: Array<(lang: Language) => void> = [];

  private constructor() {
    const saved = SaveManager.getInstance().getLanguage();
    if (saved === 'id' || saved === 'en') {
      this.currentLanguage = saved;
    }
  }

  public static getInstance(): LocalizationManager {
    if (!LocalizationManager.instance) {
      LocalizationManager.instance = new LocalizationManager();
    }
    return LocalizationManager.instance;
  }

  public getLanguage(): Language {
    return this.currentLanguage;
  }

  public setLanguage(lang: Language): void {
    if (this.currentLanguage === lang) return;
    this.currentLanguage = lang;
    SaveManager.getInstance().setLanguage(lang);
    this.translateDOM();
    for (const listener of this.listeners) {
      try {
        listener(lang);
      } catch (e) {
        console.error('Error in language change listener:', e);
      }
    }
  }

  public onLanguageChanged(callback: (lang: Language) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  public t(key: string, ...args: any[]): string {
    const dict = TRANSLATIONS[this.currentLanguage];
    const val = dict[key] ?? TRANSLATIONS['id'][key];
    if (typeof val === 'function') {
      return val(...args);
    }
    if (typeof val === 'string') {
      return val;
    }
    return key;
  }

  public getLevelInfo(levelId: number): LevelLocalization {
    const langDict = LEVEL_LOCALIZATION[this.currentLanguage];
    if (langDict && langDict[levelId]) {
      return langDict[levelId];
    }
    return LEVEL_LOCALIZATION['id'][levelId] || {
      title: `LEVEL ${levelId}`,
      subtitle: `SECTOR ${levelId}`,
      description: '',
    };
  }

  public getWeaponInfo(weaponId: string): WeaponLocalization {
    const langDict = WEAPON_LOCALIZATION[this.currentLanguage];
    if (langDict && langDict[weaponId]) {
      return langDict[weaponId];
    }
    return WEAPON_LOCALIZATION['id'][weaponId] || {
      name: weaponId,
      description: '',
    };
  }

  /**
   * Automatically updates all DOM elements marked with [data-i18n]
   */
  public translateDOM(root: HTMLElement | Document = document): void {
    const elements = root.querySelectorAll('[data-i18n]');
    elements.forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        const text = this.t(key);
        // If string contains html tags, set innerHTML, else textContent
        if (/<[a-z][\s\S]*>/i.test(text)) {
          el.innerHTML = text;
        } else {
          el.textContent = text;
        }
      }
    });

    const placeholders = root.querySelectorAll('[data-i18n-placeholder]');
    placeholders.forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key && el instanceof HTMLInputElement) {
        el.placeholder = this.t(key);
      }
    });

    const titles = root.querySelectorAll('[data-i18n-title]');
    titles.forEach((el) => {
      const key = el.getAttribute('data-i18n-title');
      if (key && el instanceof HTMLElement) {
        el.title = this.t(key);
      }
    });
  }
}
