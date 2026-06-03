import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { config } from '../config'
import { playerRepository } from '../db/repositories/player.repository'

export interface JwtPayload {
  playerId: string
  username: string
}

export const authService = {
  async register(username: string, password: string) {
    if (username.length < 3 || username.length > 20) {
      throw new Error('Username must be 3–20 characters')
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      throw new Error('Username can only contain letters, numbers, and underscores')
    }
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters')
    }
    const existing = playerRepository.findByUsername(username)
    if (existing) throw new Error('Username already taken')

    const hash = await bcrypt.hash(password, 10)
    const player = playerRepository.create(username, hash)
    const token = this.issueToken(player.id, player.username)
    return { token, player }
  },

  async login(username: string, password: string) {
    const player = playerRepository.findByUsername(username)
    if (!player) throw new Error('Invalid credentials')

    const valid = await bcrypt.compare(password, player.password_hash)
    if (!valid) throw new Error('Invalid credentials')

    const token = this.issueToken(player.id, player.username)
    return { token, player }
  },

  issueToken(playerId: string, username: string): string {
    return jwt.sign({ playerId, username } satisfies JwtPayload, config.jwtSecret, {
      expiresIn: config.jwtExpiresIn,
    } as jwt.SignOptions)
  },

  verifyToken(token: string): JwtPayload {
    return jwt.verify(token, config.jwtSecret) as JwtPayload
  },
}
