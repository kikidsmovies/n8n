import { v4 as uuidv4 } from 'uuid'
import { getDb } from '../database'

export interface PlayerRow {
  id: string
  username: string
  password_hash: string
  diamonds: number
  total_wins: number
  total_kills: number
  total_games: number
  active_skin_id: string
  active_weapon_id: string
  created_at: number
  updated_at: number
}

export const playerRepository = {
  create(username: string, passwordHash: string): PlayerRow {
    const db = getDb()
    const id = uuidv4()
    db.prepare(
      `INSERT INTO players (id, username, password_hash) VALUES (?, ?, ?)`,
    ).run(id, username, passwordHash)
    return this.findById(id)!
  },

  findByUsername(username: string): PlayerRow | undefined {
    return getDb()
      .prepare('SELECT * FROM players WHERE username = ?')
      .get(username) as PlayerRow | undefined
  },

  findById(id: string): PlayerRow | undefined {
    return getDb()
      .prepare('SELECT * FROM players WHERE id = ?')
      .get(id) as PlayerRow | undefined
  },

  addDiamonds(playerId: string, amount: number, reason: string, metadata?: object): void {
    const db = getDb()
    const txId = uuidv4()
    const tx = db.transaction(() => {
      db.prepare('UPDATE players SET diamonds = diamonds + ?, updated_at = unixepoch() WHERE id = ?').run(
        amount,
        playerId,
      )
      db.prepare(
        'INSERT INTO diamond_transactions (id, player_id, amount, reason, metadata) VALUES (?, ?, ?, ?, ?)',
      ).run(txId, playerId, amount, reason, metadata ? JSON.stringify(metadata) : null)
    })
    tx()
  },

  spendDiamonds(playerId: string, amount: number, reason: string, metadata?: object): boolean {
    const db = getDb()
    const txId = uuidv4()
    let success = false
    const tx = db.transaction(() => {
      const result = db
        .prepare(
          'UPDATE players SET diamonds = diamonds - ?, updated_at = unixepoch() WHERE id = ? AND diamonds >= ?',
        )
        .run(amount, playerId, amount)
      if (result.changes > 0) {
        db.prepare(
          'INSERT INTO diamond_transactions (id, player_id, amount, reason, metadata) VALUES (?, ?, ?, ?, ?)',
        ).run(txId, playerId, -amount, reason, metadata ? JSON.stringify(metadata) : null)
        success = true
      }
    })
    tx()
    return success
  },

  incrementStats(playerId: string, wins: number, kills: number): void {
    getDb()
      .prepare(
        'UPDATE players SET total_wins = total_wins + ?, total_kills = total_kills + ?, total_games = total_games + 1, updated_at = unixepoch() WHERE id = ?',
      )
      .run(wins, kills, playerId)
  },

  updateEquipment(playerId: string, skinId: string | null, weaponId: string | null): void {
    const db = getDb()
    if (skinId) db.prepare('UPDATE players SET active_skin_id = ? WHERE id = ?').run(skinId, playerId)
    if (weaponId) db.prepare('UPDATE players SET active_weapon_id = ? WHERE id = ?').run(weaponId, playerId)
  },
}
