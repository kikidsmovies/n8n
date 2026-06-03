<template>
  <div class="game-view" ref="container">
    <canvas ref="canvas" class="game-canvas" @click="lockPointer" />

    <HudOverlay v-if="gameStore.gamePhase === 'playing' || gameStore.gamePhase === 'starting'" />
    <KillFeed ref="killFeedRef" v-if="gameStore.gamePhase === 'playing'" />
    <DamageNumbers ref="dmgNumRef" />
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
import { createSkybox, updateSkybox } from '../../three/scene/skybox'
import { buildMaze } from '../../three/maze/maze.builder'
import { CharacterController } from '../../three/characters/character.controller'
import { ItemBoxMesh } from '../../three/items/item.box.mesh'
import { ProjectileMesh } from '../../three/weapons/projectile.mesh'
import { ParticleSystem } from '../../three/effects/particle.system'
import { createPostprocessing, type PostFX } from '../../three/effects/postprocessing'
import { ScreenEffects } from '../../three/effects/screen.effects'
import { WeaponEffects } from '../../three/effects/weapon.effects'
import { usePlayerControls } from '../../composables/usePlayerControls'
import { useAudio } from '../../composables/useAudio'
import { useGameStore } from '../../stores/game.store'
import { useSocketStore } from '../../stores/socket.store'
import HudOverlay from '../hud/HudOverlay.vue'
import WinScreen from '../hud/WinScreen.vue'
import KillFeed from '../hud/KillFeed.vue'
import DamageNumbers from '../hud/DamageNumbers.vue'

const router = useRouter()
const gameStore = useGameStore()
const socketStore = useSocketStore()
const controls = usePlayerControls()
const audio = useAudio()

const container = ref<HTMLDivElement>()
const canvas = ref<HTMLCanvasElement>()
const killFeedRef = ref<InstanceType<typeof KillFeed>>()
const dmgNumRef = ref<InstanceType<typeof DamageNumbers>>()

let sceneCtx: ReturnType<typeof createScene> | null = null
let cameraCtrl: CameraController | null = null
let particles: ParticleSystem | null = null
let postFX: PostFX | null = null
let screenFX: ScreenEffects | null = null
let weaponFX: WeaponEffects | null = null
let skybox: THREE.Mesh | null = null
let floorMat: THREE.ShaderMaterial | null = null
let ceilMat: THREE.ShaderMaterial | null = null
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
  audio.resume()
  canvas.value?.requestPointerLock()
}

function initThree() {
  if (!canvas.value) return

  sceneCtx = createScene(canvas.value)
  setupLighting(sceneCtx.scene)
  cameraCtrl = new CameraController(sceneCtx.camera)
  particles = new ParticleSystem(sceneCtx.scene, 2000)
  postFX = createPostprocessing(sceneCtx.renderer, sceneCtx.scene, sceneCtx.camera)
  screenFX = new ScreenEffects(sceneCtx.camera, sceneCtx.scene)
  weaponFX = new WeaponEffects(sceneCtx.scene, particles)
  skybox = createSkybox(sceneCtx.scene)

  // Start BGM on first user interaction
  audio.startBGM()

  startRenderLoop()
  setupResizeObserver()
}

function setupResizeObserver() {
  const obs = new ResizeObserver(() => {
    if (!sceneCtx || !canvas.value) return
    resizeRenderer(sceneCtx.renderer, sceneCtx.camera, canvas.value)
    if (postFX) postFX.composer.setSize(canvas.value.clientWidth, canvas.value.clientHeight)
  })
  if (container.value) obs.observe(container.value)
}

function startRenderLoop() {
  const animate = () => {
    animFrameId = requestAnimationFrame(animate)
    const dt = sceneCtx!.clock.getDelta()
    const time = sceneCtx!.clock.getElapsedTime()

    updateCharacters(dt, time)
    updateItemBoxes(time)
    updateProjectiles()
    particles?.update(dt)
    screenFX?.update(dt)
    if (skybox) updateSkybox(skybox, time)
    if (floorMat) floorMat.uniforms.uTime.value = time
    if (ceilMat) ceilMat.uniforms.uTime.value = time

    // Speed effect FOV
    const myPlayer = gameStore.myPlayer
    const hasSpeed = myPlayer?.effects.some((e) => e.type === 'speed')
    screenFX?.setTargetFov(hasSpeed ? 88 : 75)

    // Camera follows own player
    if (myPlayer && sceneCtx && cameraCtrl) {
      const pos3d = new THREE.Vector3(myPlayer.position.x, 0, myPlayer.position.z)
      cameraCtrl.update(pos3d, myPlayer.rotation, dt)
    }

    // Use postprocessing instead of direct render
    if (postFX) {
      postFX.update(dt)
    } else {
      sceneCtx!.renderer.render(sceneCtx!.scene, sceneCtx!.camera)
    }
  }
  animate()
}

function updateCharacters(dt: number, time: number) {
  for (const [id, state] of gameStore.players) {
    let ctrl = characters.get(id)
    if (!ctrl) {
      ctrl = new CharacterController(id, state.username, state.skinId, colorIndex++)
      characters.set(id, ctrl)
      sceneCtx!.scene.add(ctrl.group)
    }
    ctrl.setPosition(state.position.x, state.position.z)
    ctrl.setRotation(state.rotation)
    const hasShield = state.effects.some((e) => e.type === 'shield')
    ctrl.update(dt, ctrl.isMovingNow(), state.isDead, hasShield, time)
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

  for (const state of gameStore.projectiles) {
    if (!projectileMeshes.has(state.id)) {
      const mesh = new ProjectileMesh(state)
      projectileMeshes.set(state.id, mesh)
      sceneCtx!.scene.add(mesh.group)

      // Muzzle flash at spawn point
      const spawnPos = new THREE.Vector3(state.position.x, state.position.y, state.position.z)
      const dir = new THREE.Vector3(state.direction.x, state.direction.y, state.direction.z)
      weaponFX?.muzzleFlash(spawnPos, dir, state.weaponId)
      audio.playShoot(state.weaponId)
    } else {
      projectileMeshes.get(state.id)!.update(state)
    }
  }

  // Remove gone projectiles
  for (const [id, mesh] of projectileMeshes) {
    if (!currentIds.has(id)) {
      const pos = mesh.group.position
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

    if (controls.isShooting() && Date.now() - lastShootTime > 80) {
      lastShootTime = Date.now()
      socketStore.emit('player_shoot', {
        direction: {
          x: Math.sin(controls.rotation.value),
          y: 0,
          z: Math.cos(controls.rotation.value),
        },
      })
    }
  }, 50)
}

function setupSocketListeners() {
  socketStore.on('state_update', (snap: unknown) => {
    gameStore.applySnapshot(snap as any)
  })

  socketStore.on('player_hit', (data: { attackerId: string; targetId: string; damage: number; remainingHp: number }) => {
    const myId = socketStore.socket.value?.id
    const targetPlayer = gameStore.players.get(data.targetId)

    if (targetPlayer && sceneCtx) {
      const worldPos = new THREE.Vector3(targetPlayer.position.x, 1.2, targetPlayer.position.z)

      // Damage number
      if (dmgNumRef.value) {
        ;(dmgNumRef.value as any).showDamageNumber?.(worldPos, sceneCtx.camera, data.damage, 'damage')
      }

      // Hit spark particles
      particles?.emit(worldPos, 0xff4444, 10, 2.5)

      // Screen shake if WE got hit
      if (data.targetId === myId) {
        screenFX?.shake(0.25, 300)
        screenFX?.hitFlash(0xff2200, 100)
        audio.playHit()
        // Flash the character
        characters.get(data.targetId)?.flashHit()
      }
    }
  })

  socketStore.on('player_died', (data: { playerId: string; killerId: string }) => {
    const deadPlayer = gameStore.players.get(data.playerId)
    const killer = gameStore.players.get(data.killerId)
    const myId = socketStore.socket.value?.id

    if (deadPlayer && sceneCtx && particles) {
      const pos = new THREE.Vector3(deadPlayer.position.x, 1, deadPlayer.position.z)
      particles.emitExplosion(pos, 0xff4400)
      particles.emit(pos, 0xffcc00, 15, 4, true) // gold debris
    }

    if (data.playerId === myId) {
      screenFX?.shake(0.7, 600)
      screenFX?.hitFlash(0xff0000, 300)
      audio.playDeath()
    }

    // Kill feed
    if (killer && deadPlayer && killFeedRef.value) {
      ;(killFeedRef.value as any).addKill?.(
        killer.username,
        deadPlayer.username,
        gameStore.players.get(data.killerId)?.weaponId ?? 'blaster',
        myId ?? '',
        data.killerId,
        data.playerId,
      )
    }

    // Kill number
    if (data.killerId === myId && deadPlayer && sceneCtx) {
      const pos = new THREE.Vector3(deadPlayer.position.x, 1.5, deadPlayer.position.z)
      if (dmgNumRef.value) {
        ;(dmgNumRef.value as any).showDamageNumber?.(pos, sceneCtx.camera, 0, 'kill')
      }
    }
  })

  socketStore.on('item_collected', (data: { playerId: string; boxId: string; itemType: string }) => {
    const box = gameStore.itemBoxes.get(data.boxId)
    const myId = socketStore.socket.value?.id

    if (box && sceneCtx && particles) {
      const colorMap: Record<string, number> = { speed: 0x00ffcc, shield: 0x4488ff, teleport: 0xaa44ff, health: 0x44ff44, diamond: 0x88eeff }
      const color = colorMap[box.type] ?? 0xffffff
      particles.emit(new THREE.Vector3(box.worldX, 1, box.worldZ), color, 30, 2.5, true)

      if (data.playerId === myId) {
        audio.playPickup(data.itemType)
        if (data.itemType === 'speed') {
          postFX?.setCAIntensity(0.005)
          setTimeout(() => postFX?.setCAIntensity(0.0015), 5000)
        }
      }
    }
    gameStore.itemBoxes.get(data.boxId) && (gameStore.itemBoxes.get(data.boxId)!.isActive = false)
  })

  socketStore.on('diamond_collected', (data: { playerId: string; amount: number }) => {
    const myId = socketStore.socket.value?.id
    if (data.playerId === myId) {
      audio.playPickup('diamond')
    }
  })

  socketStore.on('item_box_respawned', (data: { boxId: string }) => {
    gameStore.onItemBoxRespawned(data.boxId)
  })

  socketStore.on('game_over', (data: unknown) => {
    gameStore.onGameOver(data as any)
    const myId = socketStore.socket.value?.id
    const result = data as { winnerId: string }
    if (result.winnerId === myId) audio.playWin()
    else audio.playLose()
    audio.stopBGM()
  })
}

function buildMazeScene() {
  if (!sceneCtx || !gameStore.mazeData || mazeBuilt) return
  mazeBuilt = true
  const result = buildMaze(sceneCtx.scene, gameStore.mazeData)
  floorMat = result.floorMat
  ceilMat = result.ceilMat
}

onMounted(() => {
  if (!gameStore.mazeData) {
    router.push('/lobby')
    return
  }

  initThree()
  setupSocketListeners()
  startInputLoop()
  buildMazeScene()

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
  audio.stopBGM()

  for (const [, ctrl] of characters) ctrl.dispose()
  for (const [, mesh] of itemBoxMeshes) mesh.dispose()
  for (const [, mesh] of projectileMeshes) mesh.dispose()
  weaponFX?.removeAllTrails()
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
  background: rgba(10,10,26,0.95);
  color: #fff;
  gap: 16px;
  font-size: 1.2rem;
  font-family: Arial, sans-serif;
}

.countdown-overlay { background: rgba(0,0,0,0.55); }

.countdown-text {
  font-size: 3.5rem;
  font-weight: 900;
  color: #fff;
  font-family: Arial, sans-serif;
  text-shadow: 0 0 40px rgba(100,150,255,0.9), 0 0 80px rgba(50,100,255,0.5);
  animation: pulse 0.5s ease-in-out infinite alternate;
  letter-spacing: 6px;
}

.countdown-sub {
  color: rgba(255,255,255,0.7);
  margin-top: 12px;
  font-size: 1rem;
  font-family: Arial, sans-serif;
}

@keyframes pulse { from { transform: scale(0.97); } to { transform: scale(1.03); } }

.spinner {
  width: 48px; height: 48px;
  border: 4px solid rgba(255,255,255,0.1);
  border-top-color: #4466ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
