import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAuthStore } from './auth.store'
import type { ShopItem } from '../types/game.types'

export const useShopStore = defineStore('shop', () => {
  const items = ref<ShopItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchItems() {
    loading.value = true
    try {
      const res = await fetch('/api/shop/items')
      const data = await res.json()
      items.value = data.items
    } catch (e) {
      error.value = 'Failed to load shop'
    } finally {
      loading.value = false
    }
  }

  async function buyItem(itemId: string, equipAfterBuy = true): Promise<{ success: boolean; error?: string }> {
    const auth = useAuthStore()
    if (!auth.token) return { success: false, error: 'Not logged in' }

    try {
      const res = await fetch('/api/shop/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ itemId, equipAfterBuy }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        await auth.fetchProfile()
        return { success: true }
      }
      return { success: false, error: data.error }
    } catch {
      return { success: false, error: 'Network error' }
    }
  }

  async function equipItem(itemId: string): Promise<{ success: boolean; error?: string }> {
    const auth = useAuthStore()
    if (!auth.token) return { success: false, error: 'Not logged in' }

    try {
      const res = await fetch('/api/shop/equip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ itemId }),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        await auth.fetchProfile()
        return { success: true }
      }
      return { success: false, error: data.error }
    } catch {
      return { success: false, error: 'Network error' }
    }
  }

  return { items, loading, error, fetchItems, buyItem, equipItem }
})
