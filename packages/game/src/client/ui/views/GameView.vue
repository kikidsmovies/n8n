<template>
  <div class="game-view" ref="container">
    <canvas ref="canvas" class="game-canvas" @click="lockPointer" />

    <HudOverlay v-if="gameStore.gamePhase === 'playing' || gameStore.gamePhase === 'starting'" />
    <WinScreen v-if="gameStore.gamePhase === 'finished'" />

    <div v-if="gameStore.gamePhase === 'starting'" class="countdown-overlay">
      <div class="countdown-text">GET READY!</div>
      <div class="countdown-sub">Race to the exit • Collect diamonds • Eliminate rivals</div>
    </div>

    <div v-if="!gameStore.mazeData" class="loading-overlay">
      <div class="spinner"></div>
      <p>Loading maze...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import * as THREE from 'three'
import { createScene, resizeRenderer } from '../../three/scene/scene.setup'
import { setupLighting } from '../../three/scene/lighting'
import { CameraController } from '../../three/scene/camera.controller'
import { buildMaze } from '../../three/maze/maze.builder'
import { CharacterController } from '../../three/characters/character.controller'
import { ItemBoxMesh } from '../../three/items/item.box.mesh'
import { ProjectileMesh } from '../../three/weapons/projectile.mesh'
import { ParticleSystem } from '../../three/effects/particle.system'
import { usePlayerControls } from '../../composables/usePlayerControls'
import { useGameStore } from '../../stores/game.store'
import { useSocketStore } from '../../stores/socket.store'
import HudOverlay from '../hud/HudOverlay.vue'
import WinScreen from '../hud/WinScreen.vue'

const router = useRouter()
const gameStore = useGameStore()
const socketStore = useSocketStore()
const controls = usePlayerControls()

const container = ref<HTMLDivElement>()
const canvas = ref<HTMLCanvasElement>()

let sceneCtx: ReturnType<typeof createScene> | null = null
let cameraCtrl: CameraController | null = null
let particles: ParticleSystem | null = null
let animFrameId: number | null = null
let inputInterval: ReturnType<typeof setInterval> | null = null

const characters = new Map<string, CharacterController>()
const itemBoxMeshes = new Map<string, ItemBoxMesh>()
const projectileMeshes = new Map<string, ProjectileMesh>()

let colorIndex = 0
let mazeBuilt = false
let inputSeq = 0
let lastShootTime = 0

function lockPointer() {
  canvas.value?.requestPointerLock()
}

function initThree() {
  if (!canvas.value) return
  sceneCtx = createScene(canvas.value)
  setupLighting(sceneCtx.scene)
  cameraCtrl = new CameraController(sceneCtx.camera)
  particles = new ParticleSystem(sceneCtx.scene, 800)

  startRenderLoop()
  setupResizeObserver()
}

function setupResizeObserver() {
  const obs = new ResizeObserver(() => {
    if (!sceneCtx || !canvas.value) return
    resizeRenderer(sceneCtx.renderer, sceneCtx.camera, canvas.value)
  })
  if (container.value) obs.observe(container.value)
}

function startRenderLoop() {
  const animate = () => {
    animFrameId = requestAnimationFrame(animate)
    const dt = sceneCtx!.clock.getDelta()
    const time = sceneCtx!.clock.getElapsedTime()

    updateCharacters(dt)
    updateItemBoxes(time)
    updateProjectiles()
    particles?.update(dt)

    // Camera follows own player
    const myPlayer = gameStore.myPlayer
    if (myPlayer && sceneCtx && cameraCtrl) {
      const pos3d = new THREE.Vector3(myPlayer.position.x, 0, myPlayer.position.z)
      cameraCtrl.update(pos3d, myPlayer.rotation, dt)
    }

    sceneCtx!.renderer.render(sceneCtx!.scene, sceneCtx!.camera)
  }
  animate()
}

function updateCharacters(dt: number) {
  for (const [id, state] of gameStore.players) {
    let ctrl = characters.get(id)
    if (!ctrl) {
      ctrl = new CharacterController(id, state.username, state.skinId, colorIndex++)
      characters.set(id, ctrl)
      sceneCtx!.scene.add(ctrl.group)
    }
    ctrl.setPosition(state.position.x, state.position.z)
    ctrl.setRotation(state.rotation)
    const prevPos = ctrl.group.position.clone()
    const isMoving = Math.abs(state.position.x - prevPos.x) > 0.01 || Math.abs(state.position.z - prevPos.z) > 0.01
    ctrl.update(dt, isMoving, state.isDead)
  }

  // Remove disconnected players
  for (const [id, ctrl] of characters) {
    if (!gameStore.players.has(id)) {
      sceneCtx!.scene.remove(ctrl.group)
      ctrl.dispose()
      characters.delete(id)
    }
  }
}

function updateItemBoxes(time: number) {
  for (const [id, state] of gameStore.itemBoxes) {
    let mesh = itemBoxMeshes.get(id)
    if (!mesh) {
      mesh = new ItemBoxMesh(state)
      itemBoxMeshes.set(id, mesh)
      sceneCtx!.scene.add(mesh.group)
    }
    mesh.setActive(state.isActive)
    mesh.update(time)
  }
}

function updateProjectiles() {
  const currentIds = new Set(gameStore.projectiles.map((p) => p.id))

  // Add new
  for (const state of gameStore.projectiles) {
    if (!projectileMeshes.has(state.id)) {
      const mesh = new ProjectileMesh(state)
      projectileMeshes.set(state.id, mesh)
      sceneCtx!.scene.add(mesh.group)
    } else {
      projectileMeshes.get(state.id)!.update(state)
    }
  }

  // Remove gone
  for (const [id, mesh] of projectileMeshes) {
    if (!currentIds.has(id)) {
      sceneCtx!.scene.remove(mesh.group)
      mesh.dispose()
      projectileMeshes.delete(id)
    }
  }
}

function startInputLoop() {
  inputInterval = setInterval(() => {
    if (gameStore.gamePhase !== 'playing') return
    const myPlayer = gameStore.myPlayer
    if (!myPlayer || myPlayer.isDead) return

    const vel = controls.getVelocity()
    inputSeq++
    socketStore.emit('player_input', {
      seq: inputSeq,
      velocity: vel,
      rotation: controls.rotation.value,
      timestamp: Date.now(),
    })

    // Shooting
    if (controls.isShooting() && Date.now() - lastShootTime > 100) {
      lastShootTime = Date.now()
      const dir = {
        x: Math.sin(controls.rotation.value),
        y: 0,
        z: Math.cos(controls.rotation.value),
      }
      socketStore.emit('player_shoot', { direction: dir })
    }
  }, 50)
}

function setupSocketListeners() {
  socketStore.on('state_update', (snap: unknown) => {
    gameStore.applySnapshot(snap as any)
  })

  socketStore.on('player_died', (data: { playerId: string }) => {
    const pos = gameStore.players.get(data.playerId)?.position
    if (pos && sceneCtx && particles) {
      particles.emitExplosion(new THREE.Vector3(pos.x, 1, pos.z), 0xff4400)
    }
  })

  socketStore.on('item_collected', (data: { boxId: string }) => {
    const box = gameStore.itemBoxes.get(data.boxId)
    if (box && sceneCtx && particles) {
      const colors: Record<string, number> = { speed: 0x00ffcc, shield: 0x4488ff, teleport: 0xaa44ff, health: 0x44ff44, diamond: 0x88eeff }
      particles.emit(new THREE.Vector3(box.worldX, 1, box.worldZ), colors[box.type] ?? 0xffffff, 25, 2, true)
    }
  })

  socketStore.on('item_box_respawned', (data: { boxId: string }) => {
    gameStore.onItemBoxRespawned(data.boxId)
  })

  socketStore.on('game_over', (data: unknown) => {
    gameStore.onGameOver(data as any)
  })
}

function buildMazeScene() {
  if (!sceneCtx || !gameStore.mazeData || mazeBuilt) return
  mazeBuilt = true
  buildMaze(sceneCtx.scene, gameStore.mazeData)
}

onMounted(() => {
  if (!gameStore.mazeData) {
    router.push('/lobby')
    return
  }

  initThree()
  setupSocketListeners()
  startInputLoop()

  // Build maze when data is available
  buildMazeScene()

  // Add existing players
  for (const [, state] of gameStore.players) {
    if (!characters.has(state.id) && sceneCtx) {
      const ctrl = new CharacterController(state.id, state.username, state.skinId, colorIndex++)
      characters.set(state.id, ctrl)
      sceneCtx.scene.add(ctrl.group)
    }
  }
})

onUnmounted(() => {
  if (animFrameId) cancelAnimationFrame(animFrameId)
  if (inputInterval) clearInterval(inputInterval)
  document.exitPointerLock()

  for (const [, ctrl] of characters) ctrl.dispose()
  for (const [, mesh] of itemBoxMeshes) mesh.dispose()
  for (const [, mesh] of projectileMeshes) mesh.dispose()
  particles?.dispose()
  sceneCtx?.renderer.dispose()
})
</script>

<style scoped>
.game-view {
  position: relative;
  width: 100%;
  height: 100%;
  background: #0a0a1a;
  overflow: hidden;
}

.game-canvas {
  width: 100%;
  height: 100%;
  display: block;
  cursor: crosshair;
}

.loading-overlay, .countdown-overlay {
  position: absolute; inset: 0;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  pointer-events: none;
}

.loading-overlay {
  background: rgba(10,10,26,0.9);
  color: #fff;
  gap: 16px;
  font-size: 1.2rem;
}

.countdown-overlay {
  background: rgba(0,0,0,0.5);
}

.countdown-text {
  font-size: 3rem;
  font-weight: 900;
  color: #fff;
  text-shadow: 0 0 30px rgba(100,150,255,0.8);
  animation: pulse 0.5s ease-in-out infinite alternate;
  letter-spacing: 4px;
}

.countdown-sub {
  color: rgba(255,255,255,0.7);
  margin-top: 12px;
  font-size: 1rem;
}

@keyframes pulse { from { transform: scale(0.98); } to { transform: scale(1.02); } }

.spinner {
  width: 48px; height: 48px;
  border: 4px solid rgba(255,255,255,0.1);
  border-top-color: #4466ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
