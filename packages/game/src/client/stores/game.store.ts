import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PlayerState, ProjectileState, ItemBoxState, MazeData, DeltaSnapshot } from '../types/game.types'

export const useGameStore = defineStore('game', () => {
  const roomId = ref<string | null>(null)
  const myPlayerId = ref<string | null>(null)
  const players = ref<Map<string, PlayerState>>(new Map())
  const projectiles = ref<ProjectileState[]>([])
  const itemBoxes = ref<Map<string, ItemBoxState>>(new Map())
  const mazeData = ref<MazeData | null>(null)
  const gamePhase = ref<'lobby' | 'starting' | 'playing' | 'finished'>('lobby')
  const winner = ref<string | null>(null)
  const rankings = ref<Array<{ rank: number; playerId: string; username: string; diamonds: number; kills: number }>>([])

  const myPlayer = computed(() => myPlayerId.value ? players.value.get(myPlayerId.value) : null)

  function initGame(payload: { roomId: string; players: PlayerState[]; itemBoxes: ItemBoxState[]; maze: MazeData }, myId: string) {
    roomId.value = payload.roomId
    myPlayerId.value = myId
    mazeData.value = payload.maze
    players.value = new Map(payload.players.map((p) => [p.id, p]))
    itemBoxes.value = new Map(payload.itemBoxes.map((b) => [b.id, b]))
    gamePhase.value = 'starting'
    setTimeout(() => { gamePhase.value = 'playing' }, 3000)
  }

  function applySnapshot(snap: DeltaSnapshot) {
    for (const [id, delta] of Object.entries(snap.players)) {
      const existing = players.value.get(id)
      if (existing) {
        Object.assign(existing, delta)
      }
    }
    projectiles.value = snap.projectiles

    // Process discrete events
    for (const event of snap.events) {
      if (event.type === 'item_collected') {
        const box = itemBoxes.value.get(event.boxId as string)
        if (box) box.isActive = false
      }
    }
  }

  function onItemBoxRespawned(boxId: string) {
    const box = itemBoxes.value.get(boxId)
    if (box) box.isActive = true
  }

  function onGameOver(data: { winnerId: string; rankings: typeof rankings.value }) {
    winner.value = data.winnerId
    rankings.value = data.rankings
    gamePhase.value = 'finished'
  }

  function reset() {
    roomId.value = null
    myPlayerId.value = null
    players.value = new Map()
    projectiles.value = []
    itemBoxes.value = new Map()
    mazeData.value = null
    gamePhase.value = 'lobby'
    winner.value = null
    rankings.value = []
  }

  return {
    roomId, myPlayerId, players, projectiles, itemBoxes, mazeData,
    gamePhase, winner, rankings, myPlayer,
    initGame, applySnapshot, onItemBoxRespawned, onGameOver, reset,
  }
})
