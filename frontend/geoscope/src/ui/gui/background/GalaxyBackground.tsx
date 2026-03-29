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

float ridgedFbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;

  for (int i = 0; i < 4; i++) {
    float n = noise(p);
    value += amplitude * (1.0 - abs(n * 2.0 - 1.0));
    p = p * 2.08 + vec2(11.4, 6.7);
    amplitude *= 0.5;
  }

  return value;
}

mat2 rotate2d(float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return mat2(c, -s, s, c);
}

float starLayer(vec2 uv, float scale, float threshold, float twinkleOffset) {
  vec2 cellUv = uv * scale;
  vec2 cell = floor(cellUv);
  vec2 local = fract(cellUv) - 0.5;
  vec2 starOffset = vec2(
    hash(cell + vec2(2.3, 7.1)),
    hash(cell + vec2(8.4, 1.9))
  ) - 0.5;
  local -= starOffset * 0.72;

  float rnd = hash(cell + vec2(10.2, 4.8));
  float starMask = smoothstep(threshold, 1.0, rnd);
  float dist = length(local);
  float starHalo = smoothstep(0.16, 0.0, dist);
  float starCore = smoothstep(0.05, 0.0, dist);
  float twinkle = 0.95 + 0.05 * sin(uTime * (0.16 + rnd * 0.2) + rnd * 6.28318 + twinkleOffset);
  return starMask * (starHalo * 0.72 + starCore * 0.28) * twinkle;
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

vec3 softPlanet(
  vec2 uv,
  vec2 center,
  float radius,
  vec3 tint,
  float opacity
) {
  vec2 local = (uv - center) / radius;
  float dist = length(local);
  float body = 1.0 - smoothstep(0.38, 1.0, dist);
  float halo = 1.0 - smoothstep(0.92, 1.7, dist);
  float rim = smoothstep(1.02, 0.62, dist) - smoothstep(0.6, 0.24, dist);
  float shade = smoothstep(-0.55, 0.8, -local.x * 0.8 + local.y * 0.22);

  vec3 planetColor = tint * body * (0.35 + shade * 0.65) * opacity;
  planetColor += tint * halo * opacity * 0.14;
  planetColor += vec3(0.68, 0.74, 0.92) * rim * opacity * 0.04;
  return planetColor;
}

vec3 supernovaBurst(
  vec2 uv,
  vec2 center,
  float radius,
  vec3 coreColor,
  vec3 haloColor,
  float pulseOffset
) {
  vec2 local = (uv - center) / radius;
  float dist = length(local);
  float pulse = 0.97 + 0.03 * sin(uTime * 0.07 + pulseOffset);
  float halo = smoothstep(1.8, 0.0, dist);
  float core = smoothstep(0.42, 0.0, dist);
  float shell = smoothstep(0.95, 0.48, dist) - smoothstep(0.48, 0.14, dist);
  float cross = smoothstep(0.16, 0.0, min(abs(local.x), abs(local.y))) *
    smoothstep(1.2, 0.08, dist);

  vec3 burst = haloColor * halo * 0.1 * pulse;
  burst += coreColor * core * 0.085 * pulse;
  burst += mix(coreColor, vec3(0.95, 0.9, 1.0), 0.35) * shell * 0.035;
  burst += vec3(0.85, 0.82, 1.0) * cross * 0.02 * pulse;
  return burst;
}

void main() {
  vec2 uv = vUv;
  vec2 centeredUv = uv - 0.5;
  centeredUv.x *= uResolution.x / max(uResolution.y, 1.0);
  vec2 sunCenter = vec2(-0.62, 0.38);

  float drift = uTime * 0.008;
  vec2 farDrift = vec2(drift * 0.12, -drift * 0.06);
  vec2 midDrift = vec2(-drift * 0.11, drift * 0.08);
  vec2 nearDrift = vec2(drift * 0.18, drift * 0.12);

  vec2 nebulaUvA = rotate2d(0.32) * (centeredUv * 1.18 + farDrift);
  vec2 nebulaUvB = rotate2d(-0.48) * (centeredUv * 1.9 + midDrift);
  vec2 nebulaUvC = rotate2d(0.9) * (centeredUv * 2.7 + nearDrift);
  vec2 dustUv = rotate2d(-0.18) * (centeredUv * 2.35 + midDrift * 1.4);
  vec2 armUv = rotate2d(0.2) * centeredUv;

  float nebulaA = fbm(nebulaUvA + fbm(nebulaUvB + 1.8) * 0.42);
  float nebulaB = fbm(nebulaUvB - fbm(nebulaUvC - 2.6) * 0.34);
  float nebulaC = fbm(nebulaUvC + vec2(nebulaA, nebulaB) * 0.28);
  float dustField = ridgedFbm(dustUv + vec2(nebulaB, nebulaA) * 0.32);
  float dustDetail = fbm(dustUv * 1.8 - nebulaC * 0.25);
  float armBand = exp(-abs(armUv.y + sin(armUv.x * 3.2 + drift * 8.0) * 0.11) * 5.5);

  float nebulaField = smoothstep(
    0.34,
    0.84,
    nebulaA * 0.52 + nebulaB * 0.34 + nebulaC * 0.24
  );
  float nebulaWisp = smoothstep(0.48, 0.95, nebulaC) * (0.7 + nebulaA * 0.3);
  float pinkDust = smoothstep(0.52, 0.9, nebulaA * nebulaB);
  float cyanDust = smoothstep(0.5, 0.88, nebulaB * 0.7 + nebulaC * 0.42);
  float dustLanes = smoothstep(0.48, 0.86, dustField) * smoothstep(0.85, 0.18, dustDetail + armBand * 0.45);

  vec3 baseColor = vec3(0.012, 0.018, 0.048);
  vec3 deepBlue = vec3(0.024, 0.05, 0.11);
  vec3 nebulaBlue = vec3(0.05, 0.1, 0.19);
  vec3 nebulaPurple = vec3(0.1, 0.07, 0.17);
  vec3 nebulaPink = vec3(0.19, 0.08, 0.16);
  vec3 nebulaCyan = vec3(0.05, 0.16, 0.19);
  vec3 supernovaMagenta = vec3(0.56, 0.22, 0.48);
  vec3 supernovaCyan = vec3(0.24, 0.46, 0.62);

  vec3 color = baseColor;
  color += deepBlue * smoothstep(1.18, 0.12, length(centeredUv - vec2(-0.04, 0.03))) * 0.42;
  color += nebulaPurple * (nebulaField * 0.72 + armBand * 0.28) * 0.22;
  color += nebulaBlue * (nebulaField * 0.56 + nebulaWisp * 0.44 + armBand * 0.22) * 0.21;
  color += nebulaPink * (pinkDust * 0.78 + nebulaWisp * 0.26) * 0.09;
  color += nebulaCyan * (cyanDust * 0.72 + nebulaB * 0.18) * 0.075;
  color -= vec3(0.045, 0.035, 0.03) * dustLanes * 0.55;
  color += vec3(0.08, 0.07, 0.09) * armBand * 0.04;

  float sunDist = length(centeredUv - sunCenter);
  float sunGlow = smoothstep(1.18, 0.0, sunDist);
  float sunCore = smoothstep(0.38, 0.0, sunDist);
  vec3 sunColor = vec3(0.88, 0.62, 0.28);
  vec3 sunHaloColor = vec3(0.32, 0.24, 0.18);
  color += sunHaloColor * sunGlow * 0.18;
  color += sunColor * sunCore * 0.07;

  color += softPlanet(
    centeredUv - farDrift * 0.35,
    vec2(0.72, -0.42),
    0.3,
    vec3(0.11, 0.15, 0.24),
    0.115
  );
  color += softPlanet(
    centeredUv - midDrift * 0.28,
    vec2(-0.34, -0.58),
    0.21,
    vec3(0.15, 0.12, 0.22),
    0.085
  );

  color += supernovaBurst(
    centeredUv - farDrift * 0.18,
    vec2(0.24, 0.16),
    0.23,
    vec3(1.0, 0.82, 0.9),
    supernovaMagenta,
    0.6
  );
  color += supernovaBurst(
    centeredUv - nearDrift * 0.22,
    vec2(-0.18, -0.08),
    0.17,
    vec3(0.92, 0.96, 1.0),
    supernovaCyan,
    2.1
  );

  float farStars =
    starLayer(uv + farDrift * 0.24, 92.0, 0.9986, 0.35) * 0.09 +
    starLayer(uv + farDrift * 0.3, 74.0, 0.9979, 1.6) * 0.08;
  float midStars =
    starLayer(uv + midDrift * 0.42, 54.0, 0.9963, 2.2) * 0.14 +
    starLayer(uv + midDrift * 0.5, 40.0, 0.9945, 0.9) * 0.12;
  float nearStars =
    starLayer(uv + nearDrift * 0.68, 28.0, 0.9918, 3.4) * 0.08;
  float glowStars =
    blurryStarLayer(uv + midDrift * 0.36, 20.0, 0.991, 0.8) * 0.08 +
    blurryStarLayer(uv + nearDrift * 0.54, 13.0, 0.986, 2.4) * 0.06;

  color += vec3(0.62, 0.7, 0.88) * farStars;
  color += vec3(0.8, 0.84, 0.96) * midStars;
  color += vec3(0.98, 0.9, 0.88) * nearStars;
  color += vec3(0.26, 0.34, 0.52) * glowStars;
  color += vec3(0.68, 0.74, 0.9) * glowStars * 0.18;

  float vignette = smoothstep(0.92, 0.24, length(centeredUv));
  color *= mix(0.44, 1.0, vignette);

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
