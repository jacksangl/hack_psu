import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import { forwardRef } from "react";

export const EarthMesh = forwardRef<THREE.Group>((_, ref) => {
  const texture = useTexture(
    "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
  );

  return (
    <group ref={ref}>
      <mesh>
        <sphereGeometry args={[2, 48, 48]} />
        <meshStandardMaterial
          map={texture}
          metalness={0.1}
          roughness={0.6}
        />
      </mesh>

      {/* Atmosphere glow */}
      <mesh>
        <sphereGeometry args={[2.03, 32, 32]} />
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
});

EarthMesh.displayName = "EarthMesh";
