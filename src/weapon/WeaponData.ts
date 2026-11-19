export type WeaponId =
  | 'baseball_bat'
  | 'grenade'
  | 'signboard'
  | 'frying_pan'
  | 'machine_gun'
  | 'slipper'
  | 'chair'
  | 'broom'
  | 'spatula'
  | 'toy_hammer'
  | 'electric_fan'
  | 'rasengan'
  | 'kamehameha';

export type WeaponSwingType = 'standard' | 'heavy' | 'fast' | 'overhead' | 'throw' | 'shoot';

export type WeaponImpactSound =
  | 'bat'
  | 'metallic'
  | 'slap'
  | 'wooden'
  | 'boing'
  | 'fan'
  | 'explosion'
  | 'gunshot'
  | 'energy_sphere'
  | 'beam';

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
    id: 'machine_gun',
    name: 'Machine Gun',
    nameId: 'Senapan Mesin',
    description: 'Senapan serbu otomatis berkekuatan tinggi. Tembak monster dari kejauhan!',
    swingDuration: 0.46,
    swingType: 'shoot',
    impactSound: 'gunshot',
    monsterReaction: 'stagger',
  },
  {
    id: 'rasengan',
    name: 'Rasengan',
    nameId: 'Rasengan',
    description: 'Bola energi chakra spiral biru berkecepatan tinggi. Hantamkan ke tubuh monster!',
    swingDuration: 0.32,
    swingType: 'fast',
    impactSound: 'energy_sphere',
    monsterReaction: 'wobble',
  },
  {
    id: 'kamehameha',
    name: 'Kamehameha',
    nameId: 'Kamehameha',
    description: 'Pancaran sinar energi dahsyat. Tembakkan balok energi lurus dari jarak jauh!',
    swingDuration: 0.50,
    swingType: 'shoot',
    impactSound: 'beam',
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

// Backward-compatibility aliases
if (WEAPON_MAP['grenade']) {
  WEAPON_MAP['signboard'] = WEAPON_MAP['grenade'];
}
if (WEAPON_MAP['machine_gun']) {
  WEAPON_MAP['slipper'] = WEAPON_MAP['machine_gun'];
}
if (WEAPON_MAP['rasengan']) {
  WEAPON_MAP['toy_hammer'] = WEAPON_MAP['rasengan'];
}
if (WEAPON_MAP['kamehameha']) {
  WEAPON_MAP['electric_fan'] = WEAPON_MAP['kamehameha'];
}
