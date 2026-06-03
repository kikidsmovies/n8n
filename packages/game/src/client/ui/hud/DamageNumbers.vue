<template>
  <div class="damage-numbers-overlay" aria-hidden="true">
    <TransitionGroup name="dmg">
      <div
        v-for="n in numbers"
        :key="n.id"
        class="damage-number"
        :class="n.type"
        :style="{ left: n.x + 'px', top: n.y + 'px' }"
      >{{ n.text }}</div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import * as THREE from 'three'

interface DamageNum {
  id: number
  x: number
  y: number
  text: string
  type: 'damage' | 'heal' | 'diamond' | 'kill'
}

const numbers = ref<DamageNum[]>([])
let idCounter = 0

function showDamageNumber(
  worldPos: THREE.Vector3,
  camera: THREE.PerspectiveCamera,
  amount: number,
  type: DamageNum['type'] = 'damage',
): void {
  const canvas = document.querySelector('canvas')
  if (!canvas) return

  const vec = worldPos.clone().project(camera)
  const x = (vec.x * 0.5 + 0.5) * canvas.clientWidth + (Math.random() - 0.5) * 30
  const y = (-vec.y * 0.5 + 0.5) * canvas.clientHeight - 20

  const text = type === 'damage' ? `-${Math.round(amount)}`
    : type === 'heal' ? `+${amount} HP`
    : type === 'diamond' ? `+${amount} 💎`
    : 'KILL! 💀'

  const num: DamageNum = { id: idCounter++, x, y, text, type }
  numbers.value.push(num)
  setTimeout(() => {
    numbers.value = numbers.value.filter((n) => n.id !== num.id)
  }, 1200)
}

defineExpose({ showDamageNumber })
</script>

<style scoped>
.damage-numbers-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 10;
}

.damage-number {
  position: absolute;
  font-family: Arial, sans-serif;
  font-weight: 900;
  font-size: 1.4rem;
  text-shadow: 0 2px 6px rgba(0,0,0,0.8);
  white-space: nowrap;
  pointer-events: none;
  animation: floatUp 1.2s ease-out forwards;
}

.damage-number.damage  { color: #ff4444; }
.damage-number.heal    { color: #44ff88; }
.damage-number.diamond { color: #88eeff; }
.damage-number.kill    { color: #ffd700; font-size: 1.8rem; }

@keyframes floatUp {
  0%   { transform: translateY(0) scale(1.2);  opacity: 1; }
  30%  { transform: translateY(-20px) scale(1); opacity: 1; }
  100% { transform: translateY(-70px) scale(0.8); opacity: 0; }
}
</style>
