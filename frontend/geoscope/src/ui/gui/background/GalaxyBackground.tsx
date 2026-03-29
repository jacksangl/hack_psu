import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const galaxyVertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const galaxyFragmentShader = `
precision highp float;

uniform float uTime;
uniform vec2 uResolution;

varying vec2 vUv;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;

  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p = p * 2.02 + vec2(17.1, 9.4);
    amplitude *= 0.5;
  }

  return value;
}

float starLayer(vec2 uv, float scale, float threshold, float twinkleOffset) {
  vec2 cellUv = uv * scale;
  vec2 cell = floor(cellUv);
  vec2 local = fract(cellUv) - 0.5;
  float rnd = hash(cell);
  float starMask = smoothstep(threshold, 1.0, rnd);
  float dist = length(local);
  float starShape = smoothstep(0.12, 0.0, dist);
  float twinkle = 0.92 + 0.08 * sin(uTime * (0.18 + rnd * 0.22) + rnd * 6.28318 + twinkleOffset);
  return starMask * starShape * twinkle;
}

float blurryStarLayer(vec2 uv, float scale, float threshold, float twinkleOffset) {
  vec2 cellUv = uv * scale;
  vec2 cell = floor(cellUv);
  vec2 local = fract(cellUv) - 0.5;
  vec2 starOffset = vec2(
    hash(cell + vec2(3.1, 7.2)),
    hash(cell + vec2(8.4, 1.7))
  ) - 0.5;
  local -= starOffset * 0.42;

  float rnd = hash(cell + vec2(11.8, 4.6));
  float starMask = smoothstep(threshold, 1.0, rnd);
  float dist = length(local);
  float halo = smoothstep(0.32, 0.0, dist);
  float softCore = smoothstep(0.1, 0.0, dist);
  float twinkle = 0.95 + 0.05 * sin(uTime * (0.1 + rnd * 0.16) + rnd * 6.28318 + twinkleOffset);

  return starMask * (halo * 0.75 + softCore * 0.25) * twinkle;
}

void main() {
  vec2 uv = vUv;
  vec2 centeredUv = uv - 0.5;
  centeredUv.x *= uResolution.x / max(uResolution.y, 1.0);
  vec2 sunCenter = vec2(-0.62, 0.38);

  float drift = uTime * 0.01;
  vec2 nebulaUvA = centeredUv * 1.35 + vec2(drift * 0.35, -drift * 0.2);
  vec2 nebulaUvB = centeredUv * 2.1 + vec2(-drift * 0.18, drift * 0.28);

  float nebulaA = fbm(nebulaUvA + fbm(nebulaUvB + 2.0) * 0.4);
  float nebulaB = fbm(nebulaUvB - fbm(nebulaUvA - 3.0) * 0.3);
  float haze = smoothstep(0.38, 0.82, nebulaA * 0.7 + nebulaB * 0.45);

  vec3 baseColor = vec3(0.014, 0.022, 0.055);
  vec3 deepBlue = vec3(0.03, 0.055, 0.11);
  vec3 nebulaPurple = vec3(0.12, 0.08, 0.18);
  vec3 nebulaBlue = vec3(0.05, 0.11, 0.2);

  vec3 color = baseColor;
  color += deepBlue * smoothstep(1.1, 0.15, length(centeredUv)) * 0.45;
  color += nebulaPurple * haze * 0.28;
  color += nebulaBlue * smoothstep(0.35, 0.9, nebulaB) * 0.22;

  float sunDist = length(centeredUv - sunCenter);
  float sunGlow = smoothstep(1.18, 0.0, sunDist);
  float sunCore = smoothstep(0.38, 0.0, sunDist);
  vec3 sunColor = vec3(0.88, 0.62, 0.28);
  vec3 sunHaloColor = vec3(0.32, 0.24, 0.18);
  color += sunHaloColor * sunGlow * 0.2;
  color += sunColor * sunCore * 0.08;

  float stars =
    starLayer(uv + vec2(drift * 0.08, 0.0), 34.0, 0.9925, 0.3) * 0.28 +
    starLayer(uv + vec2(-drift * 0.05, drift * 0.03), 52.0, 0.9965, 1.7) * 0.2 +
    starLayer(uv + vec2(drift * 0.03, -drift * 0.02), 78.0, 0.9985, 2.4) * 0.12;
  float blurryStars =
    blurryStarLayer(uv + vec2(drift * 0.02, -drift * 0.01), 13.0, 0.9865, 0.8) * 0.13 +
    blurryStarLayer(uv + vec2(-drift * 0.018, drift * 0.012), 19.0, 0.9915, 2.1) * 0.08;

  color += vec3(0.82, 0.88, 1.0) * stars;
  color += vec3(0.26, 0.34, 0.5) * blurryStars;
  color += vec3(0.68, 0.74, 0.88) * blurryStars * 0.18;

  float vignette = smoothstep(0.92, 0.24, length(centeredUv));
  color *= mix(0.48, 1.0, vignette);

  gl_FragColor = vec4(color, 1.0);
}
`;

function GalaxyPlane() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { size } = useThree();

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(size.width, size.height) },
    }),
    []
  );

  useEffect(() => {
    uniforms.uResolution.value.set(size.width, size.height);
  }, [size.height, size.width, uniforms]);

  useFrame((state) => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={galaxyVertexShader}
        fragmentShader={galaxyFragmentShader}
        depthWrite={false}
        depthTest={false}
      />
    </mesh>
  );
}

export function GalaxyBackground() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      <Canvas
        orthographic
        camera={{ position: [0, 0, 1], zoom: 1 }}
        gl={{
          alpha: false,
          antialias: false,
          powerPreference: "high-performance",
        }}
        dpr={Math.min(window.devicePixelRatio, 1.5)}
        frameloop="always"
      >
        <GalaxyPlane />
      </Canvas>
    </div>
  );
}

export { galaxyVertexShader, galaxyFragmentShader };
