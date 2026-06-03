import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { PlayerProfile } from '../types/game.types'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('maze_token'))
  const player = ref<PlayerProfile | null>(null)

  function setAuth(newToken: string, newPlayer: PlayerProfile) {
    token.value = newToken
    player.value = newPlayer
    localStorage.setItem('maze_token', newToken)
  }

  function logout() {
    token.value = null
    player.value = null
    localStorage.removeItem('maze_token')
  }

  async function fetchProfile() {
    if (!token.value) return
    try {
      const res = await fetch('/api/player/me', {
        headers: { Authorization: `Bearer ${token.value}` },
      })
      if (res.ok) {
        player.value = await res.json()
      } else {
        logout()
      }
    } catch {
      // network error — keep existing state
    }
  }

  return { token, player, setAuth, logout, fetchProfile }
})
