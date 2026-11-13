export type WeaponId =
  | 'baseball_bat'
  | 'grenade'
  | 'signboard'
  | 'frying_pan'
  | 'slipper'
  | 'chair'
  | 'broom'
  | 'spatula'
  | 'toy_hammer'
  | 'electric_fan';

export type WeaponSwingType = 'standard' | 'heavy' | 'fast' | 'overhead' | 'throw';

export type WeaponImpactSound =
  | 'bat'
  | 'metallic'
  | 'slap'
  | 'wooden'
  | 'boing'
  | 'fan'
  | 'explosion';

export type MonsterReactionType =
  | 'snap'
  | 'surprise'
  | 'stagger'
  | 'slap'
  | 'wobble';

export interface WeaponDefinition {
  id: WeaponId;
  name: string;
  nameId: string; // Indonesian title
  description: string;
  swingDuration: number;
  swingType: WeaponSwingType;
  impactSound: WeaponImpactSound;
  monsterReaction: MonsterReactionType;
  defaultUnlocked?: boolean;
}

export const ALL_WEAPONS: WeaponDefinition[] = [
  {
    id: 'baseball_bat',
    name: 'Baseball Bat',
    nameId: 'Baseball Bat',
    description: 'Tongkat kayu klasik andalan. Ayunan seimbang dan mantap.',
    swingDuration: 0.38,
    swingType: 'standard',
    impactSound: 'bat',
    monsterReaction: 'snap',
    defaultUnlocked: true,
  },
  {
    id: 'grenade',
    name: 'Hand Grenade',
    nameId: 'Granat Nanas',
    description: 'Granat militer berdaya ledak tinggi. Dapat dilempar dari jauh ke arah monster!',
    swingDuration: 0.55,
    swingType: 'throw',
    impactSound: 'explosion',
    monsterReaction: 'stagger',
  },
  {
    id: 'frying_pan',
    name: 'Frying Pan',
    nameId: 'Wajan Penggorengan',
    description: 'Wajan besi tebal dapur nenek. Mengeluarkan dentang logam dahsyat!',
    swingDuration: 0.35,
    swingType: 'fast',
    impactSound: 'metallic',
    monsterReaction: 'surprise',
  },
  {
    id: 'slipper',
    name: 'Giant Slipper',
    nameId: 'Sandal Jepit Raksasa',
    description: 'Sandal karet legendaris berukuran raksasa. Menghasilkan suara plak komedi!',
    swingDuration: 0.28,
    swingType: 'fast',
    impactSound: 'slap',
    monsterReaction: 'slap',
  },
  {
    id: 'chair',
    name: 'Wooden Chair',
    nameId: 'Kursi Kayu',
    description: 'Kursi kayu jati berat. Diangkat tinggi dan dihantamkan sekaligus!',
    swingDuration: 0.58,
    swingType: 'overhead',
    impactSound: 'wooden',
    monsterReaction: 'stagger',
  },
  {
    id: 'broom',
    name: 'Broom',
    nameId: 'Sapu Ijuk',
    description: 'Sapu ijuk gagang bambu ringan. Sapuan cepat mengejutkan Pocong.',
    swingDuration: 0.32,
    swingType: 'standard',
    impactSound: 'slap',
    monsterReaction: 'snap',
  },
  {
    id: 'spatula',
    name: 'Giant Spatula',
    nameId: 'Spatula Raksasa',
    description: 'Sodetan masak stainless steel ukuran jumbo. Menampar punggung Pocong.',
    swingDuration: 0.34,
    swingType: 'fast',
    impactSound: 'metallic',
    monsterReaction: 'surprise',
  },
  {
    id: 'toy_hammer',
    name: 'Toy Hammer',
    nameId: 'Palu Mainan',
    description: 'Palu plastik warna-warni yang menghasilkan bunyi pegas kartun lucu.',
    swingDuration: 0.30,
    swingType: 'fast',
    impactSound: 'boing',
    monsterReaction: 'wobble',
  },
  {
    id: 'electric_fan',
    name: 'Electric Fan',
    nameId: 'Kipas Angin',
    description: 'Kipas angin meja tua yang berat. Ayunan canggung dengan dentuman unik.',
    swingDuration: 0.54,
    swingType: 'heavy',
    impactSound: 'fan',
    monsterReaction: 'stagger',
  },
];

export const WEAPON_MAP: Record<WeaponId, WeaponDefinition> = ALL_WEAPONS.reduce(
  (acc, w) => {
    acc[w.id] = w;
    return acc;
  },
  {} as Record<WeaponId, WeaponDefinition>
);

// Backward-compatibility alias for signboard
if (WEAPON_MAP['grenade']) {
  WEAPON_MAP['signboard'] = WEAPON_MAP['grenade'];
}
