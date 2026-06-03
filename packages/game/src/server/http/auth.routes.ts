import { Router } from 'express'
import { authService } from '../auth/auth.service'

const router = Router()

router.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      res.status(400).json({ error: 'username and password required' })
      return
    }
    const { token, player } = await authService.register(username, password)
    res.json({
      token,
      player: {
        id: player.id,
        username: player.username,
        diamonds: player.diamonds,
        activeSkinId: player.active_skin_id,
        activeWeaponId: player.active_weapon_id,
      },
    })
  } catch (e: unknown) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Registration failed' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      res.status(400).json({ error: 'username and password required' })
      return
    }
    const { token, player } = await authService.login(username, password)
    res.json({
      token,
      player: {
        id: player.id,
        username: player.username,
        diamonds: player.diamonds,
        activeSkinId: player.active_skin_id,
        activeWeaponId: player.active_weapon_id,
      },
    })
  } catch (e: unknown) {
    res.status(401).json({ error: e instanceof Error ? e.message : 'Login failed' })
  }
})

export default router
