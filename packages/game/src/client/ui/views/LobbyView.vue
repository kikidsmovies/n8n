<template>
  <div class="lobby">
    <header class="lobby-header">
      <div class="logo">💎 MAZE BRAWL</div>
      <div class="player-info">
        <span class="diamonds">💎 {{ auth.player?.diamonds ?? 0 }}</span>
        <span class="username">{{ auth.player?.username }}</span>
        <button class="btn-logout" @click="logout">Logout</button>
      </div>
    </header>

    <div class="lobby-body">
      <div class="left-panel">
        <h2>Equipment</h2>
        <div class="equip-card">
          <div class="equip-label">Active Weapon</div>
          <div class="equip-value">{{ formatWeapon(auth.player?.activeWeaponId) }}</div>
        </div>
        <div class="equip-card">
          <div class="equip-label">Active Skin</div>
          <div class="equip-value">{{ formatSkin(auth.player?.activeSkinId) }}</div>
        </div>
        <button class="btn-shop" @click="router.push('/shop')">🛒 Open Shop</button>

        <div class="stats">
          <h3>Stats</h3>
          <div class="stat"><span>Wins</span><span>{{ auth.player?.totalWins ?? 0 }}</span></div>
          <div class="stat"><span>Kills</span><span>{{ auth.player?.totalKills ?? 0 }}</span></div>
          <div class="stat"><span>Games</span><span>{{ auth.player?.totalGames ?? 0 }}</span></div>
        </div>
      </div>

      <div class="center-panel">
        <div class="arena-preview">
          <div class="maze-icon">🏛️</div>
          <h2>Ready to Battle?</h2>
          <p>Race through the maze, collect diamonds, eliminate rivals!</p>

          <div v-if="!inQueue" class="queue-section">
            <button class="btn-play" @click="joinQueue">⚔️ FIND MATCH</button>
            <p class="hint">Min 2 players needed to start</p>
          </div>
          <div v-else class="queue-waiting">
            <div class="spinner"></div>
            <p>Searching for players...</p>
            <button class="btn-cancel" @click="leaveQueue">Cancel</button>
          </div>
        </div>
      </div>

      <div class="right-panel">
        <h2>How to Play</h2>
        <div class="rule"><span>🎮</span><span>WASD / Arrows to move</span></div>
        <div class="rule"><span>🖱️</span><span>Mouse to aim / rotate</span></div>
        <div class="rule"><span>Space</span><span>Shoot your weapon</span></div>
        <div class="rule"><span>🏆</span><span>First to exit wins!</span></div>
        <div class="rule"><span>💎</span><span>Collect diamonds in maze</span></div>
        <div class="rule"><span>💀</span><span>Die = respawn at start</span></div>
        <div class="rule"><span>📦</span><span>Item boxes give power-ups</span></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth.store'
import { useSocketStore } from '../../stores/socket.store'
import { useGameStore } from '../../stores/game.store'

const router = useRouter()
const auth = useAuthStore()
const socketStore = useSocketStore()
const gameStore = useGameStore()
const inQueue = ref(false)

function formatWeapon(id?: string): string {
  const names: Record<string, string> = { blaster: 'Blaster', shotgun: 'Shotgun', rocket: 'Rocket Launcher', frost_ray: 'Frost Ray' }
  return names[id ?? ''] ?? 'Blaster'
}
function formatSkin(id?: string): string {
  const names: Record<string, string> = { default: 'Default', skin_neon: 'Neon Warrior', skin_shadow: 'Shadow Mage', skin_gold: 'Gold Rogue' }
  return names[id ?? ''] ?? 'Default'
}

function joinQueue() {
  inQueue.value = true
  socketStore.emit('join_queue')
}

function leaveQueue() {
  inQueue.value = false
  socketStore.emit('leave_queue')
}

function logout() {
  auth.logout()
  socketStore.disconnect()
  router.push('/login')
}

onMounted(async () => {
  await auth.fetchProfile()
  if (auth.token) {
    socketStore.connect(auth.token)
    socketStore.on('game_start', (payload: unknown) => {
      const data = payload as { roomId: string; players: any[]; itemBoxes: any[]; maze: any; myPlayerId: string }
      // Server sends myPlayerId directly so there's no socket ID mismatch
      gameStore.initGame(data, data.myPlayerId ?? socketStore.socket.value?.id ?? '')
      router.push('/game')
    })
  }
})

onUnmounted(() => {
  socketStore.off('game_start', () => {})
})
</script>

<style scoped>
.lobby {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: radial-gradient(ellipse at center, #1a1a3e 0%, #0a0a1a 100%);
  color: #fff;
  font-family: Arial, sans-serif;
}

.lobby-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: rgba(0,0,0,0.4);
  border-bottom: 1px solid rgba(100,150,255,0.2);
}

.logo {
  font-size: 1.5rem;
  font-weight: 900;
  color: #fff;
  text-shadow: 0 0 15px rgba(100,150,255,0.8);
}

.player-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.diamonds {
  background: rgba(100,200,255,0.15);
  padding: 6px 14px;
  border-radius: 20px;
  border: 1px solid rgba(100,200,255,0.3);
  font-weight: 700;
}

.username { color: rgba(255,255,255,0.7); }

.btn-logout {
  background: rgba(255,60,60,0.2);
  border: 1px solid rgba(255,60,60,0.4);
  color: #ff6666;
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
}

.lobby-body {
  display: flex;
  flex: 1;
  gap: 20px;
  padding: 24px;
  overflow: hidden;
}

.left-panel, .right-panel {
  width: 240px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 20px;
}

.left-panel h2, .right-panel h2 {
  font-size: 1rem;
  color: rgba(255,255,255,0.6);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 16px;
}

.equip-card {
  background: rgba(255,255,255,0.05);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 10px;
}

.equip-label { font-size: 0.75rem; color: rgba(255,255,255,0.4); margin-bottom: 4px; }
.equip-value { font-weight: 700; color: #88aaff; }

.btn-shop {
  width: 100%;
  padding: 10px;
  background: rgba(100,150,255,0.2);
  border: 1px solid rgba(100,150,255,0.4);
  border-radius: 8px;
  color: #88aaff;
  cursor: pointer;
  margin-top: 12px;
  font-size: 0.9rem;
  font-weight: 700;
}

.stats { margin-top: 20px; }
.stats h3 { font-size: 0.75rem; color: rgba(255,255,255,0.4); text-transform: uppercase; margin-bottom: 10px; }
.stat { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.85rem; }

.center-panel {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.arena-preview {
  text-align: center;
  max-width: 400px;
}

.maze-icon { font-size: 4rem; margin-bottom: 16px; }
.arena-preview h2 { font-size: 2rem; font-weight: 900; margin-bottom: 8px; }
.arena-preview p { color: rgba(255,255,255,0.6); margin-bottom: 32px; }

.btn-play {
  padding: 18px 48px;
  background: linear-gradient(135deg, #ff4444, #cc0000);
  border: none;
  border-radius: 12px;
  color: #fff;
  font-size: 1.3rem;
  font-weight: 900;
  cursor: pointer;
  box-shadow: 0 6px 25px rgba(255,60,60,0.5);
  transition: transform 0.1s, box-shadow 0.2s;
  letter-spacing: 1px;
}

.btn-play:hover { transform: translateY(-2px); box-shadow: 0 8px 30px rgba(255,60,60,0.7); }

.hint { margin-top: 12px; font-size: 0.8rem; color: rgba(255,255,255,0.4); }

.queue-waiting { display: flex; flex-direction: column; align-items: center; gap: 16px; }

.spinner {
  width: 48px; height: 48px;
  border: 4px solid rgba(255,255,255,0.1);
  border-top-color: #4466ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.btn-cancel {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.2);
  color: rgba(255,255,255,0.6);
  padding: 8px 20px;
  border-radius: 6px;
  cursor: pointer;
}

.rule {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255,255,255,0.05);
  font-size: 0.85rem;
  color: rgba(255,255,255,0.7);
}

.rule span:first-child {
  width: 50px;
  text-align: center;
  font-size: 1.1rem;
  background: rgba(255,255,255,0.05);
  border-radius: 4px;
  padding: 2px 4px;
}
</style>
