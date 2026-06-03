import * as THREE from 'three'

const vertexShader = `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragmentShader = `
varying vec3 vDir;
uniform float uTime;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float stars(vec3 dir, float density) {
  vec2 uv = vec2(atan(dir.x, dir.z), asin(dir.y)) * (1.0 / 3.14159);
  vec2 cell = floor(uv * density);
  float s = hash(cell);
  vec2 off = vec2(hash(cell + 0.3), hash(cell + 0.7)) - 0.5;
  vec2 local = fract(uv * density) - 0.5 + off * 0.6;
  float d = length(local);
  float twinkle = 0.85 + 0.15 * sin(uTime * 2.0 + s * 6.28);
  return s > 0.92 ? smoothstep(0.06, 0.0, d) * twinkle : 0.0;
}

void main() {
  vec3 dir = normalize(vDir);

  // Base sky gradient (deep space)
  float y = dir.y * 0.5 + 0.5;
  vec3 topColor    = vec3(0.0, 0.01, 0.06);
  vec3 bottomColor = vec3(0.03, 0.0, 0.08);
  vec3 sky = mix(bottomColor, topColor, y);

  // Nebula layers (purple / blue wisps)
  float n1 = hash(vec2(dir.x * 3.0 + uTime * 0.002, dir.z * 3.0));
  float n2 = hash(vec2(dir.x * 5.0 - uTime * 0.001, dir.y * 5.0));
  vec3 nebula = vec3(0.06, 0.0, 0.12) * n1 * 0.35
              + vec3(0.0, 0.04, 0.10) * n2 * 0.25;
  sky += nebula * smoothstep(0.0, 0.3, abs(dir.y));

  // Stars
  float s = stars(dir, 80.0) * 0.9 + stars(dir, 160.0) * 0.4;
  vec3 starColor = mix(vec3(0.7, 0.8, 1.0), vec3(1.0, 0.9, 0.7), hash(vec2(dir.x, dir.y)));
  sky += starColor * s;

  gl_FragColor = vec4(sky, 1.0);
}
`

export function createSkybox(scene: THREE.Scene): THREE.Mesh {
  const geo = new THREE.SphereGeometry(150, 32, 16)
  const mat = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: { uTime: { value: 0 } },
    side: THREE.BackSide,
    depthWrite: false,
  })

  const sky = new THREE.Mesh(geo, mat)
  sky.renderOrder = -1
  scene.add(sky)

  return sky
}

export function updateSkybox(sky: THREE.Mesh, time: number): void {
  ;(sky.material as THREE.ShaderMaterial).uniforms.uTime.value = time
}
