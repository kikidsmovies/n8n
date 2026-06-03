<template>
  <div class="win-screen">
    <div class="win-box">
      <div v-if="isWinner" class="winner-banner">
        <div class="trophy">🏆</div>
        <h1>VICTORY!</h1>
        <p>You escaped the maze first!</p>
      </div>
      <div v-else class="loser-banner">
        <div class="skull">💀</div>
        <h1>DEFEATED</h1>
        <p>Better luck next time!</p>
      </div>

      <div class="rewards">
        <div class="reward-item">
          <span>Diamonds Collected</span>
          <span class="reward-value">💎 {{ myRanking?.diamonds ?? 0 }}</span>
        </div>
        <div class="reward-item" v-if="isWinner">
          <span>Win Bonus</span>
          <span class="reward-value gold">💎 +50</span>
        </div>
        <div class="reward-item">
          <span>Kills</span>
          <span class="reward-value">⚔️ {{ myRanking?.kills ?? 0 }}</span>
        </div>
      </div>

      <div class="rankings">
        <h3>Final Rankings</h3>
        <div v-for="rank in gameStore.rankings" :key="rank.playerId" class="rank-row" :class="{ 'is-me': rank.playerId === gameStore.myPlayerId, winner: rank.rank === 1 }">
          <span class="rank-num">{{ rank.rank === 1 ? '🏆' : rank.rank }}</span>
          <span class="rank-name">{{ rank.username }}</span>
          <span class="rank-diamonds">💎 {{ rank.diamonds }}</span>
        </div>
      </div>

      <button class="btn-lobby" @click="goLobby">Back to Lobby</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '../../stores/game.store'

const router = useRouter()
const gameStore = useGameStore()

const isWinner = computed(() => gameStore.winner === gameStore.myPlayerId)
const myRanking = computed(() => gameStore.rankings.find((r) => r.playerId === gameStore.myPlayerId))

function goLobby() {
  gameStore.reset()
  router.push('/lobby')
}
</script>

<style scoped>
.win-screen {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.88);
  z-index: 100;
  overflow: hidden;
}

.win-screen::before {
  content: '';
  position: absolute;
  inset: -50%;
  background:
    repeating-linear-gradient(0deg, transparent, transparent 48px, rgba(255,215,0,0.03) 48px, rgba(255,215,0,0.03) 50px),
    repeating-linear-gradient(90deg, transparent, transparent 48px, rgba(255,215,0,0.03) 48px, rgba(255,215,0,0.03) 50px);
  animation: winGrid 6s linear infinite;
  pointer-events: none;
}

@keyframes winGrid {
  from { transform: translate(0, 0); }
  to   { transform: translate(50px, 50px); }
}

.win-box {
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.18);
  border-radius: 20px;
  padding: 40px;
  min-width: 440px;
  text-align: center;
  animation: slideIn 0.5s ease-out;
  position: relative;
  box-shadow: 0 0 60px rgba(0,0,0,0.5);
}

@keyframes slideIn { from { transform: scale(0.8) translateY(-20px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }

.trophy, .skull { font-size: 4rem; margin-bottom: 8px; animation: bounce 0.6s ease-out; }
@keyframes bounce { 0% { transform: scale(0); } 70% { transform: scale(1.2); } 100% { transform: scale(1); } }

.winner-banner h1 { color: #ffd700; font-size: 2.5rem; font-weight: 900; text-shadow: 0 0 30px rgba(255,215,0,0.8), 0 0 60px rgba(255,215,0,0.4); animation: goldPulse 1.5s ease-in-out infinite; }
@keyframes goldPulse { 0%,100% { text-shadow: 0 0 20px rgba(255,215,0,0.6); } 50% { text-shadow: 0 0 50px rgba(255,215,0,1.0), 0 0 80px rgba(255,180,0,0.6); } }
.loser-banner h1 { color: #ff6666; font-size: 2.5rem; font-weight: 900; }
p { color: rgba(255,255,255,0.6); margin-bottom: 24px; }

.rewards {
  background: rgba(255,255,255,0.05);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
}

.reward-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); color: rgba(255,255,255,0.8); }
.reward-value { font-weight: 700; color: #88eeff; }
.reward-value.gold { color: #ffd700; }

.rankings { margin-bottom: 24px; }
.rankings h3 { font-size: 0.85rem; color: rgba(255,255,255,0.4); text-transform: uppercase; margin-bottom: 12px; }
.rank-row { display: flex; align-items: center; gap: 12px; padding: 8px; border-radius: 8px; margin-bottom: 4px; }
.rank-row.winner { background: rgba(255,215,0,0.1); }
.rank-row.is-me { background: rgba(100,150,255,0.15); }
.rank-num { width: 30px; text-align: center; font-weight: 700; }
.rank-name { flex: 1; color: rgba(255,255,255,0.9); }
.rank-diamonds { color: #88eeff; font-weight: 700; }

.btn-lobby {
  padding: 14px 40px;
  background: linear-gradient(135deg, #4466ff, #2244cc);
  border: none;
  border-radius: 10px;
  color: #fff;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(68,102,255,0.4);
  transition: transform 0.1s;
}

.btn-lobby:hover { transform: translateY(-2px); }
</style>
