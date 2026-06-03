export interface WeaponDefinition {
  id: string
  name: string
  damage: number
  fireRateMs: number
  projectileSpeed: number
  range: number
  spreadDeg: number
  projectileCount: number
  aoeRadius: number
  slowPercent: number
  slowDurationMs: number
  isDefault: boolean
}
