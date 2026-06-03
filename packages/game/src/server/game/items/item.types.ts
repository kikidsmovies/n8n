export type ItemType = 'speed' | 'shield' | 'teleport' | 'health' | 'diamond'

export interface ItemDefinition {
  type: ItemType
  name: string
  durationMs: number
  respawnMs: number
  color: number
  speedMultiplier?: number
  shieldHp?: number
  healAmount?: number
  diamondRange: [number, number]
}
