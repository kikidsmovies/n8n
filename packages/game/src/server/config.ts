import path from 'path'

export const config = {
  port: parseInt(process.env.GAME_PORT ?? '3333', 10),
  dbPath: process.env.GAME_DB_PATH ?? path.join(__dirname, '../../game.db'),
  jwtSecret: process.env.GAME_JWT_SECRET ?? 'maze-game-secret-change-in-prod',
  jwtExpiresIn: '7d',
  tickRateMs: 50,
  maxPlayersPerRoom: 6,
  minPlayersToStart: 2,
  respawnDelayMs: 3000,
  diamondWinBonus: 50,
}
