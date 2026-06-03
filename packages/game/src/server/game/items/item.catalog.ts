import { ItemDefinition, ItemType } from './item.types'

export const ITEMS: Record<ItemType, ItemDefinition> = {
  speed: {
    type: 'speed',
    name: 'Speed Boost',
    durationMs: 5000,
    respawnMs: 15000,
    color: 0x00ffcc,
    speedMultiplier: 1.8,
    diamondRange: [0, 0],
  },
  shield: {
    type: 'shield',
    name: 'Shield',
    durationMs: 0,
    respawnMs: 20000,
    color: 0x4488ff,
    shieldHp: 80,
    diamondRange: [0, 0],
  },
  teleport: {
    type: 'teleport',
    name: 'Teleport',
    durationMs: 0,
    respawnMs: 25000,
    color: 0xaa44ff,
    diamondRange: [0, 0],
  },
  health: {
    type: 'health',
    name: 'Health Pack',
    durationMs: 0,
    respawnMs: 12000,
    color: 0x44ff44,
    healAmount: 50,
    diamondRange: [0, 0],
  },
  diamond: {
    type: 'diamond',
    name: 'Diamond Box',
    durationMs: 0,
    respawnMs: 30000,
    color: 0x88eeff,
    diamondRange: [5, 15],
  },
}
