import { WeaponDefinition } from './weapon.types'

export const WEAPONS: Record<string, WeaponDefinition> = {
  blaster: {
    id: 'blaster',
    name: 'Blaster',
    damage: 25,
    fireRateMs: 300,
    projectileSpeed: 18,
    range: 20,
    spreadDeg: 0,
    projectileCount: 1,
    aoeRadius: 0,
    slowPercent: 0,
    slowDurationMs: 0,
    isDefault: true,
  },
  shotgun: {
    id: 'shotgun',
    name: 'Shotgun',
    damage: 15,
    fireRateMs: 800,
    projectileSpeed: 16,
    range: 10,
    spreadDeg: 15,
    projectileCount: 3,
    aoeRadius: 0,
    slowPercent: 0,
    slowDurationMs: 0,
    isDefault: false,
  },
  rocket: {
    id: 'rocket',
    name: 'Rocket Launcher',
    damage: 60,
    fireRateMs: 1500,
    projectileSpeed: 12,
    range: 25,
    spreadDeg: 0,
    projectileCount: 1,
    aoeRadius: 2.5,
    slowPercent: 0,
    slowDurationMs: 0,
    isDefault: false,
  },
  frost_ray: {
    id: 'frost_ray',
    name: 'Frost Ray',
    damage: 10,
    fireRateMs: 100,
    projectileSpeed: 20,
    range: 18,
    spreadDeg: 0,
    projectileCount: 1,
    aoeRadius: 0,
    slowPercent: 40,
    slowDurationMs: 1000,
    isDefault: false,
  },
}

export function getWeapon(id: string): WeaponDefinition {
  return WEAPONS[id] ?? WEAPONS.blaster
}
