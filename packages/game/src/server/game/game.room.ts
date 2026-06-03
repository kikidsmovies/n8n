import { Server, Socket } from 'socket.io'
import { v4 as uuidv4 } from 'uuid'
import { generateMaze, CELL_SIZE } from './maze/maze.generator'
import { MazeGrid } from './maze/maze.types'
import { ItemBoxPlacement } from './maze/maze.types'
import {
  PlayerState, ProjectileState, ItemBoxState, DeltaSnapshot, GameEvent,
  MAX_HP, MOVE_SPEED, Vec2,
} from './game.state'
import { resolveMovement, distance2D } from './physics/collision'
import { createProjectiles, tickProjectiles } from './physics/projectile.manager'
import { getWeapon } from './weapons/weapon.catalog'
import { ITEMS } from './items/item.catalog'
import { ItemType } from './items/item.types'
import { config } from '../config'
import { playerRepository } from '../db/repositories/player.repository'
import { EVENTS } from '../socket/socket.events'

export type GamePhase = 'waiting' | 'starting' | 'playing' | 'finished'

interface InputPacket {
  seq: number
  velocity: Vec2
  rotation: number
  timestamp: number
}

export class GameRoom {
  readonly id: string
  phase: GamePhase = 'waiting'

  private io: Server
  private players = new Map<string, PlayerState>()
  private socketToPlayer = new Map<string, string>()
  private playerInputs = new Map<string, InputPacket[]>()
  private projectiles: ProjectileState[] = []
  private itemBoxes = new Map<string, ItemBoxState>()
  private grid!: MazeGrid
  private tickInterval: NodeJS.Timeout | null = null
  private tick = 0
  private lastTickTime = Date.now()
  private pendingEvents: GameEvent[] = []
  private maxPlayers: number

  constructor(io: Server, maxPlayers = config.maxPlayersPerRoom) {
    this.id = uuidv4()
    this.io = io
    this.maxPlayers = maxPlayers
  }

  get playerCount(): number { return this.players.size }
  get isFull(): boolean { return this.players.size >= this.maxPlayers }
  get isEmpty(): boolean { return this.players.size === 0 }

  addPlayer(socket: Socket, dbId: string, username: string, weaponId: string, skinId: string): boolean {
    if (this.isFull || this.phase !== 'waiting') return false

    const spawnIdx = this.players.size
    const spawn = this.getSpawnPosition(spawnIdx)

    const player: PlayerState = {
      id: socket.id,
      dbId,
      username,
      position: spawn,
      rotation: 0,
      hp: MAX_HP,
      maxHp: MAX_HP,
      weaponId,
      skinId,
      lastShotAt: 0,
      collectedDiamonds: 0,
      kills: 0,
      effects: [],
      isDead: false,
      respawnAt: 0,
      isSlowed: false,
      slowUntil: 0,
      inputSeq: 0,
    }

    this.players.set(socket.id, player)
    this.socketToPlayer.set(socket.id, socket.id)
    this.playerInputs.set(socket.id, [])
    socket.join(this.id)

    if (this.players.size >= config.minPlayersToStart && this.phase === 'waiting') {
      this.startCountdown()
    }

    return true
  }

  removePlayer(socketId: string): void {
    this.players.delete(socketId)
    this.playerInputs.delete(socketId)
    this.socketToPlayer.delete(socketId)
  }

  handleInput(socketId: string, input: InputPacket): void {
    const inputs = this.playerInputs.get(socketId)
    if (inputs) {
      inputs.push(input)
      if (inputs.length > 10) inputs.shift()
    }
  }

  handleShoot(socketId: string, direction: { x: number; y: number; z: number }): void {
    const player = this.players.get(socketId)
    if (!player || player.isDead) return

    const weapon = getWeapon(player.weaponId)
    const now = Date.now()
    if (now - player.lastShotAt < weapon.fireRateMs) return

    player.lastShotAt = now
    const projs = createProjectiles(socketId, weapon, player.position, direction)
    this.projectiles.push(...projs)
  }

  handleUseItem(socketId: string, _direction?: { x: number; z: number }): void {
    const player = this.players.get(socketId)
    if (!player || player.isDead) return
    // Teleport handled via collected item logic — no active use needed in this pass
  }

  private getSpawnPosition(idx: number): Vec2 {
    if (this.grid) {
      const spawns = this.grid.spawnPositions
      const spawn = spawns[idx % spawns.length]
      return { x: spawn.x, z: spawn.z }
    }
    return { x: CELL_SIZE / 2 + (idx % 3) * CELL_SIZE, z: CELL_SIZE / 2 + Math.floor(idx / 3) * CELL_SIZE }
  }

  private startCountdown(): void {
    this.phase = 'starting'
    const seed = Math.floor(Math.random() * 2 ** 31)
    const { grid, itemBoxes } = generateMaze(20, 20, seed)
    this.grid = grid

    for (const box of itemBoxes) {
      const state: ItemBoxState = {
        id: box.id,
        cellX: box.cellX,
        cellZ: box.cellZ,
        worldX: box.worldX,
        worldZ: box.worldZ,
        type: box.type as ItemType,
        isActive: true,
        respawnAt: 0,
      }
      this.itemBoxes.set(box.id, state)
    }

    // Re-assign spawn positions now that grid exists
    let i = 0
    for (const [, player] of this.players) {
      player.position = this.getSpawnPosition(i++)
    }

    // Emit game_start to each player individually, including their own ID
    const commonPayload = {
      roomId: this.id,
      maze: { seed: grid.seed, width: grid.width, height: grid.height, cells: this.serializeMaze() },
      players: Array.from(this.players.values()).map(this.serializePlayer),
      itemBoxes: Array.from(this.itemBoxes.values()),
    }
    for (const [socketId] of this.players) {
      const sock = this.io.sockets.sockets.get(socketId)
      if (sock) sock.emit(EVENTS.GAME_START, { ...commonPayload, myPlayerId: socketId })
    }

    setTimeout(() => this.startGame(), 3000)
  }

  private serializeMaze() {
    const walls: number[] = []
    for (let z = 0; z < this.grid.height; z++) {
      for (let x = 0; x < this.grid.width; x++) {
        const c = this.grid.cells[z][x]
        walls.push(
          (c.walls.north ? 1 : 0) |
          (c.walls.south ? 2 : 0) |
          (c.walls.east ? 4 : 0) |
          (c.walls.west ? 8 : 0),
        )
      }
    }
    return walls
  }

  private serializePlayer(p: PlayerState) {
    return {
      id: p.id, username: p.username, position: p.position, rotation: p.rotation,
      hp: p.hp, maxHp: p.maxHp, weaponId: p.weaponId, skinId: p.skinId,
      collectedDiamonds: p.collectedDiamonds, kills: p.kills, isDead: p.isDead,
      effects: p.effects ?? [],
    }
  }

  private startGame(): void {
    this.phase = 'playing'
    this.lastTickTime = Date.now()
    this.tickInterval = setInterval(() => this.tick_(), config.tickRateMs)
  }

  private tick_(): void {
    const now = Date.now()
    const dt = (now - this.lastTickTime) / 1000
    this.lastTickTime = now
    this.tick++

    this.processInputs(dt)
    this.updateEffects(now)
    this.updateProjectilesStep(dt, now)
    this.updateItemBoxRespawns(now)
    this.checkRespawns(now)
    this.checkWinCondition()

    const snapshot = this.buildSnapshot()
    this.io.to(this.id).emit(EVENTS.STATE_UPDATE, snapshot)
    this.pendingEvents = []
  }

  private processInputs(dt: number): void {
    for (const [socketId, inputs] of this.playerInputs) {
      const player = this.players.get(socketId)
      if (!player || player.isDead || inputs.length === 0) continue

      const input = inputs[inputs.length - 1]
      inputs.length = 0

      const speedMult = player.isSlowed ? 0.6 : this.getSpeedMultiplier(player)
      const speed = MOVE_SPEED * speedMult * dt

      const newPos: Vec2 = {
        x: player.position.x + input.velocity.x * speed,
        z: player.position.z + input.velocity.z * speed,
      }

      player.position = resolveMovement(player.position, newPos, this.grid)
      player.rotation = input.rotation
      player.inputSeq = input.seq

      this.checkItemCollision(player)
    }
  }

  private getSpeedMultiplier(player: PlayerState): number {
    for (const effect of player.effects) {
      if (effect.type === 'speed') return effect.speedMultiplier ?? 1.8
    }
    return 1
  }

  private updateEffects(now: number): void {
    for (const [, player] of this.players) {
      player.effects = player.effects.filter((e) => e.expiresAt === 0 || e.expiresAt > now)
      if (player.isSlowed && now > player.slowUntil) {
        player.isSlowed = false
      }
    }
  }

  private updateProjectilesStep(dt: number, now: number): void {
    const { remaining, hits } = tickProjectiles(this.projectiles, this.players, this.grid, dt)
    this.projectiles = remaining

    for (const hit of hits) {
      const target = this.players.get(hit.targetId)
      if (!target || target.isDead) continue

      const attacker = this.players.get(hit.ownerId ?? '')
      if (!attacker) continue

      // Apply shield absorption
      let damage = hit.damage
      const shieldEffect = target.effects.find((e) => e.type === 'shield')
      if (shieldEffect && (shieldEffect.shieldHp ?? 0) > 0) {
        const absorbed = Math.min(damage, shieldEffect.shieldHp ?? 0)
        shieldEffect.shieldHp = (shieldEffect.shieldHp ?? 0) - absorbed
        damage -= absorbed
        if ((shieldEffect.shieldHp ?? 0) <= 0) {
          target.effects = target.effects.filter((e) => e.type !== 'shield')
        }
      }

      target.hp = Math.max(0, target.hp - damage)

      if (hit.slowPercent > 0) {
        target.isSlowed = true
        target.slowUntil = now + hit.slowDurationMs
      }

      this.pendingEvents.push({ type: 'player_hit', attackerId: attacker.id, targetId: target.id, damage, remainingHp: target.hp })
      this.io.to(this.id).emit(EVENTS.PLAYER_HIT, { attackerId: attacker.id, targetId: target.id, damage, remainingHp: target.hp })

      if (target.hp <= 0) {
        this.killPlayer(target, attacker, now)
      }
    }
  }

  private killPlayer(target: PlayerState, killer: PlayerState, now: number): void {
    target.isDead = true
    target.hp = 0
    target.respawnAt = now + config.respawnDelayMs
    target.effects = []
    killer.kills++

    this.pendingEvents.push({ type: 'player_died', playerId: target.id, killerId: killer.id })
    this.io.to(this.id).emit(EVENTS.PLAYER_DIED, { playerId: target.id, killerId: killer.id, respawnIn: config.respawnDelayMs })
  }

  private checkRespawns(now: number): void {
    for (const [, player] of this.players) {
      if (player.isDead && now >= player.respawnAt) {
        player.isDead = false
        player.hp = MAX_HP
        player.effects = []
        const spawnIdx = Array.from(this.players.values()).indexOf(player)
        player.position = this.getSpawnPosition(spawnIdx)
        this.io.to(this.id).emit(EVENTS.PLAYER_RESPAWNED, { playerId: player.id, position: player.position })
      }
    }
  }

  private checkItemCollision(player: PlayerState): void {
    for (const [, box] of this.itemBoxes) {
      if (!box.isActive) continue
      const dist = distance2D(player.position, { x: box.worldX, z: box.worldZ })
      if (dist < 0.9) {
        this.collectItem(player, box)
      }
    }
  }

  private collectItem(player: PlayerState, box: ItemBoxState): void {
    box.isActive = false
    box.respawnAt = Date.now() + ITEMS[box.type].respawnMs
    const itemDef = ITEMS[box.type]
    const now = Date.now()

    if (box.type === 'speed') {
      player.effects = player.effects.filter((e) => e.type !== 'speed')
      player.effects.push({ type: 'speed', expiresAt: now + itemDef.durationMs, speedMultiplier: itemDef.speedMultiplier })
    } else if (box.type === 'shield') {
      player.effects = player.effects.filter((e) => e.type !== 'shield')
      player.effects.push({ type: 'shield', expiresAt: 0, shieldHp: itemDef.shieldHp })
    } else if (box.type === 'health') {
      player.hp = Math.min(player.maxHp, player.hp + (itemDef.healAmount ?? 0))
    } else if (box.type === 'diamond') {
      const [min, max] = itemDef.diamondRange
      const amount = min + Math.floor(Math.random() * (max - min + 1))
      player.collectedDiamonds += amount
      this.io.to(this.id).emit(EVENTS.DIAMOND_COLLECTED, { playerId: player.id, boxId: box.id, amount, newTotal: player.collectedDiamonds })
    }

    this.io.to(this.id).emit(EVENTS.ITEM_COLLECTED, { playerId: player.id, boxId: box.id, itemType: box.type })
    this.pendingEvents.push({ type: 'item_collected', playerId: player.id, boxId: box.id, itemType: box.type })
  }

  private updateItemBoxRespawns(now: number): void {
    for (const [, box] of this.itemBoxes) {
      if (!box.isActive && box.respawnAt > 0 && now >= box.respawnAt) {
        box.isActive = true
        box.respawnAt = 0
        this.io.to(this.id).emit(EVENTS.ITEM_BOX_RESPAWNED, { boxId: box.id })
      }
    }
  }

  private checkWinCondition(): void {
    if (this.phase !== 'playing') return
    const exitWorldX = this.grid.exitX * CELL_SIZE + CELL_SIZE / 2
    const exitWorldZ = this.grid.exitZ * CELL_SIZE + CELL_SIZE / 2

    for (const [, player] of this.players) {
      if (player.isDead) continue
      const dist = distance2D(player.position, { x: exitWorldX, z: exitWorldZ })
      if (dist < 1.5) {
        this.endGame(player.id)
        return
      }
    }
  }

  private endGame(winnerId: string): void {
    if (this.phase === 'finished') return
    this.phase = 'finished'
    if (this.tickInterval) clearInterval(this.tickInterval)

    const rankings = Array.from(this.players.values())
      .sort((a, b) => b.collectedDiamonds - a.collectedDiamonds)
      .map((p, idx) => ({ rank: idx + 1, playerId: p.id, username: p.username, diamonds: p.collectedDiamonds, kills: p.kills }))

    this.io.to(this.id).emit(EVENTS.GAME_OVER, { winnerId, rankings })

    // Persist rewards
    for (const [, player] of this.players) {
      const isWinner = player.id === winnerId
      const bonus = isWinner ? config.diamondWinBonus : 0
      playerRepository.addDiamonds(player.dbId, player.collectedDiamonds + bonus, 'game_end', { gameId: this.id, isWinner })
      playerRepository.incrementStats(player.dbId, isWinner ? 1 : 0, player.kills)
    }
  }

  private buildSnapshot(): DeltaSnapshot {
    const playersSnap: Record<string, Partial<PlayerState>> = {}
    for (const [id, p] of this.players) {
      playersSnap[id] = {
        position: p.position,
        rotation: p.rotation,
        hp: p.hp,
        isDead: p.isDead,
        kills: p.kills,
        collectedDiamonds: p.collectedDiamonds,
        effects: p.effects,
        inputSeq: p.inputSeq,
      }
    }
    return {
      tick: this.tick,
      players: playersSnap,
      projectiles: [...this.projectiles],
      events: [...this.pendingEvents],
    }
  }

  destroy(): void {
    if (this.tickInterval) clearInterval(this.tickInterval)
    this.players.clear()
    this.itemBoxes.clear()
    this.projectiles = []
  }
}
