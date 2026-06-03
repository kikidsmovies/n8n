export type ItemType = 'speed' | 'shield' | 'teleport' | 'health' | 'diamond'

export interface Vec2 { x: number; z: number }
export interface Vec3 { x: number; y: number; z: number }

export interface ActiveEffect {
  type: ItemType
  expiresAt: number
  speedMultiplier?: number
  shieldHp?: number
}

export interface PlayerState {
  id: string
  username: string
  position: Vec2
  rotation: number
  hp: number
  maxHp: number
  weaponId: string
  skinId: string
  collectedDiamonds: number
  kills: number
  effects: ActiveEffect[]
  isDead: boolean
  inputSeq?: number
}

export interface ProjectileState {
  id: string
  ownerId: string
  weaponId: string
  position: Vec3
  direction: Vec3
  speed: number
}

export interface ItemBoxState {
  id: string
  cellX: number
  cellZ: number
  worldX: number
  worldZ: number
  type: ItemType
  isActive: boolean
}

export interface MazeData {
  seed: number
  width: number
  height: number
  cells: number[]
}

export interface GameStartPayload {
  roomId: string
  maze: MazeData
  players: PlayerState[]
  itemBoxes: ItemBoxState[]
}

export interface DeltaSnapshot {
  tick: number
  players: Record<string, Partial<PlayerState>>
  projectiles: ProjectileState[]
  events: Array<{ type: string; [key: string]: unknown }>
}

export interface PlayerProfile {
  id: string
  username: string
  diamonds: number
  totalWins: number
  totalKills: number
  totalGames: number
  activeSkinId: string
  activeWeaponId: string
  inventory: Array<{ itemId: string; itemType: 'skin' | 'weapon' }>
}

export interface ShopItem {
  id: string
  type: 'weapon' | 'skin'
  name: string
  description: string
  cost: number
  isDefault?: boolean
  previewColor?: string
}
