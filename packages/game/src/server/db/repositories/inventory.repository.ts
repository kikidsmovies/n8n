import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../database'

export interface InventoryItem {
  id: string
  player_id: string
  item_id: string
  item_type: 'skin' | 'weapon'
  obtained_at: number
}

export const inventoryRepository = {
  addItem(playerId: string, itemId: string, itemType: 'skin' | 'weapon'): boolean {
    try {
      getDb()
        .prepare(
          'INSERT INTO player_inventory (id, player_id, item_id, item_type) VALUES (?, ?, ?, ?)',
        )
        .run(uuidv4(), playerId, itemId, itemType)
      return true
    } catch {
      return false
    }
  },

  ownsItem(playerId: string, itemId: string): boolean {
    const row = getDb()
      .prepare('SELECT id FROM player_inventory WHERE player_id = ? AND item_id = ?')
      .get(playerId, itemId)
    return !!row
  },

  getInventory(playerId: string): InventoryItem[] {
    return getDb()
      .prepare('SELECT * FROM player_inventory WHERE player_id = ? ORDER BY obtained_at DESC')
      .all(playerId) as InventoryItem[]
  },
}
