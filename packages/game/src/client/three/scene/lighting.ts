import * as THREE from 'three'

export function setupLighting(scene: THREE.Scene): void {
  const hemisphere = new THREE.HemisphereLight(0x334466, 0x110022, 0.6)
  scene.add(hemisphere)

  const sun = new THREE.DirectionalLight(0xffffff, 1.2)
  sun.position.set(20, 30, 20)
  sun.castShadow = true
  sun.shadow.mapSize.width = 2048
  sun.shadow.mapSize.height = 2048
  sun.shadow.camera.near = 0.5
  sun.shadow.camera.far = 200
  sun.shadow.camera.left = -60
  sun.shadow.camera.right = 60
  sun.shadow.camera.top = 60
  sun.shadow.camera.bottom = -60
  sun.shadow.bias = -0.001
  scene.add(sun)

  const ambient = new THREE.AmbientLight(0x1a1a3a, 0.4)
  scene.add(ambient)
}

export function createPlayerLight(color: number): THREE.PointLight {
  const light = new THREE.PointLight(color, 2.0, 6)
  light.position.set(0, 1.5, 0)
  return light
}

export function createItemGlow(color: number): THREE.PointLight {
  const light = new THREE.PointLight(color, 1.5, 4)
  light.position.set(0, 0.5, 0)
  return light
}
