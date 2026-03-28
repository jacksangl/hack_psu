import { useTexture } from "@react-three/drei";
import * as THREE from "three";

export function EarthMesh() {
  const texture = useTexture(
    "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
  );

  return (
    <group>
      <mesh>
        <sphereGeometry args={[2, 64, 64]} />
        <meshStandardMaterial
          map={texture}
          metalness={0.1}
          roughness={0.6}
        />
      </mesh>

      {/* Atmosphere glow */}
      <mesh>
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
