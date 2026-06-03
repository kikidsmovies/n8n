import * as THREE from 'three'
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  BloomEffect,
  ChromaticAberrationEffect,
  VignetteEffect,
} from 'postprocessing'

export interface PostFX {
  composer: EffectComposer
  bloomEffect: BloomEffect
  caEffect: ChromaticAberrationEffect
  update: (dt: number) => void
  setCAIntensity: (v: number) => void
}

export function createPostprocessing(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
): PostFX {
  const composer = new EffectComposer(renderer, {
    multisampling: Math.min(4, renderer.capabilities.maxSamples),
  })

  const renderPass = new RenderPass(scene, camera)
  composer.addPass(renderPass)

  const bloomEffect = new BloomEffect({
    intensity: 2.2,
    luminanceThreshold: 0.35,
    luminanceSmoothing: 0.1,
    radius: 0.85,
    levels: 8,
  })

  const caEffect = new ChromaticAberrationEffect({
    offset: new THREE.Vector2(0.0015, 0.0015),
  })

  const vignetteEffect = new VignetteEffect({
    offset: 0.45,
    darkness: 0.65,
  })

  const effectPass = new EffectPass(camera, bloomEffect, caEffect, vignetteEffect)
  effectPass.renderToScreen = true
  composer.addPass(effectPass)

  return {
    composer,
    bloomEffect,
    caEffect,
    update(dt) {
      composer.render(dt)
    },
    setCAIntensity(v: number) {
      caEffect.offset.set(v, v)
    },
  }
}
