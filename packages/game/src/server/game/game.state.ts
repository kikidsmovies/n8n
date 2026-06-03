import { ItemType } from './items/item.types'

export const MAX_HP = 100
export const PLAYER_RADIUS = 0.4
export const MOVE_SPEED = 5.0

export interface Vec2 {
  x: number
  z: number
}

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface ActiveEffect {
  type: ItemType
  expiresAt: number
  speedMultiplier?: number
  shieldHp?: number
}

export interface PlayerState {
  id: string
  dbId: string
  username: string
  position: Vec2
  rotation: number
  hp: number
  maxHp: number
  weaponId: string
  skinId: string
  lastShotAt: number
  collectedDiamonds: number
  kills: number
  effects: ActiveEffect[]
  isDead: boolean
  respawnAt: number
  isSlowed: boolean
  slowUntil: number
  inputSeq: number
}

export interface ProjectileState {
  id: string
  ownerId: string
  weaponId: string
  position: Vec3
  direction: Vec3
  speed: number
  range: number
  distanceTraveled: number
  damage: number
  aoeRadius: number
  slowPercent: number
  slowDurationMs: number
  createdAt: number
}

export interface ItemBoxState {
  id: string
  cellX: number
  cellZ: number
  worldX: number
  worldZ: number
  type: ItemType
  isActive: boolean
  respawnAt: number
}

export interface GameEvent {
  type: string
  [key: string]: unknown
}

export interface DeltaSnapshot {
  tick: number
  players: Record<string, Partial<PlayerState>>
  projectiles: ProjectileState[]
  events: GameEvent[]
  itemBoxes?: Record<string, Partial<ItemBoxState>>
}
