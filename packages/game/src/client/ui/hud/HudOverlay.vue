<template>
  <div class="hud">
    <!-- Health bar -->
    <div class="hud-health">
      <div class="hp-label">HP</div>
      <div class="hp-bar-bg">
        <div class="hp-bar" :style="{ width: hpPercent + '%', background: hpColor }"></div>
      </div>
      <div class="hp-value">{{ myPlayer?.hp ?? 0 }} / {{ myPlayer?.maxHp ?? 100 }}</div>
    </div>

    <!-- Weapon info -->
    <div class="hud-weapon">
      <div class="weapon-icon">{{ weaponEmoji_ }}</div>
      <div class="weapon-name">{{ weaponName }}</div>
    </div>

    <!-- Diamond counter -->
    <div class="hud-diamonds">
      <span>💎</span>
      <span class="diamond-count">{{ myPlayer?.collectedDiamonds ?? 0 }}</span>
    </div>

    <!-- Kills -->
    <div class="hud-kills">
      <span>⚔️ {{ myPlayer?.kills ?? 0 }}</span>
    </div>

    <!-- Active effects -->
    <div class="hud-effects" v-if="activeEffects.length">
      <div v-for="effect in activeEffects" :key="effect.type" class="effect-badge" :style="{ background: effectColor(effect.type) }">
        {{ effectEmoji(effect.type) }}
      </div>
    </div>

    <!-- Scoreboard -->
    <div class="hud-scoreboard">
      <div class="score-title">Rankings</div>
      <div v-for="(p, idx) in rankedPlayers" :key="p.id" class="score-row" :class="{ 'is-me': p.id === gameStore.myPlayerId }">
        <span class="rank">{{ idx + 1 }}</span>
        <span class="player-name">{{ p.username }}</span>
        <span class="player-diamonds">💎{{ p.collectedDiamonds }}</span>
      </div>
    </div>

    <!-- Dead overlay -->
    <Transition name="fade">
      <div v-if="myPlayer?.isDead" class="dead-overlay">
        <div class="dead-text">YOU DIED</div>
        <div class="dead-sub">Respawning...</div>
      </div>
    </Transition>

    <!-- Exit compass -->
    <div class="exit-compass" :style="{ transform: `rotate(${exitAngleDeg}deg)` }">
      <div class="compass-arrow">▲</div>
    </div>
    <div class="exit-label">EXIT</div>

    <!-- Controls hint -->
    <div class="controls-hint">
      <span>WASD Move</span>
      <span>Mouse Aim</span>
      <span>Space Shoot</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../../stores/game.store'
import type { ActiveEffect } from '../../types/game.types'

const gameStore = useGameStore()

const myPlayer = computed(() => gameStore.myPlayer)

const hpPercent = computed(() => {
  if (!myPlayer.value) return 100
  return (myPlayer.value.hp / myPlayer.value.maxHp) * 100
})

const hpColor = computed(() => {
  const pct = hpPercent.value
  if (pct > 60) return '#44ff88'
  if (pct > 30) return '#ffaa00'
  return '#ff4444'
})

const weaponEmoji: Record<string, string> = { blaster: '🔫', shotgun: '🪃', rocket: '🚀', frost_ray: '❄️' }
const weaponNames: Record<string, string> = { blaster: 'Blaster', shotgun: 'Shotgun', rocket: 'Rocket', frost_ray: 'Frost Ray' }
const weaponEmoji_ = computed(() => weaponEmoji[myPlayer.value?.weaponId ?? 'blaster'] ?? '🔫')
const weaponName = computed(() => weaponNames[myPlayer.value?.weaponId ?? 'blaster'] ?? 'Blaster')

const activeEffects = computed(() => myPlayer.value?.effects ?? [])

function effectColor(type: string): string {
  const c: Record<string, string> = { speed: '#00ffcc', shield: '#4488ff', teleport: '#aa44ff', health: '#44ff44', diamond: '#88eeff' }
  return c[type] ?? '#ffffff'
}
function effectEmoji(type: string): string {
  const e: Record<string, string> = { speed: '⚡', shield: '🛡️', teleport: '🌀', health: '❤️', diamond: '💎' }
  return e[type] ?? '✨'
}

const rankedPlayers = computed(() => {
  return Array.from(gameStore.players.values()).sort((a, b) => b.collectedDiamonds - a.collectedDiamonds)
})

const exitAngleDeg = computed(() => {
  const p = myPlayer.value
  const maze = gameStore.mazeData
  if (!p || !maze) return 45
  const CELL_SIZE = 2.0
  const exitX = (maze.width - 1) * CELL_SIZE + CELL_SIZE / 2
  const exitZ = (maze.height - 1) * CELL_SIZE + CELL_SIZE / 2
  const dx = exitX - p.position.x
  const dz = exitZ - p.position.z
  return Math.atan2(dx, -dz) * (180 / Math.PI)
})
</script>

<style scoped>
.hud {
  position: absolute; inset: 0;
  pointer-events: none;
  font-family: Arial, sans-serif;
}

.hud-health {
  position: absolute;
  bottom: 80px; left: 20px;
  display: flex; align-items: center; gap: 10px;
  background: rgba(0,0,0,0.65);
  padding: 10px 18px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.15);
  box-shadow: 0 0 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05);
  backdrop-filter: blur(8px);
}

.hp-label { font-size: 0.8rem; color: rgba(255,255,255,0.65); font-weight: 900; letter-spacing: 1px; }
.hp-bar-bg {
  width: 150px; height: 14px;
  background: rgba(255,255,255,0.08);
  border-radius: 7px;
  overflow: hidden;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.4);
}
.hp-bar {
  height: 100%;
  border-radius: 7px;
  transition: width 0.25s ease-out, background 0.3s;
  box-shadow: 0 0 8px currentColor;
  position: relative;
}
.hp-bar::after {
  content: '';
  position: absolute;
  top: 2px; left: 4px; right: 4px;
  height: 3px;
  background: rgba(255,255,255,0.35);
  border-radius: 2px;
}
.hp-value { font-size: 0.85rem; color: #fff; font-weight: 700; min-width: 65px; }

.hud-weapon {
  position: absolute;
  bottom: 20px; left: 20px;
  display: flex; align-items: center; gap: 8px;
  background: rgba(0,0,0,0.5);
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.1);
}

.weapon-icon { font-size: 1.5rem; }
.weapon-name { color: #fff; font-weight: 700; font-size: 0.9rem; }

.hud-diamonds {
  position: absolute;
  top: 20px; right: 20px;
  display: flex; align-items: center; gap: 6px;
  background: rgba(0,0,0,0.5);
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid rgba(100,220,255,0.3);
  font-size: 1.1rem;
}

.diamond-count { font-weight: 900; color: #88eeff; font-size: 1.2rem; }

.hud-kills {
  position: absolute;
  top: 20px; left: 20px;
  background: rgba(0,0,0,0.5);
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 700;
  color: #fff;
}

.hud-effects {
  position: absolute;
  bottom: 20px; right: 20px;
  display: flex; gap: 8px;
}

.effect-badge {
  width: 40px; height: 40px;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.3rem;
  opacity: 0.9;
}

.hud-scoreboard {
  position: absolute;
  top: 70px; right: 20px;
  background: rgba(0,0,0,0.5);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 8px;
  padding: 10px 14px;
  min-width: 180px;
}

.score-title { font-size: 0.7rem; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
.score-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 0.8rem; color: rgba(255,255,255,0.8); }
.score-row.is-me { color: #88eeff; font-weight: 700; }
.rank { width: 16px; color: rgba(255,255,255,0.4); }
.player-name { flex: 1; }
.player-diamonds { color: #88eeff; }

.dead-overlay {
  position: absolute; inset: 0;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  background: rgba(180,0,0,0.3);
  pointer-events: all;
}

.dead-text {
  font-size: 4rem; font-weight: 900;
  color: #ff4444;
  text-shadow: 0 0 40px rgba(255,0,0,0.8);
  animation: pulse 0.5s ease-in-out infinite alternate;
}

.dead-sub { color: rgba(255,255,255,0.7); margin-top: 12px; font-size: 1.2rem; }

@keyframes pulse { from { opacity: 0.8; } to { opacity: 1; transform: scale(1.02); } }

.controls-hint {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex; gap: 16px;
  background: rgba(0,0,0,0.4);
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 0.75rem;
  color: rgba(255,255,255,0.4);
}

.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.exit-compass {
  position: absolute;
  bottom: 82px; right: 20px;
  width: 44px; height: 44px;
  background: rgba(0,0,0,0.6);
  border: 2px solid rgba(0,255,136,0.5);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 0 12px rgba(0,255,136,0.3);
  transition: transform 0.15s ease-out;
}

.compass-arrow {
  color: #00ff88;
  font-size: 1.2rem;
  text-shadow: 0 0 8px #00ff88;
  line-height: 1;
}

.exit-label {
  position: absolute;
  bottom: 64px; right: 20px;
  width: 44px;
  text-align: center;
  font-size: 0.6rem;
  color: #00ff88;
  font-weight: 700;
  letter-spacing: 1px;
  text-shadow: 0 0 6px #00ff88;
}
</style>
