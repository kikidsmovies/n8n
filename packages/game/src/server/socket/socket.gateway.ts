import { Server as HttpServer } from 'http'
import { Server } from 'socket.io'
import { authService } from '../auth/auth.service'
import { GameManager } from '../game/game.manager'
import { playerRepository } from '../db/repositories/player.repository'
import { EVENTS } from './socket.events'

export function createSocketGateway(httpServer: HttpServer): { io: Server; gameManager: GameManager } {
  const io = new Server(httpServer, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
    transports: ['websocket', 'polling'],
    pingInterval: 10000,
    pingTimeout: 5000,
    maxHttpBufferSize: 1e5,
  })

  const gameManager = new GameManager(io)

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined
    if (!token) return next(new Error('Authentication required'))
    try {
      const payload = authService.verifyToken(token)
      ;(socket as any).playerId = payload.playerId
      ;(socket as any).username = payload.username
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket) => {
    const dbId: string = (socket as any).playerId
    const username: string = (socket as any).username

    gameManager.handleConnection(socket, dbId, username)

    socket.on(EVENTS.JOIN_QUEUE, () => {
      const player = playerRepository.findById(dbId)
      if (!player) return
      gameManager.joinQueue(socket, dbId, username, player.active_weapon_id, player.active_skin_id)
    })

    socket.on(EVENTS.LEAVE_QUEUE, () => {
      gameManager.leaveQueue(socket.id)
    })

    socket.on(EVENTS.PLAYER_INPUT, (data) => {
      const room = gameManager.getRoomBySocket(socket.id)
      room?.handleInput(socket.id, data)
    })

    socket.on(EVENTS.PLAYER_SHOOT, (data) => {
      const room = gameManager.getRoomBySocket(socket.id)
      room?.handleShoot(socket.id, data.direction)
    })

    socket.on(EVENTS.USE_ITEM, (data) => {
      const room = gameManager.getRoomBySocket(socket.id)
      room?.handleUseItem(socket.id, data?.direction)
    })

    socket.on(EVENTS.CHAT_MESSAGE, (data: { text: string }) => {
      const room = gameManager.getRoomBySocket(socket.id)
      if (!room) return
      const text = String(data?.text ?? '').slice(0, 64)
      io.to(room.id).emit('chat_message', { playerId: socket.id, username, text })
    })

    socket.on('disconnect', () => {
      gameManager.handleDisconnect(socket)
    })
  })

  return { io, gameManager }
}
