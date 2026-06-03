<template>
  <div class="shop">
    <header class="shop-header">
      <button class="btn-back" @click="router.push('/lobby')">← Back</button>
      <h1>🛒 Shop</h1>
      <div class="balance">💎 {{ auth.player?.diamonds ?? 0 }}</div>
    </header>

    <div class="shop-content">
      <div class="filter-tabs">
        <button :class="{ active: filter === 'all' }" @click="filter = 'all'">All</button>
        <button :class="{ active: filter === 'weapon' }" @click="filter = 'weapon'">⚔️ Weapons</button>
        <button :class="{ active: filter === 'skin' }" @click="filter = 'skin'">🎨 Skins</button>
      </div>

      <div v-if="shopStore.loading" class="loading">Loading...</div>

      <div class="items-grid">
        <div
          v-for="item in filteredItems"
          :key="item.id"
          class="item-card"
          :class="{
            owned: ownsItem(item.id),
            equipped: isEquipped(item),
            'cant-afford': !ownsItem(item.id) && (auth.player?.diamonds ?? 0) < item.cost && !item.isDefault
          }"
        >
          <div class="item-preview" :style="{ background: item.previewColor ? `radial-gradient(circle, ${item.previewColor}44, transparent)` : undefined }">
            <div class="item-icon">{{ itemIcon(item) }}</div>
          </div>
          <div class="item-info">
            <div class="item-name">{{ item.name }}</div>
            <div class="item-desc">{{ item.description }}</div>
          </div>
          <div class="item-footer">
            <div class="item-cost">
              <span v-if="item.isDefault" class="free">FREE</span>
              <span v-else>💎 {{ item.cost }}</span>
            </div>
            <button
              v-if="isEquipped(item)"
              class="btn-equipped" disabled
            >Equipped</button>
            <button
              v-else-if="ownsItem(item.id) || item.isDefault"
              class="btn-equip"
              @click="equip(item.id)"
            >Equip</button>
            <button
              v-else
              class="btn-buy"
              :disabled="(auth.player?.diamonds ?? 0) < item.cost || buying === item.id"
              @click="buy(item.id)"
            >
              {{ buying === item.id ? '...' : 'Buy' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="message" class="toast" :class="messageType">{{ message }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth.store'
import { useShopStore } from '../../stores/shop.store'
import type { ShopItem } from '../../types/game.types'

const router = useRouter()
const auth = useAuthStore()
const shopStore = useShopStore()

const filter = ref<'all' | 'weapon' | 'skin'>('all')
const buying = ref<string | null>(null)
const message = ref('')
const messageType = ref<'success' | 'error'>('success')

const filteredItems = computed(() => {
  if (filter.value === 'all') return shopStore.items
  return shopStore.items.filter((i) => i.type === filter.value)
})

function ownsItem(id: string): boolean {
  if (id === 'blaster' || id === 'default') return true
  return auth.player?.inventory.some((i) => i.itemId === id) ?? false
}

function isEquipped(item: ShopItem): boolean {
  if (item.type === 'weapon') return auth.player?.activeWeaponId === item.id
  return auth.player?.activeSkinId === item.id
}

function itemIcon(item: ShopItem): string {
  const icons: Record<string, string> = {
    blaster: '🔫', shotgun: '🪃', rocket: '🚀', frost_ray: '❄️',
    skin_neon: '⚡', skin_shadow: '🌑', skin_gold: '👑', default: '👤',
  }
  return icons[item.id] ?? (item.type === 'weapon' ? '🔫' : '🎨')
}

async function buy(itemId: string) {
  buying.value = itemId
  const result = await shopStore.buyItem(itemId, true)
  buying.value = null
  if (result.success) {
    showMessage('Purchased and equipped!', 'success')
  } else {
    showMessage(result.error ?? 'Purchase failed', 'error')
  }
}

async function equip(itemId: string) {
  const result = await shopStore.equipItem(itemId)
  if (result.success) showMessage('Equipped!', 'success')
  else showMessage(result.error ?? 'Failed', 'error')
}

function showMessage(msg: string, type: 'success' | 'error') {
  message.value = msg
  messageType.value = type
  setTimeout(() => { message.value = '' }, 2500)
}

onMounted(async () => {
  await shopStore.fetchItems()
  await auth.fetchProfile()
})
</script>

<style scoped>
.shop {
  display: flex; flex-direction: column;
  height: 100%;
  background: radial-gradient(ellipse at center, #1a1a3e 0%, #0a0a1a 100%);
  color: #fff;
  font-family: Arial, sans-serif;
}

.shop-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 24px;
  background: rgba(0,0,0,0.4);
  border-bottom: 1px solid rgba(100,150,255,0.2);
}

.shop-header h1 { font-size: 1.5rem; font-weight: 900; }

.btn-back {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.2);
  color: rgba(255,255,255,0.7);
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
}

.balance {
  background: rgba(100,200,255,0.15);
  padding: 8px 20px;
  border-radius: 20px;
  border: 1px solid rgba(100,200,255,0.3);
  font-weight: 900;
  font-size: 1.1rem;
  color: #88eeff;
}

.shop-content { flex: 1; padding: 24px; overflow-y: auto; }

.filter-tabs {
  display: flex; gap: 8px; margin-bottom: 24px;
}

.filter-tabs button {
  padding: 8px 20px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 20px;
  color: rgba(255,255,255,0.6);
  cursor: pointer;
  transition: all 0.2s;
}

.filter-tabs button.active {
  background: rgba(100,150,255,0.3);
  border-color: rgba(100,150,255,0.6);
  color: #fff;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.item-card {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  overflow: hidden;
  transition: transform 0.2s, border-color 0.2s;
}

.item-card:hover { transform: translateY(-2px); border-color: rgba(100,150,255,0.3); }
.item-card.owned { border-color: rgba(68,255,136,0.3); }
.item-card.equipped { border-color: rgba(255,215,0,0.5); background: rgba(255,215,0,0.05); }
.item-card.cant-afford { opacity: 0.6; }

.item-preview {
  height: 120px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.03);
}

.item-icon { font-size: 3.5rem; }

.item-info { padding: 12px 14px; }
.item-name { font-weight: 700; font-size: 1rem; margin-bottom: 4px; }
.item-desc { font-size: 0.78rem; color: rgba(255,255,255,0.5); line-height: 1.4; }

.item-footer {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 14px;
  border-top: 1px solid rgba(255,255,255,0.06);
}

.item-cost { font-weight: 700; color: #88eeff; }
.free { color: #44ff88; }

.btn-buy, .btn-equip, .btn-equipped {
  padding: 7px 16px;
  border-radius: 6px;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  border: none;
}

.btn-buy {
  background: linear-gradient(135deg, #4466ff, #2244cc);
  color: #fff;
  box-shadow: 0 2px 8px rgba(68,102,255,0.4);
}

.btn-buy:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-equip {
  background: rgba(68,255,136,0.2);
  border: 1px solid rgba(68,255,136,0.4);
  color: #44ff88;
}

.btn-equipped {
  background: rgba(255,215,0,0.15);
  border: 1px solid rgba(255,215,0,0.3);
  color: #ffd700;
  cursor: default;
}

.toast {
  position: fixed;
  bottom: 30px; left: 50%;
  transform: translateX(-50%);
  padding: 12px 28px;
  border-radius: 8px;
  font-weight: 700;
  animation: fadeInUp 0.3s ease;
}

.toast.success { background: rgba(68,255,136,0.2); border: 1px solid rgba(68,255,136,0.5); color: #44ff88; }
.toast.error { background: rgba(255,68,68,0.2); border: 1px solid rgba(255,68,68,0.5); color: #ff6666; }

@keyframes fadeInUp { from { opacity: 0; transform: translateX(-50%) translateY(10px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }

.loading { text-align: center; padding: 40px; color: rgba(255,255,255,0.4); }
</style>
