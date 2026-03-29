import { Suspense, useCallback, useEffect, useRef } from "react";
import { Canvas, useFrame, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { EarthMesh } from "./EarthMesh";
import { CountryOverlay } from "./CountryOverlay";
import { CountryBorders } from "./CountryBorders";
import { CountryInteractionLayer } from "./CountryInteractionLayer";
import { CameraController } from "./CameraController";
import { NewsGlobeLayers } from "../../news/globe/NewsGlobeLayers";
import { useGlobeStore } from "../../../store/globeStore";

const GLOBE_OCEAN_CLICK_RADIUS = 2.004;

function GlobeContent() {
  const selectedCountry = useGlobeStore((s) => s.selectedCountry);
  const clearSelectedCountry = useGlobeStore((s) => s.clearSelectedCountry);
  const isCameraAnimating = useGlobeStore((s) => s.isCameraAnimating);
  const clearHoveredItem = useGlobeStore((s) => s.clearHoveredItem);
  const setIsInteracting = useGlobeStore((s) => s.setIsInteracting);

  const globeGroupRef = useRef<THREE.Group>(null);
  const orbitingRef = useRef(false);
  const suppressOceanClickRef = useRef(false);

  useEffect(() => {
    if (isCameraAnimating) {
      setIsInteracting(true);
      return;
    }

    if (!orbitingRef.current) {
      setIsInteracting(false);
    }
  }, [isCameraAnimating, setIsInteracting]);

  useFrame(() => {
    if (!selectedCountry && globeGroupRef.current) {
      globeGroupRef.current.rotation.y += 0.0005;
    }
  });

  const handleOceanClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      if (event.delta > 4) return;

      event.stopPropagation();

      if (suppressOceanClickRef.current) {
        suppressOceanClickRef.current = false;
        return;
      }

      clearHoveredItem();

      // Clicking the globe surface deselects the current country
      if (selectedCountry) {
        clearSelectedCountry();
      }
    },
    [selectedCountry, clearSelectedCountry, clearHoveredItem]
  );

  const notifyCountryInteraction = useCallback(() => {
    suppressOceanClickRef.current = true;
  }, []);

  return (
    <>
      <ambientLight intensity={0.8} />
      <directionalLight position={[-5, 3, 5]} intensity={1.5} />
      <directionalLight position={[5, -2, -5]} intensity={0.4} />

      <group
        ref={globeGroupRef}
      >
        <EarthMesh />
        <mesh
          onClick={handleOceanClick}
        >
          <sphereGeometry args={[GLOBE_OCEAN_CLICK_RADIUS, 64, 64]} />
          <meshBasicMaterial
            transparent
            opacity={0}
            side={THREE.FrontSide}
            depthWrite={false}
          />
        </mesh>
        <CountryBorders />
        <CountryInteractionLayer notifyCountryInteraction={notifyCountryInteraction} />
        <CountryOverlay />
        <NewsGlobeLayers />
      </group>

      <CameraController globeGroupRef={globeGroupRef} />

      {!isCameraAnimating && (
        <OrbitControls
          enableDamping
          dampingFactor={0.15}
          autoRotate={false}
          minPolarAngle={0.3}
          maxPolarAngle={Math.PI - 0.3}
          minDistance={2.5}
          maxDistance={10}
          enablePan={false}
          onStart={() => {
            orbitingRef.current = true;
            setIsInteracting(true);
          }}
          onEnd={() => {
            orbitingRef.current = false;
            if (!isCameraAnimating) {
              setIsInteracting(false);
            }
          }}
        />
      )}
    </>
  );
}

export function GlobeScene() {
  return (
    <div className="absolute inset-0 z-10">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 45 }}
        gl={{
          alpha: true,
          antialias: false,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.5,
          powerPreference: "high-performance",
          precision: "lowp",
        }}
        frameloop="always"
        dpr={Math.min(window.devicePixelRatio, 1.5)}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <GlobeContent />
        </Suspense>
      </Canvas>
    </div>
  );
}
