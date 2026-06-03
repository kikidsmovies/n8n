import { Request, Response, NextFunction } from 'express'
import { authService } from './auth.service'

export interface AuthRequest extends Request {
  playerId?: string
  username?: string
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing token' })
    return
  }
  try {
    const payload = authService.verifyToken(header.slice(7))
    req.playerId = payload.playerId
    req.username = payload.username
    next()
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
}
