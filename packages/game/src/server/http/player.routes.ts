import { Router } from 'express'
import { authMiddleware, AuthRequest } from '../auth/auth.middleware'
import { playerRepository } from '../db/repositories/player.repository'
import { inventoryRepository } from '../db/repositories/inventory.repository'

const router = Router()

router.get('/me', authMiddleware, (req: AuthRequest, res) => {
  const player = playerRepository.findById(req.playerId!)
  if (!player) {
    res.status(404).json({ error: 'Player not found' })
    return
  }
  const inventory = inventoryRepository.getInventory(player.id)
  res.json({
    id: player.id,
    username: player.username,
    diamonds: player.diamonds,
    totalWins: player.total_wins,
    totalKills: player.total_kills,
    totalGames: player.total_games,
    activeSkinId: player.active_skin_id,
    activeWeaponId: player.active_weapon_id,
    inventory: inventory.map((i) => ({ itemId: i.item_id, itemType: i.item_type })),
  })
})

export default router
