<template>
  <div class="kill-feed" aria-live="polite">
    <TransitionGroup name="kill">
      <div v-for="entry in entries" :key="entry.id" class="kill-entry">
        <span class="killer" :class="{ 'is-me': entry.isMyKill }">{{ entry.killerName }}</span>
        <span class="weapon">{{ weaponEmoji(entry.weaponId) }}</span>
        <span class="victim" :class="{ 'is-me': entry.isMyDeath }">{{ entry.victimName }}</span>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface KillEntry {
  id: number
  killerName: string
  victimName: string
  weaponId: string
  isMyKill: boolean
  isMyDeath: boolean
}

const entries = ref<KillEntry[]>([])
let id = 0

const EMOJIS: Record<string, string> = {
  blaster: '🔫', shotgun: '🪃', rocket: '🚀', frost_ray: '❄️',
}

function weaponEmoji(wid: string): string {
  return EMOJIS[wid] ?? '⚔️'
}

function addKill(killerName: string, victimName: string, weaponId: string, myId: string, killerId: string, victimId: string): void {
  const entry: KillEntry = {
    id: id++,
    killerName,
    victimName,
    weaponId,
    isMyKill: killerId === myId,
    isMyDeath: victimId === myId,
  }
  entries.value.unshift(entry)
  if (entries.value.length > 4) entries.value.pop()
  setTimeout(() => { entries.value = entries.value.filter((e) => e.id !== entry.id) }, 4000)
}

defineExpose({ addKill })
</script>

<style scoped>
.kill-feed {
  position: absolute;
  top: 70px;
  left: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  pointer-events: none;
  z-index: 10;
}

.kill-entry {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(0,0,0,0.55);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 6px;
  padding: 5px 10px;
  font-size: 0.82rem;
  font-family: Arial, sans-serif;
  backdrop-filter: blur(4px);
}

.killer { color: #88ccff; font-weight: 700; }
.killer.is-me { color: #ffd700; }
.victim { color: rgba(255,255,255,0.7); }
.victim.is-me { color: #ff6666; font-weight: 700; }
.weapon { font-size: 1rem; }

.kill-enter-active { animation: slideIn 0.25s ease-out; }
.kill-leave-active { animation: fadeOut 0.4s ease forwards; }

@keyframes slideIn {
  from { transform: translateX(-20px); opacity: 0; }
  to   { transform: translateX(0);     opacity: 1; }
}
@keyframes fadeOut {
  to { opacity: 0; transform: translateX(-10px); }
}
</style>
