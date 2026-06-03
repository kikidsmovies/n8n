import { Server, Socket } from 'socket.io'
import { GameRoom } from './game.room'
import { playerRepository } from '../db/repositories/player.repository'

interface QueueEntry {
  socket: Socket
  dbId: string
  username: string
  weaponId: string
  skinId: string
  joinedAt: number
}

export class GameManager {
  private io: Server
  private rooms = new Map<string, GameRoom>()
  private queue: QueueEntry[] = []
  private matchmakingInterval: NodeJS.Timeout

  constructor(io: Server) {
    this.io = io
    this.matchmakingInterval = setInterval(() => this.runMatchmaking(), 2000)
  }

  handleConnection(socket: Socket, dbId: string, username: string): void {
    console.log(`[Game] Player connected: ${username} (${socket.id})`)
  }

  handleDisconnect(socket: Socket): void {
    this.removeFromQueue(socket.id)
    for (const [roomId, room] of this.rooms) {
      room.removePlayer(socket.id)
      if (room.isEmpty) {
        room.destroy()
        this.rooms.delete(roomId)
      }
    }
  }

  joinQueue(socket: Socket, dbId: string, username: string, weaponId: string, skinId: string): void {
    const already = this.queue.find((e) => e.socket.id === socket.id)
    if (already) return

    const player = playerRepository.findById(dbId)
    if (!player) return

    this.queue.push({ socket, dbId, username, weaponId, skinId, joinedAt: Date.now() })
    console.log(`[Queue] ${username} joined queue (${this.queue.length} waiting)`)
  }

  leaveQueue(socketId: string): void {
    this.removeFromQueue(socketId)
  }

  private removeFromQueue(socketId: string): void {
    const idx = this.queue.findIndex((e) => e.socket.id === socketId)
    if (idx >= 0) this.queue.splice(idx, 1)
  }

  private runMatchmaking(): void {
    if (this.queue.length < 2) return

    const toMatch = this.queue.splice(0, Math.min(this.queue.length, 6))
    const room = new GameRoom(this.io, toMatch.length)
    this.rooms.set(room.id, room)

    for (const entry of toMatch) {
      room.addPlayer(entry.socket, entry.dbId, entry.username, entry.weaponId, entry.skinId)
    }

    console.log(`[Game] Room ${room.id} started with ${toMatch.length} players`)
  }

  getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId)
  }

  getRoomBySocket(socketId: string): GameRoom | undefined {
    for (const room of this.rooms.values()) {
      if ((room as any).players.has(socketId)) return room
    }
    return undefined
  }

  destroy(): void {
    clearInterval(this.matchmakingInterval)
    for (const room of this.rooms.values()) room.destroy()
  }
}
