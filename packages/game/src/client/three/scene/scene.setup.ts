import * as THREE from 'three'

export interface SceneContext {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  clock: THREE.Clock
}

export function createScene(canvas: HTMLCanvasElement): SceneContext {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(canvas.clientWidth, canvas.clientHeight)
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.2
  renderer.outputColorSpace = THREE.SRGBColorSpace

  const scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(0x0a0a1a, 0.025)
  scene.background = new THREE.Color(0x0a0a1a)

  const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 200)
  camera.position.set(0, 8, -6)
  camera.lookAt(0, 0, 0)

  const clock = new THREE.Clock()

  return { scene, camera, renderer, clock }
}

export function resizeRenderer(renderer: THREE.WebGLRenderer, camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement) {
  renderer.setSize(canvas.clientWidth, canvas.clientHeight)
  camera.aspect = canvas.clientWidth / canvas.clientHeight
  camera.updateProjectionMatrix()
}
