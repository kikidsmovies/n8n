import { createApp } from './server'
import { createSocketGateway } from './socket/socket.gateway'
import { getDb } from './db/database'
import { config } from './config'

async function main() {
  // Initialize DB (runs migrations)
  getDb()
  console.log('[DB] Database initialized')

  const httpServer = createApp()
  const { io } = createSocketGateway(httpServer)

  httpServer.listen(config.port, () => {
    console.log(`[Server] Maze Game server running on http://localhost:${config.port}`)
  })

  const shutdown = () => {
    console.log('[Server] Shutting down...')
    io.close()
    httpServer.close()
    process.exit(0)
  }
  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

main().catch(console.error)
