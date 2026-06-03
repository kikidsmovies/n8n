import * as THREE from 'three'

export function setupLighting(scene: THREE.Scene): void {
  // Hemisphere: cool sky / warm ground bounce
  const hemisphere = new THREE.HemisphereLight(0x3355aa, 0x221133, 0.8)
  scene.add(hemisphere)

  // Main directional (sun) — moderate intensity for neon aesthetic
  const sun = new THREE.DirectionalLight(0xffffff, 1.4)
  sun.position.set(20, 35, 15)
  sun.castShadow = true
  sun.shadow.mapSize.width = 2048
  sun.shadow.mapSize.height = 2048
  sun.shadow.camera.near = 0.5
  sun.shadow.camera.far = 250
  sun.shadow.camera.left = -70
  sun.shadow.camera.right = 70
  sun.shadow.camera.top = 70
  sun.shadow.camera.bottom = -70
  sun.shadow.bias = -0.001
  scene.add(sun)

  // Fill light from opposite side
  const fill = new THREE.DirectionalLight(0x4466ff, 0.5)
  fill.position.set(-20, 15, -20)
  scene.add(fill)

  // Ambient — slightly warm to make characters pop
  const ambient = new THREE.AmbientLight(0x202040, 0.6)
  scene.add(ambient)
}

export function createPlayerLight(color: number): THREE.PointLight {
  const light = new THREE.PointLight(color, 2.5, 7)
  light.position.set(0, 1.5, 0)
  return light
}

export function createItemGlow(color: number): THREE.PointLight {
  const light = new THREE.PointLight(color, 1.8, 5)
  light.position.set(0, 0.5, 0)
  return light
}
