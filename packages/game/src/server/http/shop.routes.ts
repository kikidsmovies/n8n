import { Router } from 'express'
import { authMiddleware, AuthRequest } from '../auth/auth.middleware'
import { playerRepository } from '../db/repositories/player.repository'
import { inventoryRepository } from '../db/repositories/inventory.repository'
import { SHOP_CATALOG, findShopItem } from '../game/shop/shop.catalog'

const router = Router()

router.get('/items', (req, res) => {
  res.json({ items: SHOP_CATALOG })
})

router.post('/buy', authMiddleware, (req: AuthRequest, res) => {
  const { itemId, equipAfterBuy } = req.body
  if (!itemId) {
    res.status(400).json({ error: 'itemId required' })
    return
  }

  const item = findShopItem(itemId)
  if (!item) {
    res.status(404).json({ error: 'Item not found' })
    return
  }

  if (inventoryRepository.ownsItem(req.playerId!, itemId)) {
    if (equipAfterBuy) {
      playerRepository.updateEquipment(
        req.playerId!,
        item.type === 'skin' ? itemId : null,
        item.type === 'weapon' ? itemId : null,
      )
      res.json({ success: true, alreadyOwned: true })
    } else {
      res.status(409).json({ error: 'Already owned' })
    }
    return
  }

  const player = playerRepository.findById(req.playerId!)!
  if (player.diamonds < item.cost) {
    res.status(402).json({ error: 'Not enough diamonds', required: item.cost, have: player.diamonds })
    return
  }

  const spent = playerRepository.spendDiamonds(req.playerId!, item.cost, 'shop_purchase', { itemId })
  if (!spent) {
    res.status(402).json({ error: 'Not enough diamonds' })
    return
  }

  inventoryRepository.addItem(req.playerId!, itemId, item.type)

  if (equipAfterBuy) {
    playerRepository.updateEquipment(
      req.playerId!,
      item.type === 'skin' ? itemId : null,
      item.type === 'weapon' ? itemId : null,
    )
  }

  const updated = playerRepository.findById(req.playerId!)!
  res.json({ success: true, newBalance: updated.diamonds })
})

router.post('/equip', authMiddleware, (req: AuthRequest, res) => {
  const { itemId } = req.body
  if (!itemId) {
    res.status(400).json({ error: 'itemId required' })
    return
  }
  const item = findShopItem(itemId)
  if (!item) {
    res.status(404).json({ error: 'Item not found' })
    return
  }
  if (!item.isDefault && !inventoryRepository.ownsItem(req.playerId!, itemId)) {
    res.status(403).json({ error: 'Item not owned' })
    return
  }
  playerRepository.updateEquipment(
    req.playerId!,
    item.type === 'skin' ? itemId : null,
    item.type === 'weapon' ? itemId : null,
  )
  res.json({ success: true })
})

export default router
