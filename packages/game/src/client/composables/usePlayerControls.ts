import { onMounted, onUnmounted, ref } from 'vue'

export function usePlayerControls() {
  const keys = ref<Set<string>>(new Set())
  const rotation = ref(0)
  const mouseX = ref(0)

  let lastMouseX = 0

  const onKeyDown = (e: KeyboardEvent) => {
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault()
    }
    keys.value.add(e.code)
  }

  const onKeyUp = (e: KeyboardEvent) => {
    keys.value.delete(e.code)
  }

  const onMouseMove = (e: MouseEvent) => {
    const dx = e.clientX - lastMouseX
    rotation.value -= dx * 0.003
    lastMouseX = e.clientX
    mouseX.value = e.clientX
  }

  const onPointerLock = () => {
    document.addEventListener('mousemove', onMouseMove)
  }

  const onPointerUnlock = () => {
    document.removeEventListener('mousemove', onMouseMove)
  }

  onMounted(() => {
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement) onPointerLock()
      else onPointerUnlock()
    })
  })

  onUnmounted(() => {
    window.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('keyup', onKeyUp)
    document.removeEventListener('mousemove', onMouseMove)
  })

  function getVelocity(): { x: number; z: number } {
    let vx = 0; let vz = 0
    const forward = { x: Math.sin(rotation.value), z: Math.cos(rotation.value) }
    const right = { x: Math.cos(rotation.value), z: -Math.sin(rotation.value) }

    if (keys.value.has('KeyW') || keys.value.has('ArrowUp')) { vx += forward.x; vz += forward.z }
    if (keys.value.has('KeyS') || keys.value.has('ArrowDown')) { vx -= forward.x; vz -= forward.z }
    if (keys.value.has('KeyA') || keys.value.has('ArrowLeft')) { vx -= right.x; vz -= right.z }
    if (keys.value.has('KeyD') || keys.value.has('ArrowRight')) { vx += right.x; vz += right.z }

    const len = Math.sqrt(vx * vx + vz * vz)
    if (len > 0) { vx /= len; vz /= len }
    return { x: vx, z: vz }
  }

  function isShooting(): boolean {
    return keys.value.has('Space')
  }

  function requestPointerLock(canvas: HTMLElement): void {
    canvas.requestPointerLock()
  }

  return { keys, rotation, getVelocity, isShooting, requestPointerLock }
}
