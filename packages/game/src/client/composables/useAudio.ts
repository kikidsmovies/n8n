let ctx: AudioContext | null = null
let masterGain: GainNode | null = null
let bgmNodes: AudioNode[] = []
let bgmRunning = false

function getCtx(): AudioContext {
  if (!ctx) {
    ctx = new AudioContext()
    masterGain = ctx.createGain()
    masterGain.gain.value = 0.6
    masterGain.connect(ctx.destination)
  }
  return ctx
}

function playTone(
  frequency: number,
  type: OscillatorType,
  duration: number,
  volume = 0.3,
  attack = 0.01,
  startDelay = 0,
): void {
  const c = getCtx()
  if (!masterGain) return
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = type
  osc.frequency.value = frequency
  gain.gain.setValueAtTime(0, c.currentTime + startDelay)
  gain.gain.linearRampToValueAtTime(volume, c.currentTime + startDelay + attack)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + startDelay + duration)
  osc.connect(gain)
  gain.connect(masterGain)
  osc.start(c.currentTime + startDelay)
  osc.stop(c.currentTime + startDelay + duration + 0.01)
}

function playNoise(duration: number, volume = 0.15, frequency = 2000): void {
  const c = getCtx()
  if (!masterGain) return
  const bufSize = c.sampleRate * duration
  const buf = c.createBuffer(1, bufSize, c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1

  const src = c.createBufferSource()
  src.buffer = buf
  const filter = c.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.value = frequency
  filter.Q.value = 3
  const gain = c.createGain()
  gain.gain.setValueAtTime(volume, c.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration)
  src.connect(filter)
  filter.connect(gain)
  gain.connect(masterGain!)
  src.start()
}

// ----- BGM (synthwave procedural loop) -----
const ARPEGGIO = [261.63, 329.63, 392.0, 493.88] // C4 E4 G4 B4
let arpIdx = 0
let bgmInterval: ReturnType<typeof setInterval> | null = null

function startBGM(): void {
  if (bgmRunning) return
  bgmRunning = true
  getCtx()

  // Bass drone
  const bass = getCtx().createOscillator()
  const bassGain = getCtx().createGain()
  const bassFilter = getCtx().createBiquadFilter()
  bass.type = 'sawtooth'
  bass.frequency.value = 55
  bassFilter.type = 'lowpass'
  bassFilter.frequency.value = 200
  bassGain.gain.value = 0.12
  bass.connect(bassFilter)
  bassFilter.connect(bassGain)
  bassGain.connect(masterGain!)
  bass.start()
  bgmNodes.push(bass, bassGain, bassFilter)

  // Arpeggio
  bgmInterval = setInterval(() => {
    const freq = ARPEGGIO[arpIdx % ARPEGGIO.length] * 2
    arpIdx++
    playTone(freq, 'square', 0.18, 0.04, 0.005)
    // Occasional sub bass hit
    if (arpIdx % 4 === 0) playTone(55, 'sine', 0.25, 0.08, 0.005)
    if (arpIdx % 8 === 0) playNoise(0.08, 0.08, 6000) // hi-hat
    if (arpIdx % 16 === 0) playNoise(0.15, 0.12, 200)  // kick
  }, 125) // 120 BPM / 4 notes per beat
}

function stopBGM(): void {
  bgmRunning = false
  if (bgmInterval) clearInterval(bgmInterval)
  bgmInterval = null
  bgmNodes.forEach((n) => { try { (n as AudioScheduledSourceNode).stop?.() } catch {} })
  bgmNodes = []
}

// ----- SFX -----
export function useAudio() {
  return {
    startBGM,
    stopBGM,

    playShoot(weaponId: string) {
      if (!ctx && typeof AudioContext === 'undefined') return
      const configs: Record<string, () => void> = {
        blaster: () => playTone(880, 'square', 0.08, 0.15),
        shotgun: () => playNoise(0.12, 0.3, 3000),
        rocket: () => { playTone(220, 'sawtooth', 0.3, 0.2); playNoise(0.15, 0.12, 400) },
        frost_ray: () => playTone(1400, 'sine', 0.06, 0.1),
      }
      ;(configs[weaponId] ?? configs.blaster)()
    },

    playHit() {
      playNoise(0.08, 0.3, 1500)
      playTone(200, 'sawtooth', 0.1, 0.15)
    },

    playDeath() {
      const freqs = [440, 330, 220, 165]
      freqs.forEach((f, i) => playTone(f, 'sawtooth', 0.2, 0.12, 0.01, i * 0.12))
    },

    playPickup(type: string) {
      const configs: Record<string, () => void> = {
        diamond: () => [1047, 1319, 1568].forEach((f, i) => playTone(f, 'sine', 0.15, 0.1, 0.005, i * 0.06)),
        health: () => [523, 659, 784].forEach((f, i) => playTone(f, 'sine', 0.2, 0.1, 0.01, i * 0.05)),
        speed: () => [659, 784, 1047].forEach((f, i) => playTone(f, 'square', 0.1, 0.08, 0.005, i * 0.04)),
        shield: () => playTone(440, 'sine', 0.4, 0.1),
        teleport: () => { playTone(880, 'sine', 0.15, 0.1); setTimeout(() => playTone(1760, 'sine', 0.1, 0.08), 200) },
      }
      ;(configs[type] ?? configs.diamond)()
    },

    playWin() {
      const notes = [523, 659, 784, 1047, 784, 1047, 1175]
      notes.forEach((f, i) => playTone(f, 'square', 0.25, 0.12, 0.01, i * 0.1))
    },

    playLose() {
      const notes = [440, 415, 392, 330]
      notes.forEach((f, i) => playTone(f, 'sawtooth', 0.3, 0.15, 0.01, i * 0.15))
    },

    resume() {
      ctx?.resume()
    },
  }
}
