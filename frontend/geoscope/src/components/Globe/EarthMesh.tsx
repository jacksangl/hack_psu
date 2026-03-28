import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { useGlobeStore } from "../../store/globeStore";

export function EarthMesh() {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const selectedCountry = useGlobeStore((s) => s.selectedCountry);

  const texture = useTexture(
    "https://unpkg.com/three-globe/example/img/earth-night.jpg"
  );

  useFrame(() => {
    if (!selectedCountry && meshRef.current) {
      meshRef.current.rotation.y += 0.0005;
    }
    if (!selectedCountry && glowRef.current) {
      glowRef.current.rotation.y += 0.0005;
    }
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshStandardMaterial
          map={texture}
          metalness={0.1}
          roughness={0.7}
        />
      </mesh>

      {/* Atmosphere glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[2.03, 64, 64]} />
        <meshBasicMaterial
          color="#14b8a6"
          transparent
          opacity={0.08}
          blending={THREE.AdditiveBlending}
          side={THREE.FrontSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}
